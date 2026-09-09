/**
 * Invariante de ambiente — o `[auth]` do `config.toml` é o que está DE FATO no ar (T062.3).
 *
 * POR QUE ISTO EXISTE. `supabase db reset` **não** recarrega a seção `[auth]`: ele reinicia o
 * contêiner, mas o ambiente do GoTrue é montado no `supabase start`. Quem editar `[auth]` e rodar
 * só `pnpm db:reset` fica com o valor ANTIGO em pé — enquanto o CI, que sobe o stack do zero,
 * roda com o novo. É a divergência que a Definition of Done chama de **defeito da verificação**:
 * verde aqui, vermelho lá, sobre o mesmo commit.
 *
 * POR QUE ELE É ASSIM E NÃO OUTRA COISA. A alternativa era encadear `db:stop && db:start` no
 * `pnpm verificar:tudo`, o que garantiria a aplicação e custaria minutos em **toda** execução.
 * Decisão de Bernardo, 09/09/2026: **conferência barata**. Uma chamada a `docker inspect`, alguns
 * milissegundos, e a divergência vira vermelho com a instrução do conserto no próprio erro.
 *
 * O QUE ELE NÃO É. Não é conferência do projeto REMOTO, que não lê `config.toml` — essa continua
 * humana, em `specs/004-auth-convite-e-rbac/contracts/conferencias-de-painel.md`.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const CAMINHO_CONFIG = "supabase/config.toml";

/**
 * Leitor mínimo de TOML — só o que esta conferência precisa: chaves escalares dentro de uma
 * seção nomeada. Não há dependência de TOML no projeto e acrescentar uma para ler quatro valores
 * seria pagar caro por pouco.
 */
function lerChave(secao: string, chave: string): string {
  const linhas = readFileSync(CAMINHO_CONFIG, "utf8").split(/\r?\n/);
  let secaoAtual = "";

  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (linha === "" || linha.startsWith("#")) continue;

    const cabecalho = /^\[([^\]]+)\]$/.exec(linha);
    if (cabecalho?.[1]) {
      secaoAtual = cabecalho[1];
      continue;
    }
    if (secaoAtual !== secao) continue;

    const par = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(linha);
    if (!par || par[1] !== chave) continue;

    // Corta comentário de fim de linha só quando ele está fora das aspas.
    const valor = (par[2] ?? "").replace(/\s+#.*$/, "").trim();
    return valor.replace(/^["']|["']$/g, "");
  }

  throw new Error(`não achei \`${chave}\` na seção [${secao}] de ${CAMINHO_CONFIG}`);
}

/** O nome do contêiner vem do `project_id`, não de literal — projeto renomeado não quebra isto. */
const CONTEINER = `supabase_auth_${lerChave("", "project_id")}`;

const CONSERTO =
  `Rode \`pnpm db:stop && pnpm db:start\`. ` +
  `\`pnpm db:reset\` NÃO recarrega a seção [auth] do config.toml — o ambiente do GoTrue é ` +
  `montado no \`supabase start\`. Enquanto isso não for feito, esta máquina e o CI estão ` +
  `rodando com configurações de autenticação diferentes.`;

function ambienteDoConteiner(): Map<string, string> {
  let saida: string;
  try {
    saida = execFileSync(
      "docker",
      ["inspect", CONTEINER, "--format", "{{range .Config.Env}}{{println .}}{{end}}"],
      { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    throw new Error(
      `não consegui inspecionar o contêiner \`${CONTEINER}\`. O stack local está de pé? ` +
        `Rode \`pnpm db:start\`.`,
    );
  }

  const mapa = new Map<string, string>();
  for (const linha of saida.split(/\r?\n/)) {
    const corte = linha.indexOf("=");
    if (corte > 0) mapa.set(linha.slice(0, corte), linha.slice(corte + 1));
  }
  return mapa;
}

/**
 * Os quatro pares de mapeamento DIRETO entre `config.toml` e o ambiente do GoTrue.
 *
 * ⚠️ DOIS VALORES FICAM DE FORA, e é deliberado:
 *
 * - `[auth.rate_limit] sign_in_sign_ups` **não tem variável de ambiente** no contêiner. Não há o
 *   que comparar. É o valor que defende a ameaça A-8, e no stack local ele não protege nada — o
 *   que conta é o do painel do projeto remoto, que o FR-005.2 manda conferir à mão.
 * - `[auth.rate_limit] email_sent` passa por transformação: `100` no arquivo vira `360000` no
 *   ambiente. Comparar exigiria reproduzir a conversão da CLI, que pode mudar sem aviso e
 *   produziria alarme falso. E ele é valor de ambiente de teste, não garantia de segurança:
 *   quando diverge, a suíte de convite reprova sozinha, por não achar o e-mail.
 */
const PARES: ReadonlyArray<{
  secao: string;
  chave: string;
  variavel: string;
  esperado: (doArquivo: string) => string;
  porque: string;
}> = [
  {
    secao: "auth",
    chave: "enable_signup",
    variavel: "GOTRUE_DISABLE_SIGNUP",
    // ⚠️ INVERTIDO. `enable_signup = false` vira `GOTRUE_DISABLE_SIGNUP=true`.
    esperado: (v) => String(v !== "true"),
    porque: "auto-cadastro desligado é o FR-003 — com ele ligado, qualquer pessoa cria credencial",
  },
  {
    secao: "auth",
    chave: "minimum_password_length",
    variavel: "GOTRUE_PASSWORD_MIN_LENGTH",
    esperado: (v) => v,
    porque: "o mínimo de 12 caracteres é o FR-006, e ele já viveu só no navegador uma vez",
  },
  {
    secao: "auth",
    chave: "password_requirements",
    variavel: "GOTRUE_PASSWORD_REQUIRED_CHARACTERS",
    esperado: (v) => v,
    porque:
      "composição obrigatória fica VAZIA de propósito (documento 22 §4.5, NIST SP 800-63B): " +
      "quem preencher isso 'para reforçar' enfraquece a política",
  },
  {
    secao: "auth.email",
    chave: "enable_signup",
    variavel: "GOTRUE_EXTERNAL_EMAIL_ENABLED",
    esperado: (v) => v,
    porque:
      "este precisa ficar `true`: ele governa o PROVEDOR de e-mail inteiro, login incluído. " +
      "Desligá-lo derrubou os 98 testes de RLS em bloco com 'Email logins are disabled'",
  },
];

describe("T062.3 · o [auth] do config.toml é o que está no ar", () => {
  for (const par of PARES) {
    it(`${par.variavel} confere com [${par.secao}] ${par.chave}`, () => {
      const doArquivo = lerChave(par.secao, par.chave);
      const doConteiner = ambienteDoConteiner().get(par.variavel);

      expect(
        doConteiner,
        `${par.variavel} não existe no contêiner ${CONTEINER}. ${CONSERTO}`,
      ).toBeDefined();

      expect(
        doConteiner,
        `DIVERGÊNCIA: \`[${par.secao}] ${par.chave} = ${doArquivo}\` no config.toml, ` +
          `mas ${par.variavel}=${doConteiner} no contêiner. Importa porque ${par.porque}. ` +
          CONSERTO,
      ).toBe(par.esperado(doArquivo));
    });
  }
});

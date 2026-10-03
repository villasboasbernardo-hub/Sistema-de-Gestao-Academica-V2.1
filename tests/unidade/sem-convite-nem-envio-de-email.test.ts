/**
 * `D-USR-1` · **o convite e o envio de e-mail não voltam** — varredura do repositório.
 *
 * > *"D-USR-1. Convite por e-mail PERMANENTEMENTE removido; nenhum envio de e-mail."*
 * > — decisão de Bernardo Villas Boas, 03/10/2026
 *
 * ⚠️ **ESTA GUARDA EXISTE PORQUE «PERMANENTEMENTE» PEDE PORTÃO, NÃO PROMESSA.** Até aqui a única
 * afirmação de ausência era um **comentário** em `lib/supabase/admin.ts` dizendo que não há envio de
 * e-mail em lugar nenhum do repositório — e comentário não reprova nada. Nesta base, promessa de
 * ausência sem varredura é um modo de falha já medido **duas vezes**: o mínimo de senha que existia
 * só no formulário (Épico 3) e a regra do último Admin *"afirmada duas vezes e implementada zero"*
 * (PR 2 desta spec).
 *
 * ⚠️ **ELA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1 do `CLAUDE.md`): **uso mencionado não é uso**. As
 * migrations, os cabeçalhos e os próprios documentos explicam o convite que saiu, e contar essas
 * frases como violação ensinaria a **apagar a documentação para ficar verde** — o contrário do que
 * esta decisão quer.
 *
 * ⚠️ **E ELA TEM CONTROLE POSITIVO.** Uma varredura que não acha nada passa igual quando o padrão
 * está errado, quando a pasta mudou de nome e quando o leitor de arquivos devolve vazio. O controle
 * mede um padrão que **tem** de existir — `createUser`, o único caminho de criação de conta — e
 * reprova se ele desaparecer.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** Este arquivo sai da própria varredura: os padrões proibidos estão escritos nele. */
const ESTE_ARQUIVO = "sem-convite-nem-envio-de-email.test.ts";

const PASTAS = ["app", "lib", "components", "scripts"] as const;
const EXTENSOES = /\.(ts|tsx|mjs|js|py)$/;

/**
 * As chamadas que **não podem existir**, com o motivo de cada uma.
 *
 * ⚠️ **SÃO CHAMADAS, NÃO PALAVRAS.** Procurar a palavra *"convite"* reprovaria todo comentário que
 * explica o que saiu; o que identifica envio de e-mail é a **API**, e ela é um conjunto fechado e
 * pequeno na plataforma que este projeto usa.
 */
const PROIBIDOS: readonly { readonly padrao: RegExp; readonly porque: string }[] = [
  {
    padrao: /inviteUserByEmail\s*\(/,
    porque: "é o convite por e-mail, removido permanentemente pela D-USR-1",
  },
  {
    padrao: /resetPasswordForEmail\s*\(/,
    porque: "é a recuperação de senha por link, que depende de e-mail para existir",
  },
  {
    padrao: /signInWithOtp\s*\(/,
    porque: "manda código ou link por e-mail",
  },
  {
    padrao: /generateLink\s*\(/,
    porque: "gera link de convite ou de recuperação, e o destino é o e-mail",
  },
  {
    padrao: /\.resend\s*\(|sendEmail\s*\(|enviarEmail\s*\(/,
    porque: "é envio de e-mail direto",
  },
];

function semComentario(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = resolve(caminho, nome);
    if (nome === "node_modules" || nome === ".next") return [];
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return EXTENSOES.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

const CODIGO = PASTAS.flatMap((pasta) => arquivosDe(pasta))
  .filter((caminho) => !caminho.endsWith(ESTE_ARQUIVO))
  .map((caminho) => ({
    caminho,
    codigo: semComentario(readFileSync(resolve(RAIZ, caminho), "utf8")),
  }));

describe("`D-USR-1` · nenhum envio de e-mail no repositório", () => {
  it("a varredura enxerga o repositório — controle positivo", () => {
    expect(CODIGO.length, "a varredura não leu arquivo nenhum").toBeGreaterThan(100);

    /*
     * ⚠️ **O CONTROLE POSITIVO MEDE O QUE SUBSTITUIU O CONVITE.** `auth.admin.createUser` é o único
     *    caminho de criação de conta desde a D-USR-2, e ele vive em `lib/acoes/usuarios.ts`. Se ele
     *    desaparecer, ou a varredura parar de enxergar aquele arquivo, este caso reprova — e sem ele
     *    os casos negativos abaixo passariam **sobre uma lista vazia**.
     */
    const comCreateUser = CODIGO.filter((a) => /createUser\s*\(/.test(a.codigo));
    expect(
      comCreateUser.map((a) => a.caminho),
      "a varredura não achou `createUser` — ela está cega, e os negativos não provam nada",
    ).toContain("lib/acoes/usuarios.ts");
  });

  it.each(PROIBIDOS)("não existe `$padrao` — $porque", ({ padrao }) => {
    const violacoes = CODIGO.filter((a) => padrao.test(a.codigo)).map((a) => a.caminho);
    expect(violacoes, `${violacoes.join(", ")}`).toHaveLength(0);
  });

  it("não existe rota de convite nem de recuperação de senha", () => {
    const rotas = arquivosDe("app").map((c) => c.toLowerCase());
    const proibidas = rotas.filter((c) => /\/convite\/|\/recuperar-senha\//.test(c));
    expect(proibidas, `${proibidas.join(", ")}`).toHaveLength(0);
  });

  /**
   * ⚠️ **O `config.toml` É VERSIONADO E O CI O APLICA A CADA EXECUÇÃO — não é prosa.** Ele listava
   * **seis** destinos `/convite` em `additional_redirect_urls` depois de a rota ter sido apagada, e
   * o `CLAUDE.md` já afirmava, como fato medido, que ele estava *"sem os destinos"*. Destino de
   * redirecionamento para rota que não existe é superfície de autenticação apontando para o vazio.
   */
  it("`supabase/config.toml` não aponta para rota que não existe", () => {
    const toml = readFileSync(resolve(RAIZ, "supabase/config.toml"), "utf8")
      .split("\n")
      .filter((linha) => !linha.trim().startsWith("#"))
      .join("\n");

    for (const rota of ["/convite", "/recuperar-senha"]) {
      expect(toml, `o \`config.toml\` ainda manda para ${rota}`).not.toContain(rota);
    }
  });
});

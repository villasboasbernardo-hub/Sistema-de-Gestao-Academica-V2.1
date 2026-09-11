/**
 * Uma conta autenticada para os percursos que exigem sessão — **num lugar só**.
 *
 * ⚠️ UMA CONTA POR PROCESSO DE TRABALHO, E ISSO CUSTOU UM DIAGNÓSTICO. O `beforeAll` do Playwright
 * roda **uma vez por processo**, não uma vez por suíte: com dois processos, os dois criavam a mesma
 * conta e o segundo recebia *"Database error creating new user"* — falha que parece defeito do
 * sistema e é corrida do teste.
 *
 * ⚠️ E O PREFIXO SEPARA AS SUÍTES. Duas suítes com o mesmo prefixo, em processos diferentes, voltam
 * a colidir — e o `afterAll` de uma apagaria a conta que a outra ainda está usando.
 *
 * ⚠️ A CHAVE VEM DO STACK LOCAL, e não do `.env.local`. O arquivo aponta para o projeto REMOTO: o
 * Épico 3 já pagou por isso, com um convite emitido localmente e conferido no remoto, e um erro
 * sobre algoritmo de assinatura que não sugere ambiente trocado a ninguém.
 */
import { execFileSync } from "node:child_process";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

/**
 * O ambiente do stack local, perguntado à CLI **uma vez por processo, e só quando alguém precisa**.
 *
 * ⚠️ **A CHAMADA É TARDIA, E ISSO CORRIGE UM DEFEITO MEDIDO EM 11/09/2026.** Na primeira versão ela
 * acontecia no carregamento do módulo: bastava uma suíte **importar** este arquivo para que **todo**
 * processo de trabalho executasse `supabase status`, inclusive os que rodavam casos sem sessão. Com
 * quatro processos simultâneos a CLI falhou com *"Command failed: supabase status"*, e a suíte de
 * tema reprovou.
 *
 * ⚠️ **O SINTOMA APONTAVA PARA O LUGAR ERRADO.** O caso que reprovou foi o do flash antes da
 * hidratação — o mais delicado da suíte, e o candidato natural a "instável". A causa estava no
 * auxiliar que o arquivo tinha acabado de importar, e que aquele caso nem usa. **Instável é defeito
 * da verificação**, e aqui a primeira leitura teria culpado o teste certo pelo motivo errado.
 *
 * ⚠️ **E HÁ UMA REPETIÇÃO, porque a falha é de contenção e não de ambiente.** Se a CLI recusar por
 * concorrência, esperar e tentar de novo resolve; se ela estiver mesmo fora do ar, a segunda
 * tentativa falha igual — e a mensagem diz qual dos dois foi.
 */
let ambienteLocal: Record<string, string> | undefined;

function lerAmbienteLocal(): Record<string, string> {
  if (ambienteLocal) return ambienteLocal;

  let saida = "";
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      saida = execFileSync("supabase", ["status", "-o", "env"], {
        encoding: "utf8",
        windowsHide: true,
      });
      break;
    } catch (erro) {
      if (tentativa === 2) {
        throw new Error(
          "`supabase status` falhou duas vezes. Com o stack de pé, foi concorrência entre " +
            `processos de trabalho; sem ele, falta \`pnpm db:start\`. Original: ${String(erro)}`,
        );
      }
      // Espera curta e síncrona: isto roda no carregamento do caso, fora do laço de eventos.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750);
    }
  }

  const mapa: Record<string, string> = {};
  for (const linha of saida.split("\n")) {
    const corte = linha.indexOf("=");
    if (corte <= 0) continue;
    const chave = linha.slice(0, corte).trim();
    const valor = linha
      .slice(corte + 1)
      .replace(/^"|"$/g, "")
      .trim();
    if (chave) mapa[chave] = valor;
  }
  ambienteLocal = mapa;
  return mapa;
}

export function chaveLocal(nomeNoCli: string): string {
  const valor = lerAmbienteLocal()[nomeNoCli];
  if (!valor) throw new Error(`nao achei ${nomeNoCli} no supabase status`);
  return valor;
}

/** O cliente administrativo, criado na primeira chamada — nunca no carregamento do módulo. */
let clienteAdmin: SupabaseClient | undefined;

function admin(): SupabaseClient {
  clienteAdmin ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return clienteAdmin;
}

export const SENHA_DE_TESTE = "senha-de-teste-com-12+";

/** O endereço desta suíte, neste processo de trabalho. */
export function emailDeTeste(prefixo: string, processo: number): string {
  return `${prefixo}-${processo}@ciaara.teste`;
}

async function apagar(email: string) {
  const { data: existentes } = await admin().auth.admin.listUsers();
  for (const u of existentes?.users ?? []) {
    if (u.email === email) await admin().auth.admin.deleteUser(u.id);
  }
  await admin().from("usuarios").delete().eq("email", email);
}

/** Cria a conta do zero, apagando qualquer resto de execução anterior. */
export async function criarConta(
  email: string,
  codigo: string,
  perfil = "admin",
  escopo = "geral",
): Promise<void> {
  await apagar(email);

  const { data, error } = await admin().auth.admin.createUser({
    email,
    password: SENHA_DE_TESTE,
    email_confirm: true,
  });
  if (error) throw new Error(`falha ao criar a conta de teste: ${error.message}`);

  const { error: erroUsuario } = await admin().from("usuarios").insert({
    codigo,
    auth_user_id: data.user.id,
    email,
    nome: "Conta de percurso automatizado",
    perfil,
    /*
     * ⚠️ O ESCOPO É PARÂMETRO PORQUE ELE É O QUE A RLS LÊ para o perfil `operador`: ela devolve só
     * os cursos cuja classificação bate com ele. Sem um segundo usuário de escopo estreito, "o link
     * compartilhado não vaza" é afirmação sem contraprova.
     */
    escopo_curso: escopo,
  });
  if (erroUsuario) throw new Error(`falha ao cadastrar o usuario: ${erroUsuario.message}`);
}

export const apagarConta = apagar;

/**
 * Entra pelo formulário e **só devolve quando a casca está desenhada**.
 *
 * ⚠️ **A ESPERA PELA CASCA NÃO É ZELO, É CORREÇÃO DE UMA CORRIDA MEDIDA EM 11/09/2026.** A versão
 * anterior devolvia assim que o endereço deixava de ser `/login` — e o endereço muda **antes** de a
 * tela nova existir. Um caso que teclasse `Tab` logo em seguida encontrava a página sem nada focável
 * e reprovava com *"element(s) not found"*, que se lê como *"o atalho para o conteúdo não existe"*.
 * **Diagnóstico errado sobre um atalho que funciona.**
 *
 * ⚠️ É A MESMA LIÇÃO DO `abrirVitrine`, noutro lugar: esperar pelo que só a página pronta tem, em
 * vez de esperar por tempo. Alargar prazo não conserta ambiguidade nem corrida.
 *
 * ⚠️ **O PRAZO MAIOR É SÓ O DA PRONTIDÃO.** As asserções de comportamento seguem no prazo padrão, de
 * propósito: uma tela que leva quinze segundos para mostrar o menu está quebrada.
 */
export async function entrar(
  page: Page,
  email: string,
  destino = "/admin/usuarios",
): Promise<void> {
  await page.goto(`/login?destino=${encodeURIComponent(destino)}`);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="senha"]').fill(SENHA_DE_TESTE);
  await page.getByRole("button", { name: /entrar/i }).click();

  await expect.poll(() => new URL(page.url()).pathname, { timeout: 15_000 }).not.toBe("/login");

  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
    "entrou, mas a casca não terminou de desenhar",
  ).toBeVisible({ timeout: 15_000 });
}

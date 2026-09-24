/**
 * Reenviar convite (`FR-008`, `FR-012`) — a mecânica e a língua da mensagem.
 *
 * ⚠️ **O DEFEITO RELATADO ERA UMA FRASE EM INGLÊS NA TELA:** *"A user with this email address has
 * already been registered"*. Ela vinha crua da plataforma, porque a ação repassava
 * `error.message` sem traduzir.
 *
 * ⚠️ **E A CAUSA SUPOSTA NÃO ERA A CAUSA.** A suspeita natural é que `inviteUserByEmail` falhe por
 * tentar recriar quem já existe. Medido em 14/09/2026, contra o stack local:
 *
 *   usuário NÃO confirmado  → `inviteUserByEmail` devolve **ok** e o e-mail **chega**
 *   usuário CONFIRMADO      → devolve **422 `email_exists`**, que é a frase relatada
 *
 * O caminho de reenvio de verdade — cadastro sem credencial — **sempre funcionou**. O que aparecia
 * na tela era o outro caso, e ele chegava aqui por causa de um espelho `auth_user_id` que ficava
 * vazio. Esta suíte cobre os dois.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

const MAILPIT = "http://127.0.0.1:54324";

let ADMIN = "";
const descartaveis: string[] = [];

const admin = () =>
  createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test.beforeAll(async ({}, info) => {
  ADMIN = emailDeTeste("reenvio-admin", info.workerIndex);
  await criarConta(ADMIN, `USR-REENVIO-${info.workerIndex}`);
});

test.afterAll(async () => {
  for (const e of descartaveis) await apagarConta(e);
  await apagarConta(ADMIN);
});

/**
 * Quantos e-mails já chegaram para o endereço.
 *
 * ⚠️ **A BUSCA É POR DESTINATÁRIO, e a caixa NUNCA é limpa.** O Mailpit é estado compartilhado
 * entre processos de trabalho: apagar tudo faria um processo destruir a prova do vizinho, que é
 * exatamente o defeito que a suíte de convite pagou em 11/09/2026. Cada endereço aqui tem carimbo
 * de tempo, e isolar por endereço é isolamento de verdade.
 */
async function quantosEmails(destinatario: string): Promise<number> {
  const url = `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`;
  try {
    const texto = await fetch(url).then((r) => r.text());
    return (JSON.parse(texto).messages ?? []).length;
  } catch {
    // Caixa vazia devolve corpo que não é JSON. Zero é a resposta honesta, não um erro.
    return 0;
  }
}

/** Cria o cadastro em "convite enviado": linha sem credencial + conta de autenticação pendente. */
async function cadastroAguardandoConvite(sufixo: string): Promise<string> {
  const email = `reenvio-${sufixo}-${Date.now()}@ciaara.teste`;
  descartaveis.push(email);

  await admin()
    .from("usuarios")
    .insert({
      codigo: `USR-RE-${Date.now().toString(36).toUpperCase()}`,
      email,
      nome: "Convidado Aguardando",
      perfil: "visualizacao",
      escopo_curso: "geral",
    });

  return email;
}

// =================================================================================================
// O caminho que o pedido nomeia: reenviar para quem já existe no Auth e ainda não confirmou
// =================================================================================================
test("reenviar convite a cadastro SEM credencial envia um e-mail novo, sem erro", async ({
  page,
}) => {
  const alvo = await cadastroAguardandoConvite("pendente");

  // O convite original — depois dele a conta JÁ EXISTE em `auth.users`, e é esse o estado em que
  // se suspeitava que o reenvio falhasse.
  await admin().auth.admin.inviteUserByEmail(alvo, {
    redirectTo: `${process.env.URL_BASE_E2E ?? `http://localhost:${process.env.PORTA_E2E ?? "3100"}`}/convite`,
  });
  await expect.poll(() => quantosEmails(alvo), { timeout: 20_000 }).toBeGreaterThan(0);
  const antes = await quantosEmails(alvo);

  await entrar(page, ADMIN);
  const linha = page.locator("tr", { hasText: alvo });
  await expect(linha, "o cadastro não apareceu na tela de usuários").toBeVisible({
    timeout: 15_000,
  });

  await linha.getByRole("button", { name: /reenviar convite/i }).click();

  /*
   * ⚠️ A PROVA É O E-MAIL QUE CHEGA, NÃO A AUSÊNCIA DE ERRO NA TELA. Uma asserção só sobre o
   * alerta passaria com a ação devolvendo sucesso sem enviar nada — que é exatamente o que
   * aconteceria se alguém trocasse `inviteUserByEmail` por `generateLink`, medido como silencioso.
   */
  await expect
    .poll(() => quantosEmails(alvo), {
      timeout: 20_000,
      message: "o reenvio não produziu e-mail novo",
    })
    .toBeGreaterThan(antes);

  await expect(linha.getByRole("alert")).toHaveCount(0);
});

// =================================================================================================
// A regressão do sintoma relatado: a frase em inglês não volta
// =================================================================================================
test("cadastro cuja conta JÁ foi confirmada recusa em português, nunca em inglês", async ({
  page,
}) => {
  const alvo = await cadastroAguardandoConvite("confirmado");

  /*
   * O estado que produzia a frase em inglês: a conta de autenticação existe **e está confirmada**,
   * enquanto `usuarios.auth_user_id` continua vazio — então a guarda por coluna não dispara e a
   * tela ainda oferece o botão de reenviar.
   */
  await admin().auth.admin.createUser({
    email: alvo,
    password: "senha-de-prova-12345",
    email_confirm: true,
  });

  await entrar(page, ADMIN);
  const linha = page.locator("tr", { hasText: alvo });
  await expect(linha).toBeVisible({ timeout: 15_000 });
  await linha.getByRole("button", { name: /reenviar convite/i }).click();

  const alerta = linha.getByRole("alert");
  await expect(alerta).toBeVisible({ timeout: 15_000 });

  const texto = (await alerta.textContent()) ?? "";
  expect(texto, "a mensagem da plataforma vazou para a tela").not.toMatch(
    /already been registered|has already|user with this email/i,
  );
  expect(texto).toMatch(/credencial|recuperação de senha/i);
});

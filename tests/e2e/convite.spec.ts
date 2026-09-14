/**
 * Percurso do convite, ponta a ponta (FR-036, SC-001, SC-002, SC-013).
 *
 * ⚠️ O E-MAIL É INTERCEPTADO, NÃO SIMULADO. O stack local do Supabase traz o Mailpit em
 * `127.0.0.1:54324`, e é dele que sai o link de convite de verdade. Um teste que fabricasse o
 * link não provaria o que interessa: que o convite CHEGA, e que o link que chega funciona.
 *
 * ⚠️ SÓ ENDEREÇO DE TESTE (FR-031.1). A emissão aos três endereços reais da v2.0 é do corte, e
 * este arquivo não tem como emiti-la: os endereços daqui terminam em `@ciaara.teste`.
 */
import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

function chaveLocal(nomeNoCli: string): string {
  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split("\n")
    .find((l) => l.startsWith(`${nomeNoCli}=`))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^"|"$/g, "")
    .trim();
  if (!valor) throw new Error(`nao achei ${nomeNoCli} no supabase status`);
  return valor;
}

const URL_SUPABASE = chaveLocal("API_URL");
const CHAVE_SERVICO = chaveLocal("SECRET_KEY");
const CHAVE_ANON = chaveLocal("PUBLISHABLE_KEY");
const MAILPIT = "http://127.0.0.1:54324";

const admin = createClient(URL_SUPABASE, CHAVE_SERVICO, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SENHA = "senha-de-teste-com-12+";

/**
 * Busca no Mailpit o link do último e-mail para o endereço.
 *
 * ⚠️ A LEITURA É TOLERANTE DE PROPÓSITO. Enquanto a caixa está vazia, ou logo depois de um
 * `DELETE`, o Mailpit devolve corpo que não é JSON — e um `r.json()` cru estoura com
 * `SyntaxError`, fazendo o teste falhar por causa do relógio, não do comportamento. A espera é o
 * mecanismo; o erro só vale quando o e-mail realmente não chega.
 */
async function json(url: string): Promise<unknown> {
  try {
    const texto = await fetch(url).then((r) => r.text());
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

async function linkDoUltimoEmail(destinatario: string): Promise<string> {
  const busca = `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${destinatario}`)}`;
  for (let tentativa = 0; tentativa < 30; tentativa += 1) {
    const lista = (await json(busca)) as { messages?: { ID?: string }[] } | null;
    const id = lista?.messages?.[0]?.ID;
    if (id) {
      const corpo = (await json(`${MAILPIT}/api/v1/message/${id}`)) as {
        Text?: string;
        HTML?: string;
      } | null;
      const texto = `${corpo?.Text ?? ""} ${corpo?.HTML ?? ""}`;
      const achado = texto.match(/https?:\/\/[^\s"'<>]+/);
      if (achado) return achado[0].replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`nenhum e-mail chegou para ${destinatario}`);
}

/*
 * ⚠️ **A LIMPEZA GERAL DO MAILPIT SAIU DAQUI EM 11/09/2026, E ERA UMA CORRIDA ENTRE PROCESSOS.**
 *
 * O `beforeAll` roda **uma vez por processo de trabalho**, não uma vez por suíte — a mesma
 * propriedade que já tinha custado um diagnóstico na criação de contas. Só que aqui ele apagava
 * **a caixa inteira**, que é estado compartilhado: o processo B começava, limpava tudo, e o e-mail
 * que o processo A tinha acabado de emitir sumia antes de A conseguir lê-lo. O caso reprovava com
 * *"nenhum e-mail chegou"* — que se lê como defeito no envio, e não como teste apagando a prova do
 * vizinho.
 *
 * ⚠️ **MEDIDO:** rodando `convite.spec.ts` duas vezes seguidas, a primeira passava e a segunda
 * reprovava. O limite de envio foi descartado como causa por medição direta no contêiner de auth —
 * `GOTRUE_RATE_LIMIT_EMAIL_SENT=360000`.
 *
 * ⚠️ **E A LIMPEZA NÃO FAZIA FALTA:** a busca já é por destinatário (`to:`), e cada caso usa um
 * endereço com carimbo de tempo. Isolar por endereço é isolamento de verdade; limpar tudo é o
 * contrário disso.
 */

// =================================================================================================
// V-1 · e-mail nunca convidado NÃO cria conta — inclusive por chamada direta
// =================================================================================================
test("V-1 (NEGATIVO) · e-mail não convidado não cria conta nem pela interface de autenticação", async () => {
  // ⚠️ NÃO PASSA PELA TELA. Se o teste só tentasse pela tela, provaria que a tela não oferece o
  // botão — que é cortesia, não proteção. O critério 1 do documento 06 exige que a criação seja
  // recusada "por qualquer caminho, inclusive chamando a API diretamente". Isto é a API.
  const anonimo = createClient(URL_SUPABASE, CHAVE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anonimo.auth.signUp({
    email: "invasor-nao-convidado@ciaara.teste",
    password: SENHA,
  });

  // Duas formas de estar correto, e as duas contam: ou o auto-cadastro está desligado e a
  // chamada é recusada, ou ela cria credencial que NÃO ALCANÇA NADA por não ter linha em
  // `usuarios` (o T-09). O que não pode é criar credencial COM acesso.
  if (!error && data.user) {
    const comCredencial = createClient(URL_SUPABASE, CHAVE_ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await comCredencial.auth.signInWithPassword({
      email: "invasor-nao-convidado@ciaara.teste",
      password: SENHA,
    });
    const { data: alcance } = await comCredencial.from("cursos").select("codigo");
    expect(alcance ?? []).toEqual([]);
    await admin.auth.admin.deleteUser(data.user.id);
  } else {
    expect(error).not.toBeNull();
  }
});

// =================================================================================================
// V-3 · convite → definição de senha → primeiro acesso
// =================================================================================================
test("V-3 · convite, senha e primeiro acesso, com o escopo atribuído", async ({ page }) => {
  const email = `convidado-${Date.now()}@ciaara.teste`;

  // O cadastro nasce SEM credencial — a janela deliberada do FR-008.
  const { data: linha } = await admin
    .from("usuarios")
    .insert({
      codigo: `USR-E2E-${Date.now().toString(36).toUpperCase()}`,
      email,
      nome: "Convidado De Teste",
      perfil: "visualizacao",
      escopo_curso: "geral",
    })
    .select("id, codigo, origem_migracao_v1")
    .single();
  expect(linha).not.toBeNull();

  // V-2 · sem credencial, a conta não alcança nada. (Provado em profundidade na suíte de RLS.)
  expect(linha!.id).toBeTruthy();

  await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "http://localhost:3000/convite",
  });
  const link = await linkDoUltimoEmail(email);

  await page.goto(link);
  await page.waitForURL(/convite|login|\/$/, { timeout: 15_000 });

  // ⚠️ O DISCRIMINADOR É `confirmacao`, NÃO `senha`. As duas telas têm um campo `senha`: a de
  // login e a de definição. Casar por `senha` faz o teste preencher o LOGIN achando que está no
  // convite — e ele falha depois, no campo que só existe na outra. Custou uma execução.
  const confirmacao = page.locator('input[name="confirmacao"]');
  await confirmacao.waitFor({ state: "visible", timeout: 15_000 });
  await page.locator('input[name="senha"]').fill(SENHA);
  await confirmacao.fill(SENHA);
  await page.getByRole("button", { name: /concluir|salvar/i }).click();
  /*
   * ⚠️ `/login` SAIU DESTA EXPRESSÃO EM 11/09/2026, E ERA ELE QUE ESCONDIA O DEFEITO.
   * Aceitar os dois desfechos fazia o caso passar exatamente no cenário que ele existe para
   * reprovar: quem define a senha e é devolvido ao login **não** concluiu o convite.
   */
  await page.waitForURL(/\/$/, { timeout: 15_000 });

  const { data: contasApos } = await admin.auth.admin.listUsers();
  const conta = (contasApos?.users ?? []).find((u) => u.email === email);
  expect(conta, "a credencial não foi criada").toBeTruthy();

  // ⚠️ SC-013 · `codigo` e `origem_migracao_v1` SOBREVIVEM à obtenção da credencial. É o que faz
  // o rastro até a v2.0 não se perder quando a conta migrada ganha senha (FR-032).
  const { data: depois } = await admin
    .from("usuarios")
    .select("codigo, origem_migracao_v1, auth_user_id")
    .eq("email", email)
    .single();
  expect(depois?.codigo).toBe(linha!.codigo);
  expect(depois?.origem_migracao_v1).toBe(linha!.origem_migracao_v1);

  /*
   * ⚠️ A ASSERÇÃO QUE FALTAVA, E A COLUNA JÁ ESTAVA SENDO SELECIONADA ACIMA.
   *
   * Até 11/09/2026 este caso lia `auth_user_id` e conferia `codigo` e `origem_migracao_v1` —
   * o comentário dizia que o espelho fechava, e nada olhava o espelho. Ele ficou verde
   * enquanto **nenhuma pessoa convidada conseguia entrar no sistema**, porque a aplicação
   * nunca escrevia essa coluna: quem a escrevia era `conta-de-teste.ts`, ao criar as contas
   * dos outros 130 casos. A suíte inteira rodava como contas que a aplicação não sabe criar.
   */
  expect(depois?.auth_user_id, "o espelho usuarios.auth_user_id ficou aberto (FR-010)").toBe(
    conta!.id,
  );

  /*
   * ⚠️ E O QUE A PESSOA REALMENTE QUER: alcançar uma tela autenticada. É a medição do
   * desfecho, não da condição — o mesmo motivo pelo qual o caso do destino de login mede
   * onde o navegador parou, e não o que a função devolveu.
   */
  await page.goto("/inicio");
  await expect(page, "a pessoa convidada foi devolvida ao login").toHaveURL(/\/inicio/);

  await admin.from("usuarios").delete().eq("email", email);
  const { data: contas } = await admin.auth.admin.listUsers();
  for (const u of contas?.users ?? []) {
    if (u.email === email) await admin.auth.admin.deleteUser(u.id);
  }
});

// =================================================================================================
// V-4 · link já usado, e a mensagem que NÃO revela se a conta existe
// =================================================================================================
test("V-4 (NEGATIVO) · link inválido é recusado sem dizer se a conta existe", async ({ page }) => {
  await page.goto("/convite#access_token=invalido&type=invite");

  // ⚠️ ESPERAR, E NÃO LER DIRETO. A conferência do link é ASSÍNCRONA — a tela chama `setSession`
  // contra a API de auth e, enquanto não volta, mostra "Conferindo o link…". Ler o `body` na
  // linha seguinte ao `goto` pegava esse estado intermediário, e o teste falhava por CORRIDA,
  // não por defeito do sistema. Medido em 09/09/2026, com o contêiner de auth recém-subido:
  // vermelho na suíte inteira, verde ao rodar sozinho. Um teste que decide por tempo não prova
  // nada — `toBeVisible()` reexecuta até o estado final aparecer.
  await expect(page.getByText(/não é mais válido|nao e mais valido/i)).toBeVisible();

  // ⚠️ A mensagem fala do LINK, nunca da conta. Se dissesse "conta não encontrada", bastaria
  // variar o endereço para levantar quem tem acesso ao sistema.
  const texto = await page.locator("body").innerText();
  expect(texto).not.toMatch(/conta não encontrada|usuário não existe/i);
});

// =================================================================================================
// SC-010 · a recuperação responde IGUAL exista ou não a conta
// =================================================================================================
test("SC-010 · resposta indistinguível para e-mail cadastrado e não cadastrado", async ({
  page,
}) => {
  /*
   * ⚠️ A RESPOSTA É PROCURADA DENTRO DO FORMULÁRIO, e não na página inteira. `getByRole("status")`
   * solto casa TAMBÉM com a faixa de ambiente, que é um `status` e está sempre lá: são dois
   * elementos, e violação de modo estrito **falha na hora — ela não reexecuta**. O caso passava
   * numa execução e reprovava na outra, no mesmo commit, conforme a resposta aparecesse antes ou
   * depois de a leitura acontecer.
   *
   * Corrigido em 10/09/2026, durante a fatia (b) do Épico 4. O teste é do Épico 3; o defeito é de
   * seletor, não de comportamento — a recuperação de senha sempre respondeu igual.
   */
  const resposta = page.locator("main").getByRole("status");

  async function pedir(email: string): Promise<{ texto: string; ms: number }> {
    await page.goto("/recuperar-senha");
    await page.locator('input[name="email"]').fill(email);
    const inicio = Date.now();
    await page.getByRole("button", { name: /enviar/i }).click();
    await resposta.waitFor({ timeout: 15_000 });
    const ms = Date.now() - inicio;
    return { texto: (await resposta.innerText()).trim(), ms };
  }

  const inexistente = await pedir("ninguem-tem-esta-conta@ciaara.teste");
  const existente = await pedir("rls-admin@ciaara.teste");

  // O texto é o mesmo — é o requisito.
  expect(existente.texto).toBe(inexistente.texto);

  // ⚠️ E O TEMPO TAMBÉM PRECISA SER PARECIDO. Comparar só o texto deixa passar o oráculo por
  // relógio: se o caminho com conta faz trabalho a mais, a diferença de tempo conta quem tem
  // acesso ao sistema. A margem é larga de propósito — o que se procura é ordem de grandeza,
  // não igualdade de milissegundo.
  const maior = Math.max(existente.ms, inexistente.ms);
  const menor = Math.min(existente.ms, inexistente.ms);
  expect(maior).toBeLessThan(menor * 5 + 2000);
});

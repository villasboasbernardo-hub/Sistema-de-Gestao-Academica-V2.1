/**
 * Spec 029 (Bloco 14), item 2 — o *"O que é"* OPCIONAL no Estudo Individual, por clique (`FR-002`, `SC-002`, D-5 a
 * D-7) *(decisão de Bernardo Villas Boas, 27/10/2026)*.
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É O EI SEM DESCRIÇÃO CHEGANDO AO BANCO.** Até a spec 029 o *"O que é"* era
 *    obrigatório em três camadas — o `required` do campo, o `min(1)` do esquema e o `NOT NULL` da coluna —, e a
 *    primeira delas já barrava: o navegador não enviava o formulário. A asserção que vira é a do campo (*"o navegador
 *    não acusa falta"*), e a prova é o BANCO depois do *Salvar minuta*: a linha é Estudo Individual, salva, com a
 *    descrição NULA (D-5) — e não o valor digitado, porque não há valor digitado.
 * ⚠️ **O CONTROLE POSITIVO É A AEC**: com o *"O que é"* vazio ela continua barrada pelo navegador, e com ele só de
 *    espaços — que passa pelo `required` — a AÇÃO recusa com a frase de sempre. Os dois vereditos são iguais antes e
 *    depois; sem eles, uma tela que tirasse o `required` de toda atividade passaria no caso do EI.
 *
 * ⚠️ **E «AO LANÇAR OU EDITAR»** (`FR-002.1`; achado 11 da revisão do Bloco 14): apagar o *"O que é"* pelo cartão de
 *    edição grava nulo no EI e é recusado, com a MESMA frase do lançar, na AEC. Até ali nenhum caso limpava
 *    `#dsa-editar-conteudo` de uma atividade — tirar a guarda da edição deixava tudo verde (a AEC passava a ser recusada
 *    pelo `CHECK` traduzido, com OUTRA frase).
 *
 * ⚠️ `goto` só no login (ponto de partida); daí, lista de turmas → ficha → *Abrir o DSA* → a semana pelo dia → célula.
 * ⚠️ **A SEXTA ESTÁ VAZIA NA SEMENTE** (`dsa-de-teste.ts`), e cada caso usa a sua célula: o EI no TA 8, a AEC no TA 7,
 *    o EI da edição no TA 6 e a AEC da edição no TA 5. Com `fullyParallel`, os casos podem cair no mesmo processo (a
 *    mesma turma): o *Salvar minuta* de um leva os rascunhos do outro, e por isso cada conferência do banco lê só o TA e
 *    a categoria do seu caso — e o controle da AEC no TA 7 nunca grava.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";

let EMAIL = "";
let S: DsaSemeado;

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
/** A sexta da semana de referência — vazia na semente. */
const SEXTA = "2026-04-10";
/** Sexta, TA 8 (linha 7, coluna 4): o Estudo Individual. */
const CELULA_DO_EI = "7:4";
/** Sexta, TA 7 (linha 6, coluna 4): a AEC do controle. */
const CELULA_DA_AEC = "6:4";
/** Sexta, TA 6 (linha 5, coluna 4): o Estudo Individual DESCRITO cuja descrição a edição apaga. */
const CELULA_DO_EI_EDITADO = "5:4";
/** Sexta, TA 5 (linha 4, coluna 4): a AEC descrita do controle da edição. */
const CELULA_DA_AEC_EDITADA = "4:4";
/** O cartão único do lançamento já na grade (`AcoesDoBloco`). */
const CARTAO = '[data-slot="acoes-do-bloco"]';

/** Cliente de serviço — **só** para CONFERIR no banco o que a tela gravou (ou não gravou). */
let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("dsaestudo", p);
  await criarConta(EMAIL, `USR-DSEI-${p}`);
  S = await semearDsa(p, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(S);
  await apagarConta(EMAIL);
});

/** Ficha da turma → *Abrir o DSA* → o dia no calendário → a semana de referência. */
async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA, SEMANA, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

async function abrirCelula(page: Page, celula: string): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
}

async function idDaTurma(): Promise<string> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? "";
}

/** As atividades ATIVAS da turma na sexta, num TA — lidas pelo BANCO. */
async function atividadesNoTa(
  categoria: string,
  ta: number,
): Promise<{ descricao: string | null; salvo: boolean; subtipo: string | null }[]> {
  const { data, error } = await banco()
    .from("atividades_nao_letivas")
    .select("descricao, salvo, subtipo")
    .eq("turma_id", await idDaTurma())
    .eq("data", SEXTA)
    .eq("ta_inicial", ta)
    .eq("categoria_normativa", categoria)
    .eq("status", "ativo");
  if (error) throw new Error(`não li as atividades da sexta: ${error.message}`);
  return (data ?? []) as { descricao: string | null; salvo: boolean; subtipo: string | null }[];
}

/**
 * O desfecho do «Lançar», sem decidir por tempo: recusou, fechou ou avisou. ⚠️ Alerta mantém o formulário aberto e o
 * lançamento GRAVOU (`RN-DEG-02`).
 */
async function desfechoDoLancar(page: Page): Promise<string> {
  const recusa = page.locator('[data-slot="recusa-do-lancamento"]');
  if ((await recusa.count()) > 0) return `recusou: ${await recusa.innerText()}`;
  if ((await page.locator(FORMULARIO).count()) === 0) return "fechou";
  if ((await page.locator('[data-slot="avisos-do-lancamento"]').count()) > 0) return "avisou";
  return "em curso";
}

/** O desfecho do «Gravar» do cartão de edição — o mesmo de `desfechoDoLancar`, com os `data-slot` do cartão. */
async function desfechoDaEdicao(page: Page): Promise<string> {
  const recusa = page.locator('[data-slot="recusa-da-acao"]');
  if ((await recusa.count()) > 0) return `recusou: ${await recusa.innerText()}`;
  if ((await page.locator(CARTAO).count()) === 0) return "fechou";
  if ((await page.locator('[data-slot="avisos-da-acao"]').count()) > 0) return "avisou";
  return "em curso";
}

/**
 * Lança, pela célula vazia da sexta, uma atividade COM «O que é» e a SALVA — o ponto de partida dos casos de edição.
 * ⚠️ Salvar antes de editar é o caso real: a edição de um lançamento salvo grava na SOMBRA, e é o *Salvar minuta*
 *    seguinte que leva o valor da sombra ao salvo (`app.aplicar_rascunhos_da_semana`).
 */
async function lancarDescritaESalvar(
  page: Page,
  celula: string,
  tipo: "Estudo_Individual" | "AEC",
  subtipo: string,
  descricao: string,
): Promise<void> {
  await abrirCelula(page, celula);
  await page.locator(`[data-tipo="${tipo}"]`).click();
  await page.locator("#dsa-subtipo").selectOption({ label: subtipo });
  await page.locator("#dsa-tempos").fill("1");
  await page.locator("#dsa-descricao").fill(descricao);
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect.poll(() => desfechoDoLancar(page), { timeout: 60_000 }).not.toBe("em curso");
  expect(await desfechoDoLancar(page), "o lançamento foi recusado").not.toMatch(/^recusou/);
  /* Com aviso (`RN-DEG-02`) o formulário fica aberto e o lançamento GRAVOU: fecha para chegar à barra. */
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.locator(FORMULARIO).getByRole("button", { name: "Cancelar" }).click();
  }
  await salvarASemana(page);
}

/**
 * Abre o cartão de edição do lançamento da célula — e confere que é o lançamento certo, pelo «O que é» gravado.
 * ⚠️ O clique vem logo depois do *Salvar minuta*, que redesenha a grade: no CI de 29/10/2026 (PR #105) o clique chegou
 *    no meio do redesenho, o cartão não abriu, e os dois casos de edição passaram só na repetição. Clicar de novo até o
 *    cartão abrir mede o que importa — que a célula abre o cartão — sem depender de quando a grade termina de chegar.
 */
async function abrirCartaoDescrito(page: Page, celula: string, descricao: string): Promise<void> {
  const celulaDaGrade = page.locator(`${GRADE} td[data-celula="${celula}"]`);
  await expect(async () => {
    await celulaDaGrade.click();
    await expect(page.locator(CARTAO)).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.locator("#dsa-editar-conteudo")).toHaveValue(descricao);
}

test("FR-002 · o Estudo Individual SEM «O que é» lança, salva e grava a descrição NULA", async ({
  page,
}) => {
  await abrirASemana(page);
  await abrirCelula(page, CELULA_DO_EI);
  await page.locator('[data-tipo="Estudo_Individual"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Estudo Individual" });
  await expect(page.locator('[data-slot="categoria-do-tipo"]')).toHaveText(
    "Conta como: Estudo Individual (fora da CHT)",
  );
  await page.locator("#dsa-tempos").fill("1");

  const oQueE = page.locator("#dsa-descricao");
  await expect(oQueE).toHaveValue("");
  /*
   * ⚠️ **A ASSERÇÃO QUE VIRA.** Com o `required` de antes, o campo vazio está em falta e o navegador não envia o
   *    formulário — o «Lançar» não chega à ação, e o caso esperaria um desfecho que nunca vem.
   */
  await expect(oQueE, "o navegador barra o «O que é» vazio do Estudo Individual").toHaveJSProperty(
    "validity.valueMissing",
    false,
  );
  await expect(page.locator('label[for="dsa-descricao"]')).toContainText("opcional");

  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect.poll(() => desfechoDoLancar(page), { timeout: 60_000 }).not.toBe("em curso");
  expect(await desfechoDoLancar(page), "o lançamento foi recusado").not.toMatch(/^recusou/);

  /* Spec 024 (RP-0): o lançado pela grade é rascunho até o «Salvar minuta». */
  await salvarASemana(page);

  /* ⚠️ A prova é o BANCO: Estudo Individual, salvo, com a descrição NULA — nada a preenche no lugar da pessoa (D-5). */
  await expect
    .poll(() => atividadesNoTa("Estudo_Individual", 8), { timeout: 30_000 })
    .toEqual([{ descricao: null, salvo: true, subtipo: "Estudo Individual" }]);
});

test("controle · a AEC com «O que é» vazio continua barrada — no navegador e na ação", async ({
  page,
}) => {
  await abrirASemana(page);
  await abrirCelula(page, CELULA_DA_AEC);
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Palestra" });
  await page.locator("#dsa-tempos").fill("1");

  const oQueE = page.locator("#dsa-descricao");
  await expect(page.locator('label[for="dsa-descricao"]')).not.toContainText("opcional");
  await expect(oQueE).toHaveValue("");

  /* 1ª camada: vazio, o navegador barra — o formulário fica aberto e o campo em falta. */
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await expect(oQueE, "a AEC sem «O que é» deixou de ser obrigatória na tela").toHaveJSProperty(
    "validity.valueMissing",
    true,
  );

  /*
   * 2ª camada: só de espaços passa pelo `required` do navegador, e quem recusa é o servidor — com a frase, e não com o
   * código cru do banco. É a defesa que sobra num `curl`.
   */
  await oQueE.fill("   ");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator('[data-slot="recusa-do-lancamento"]')).toContainText(
    "Escreva o que é a atividade.",
  );

  /* E nada foi gravado. */
  expect(await atividadesNoTa("AEC", 7)).toEqual([]);
});

/*
 * ⚠️ **FR-002.1 · «AO LANÇAR OU EDITAR»** (achado 11 da revisão do Bloco 14). O cartão manda `conteudo: null` quando a
 *    pessoa limpa o *"O que é"*, e a Server Action decide por `recusaDaDescricaoNaEdicao` (a categoria é a da LINHA).
 *    Os dois casos abaixo são os dois sentidos da guarda:
 *    - sem a condição da categoria, o EI apagado é recusado — e o primeiro caso reprova no desfecho;
 *    - sem a guarda, a AEC apagada chega ao banco e volta com a frase do `CHECK` traduzido, mais longa — e o segundo
 *      reprova no `toHaveText` EXATO (um `toContainText` passaria com as duas frases).
 */
test("FR-002.1 · editar: apagar o «O que é» de um Estudo Individual descrito grava a descrição NULA", async ({
  page,
}) => {
  const descricao = `Leitura dirigida ${Date.now().toString(36)}`;
  await abrirASemana(page);
  await lancarDescritaESalvar(
    page,
    CELULA_DO_EI_EDITADO,
    "Estudo_Individual",
    "Estudo Individual",
    descricao,
  );
  /* O ponto de partida, no banco: o EI SALVO, com a descrição escrita. */
  await expect
    .poll(() => atividadesNoTa("Estudo_Individual", 6), { timeout: 30_000 })
    .toEqual([{ descricao, salvo: true, subtipo: "Estudo Individual" }]);

  await abrirCartaoDescrito(page, CELULA_DO_EI_EDITADO, descricao);
  await page.locator("#dsa-editar-conteudo").fill("");
  await page.locator('[data-slot="gravar-edicao"]').click();
  await expect.poll(() => desfechoDaEdicao(page), { timeout: 60_000 }).not.toBe("em curso");
  expect(
    await desfechoDaEdicao(page),
    "a edição que apagou o «O que é» do Estudo Individual foi recusada",
  ).not.toMatch(/^recusou/);
  if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");

  /* Spec 024 (RP-0): a edição é rascunho (na sombra) até o «Salvar minuta». */
  await salvarASemana(page);

  /* ⚠️ A prova é o BANCO: o MESMO Estudo Individual, salvo, agora com a descrição NULA (D-5) — e uma linha só. */
  await expect
    .poll(() => atividadesNoTa("Estudo_Individual", 6), { timeout: 30_000 })
    .toEqual([{ descricao: null, salvo: true, subtipo: "Estudo Individual" }]);
});

test("controle · editar: apagar o «O que é» de uma AEC descrita é recusado com a frase do lançar, e o banco não muda", async ({
  page,
}) => {
  const descricao = `Palestra de segurança ${Date.now().toString(36)}`;
  await abrirASemana(page);
  await lancarDescritaESalvar(page, CELULA_DA_AEC_EDITADA, "AEC", "Palestra", descricao);
  await expect
    .poll(() => atividadesNoTa("AEC", 5), { timeout: 30_000 })
    .toEqual([{ descricao, salvo: true, subtipo: "Palestra" }]);

  await abrirCartaoDescrito(page, CELULA_DA_AEC_EDITADA, descricao);
  await page.locator("#dsa-editar-conteudo").fill("");
  await page.locator('[data-slot="gravar-edicao"]').click();
  /*
   * ⚠️ A FRASE EXATA: a do `CHECK` traduzido («Escreva o que é a atividade. Só o Estudo Individual pode ficar sem o
   *    «O que é».») CONTÉM esta — sem a guarda da edição, `toContainText` continuaria verde.
   */
  await expect(page.locator('[data-slot="recusa-da-acao"]')).toHaveText(
    "Escreva o que é a atividade.",
  );
  /* O cartão fica aberto, com o campo como a pessoa o deixou: nada foi gravado. */
  await expect(page.locator(CARTAO)).toBeVisible();

  /* E o BANCO não mudou: a AEC salva continua com a descrição, e não há sombra (rascunho) dela. */
  expect(await atividadesNoTa("AEC", 5)).toEqual([{ descricao, salvo: true, subtipo: "Palestra" }]);
});

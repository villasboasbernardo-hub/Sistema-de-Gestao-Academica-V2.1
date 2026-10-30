/**
 * Spec 024 (Bloco 9) — o rascunho e a publicação do DSA, por clique (SC-001 a SC-004), e a EAD sem contagem (SC-007).
 *
 *   1. Lançar no DSA é RASCUNHO: o cartão diz «não salvo» e a CH da turma não muda; a prévia pede salvar.
 *   2. Salvar: conta. Gerar prévia: o papel sai com PRÉVIA e ALT em branco.
 *   3. Publicar: a semana trava (o painel oferece só «Fazer alteração»).
 *   4. Fazer alteração → lançar → Publicar alteração: sem justificativa é recusado; com ela, ALT 1.
 *   5. Reimprimir: a original sai com «ORIGINAL», a ALT 1 com «ALT 1» (Bloco 16, RP-1; até ali «ALT —»).
 *   6. Descartar rascunho: o lançamento sai da grade e fica INATIVO no banco (não apagado).
 *   7. A turma EAD: o andamento da ficha diz que o controle é da Divisão de Ensino a Distância.
 *   8. Spec 029 (Bloco 14), RP-9 — Fazer alteração → lançar → «Salvar alteração»: conta na CH, o selo diz *Em alteração ·
 *      salva*, e o papel (Imprimir, Reimprimir, histórico, Início) continua o PUBLICADO; sair e voltar mantém a alteração;
 *      «Descartar rascunho» volta ao último salvo; «Publicar alteração» → ALT 1 com o tópico salvo.
 *
 * ⚠️ `goto` só no login (e para voltar da impressão). ⚠️ **AS SEMANAS 9 E 10 DE 2026** (23/02 a 06/03): a semente do DSA
 *    lança na 15, e a trava é por turma — cada processo tem a sua turma, nenhuma outra suíte toca estas semanas.
 * ⚠️ **E A SEMANA 6** (02 a 06/02/2026), do caso 8. ⚠️ **NÃO A 11**, que o primeiro desenho do caso usava: o RD-1 de
 *    `bloco-11-dsa.spec.ts` lança na segunda 09/03 da MESMA turma (a do processo), e uma semana publicada aqui ficaria
 *    travada para sempre (a trilha é imutável) — e `atividades-filtro-de-data.spec.ts` grava uma AEC em 10/03 no TA 1.
 *    A 6 não aparece em nenhum outro arquivo, e não tem feriado nem na cópia do remoto.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";
import { dataComDiaDaSemana } from "@/lib/formato/data";

test.describe.configure({ mode: "serial" });

const ANO = 2026;
const SEMANA = 9;
const SEGUNDA = "2026-02-23";
const TERCA = "2026-02-24";
const QUARTA = "2026-02-25";
const SEMANA_DO_DESCARTE = 10;
const SEGUNDA_DO_DESCARTE = "2026-03-02";
/** Spec 029 (RP-9): a semana do «Salvar alteração» — ver o cabeçalho. */
const SEMANA_DA_ALTERACAO = 6;
const SEGUNDA_DA_ALTERACAO = "2026-02-02";
const TERCA_DA_ALTERACAO = "2026-02-03";
const QUARTA_DA_ALTERACAO = "2026-02-04";

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
const topico = (n: string) => `Aula B9 ${n} ${MARCA}`;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function idDaTurma(): Promise<string> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  return (data as { id: string }).id;
}

async function taDaTurma(): Promise<number> {
  const { data } = await banco()
    .from("vw_carga_horaria_turma")
    .select("ta_aula")
    .eq("turma_codigo", S.turmaComRelogio)
    .single();
  return Number((data as { ta_aula: number }).ta_aula);
}

/** As linhas da aula pelo tópico, na ordem em que nasceram — o rascunho e a sombra são linhas (spec 024, RP-0). */
async function aulaNoBanco(conteudo: string): Promise<{ status: string; salvo: boolean }[]> {
  const { data } = await banco()
    .from("registros_aula")
    .select("status, salvo")
    .eq("conteudo_resumo", conteudo)
    .order("criado_em");
  return (data ?? []) as { status: string; salvo: boolean }[];
}

/** Os tipos de evento da trilha da semana, na ordem em que aconteceram. */
async function trilhaDaSemana(semana: number): Promise<string[]> {
  const { data } = await banco()
    .from("dsa_eventos_da_semana")
    .select("tipo")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO)
    .eq("semana", semana)
    .order("ocorrido_em")
    .order("criado_em");
  return ((data ?? []) as { tipo: string }[]).map((e) => e.tipo);
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  MARCA = `p${p}`;
  ADMIN = emailDeTeste("publicacao", p);
  await criarConta(ADMIN, `USR-PUB-${p}`);
  S = await semearDsa(p, ADMIN);
});

test.afterAll(async () => {
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B9 % ${MARCA}`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

async function abrirASemana(page: Page, segunda: string, semana: number): Promise<void> {
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segunda, semana, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function lancarAula(page: Page, ta: number, dia: string, texto: string): Promise<void> {
  await celula(page, ta, dia).click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(texto);
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
}

const situacao = (page: Page) => page.locator('[data-slot="publicacao-do-dsa"]');

/**
 * Abre a aba de uma versão publicada (Bloco 15, spec 030, `FR-007`) — por clique, como alguém usa — e espera o papel dela.
 * O histórico deixou de ser a lista *Versões publicadas*: cada versão é uma aba, com o papel, a justificativa e o
 * *Reimprimir*.
 */
async function abrirAVersao(page: Page, numero: number): Promise<void> {
  await page.locator(`[data-slot="abas-de-versao"] [data-versao="${numero}"]`).click();
  await expect(
    page.locator(`[data-slot="papel-da-versao"][data-versao-aberta="${numero}"]`),
  ).toBeVisible();
}

test("SC-001/SC-003/SC-004 · rascunho → salvar → prévia → publicar → alteração (ALT 1) → reimprimir", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const antes = await taDaTurma();
  await abrirASemana(page, SEGUNDA, SEMANA);
  /* D-18: a semana sem rascunho já está registrada — o que existe nasce salvo. */
  await expect(situacao(page)).toHaveAttribute("data-situacao", "registrado");

  /* 1. Lançar é rascunho: «não salvo», e a CH não muda. */
  await lancarAula(page, 3, TERCA, topico("um"));
  await expect(page.locator('[data-slot="nao-salvo"]').first()).toBeVisible();
  await expect(page.locator('[data-slot="nao-salvos"]')).toContainText("1 lançamento não salvo");
  const { data: rascunho } = await banco()
    .from("registros_aula")
    .select("salvo")
    .eq("conteudo_resumo", topico("um"))
    .single();
  expect((rascunho as { salvo: boolean }).salvo).toBe(false);
  expect(await taDaTurma(), "o rascunho NÃO conta (RP-8)").toBe(antes);
  await expect(situacao(page)).toHaveAttribute("data-situacao", "em_preenchimento");
  await expect(page.locator('[data-slot="imprimir-dsa"]')).toHaveAttribute(
    "data-desabilitado",
    "sim",
  );

  /* 2. Salvar: conta. */
  await salvarASemana(page);
  await expect(situacao(page)).toHaveAttribute("data-situacao", "registrado");
  await expect.poll(taDaTurma).toBe(antes + 1);

  /* Gerar prévia: PRÉVIA na marca e no campo ALT (Bloco 16, RP-1). */
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveText("PRÉVIA");
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("PRÉVIA");
  await page.goBack();
  await expect(situacao(page)).toBeVisible();

  /* 3. Publicar: trava. */
  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Semana publicada (original)",
  );
  await expect(situacao(page)).toHaveAttribute("data-situacao", "publicado");
  await expect(page.locator('[data-slot="fazer-alteracao"]')).toBeVisible();
  await expect(page.locator('[data-slot="salvar-semana"]')).toHaveCount(0);
  await expect(page.locator('[data-versao="0"]')).toContainText("Original");

  /* 4. Fazer alteração → lançar → publicar alteração (sem e com justificativa). */
  await page.locator('[data-slot="fazer-alteracao"]').click();
  await expect(situacao(page)).toHaveAttribute("data-situacao", "alteracao_em_andamento");
  await lancarAula(page, 3, QUARTA, topico("dois"));
  await expect(page.locator('[data-slot="nao-salvos"]')).toContainText("1 lançamento não salvo");
  await page.locator('[data-slot="publicar-alteracao"]').click();
  const form = page.locator('[data-slot="formulario-da-alteracao"]');
  await form.locator("#justificativa-da-alteracao").fill("curta");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(form.getByRole("alert")).toContainText("justificativa");
  await form
    .locator("#justificativa-da-alteracao")
    .fill("Inclusão de aula por remanejamento do instrutor");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("ALT 1");
  await expect(situacao(page)).toHaveAttribute("data-situacao", "publicado");
  await abrirAVersao(page, 1);
  await expect(page.locator('[data-slot="justificativa-da-versao"]')).toContainText(
    "Inclusão de aula por remanejamento",
  );
  await expect.poll(taDaTurma).toBe(antes + 2);
  const { data: eventos } = await banco()
    .from("dsa_eventos_da_semana")
    .select("tipo, numero")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO)
    .eq("semana", SEMANA)
    .in("tipo", ["publicado", "alteracao_publicada"])
    .order("numero");
  expect(eventos).toEqual([
    { tipo: "publicado", numero: 0 },
    { tipo: "alteracao_publicada", numero: 1 },
  ]);

  /* 5. Reimprimir, pela aba de cada versão: a original com «ORIGINAL» (Bloco 16, RP-1), a ALT 1 com «ALT 1». */
  await abrirAVersao(page, 0);
  await page.locator('[data-slot="papel-da-versao"] [data-slot="reimprimir-versao"]').click();
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ORIGINAL");
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveCount(0);
  await page.goBack();
  await abrirAVersao(page, 1);
  await page.locator('[data-slot="papel-da-versao"] [data-slot="reimprimir-versao"]').click();
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT 1");
});

test("SC-002 · descartar o rascunho: sai da grade e fica inativo no banco", async ({ page }) => {
  test.setTimeout(180_000);
  await abrirASemana(page, SEGUNDA_DO_DESCARTE, SEMANA_DO_DESCARTE);
  await lancarAula(page, 3, SEGUNDA_DO_DESCARTE, topico("descartada"));
  await expect(page.locator('[data-slot="nao-salvos"]')).toBeVisible();
  await page.locator('[data-slot="descartar-rascunho"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Descartar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Rascunho descartado",
  );
  await expect(page.locator('[data-slot="nao-salvos"]')).toHaveCount(0);
  const { data } = await banco()
    .from("registros_aula")
    .select("status, salvo")
    .eq("conteudo_resumo", topico("descartada"))
    .single();
  expect(data).toEqual({ status: "inativo", salvo: false });
});

test("SC-007 · a turma EAD: o andamento é da Divisão de Ensino a Distância", async ({ page }) => {
  test.setTimeout(120_000);
  await irAFichaDaTurma(page, ADMIN, S.turmaEad);
  await expect(page.locator('[data-slot="andamento-ead"]')).toContainText(
    "Divisão de Ensino a Distância",
  );
  await expect(page.locator('[data-slot="em-atraso"]')).toHaveCount(0);
});

/*
 * Spec 029 (Bloco 14), item 3 — RP-9, *Salvar alteração* (FR-003; D-8, D-23 a D-25, D-29).
 *
 * ⚠️ **POR ÚLTIMO NO ARQUIVO, DE PROPÓSITO**: o arquivo é serial, e um caso que reprova pula os seguintes. Antes da spec
 *    029 este reprova (o botão não existe), e não pode levar o SC-007 junto.
 * ⚠️ **O PAPEL É CONFERIDO PELO TÓPICO DENTRO DO CARTÃO**, nunca pelo ALT só: a original e a semana com a alteração salva
 *    têm o mesmo «ORIGINAL», e só o conteúdo distingue o retrato publicado do salvo de hoje.
 */
test("RP-9 · Fazer alteração → lançar → «Salvar alteração»: conta na CH e o papel segue o publicado; sair e voltar; Descartar volta ao salvo; Publicar → ALT 1", async ({
  page,
}) => {
  test.setTimeout(420_000);
  const daOriginal = topico("rp9-original");
  const daAlteracao = topico("rp9-alteracao");
  const descartada = topico("rp9-descartada");
  const selo = page.locator('[data-slot="selo-da-semana"]');
  const naoSalvos = page.locator('[data-slot="nao-salvos"]');
  const resposta = page.locator('[data-slot="resposta-da-publicacao"]');
  const salvarAlteracao = page.locator('[data-slot="salvar-alteracao"]');
  /* RP-9, D-25: a linha «Alteração salva…» e a nota do rascunho, abaixo do cabeçalho (`VersoesPublicadas`). */
  const linhaDaAlteracaoSalva = page.locator('[data-slot="alteracao-salva"]');
  const notaDoRascunho = page.locator('[data-slot="nota-do-rascunho"]');
  const NOTA_DO_RASCUNHO_NA_ALTERACAO =
    "O que não foi salvo fica guardado, mas não conta na CH nem no andamento até «Salvar alteração»; o papel só muda com «Publicar alteração».";
  const cartaoNoPapel = (texto: string) =>
    page.locator('[data-slot="dsa-impresso"] [data-slot="dsa-cartao"]').filter({ hasText: texto });
  const naGrade = (texto: string) =>
    page.locator('[data-slot="grade-da-semana"] td').filter({ hasText: texto });

  const antes = await taDaTurma();
  await abrirASemana(page, SEGUNDA_DA_ALTERACAO, SEMANA_DA_ALTERACAO);
  await expect(
    situacao(page),
    "a semana 6 desta turma já foi usada (a trilha é imutável) — rode o db:reset:limpo",
  ).toHaveAttribute("data-situacao", "registrado");

  /* A original: lançar, salvar e publicar. */
  await lancarAula(page, 3, SEGUNDA_DA_ALTERACAO, daOriginal);
  await salvarASemana(page);
  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(resposta).toContainText("Semana publicada (original)");
  await expect(selo).toHaveAttribute("data-selo", "Publicado");
  await expect.poll(taDaTurma).toBe(antes + 1);

  /* Fazer alteração → lançar: rascunho, não conta (RP-8). */
  await page.locator('[data-slot="fazer-alteracao"]').click();
  await expect(selo).toHaveAttribute("data-selo", "Em alteração");
  await lancarAula(page, 3, TERCA_DA_ALTERACAO, daAlteracao);
  await expect(naoSalvos).toContainText("1 lançamento não salvo");
  expect(await taDaTurma(), "o rascunho da alteração contou antes de salvar").toBe(antes + 1);
  /*
   * ⚠️ RP-9, D-25 (achado 14 da revisão do Bloco 14): na alteração, a nota do rascunho NÃO promete o papel ao «Salvar
   *    alteração» — até 28/10/2026 ela dizia «não conta em nada (CH, andamento, papel) até «Salvar alteração»», e o papel
   *    só muda no «Publicar alteração» (conferido abaixo pelo Imprimir e pelo Reimprimir). Frase EXATA.
   */
  await expect(notaDoRascunho).toHaveText(NOTA_DO_RASCUNHO_NA_ALTERACAO);
  /* Controle: nada foi salvo nesta alteração ainda — a linha da D-25 não aparece. */
  await expect(linhaDaAlteracaoSalva).toHaveCount(0);

  /*
   * ⚠️ O CASO QUE DISCRIMINA (FR-003.1): a semana em alteração oferece «Salvar alteração», logo antes de «Publicar
   *    alteração». Antes da spec 029, a alteração só contava publicada. O «Salvar minuta» continua fora da alteração.
   * ⚠️ Pelo `data-slot` e pelo nome acessível, nunca pela dica — que é só o verbo, «Salvar» (RT-1).
   */
  await expect(
    salvarAlteracao,
    "a semana em alteração não oferece «Salvar alteração» (RP-9)",
  ).toBeVisible();
  await expect(salvarAlteracao).toHaveAccessibleName("Salvar alteração");
  await expect(page.locator('[data-slot="salvar-semana"]')).toHaveCount(0);
  const ordem = await page
    .locator('[data-slot="publicacao-do-dsa"] [data-slot="barra-de-acoes"]')
    .evaluate((barra) =>
      [...barra.querySelectorAll("[data-slot]")]
        .map((e) => e.getAttribute("data-slot"))
        .filter((s): s is string =>
          ["imprimir-dsa", "salvar-alteracao", "publicar-alteracao", "descartar-rascunho"].includes(
            s ?? "",
          ),
        ),
    );
  expect(ordem, "«Salvar alteração» fora do lugar (logo antes de «Publicar alteração»)").toEqual([
    "imprimir-dsa",
    "salvar-alteracao",
    "publicar-alteracao",
    "descartar-rascunho",
  ]);

  await salvarAlteracao.click();
  await expect(resposta).toContainText("Alteração salva");
  await expect(naoSalvos).toHaveCount(0);
  await expect(selo).toHaveAttribute("data-selo", "Em alteração · salva");
  await expect(situacao(page)).toHaveAttribute("data-situacao", "alteracao_em_andamento");
  /* Salvar não publica: a alteração continua por publicar, e o botão fica sem rascunho (D-23). */
  await expect(page.locator('[data-slot="publicar-alteracao"]')).toBeVisible();
  await expect(salvarAlteracao).toBeVisible();
  await expect(page.locator('[data-slot="fazer-alteracao"]')).toHaveCount(0);

  /* O banco: a linha é SALVA e conta na CH; a trilha ganha um `salvo` e nenhuma publicação (D-24). */
  expect(await aulaNoBanco(daAlteracao)).toEqual([{ status: "ativo", salvo: true }]);
  await expect.poll(taDaTurma, { message: "a alteração salva não contou na CH" }).toBe(antes + 2);
  expect(await trilhaDaSemana(SEMANA_DA_ALTERACAO)).toEqual([
    "salvo",
    "publicado",
    "alteracao_iniciada",
    "salvo",
  ]);

  /* O papel continua o PUBLICADO (FR-003.2): Imprimir (a versão vigente) sai sem o tópico salvo na alteração. */
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ORIGINAL");
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveCount(0);
  await expect(cartaoNoPapel(daOriginal)).toHaveCount(1);
  await expect(
    cartaoNoPapel(daAlteracao),
    "o salvo da alteração chegou ao papel antes de publicar",
  ).toHaveCount(0);
  await page.goBack();
  await expect(situacao(page)).toBeVisible();

  /* As abas: a Minuta e só a Original — e o Reimprimir dela, também sem o tópico salvo. */
  await expect(
    page.locator('[data-slot="abas-de-versao"] > [role="tablist"] [role="tab"]'),
  ).toHaveCount(2);
  await expect(page.locator('[data-versao="0"]')).toContainText("Original");
  await expect(page.locator('[data-versao="1"]')).toHaveCount(0);
  await abrirAVersao(page, 0);
  await page.locator('[data-slot="papel-da-versao"] [data-slot="reimprimir-versao"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("versao")).toBe("0");
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ORIGINAL");
  await expect(cartaoNoPapel(daOriginal)).toHaveCount(1);
  await expect(cartaoNoPapel(daAlteracao)).toHaveCount(0);
  await page.goBack();
  await expect(situacao(page)).toBeVisible();

  /*
   * Sair por clique (o código da turma na linha do cabeçalho — Bloco 15, `FR-009`) e voltar por clique (Abrir o DSA):
   * a alteração salva continua lá.
   */
  await page.locator('[data-slot="publicacao-do-dsa"] [data-slot="turma-do-dsa"]').click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(S.turmaComRelogio)}`);
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA_DA_ALTERACAO, SEMANA_DA_ALTERACAO, ANO);
  await expect(situacao(page)).toHaveAttribute("data-situacao", "alteracao_em_andamento");
  await expect(naGrade(daAlteracao).first()).toBeVisible();
  await expect(naGrade(daAlteracao).first().locator('[data-slot="nao-salvo"]')).toHaveCount(0);
  await expect(naoSalvos).toHaveCount(0);
  await expect(selo).toHaveAttribute("data-selo", "Em alteração · salva");
  /* D-25: a tela diz que a alteração salva ainda não chegou ao papel publicado. */
  await expect(page.getByText(/papel publicado.*continua valendo/)).toBeVisible();

  /* SC-003: o Início também continua no papel PUBLICADO — a original, sem o tópico da alteração (RD-7). */
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Início", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/inicio");
  await expect(page.locator('[data-slot="dsa-publicados"]')).toBeVisible();
  const campoDaSemana = page.locator('[data-slot="data-da-semana"]');
  if (!(await campoDaSemana.isVisible())) {
    await page.locator('[data-slot="abrir-calendario-da-semana"]').click();
  }
  await campoDaSemana.fill(SEGUNDA_DA_ALTERACAO);
  await expect
    .poll(() => new URL(page.url()).searchParams.get("semana"))
    .toBe(SEGUNDA_DA_ALTERACAO);
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    `${ANO}-${SEMANA_DA_ALTERACAO}`,
  );
  const papelNoInicio = page.locator(
    `[data-slot="carrossel-do-dsa"] [data-turma="${S.turmaComRelogio}"]`,
  );
  await expect(papelNoInicio).toHaveCount(1);
  await expect(papelNoInicio.locator("figcaption")).toContainText("original");
  const cartaoNoInicio = (texto: string) =>
    papelNoInicio.locator('[data-slot="dsa-cartao"]').filter({ hasText: texto });
  await expect(cartaoNoInicio(daOriginal)).toHaveCount(1);
  await expect(cartaoNoInicio(daAlteracao), "o Início mostrou o salvo da alteração").toHaveCount(0);

  /* De volta ao DSA (pelo menu), lançar outra e descartar: volta ao último SALVO, não ao publicado (FR-003.4, D-29). */
  await abrirASemana(page, SEGUNDA_DA_ALTERACAO, SEMANA_DA_ALTERACAO);
  await lancarAula(page, 3, QUARTA_DA_ALTERACAO, descartada);
  await expect(naoSalvos).toContainText("1 lançamento não salvo");
  /* D-8: com rascunho novo, o selo deixa de dizer «salva». */
  await expect(selo).toHaveAttribute("data-selo", "Em alteração");
  /*
   * ⚠️ O CASO QUE DISCRIMINA (D-25; achado 5 da revisão do Bloco 14): o selo perdeu o «· salva», mas o que foi SALVO nesta
   *    alteração continua contando na CH e fora do papel — a linha da D-25 FICA. Até 28/10/2026 ela lia o mesmo sinal do
   *    selo e sumia com o rascunho novo, deixando a tela sem dizer o descompasso entre a CH e o papel.
   */
  await expect(
    linhaDaAlteracaoSalva,
    "a linha «Alteração salva…» sumiu com o rascunho novo (D-25)",
  ).toBeVisible();
  await expect(notaDoRascunho).toHaveText(NOTA_DO_RASCUNHO_NA_ALTERACAO);
  await page.locator('[data-slot="descartar-rascunho"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Descartar" })
    .click();
  await expect(resposta).toContainText("Rascunho descartado");
  await expect(naoSalvos).toHaveCount(0);
  await expect(selo).toHaveAttribute("data-selo", "Em alteração · salva");
  await expect(naGrade(descartada)).toHaveCount(0);
  await expect(naGrade(daAlteracao).first()).toBeVisible();
  expect(await aulaNoBanco(descartada)).toEqual([{ status: "inativo", salvo: false }]);
  expect(await aulaNoBanco(daAlteracao), "o descarte desfez o que estava SALVO").toEqual([
    { status: "ativo", salvo: true },
  ]);
  expect(await taDaTurma()).toBe(antes + 2);

  /* Publicar alteração, com justificativa: ALT 1, com o tópico SALVO — e sem o descartado. */
  await page.locator('[data-slot="publicar-alteracao"]').click();
  const form = page.locator('[data-slot="formulario-da-alteracao"]');
  await form
    .locator("#justificativa-da-alteracao")
    .fill("Aula acrescentada e salva antes de publicar");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(resposta).toContainText("ALT 1");
  await expect(selo).toHaveAttribute("data-selo", "ALT 1");
  await expect(situacao(page)).toHaveAttribute("data-situacao", "publicado");
  await abrirAVersao(page, 1);
  await expect(page.locator('[data-slot="justificativa-da-versao"]')).toContainText(
    "Aula acrescentada e salva",
  );
  expect(await taDaTurma()).toBe(antes + 2);
  const { data: publicacoes } = await banco()
    .from("dsa_eventos_da_semana")
    .select("tipo, numero")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO)
    .eq("semana", SEMANA_DA_ALTERACAO)
    .in("tipo", ["publicado", "alteracao_publicada"])
    .order("numero");
  expect(publicacoes).toEqual([
    { tipo: "publicado", numero: 0 },
    { tipo: "alteracao_publicada", numero: 1 },
  ]);
  await page.locator('[data-slot="papel-da-versao"] [data-slot="reimprimir-versao"]').click();
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT 1");
  await expect(cartaoNoPapel(daAlteracao)).toHaveCount(1);
  await expect(cartaoNoPapel(daOriginal)).toHaveCount(1);
  await expect(cartaoNoPapel(descartada)).toHaveCount(0);
});

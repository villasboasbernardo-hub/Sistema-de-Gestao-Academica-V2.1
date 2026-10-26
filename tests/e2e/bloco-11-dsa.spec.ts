/**
 * Bloco 11 (spec 026) — o lançamento do DSA e o Início com o DSA publicado, por clique (RD-1 a RD-8,
 * `docs/correcoes/regras-do-dsa-lancamento.md`).
 *
 *   RD-1 · na aula, a lista de quem ministra traz só os habilitados; mudar a disciplina mantendo um instrutor que não é
 *          habilitado nela é RECUSADO pela Server Action (o par final, D-4), e nada muda no banco.
 *   RD-2 · o Estudo Individual automático num dia vazio vai para o ÚLTIMO tempo do regime (8), nunca o 1º.
 *   RD-4 · Limpar semana: no rascunho limpa; na semana publicada não aparece até «Fazer alteração», e então limpa.
 *   RD-5/RD-6 · o selo (Publicado, ALT N) e a barra de ações no cabeçalho, na ordem do pedido.
 *   RD-7/RD-8 · o Início: os cartões por situação, e o papel do DSA PUBLICADO da semana (o salvo não aparece).
 *   RD-3 · turma em 8 tempos troca «desta semana em diante» para 9: as semanas salvas — antes e DEPOIS — continuam com
 *          8, as próximas abrem com 9; e o relógio da semana salva fica indisponível.
 *
 * ⚠️ `goto` só no login. ⚠️ **AS SEMANAS 11 A 18 DE 2026**: as outras suítes do DSA usam 8, 9, 10, 15 (a semente), 20,
 *    28, 34, 47 e a semana corrente — e a turma é de cada processo. O RD-3 roda POR ÚLTIMO e desfaz o «desde» no fim,
 *    porque ele vale para as semanas seguintes da turma.
 * ⚠️ O instrutor é sempre o da semente, pelo código (`DSA-<processo>-INS`), nunca um nome real.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import {
  escolherDisciplina,
  escolherDisciplinaEUnidade,
  irParaASemanaDoDia,
  salvarASemana,
} from "./percurso-do-dsa";
import { dataComDiaDaSemana } from "@/lib/formato/data";

test.describe.configure({ mode: "serial" });

const ANO = 2026;
/** A segunda-feira da semana ISO `n` de 2026 (a semana 1 começa em 29/12/2025). */
const segundaDe = (n: number) =>
  new Date(Date.UTC(2025, 11, 29) + (n - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
type Semana = number;
/*
 * ⚠️ **A SEMANA PUBLICADA É ESCOLHIDA NA HORA**: a trilha da publicação é imutável e a turma da semente persiste entre
 *    execuções (ela não se apaga com trilha), então a semana publicada na rodada anterior não aceita lançamento. A
 *    primeira desta lista sem evento nenhum da turma é a do caso — e a suíte roda duas vezes seguidas (regra 9.1).
 */
const CANDIDATAS_A_PUBLICAR = [17, 19, 21, 22, 23, 24, 25, 26, 27, 29, 31, 32, 33] as const;
let SEMANA_PUBLICADA = 17;

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
let PROCESSO = 0;
/** A disciplina SEM habilitado (RD-1, D-4) e o regime nomeado de 9 tempos (RD-3). */
let COD_SEM_HABILITADO = "";
let NOME_DO_REGIME = "";
let REGIME_ID = "";
const topico = (n: string) => `Aula B11 ${n} ${MARCA}`;

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

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  MARCA = `p${PROCESSO}`;
  ADMIN = emailDeTeste("bloco11", PROCESSO);
  await criarConta(ADMIN, `USR-B11-${PROCESSO}`);
  S = await semearDsa(PROCESSO, ADMIN);

  /* A disciplina sem habilitado nenhum, no mesmo currículo da disciplina comum da semente. */
  const { data: comum } = await banco()
    .from("disciplinas")
    .select("curso_id, curriculo_id")
    .eq("cod_disciplina", S.codDisciplina)
    .eq("codigo", `DSA-E2D${PROCESSO}-DIS`)
    .maybeSingle();
  const base = (comum ??
    (
      await banco()
        .from("disciplinas")
        .select("curso_id, curriculo_id, cursos!inner(codigo)")
        .eq("cod_disciplina", S.codDisciplina)
        .eq("cursos.codigo", S.cursoComRelogio)
        .single()
    ).data) as { curso_id: string; curriculo_id: string | null };
  COD_SEM_HABILITADO = `X${PROCESSO}`;
  const { data: existe } = await banco()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", base.curso_id)
    .eq("cod_disciplina", COD_SEM_HABILITADO)
    .maybeSingle();
  if (!existe) {
    const { error } = await banco()
      .from("disciplinas")
      .insert({
        codigo: `B11-${PROCESSO}-X`,
        curso_id: base.curso_id,
        curriculo_id: base.curriculo_id,
        cod_disciplina: COD_SEM_HABILITADO,
        nome_disciplina: "Disciplina sem habilitado do Bloco 11",
        carga_horaria_tempos: 20,
        sem_unidades_ensino: true,
      });
    if (error) throw new Error(`falha ao criar a disciplina sem habilitado: ${error.message}`);
  }

  /* O regime nomeado de 9 tempos, do currículo da turma (D-12), a mesma régua de 45 min da G45. */
  const { data: turma } = await banco()
    .from("turmas")
    .select("curriculo_id")
    .eq("codigo", S.turmaComRelogio)
    .single();
  const curriculo = (turma as { curriculo_id: string | null }).curriculo_id ?? base.curriculo_id;
  NOME_DO_REGIME = `Regime B11 ${MARCA}`;
  const { data: regime } = await banco()
    .from("regimes_de_horario")
    .select("id")
    .eq("curso_id", base.curso_id)
    .eq("nome", NOME_DO_REGIME)
    .maybeSingle();
  const { data: comEvento } = await banco()
    .from("dsa_eventos_da_semana")
    .select("semana")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO);
  const usadas = new Set(((comEvento ?? []) as { semana: number }[]).map((e) => e.semana));
  const livre = CANDIDATAS_A_PUBLICAR.find((n) => !usadas.has(n));
  if (livre === undefined) {
    throw new Error("nenhuma semana candidata livre para publicar — rode o db:reset:limpo");
  }
  SEMANA_PUBLICADA = livre;

  if (regime) {
    REGIME_ID = (regime as { id: string }).id;
    await banco().from("regimes_de_horario").update({ status: "ativo" }).eq("id", REGIME_ID);
  } else {
    const { data, error } = await banco()
      .from("regimes_de_horario")
      .insert({
        curso_id: base.curso_id,
        curriculo_id: curriculo,
        nome: NOME_DO_REGIME,
        regime_tempos: 9,
        ta_duracao_min: 45,
        intervalo_manha_min: 5,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "07:50",
        hora_inicio_tarde: "13:05",
      })
      .select("id")
      .single();
    if (error) throw new Error(`falha ao criar o regime de 9 tempos: ${error.message}`);
    REGIME_ID = (data as { id: string }).id;
  }
});

test.afterAll(async () => {
  /* O «desde» e o regime gravado das semanas desta turma saem, e o regime de 9 volta a inativo (amostra). */
  if (S) {
    const turmaId = await idDaTurma().catch(() => null);
    if (turmaId) {
      await banco().from("dsa_regime_da_semana").delete().eq("turma_id", turmaId);
      await banco().from("turma_regime_vigencia").delete().eq("turma_id", turmaId);
    }
  }
  if (REGIME_ID) {
    await banco().from("regimes_de_horario").update({ status: "inativo" }).eq("id", REGIME_ID);
  }
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B11 % ${MARCA}`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

async function abrirASemana(page: Page, semana: Semana): Promise<void> {
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segundaDe(semana), semana, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

async function irParaASemana(page: Page, semana: Semana): Promise<void> {
  await irParaASemanaDoDia(page, segundaDe(semana), semana, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

/** Lança uma aula de 1 TA, com o instrutor habilitado da semente (pelo seletor canônico). */
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
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toHaveCount(0);
}

async function aulaNoBanco(texto: string) {
  const { data } = await banco()
    .from("registros_aula")
    .select("id, status, unidade_ensino_id, disciplina_id, salvo, rascunho_exclui")
    .eq("conteudo_resumo", texto)
    .order("criado_em");
  return (data ?? []) as {
    id: string;
    status: string;
    unidade_ensino_id: string | null;
    disciplina_id: string | null;
    salvo: boolean;
    rascunho_exclui: boolean;
  }[];
}

const regimeDaSemana = (page: Page) => page.locator('[data-slot="regime-da-semana"]');

test("RD-1 · a lista da aula é só dos habilitados, e o par final da edição é conferido no servidor", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirASemana(page, 11);

  /* A disciplina SEM habilitado: a frase de habilitar, e nenhum instrutor para escolher. */
  await celula(page, 1, segundaDe(11)).click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toBeVisible();
  await escolherDisciplina(page, COD_SEM_HABILITADO);
  await expect(page.locator('[data-slot="aula-sem-habilitado"]')).toContainText(
    "Nenhum instrutor habilitado nesta disciplina",
  );

  /* A disciplina comum: o habilitado está; o sem vínculo, não. */
  await escolherDisciplinaEUnidade(page, S.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  const painel = page.locator('[data-slot="popover-content"]');
  await expect(
    painel.getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") }).first(),
  ).toBeVisible();
  await expect(
    painel.getByRole("option", { name: new RegExp(S.nomeSemHabilitacao, "i") }),
    "o instrutor SEM habilitação apareceu na lista da aula",
  ).toHaveCount(0);
  await painel
    .getByRole("option", { name: new RegExp(S.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(topico("rd1"));
  await page.locator("#dsa-tempos").fill("1");
  await page.locator('[data-slot="gravar-lancamento"]').click();
  await expect(page.locator('[data-slot="formulario-de-lancamento"]')).toHaveCount(0);
  const [antes] = await aulaNoBanco(topico("rd1"));
  expect(antes?.unidade_ensino_id, "a aula não foi gravada com a UE").not.toBeNull();

  /*
   * ⚠️ O CASO QUE DISCRIMINA (D-4): no cartão, trocar a disciplina para a que não tem habilitado, MANTENDO o
   *    instrutor. Antes do Bloco 11 a edição só conferia quando o instrutor mudava — e gravava.
   */
  await page
    .locator('[data-slot="grade-da-semana"][data-modelo="v4"] td')
    .filter({ hasText: topico("rd1") })
    .first()
    .click();
  const disciplina = page.locator("#dsa-editar-disciplina");
  await expect(disciplina).toBeVisible();
  const opcao = disciplina
    .locator("option")
    .filter({ hasText: new RegExp(`^${COD_SEM_HABILITADO} — `) });
  await disciplina.selectOption((await opcao.getAttribute("value")) ?? "");
  await expect(page.locator('[data-slot="instrutor-nao-habilitado"]')).toBeVisible();
  await page.locator('[data-slot="gravar-edicao"]').click();
  await expect(page.locator('[data-slot="recusa-da-acao"]')).toContainText("não está habilitado");
  const [depois] = await aulaNoBanco(topico("rd1"));
  expect(depois?.unidade_ensino_id, "a disciplina mudou mesmo sem habilitação").toBe(
    antes?.unidade_ensino_id,
  );
  expect(depois?.disciplina_id ?? null).toBeNull();
});

test("RD-2 · o Estudo Individual automático num dia vazio vai para o ÚLTIMO tempo do regime (8), não o 1º — e volta depois do Limpar", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await abrirASemana(page, 12);
  const turmaId = await idDaTurma();
  const { count } = await banco()
    .from("vw_ocupacao_do_dsa")
    .select("fato_id", { count: "exact", head: true })
    .eq("turma_id", turmaId)
    .eq("data", segundaDe(12));
  expect(count, "a segunda da semana 12 não está vazia — o caso não discrimina").toBe(0);

  await page.locator('[data-slot="lancar-estudo-individual"]').click();
  await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toContainText(
    "Estudo Individual lançado",
  );
  const { data } = await banco()
    .from("atividades_nao_letivas")
    .select("ta_inicial")
    .eq("turma_id", turmaId)
    .eq("categoria_normativa", "Estudo_Individual")
    .eq("data", segundaDe(12))
    .eq("status", "ativo");
  expect((data ?? []).map((l) => (l as { ta_inicial: number }).ta_inicial)).toEqual([8]);

  /*
   * ⚠️ Revisão do Bloco 11 (RD-4): depois do *Limpar* de uma semana SALVA, o botão repõe o EI. O salvo excluído fica
   *    ativo até o *Salvar minuta*, com a sombra de exclusão por cima — e o botão contava os dois como «já tem».
   */
  await salvarASemana(page);
  await page.locator('[data-slot="limpar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Limpar a semana" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("Semana limpa");
  await expect
    .poll(async () => {
      const { count: naGrade } = await banco()
        .from("vw_ocupacao_do_dsa")
        .select("fato_id", { count: "exact", head: true })
        .eq("turma_id", turmaId)
        .eq("data", segundaDe(12));
      return naGrade;
    })
    .toBe(0);
  await page.locator('[data-slot="lancar-estudo-individual"]').click();
  await expect(
    page.locator('[data-slot="resposta-do-estudo-individual"]'),
    "o botão não repôs o EI que o Limpar tirou",
  ).toContainText(/Estudo Individual lançado em \d+ dia/);
  const { data: reposto } = await banco()
    .from("vw_ocupacao_do_dsa")
    .select("ta_inicial")
    .eq("turma_id", turmaId)
    .eq("data", segundaDe(12));
  expect((reposto ?? []).map((l) => (l as { ta_inicial: number }).ta_inicial)).toEqual([8]);
});

test("RD-4, RD-5 e RD-6 · Limpar no rascunho; na publicada, só depois de «Fazer alteração»; o selo e a barra", async ({
  page,
}) => {
  test.setTimeout(300_000);

  /* ── no rascunho: limpa ── */
  await abrirASemana(page, 16);
  await lancarAula(page, 1, segundaDe(16), topico("limpar"));
  await expect(page.locator('[data-slot="nao-salvos"]')).toContainText("1 lançamento não salvo");
  await expect(page.locator('[data-slot="selo-da-semana"]')).toHaveAttribute(
    "data-selo",
    "Em preenchimento",
  );
  await page.locator('[data-slot="limpar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Limpar a semana" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("Semana limpa");
  await expect(page.locator('[data-slot="nao-salvos"]')).toHaveCount(0);
  const limpas = await aulaNoBanco(topico("limpar"));
  expect(limpas.map((l) => l.status)).toEqual(["inativo"]);

  /* ── a publicada: sem Limpar até «Fazer alteração» ── */
  await irParaASemana(page, SEMANA_PUBLICADA);
  await lancarAula(page, 1, segundaDe(SEMANA_PUBLICADA), topico("publicada"));
  await salvarASemana(page);
  await expect(page.locator('[data-slot="selo-da-semana"]')).toHaveAttribute(
    "data-selo",
    "Registrado",
  );

  /* RD-6: a barra no cabeçalho, na ordem do pedido; sem o cartão e sem o texto do A4. */
  const ordem = await page
    .locator('[data-slot="publicacao-do-dsa"] [data-slot="barra-de-acoes"]')
    .evaluate((barra) =>
      [...barra.querySelectorAll("[data-slot]")]
        .map((e) => e.getAttribute("data-slot"))
        .filter((s): s is string =>
          [
            "regime-da-semana",
            "limpar-semana",
            "baixar-planilha-de-contingencia",
            "imprimir-dsa",
            "salvar-semana",
            "publicar-semana",
            "descartar-rascunho",
          ].includes(s ?? ""),
        ),
    );
  expect(ordem).toEqual([
    "regime-da-semana",
    "limpar-semana",
    "baixar-planilha-de-contingencia",
    "imprimir-dsa",
    "salvar-semana",
    "publicar-semana",
  ]);
  await expect(page.locator('[data-slot="barra-de-impressao"]')).toHaveCount(0);
  await expect(page.getByText("A4 paisagem")).toHaveCount(0);
  await expect(page.getByText("Situação da semana")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Salvar minuta" })).toBeVisible();

  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Semana publicada (original)",
  );
  await expect(page.locator('[data-slot="selo-da-semana"]')).toHaveAttribute(
    "data-selo",
    "Publicado",
  );
  await expect(
    page.locator('[data-slot="limpar-semana"]'),
    "Limpar numa semana PUBLICADA",
  ).toHaveCount(0);

  await page.locator('[data-slot="fazer-alteracao"]').click();
  await expect(page.locator('[data-slot="selo-da-semana"]')).toHaveAttribute(
    "data-selo",
    "Em alteração",
  );
  await page.locator('[data-slot="limpar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Limpar a semana" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("Semana limpa");
  /* O salvo vira rascunho de EXCLUSÃO: a linha continua ativa até a alteração ser publicada (RP-0, D-18). */
  await expect.poll(async () => (await aulaNoBanco(topico("publicada"))).length).toBe(2);

  await page.locator('[data-slot="publicar-alteracao"]').click();
  const form = page.locator('[data-slot="formulario-da-alteracao"]');
  await form.locator("#justificativa-da-alteracao").fill("Semana limpa por remanejamento da turma");
  await form.locator('[data-slot="gravar-alteracao"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText("ALT 1");
  await expect(page.locator('[data-slot="selo-da-semana"]')).toHaveAttribute("data-selo", "ALT 1");
  await expect
    .poll(
      async () =>
        (await aulaNoBanco(topico("publicada"))).filter((l) => l.status === "ativo").length,
    )
    .toBe(0);
});

test("RD-7 e RD-8 · o Início: os cartões por situação, e o papel só do DSA PUBLICADO da semana", async ({
  page,
}) => {
  test.setTimeout(180_000);
  /* A semana 13 fica só SALVA (sem publicar) — ela não pode aparecer no Início. */
  await abrirASemana(page, 13);
  await lancarAula(page, 1, segundaDe(13), topico("so-salva"));
  await salvarASemana(page);

  await entrar(page, ADMIN, "/inicio");
  const cartoes = page.locator('[data-slot="turmas-do-ano"] [data-slot="card-kpi"]');
  for (const rotulo of ["Turmas ativas", "Planejadas", "Concluídas", "Canceladas"]) {
    await expect(cartoes.filter({ hasText: rotulo })).toHaveCount(1);
  }
  await expect(page.locator('[data-slot="turmas-do-ano"]')).not.toContainText("Progresso");

  const escolher = async (data: string) => {
    /* O campo fica aberto depois de escolher (como no DSA): o ícone só o abre quando está fechado. */
    const campo = page.locator('[data-slot="data-da-semana"]');
    if (!(await campo.isVisible())) {
      await page.locator('[data-slot="abrir-calendario-da-semana"]').click();
    }
    await campo.fill(data);
    await expect.poll(() => new URL(page.url()).searchParams.get("semana")).toBe(data);
  };
  const papelDaTurma = page.locator(
    `[data-slot="carrossel-do-dsa"] [data-turma="${S.turmaComRelogio}"]`,
  );

  /* A semana publicada com ALT 1: o papel dela, com a ALT. */
  await escolher(segundaDe(SEMANA_PUBLICADA));
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    `2026-${SEMANA_PUBLICADA}`,
  );
  await expect(papelDaTurma).toHaveCount(1);
  await expect(papelDaTurma.locator("figcaption")).toContainText("ALT 1");
  await expect(papelDaTurma.locator('[data-slot="dsa-impresso"]')).toHaveCount(1);

  /* A semana 13, só salva: NÃO aparece (o caso que discrimina — o salvo não é publicado). */
  await escolher(segundaDe(13));
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    "2026-13",
  );
  await expect(papelDaTurma).toHaveCount(0);

  /* Uma semana sem DSA publicado de ninguém: a frase, sem carrossel. */
  await escolher("2026-01-05");
  await expect(page.locator('[data-slot="sem-dsa-publicado"]')).toHaveText(
    "Não há DSA publicado para esta semana",
  );
  await expect(page.locator('[data-slot="carrossel-do-dsa"]')).toHaveCount(0);
});

test("RD-3 · em 8 tempos, «desta semana em diante» para 9: as salvas ficam com 8, as próximas abrem com 9", async ({
  page,
}) => {
  test.setTimeout(240_000);
  /* A semana 13 já está SALVA (o caso anterior); a 15 tem a semente, salva. A 14 e a 18 não têm nada. */
  await abrirASemana(page, 14);
  await expect(regimeDaSemana(page)).toHaveAttribute("aria-label", /8 tempos/);

  await regimeDaSemana(page).click();
  const dialogo = page.locator('[data-slot="dialogo-do-regime"]');
  await dialogo.getByLabel(new RegExp(`${NOME_DO_REGIME} \\(9 tempos\\)`)).check();
  await dialogo.locator('[data-slot="regime-desde"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "desta semana em diante",
  );
  await expect(regimeDaSemana(page)).toHaveAttribute("aria-label", /9 tempos/);

  /* A salva ANTES do «desde»: 8, e o relógio indisponível. */
  await irParaASemana(page, 13);
  await expect(regimeDaSemana(page)).toHaveAttribute(
    "aria-label",
    /8 tempos.*indisponível: semana salva/,
  );

  /* ⚠️ A salva DEPOIS do «desde» (a 15, da semente): continua com 8 — ela foi gravada antes de a vigência valer. */
  await irParaASemana(page, 15);
  await expect(regimeDaSemana(page)).toHaveAttribute("aria-label", /8 tempos/);
  const turmaId = await idDaTurma();
  const { data: gravada } = await banco()
    .from("dsa_regime_da_semana")
    .select("origem, regime_de_horario_id")
    .eq("turma_id", turmaId)
    .eq("ano", ANO)
    .eq("semana", 15)
    .eq("status", "ativo")
    .single();
  expect(gravada).toEqual({ origem: "gravado", regime_de_horario_id: null });

  /* A próxima, não salva: abre com 9. */
  await irParaASemana(page, 18);
  await expect(regimeDaSemana(page)).toHaveAttribute("aria-label", /9 tempos/);
});

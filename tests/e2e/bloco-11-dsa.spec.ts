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
 *   FR-008 (spec 029, Bloco 14, item 8) · logo depois do RD-7, só leitura: em 1366×768 e 1920×1080 o papel publicado
 *          inteiro na janela, sem rolar (até a spec 029 a escala saía só da largura e o papel passava do pé da janela);
 *          os DSA publicados antes dos cartões do ano, sem a frase do panorama; e o vazio sem área reservada.
 *   RD-3 · turma em 8 tempos troca «desta semana em diante» para 9: as semanas salvas — antes e DEPOIS — continuam com
 *          8, as próximas abrem com 9; e o relógio da semana salva fica indisponível.
 *   FR-005 (spec 029, Bloco 14, item 5) · depois do RD-3, «desta semana em diante» com OUTRO regime numa semana FUTURA:
 *          o saldo, o saldo em dias e a capacidade da ficha seguem o regime DE CADA SEMANA — até a spec 029 a ficha
 *          usava um TA/dia só (Editar turma > curso) para a janela inteira.
 *
 * ⚠️ `goto` só no login. ⚠️ **AS SEMANAS 11 A 18 DE 2026**: as outras suítes do DSA usam 8, 9, 10, 15 (a semente), 20,
 *    28, 34, 47 e a semana corrente — e a turma é de cada processo. O RD-3 roda POR ÚLTIMO e desfaz o «desde» no fim,
 *    porque ele vale para as semanas seguintes da turma.
 * ⚠️ **O FR-005 RODA DEPOIS DO RD-3, e a semana dele é escolhida NA HORA**: o saldo só conta de amanhã ao término da
 *    turma (18/12/2026), então ela tem de estar à frente de hoje — a primeira que, com a anterior, não tem regime
 *    guardado e não está salva. O «desde» dele sai no `afterAll`, com o do RD-3.
 * ⚠️ O instrutor é sempre o da semente, pelo código (`DSA-<processo>-INS`), nunca um nome real.
 */
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { abrirPainel } from "./paineis";
import {
  escolherDisciplina,
  escolherDisciplinaEUnidade,
  irParaASemanaDoDia,
  salvarASemana,
} from "./percurso-do-dsa";
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { andamentoDaTurma, diaSeguinte } from "@/lib/dominio/andamento-da-turma";
import { datasQueAlcancam } from "@/lib/dominio/calendario";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { regimeDaSemana as resolverRegimeDaSemana } from "@/lib/dominio/dsa/regime-da-semana";
import { regimeEfetivo } from "@/lib/dominio/regime-da-turma";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
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

/*
 * ── FR-008 (spec 029, Bloco 14, item 8) · o Início em nova ordem, com o papel enquadrado ──────────────────────────
 *
 * Emenda o FR-008.1 e a D-31 da spec 026: os DSA publicados da semana sobem para logo abaixo do cabeçalho, a frase do
 * panorama sai, e o papel é enquadrado pela largura E pela altura da janela (D-20 a D-22, D-27 e D-28 da spec 029).
 *
 * ⚠️ **SÓ LEITURA**: os três casos leem a semana que o RD-4 publicou (ALT 1) e a de 2026-01-05, sem DSA publicado — não
 *    gravam nada, e o RD-3 continua achando a semana 13 salva.
 * ⚠️ **A SEMANA VEM NO ENDEREÇO** (`?semana=`), como num link recebido: é o destino do `entrar`, o ponto de partida, e
 *    não um `goto` no meio do percurso. Num contexto novo a página abre no topo — se rolar, foi a aplicação que rolou.
 */

/** As duas janelas do pedido (`FR-008.3`, SC-008). */
const JANELAS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
] as const;

/** O item que o carrossel mostra — com «reduzir movimento» ele não anda sozinho. */
const ITEM_ATUAL_DO_DSA =
  '[data-slot="carrossel-do-dsa"] [data-slot="item-do-carrossel"][data-atual="true"]';
const papelAtual = (page: Page) => page.locator(`${ITEM_ATUAL_DO_DSA} [data-slot="dsa-impresso"]`);
const caixaDaEscala = (page: Page) =>
  page.locator(`${ITEM_ATUAL_DO_DSA} [data-slot="papel-reduzido"]`);

/** Folga de arredondamento: a escala com 3 casas move a folha em menos de 1 px. */
const FOLGA_PX = 1;

/**
 * Espera o papel ASSENTAR — a escala e a caixa do papel iguais em duas leituras seguidas — e devolve a escala.
 *
 * ⚠️ **NÃO ESPERA ATRIBUTO NOVO**: `data-escala` já existe na `main` (`EscalaDoPapel`, D-31 da spec 026). Esperar um
 *    atributo que só a mudança cria faria o caso reprovar na `main` por tempo esgotado, e não pela altura, que é o que
 *    ele prova (DoD 8). A janela que troca, a fonte que carrega e o painel que abre mudam a medida: por isso duas
 *    leituras iguais, e não a primeira.
 */
async function esperarOPapelAssentar(page: Page): Promise<number> {
  let anterior = "";
  await expect
    .poll(
      async () => {
        const escala = await caixaDaEscala(page).getAttribute("data-escala");
        const caixa = await papelAtual(page).boundingBox();
        const agora =
          escala === null || caixa === null
            ? ""
            : [
                escala,
                ...[caixa.x, caixa.y, caixa.width, caixa.height].map((v) => v.toFixed(1)),
              ].join("|");
        const assentou = agora !== "" && agora === anterior;
        anterior = agora;
        return assentou;
      },
      { message: "o papel do DSA não parou de mudar de escala", intervals: [300], timeout: 20_000 },
    )
    .toBe(true);
  return Number(await caixaDaEscala(page).getAttribute("data-escala"));
}

/** A área visível da janela, a rolagem e o pé da faixa Beta (fixa no topo, por cima de tudo, `z-40`). */
async function medidasDaJanela(page: Page) {
  const janela = await page.evaluate(() => ({
    largura: document.documentElement.clientWidth,
    altura: document.documentElement.clientHeight,
    rolagem: window.scrollY,
  }));
  const faixa = await page.locator('[data-slot="faixa-de-ambiente"]').boundingBox();
  return { ...janela, peDaFaixa: faixa === null ? 0 : faixa.y + faixa.height };
}

/**
 * O papel do item atual INTEIRO na janela, sem rolar (`FR-008.3`), com a legenda e — com 2 papéis ou mais — os
 * controles do carrossel (D-20), centrado no item (D-21).
 *
 * ⚠️ **A CAPTURA É ANEXADA ANTES DE CONFERIR**: na `main` é ela que mostra o papel passando do pé da janela.
 */
async function conferirOPapelNaJanela(page: Page, info: TestInfo, rotulo: string): Promise<void> {
  const escala = await esperarOPapelAssentar(page);
  await info.attach(`inicio-${rotulo}`, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  const janela = await medidasDaJanela(page);
  const papel = await papelAtual(page).boundingBox();
  if (papel === null)
    throw new Error(`${rotulo}: o papel do DSA não tem caixa — não foi desenhado`);

  expect(janela.rolagem, `${rotulo}: o Início abriu rolado`).toBe(0);
  expect(papel.y, `${rotulo}: o topo do papel fica debaixo da faixa Beta`).toBeGreaterThanOrEqual(
    janela.peDaFaixa - FOLGA_PX,
  );
  /* ⚠️ O CASO QUE DISCRIMINA: até a spec 029 a escala saía só da largura, e o papel passava do pé da janela. */
  expect(
    papel.y + papel.height,
    `${rotulo}: o papel passa do pé da janela (escala ${escala}) — a escala não olha a altura`,
  ).toBeLessThanOrEqual(janela.altura + FOLGA_PX);
  expect(papel.x, `${rotulo}: o papel sai da janela pela esquerda`).toBeGreaterThanOrEqual(
    -FOLGA_PX,
  );
  expect(
    papel.x + papel.width,
    `${rotulo}: o papel sai da janela pela direita`,
  ).toBeLessThanOrEqual(janela.largura + FOLGA_PX);

  /* D-20: a legenda acima do papel e, com 2 papéis ou mais, os controles abaixo dele — trocar de turma sem rolar. */
  const legenda = await page.locator(`${ITEM_ATUAL_DO_DSA} figcaption`).boundingBox();
  expect(
    legenda?.y ?? -1,
    `${rotulo}: a legenda do papel ficou fora da janela`,
  ).toBeGreaterThanOrEqual(janela.peDaFaixa - FOLGA_PX);
  const controles = page.locator(
    '[data-slot="carrossel-do-dsa"] [data-slot="controles-do-carrossel"]',
  );
  if ((await controles.count()) > 0) {
    const caixa = await controles.boundingBox();
    expect(
      caixa === null ? Number.POSITIVE_INFINITY : caixa.y + caixa.height,
      `${rotulo}: com 2 papéis ou mais, os controles do carrossel ficaram abaixo da janela (D-20)`,
    ).toBeLessThanOrEqual(janela.altura + FOLGA_PX);
  }

  /* D-21: quando a altura limita, sobra largura — e o papel fica no meio do item, não encostado à esquerda. */
  const item = await page.locator(ITEM_ATUAL_DO_DSA).boundingBox();
  if (item === null) throw new Error(`${rotulo}: o item atual do carrossel não tem caixa`);
  const aEsquerda = papel.x - item.x;
  const aDireita = item.x + item.width - (papel.x + papel.width);
  expect(
    Math.abs(aEsquerda - aDireita),
    `${rotulo}: o papel não está centrado (${aEsquerda.toFixed(0)} px à esquerda, ${aDireita.toFixed(0)} px à direita)`,
  ).toBeLessThanOrEqual(2);
}

test("FR-008 · em 1366×768 e 1920×1080 o papel do DSA publicado aparece inteiro, sem rolar; e a escala se refaz com o painel de Filtros", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(JANELAS[0]);
  await entrar(page, ADMIN, `/inicio?semana=${segundaDe(SEMANA_PUBLICADA)}`);
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    `2026-${SEMANA_PUBLICADA}`,
  );
  await expect(
    page.locator(`[data-slot="carrossel-do-dsa"] [data-turma="${S.turmaComRelogio}"]`),
    "a semana publicada pelo RD-4 não tem o papel da turma — o caso não discrimina",
  ).toHaveCount(1);

  for (const janela of JANELAS) {
    await page.setViewportSize(janela);
    await conferirOPapelNaJanela(page, info, `${janela.width}x${janela.height}`);
  }

  /* D-27: o painel de Filtros abre ACIMA do papel — a escala se refaz pela altura que sobra, e volta ao fechar. */
  await page.setViewportSize(JANELAS[0]);
  const fechado = await esperarOPapelAssentar(page);
  await abrirPainel(page, "filtros");
  const aberto = await esperarOPapelAssentar(page);
  expect(aberto, "com o painel de Filtros aberto, o papel não encolheu (D-27)").toBeLessThan(
    fechado,
  );
  const comPainel = await papelAtual(page).boundingBox();
  const janela = await medidasDaJanela(page);
  expect(
    comPainel === null ? Number.POSITIVE_INFINITY : comPainel.y + comPainel.height,
    "com o painel de Filtros aberto, o papel passa do pé da janela (D-27)",
  ).toBeLessThanOrEqual(janela.altura + FOLGA_PX);
  await page.locator('[data-slot="abrir-filtros"]').first().click();
  await expect(page.locator('[data-slot="painel-de-filtros"]')).toHaveCount(0);
  const deNovo = await esperarOPapelAssentar(page);
  expect(
    Math.abs(deNovo - fechado),
    `fechado o painel, a escala não voltou (${fechado} → ${deNovo})`,
  ).toBeLessThan(0.005);
});

test("FR-008 · a nova ordem: os DSA publicados logo abaixo do cabeçalho, antes dos cartões do ano; e o cabeçalho sem a frase do panorama", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await entrar(page, ADMIN, `/inicio?semana=${segundaDe(SEMANA_PUBLICADA)}`);
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    `2026-${SEMANA_PUBLICADA}`,
  );

  /* O título e a barra do ano e dos Filtros FICAM (FR-008.1; RT-1 e RT-6) — só a frase sai. */
  const cabecalho = page.locator('[data-slot="cabecalho-do-inicio"]');
  await expect(cabecalho.getByRole("heading", { level: 1, name: "Início" })).toBeVisible();
  await expect(cabecalho.locator('[data-slot="ano-do-painel-escolha"]')).toBeVisible();
  await expect(cabecalho.locator('[data-slot="abrir-filtros"]')).toBeVisible();
  await expect(cabecalho, "a frase do panorama continua no cabeçalho").not.toContainText(
    "Panorama das turmas",
  );
  await expect(cabecalho, "a frase do panorama continua no cabeçalho").not.toContainText(
    "este link abre",
  );

  /* A ordem no documento e na tela: cabeçalho, DSA publicados, cartões do ano. */
  const ordem = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        '[data-slot="cabecalho-do-inicio"], [data-slot="dsa-publicados"], [data-slot="turmas-do-ano"]',
      ),
    ].map((e) => e.getAttribute("data-slot")),
  );
  expect(ordem, "os DSA publicados não vêm logo depois do cabeçalho, antes dos cartões").toEqual([
    "cabecalho-do-inicio",
    "dsa-publicados",
    "turmas-do-ano",
  ]);
  const dsa = await page.locator('[data-slot="dsa-publicados"]').boundingBox();
  const doAno = await page.locator('[data-slot="turmas-do-ano"]').boundingBox();
  expect(
    dsa?.y ?? Number.POSITIVE_INFINITY,
    "na tela, os DSA publicados ficam abaixo dos cartões do ano",
  ).toBeLessThan(doAno?.y ?? Number.NEGATIVE_INFINITY);
});

test("FR-008 · sem DSA publicado na semana, a frase no lugar do papel e nenhuma área vazia: em 1366×768 os cartões do ano à vista sem rolar", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize(JANELAS[0]);
  /* A mesma semana sem DSA publicado de ninguém do RD-7 (a semana ISO 2 de 2026). */
  await entrar(page, ADMIN, "/inicio?semana=2026-01-05");
  await expect(page.locator('[data-slot="dsa-publicados"]')).toHaveAttribute(
    "data-semana",
    "2026-2",
  );
  await expect(page.locator('[data-slot="sem-dsa-publicado"]')).toHaveText(
    "Não há DSA publicado para esta semana",
  );
  await expect(page.locator('[data-slot="carrossel-do-dsa"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="papel-reduzido"]')).toHaveCount(0);

  expect(await page.evaluate(() => window.scrollY), "o Início abriu rolado").toBe(0);
  /* ⚠️ Guarda, não o caso que discrimina: na `main` os cartões vêm antes. Pega a seção que reserve a altura do papel. */
  const cartoes = page.locator('[data-slot="turmas-do-ano"] [data-slot="card-kpi"]');
  for (const rotulo of ["Turmas ativas", "Planejadas", "Concluídas", "Canceladas"]) {
    await expect(
      cartoes.filter({ hasText: rotulo }),
      `o cartão «${rotulo}» ficou fora da janela — a seção do DSA reservou altura sem papel`,
    ).toBeInViewport({ ratio: 1 });
  }
});

test("RD-3 · em 8 tempos, «desta semana em diante» para 9: as salvas ficam com 8, as próximas abrem com 9", async ({
  page,
}) => {
  test.setTimeout(240_000);
  /* A semana 13 já está SALVA (o RD-7); a 15 tem a semente, salva. A 14 e a 18 não têm nada. */
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

/*
 * ── FR-005 (spec 029, Bloco 14, item 5) · o saldo pelo regime DA SEMANA ───────────────────────────────────────────
 *
 * > *"PEND-026-1: o saldo segue o regime da semana do DSA (gravado ou «só esta semana» > «desde» > Editar turma >
 * > curso)."* — item 5 do pedido de Bernardo Villas Boas, 27/10/2026 (FR-005 da spec 029; supera a D-15 da spec 026)
 */

/** O padrão do curso da semente (`semearDsa`: a G45, 8 tempos, desde 2020) — o «do curso» do saldo (D-12). */
const TEMPOS_DO_CURSO = 8;

type RegistroDaSemanaLido = {
  readonly ano: number;
  readonly semana: number;
  readonly origem: "gravado" | "so_esta_semana";
  /** Nulo = o do curso (a linha sem regime nomeado não tem retrato). */
  readonly tempos: number | null;
};
type VigenciaLida = { readonly vigenteDe: string; readonly tempos: number | null };

/** O regime das semanas da turma como está no banco AGORA — o insumo do saldo (FR-005.1), lido pela chave de serviço. */
async function regimesDasSemanasNoBanco(turmaId: string) {
  const [registrosRes, vigenciasRes, turmaRes] = await Promise.all([
    banco()
      .from("dsa_regime_da_semana")
      .select("ano, semana, origem, regime_de_horario_id, regime_tempos")
      .eq("turma_id", turmaId)
      .eq("status", "ativo"),
    banco()
      .from("turma_regime_vigencia")
      .select("vigente_de, regime:regimes_de_horario(regime_tempos)")
      .eq("turma_id", turmaId)
      .eq("status", "ativo"),
    banco()
      .from("turmas")
      .select(
        "status, data_termino, regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos)",
      )
      .eq("id", turmaId)
      .single(),
  ]);
  for (const r of [registrosRes, vigenciasRes, turmaRes]) {
    if (r.error) throw new Error(`falha ao ler o regime das semanas: ${r.error.message}`);
  }
  const registros: RegistroDaSemanaLido[] = (
    (registrosRes.data ?? []) as {
      ano: number;
      semana: number;
      origem: string;
      regime_de_horario_id: string | null;
      regime_tempos: number | null;
    }[]
  ).map((r) => ({
    ano: r.ano,
    semana: r.semana,
    origem: r.origem === "gravado" ? "gravado" : "so_esta_semana",
    tempos: r.regime_de_horario_id === null ? null : r.regime_tempos,
  }));
  const vigencias: VigenciaLida[] = (
    (vigenciasRes.data ?? []) as unknown as {
      vigente_de: string;
      regime: { regime_tempos: number } | null;
    }[]
  ).map((v) => ({ vigenteDe: v.vigente_de, tempos: v.regime?.regime_tempos ?? null }));
  const turma = turmaRes.data as unknown as {
    status: string;
    data_termino: string;
    regime: { regime_tempos: number } | null;
  };
  return {
    registros,
    vigencias,
    status: turma.status,
    termino: turma.data_termino,
    /** O regime de *Editar turma*, ou nulo. */
    daTurma: turma.regime?.regime_tempos ?? null,
  };
}

/** Os feriados que a ficha desconta: de dia inteiro, ativos, de hoje ao término, que alcançam a turma (spec 023, D-4). */
async function feriadosDaFicha(turmaId: string, hoje: string, termino: string): Promise<string[]> {
  const { data, error } = await banco()
    .from("feriados")
    .select(`data, ${COLUNAS_DA_ABRANGENCIA}`)
    .eq("impacto", "dia_inteiro")
    .eq("status", "ativo")
    .gte("data", hoje)
    .lte("data", termino);
  if (error) throw new Error(`falha ao ler os feriados: ${error.message}`);
  return datasQueAlcancam(linhasComAbrangencia<{ data: string }>(data), turmaId);
}

/**
 * O TA/dia de cada dia útil da janela do saldo — de AMANHÃ ao término (D-COR-2) —, cada um pelo regime DA SUA SEMANA.
 *
 * ⚠️ **A ORDEM NÃO É COPIADA AQUI**: cada semana é resolvida por `regimeDaSemana`, a mesma função do DSA (D-14 da spec
 *    026). É o esperado do caso, calculado sem passar pelo saldo que ele prova.
 */
function temposDosDiasUteis(entrada: {
  readonly hoje: string;
  readonly termino: string;
  readonly feriados: readonly string[];
  readonly registros: readonly RegistroDaSemanaLido[];
  readonly vigencias: readonly VigenciaLida[];
  readonly daTurma: number | null;
}): number[] {
  const feriados = new Set(entrada.feriados);
  const tempos: number[] = [];
  for (let dia = diaSeguinte(entrada.hoje); dia <= entrada.termino; dia = diaSeguinte(dia)) {
    const diaDaSemana = new Date(`${dia}T00:00:00Z`).getUTCDay();
    if (diaDaSemana === 0 || diaDaSemana === 6 || feriados.has(dia)) continue;
    const semana = semanaIsoDe(dia);
    if (semana === null) throw new Error(`data inválida na janela do saldo: ${dia}`);
    const linha = entrada.registros.find((r) => r.ano === semana.ano && r.semana === semana.numero);
    const { regime } = resolverRegimeDaSemana<number | null>({
      segunda: semana.segunda,
      registro:
        linha === undefined
          ? null
          : { regime: linha.tempos ?? TEMPOS_DO_CURSO, origem: linha.origem },
      vigenciasDaTurma: entrada.vigencias.map((v) => ({
        vigenteDe: v.vigenteDe,
        regime: v.tempos,
      })),
      daTurma: entrada.daTurma,
      doCurso: TEMPOS_DO_CURSO,
    });
    if (regime === null)
      throw new Error(`o dia ${dia} ficou sem TA/dia — a semente perdeu o regime`);
    tempos.push(regime);
  }
  return tempos;
}

/**
 * A semana do «desde»: a primeira à frente de hoje que, com a ANTERIOR, não tem regime guardado (uma linha `gravado`
 * ou «só esta semana» venceria o «desde» e calaria a diferença), que não está salva (senão o relógio fica indisponível)
 * e em que as duas têm dia útil antes do término.
 *
 * ⚠️ **É A ANTERIOR QUE GARANTE O CASO DEPOIS DO RD-3**: ela segue o «desde» de 9 da semana 14, e a escolhida passa ao
 *    regime do curso — a diferença para o TA/dia único está nos dias dela. Rodado sozinho (sem o RD-3), a diferença
 *    está na escolhida, que passa a 9.
 */
async function semanaParaODesde(
  turmaId: string,
  hoje: string,
  termino: string,
  feriados: readonly string[],
  registros: readonly RegistroDaSemanaLido[],
): Promise<number> {
  const atual = semanaIsoDe(hoje);
  if (atual === null || atual.ano !== ANO) {
    throw new Error(`hoje (${hoje}) não é de ${ANO}: a turma da semente não tem janela à frente`);
  }
  const [eventosRes, ocupacaoRes] = await Promise.all([
    banco().from("dsa_eventos_da_semana").select("semana").eq("turma_id", turmaId).eq("ano", ANO),
    banco().from("vw_ocupacao_do_dsa").select("data").eq("turma_id", turmaId).gte("data", hoje),
  ]);
  if (eventosRes.error) throw new Error(`falha ao ler os eventos: ${eventosRes.error.message}`);
  if (ocupacaoRes.error) throw new Error(`falha ao ler a ocupação: ${ocupacaoRes.error.message}`);
  const comRegistro = new Set(registros.filter((r) => r.ano === ANO).map((r) => r.semana));
  const salvas = new Set<number>([
    ...((eventosRes.data ?? []) as { semana: number }[]).map((e) => e.semana),
    ...((ocupacaoRes.data ?? []) as { data: string }[]).flatMap((o) => {
      const s = semanaIsoDe(o.data);
      return s !== null && s.ano === ANO ? [s.numero] : [];
    }),
  ]);
  const naoFeriados = (n: number) =>
    datasDaSemanaIso(ANO, n)
      .slice(0, 5)
      .filter((d) => d > hoje && d <= termino && !feriados.includes(d));
  for (let escolhida = atual.numero + 2; escolhida <= 53; escolhida += 1) {
    const anterior = escolhida - 1;
    if ((datasDaSemanaIso(ANO, escolhida)[0] ?? "") > termino) break;
    if (comRegistro.has(anterior) || comRegistro.has(escolhida) || salvas.has(escolhida)) continue;
    if (naoFeriados(anterior).length === 0 || naoFeriados(escolhida).length === 0) continue;
    return escolhida;
  }
  throw new Error(
    `nenhuma semana livre à frente de ${hoje} até o término da turma (${termino}) — o caso não discrimina`,
  );
}

/** O saldo como a ficha o escreve (`comSinal`), pronto para expressão regular. */
const saldoEscrito = (saldo: number) => (saldo > 0 ? `\\+${saldo}` : String(saldo));
/** `1 dia` · `4 dias` · `-3 dias` — como a ficha escreve (`emDias`). */
const emDias = (n: number) => `${n} ${Math.abs(n) === 1 ? "dia" : "dias"}`;

test("FR-005 · «desta semana em diante» com outro regime numa semana futura: o saldo e a capacidade da ficha seguem o regime de cada semana", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const turmaId = await idDaTurma();
  const hoje = hojeNaCiaara();
  const antes = await regimesDasSemanasNoBanco(turmaId);
  const feriados = await feriadosDaFicha(turmaId, hoje, antes.termino);
  const semana = await semanaParaODesde(turmaId, hoje, antes.termino, feriados, antes.registros);

  /* ── no DSA, pelo relógio: «Desta semana em diante» com o regime que a semana NÃO tem ───────────────────────────── */
  await abrirASemana(page, semana);
  await expect(
    regimeDaSemana(page),
    `a semana ${semana} está salva — o relógio não abre`,
  ).not.toHaveAttribute("aria-label", /indisponível/);
  const estavaEmNove = /9 tempos/.test(
    (await regimeDaSemana(page).getAttribute("aria-label")) ?? "",
  );
  await regimeDaSemana(page).click();
  const dialogo = page.locator('[data-slot="dialogo-do-regime"]');
  await dialogo
    .getByLabel(
      estavaEmNove
        ? /Regime do curso \(8 tempos\)/
        : new RegExp(`${NOME_DO_REGIME} \\(9 tempos\\)`),
    )
    .check();
  await dialogo.locator('[data-slot="regime-desde"]').click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "desta semana em diante",
  );
  await expect(regimeDaSemana(page)).toHaveAttribute(
    "aria-label",
    estavaEmNove ? /8 tempos/ : /9 tempos/,
  );

  /* O banco: a vigência nasceu na segunda da semana escolhida, com o regime escolhido (nulo = o do curso). */
  const { data: vigencia } = await banco()
    .from("turma_regime_vigencia")
    .select("regime_de_horario_id")
    .eq("turma_id", turmaId)
    .eq("vigente_de", segundaDe(semana))
    .eq("status", "ativo")
    .single();
  expect(vigencia).toEqual({ regime_de_horario_id: estavaEmNove ? null : REGIME_ID });

  /* ── o esperado, do banco como ficou: o TA/dia de cada dia útil pelo regime da semana dele ──────────────────────── */
  const depois = await regimesDasSemanasNoBanco(turmaId);
  const tempos = temposDosDiasUteis({
    hoje,
    termino: depois.termino,
    feriados,
    registros: depois.registros,
    vigencias: depois.vigencias,
    daTurma: depois.daTurma,
  });
  const primeiro = tempos[0];
  if (primeiro === undefined) throw new Error("a janela do saldo não tem dia útil");
  const capacidade = tempos.reduce((soma, t) => soma + t, 0);
  const minima = Math.min(...tempos);
  const maxima = Math.max(...tempos);
  /* ⚠️ Até a spec 029 a ficha usava UM TA/dia (Editar turma > curso) para a janela inteira: o caso tem de mudar isso. */
  const capacidadeComUmTaPorDia = tempos.length * (depois.daTurma ?? TEMPOS_DO_CURSO);
  expect(capacidade, "o regime das semanas não muda a capacidade — o caso não discrimina").not.toBe(
    capacidadeComUmTaPorDia,
  );

  /* ── a ficha, por clique («Voltar à turma») ──────────────────────────────────────────────────────────────────────── */
  await page
    .locator('[data-slot="publicacao-do-dsa"]')
    .getByRole("link", { name: "Voltar à turma" })
    .click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(S.turmaComRelogio)}`);
  await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(S.turmaComRelogio);
  const andamento = page.locator('[data-slot="andamento-da-turma"]');
  const numeroDe = async (campo: string): Promise<number> => {
    const texto = await andamento.locator(`[data-andamento="${campo}"]`).innerText();
    const casamento = /(-?\d+) TA/.exec(texto);
    expect(casamento, `a ficha não mostra o número de «${campo}»: «${texto}»`).not.toBeNull();
    return Number(casamento?.[1]);
  };
  const prevista = await numeroDe("prevista");
  const executada = await numeroDe("executada");
  const restante = Math.max(prevista - executada, 0);
  const saldo = capacidade - restante;

  await expect(
    andamento.locator('[data-andamento="saldo"]'),
    `o saldo da ficha não seguiu o regime das semanas (com um TA/dia só ele seria ${capacidadeComUmTaPorDia - restante})`,
  ).toContainText(new RegExp(`(?<![\\d+-])${saldoEscrito(saldo)} TA(?!/)`));
  /* D-13: o saldo em dias divide pelo TA/dia do PRIMEIRO dia útil da janela, e a capacidade mostra a faixa. */
  await expect(andamento.locator('[data-andamento="saldo-em-dias"]')).toHaveText(
    emDias(Math.floor(saldo / primeiro)),
  );
  const textoDaCapacidade = andamento.locator('[data-andamento="capacidade"]');
  await expect(textoDaCapacidade).toContainText(
    minima === maxima ? `${primeiro} TA/dia` : `${minima} a ${maxima} TA/dia`,
  );
  await expect(textoDaCapacidade).toContainText(new RegExp(`(?<!\\d)${tempos.length} dias úteis`));

  /* ── e a função do domínio, com as semanas, dá o MESMO número: o esperado acima não é uma segunda regra ─────────── */
  const pelaFuncao = andamentoDaTurma(
    {
      status: depois.status,
      modalidade: "presencial",
      dataTermino: depois.termino,
      prevista,
      executada,
    },
    regimeEfetivo(
      { regimePadraoTempos: TEMPOS_DO_CURSO, limiteDiarioEadHoras: null },
      depois.daTurma === null ? null : { regimeTempos: depois.daTurma },
    ),
    feriados,
    hoje,
    { registros: depois.registros, vigencias: depois.vigencias, temposDoCurso: TEMPOS_DO_CURSO },
  );
  expect(pelaFuncao.capacidade).toBe(capacidade);
  expect(pelaFuncao.saldo).toBe(saldo);
  expect(pelaFuncao.capacidadeDiaria).toBe(primeiro);
});

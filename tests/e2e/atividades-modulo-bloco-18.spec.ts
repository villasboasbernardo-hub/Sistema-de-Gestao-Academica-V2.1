/**
 * Bloco 18 (spec 033), `FR-006.1` a `FR-006.4` e `FR-007.1` — **o módulo Atividades e a aba Atividades da turma, por
 * clique**: as abas na ordem do pedido; a lista com a classificação COMO CONTA, o responsável, o local e o vínculo; os
 * filtros por classificação («TA da disciplina») e por vínculo; as estatísticas com a legenda que tira um grupo (RT-5);
 * o *Editar* que abre o DSA da turma na semana do lançamento; o *Desativar* que pede a exclusão como RASCUNHO da semana
 * (D-10); e a aba Atividades da turma, com os filtros e o uso do limite.
 *
 * > *"A lista de atividades tem, por linha, Editar (abre o DSA da turma na semana do lançamento — a edição é do DSA,
 * > RP-0/RP-9), Desativar (pede a exclusão do lançamento como rascunho da semana, que conta ao Salvar) e Excluir
 * > desabilitado."* — `FR-006.4` da spec 033
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É A PALESTRA QUE CONTA COMO «TA DA DISCIPLINA»**: a categoria gravada é a do tipo
 *    (AEC); antes do Bloco 18 ela aparecia como AEC na coluna e no filtro AEC. Aqui ela aparece como «TA da disciplina»,
 *    sai do filtro AEC e é a única do filtro «TA da disciplina».
 * ⚠️ **CONTA SÓ A PRÓPRIA AMOSTRA** (PEND-022-1): as linhas são conferidas pelo prefixo do código desta amostra, e as
 *    estatísticas, com o filtro de turma nesta turma.
 * ⚠️ `goto` só no ponto de partida (`entrar`) — e no `escolherAno`, que vai pelo link com `?ano=` quando o ano da amostra
 *    está fora das opções do seletor (o mesmo link que alguém mandaria).
 * ⚠️ **SERIAL E IDEMPOTENTE** (regra 9.1): o *Desativar* deixa um rascunho, e a nova tentativa recomeça do preparo, que
 *    limpa a rodada anterior. O curso é reaproveitado.
 * ⚠️ **A TURMA MORA EM 2047**: a atividade GLOBAL de 10/05/2026 de outras amostras não alcança o ano dela.
 * ⚠️ **E A TURMA PODE FICAR** (achado 24 da revisão, 03/11/2026): o último caso salva uma semana no DSA, e o evento vai
 *    para a trilha `dsa_eventos_da_semana`, imutável (FK `restrict`) — turma com trilha não se apaga. O preparo então a
 *    REAPROVEITA, com a linha e a disciplina dela, como reaproveita o curso; tudo o que é lançamento e AEC prevista sai.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { abrirPainel, escolherAno } from "./paineis";
import { irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";

test.describe.configure({ mode: "serial" });

const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ANO = 2047;
/** Segunda a quinta da semana ISO 11 de 2047 — a semana que o *Editar* abre. */
const DIAS = ["2047-03-11", "2047-03-12", "2047-03-13", "2047-03-14"] as const;
const NOME_PREVISTA = "Palestra prevista da amostra do módulo";

/**
 * O último caso (SC-005): a semana ISO 20 de 2047 (13 a 18/05), longe da 11 dos lançamentos semeados e do rascunho de
 * exclusão que o *Desativar* deixa nela — o «Salvar a semana» daqui não pode levar aquele rascunho junto.
 */
const SEMANA_DO_CUMPRE = 20;
const SEGUNDA_DO_CUMPRE = "2047-05-13";
/** Terça-feira, 1º tempo: a Palestra que cumpre (2 TA). E o 3º tempo, livre, para reabrir o formulário depois. */
const CELULA_DO_CUMPRE = "0:1";
const CELULA_DA_CONFERENCIA = "2:1";
/** A AEC prevista que o DSA cumpre — nasce no próprio caso, para não mudar o «1 de 1» do FR-006.3. */
const NOME_PREVISTA_DO_DSA = "Palestra prevista que o DSA cumpre";
/** Uma sala da lista que a migration semeia (`20260917210558`). */
const SALA_DA_LISTA = "Laboratório de Informática";
const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';

let EMAIL = "";
let SIGLA = "";
let PREFIXO = "";
let CURSO_ID = "";
let CURRICULO_1 = "";
let DISCIPLINA_ID = "";
let TURMA_ID = "";
let TURMA = "";

/** Os quatro lançamentos da amostra, pelo papel de cada um no percurso. */
const CODIGO = {
  avulsa: () => `${PREFIXO}-1`,
  daDisciplina: () => `${PREFIXO}-2`,
  vinculada: () => `${PREFIXO}-3`,
  administracao: () => `${PREFIXO}-4`,
};

function conferir(oQue: string, error: { message: string } | null): void {
  if (error) throw new Error(`${oQue}: ${error.message}`);
}

async function idDoTipo(valor: string): Promise<string> {
  const { data, error } = await banco
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_atividade")
    .eq("valor", valor)
    .single();
  conferir(`tipo ${valor}`, error);
  return (data as { id: string }).id;
}

/** A turma tem semana salva ou publicada no DSA? A trilha é imutável, e a turma com ela não se apaga. */
async function turmaTemTrilha(turmaId: string): Promise<boolean> {
  const { count, error } = await banco
    .from("dsa_eventos_da_semana")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turmaId);
  conferir("a trilha do DSA da turma", error);
  return (count ?? 0) > 0;
}

/**
 * A rodada anterior sai: atividades (os rascunhos antes), AEC previstas, linhas, turmas e disciplinas — menos a turma
 * com trilha do DSA, que fica com a linha e a disciplina dela (a linha aponta a disciplina, FK `restrict`).
 */
async function limpar(): Promise<void> {
  if (CURSO_ID === "") return;
  const { data: turmas, error: erroTurmas } = await banco
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO_ID);
  conferir("ler as turmas", erroTurmas);
  const ids = ((turmas ?? []) as { id: string }[]).map((t) => t.id);
  if (ids.length > 0) {
    conferir(
      "rascunhos",
      (await banco.from("atividades_nao_letivas").delete().in("turma_id", ids).eq("salvo", false))
        .error,
    );
    conferir(
      "atividades",
      (await banco.from("atividades_nao_letivas").delete().in("turma_id", ids)).error,
    );
  }
  conferir(
    "AEC previstas",
    (await banco.from("aec_previstas_curriculo").delete().eq("curso_id", CURSO_ID)).error,
  );
  let ficouTurma = false;
  for (const id of ids) {
    if (await turmaTemTrilha(id)) {
      ficouTurma = true;
      continue;
    }
    await apagarLinhasDaTurma(id);
    conferir("turma", (await banco.from("turmas").delete().eq("id", id)).error);
  }
  /* A turma que ficou leva a disciplina junto: a linha dela a aponta, e o preparo reaproveita as duas. */
  if (ficouTurma) return;
  const { data: discs } = await banco.from("disciplinas").select("id").eq("curso_id", CURSO_ID);
  const idsDisc = ((discs ?? []) as { id: string }[]).map((d) => d.id);
  if (idsDisc.length > 0) {
    conferir(
      "habilitações",
      (await banco.from("instrutor_disciplina").delete().in("disciplina_id", idsDisc)).error,
    );
    conferir(
      "UEs",
      (await banco.from("unidades_ensino").delete().in("disciplina_id", idsDisc)).error,
    );
    conferir("disciplinas", (await banco.from("disciplinas").delete().in("id", idsDisc)).error);
  }
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL = emailDeTeste("atividades-modulo", p);
  SIGLA = `CUR-ATM-${p}`;
  PREFIXO = `ATM-${p}`;
  await criarConta(EMAIL, `USR-ATM-${p}`);

  const { data: existe } = await banco
    .from("cursos")
    .select("id")
    .eq("codigo", SIGLA)
    .maybeSingle();
  if (existe) CURSO_ID = (existe as { id: string }).id;
  else {
    const { data, error } = await banco.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: SIGLA,
        nome_curso: `Curso do módulo de atividades ${p}`,
        classificacao: "expedito",
        modalidade: "presencial",
        duracao_dias: 60,
      },
      p_regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    conferir(`curso ${SIGLA}`, error);
    CURSO_ID = (data as { id: string }).id;
  }
  await limpar();

  const { data: c1, error: e1 } = await banco
    .from("curriculos")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("versao", 1)
    .single();
  conferir("currículo 1", e1);
  CURRICULO_1 = (c1 as { id: string }).id;

  /* A disciplina e a turma de uma rodada anterior com trilha do DSA ficaram (ver `limpar`): são reaproveitadas. */
  const { data: disciplinaQueFicou, error: erroDisciplina } = await banco
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .maybeSingle();
  conferir("a disciplina da rodada anterior", erroDisciplina);
  if (!disciplinaQueFicou) {
    conferir(
      "disciplina",
      (
        await banco.from("disciplinas").insert({
          codigo: `ATM-DIS-${p}`,
          curso_id: CURSO_ID,
          curriculo_id: CURRICULO_1,
          cod_disciplina: "I",
          nome_disciplina: "Disciplina da amostra do módulo",
          carga_horaria_tempos: 40,
        })
      ).error,
    );
  }
  const { data: d } = await banco
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .single();
  DISCIPLINA_ID = (d as { id: string }).id;

  const { data: turmaQueFicou, error: erroTurmaQueFicou } = await banco
    .from("turmas")
    .select("id")
    .eq("curso_id", CURSO_ID)
    .eq("ano_letivo", ANO)
    .maybeSingle();
  conferir("a turma da rodada anterior", erroTurmaQueFicou);
  if (!turmaQueFicou) {
    conferir(
      "turma",
      (
        await banco.from("turmas").insert({
          curso_id: CURSO_ID,
          turma: "T1",
          ano_letivo: ANO,
          status: "ativa",
          modalidade: "presencial",
          data_inicio: `${ANO}-02-01`,
          data_termino: `${ANO}-11-30`,
          alunos: 10,
        })
      ).error,
    );
  }
  const { data: turma, error: et } = await banco
    .from("turmas")
    .select("id, codigo")
    .eq("curso_id", CURSO_ID)
    .eq("ano_letivo", ANO)
    .single();
  conferir("turma lida", et);
  TURMA_ID = (turma as { id: string; codigo: string }).id;
  TURMA = (turma as { id: string; codigo: string }).codigo;

  /* A AEC prevista do currículo, gravada sem sessão (a carga): é a que a linha vinculada cumpre. */
  const previstaId = crypto.randomUUID();
  const palestra = await idDoTipo("Palestra");
  conferir(
    "AEC prevista",
    (
      await banco.from("aec_previstas_curriculo").insert({
        id: previstaId,
        curso_id: CURSO_ID,
        curriculo_id: CURRICULO_1,
        nome: NOME_PREVISTA,
        tipo_atividade_id: palestra,
        ta_previstos: 2,
        obrigatoria: true,
        ordem: 1,
      })
    ).error,
  );

  /*
   * Os quatro lançamentos SALVOS (sem sessão, o `salvo` nasce verdadeiro): a palestra avulsa com palestrante externo e
   * OM; a palestra que conta como TA da disciplina; a palestra que cumpre a AEC prevista; e uma Administração (TAD).
   */
  const base = { escopo: "turma", turma_id: TURMA_ID, ta_inicial: 1 } as const;
  const linhas = [
    {
      ...base,
      codigo: CODIGO.avulsa(),
      categoria_normativa: "AEC",
      tipo_atividade_id: palestra,
      subtipo: "Palestra",
      data: DIAS[0],
      tempos_consumidos: 2,
      descricao: "Palestra avulsa da amostra do módulo",
      responsavel_externo: "Palestrante convidado da amostra",
      responsavel_externo_om: "OM da amostra",
      local: "Auditório da amostra",
    },
    {
      ...base,
      codigo: CODIGO.daDisciplina(),
      categoria_normativa: "AEC",
      tipo_atividade_id: palestra,
      subtipo: "Palestra",
      conta_como: "CHD",
      disciplina_id: DISCIPLINA_ID,
      data: DIAS[1],
      tempos_consumidos: 3,
      descricao: "Palestra que conta como TA da disciplina",
    },
    {
      ...base,
      codigo: CODIGO.vinculada(),
      categoria_normativa: "AEC",
      tipo_atividade_id: palestra,
      subtipo: "Palestra",
      atividade_prevista_id: previstaId,
      data: DIAS[2],
      tempos_consumidos: 2,
      descricao: "Palestra que cumpre a AEC prevista",
    },
    {
      ...base,
      codigo: CODIGO.administracao(),
      categoria_normativa: "TAD",
      tipo_atividade_id: await idDoTipo("Administração"),
      subtipo: "Administração",
      data: DIAS[3],
      tempos_consumidos: 1,
      descricao: "Administração da amostra do módulo",
    },
  ];
  conferir("atividades", (await banco.from("atividades_nao_letivas").insert(linhas)).error);
});

test.afterAll(async () => {
  await limpar();
  await apagarConta(EMAIL);
});

const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });
const linhaDa = (page: Page, codigo: string) => page.locator(`[data-atividade="${codigo}"]`);
const daAmostra = (page: Page) =>
  page.locator(`[data-slot="tabela-de-atividades"] [data-atividade^="${PREFIXO}-"]`);

async function escolherOpcao(page: Page, campo: string, opcao: RegExp | string): Promise<void> {
  await page.getByRole("combobox", { name: campo, exact: true }).click();
  await page.getByRole("option", { name: opcao }).first().click();
}

/** Do menu até a lista de Atividades do ano da amostra. */
async function irAoModulo(page: Page): Promise<void> {
  await entrar(page, EMAIL, "/inicio");
  await MENU(page).getByRole("link", { name: "Atividades", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
  await escolherAno(page, ANO);
  await expect(linhaDa(page, CODIGO.avulsa())).toBeVisible({ timeout: 15_000 });
}

test("FR-006.1 · as abas na ordem do pedido e a lista com as colunas novas", async ({ page }) => {
  test.setTimeout(90_000);
  await irAoModulo(page);

  const abas = page.getByRole("tablist", { name: "Seções de Atividades" });
  await expect(abas.getByRole("tab")).toHaveText([
    "Atividades",
    "Palestras",
    "APOINST",
    "Calendário",
  ]);

  const cabecalho = page.locator('[data-slot="tabela-de-atividades"] thead');
  for (const coluna of ["Classificação", "Tipo", "Responsável/Palestrante", "Local", "Vínculo"]) {
    await expect(cabecalho).toContainText(coluna);
  }

  const avulsa = linhaDa(page, CODIGO.avulsa());
  await expect(avulsa).toHaveAttribute("data-vinculo", "avulsa");
  await expect(avulsa.locator("[data-categoria]")).toHaveAttribute("data-categoria", "AEC");
  await expect(avulsa).toContainText("Palestrante convidado da amostra (OM da amostra)");
  await expect(avulsa).toContainText("Auditório da amostra");

  /* O caso que discrimina: a categoria gravada é AEC, e a linha CONTA como TA da disciplina. */
  const daDisciplina = linhaDa(page, CODIGO.daDisciplina());
  await expect(daDisciplina.locator("[data-categoria]")).toHaveAttribute("data-categoria", "CHD");
  await expect(daDisciplina.locator("[data-categoria]")).toContainText("TA da disciplina");
  await expect(daDisciplina.locator("[data-categoria]")).toContainText(
    "Disciplina da amostra do módulo",
  );

  const vinculada = linhaDa(page, CODIGO.vinculada());
  await expect(vinculada).toHaveAttribute("data-vinculo", "do_curriculo");
  await expect(vinculada.locator('[data-slot="vinculo-da-atividade"]')).toHaveText(NOME_PREVISTA);

  /* O Excluir existe e está indisponível (regra 4), com o motivo. */
  const excluir = avulsa.getByRole("button", { name: /^Excluir:/ });
  await expect(excluir).toHaveAttribute("aria-disabled", "true");
});

test("FR-006.2 · os filtros por classificação («TA da disciplina») e por vínculo, na URL", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await irAoModulo(page);
  await abrirPainel(page, "filtros");

  await escolherOpcao(page, "Classificação", "TA da disciplina");
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBe("CHD");
  await expect(daAmostra(page)).toHaveCount(1);
  await expect(daAmostra(page)).toHaveAttribute("data-atividade", CODIGO.daDisciplina());

  /* AEC: a palestra que conta como TA da disciplina SAI (era o filtro de antes, pela categoria gravada). */
  await escolherOpcao(page, "Classificação", /^AEC$/);
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBe("AEC");
  await expect(daAmostra(page)).toHaveCount(2);
  await expect(linhaDa(page, CODIGO.daDisciplina())).toHaveCount(0);

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBeNull();
  await expect(daAmostra(page)).toHaveCount(4);

  await escolherOpcao(page, "Vínculo", "Do currículo");
  await expect.poll(() => new URL(page.url()).searchParams.get("vinculo")).toBe("do_curriculo");
  await expect(daAmostra(page)).toHaveCount(1);
  await expect(daAmostra(page)).toHaveAttribute("data-atividade", CODIGO.vinculada());

  await escolherOpcao(page, "Vínculo", "Avulsa");
  await expect.poll(() => new URL(page.url()).searchParams.get("vinculo")).toBe("avulsa");
  await expect(daAmostra(page)).toHaveCount(3);
});

test("FR-006.3 · as estatísticas da amostra e a legenda que tira um grupo (RT-5)", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await irAoModulo(page);
  await abrirPainel(page, "filtros");
  await escolherOpcao(page, "Turma", TURMA);
  await expect.poll(() => new URL(page.url()).searchParams.get("turma")).toBe(TURMA);
  await expect(daAmostra(page)).toHaveCount(4);

  await abrirPainel(page, "estatisticas");
  const painel = page.locator('[data-slot="estatisticas-de-atividades"]');
  await expect(painel.locator('[data-indicador="total-de-atividades"]')).toHaveText(
    /Atividades\s*4(?!\d)/,
  );
  await expect(painel.locator('[data-indicador="total-de-ta"]')).toHaveText(
    /Tempos de aula\s*8\s*TA/,
  );
  await expect(painel.locator('[data-indicador="ta-CHD"]')).toHaveText(/TA da disciplina\s*3\s*TA/);
  await expect(painel.locator('[data-indicador="ta-AEC"]')).toHaveText(/TA de AEC\s*4\s*TA/);
  /* A AEC prevista (2 TA) está cumprida pela palestra vinculada (2 TA) — D-7. */
  await expect(painel.locator('[data-indicador="palestras-cumpridas"]')).toContainText("1 de 1");

  /* Pizza por classificação: AEC, TA da disciplina e TAD. A legenda tira um e «Mostrar todos» devolve. */
  const pizza = painel.locator('[data-chave="por-classificacao"] [data-slot="grafico-pizza"]');
  await expect(pizza).toHaveAttribute("data-visiveis", "3");
  const primeiro = pizza.locator('[data-slot="alternar-grupo"]').first();
  await expect(primeiro).toHaveAttribute("aria-pressed", "true");
  await primeiro.click();
  await expect(primeiro).toHaveAttribute("aria-pressed", "false");
  await expect(pizza).toHaveAttribute("data-visiveis", "2");
  await pizza.locator('[data-slot="mostrar-todos"]').click();
  await expect(pizza).toHaveAttribute("data-visiveis", "3");

  /* As barras do uso do limite trazem a turma no eixo (o limite da norma não é calculável sem o parâmetro: nomeada). */
  await expect(painel.locator('[data-chave="uso-do-limite-aec"]')).toBeVisible();
});

test("FR-006.4 · *Editar* abre o DSA da turma na semana do lançamento", async ({ page }) => {
  test.setTimeout(90_000);
  await irAoModulo(page);
  await linhaDa(page, CODIGO.avulsa())
    .getByRole("link", { name: /^Editar no DSA:/ })
    .click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toBe(`/turmas/${encodeURIComponent(TURMA)}/dsa`);
  const busca = new URL(page.url()).searchParams;
  expect(busca.get("semana")).toBe("11");
  expect(busca.get("ano")).toBe(String(ANO));
});

test("FR-006.4 · *Desativar* pede a exclusão como RASCUNHO da semana; a linha fica, marcada", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await irAoModulo(page);
  const linha = linhaDa(page, CODIGO.administracao());
  await linha.getByRole("button", { name: /^Desativar:/ }).click();
  const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
  await expect(dialogo).toContainText("Salvar a semana");
  await dialogo.getByRole("button", { name: "Desativar", exact: true }).click();

  await expect(page.locator('[data-slot="aviso-da-lista"]')).toContainText("rascunho da semana");
  await expect(linha).toHaveAttribute("data-desativacao-pendente", "sim", { timeout: 15_000 });

  /* A prova é o BANCO (PEND-016-2): a linha salva continua ativa, e há a sombra de exclusão, não salva. */
  const { data: salva } = await banco
    .from("atividades_nao_letivas")
    .select("id, status, salvo")
    .eq("codigo", CODIGO.administracao())
    .single();
  expect(salva).toMatchObject({ status: "ativo", salvo: true });
  const { data: sombras, error } = await banco
    .from("atividades_nao_letivas")
    .select("id, salvo, rascunho_exclui")
    .eq("rascunho_de", (salva as { id: string }).id);
  conferir("a sombra da exclusão", error);
  expect(sombras).toEqual([expect.objectContaining({ salvo: false, rascunho_exclui: true })]);

  /* Pedida, o Desativar fica indisponível até o *Salvar a semana*. */
  await expect(linha.getByRole("button", { name: /^Desativar:/ })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});

test("FR-007.1 · a aba Atividades da turma: a lista, os filtros e o uso do limite do currículo", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await irAFichaDaTurma(page, EMAIL, TURMA);
  await page
    .getByRole("tablist", { name: "Seções da turma" })
    .getByRole("tab", { name: "Atividades", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).searchParams.get("aba")).toBe("atividades");

  const aba = page.locator('[data-slot="atividades-da-turma"]');
  await expect(aba).toBeVisible({ timeout: 15_000 });
  await expect(aba.locator(`[data-atividade^="${PREFIXO}-"]`)).toHaveCount(4);
  /* Na turma, a coluna Turma é redundante e não existe. */
  await expect(aba.locator('[data-slot="tabela-de-atividades"] thead')).not.toContainText("Turma");

  await abrirPainel(page, "estatisticas");
  const limite = aba.locator('[data-slot="uso-do-limite-da-turma"]');
  await expect(limite).toBeVisible();
  await expect(limite.locator("[data-limite]")).toHaveCount(3);
  await expect(aba.locator('[data-indicador="total-de-atividades"]')).toHaveText(
    /Atividades\s*4(?!\d)/,
  );

  await abrirPainel(page, "filtros");
  /* Sem Turma nem Curso: a turma já é esta. */
  await expect(page.getByRole("combobox", { name: "Turma", exact: true })).toHaveCount(0);
  await escolherOpcao(page, "Classificação", "TA da disciplina");
  await expect.poll(() => new URL(page.url()).searchParams.get("categoria")).toBe("CHD");
  await expect(aba.locator(`[data-atividade^="${PREFIXO}-"]`)).toHaveCount(1);
  await expect(aba.locator(`[data-atividade^="${PREFIXO}-"]`)).toHaveAttribute(
    "data-atividade",
    CODIGO.daDisciplina(),
  );
});

/* ───────────────────────────── SC-005 · o «Cumpre» do DSA, por clique, e o RP-0 ───────────────────────────── */

type LancamentoVinculadoNoBanco = {
  readonly atividade_prevista_id: string | null;
  readonly apoinst_id: string | null;
  readonly subtipo: string | null;
  readonly tempos_consumidos: number | null;
  readonly salvo: boolean;
};

/** A linha que VALE do lançamento vinculado à prevista: a ativa sem sombra de rascunho (antes do Salvar, o rascunho). */
async function lancamentoVinculado(previstaId: string): Promise<LancamentoVinculadoNoBanco | null> {
  const { data, error } = await banco
    .from("atividades_nao_letivas")
    .select("atividade_prevista_id, apoinst_id, subtipo, tempos_consumidos, salvo")
    .eq("turma_id", TURMA_ID)
    .eq("atividade_prevista_id", previstaId)
    .eq("status", "ativo")
    .is("rascunho_de", null)
    .maybeSingle();
  conferir("o lançamento vinculado", error);
  return data as LancamentoVinculadoNoBanco | null;
}

/** Na ficha: a aba Palestras pelo clique, e a URL dona dela. */
async function abrirPalestrasDaTurma(page: Page): Promise<void> {
  await page
    .getByRole("tablist", { name: "Seções da turma" })
    .getByRole("tab", { name: "Palestras", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).searchParams.get("aba")).toBe("palestras");
  await expect(page.locator('[data-slot="palestras-da-turma"]')).toBeVisible({ timeout: 15_000 });
}

/** No DSA: a aba Palestras do acompanhamento, abaixo da grade (FR-008.1). */
async function abrirPalestrasDoDsa(page: Page): Promise<void> {
  await page.locator('[data-acompanhamento="palestras"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("acompanhamento")).toBe("palestras");
  await expect(page.locator('[data-slot="acompanhamento-de-palestras"]')).toBeVisible({
    timeout: 15_000,
  });
}

/** A linha da AEC prevista no quadro da ficha (`palestras-da-turma`) ou no do DSA (`acompanhamento-de-palestras`). */
const linhaDaPrevistaEm = (
  page: Page,
  onde: "palestras-da-turma" | "acompanhamento-de-palestras",
  codigo: string,
) =>
  page
    .locator(`[data-slot="${onde}"] tr`)
    .filter({ has: page.locator(`[data-prevista="${codigo}"]`) });

/** Do DSA de volta à ficha, pelo código da turma no cabeçalho (o link da ficha). */
async function voltarAFicha(page: Page): Promise<void> {
  await page.locator('[data-slot="semana-atual"] [data-slot="turma-do-dsa"]').first().click();
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toBe(enderecoDaTurma(TURMA));
}

/** Da ficha ao DSA, pelo ícone, e à semana do caso pelo campo de data. */
async function abrirODsaNaSemana(page: Page): Promise<void> {
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, SEGUNDA_DO_CUMPRE, SEMANA_DO_CUMPRE, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

/** Espera o desfecho de uma gravação no formulário: «fechou», «avisou» ou «recusou: …». */
async function desfechoDoLancamento(page: Page): Promise<string> {
  const ler = async (): Promise<string> => {
    const recusa = page.locator('[data-slot="recusa-do-lancamento"]');
    if ((await recusa.count()) > 0) return `recusou: ${await recusa.innerText()}`;
    if ((await page.locator(FORMULARIO).count()) === 0) return "fechou";
    if ((await page.locator('[data-slot="avisos-do-lancamento"]').count()) > 0) return "avisou";
    return "em curso";
  };
  await expect.poll(ler, { timeout: 60_000 }).not.toBe("em curso");
  return ler();
}

test("SC-005 · o «Cumpre» do DSA: a Palestra vinculada é rascunho e não cumpre; «Salvar a semana» a faz «Cumprida» na turma e no DSA", async ({
  page,
}) => {
  /*
   * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…)"* — RA-5, Bernardo Villas Boas, 03/11/2026
   *
   * ⚠️ **ACHADO 24 DA REVISÃO (03/11/2026)**: nenhum caso passava pelo «Cumpre» com uma AEC prevista — a linha vinculada
   *    da semente nasce pela `service_role`, já salva. Apagar o envio do vínculo no formulário, ou a gravação das duas
   *    colunas na ação, passava a suíte inteira. Aqui o vínculo nasce PELA TELA, e o caso confere as três metades: a
   *    linha gravada, o rascunho que NÃO cumpre (RP-0) e o salvo que cumpre — na ficha e no acompanhamento do DSA.
   */
  test.setTimeout(240_000);

  /* A segunda AEC prevista, SEM lançamento: é a que o DSA vai cumprir. Gravada sem sessão (a carga). */
  const previstaId = crypto.randomUUID();
  conferir(
    "a AEC prevista do DSA",
    (
      await banco.from("aec_previstas_curriculo").insert({
        id: previstaId,
        curso_id: CURSO_ID,
        curriculo_id: CURRICULO_1,
        nome: NOME_PREVISTA_DO_DSA,
        tipo_atividade_id: await idDoTipo("Palestra"),
        ta_previstos: 2,
        obrigatoria: true,
        ordem: 2,
      })
    ).error,
  );
  const { data: prevista, error: erroPrevista } = await banco
    .from("aec_previstas_curriculo")
    .select("codigo")
    .eq("id", previstaId)
    .single();
  conferir("o código da AEC prevista do DSA", erroPrevista);
  const codigoDaPrevista = (prevista as { codigo: string }).codigo;

  /* ── 1. A ficha → Palestras: a prevista nasce «A cumprir» (o controle positivo da linha) ─────────────────── */
  await irAFichaDaTurma(page, EMAIL, TURMA);
  await abrirPalestrasDaTurma(page);
  const naFicha = () => linhaDaPrevistaEm(page, "palestras-da-turma", codigoDaPrevista);
  await expect(naFicha()).toHaveCount(1);
  await expect(naFicha().locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
    "data-situacao",
    "a_cumprir",
  );

  /* ── 2. O DSA por clique → a semana → a Palestra que CUMPRE a prevista, escolhida no «Cumpre» ────────────── */
  await abrirODsaNaSemana(page);
  await page.locator(`${GRADE} td[data-celula="${CELULA_DO_CUMPRE}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Palestra" });
  const vinculo = page.locator("#dsa-vinculo");
  const opcao = vinculo.locator(`option[value="prevista:${previstaId}"]`);
  await expect(opcao).toHaveCount(1);
  await expect(opcao).toContainText(NOME_PREVISTA_DO_DSA);
  await expect(opcao, "a prevista ainda não tem lançamento").not.toContainText("já cumprida");
  await vinculo.selectOption(`prevista:${previstaId}`);
  /* FR-003.3: escolher a prevista preenche o «O que é» com o nome dela (vazio até ali). */
  await expect(page.locator("#dsa-descricao")).toHaveValue(NOME_PREVISTA_DO_DSA);
  await page.locator("#dsa-tempos").fill("2");
  await page.locator("#dsa-sala").selectOption(SALA_DA_LISTA);
  await page.locator('[data-slot="gravar-lancamento"]').click();
  expect(await desfechoDoLancamento(page)).not.toMatch(/^recusou/);
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.locator('[data-slot="fechar-formulario"]').click();
  }

  /* ── 3. No banco: a linha VINCULADA à prevista, e RASCUNHO (RP-0) — a prova é a linha, não o campo (PEND-016-2) ── */
  await expect.poll(() => lancamentoVinculado(previstaId), { timeout: 30_000 }).not.toBeNull();
  expect(await lancamentoVinculado(previstaId)).toMatchObject({
    atividade_prevista_id: previstaId,
    apoinst_id: null,
    subtipo: "Palestra",
    tempos_consumidos: 2,
    salvo: false,
  });

  /* ── 4. RP-0: o rascunho NÃO cumpre — nem no acompanhamento do DSA, nem na ficha ──────────────────────────── */
  await abrirPalestrasDoDsa(page);
  const noDsa = () => linhaDaPrevistaEm(page, "acompanhamento-de-palestras", codigoDaPrevista);
  await expect(noDsa()).toHaveCount(1);
  await expect(noDsa().locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
    "data-situacao",
    "a_cumprir",
  );
  await expect(noDsa()).toContainText("0 de 2 TA");

  await voltarAFicha(page);
  await abrirPalestrasDaTurma(page);
  await expect(naFicha().locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
    "data-situacao",
    "a_cumprir",
  );
  await expect(naFicha()).toContainText("0 de 2 TA");

  /* ── 5. «Salvar a semana»: só então o lançamento conta ───────────────────────────────────────────────────── */
  await abrirODsaNaSemana(page);
  await salvarASemana(page);
  await expect
    .poll(async () => (await lancamentoVinculado(previstaId))?.salvo, { timeout: 30_000 })
    .toBe(true);

  /* ── 6. Cumprida no acompanhamento do DSA — por lançamento, não à mão ────────────────────────────────────── */
  await abrirPalestrasDoDsa(page);
  await expect(noDsa().locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
    "data-situacao",
    "cumprida",
    { timeout: 15_000 },
  );
  await expect(noDsa()).toContainText("Cumprida");
  await expect(noDsa()).toContainText("2 de 2 TA");

  /* E o «Cumpre» do formulário passa a dizer «(já cumprida)» — sem esconder a opção (a palestra pode ter mais sessões). */
  await page.locator(`${GRADE} td[data-celula="${CELULA_DA_CONFERENCIA}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await page.locator('[data-tipo="AEC"]').click();
  await page.locator("#dsa-subtipo").selectOption({ label: "Palestra" });
  await expect(page.locator(`#dsa-vinculo option[value="prevista:${previstaId}"]`)).toContainText(
    "(já cumprida)",
  );
  await page.locator('[data-slot="fechar-formulario"]').click();
  await expect(page.locator(FORMULARIO)).toHaveCount(0);

  /* ── 7. Cumprida na ficha da turma, e sem o *Registrar cumprimento* (não há o que marcar à mão) ───────────── */
  await voltarAFicha(page);
  await abrirPalestrasDaTurma(page);
  await expect(naFicha().locator('[data-slot="situacao-da-prevista"]')).toHaveAttribute(
    "data-situacao",
    "cumprida",
  );
  await expect(naFicha()).toContainText("Cumprida");
  await expect(naFicha()).toContainText("2 de 2 TA");
  await expect(naFicha().locator('[data-slot="registrar-marcacao"]')).toHaveCount(0);
});

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
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { abrirPainel, escolherAno } from "./paineis";

test.describe.configure({ mode: "serial" });

const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ANO = 2047;
/** Segunda a quinta da semana ISO 11 de 2047 — a semana que o *Editar* abre. */
const DIAS = ["2047-03-11", "2047-03-12", "2047-03-13", "2047-03-14"] as const;
const NOME_PREVISTA = "Palestra prevista da amostra do módulo";

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

/** A rodada anterior sai: atividades (os rascunhos antes), AEC previstas, linhas, turmas e disciplinas. */
async function limpar(): Promise<void> {
  if (CURSO_ID === "") return;
  const { data: turmas } = await banco.from("turmas").select("id").eq("curso_id", CURSO_ID);
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
  for (const id of ids) {
    await apagarLinhasDaTurma(id);
    conferir("turma", (await banco.from("turmas").delete().eq("id", id)).error);
  }
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
  const { data: d } = await banco
    .from("disciplinas")
    .select("id")
    .eq("curriculo_id", CURRICULO_1)
    .eq("cod_disciplina", "I")
    .single();
  DISCIPLINA_ID = (d as { id: string }).id;

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

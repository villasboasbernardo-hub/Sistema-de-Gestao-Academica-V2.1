/**
 * Bloco 15 (spec 030) — Início (tela cheia, setas), ano no cabeçalho e ajustes do DSA. Tudo por clique, a partir da
 * ficha da turma ou do menu; `goto`/`entrar` só para o ponto de partida.
 *
 * ⚠️ **AS SEMANAS PUBLICADAS SÃO ESCOLHIDAS NA HORA** (como em `bloco-11-dsa.spec.ts`): a trilha da publicação é
 *    imutável e a turma da semente persiste entre rodadas, então a semana publicada na rodada anterior não aceita
 *    lançamento. A primeira candidata sem evento nas duas turmas do processo é a do caso — e a suíte roda duas vezes
 *    seguidas (regra 9.1). As candidatas não cruzam com as do Bloco 11.
 * ⚠️ **A SEMANA CHEIA DO ITEM 8 É UMA TERCEIRA, SEM EVENTO E SEM LANÇAMENTO DA TURMA**: os 40 tempos dela são semeados
 *    no próprio caso e apagados no fim dele (uma aula a mais num TA já ocupado iria para a lista «fora da grade»).
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";
import { dataComDiaDaSemana, intervaloDeDatas } from "@/lib/formato/data";

const ANO = 2026;
/** A segunda-feira da semana ISO `n` de 2026 (a semana 1 começa em 29/12/2025). */
const segundaDe = (n: number) =>
  new Date(Date.UTC(2025, 11, 29) + (n - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
const somarDias = (data: string, dias: number) =>
  new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const CANDIDATAS = [34, 35, 36, 37, 38, 39, 43, 44, 45, 46, 47, 48] as const;

let ADMIN = "";
let S: DsaSemeado;
let MARCA = "";
let PROCESSO = 0;
/** A semana do item 5 (editar antes de publicar), depois publicada — e a das abas e da tela cheia. */
let SEMANA_PUBLICADA = 34;
/** Uma semana sem evento, para o Estudo Individual (item 4) e o cartão (item 6). */
let SEMANA_LIVRE = 35;
/** A semana com todos os tempos lançados, para a PRÉVIA (item 8). */
let SEMANA_CHEIA = 36;
/** A G45 da semente (`dsa-de-teste.ts`): oito tempos por dia. */
const TEMPOS_DA_G45 = 8;
const topico = (n: string) => `Aula B15 ${n} ${MARCA}`;
/** A semana ISO de 2026 de uma data. */
const semanaDe = (data: string) =>
  Math.floor((Date.parse(`${data}T00:00:00Z`) - Date.UTC(2025, 11, 29)) / (7 * 86_400_000)) + 1;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

async function idDaTurma(codigo: string = S.turmaComRelogio): Promise<string> {
  const { data } = await banco().from("turmas").select("id").eq("codigo", codigo).single();
  return (data as { id: string }).id;
}

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  MARCA = `p${PROCESSO}`;
  ADMIN = emailDeTeste("bloco15", PROCESSO);
  await criarConta(ADMIN, `USR-B15-${PROCESSO}`);
  S = await semearDsa(PROCESSO, ADMIN);
  const { data: comEvento } = await banco()
    .from("dsa_eventos_da_semana")
    .select("semana")
    .in("turma_id", [await idDaTurma(), await idDaTurma(S.turmaComVigenciaNova)])
    .eq("ano", ANO);
  const usadas = new Set(((comEvento ?? []) as { semana: number }[]).map((e) => e.semana));
  const livres = CANDIDATAS.filter((n) => !usadas.has(n));
  if (livres.length < 2) throw new Error("sem semana candidata livre — rode o db:reset:limpo");
  SEMANA_PUBLICADA = livres[0] as number;
  SEMANA_LIVRE = livres[1] as number;
  /* Item 8: a primeira das que sobram sem aula nenhuma da turma (a semente lança uma «à frente», a duas semanas de hoje). */
  const { data: lancadas, error } = await banco()
    .from("registros_aula")
    .select("data")
    .eq("turma_id", await idDaTurma())
    .gte("data", segundaDe(Math.min(...CANDIDATAS)))
    .lte("data", somarDias(segundaDe(Math.max(...CANDIDATAS)), 6));
  if (error) throw new Error(`não li as aulas das semanas candidatas: ${error.message}`);
  const comAula = new Set(((lancadas ?? []) as { data: string }[]).map((r) => semanaDe(r.data)));
  const cheia = livres.slice(2).find((n) => !comAula.has(n));
  if (cheia === undefined) throw new Error("sem semana candidata livre — rode o db:reset:limpo");
  SEMANA_CHEIA = cheia;
});

test.afterAll(async () => {
  await banco().from("registros_aula").delete().like("conteudo_resumo", `Aula B15 % ${MARCA}`);
  await limparDsa(S);
  await apagarConta(ADMIN);
});

const celula = (page: Page, ta: number, dia: string) =>
  page.locator(
    `[data-slot="grade-alocacao"] td[aria-label$="· ${ta} · ${dataComDiaDaSemana(dia)}"]`,
  );

async function abrirOsDsaDaTurma(page: Page, semana: number, turma = S.turmaComRelogio) {
  await irAFichaDaTurma(page, ADMIN, turma);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, segundaDe(semana), semana, ANO);
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
}

/** Lança uma aula de 1 TA, com o instrutor habilitado da semente. */
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

async function publicar(page: Page): Promise<void> {
  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(page.locator('[data-slot="resposta-da-publicacao"]')).toContainText(
    "Semana publicada (original)",
  );
}

/** A dica de um ícone, ao focá-lo por teclado (a dica do Radix abre no foco visível). */
async function dicaDe(page: Page, seletor: string): Promise<string> {
  await page.locator(seletor).first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const dica = page.locator('[data-slot="tooltip-content"]').first();
  await expect(dica).toBeVisible();
  return (await dica.innerText()).trim();
}

test.describe.configure({ mode: "serial" });

test("itens 9 e 10 · a semana UMA vez, numa linha, e a barra única em três grupos, só de ícones", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirOsDsaDaTurma(page, SEMANA_LIVRE);

  /* Item 9: código (o link da ficha) · Semana N de T · 26/10 a 31/10/2026 — e nada repetido. */
  const linha = page.locator('[data-slot="semana-atual"]');
  const intervalo = intervaloDeDatas(
    segundaDe(SEMANA_LIVRE),
    somarDias(segundaDe(SEMANA_LIVRE), 4),
  );
  await expect(linha).toContainText(S.turmaComRelogio);
  await expect(linha).toContainText(/Semana \d+ de \d+/);
  await expect(linha).toContainText(intervalo.split(" a ")[0] as string);
  const cabecalho = page.locator('[data-slot="publicacao-do-dsa"]');
  await expect(cabecalho.getByRole("link", { name: "Voltar à turma" })).toHaveCount(0);
  await expect(page.locator('[data-slot="cabecalho-da-semana"]')).toHaveCount(0);
  await expect(cabecalho).not.toContainText("Alunos");
  /* O período aparece uma vez só na página (era três). */
  const inicioDoPeriodo = (intervalo.split(" a ")[0] as string) + " a ";
  expect(
    (await page.locator("main").innerText()).split(inicioDoPeriodo).length - 1,
    "o período da semana apareceu mais de uma vez",
  ).toBe(1);

  /* Item 10: três grupos, na ordem; a navegação, o sábado, o Parar dia e o EI moraram para a barra. */
  const barra = cabecalho.locator('[data-slot="barra-de-acoes"]');
  const grupos = await barra.evaluate((b) =>
    [...b.querySelectorAll(':scope > [role="group"]')].map((g) => g.getAttribute("data-slot")),
  );
  expect(grupos).toEqual(["navegacao-da-semana", "lancamento-do-dsa", "publicacao-da-barra"]);
  const navegacao = barra.locator('[data-slot="navegacao-da-semana"]');
  for (const acao of ["semana-anterior", "semana-atual", "semana-proxima"]) {
    await expect(navegacao.locator(`[data-acao="${acao}"]`)).toBeVisible();
  }
  await expect(navegacao.locator('[data-slot="abrir-calendario-do-dsa"]')).toBeVisible();
  const lancamento = barra.locator('[data-slot="lancamento-do-dsa"]');
  for (const slot of ["parar-dia", "lancar-estudo-individual", "remover-estudo-individual"]) {
    await expect(lancamento.locator(`[data-slot="${slot}"]`)).toBeVisible();
  }
  await expect(lancamento.locator('[data-acao="alternar-sabado"]')).toBeVisible();
  /* Só ícones: nenhum botão da barra tem texto escrito. */
  const comTexto = await barra
    .locator("button, a")
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).innerText.trim()).filter(Boolean));
  expect(comTexto, "botão com texto na barra do DSA").toEqual([]);
  /* A dica é só o verbo. */
  expect(await dicaDe(page, '[data-acao="semana-proxima"]')).toBe("Avançar");
  expect(await dicaDe(page, '[data-acao="semana-anterior"]')).toBe("Voltar");

  /* A navegação pela barra empilha (RF-NAV-04): avançar e voltar uma semana. */
  await page.locator('[data-acao="semana-proxima"]').click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("semana"))
    .toBe(String(SEMANA_LIVRE + 1));
  await page.locator('[data-acao="semana-anterior"]').click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("semana"))
    .toBe(String(SEMANA_LIVRE));

  /* O código da turma leva à ficha. */
  await linha.locator('[data-slot="turma-do-dsa"]').click();
  await expect
    .poll(() => new URL(page.url()).pathname)
    .toBe(`/turmas/${encodeURIComponent(S.turmaComRelogio)}`);
});

test("item 4 · o EI só existe lançado: excluído pela barra ou pelo cartão, ele NÃO volta sozinho", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await abrirOsDsaDaTurma(page, SEMANA_LIVRE);
  const eis = page.locator(
    '[data-slot="grade-da-semana"] [data-slot="dsa-cartao"][data-tipo="estudo"]',
  );

  /* ⚠️ O caso que discrimina: sem EI lançado, a grade não tem cartão de EI (era a linha fixa, em todo dia útil). */
  await expect(eis).toHaveCount(0);

  /* Lançar EI (barra) → os dias úteis ganham EI; salvar. */
  await page.locator('[data-slot="lancar-estudo-individual"]').click();
  await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toContainText(
    "Estudo Individual lançado",
  );
  await expect(eis.first()).toBeVisible();
  const lancados = await eis.count();
  expect(lancados).toBeGreaterThan(0);
  await salvarASemana(page);

  /* Remover EI (barra), com confirmação → saem da grade, como rascunho, e saem de vez no Salvar minuta. */
  await page.locator('[data-slot="remover-estudo-individual"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Remover" })
    .click();
  await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toContainText(
    "Estudo Individual removido",
  );
  await expect(eis).toHaveCount(0);
  await salvarASemana(page);
  const turmaId = await idDaTurma();
  const { data: vivos } = await banco()
    .from("atividades_nao_letivas")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("categoria_normativa", "Estudo_Individual")
    .eq("status", "ativo")
    .gte("data", segundaDe(SEMANA_LIVRE))
    .lte("data", somarDias(segundaDe(SEMANA_LIVRE), 6));
  expect(vivos ?? [], "o EI removido continua ativo no banco").toEqual([]);

  /* ⚠️ Ele NÃO volta sozinho: recarregar a semana não traz EI nenhum. */
  await page.reload();
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
  await expect(eis).toHaveCount(0);

  /* Só pelo «Lançar EI»; e o cartão de um EI se exclui como qualquer lançamento. */
  await page.locator('[data-slot="lancar-estudo-individual"]').click();
  await expect(eis.first()).toBeVisible();
  const antes = await eis.count();
  await eis.first().click();
  await expect(page.locator('[data-slot="acoes-do-bloco"]')).toBeVisible();
  await page.locator('[data-slot="excluir-bloco"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(eis).toHaveCount(antes - 1);
  await salvarASemana(page);
  await page.reload();
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
  await expect(eis, "o EI excluído pelo cartão voltou").toHaveCount(antes - 1);

  /* Limpeza do caso: a semana volta sem EI. */
  await page.locator('[data-slot="remover-estudo-individual"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Remover" })
    .click();
  await salvarASemana(page);
});

test("item 6 · o cartão do lançamento: Salvar · Cancelar · Excluir em ícones, juntos à esquerda", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await abrirOsDsaDaTurma(page, SEMANA_LIVRE);
  const dia = segundaDe(SEMANA_LIVRE);
  await lancarAula(page, 2, dia, topico("cartao"));
  /* ⚠️ Esperar a grade redesenhar com a aula: clicar antes abria «Lançar» na célula ainda vazia. */
  await expect(celula(page, 2, dia).locator('[data-slot="dsa-cartao"]')).toBeVisible();
  await celula(page, 2, dia).click();
  const cartao = page.locator('[data-slot="acoes-do-bloco"]');
  await expect(cartao).toBeVisible();
  /* O nome por extenso da disciplina, legível. */
  await expect(cartao.locator('[data-slot="disciplina-por-extenso"]')).toBeVisible();

  const acoes = cartao.locator('[data-slot="acoes-do-cartao"] button');
  await expect(acoes).toHaveCount(3);
  const textos = await acoes.evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).innerText.trim()),
  );
  expect(textos, "botão com texto no cartão do lançamento").toEqual(["", "", ""]);
  /* Juntos, no canto inferior ESQUERDO: o primeiro encosta na borda esquerda do cartão; o último, perto dele. */
  const caixaDoCartao = await cartao.boundingBox();
  const primeiro = await acoes.first().boundingBox();
  const ultimo = await acoes.last().boundingBox();
  expect(primeiro && caixaDoCartao && primeiro.x - caixaDoCartao.x).toBeLessThan(24);
  expect(primeiro && ultimo && ultimo.x - primeiro.x).toBeLessThan(140);
  expect(await dicaDe(page, '[data-slot="excluir-bloco"]')).toBe("Excluir");

  /* Cancelar fecha sem gravar. */
  await page.locator('[data-slot="fechar-cartao"]').click();
  await expect(cartao).toHaveCount(0);

  /* Limpeza: exclui e salva. */
  await celula(page, 2, dia).click();
  await page.locator('[data-slot="excluir-bloco"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Excluir" })
    .click();
  await salvarASemana(page);
});

test("itens 5 e 7 · editar antes de publicar sem ALT; as abas de versão", async ({ page }) => {
  test.setTimeout(300_000);
  await abrirOsDsaDaTurma(page, SEMANA_PUBLICADA);
  const dia = segundaDe(SEMANA_PUBLICADA);

  /* Semana nunca publicada: só a aba Minuta (FR-007.2). */
  await expect(
    page.locator('[data-slot="abas-de-versao"] > [role="tablist"] [role="tab"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-slot="abas-de-versao"] > [role="tablist"] [role="tab"]'),
  ).toContainText("Minuta");

  /* Item 5: lançar → salvar → prévia → editar → salvar → prévia → publicar = Original, sem ALT. */
  await lancarAula(page, 1, dia, topico("previa"));
  await salvarASemana(page);
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
  /* A marca do item 8 é medida no caso dele, com a semana cheia. */
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveText("PRÉVIA");
  await page.goBack();
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();

  /* Editar de novo, sem justificativa e sem «Fazer alteração». */
  await celula(page, 1, dia).click();
  await page.locator("#dsa-editar-conteudo").fill(topico("previa-editada"));
  await page.locator('[data-slot="gravar-edicao"]').click();
  await expect(page.locator('[data-slot="acoes-do-bloco"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="fazer-alteracao"]')).toHaveCount(0);
  await salvarASemana(page);
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect(page.locator('[data-slot="dsa-previa"]')).toHaveText("PRÉVIA");
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("PRÉVIA");
  await page.goBack();
  await expect(page.locator('[data-slot="publicacao-do-dsa"]')).toBeVisible();
  await publicar(page);

  const { data: eventos } = await banco()
    .from("dsa_eventos_da_semana")
    .select("tipo, numero")
    .eq("turma_id", await idDaTurma())
    .eq("ano", ANO)
    .eq("semana", SEMANA_PUBLICADA)
    .in("tipo", ["publicado", "alteracao_publicada"]);
  expect(eventos, "nasceu ALT antes da 1ª publicação").toEqual([{ tipo: "publicado", numero: 0 }]);

  /* Item 7: Minuta · Original; a aba na URL; o papel da Original com Reimprimir. */
  const abas = page.locator('[data-slot="abas-de-versao"] > [role="tablist"] [role="tab"]');
  await expect(abas).toHaveCount(2);
  await page.locator('[data-slot="abas-de-versao"] [data-versao="0"]').click();
  await expect.poll(() => new URL(page.url()).searchParams.get("versao")).toBe("0");
  const papel = page.locator('[data-slot="papel-da-versao"][data-versao-aberta="0"]');
  await expect(papel).toBeVisible();
  await expect(papel.locator('[data-slot="dsa-impresso"]')).toContainText(topico("previa-editada"));
  await expect(papel.locator('[data-slot="reimprimir-versao"]')).toBeVisible();
  await expect(page.locator('[data-slot="grade-da-semana"]')).toHaveCount(0);
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("versao")).toBeNull();
  await expect(page.locator('[data-slot="grade-da-semana"]')).toBeVisible();

  /* Versão que não existe: a Minuta, com aviso (RN-DEG-01). */
  const url = new URL(page.url());
  url.searchParams.set("versao", "7");
  await page.goto(url.toString());
  await expect(page.locator('[data-slot="aviso-de-versao"]')).toBeVisible();
  await expect(page.locator('[data-slot="grade-da-semana"]')).toBeVisible();
});

test("item 3 · o ano no cabeçalho: trocar em Turmas e conferir Início, Turmas e Instrutores", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const MENU = page.getByRole("navigation", { name: "Navegação principal" });
  const escolha = page.locator(
    '[data-slot="cabecalho-do-app"] select[data-slot="ano-do-painel-escolha"]',
  );
  await entrar(page, ADMIN, "/inicio");
  /* Um seletor só, no cabeçalho — nenhum na página. */
  await expect(page.locator('select[data-slot="ano-do-painel-escolha"]')).toHaveCount(1);
  await expect(escolha).toBeVisible();

  await MENU.getByRole("link", { name: "Turmas", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  await expect(page.locator('select[data-slot="ano-do-painel-escolha"]')).toHaveCount(1);
  await escolha.selectOption(String(ANO + 1));
  await expect(page.locator('[data-slot="contagem-de-turmas"]')).toContainText(`em ${ANO + 1}`, {
    timeout: 15_000,
  });

  await MENU.getByRole("link", { name: "Início", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/inicio");
  await expect(escolha).toHaveValue(String(ANO + 1));
  await expect(page.locator('[data-slot="turmas-do-ano"]')).toHaveAttribute(
    "data-ano",
    String(ANO + 1),
  );

  await MENU.getByRole("link", { name: "Instrutores", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/instrutores");
  await expect(escolha).toHaveValue(String(ANO + 1));
  await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe(String(ANO + 1));

  /* De volta ao ano de hoje: a escolha some. */
  await escolha.selectOption(String(ANO));
  await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBeNull();

  /*
   * ⚠️ E ABERTA POR ENDEREÇO, UM SELETOR SÓ DESDE O CARREGAMENTO (`SC-003`, medido em 29/10/2026): com um `Suspense` em
   *    volta dele, o servidor mandava a reserva (o ano guardado) e o conteúdo (o do `?ano=`) em pedaços separados, e no
   *    `load` de `/instrutores?ano=…`, `/turmas` e `/inicio` o DOM tinha dois `<select>`. A contagem é IMEDIATA: a espera
   *    do `expect` aguardaria a troca e passaria com o defeito.
   */
  for (const caminho of [`/instrutores?ano=${ANO + 1}`, "/turmas", "/inicio"]) {
    await page.goto(caminho);
    await page.waitForLoadState("load");
    expect(
      await page.locator('select[data-slot="ano-do-painel-escolha"]').count(),
      `${caminho}: mais de um seletor de ano no carregamento`,
    ).toBe(1);
  }
});

test("itens 1 e 2 · no Início: as setas nos cantos e nas laterais, e a tela cheia do papel", async ({
  page,
}) => {
  test.setTimeout(300_000);
  /* O 2º papel da semana, na outra turma do processo: com dois, o carrossel desenha as setas (D-22). */
  await abrirOsDsaDaTurma(page, SEMANA_PUBLICADA, S.turmaComVigenciaNova);
  const situacao = await page
    .locator('[data-slot="publicacao-do-dsa"]')
    .getAttribute("data-situacao");
  if (situacao !== "publicado") {
    /* A turma de vigência nova não tem disciplina na semente: o lançamento é o EI da semana, em um clique. */
    await page.locator('[data-slot="lancar-estudo-individual"]').click();
    await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toContainText(
      "Estudo Individual",
    );
    await salvarASemana(page);
    await publicar(page);
  }
  /* Sem «reduzir movimento» o carrossel anda sozinho a cada 10 s, e o papel medido mudaria no meio do caso. */
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const janela of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(janela);
    await entrar(page, ADMIN, `/inicio?semana=${segundaDe(SEMANA_PUBLICADA)}`);
    const secao = page.locator('[data-slot="dsa-publicados"]');
    await expect(secao).toHaveAttribute("data-semana", `${ANO}-${SEMANA_PUBLICADA}`);

    /* Item 2: a semana com as setas nos cantos e as datas no centro, entre elas. */
    const linhaDaSemana = page.locator('[data-slot="escolha-da-semana"]');
    const anterior = await linhaDaSemana.locator('[data-acao="semana-anterior"]').boundingBox();
    const seguinte = await linhaDaSemana.locator('[data-acao="semana-seguinte"]').boundingBox();
    const datas = await linhaDaSemana.locator('[data-slot="rotulo-da-semana"]').boundingBox();
    const caixa = await linhaDaSemana.boundingBox();
    expect(anterior && caixa && anterior.x - caixa.x).toBeLessThan(4);
    expect(seguinte && caixa && caixa.x + caixa.width - (seguinte.x + seguinte.width)).toBeLessThan(
      4,
    );
    expect(anterior && datas && seguinte && datas.x > anterior.x && datas.x < seguinte.x).toBe(
      true,
    );

    /* As setas do carrossel nas laterais do papel, centradas na vertical. */
    const carrossel = page.locator('[data-slot="carrossel-do-dsa"]');
    const papel = carrossel.locator(
      '[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="dsa-impresso"]',
    );
    await expect(papel).toBeVisible();
    const caixaDoPapel = await carrossel
      .locator('[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="papel-reduzido"]')
      .boundingBox();
    const setaEsq = await carrossel.locator('[data-slot="carrossel-anterior"]').boundingBox();
    const setaDir = await carrossel.locator('[data-slot="carrossel-proximo"]').boundingBox();
    expect(setaEsq && caixaDoPapel && setaEsq.x + setaEsq.width <= caixaDoPapel.x + 1).toBe(true);
    expect(setaDir && caixaDoPapel && setaDir.x >= caixaDoPapel.x + caixaDoPapel.width - 1).toBe(
      true,
    );
    const meio = caixaDoPapel ? caixaDoPapel.y + caixaDoPapel.height / 2 : 0;
    expect(setaEsq && Math.abs(setaEsq.y + setaEsq.height / 2 - meio)).toBeLessThan(40);
    /* O papel continua inteiro na janela. */
    const folha = await papel.boundingBox();
    expect(folha && folha.y + folha.height).toBeLessThanOrEqual(janela.height + 1);

    /* Item 1: clicar no papel abre a tela cheia, maior; Esc fecha. */
    const escalaNoCarrossel = Number(
      await carrossel
        .locator('[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="papel-reduzido"]')
        .getAttribute("data-escala"),
    );
    await carrossel
      .locator('[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="abrir-tela-cheia"]')
      .click();
    const tela = page.locator('[data-slot="tela-cheia"]');
    await expect(tela).toBeVisible();
    const naTelaCheia = tela.locator('[data-slot="papel-na-tela-cheia"]');
    await expect(naTelaCheia).toHaveAttribute("data-escala", /\d/);
    const escalaNaTela = Number(await naTelaCheia.getAttribute("data-escala"));
    expect(escalaNaTela, "a tela cheia não ampliou o papel").toBeGreaterThan(escalaNoCarrossel);
    const folhaNaTela = await tela.locator('[data-slot="dsa-impresso"]').boundingBox();
    expect(folhaNaTela && folhaNaTela.x).toBeGreaterThanOrEqual(-1);
    expect(folhaNaTela && folhaNaTela.y + folhaNaTela.height).toBeLessThanOrEqual(
      janela.height + 1,
    );
    expect(folhaNaTela && folhaNaTela.x + folhaNaTela.width).toBeLessThanOrEqual(janela.width + 1);

    /*
     * As setas dentro dela: → e o ícone trocam o papel. ⚠️ O título é o do DIÁLOGO, por `data-slot`: o papel do DSA dentro
     * dela tem o seu, e `getByRole("heading")` casava com os dois.
     */
    const titulo = tela.locator('[data-slot="titulo-da-tela-cheia"]');
    const primeiro = await titulo.innerText();
    await page.keyboard.press("ArrowRight");
    await expect(titulo).not.toHaveText(primeiro);
    await tela.locator('[data-slot="tela-cheia-anterior"]').click();
    await expect(titulo).toHaveText(primeiro);
    await page.keyboard.press("Escape");
    await expect(tela).toHaveCount(0);

    /*
     * Enter no papel abre, e UM `Esc` fecha. ⚠️ Aberta pelo teclado, a tela cheia punha o foco no ícone, o foco visível
     * abria a dica dele, e o primeiro `Esc` fechava só a dica (medido em 29/10/2026). Depois, o ícone também fecha.
     */
    const papelAtual = carrossel.locator(
      '[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="abrir-tela-cheia"]',
    );
    await papelAtual.focus();
    await page.keyboard.press("Enter");
    await expect(tela).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tela, "um Esc não fechou a tela cheia aberta pelo teclado").toHaveCount(0);
    await papelAtual.focus();
    await page.keyboard.press("Enter");
    await expect(tela).toBeVisible();
    expect(await dicaDe(page, '[data-slot="sair-da-tela-cheia"]')).toBe("Sair da tela cheia");
    await tela.locator('[data-slot="sair-da-tela-cheia"]').click();
    await expect(tela).toHaveCount(0);
  }
});

/** Quantas páginas tem um PDF do Chromium (o `[^s]` separa `/Page` de `/Pages`, como em `dsa-imprimir.spec.ts`). */
const paginasDoPdf = (pdf: Buffer) =>
  (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

/** O `id` de uma linha lida pela chave de serviço — e o erro da leitura, nunca descartado. */
async function idDe(
  consulta: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  oQue: string,
): Promise<string> {
  const { data, error } = await consulta;
  if (error !== null || data === null)
    throw new Error(`não li ${oQue}: ${error?.message ?? "sem linha"}`);
  return (data as { id: string }).id;
}

/**
 * Item 8: a semana com TODOS os tempos lançados — os cinco dias úteis × os oito TA da G45, uma aula de 1 TA em cada, direto
 * no banco, como a semente. Sem sessão a linha nasce salva, e a semana sem rascunho já está registrada (D-18 da spec 024):
 * a prévia sai.
 */
async function semearASemanaCheia(dias: readonly string[]): Promise<void> {
  const turmaId = await idDaTurma();
  const { data: turma, error } = await banco()
    .from("turmas")
    .select("curso_id")
    .eq("id", turmaId)
    .single();
  if (error !== null) throw new Error(`não li o curso da turma: ${error.message}`);
  const cursoId = (turma as { curso_id: string }).curso_id;
  const disciplinaId = await idDe(
    banco()
      .from("disciplinas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("cod_disciplina", S.codDisciplina)
      .single(),
    "a disciplina da semente",
  );
  const ueId = await idDe(
    banco()
      .from("unidades_ensino")
      .select("id")
      .eq("disciplina_id", disciplinaId)
      .eq("numero_ue", 1)
      .single(),
    "a UE da semente",
  );
  const instrutorId = await idDe(
    banco().from("instrutores").select("id").eq("codigo", `DSA-E2D${PROCESSO}-INS`).single(),
    "o instrutor da semente",
  );
  const linhas = dias.flatMap((data) =>
    Array.from({ length: TEMPOS_DA_G45 }, (_, i) => ({
      codigo: `DSA-E2D${PROCESSO}-B15-${data.replaceAll("-", "")}-${i + 1}`,
      data,
      ta_inicial: i + 1,
      tempos_consumidos: 1,
      conteudo_resumo: topico(`cheia ${data.slice(8)} ${i + 1}`),
      local: S.sala,
      turma_id: turmaId,
      curso_id: cursoId,
      unidade_ensino_id: ueId,
      instrutor_id: instrutorId,
      metodologia: null,
    })),
  );
  const { error: erroDaCarga } = await banco()
    .from("registros_aula")
    .upsert(linhas, { onConflict: "codigo" });
  if (erroDaCarga !== null) throw new Error(`não semeei a semana cheia: ${erroDaCarga.message}`);
}

/**
 * ⚠️ **ITEM 8, AJUSTADO NA CONFERÊNCIA DE 29/10/2026** (Bernardo Villas Boas): *"a marca PRÉVIA atrás do conteúdo some
 *    quando a semana está toda lançada. Volte a marca para a FRENTE dos cartões, UMA palavra «PRÉVIA» só, grande e na
 *    diagonal, bem transparente (…), sem capturar clique (pointer-events: none)."* Atrás, os cartões opacos da semana
 *    cheia a cobriam inteira. ⚠️ **O CASO QUE DISCRIMINA É A SEMANA CHEIA**: numa semana com tempos vagos, a marca de
 *    trás aparecia entre os cartões, e o caso passaria com o defeito.
 * ⚠️ **"VISÍVEL" É A FOTO DO CARTÃO MUDAR COM A MARCA**: o `toBeVisible` passa com o elemento coberto (ele mede a caixa,
 *    não a pintura), e o `elementFromPoint` não enxerga quem tem `pointer-events: none`. Cada cartão é fotografado com a
 *    marca e sem ela; atrás dos cartões, nenhuma foto muda. As fotos esperam as fontes: uma troca de fonte entre as duas
 *    rodadas mudaria as fotos sem marca nenhuma, e o caso passaria com o defeito.
 */
test("item 8 · semana com todos os tempos lançados: a PRÉVIA na frente dos cartões, transparente, e o cartão sob ela recebe o clique", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const segunda = segundaDe(SEMANA_CHEIA);
  const dias = [0, 1, 2, 3, 4].map((d) => somarDias(segunda, d));
  const total = TEMPOS_DA_G45 * dias.length;
  await semearASemanaCheia(dias);
  try {
    /* A folha inteira na janela: nenhum cartão precisa de rolagem para ser fotografado. */
    await page.setViewportSize({ width: 1400, height: 1000 });
    await abrirOsDsaDaTurma(page, SEMANA_CHEIA);
    await expect(
      page.locator('[data-slot="grade-da-semana"] [data-slot="dsa-cartao"]'),
    ).toHaveCount(total);

    /* Gerar prévia, pela barra. */
    await page.locator('[data-slot="imprimir-dsa"]').click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
    const papel = page.locator('[data-slot="dsa-impresso"]');
    const cartoes = papel.locator('[data-slot="dsa-cartao"]');
    const marca = papel.locator('[data-slot="dsa-previa"]');
    await expect(cartoes).toHaveCount(total);
    /* UMA palavra só. */
    await expect(marca).toHaveCount(1);
    await expect(marca).toHaveText("PRÉVIA");
    await page.waitForLoadState("load");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });

    /* Bem transparente (de 0,08 a 0,12) e sem capturar clique. */
    const estilo = await marca.evaluate((m) => {
      const s = getComputedStyle(m);
      return { opacidade: Number(s.opacity), ponteiro: s.pointerEvents };
    });
    expect.soft(estilo.opacidade, "a PRÉVIA está mais opaca que 0,12").toBeLessThanOrEqual(0.12);
    expect
      .soft(estilo.opacidade, "a PRÉVIA está mais transparente que 0,08")
      .toBeGreaterThanOrEqual(0.08);
    expect.soft(estilo.ponteiro, "a PRÉVIA captura o clique").toBe("none");

    /*
     * Visível SOBRE os cartões: a foto do MIOLO de cada cartão, com a marca e sem ela. ⚠️ O miolo, e não a caixa: a foto
     * da caixa arredonda para fora e leva a borda de fora do cartão — por onde a marca de trás aparecia, e o caso passava
     * com o defeito (medido em 29/10/2026).
     */
    const miolos = await cartoes.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left + 3, y: r.top + 3, width: r.width - 6, height: r.height - 6 };
      }),
    );
    const fotos = async () => {
      const lista: Buffer[] = [];
      for (const clip of miolos) lista.push(await page.screenshot({ clip }));
      return lista;
    };
    const com = await fotos();
    await marca.evaluate((m) => {
      (m as HTMLElement).style.visibility = "hidden";
    });
    const sem = await fotos();
    await marca.evaluate((m) => {
      (m as HTMLElement).style.visibility = "";
    });
    const sob = com.flatMap((foto, i) => (foto.equals(sem[i] as Buffer) ? [] : [i]));
    test.info().annotations.push({
      type: "cartões sob a PRÉVIA",
      description: `${sob.length} de ${total}`,
    });
    expect
      .soft(sob.length, "com a semana cheia, a PRÉVIA não aparece sobre cartão nenhum")
      .toBeGreaterThan(2);

    /* O cartão sob a palavra: entre os que ela cobre, o mais perto do centro da folha (sem nenhum, o do centro). */
    const folha = await papel.boundingBox();
    if (folha === null) throw new Error("não medi a folha");
    const centros = await cartoes.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }),
    );
    const longe = (i: number) => {
      const c = centros[i] as { x: number; y: number };
      return Math.hypot(c.x - (folha.x + folha.width / 2), c.y - (folha.y + folha.height / 2));
    };
    const alvo = (sob.length > 0 ? sob : centros.map((_, i) => i)).reduce((a, b) =>
      longe(b) < longe(a) ? b : a,
    );
    const ponto = centros[alvo] as { x: number; y: number };
    const cartao = cartoes.nth(alvo);
    await cartao.evaluate((c) => c.setAttribute("data-sob-a-previa", "sim"));

    /* Na FRENTE da camada dos cartões: ligado o clique na marca à força, quem está no topo daquele ponto é ela. */
    const naFrente = await marca.evaluate((m, p) => {
      const e = m as HTMLElement;
      e.style.pointerEvents = "auto";
      const topo = document.elementFromPoint(p.x, p.y);
      e.style.pointerEvents = "";
      return topo !== null && e.contains(topo);
    }, ponto);
    expect.soft(naFrente, "a PRÉVIA não está na frente do cartão").toBe(true);

    /* E o cartão sob ela recebe o clique: o elemento no ponto é o cartão, e o duplo clique seleciona o texto dele. */
    const recebe = await page.evaluate(
      (p) => document.elementFromPoint(p.x, p.y)?.closest('[data-sob-a-previa="sim"]') != null,
      ponto,
    );
    expect(recebe, "o clique no cartão sob a PRÉVIA não chega ao cartão").toBe(true);
    /* Bloco 16 (ajuste C): os nomes são elementos próprios — o duplo clique vai no primeiro, não no vão entre eles. */
    await cartao
      .locator('.dsa4-cartao-pe > [data-slot="cartao-instrutor"] > *')
      .first()
      .dblclick({ timeout: 5_000 });
    const selecao = await page.evaluate(() => {
      const s = window.getSelection();
      const no = s?.anchorNode ?? null;
      const el = no === null ? null : no instanceof Element ? no : no.parentElement;
      return {
        texto: s?.toString().trim() ?? "",
        noCartao: el?.closest('[data-sob-a-previa="sim"]') != null,
      };
    });
    expect(
      selecao.noCartao && selecao.texto !== "",
      "o duplo clique no cartão sob a PRÉVIA não selecionou o texto dele",
    ).toBe(true);

    /*
     * Na impressão: a mesma marca — e, com a mídia de impressão, na frente e visível sobre o mesmo cartão — e a folha numa
     * página só. ⚠️ Só a opacidade igual não bastaria: uma regra de impressão que a escondesse ou a mandasse para trás
     * passaria.
     */
    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    await page.emulateMedia({ media: "print" });
    const naImpressao = await marca.evaluate((m) => {
      const s = getComputedStyle(m);
      return { opacidade: Number(s.opacity), ponteiro: s.pointerEvents };
    });
    expect.soft(naImpressao, "a PRÉVIA da impressão não é a da tela").toEqual(estilo);
    const noPapel = await cartao.evaluate((c) => {
      const r = c.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        clip: { x: r.left + 3, y: r.top + 3, width: r.width - 6, height: r.height - 6 },
      };
    });
    const naFrenteNoPapel = await marca.evaluate((m, p) => {
      const e = m as HTMLElement;
      e.style.pointerEvents = "auto";
      const topo = document.elementFromPoint(p.x, p.y);
      e.style.pointerEvents = "";
      return topo !== null && e.contains(topo);
    }, noPapel);
    expect.soft(naFrenteNoPapel, "na impressão, a PRÉVIA não está na frente do cartão").toBe(true);
    const comNoPapel = await page.screenshot({ clip: noPapel.clip });
    await marca.evaluate((m) => {
      (m as HTMLElement).style.visibility = "hidden";
    });
    const semNoPapel = await page.screenshot({ clip: noPapel.clip });
    await marca.evaluate((m) => {
      (m as HTMLElement).style.visibility = "";
    });
    expect
      .soft(comNoPapel.equals(semNoPapel), "na impressão, a PRÉVIA não aparece sobre o cartão")
      .toBe(false);
    const pdf = await page.pdf({ format: "A4", landscape: true });
    expect(paginasDoPdf(pdf), "com a PRÉVIA, a folha passou de uma página").toBe(1);
  } finally {
    await banco().from("registros_aula").delete().like("codigo", `DSA-E2D${PROCESSO}-B15-%`);
  }
});

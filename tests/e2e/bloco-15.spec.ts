/**
 * Bloco 15 (spec 030) — Início (tela cheia, setas), ano no cabeçalho e ajustes do DSA. Tudo por clique, a partir da
 * ficha da turma ou do menu; `goto`/`entrar` só para o ponto de partida.
 *
 * ⚠️ **AS SEMANAS PUBLICADAS SÃO ESCOLHIDAS NA HORA** (como em `bloco-11-dsa.spec.ts`): a trilha da publicação é
 *    imutável e a turma da semente persiste entre rodadas, então a semana publicada na rodada anterior não aceita
 *    lançamento. A primeira candidata sem evento nas duas turmas do processo é a do caso — e a suíte roda duas vezes
 *    seguidas (regra 9.1). As candidatas não cruzam com as do Bloco 11.
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
const topico = (n: string) => `Aula B15 ${n} ${MARCA}`;

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

test("itens 5, 7 e 8 · editar antes de publicar sem ALT; as abas de versão; a PRÉVIA atrás do conteúdo", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await abrirOsDsaDaTurma(page, SEMANA_PUBLICADA);
  const dia = segundaDe(SEMANA_PUBLICADA);

  /* Semana nunca publicada: só a aba Minuta (FR-007.2). */
  await expect(page.locator('[data-slot="abas-de-versao"] [role="tab"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="abas-de-versao"] [role="tab"]')).toContainText("Minuta");

  /* Item 5: lançar → salvar → prévia → editar → salvar → prévia → publicar = Original, sem ALT. */
  await lancarAula(page, 1, dia, topico("previa"));
  await salvarASemana(page);
  await page.locator('[data-slot="imprimir-dsa"]').click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/print/dsa");
  const marca = page.locator('[data-slot="dsa-previa"]');
  await expect(marca).toHaveText("PRÉVIA");

  /* Item 8: a marca atrás do conteúdo, transparente, e nada do texto fica sob ela. */
  const estilo = await marca.evaluate((m) => {
    const s = getComputedStyle(m);
    return { z: s.zIndex, opacidade: Number(s.opacity) };
  });
  expect(Number(estilo.z)).toBeLessThan(0);
  expect(estilo.opacidade).toBeLessThanOrEqual(0.2);
  const noCentro = await marca.evaluate((m) => {
    const r = m.getBoundingClientRect();
    const topo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return topo === m || m.contains(topo);
  });
  expect(noCentro, "a marca PRÉVIA está por cima do conteúdo").toBe(false);
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
  await expect(page.locator('[data-slot="dsa-alt"]')).toHaveText("ALT —");
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
  const abas = page.locator('[data-slot="abas-de-versao"] [role="tab"]');
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

    /* As setas dentro dela: → e o ícone trocam o papel. */
    const titulo = tela.getByRole("heading");
    const primeiro = await titulo.innerText();
    await page.keyboard.press("ArrowRight");
    await expect(titulo).not.toHaveText(primeiro);
    await tela.locator('[data-slot="tela-cheia-anterior"]').click();
    await expect(titulo).toHaveText(primeiro);
    await page.keyboard.press("Escape");
    await expect(tela).toHaveCount(0);

    /* Enter no papel abre; o ícone «Sair da tela cheia» fecha. */
    await carrossel
      .locator('[data-slot="item-do-carrossel"][data-atual="true"] [data-slot="abrir-tela-cheia"]')
      .focus();
    await page.keyboard.press("Enter");
    await expect(tela).toBeVisible();
    expect(await dicaDe(page, '[data-slot="sair-da-tela-cheia"]')).toBe("Sair da tela cheia");
    await tela.locator('[data-slot="sair-da-tela-cheia"]').click();
    await expect(tela).toHaveCount(0);
  }
});

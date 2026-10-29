/**
 * Spec 027 (Bloco 12, D-COR-7) — o *Excluir* do Calendário, por clique: exclusão LÓGICA, sem bloqueio, depois do alerta
 * com o impacto, só do Admin.
 *
 *   1. SC-001 · um feriado FUTURO de uma turma (dado realista: FR, dia inteiro, turma escolhida) → *Excluir* → o alerta
 *      cita a turma e diz que a data não passou → *Excluir mesmo assim* → a linha some da lista (que mostra as
 *      desativadas: a desativada de controle continua lá) → a ficha mostra UM dia útil a mais → o DSA perde a marca do
 *      feriado. Conferido no banco: inativa, com quem e quando.
 *   2. SC-002 · um feriado numa semana com o DSA PUBLICADO → o alerta cita a turma e a semana (original) → excluído →
 *      o DSA avisa *"alterado desde a publicação"*, e o retrato publicado fica igual byte a byte.
 *   3. SC-003 · o Encarregado vê a aba e o *Desativar*, e não o *Excluir*; o Operador não vê a aba. A chamada direta à
 *      ação é provada no banco, com sessão real, em `tests/invariantes/rls/exclusao-no-calendario.test.ts`.
 *
 * ⚠️ `goto` só no login. ⚠️ **O FERIADO FUTURO É DE TURMA ESCOLHIDA**, e a turma é a do panorama (datas relativas a
 *    hoje): um feriado de todas as turmas bloquearia o dia dos outros processos, e uma data fixa venceria com o ano.
 * ⚠️ **A SEMANA PUBLICADA É A 24 DE 2026 (08 a 12/06)**, que nenhuma outra suíte usa: a trilha do DSA é só de acréscimo
 *    (inclusive para a `service_role`), e a turma da semente fica com essa semana publicada até o próximo reset.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  apagarConta,
  chaveLocal,
  contasDoAuth,
  criarConta,
  emailDeTeste,
  entrar,
} from "./conta-de-teste";
import { limparDsa, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherAno } from "./paineis";
import { limparPanorama, semearPanorama, type PanoramaSemeado } from "./panorama-de-teste";
import { irParaASemanaDoDia } from "./percurso-do-dsa";
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

test.describe.configure({ mode: "serial" });

const ANO_PUBLICADO = 2026;
const SEMANA_PUBLICADA = 24;
const QUARTA_PUBLICADA = "2026-06-10";

let ADMIN = "";
let ENCARREGADO = "";
let OPERADOR = "";
let S: DsaSemeado;
let P: PanoramaSemeado;
let MARCA = "";
const nomeFuturo = () => `Feriado B12 futuro ${MARCA}`;
const nomeDesativado = () => `Licença B12 desativada ${MARCA}`;
const nomePublicado = () => `Feriado B12 publicado ${MARCA}`;
const nomeDoEncarregado = () => `Aviso B12 do encarregado ${MARCA}`;

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

/** O 5º dia útil contado de hoje: sempre depois de hoje e antes do término folgado (30 dias úteis) da turma. */
function diaUtilFuturo(): string {
  const dia = new Date(`${hojeNaCiaara()}T12:00:00`);
  let contados = 0;
  while (contados < 5) {
    dia.setDate(dia.getDate() + 1);
    if (dia.getDay() !== 0 && dia.getDay() !== 6) contados += 1;
  }
  return `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
}
const DATA_FUTURA = diaUtilFuturo();

async function limparCalendario(): Promise<void> {
  const { data } = await banco()
    .from("feriados")
    .select("id")
    .like("descricao", `% B12 % ${MARCA}`);
  const ids = (data ?? []).map((f) => f.id as string);
  if (ids.length > 0) {
    await banco().from("feriado_turma").delete().in("feriado_id", ids);
    await banco().from("feriados").delete().in("id", ids);
  }
}

async function idDaTurma(codigo: string): Promise<string> {
  const { data } = await banco().from("turmas").select("id").eq("codigo", codigo).single();
  return (data as { id: string }).id;
}

async function tipo(sigla: string): Promise<string> {
  const { data } = await banco()
    .from("config_listas")
    .select("id")
    .eq("lista", "tipos_parada")
    .eq("valor", sigla)
    .single();
  return (data as { id: string }).id;
}

/** Uma linha do calendário, semeada como a tela grava: com o tipo na coluna e, se houver, a turma escolhida. */
async function semearLinha(linha: {
  data: string;
  descricao: string;
  sigla: string;
  impacto: "dia_inteiro" | "informativo";
  status?: "ativo" | "inativo";
  turma?: string;
}): Promise<{ id: string; codigo: string }> {
  const { data, error } = await banco()
    .from("feriados")
    .insert({
      ano: Number(linha.data.slice(0, 4)),
      data: linha.data,
      descricao: linha.descricao,
      impacto: linha.impacto,
      tipo_parada_id: await tipo(linha.sigla),
      status: linha.status ?? "ativo",
    })
    .select("id, codigo")
    .single();
  if (error) throw new Error(error.message);
  const criada = data as { id: string; codigo: string };
  if (linha.turma) {
    const { error: erroTurma } = await banco()
      .from("feriado_turma")
      .insert({ feriado_id: criada.id, turma_id: await idDaTurma(linha.turma) });
    if (erroTurma) throw new Error(erroTurma.message);
  }
  return criada;
}

async function naLinhaDoBanco(id: string) {
  const { data } = await banco()
    .from("feriados")
    .select("status, excluido_em, excluido_por")
    .eq("id", id)
    .single();
  return data as { status: string; excluido_em: string | null; excluido_por: string | null };
}

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  MARCA = `p${p}`;
  ADMIN = emailDeTeste("excluir-cal", p);
  ENCARREGADO = emailDeTeste("excluir-cal-enc", p);
  OPERADOR = emailDeTeste("excluir-cal-op", p);
  await criarConta(ADMIN, `USR-B12-${p}`);
  await criarConta(ENCARREGADO, `USR-B12E-${p}`, "encarregado_administracao_academica", "geral");
  await criarConta(OPERADOR, `USR-B12O-${p}`, "operador", "geral");
  S = await semearDsa(p, ADMIN);
  P = await semearPanorama(p);
  await limparCalendario();
});

test.afterAll(async () => {
  await limparCalendario();
  await limparPanorama(P);
  await limparDsa(S);
  await apagarConta(ADMIN);
  await apagarConta(ENCARREGADO);
  await apagarConta(OPERADOR);
});

async function abrirOCalendario(page: Page, email: string, ano: number): Promise<void> {
  await entrar(page, email, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/atividades");
  await page.locator('[data-aba="calendario"]').click();
  await expect(page.locator('[data-slot="calendario"]')).toBeVisible();
  await escolherAno(page, ano);
}

async function diasUteisNaFicha(page: Page): Promise<number> {
  const texto = await page.locator('[data-andamento="capacidade"]').innerText();
  const casamento = /(\d+) dias úteis/.exec(texto);
  expect(casamento, `a capacidade não diz os dias úteis: «${texto}»`).not.toBeNull();
  return Number(casamento?.[1]);
}

async function abrirOAlerta(page: Page, codigo: string) {
  await page.locator(`[data-linha="${codigo}"] [data-slot="excluir-linha"]`).click();
  const dialogo = page.locator('[data-slot="dialogo-de-exclusao"]');
  await expect(dialogo).toHaveAttribute("data-leitura", "pronto", { timeout: 15_000 });
  return dialogo;
}

test("SC-001 · o feriado futuro: alerta → excluído → sai da lista, o dia volta a ser útil e o DSA o perde", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const semana = semanaIsoDe(DATA_FUTURA);
  expect(semana).not.toBeNull();
  const futuro = await semearLinha({
    data: DATA_FUTURA,
    descricao: nomeFuturo(),
    sigla: "FR",
    impacto: "dia_inteiro",
    turma: P.turmaEmExcesso,
  });
  const desativada = await semearLinha({
    data: DATA_FUTURA,
    descricao: nomeDesativado(),
    sigla: "LA",
    impacto: "dia_inteiro",
    status: "inativo",
    turma: P.turmaEmExcesso,
  });

  /* ANTES: a ficha e o DSA da turma. */
  await irAFichaDaTurma(page, ADMIN, P.turmaEmExcesso);
  const diasAntes = await diasUteisNaFicha(page);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, DATA_FUTURA, semana!.numero, semana!.ano);
  await expect(page.locator("[data-feriado]", { hasText: nomeFuturo() })).toBeVisible();

  /* O alerta e a exclusão, pela aba Calendário. */
  await abrirOCalendario(page, ADMIN, Number(DATA_FUTURA.slice(0, 4)));
  await expect(page.locator(`[data-linha="${desativada.codigo}"]`)).toHaveAttribute(
    "data-situacao",
    "inativo",
  );
  const dialogo = await abrirOAlerta(page, futuro.codigo);
  await expect(dialogo.locator('[data-slot="impacto-data"]')).toHaveAttribute("data-passou", "nao");
  await expect(dialogo.locator('[data-slot="impacto-turmas"]')).toContainText(P.turmaEmExcesso);
  await expect(dialogo).toContainText("volta a ser útil");
  await dialogo.getByRole("button", { name: "Excluir mesmo assim" }).click();
  await expect(page.locator('[data-slot="resposta-do-calendario"]')).toHaveText(
    "Linha excluída do calendário. Ela fica na auditoria.",
  );

  /* Some da lista — que mostra as desativadas: a de controle continua. */
  await expect(page.locator(`[data-linha="${futuro.codigo}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-linha="${desativada.codigo}"]`)).toBeVisible();

  /* No banco: inativa e excluída, com quem e quando — não apagada. */
  const [conta] = await contasDoAuth(ADMIN);
  await expect.poll(async () => (await naLinhaDoBanco(futuro.id)).excluido_por).toBe(conta?.id);
  const linha = await naLinhaDoBanco(futuro.id);
  expect(linha.status).toBe("inativo");
  expect(linha.excluido_em).not.toBeNull();

  /* DEPOIS: um dia útil a mais na ficha, e o DSA sem a marca. */
  await irAFichaDaTurma(page, ADMIN, P.turmaEmExcesso);
  await expect.poll(() => diasUteisNaFicha(page)).toBe(diasAntes + 1);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, DATA_FUTURA, semana!.numero, semana!.ano);
  /* Bloco 15 (D-19): o *Parar dia* mora na barra do DSA; as paradas da semana só aparecem quando há alguma. */
  await expect(page.locator('[data-slot="parar-dia"]')).toBeVisible();
  await expect(page.locator("[data-feriado]", { hasText: nomeFuturo() })).toHaveCount(0);
});

test("SC-002 · a semana publicada: o alerta cita turma e semana; excluído, o DSA avisa e o publicado fica igual", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const publicado = await semearLinha({
    data: QUARTA_PUBLICADA,
    descricao: nomePublicado(),
    sigla: "FR",
    impacto: "dia_inteiro",
    turma: S.turmaComRelogio,
  });
  const turmaId = await idDaTurma(S.turmaComRelogio);

  /* Publicar a semana com o feriado nela, pelo DSA. */
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, QUARTA_PUBLICADA, SEMANA_PUBLICADA, ANO_PUBLICADO);
  await expect(page.locator("[data-feriado]", { hasText: nomePublicado() })).toBeVisible();
  const situacao = page.locator('[data-slot="publicacao-do-dsa"]');
  await expect(situacao).toHaveAttribute("data-situacao", "registrado");
  await page.locator('[data-slot="publicar-semana"]').click();
  await page
    .locator('[data-slot="dialogo-confirmacao"]')
    .getByRole("button", { name: "Publicar" })
    .click();
  await expect(situacao).toHaveAttribute("data-situacao", "publicado");
  await expect(page.locator('[data-slot="alterado-desde-a-publicacao"]')).toHaveCount(0);

  const lerPublicacoes = async () =>
    (
      await banco()
        .from("dsa_eventos_da_semana")
        .select("numero, retrato")
        .eq("turma_id", turmaId)
        .eq("ano", ANO_PUBLICADO)
        .eq("semana", SEMANA_PUBLICADA)
        .in("tipo", ["publicado", "alteracao_publicada"])
        .order("numero")
    ).data;
  const antes = await lerPublicacoes();
  expect(antes).toHaveLength(1);

  /* O alerta cita a turma e a semana; exclui. */
  await abrirOCalendario(page, ADMIN, ANO_PUBLICADO);
  const dialogo = await abrirOAlerta(page, publicado.codigo);
  await expect(dialogo.locator('[data-slot="impacto-data"]')).toHaveAttribute("data-passou", "sim");
  const publicadas = dialogo.locator('[data-slot="impacto-publicadas"]');
  await expect(publicadas).toContainText(S.turmaComRelogio);
  await expect(publicadas).toContainText("08/06/2026 a 12/06/2026");
  await expect(publicadas).toContainText("original");
  await expect(publicadas).toContainText("alterado desde a publicação");
  await dialogo.getByRole("button", { name: "Excluir mesmo assim" }).click();
  await expect(page.locator('[data-slot="resposta-do-calendario"]')).toContainText(
    "Linha excluída do calendário",
  );
  await expect(page.locator(`[data-linha="${publicado.codigo}"]`)).toHaveCount(0);
  await expect.poll(async () => (await naLinhaDoBanco(publicado.id)).excluido_em).not.toBeNull();

  /* O DSA avisa; a versão publicada não mudou e nada foi republicado. */
  await irAFichaDaTurma(page, ADMIN, S.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, QUARTA_PUBLICADA, SEMANA_PUBLICADA, ANO_PUBLICADO);
  await expect(page.locator('[data-slot="alterado-desde-a-publicacao"]')).toBeVisible();
  await expect(page.locator("[data-feriado]", { hasText: nomePublicado() })).toHaveCount(0);
  expect(await lerPublicacoes(), "a versão publicada fica igual, e não houve republicação").toEqual(
    antes,
  );
});

test("SC-003 · o Encarregado desativa e não vê o Excluir; o Operador não vê a aba", async ({
  page,
}) => {
  test.setTimeout(180_000);
  const linha = await semearLinha({
    data: DATA_FUTURA,
    descricao: nomeDoEncarregado(),
    sigla: "PF",
    impacto: "informativo",
  });

  await abrirOCalendario(page, ENCARREGADO, Number(DATA_FUTURA.slice(0, 4)));
  const naLista = page.locator(`[data-linha="${linha.codigo}"]`);
  await expect(naLista.locator('[data-slot="desativar-linha"]')).toBeVisible();
  await expect(naLista.locator('[data-slot="excluir-linha"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="excluir-linha"]')).toHaveCount(0);

  await page.context().clearCookies();
  await entrar(page, OPERADOR, "/inicio");
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Atividades", exact: true })
    .click();
  await expect(page.locator('[data-slot="lista-de-atividades"]')).toBeVisible();
  await expect(page.locator('[data-aba="calendario"]')).toHaveCount(0);
  await expect(page.locator('[data-slot="excluir-linha"]')).toHaveCount(0);

  /* Controle positivo: o Admin vê o Excluir na mesma linha. */
  await page.context().clearCookies();
  await abrirOCalendario(page, ADMIN, Number(DATA_FUTURA.slice(0, 4)));
  await expect(
    page.locator(`[data-linha="${linha.codigo}"] [data-slot="excluir-linha"]`),
  ).toBeVisible();
  expect((await naLinhaDoBanco(linha.id)).excluido_em).toBeNull();
});

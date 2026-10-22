/**
 * **Arquivar a turma**, por clique — D-COR-5 (spec 017, FR-004, SC-002; T042).
 *
 * > *"Arquivar turma em QUALQUER estado, com aviso quando a turma não estiver concluída (…) A turma arquivada some
 * > das listas (filtro «mostrar arquivadas»), trava DSA, instrutor e edição; o Admin pode desarquivar."* — D-COR-5,
 * > Bernardo Villas Boas, 16/10/2026
 * > *"ARQUIVAR E DESARQUIVAR: Admin, Encarregado da Administração Acadêmica e Ajudante — e SÓ eles (o Operador deixa
 * > de arquivar). (…) LISTA /turmas: botão «Arquivar» em cada linha (para quem pode), sem abrir a ficha, com o mesmo
 * > aviso de «não concluída» e a mesma ação do servidor; na visão «Mostrar arquivadas», o botão «Desarquivar»."* —
 * > conferência do PR #73, Bernardo Villas Boas, 19/10/2026
 *
 * ⚠️ **A TURMA É ATIVA, e é o caso que discrimina o aviso**: arquivar a *Concluída* não avisa; a ativa avisa.
 * ⚠️ **A PROVA É A TELA E O BANCO** (PEND-016-2): a confirmação de `?gravada=` e o evento em `turma_arquivamentos`
 *    (por `vw_turmas_arquivadas`), e a situação **igual** no banco — arquivar não é situação.
 * ⚠️ **IDEMPOTENTE SEM DESARQUIVAR NA LIMPEZA**: a semente apaga e refaz a turma a cada execução (`id` novo), e os
 *    eventos de arquivamento — imutáveis — ficam presos ao `id` antigo. O caso termina desarquivando pela tela do
 *    Admin de qualquer forma, porque é parte do que ele prova.
 */
import { expect, test, type Page } from "@playwright/test";

import { semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import {
  bancoDoBloco2,
  limparBloco2,
  maisDias,
  semearBloco2,
  type Bloco2Semeado,
} from "./bloco-2-de-teste";
import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirLinha } from "./linha-expansivel";
import {
  abrirFiltros,
  clicarNaTurmaDaLista,
  escolherNoFiltro,
  FILTRO,
  seloDaSituacao,
} from "./navegar-turmas";

const NOME = "Disciplina da turma arquivada";
const SECAO = '[data-slot="disciplinas-da-turma"]';
const MENU = (page: Page) => page.getByRole("navigation", { name: "Navegação principal" });

let SEMEADO: Bloco2Semeado;
let SIGLA = "";
let INSTRUTOR = "";
let EMAIL_ENC = "";
let EMAIL_AJU = "";
let EMAIL_OPE = "";

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  const hoje = hojeNaCiaara();
  SIGLA = `CUR-B2AR${p}`;
  INSTRUTOR = `B2AR-INS-${p}`;
  SEMEADO = await semearBloco2({
    sigla: SIGLA,
    nome: `Curso da turma arquivada ${p}`,
    disciplinas: [{ cod: "I", nome: NOME, ch: 40 }],
    turmas: [
      {
        chave: "T",
        semRotulo: true,
        ano: 2026,
        status: "ativa",
        inicio: "2026-03-02",
        termino: maisDias(hoje, 60),
      },
    ],
    aulas: [
      {
        sufixo: "A1",
        turma: "T",
        cod: "I",
        data: semanaDoPainel(hoje).de,
        tempos: 2,
        taInicial: 1,
      },
    ],
    instrutorCodigo: INSTRUTOR,
  });
  EMAIL_ENC = emailDeTeste("arquivar-enc", p);
  EMAIL_AJU = emailDeTeste("arquivar-aju", p);
  EMAIL_OPE = emailDeTeste("arquivar-ope", p);
  await criarConta(EMAIL_ENC, `USR-ARE-${p}`, "encarregado_administracao_academica");
  await criarConta(EMAIL_AJU, `USR-ARJ-${p}`, "ajudante_administracao_academica");
  await criarConta(EMAIL_OPE, `USR-ARO-${p}`, "operador");
});

test.afterAll(async () => {
  await apagarConta(EMAIL_ENC);
  await apagarConta(EMAIL_AJU);
  await apagarConta(EMAIL_OPE);
  await limparBloco2(SIGLA, INSTRUTOR);
});

const turma = () => SEMEADO.turmas.T as { id: string; codigo: string };

async function arquivadaNoBanco(): Promise<boolean> {
  const { data, error } = await bancoDoBloco2()
    .from("vw_turmas_arquivadas")
    .select("turma_id")
    .eq("turma_id", turma().id);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function situacaoNoBanco(): Promise<string> {
  const { data } = await bancoDoBloco2()
    .from("turmas")
    .select("status")
    .eq("id", turma().id)
    .single();
  return (data as { status: string }).status;
}

/**
 * A lista `/turmas` pelo menu, buscando o código.
 *
 * ⚠️ **SEM `entrar` DE NOVO**: os auxiliares de `navegar-turmas.ts` entram a cada chamada, e entrar com a sessão
 *    aberta não é o percurso de ninguém. Aqui a sessão é uma por pessoa, e o caminho é sempre o menu.
 */
async function buscarNaLista(page: Page, codigo: string): Promise<void> {
  await MENU(page).getByRole("link", { name: "Turmas", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
  await abrirFiltros(page);
  await page.locator(FILTRO).getByLabel("Buscar pelo código").fill(codigo);
  await expect.poll(() => new URL(page.url()).searchParams.get("busca")).toBe(codigo);
}

test.describe("D-COR-5 · arquivar, sumir das listas, travar e desarquivar", () => {
  test("Encarregado arquiva a turma ATIVA (com aviso); ela trava e some; o Ajudante desarquiva", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const { codigo } = turma();

    /* ── antes: a turma está no /inicio e o DSA oferece lançar (controle positivo) ───────────── */
    await entrar(page, EMAIL_ENC, "/inicio");
    await expect(page.locator(`[data-turma="${codigo}"]`)).toBeVisible();
    await buscarNaLista(page, codigo);
    await clicarNaTurmaDaLista(page, codigo);
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.locator('[data-slot="lancar-estudo-individual"]')).toBeVisible();
    await page.goBack();
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
    await expect(page.locator('[data-slot="trocar-situacao"]')).toBeVisible();

    /* ── arquivar: o aviso de não concluída, a observação, a confirmação ─────────────────────── */
    await page.locator('[data-slot="arquivar-turma"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-arquivar"]');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('[data-slot="aviso-nao-concluida"]')).toContainText(
      "não está concluída",
    );
    await dialogo
      .locator('[data-slot="observacao-do-arquivamento"]')
      .fill(`Encerrada — prova ${codigo}`);
    await dialogo.locator('[data-slot="confirmar-arquivar"]').click();
    await expect(page.locator('[data-slot="turma-arquivada-gravada"]')).toBeVisible({
      timeout: 15_000,
    });

    expect(await arquivadaNoBanco(), "o evento não chegou ao banco").toBe(true);
    expect(await situacaoNoBanco(), "arquivar mudou a situação").toBe("ativa");
    await expect(seloDaSituacao(page)).toContainText("Ativa");

    /* ── a ficha é somente leitura ───────────────────────────────────────────────────────────── */
    const aviso = page.locator('[data-slot="turma-arquivada"]');
    await expect(aviso).toContainText("somente leitura");
    await expect(aviso).toContainText(`Encerrada — prova ${codigo}`);
    await expect(page.locator('[data-slot="trocar-situacao"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="abrir-edicao-da-turma"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="arquivar-turma"]')).toHaveCount(0);
    // ⚠️ O caso que discrimina da decisão de 19/10/2026: o Encarregado DESARQUIVA (antes, só o Admin).
    await expect(page.locator('[data-slot="desarquivar-turma"]')).toBeVisible();
    await abrirLinha(page.locator(SECAO), NOME);
    const detalhe = page.locator('[data-slot="detalhe-da-disciplina-da-turma"]');
    await expect(detalhe).toBeVisible();
    await expect(detalhe.locator('[data-slot="registrar-ta-fora"]')).toHaveCount(0);
    // Spec 022 (Bloco 7): período e instrutores se editam em diálogo — na arquivada, sem o ícone que o abre.
    await expect(detalhe.locator('[data-slot="editar-periodo"]')).toHaveCount(0);
    await expect(detalhe.locator('[data-slot="editar-instrutores"]')).toHaveCount(0);

    /* ── o DSA abre para ler, imprimir e baixar a planilha — sem lançar ──────────────────────── */
    await page.locator('[data-slot="abrir-o-dsa"]').click();
    await expect(page.getByRole("heading", { name: "Detalhe Semanal de Aula" })).toBeVisible();
    await expect(page.locator('[data-slot="turma-arquivada"]')).toBeVisible();
    await expect(page.locator('[data-slot="lancar-estudo-individual"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="controle-de-paradas"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="imprimir-dsa"]')).toBeVisible();
    await expect(page.locator('[data-slot="baixar-planilha-de-contingencia"]')).toBeVisible();

    /* ── some do /inicio e da /turmas; volta com «Mostrar arquivadas», com o selo ────────────── */
    await MENU(page).getByRole("link", { name: "Início", exact: true }).click();
    await expect(page.locator('[data-slot="filtro-do-panorama"]')).toBeVisible();
    await expect(page.locator(`[data-turma="${codigo}"]`)).toHaveCount(0);

    await buscarNaLista(page, codigo);
    await expect(page.getByRole("link", { name: codigo })).toHaveCount(0);
    await escolherNoFiltro(page, "Arquivadas", "Mostrar arquivadas");
    await expect.poll(() => new URL(page.url()).searchParams.get("arquivadas")).toBe("sim");
    const linha = page.locator('[data-slot="lista-de-turmas"] tr').filter({ hasText: codigo });
    await expect(linha.locator('[data-slot="selo-arquivada"]')).toBeVisible();

    /* ── o Ajudante desarquiva pela ficha, alcançada pela lista com o filtro ────────────────── */
    await page.context().clearCookies();
    await entrar(page, EMAIL_AJU, "/inicio");
    await buscarNaLista(page, codigo);
    await escolherNoFiltro(page, "Arquivadas", "Mostrar arquivadas");
    await clicarNaTurmaDaLista(page, codigo);
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
    await page.locator('[data-slot="desarquivar-turma"]').click();
    await page
      .locator('[data-slot="dialogo-de-desarquivar"] [data-slot="confirmar-desarquivar"]')
      .click();
    await expect(page.locator('[data-slot="turma-desarquivada-gravada"]')).toBeVisible({
      timeout: 15_000,
    });
    expect(await arquivadaNoBanco(), "desarquivar não chegou ao banco").toBe(false);
    await expect(page.locator('[data-slot="turma-arquivada"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="trocar-situacao"]')).toBeVisible();

    /* ── o histórico mostra os dois eventos, o mais recente primeiro ────────────────────────── */
    await page.locator('[data-slot="historico-da-situacao"] summary').click();
    const eventos = page.locator('[data-slot="evento-da-situacao"]');
    await expect(eventos.first()).toContainText("Desarquivada");
    await expect(
      eventos.filter({ hasText: "Arquivada" }).filter({ hasNotText: "Desarquivada" }),
    ).toHaveCount(1);

    /* ── e ela volta à lista SEM o filtro ───────────────────────────────────────────────────── */
    await buscarNaLista(page, codigo);
    expect(new URL(page.url()).searchParams.get("arquivadas")).toBeNull();
    await expect(page.getByRole("link", { name: codigo }).first()).toBeVisible();
  });

  test("⚠️ o Operador, que edita a turma, NÃO arquiva: nem na ficha nem na lista", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { codigo } = turma();
    await entrar(page, EMAIL_OPE, "/inicio");
    await buscarNaLista(page, codigo);
    const linha = page.locator('[data-slot="lista-de-turmas"] tr').filter({ hasText: codigo });
    await expect(linha).toBeVisible();
    await expect(linha.locator('[data-slot="arquivar-da-linha"]')).toHaveCount(0);
    await clicarNaTurmaDaLista(page, codigo);
    await expect(page.locator('[data-slot="codigo-da-turma"]')).toHaveText(codigo);
    // O controle positivo de que ele edita a turma: a troca de situação aparece.
    await expect(page.locator('[data-slot="trocar-situacao"]')).toBeVisible();
    await expect(page.locator('[data-slot="arquivar-turma"]')).toHaveCount(0);
  });

  test("na LISTA, sem abrir a ficha: o Encarregado arquiva pela linha (com o aviso) e desarquiva na visão das arquivadas", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const { codigo } = turma();
    await entrar(page, EMAIL_ENC, "/inicio");
    await buscarNaLista(page, codigo);
    const linha = page.locator('[data-slot="lista-de-turmas"] tr').filter({ hasText: codigo });

    /* ── arquivar pela linha: o mesmo diálogo, o mesmo aviso, a mesma ação ───────────────────── */
    await linha.locator('[data-slot="arquivar-da-linha"]').click();
    const dialogo = page.locator('[data-slot="dialogo-de-arquivar"]');
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('[data-slot="aviso-nao-concluida"]')).toContainText(
      "não está concluída",
    );
    await dialogo
      .locator('[data-slot="observacao-do-arquivamento"]')
      .fill(`Pela lista — ${codigo}`);
    await dialogo.locator('[data-slot="confirmar-arquivar"]').click();
    await expect(dialogo).toHaveCount(0, { timeout: 15_000 });
    await expect(linha).toHaveCount(0, { timeout: 15_000 });
    // Continua na lista: a ação da linha não abre a ficha.
    expect(new URL(page.url()).pathname).toBe("/turmas");
    expect(await arquivadaNoBanco(), "o evento da lista não chegou ao banco").toBe(true);
    expect(await situacaoNoBanco(), "arquivar mudou a situação").toBe("ativa");

    /* ── «Mostrar arquivadas»: a linha volta com o selo e o botão Desarquivar ───────────────── */
    await escolherNoFiltro(page, "Arquivadas", "Mostrar arquivadas");
    await expect.poll(() => new URL(page.url()).searchParams.get("arquivadas")).toBe("sim");
    await expect(linha.locator('[data-slot="selo-arquivada"]')).toBeVisible();
    await expect(linha.locator('[data-slot="arquivar-da-linha"]')).toHaveCount(0);
    await linha.locator('[data-slot="desarquivar-da-linha"]').click();
    await page
      .locator('[data-slot="dialogo-de-desarquivar"] [data-slot="confirmar-desarquivar"]')
      .click();
    await expect(linha.locator('[data-slot="selo-arquivada"]')).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(linha.locator('[data-slot="arquivar-da-linha"]')).toBeVisible();
    expect(await arquivadaNoBanco(), "o desarquivar da lista não chegou ao banco").toBe(false);
  });
});

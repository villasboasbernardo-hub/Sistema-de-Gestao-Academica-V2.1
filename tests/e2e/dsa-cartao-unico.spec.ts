/**
 * O cartão único do lançamento (ajustes 1 e 2 do PR #40) e o empurrão em cascata (`D-DSA-3`) —
 * conferência de Bernardo Villas Boas, 08/10/2026. E o TFM SEM TETO (`FR-001` da spec 029): a
 * `RN-DIST-03` (a) foi emendada em 27/10/2026, e o lançar, o editar e o *Salvar minuta* deixam de
 * recusar o TFM acima de 6 TA na semana — o caso que afirmava a recusa ao editar foi INVERTIDO.
 *
 * Tudo por clique: ficha da turma → Abrir o DSA → o dia no calendário → a semana de referência.
 * A prova é sempre o BANCO, lido pelo cliente de serviço.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEGUNDA, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";
import { escolherDisciplinaEUnidade, irParaASemanaDoDia, salvarASemana } from "./percurso-do-dsa";

let EMAIL = "";
let SEMEADO: DsaSemeado;

const GRADE = '[data-slot="grade-da-semana"][data-modelo="v4"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';
const CARTAO = '[data-slot="acoes-do-bloco"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("dsacartao", info.workerIndex);
  await criarConta(EMAIL, `USR-DSAC-${info.workerIndex}`);
  SEMEADO = await semearDsa(info.workerIndex, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/**
 * As semanas dos casos do TFM sem teto — 2026-W16 e 2026-W20, VAZIAS na semente e sem feriado semeado.
 *
 * ⚠️ **NÃO A SEMANA DE REFERÊNCIA (W15), e não por gosto:** nela a quarta é feriado de DIA INTEIRO (o lançar
 *    recusa pelo calendário ANTES do teto, e o caso reprovaria pelo motivo errado), a quinta tem a AVNOVA nos TA
 *    1-2 e a aula herdada no 8º, a segunda tem o bloco A1, e a terça e a sexta são dos outros casos deste arquivo
 *    — que dividem a MESMA turma quando caem no mesmo processo. Sete TA seguidos sem colidir com nada não cabem.
 * ⚠️ **UMA SEMANA PARA CADA CASO:** na mesma semana, o TFM de um contaria no do outro, e na `main` o segundo a
 *    rodar reprovaria no lançar, antes da asserção que ele existe para fazer.
 * ⚠️ **AS DUAS ESTÃO VAZIAS TAMBÉM NO CALENDÁRIO REAL**, medido em 28/10/2026 na cópia do remoto que estava no
 *    banco local: nenhum feriado ativo, nenhuma parada e nenhuma atividade de todas as turmas de 13/04 a 18/04 nem
 *    de 11/05 a 16/05. ⚠️ A W19 NÃO serve: a cópia tem 04/05/2026 como dia inteiro (*"Licença pagamento"*), e a W17
 *    tem 20 e 21/04.
 */
const SEMANA_DO_EDITAR = { semana: 16, segunda: "2026-04-13" } as const;
const SEMANA_DOS_DOIS_DIAS = { semana: 20, segunda: "2026-05-11", quarta: "2026-05-13" } as const;

async function abrirASemana(page: Page, dia = SEGUNDA, semana = SEMANA): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await irParaASemanaDoDia(page, dia, semana, ANO);
  await expect(page.locator(GRADE)).toBeVisible();
}

const sufixo = (): string =>
  SEMEADO.turmaComRelogio
    .replace(/^CUR-/, "")
    .replace(/ 2026$/, "")
    .replace(/-REL$/, "");

async function aulaPorTopico(topico: string) {
  const { data } = await banco()
    .from("registros_aula")
    .select("id, local, conteudo_resumo, ta_inicial, tempos_consumidos, editado_em, salvo")
    .eq("conteudo_resumo", topico)
    .eq("status", "ativo")
    .maybeSingle();
  return data as {
    id: string;
    local: string | null;
    conteudo_resumo: string | null;
    ta_inicial: number;
    tempos_consumidos: number;
    salvo: boolean;
  } | null;
}

/** A unidade de ensino do TFM da semente — é por ela que o banco diz que a aula é de TFM. */
async function unidadeDoTfm(): Promise<string> {
  const { data, error } = await banco()
    .from("unidades_ensino")
    .select("id")
    .eq("codigo", `DSA-${sufixo()}-UE-${SEMEADO.codDisciplinaTfm}`)
    .maybeSingle();
  if (error || !data)
    throw new Error(`a unidade do TFM não foi achada: ${error?.message ?? "vazio"}`);
  return (data as { id: string }).id;
}

/** Espera o desfecho de uma gravação no formulário ou no cartão; reprova só a recusa. */
async function desfecho(page: Page, onde: string, recusa: string, avisos: string): Promise<string> {
  const ler = async (): Promise<string> => {
    if ((await page.locator(`[data-slot="${recusa}"]`).count()) > 0) {
      return `recusou: ${await page.locator(`[data-slot="${recusa}"]`).innerText()}`;
    }
    if ((await page.locator(onde).count()) === 0) return "fechou";
    if ((await page.locator(`[data-slot="${avisos}"]`).count()) > 0) return "avisou";
    return "em curso";
  };
  await expect.poll(ler, { timeout: 60_000 }).not.toBe("em curso");
  return ler();
}

/**
 * Lança uma aula de 1 TA (ou `tempos`) na célula, com o tópico dado, e devolve o texto dos avisos que
 * acompanharam a gravação (vazio quando não houve).
 */
async function lancarAula(
  page: Page,
  celula: string,
  topico: string,
  opcoes: { tempos?: number; cod?: string; local?: string } = {},
): Promise<string> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
  await escolherDisciplinaEUnidade(page, opcoes.cod ?? SEMEADO.codDisciplina);
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  await page
    .locator('[data-slot="popover-content"]')
    .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
    .first()
    .click();
  await page.locator("#dsa-conteudo").fill(topico);
  await page.locator("#dsa-tempos").fill(String(opcoes.tempos ?? 1));
  if (opcoes.local !== undefined) await page.locator("#dsa-local").fill(opcoes.local);
  await page.locator('[data-slot="gravar-lancamento"]').click();
  const r = await desfecho(page, FORMULARIO, "recusa-do-lancamento", "avisos-do-lancamento");
  expect(r, "o lançamento foi recusado").not.toMatch(/^recusou/);
  const avisos =
    r === "avisou" ? await page.locator('[data-slot="avisos-do-lancamento"]').innerText() : "";
  if ((await page.locator(FORMULARIO).count()) > 0) {
    await page.locator(FORMULARIO).locator('[data-slot="fechar-formulario"]').click();
  }
  await expect.poll(async () => (await aulaPorTopico(topico)) !== null).toBe(true);
  return avisos;
}

/** Abre o cartão do lançamento pelo tópico — clicando no cartão da grade. */
async function abrirCartao(page: Page, topico: string): Promise<void> {
  await page.locator(`${GRADE} td`).filter({ hasText: topico }).first().click();
  await expect(page.locator(CARTAO)).toBeInViewport();
}

test.describe("⚠️ ajuste 2 · o cartão reabre com o valor GRAVADO, nunca com o do cadastro", () => {
  /*
   * O caso real de Bernardo: local editado para «EAD» reabria como a sala da turma e era regravado.
   * ⚠️ A aula é a `A1` da semente (segunda, 3º tempo), que tem a sala da turma como local.
   */
  test("gravar local EAD, reabrir, ver EAD, gravar outro campo — e o banco continua EAD", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const codigo = `DSA-${sufixo()}-A1`;
    await abrirASemana(page);

    await page.locator(`${GRADE} td[data-celula="2:0"]`).click();
    await expect(page.locator(CARTAO)).toBeInViewport();
    await page.locator("#dsa-editar-local").fill("EAD");
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );
    if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");

    /* Reabrir: o campo traz o GRAVADO. */
    await page.reload();
    await expect(page.locator(GRADE)).toBeVisible();
    await page.locator(`${GRADE} td[data-celula="2:0"]`).click();
    await expect(page.locator(CARTAO)).toBeInViewport();
    await expect(page.locator("#dsa-editar-local")).toHaveValue("EAD");

    /* Gravar OUTRO campo — e o local não pode voltar à sala. */
    const novoTopico = `Tópico depois do EAD ${Date.now().toString(36)}`;
    await page.locator("#dsa-editar-conteudo").fill(novoTopico);
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );
    if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");
    // Spec 024 (RP-0): as duas edições são rascunho até o «Salvar a semana»; o banco confere o SALVO.
    await salvarASemana(page);

    await expect
      .poll(async () => {
        const { data } = await banco()
          .from("registros_aula")
          .select("local, conteudo_resumo")
          .eq("codigo", codigo)
          .maybeSingle();
        const l = data as { local: string | null; conteudo_resumo: string | null } | null;
        return `${l?.local}|${l?.conteudo_resumo}`;
      })
      .toBe(`EAD|${novoTopico}`);
  });
});

test.describe("⚠️ `D-DSA-3` · o bloco que cresce EMPURRA os seguintes, numa transação só", () => {
  test("o exemplo da decisão: A de 1 para 2 TA leva B do 2º para o 3º tempo, com aviso", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const marca = Date.now().toString(36);
    const topicoA = `Aula A ${marca}`;
    const topicoB = `Aula B ${marca}`;
    await abrirASemana(page);

    /* Sexta (coluna 4), vazia na semente: A no 1º tempo, B no 2º. */
    await lancarAula(page, "0:4", topicoA);
    await lancarAula(page, "1:4", topicoB);
    const bAntes = await aulaPorTopico(topicoB);
    expect(bAntes?.ta_inicial).toBe(2);

    await abrirCartao(page, topicoA);
    await page.locator("#dsa-editar-tempos").fill("2");
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).toBe("avisou");
    await expect(page.locator('[data-slot="avisos-da-acao"]')).toContainText("empurrado");
    await expect(page.locator('[data-slot="avisos-da-acao"]')).toContainText("para o 3º tempo");

    const a = await aulaPorTopico(topicoA);
    const b = await aulaPorTopico(topicoB);
    expect(`${a?.ta_inicial}/${a?.tempos_consumidos}`).toBe("1/2");
    expect(b?.ta_inicial, "B não foi empurrado").toBe(3);
    /* ⚠️ UPDATE do MESMO registro: o id de B é o mesmo. */
    expect(b?.id).toBe(bAntes?.id);
  });

  test("⚠️ não cabe até o último tempo do dia: RECUSA, e NADA muda — nem o bloco que cresceu", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const marca = Date.now().toString(36);
    const topicoC = `Aula C ${marca}`;
    const topicoD = `Aula D ${marca}`;
    await abrirASemana(page);

    /* Sexta: C no 5º tempo, D no 8º — o último do regime (8) mais o excepcional é o 9º. */
    await lancarAula(page, "4:4", topicoC);
    await lancarAula(page, "7:4", topicoD, { tempos: 2 });

    await abrirCartao(page, topicoC);
    /* C de 5 a 8 empurra D para o 9º e 10º — o 10º passa do 9º. */
    await page.locator("#dsa-editar-tempos").fill("4");
    await page.locator('[data-slot="gravar-edicao"]').click();
    const r = await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao");
    expect(r).toMatch(/^recusou/);
    await expect(page.locator('[data-slot="recusa-da-acao"]')).toContainText("Nada foi gravado");

    expect((await aulaPorTopico(topicoC))?.tempos_consumidos, "C cresceu mesmo recusado").toBe(1);
    expect((await aulaPorTopico(topicoD))?.ta_inicial, "D se mexeu mesmo recusado").toBe(8);
  });
});

test.describe("⚠️ `FR-001` da spec 029 · o TFM SEM TETO — a `RN-DIST-03` (a) emendada em 27/10/2026", () => {
  /*
   * ⚠️ **ESTE CASO AFIRMAVA O CONTRÁRIO até a spec 029** — *"passar de 6 TA de TFM na semana pelo editar é
   *    recusado, e nada grava"* (dúvida 2 da conferência de 08/10/2026). Invertido, ele é o caso que
   *    discrimina (DoD 8): na `main` o editar recusa com *"o teto de TFM é 6"*; depois da emenda, grava.
   * ⚠️ **1º AO 7º TEMPO, numa semana vazia:** dentro do regime de 8, sem o TA excepcional e sem bloco depois
   *    para empurrar — nenhum aviso do DIA entra no caso, e a única recusa possível é a do TFM.
   */
  test("editar «Quantos tempos» de uma aula de TFM de 4 para 7 GRAVA, sem aviso de TFM", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const topico = `TFM editado ${Date.now().toString(36)}`;
    await abrirASemana(page, SEMANA_DO_EDITAR.segunda, SEMANA_DO_EDITAR.semana);

    /* Segunda da W16 (coluna 0), 1º tempo, 4 TA de TFM. */
    const avisosDoLancar = await lancarAula(page, "0:0", topico, {
      tempos: 4,
      cod: SEMEADO.codDisciplinaTfm,
    });
    expect(avisosDoLancar, "o lançamento de TFM saiu com aviso de TFM").not.toMatch(/TFM|teto/i);

    await abrirCartao(page, topico);
    await page.locator("#dsa-editar-tempos").fill("7");
    await page.locator('[data-slot="gravar-edicao"]').click();
    const r = await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao");
    expect(r, "o editar de TFM para 7 TA na semana foi recusado").not.toMatch(/^recusou/);
    if (r === "avisou") {
      await expect(page.locator('[data-slot="avisos-da-acao"]')).not.toContainText(/TFM|teto/i);
    }
    if ((await page.locator(CARTAO).count()) > 0) await page.keyboard.press("Escape");

    /* O BANCO, não o campo digitado: o rascunho cresceu para 7 TA. */
    await expect
      .poll(async () => (await aulaPorTopico(topico))?.tempos_consumidos, {
        message: "o TFM não cresceu para 7 TA no banco",
      })
      .toBe(7);

    /* E o *Salvar minuta* guarda os 7 — o Salvar também não confere teto de TFM. */
    await salvarASemana(page);
    await expect
      .poll(async () => {
        const a = await aulaPorTopico(topico);
        return `${a?.salvo ? "salvo" : "rascunho"}/${a?.tempos_consumidos}`;
      })
      .toBe("salvo/7");
  });

  /*
   * ⚠️ **O CASO DO PEDIDO, e o que reprova HOJE no SEGUNDO lançamento**: a semana chega a 7 TA de TFM e a
   *    Server Action recusa com *"«TFM do percurso» já tem 7 TA nesta semana; o teto de TFM é 6."* — o
   *    `expect` de `lancarAula` acusa a recusa, não um prazo esgotado.
   * ⚠️ **DOIS DIAS, e não 7 TA num dia só:** num dia, 7 TA de um bloco trariam o aviso do regime ou do
   *    excepcional conforme o tempo inicial, que não têm relação com o caso.
   * ⚠️ **A CONFERÊNCIA É PELO TÓPICO, não pela soma da semana:** com `fullyParallel` a turma é do processo, e
   *    outro caso deste arquivo pode ter deixado lançamento na turma.
   */
  test("4 + 3 TA de TFM em DOIS dias da mesma semana: os dois gravam, e o Salvar minuta guarda os 7", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const marca = Date.now().toString(36);
    const topicoDaSegunda = `TFM da segunda ${marca}`;
    const topicoDaQuarta = `TFM da quarta ${marca}`;
    await abrirASemana(page, SEMANA_DOS_DOIS_DIAS.segunda, SEMANA_DOS_DOIS_DIAS.semana);

    /* Segunda (coluna 0) e quarta (coluna 2) da W20, 1º tempo. */
    const avisosDaSegunda = await lancarAula(page, "0:0", topicoDaSegunda, {
      tempos: 4,
      cod: SEMEADO.codDisciplinaTfm,
    });
    const avisosDaQuarta = await lancarAula(page, "0:2", topicoDaQuarta, {
      tempos: 3,
      cod: SEMEADO.codDisciplinaTfm,
    });
    expect(`${avisosDaSegunda}\n${avisosDaQuarta}`, "um aviso falou de TFM").not.toMatch(
      /TFM|teto/i,
    );

    await salvarASemana(page);

    const ueDoTfm = await unidadeDoTfm();
    await expect
      .poll(async () => {
        const { data, error } = await banco()
          .from("registros_aula")
          .select("data, tempos_consumidos, salvo, unidade_ensino_id")
          .in("conteudo_resumo", [topicoDaSegunda, topicoDaQuarta])
          .eq("status", "ativo")
          .order("data");
        if (error) return `erro: ${error.message}`;
        const linhas = (data ?? []) as {
          data: string;
          tempos_consumidos: number;
          salvo: boolean;
          unidade_ensino_id: string | null;
        }[];
        const soma = linhas.reduce((total, l) => total + l.tempos_consumidos, 0);
        return (
          linhas
            .map(
              (l) =>
                `${l.data}:${l.tempos_consumidos}:${l.salvo ? "salvo" : "rascunho"}:${l.unidade_ensino_id === ueDoTfm ? "TFM" : "outra"}`,
            )
            .join(" | ") + ` = ${soma} TA`
        );
      })
      .toBe(
        `${SEMANA_DOS_DOIS_DIAS.segunda}:4:salvo:TFM | ${SEMANA_DOS_DOIS_DIAS.quarta}:3:salvo:TFM = 7 TA`,
      );
  });
});

test.describe("ajuste 1 · o cartão único edita dia, tempo e disciplina de uma vez", () => {
  test("mudar o tempo inicial e a disciplina na mesma gravação", async ({ page }) => {
    test.setTimeout(180_000);
    const topico = `Aula do cartão único ${Date.now().toString(36)}`;
    await abrirASemana(page);
    /* Terça, 8º tempo. */
    await lancarAula(page, "7:1", topico);

    await abrirCartao(page, topico);
    /* Nenhuma aba: os campos estão todos no mesmo cartão, com um botão Gravar. */
    await expect(page.locator("[data-aba]")).toHaveCount(0);
    await expect(page.locator('[data-slot="gravar-edicao"]')).toHaveCount(1);
    await page.locator("#dsa-mover-ta").selectOption("7");
    /* A disciplina sem UE (`D-DSA-1`): a isenta da semente, com o tópico. */
    const campo = page.locator("#dsa-editar-disciplina");
    const opcao = campo
      .locator("option")
      .filter({ hasText: new RegExp(`^${SEMEADO.codDisciplinaIsenta} — `) });
    await campo.selectOption((await opcao.getAttribute("value")) ?? "");
    await expect(page.locator('[data-slot="alerta-sem-unidade"]')).toBeVisible();
    await page.locator('[data-slot="gravar-edicao"]').click();
    expect(await desfecho(page, CARTAO, "recusa-da-acao", "avisos-da-acao")).not.toMatch(
      /^recusou/,
    );

    await expect
      .poll(async () => {
        const { data } = await banco()
          .from("registros_aula")
          .select("ta_inicial, unidade_ensino_id, disciplina_id")
          .eq("conteudo_resumo", topico)
          .maybeSingle();
        const l = data as {
          ta_inicial: number;
          unidade_ensino_id: string | null;
          disciplina_id: string | null;
        } | null;
        return `${l?.ta_inicial}/${l?.unidade_ensino_id === null ? "sem UE" : "com UE"}/${l?.disciplina_id === null ? "sem disciplina" : "com disciplina"}`;
      })
      .toBe("7/sem UE/com disciplina");
  });
});

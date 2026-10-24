/**
 * O **catálogo de disciplinas do curso**, por clique (`FR-001` a `FR-006`, `FR-060` a `FR-063`).
 *
 * ⚠️ **ESTA TELA DEIXOU DE TER RECORTE POR TURMA EM 04/10/2026** (`FR-018` da spec 012), e os casos
 * que o mediam **mudaram de arquivo, não desapareceram**: o critério 4 do período e os cinco do
 * rateio vivem em `turma-disciplinas.spec.ts`, sobre a seção de disciplinas da ficha da turma.
 * Apagá-los teria sido perder dois "casos que discriminam" de regras que já mudaram de veredito.
 *
 * ⚠️ **`goto` SÓ NO PONTO DE PARTIDA, e a regra tem história.** Os percursos da fatia (a) chegavam
 * às telas com `page.goto` — o que prova que a tela **funciona** e não prova que alguém **chega**
 * nela. `/cursos/novo` não tinha link nenhum e a única entrada de `/cursos/[curso]/editar` era um
 * link chamado *"histórico e correção"*: os dois passaram por uma suíte inteira. Aqui o percurso é
 * `goto('/inicio')` **uma vez**, e daí menu → curso → linha → painéis.
 *
 * ⚠️ **A AMOSTRA É IDEMPOTENTE** (regra 9.1): curso não é apagável, então ela o reaproveita. A prova
 * é rodar **duas vezes seguidas**.
 */
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

import { nomeNoCartao, nomeNoGrafico } from "@/lib/dominio/nome-no-dsa";

import { chaveLocal, criarConta, apagarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirPainel } from "./paineis";
import { abrirLinha, conferirQueALinhaAlterna, linhaExpansivel } from "./linha-expansivel";
import {
  contarDisciplina,
  disciplinaComUe,
  disciplinaLimpa,
  disciplinaSemUe,
  limparAmostraDaGrade,
  rastroDaExclusao,
  semearGradeDeDisciplinas,
  siglaDoCurso,
  type AmostraDaGrade,
} from "./disciplinas-de-teste";
import {
  irAsDisciplinasDaEdicao,
  irAsDisciplinasDoCurso,
  justificarSePedir,
} from "./navegar-curso";

let EMAIL = "";
let amostra: AmostraDaGrade;

/*
 * ⚠️ **TUDO NESTA SUÍTE É POR PROCESSO DE TRABALHO.** O `beforeAll` roda uma vez por PROCESSO, e com
 * um selo único os quatro processos semeavam o mesmo curso — e a limpeza de um apagava, no meio da
 * execução, o que os outros usavam. Ver o cabeçalho de `disciplinas-de-teste.ts`.
 */
let PROCESSO = 0;
let SIGLA_DO_CURSO = "";
let DISCIPLINA_COM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_SEM_UE = { cod: "", nome: "", ch: 0 };
let DISCIPLINA_LIMPA = { cod: "", nome: "", ch: 0 };

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  SIGLA_DO_CURSO = siglaDoCurso(PROCESSO);
  DISCIPLINA_COM_UE = disciplinaComUe(PROCESSO);
  DISCIPLINA_SEM_UE = disciplinaSemUe(PROCESSO);
  DISCIPLINA_LIMPA = disciplinaLimpa(PROCESSO);

  EMAIL = emailDeTeste("disciplinas", PROCESSO);
  await criarConta(EMAIL, `USR-DISC-${PROCESSO}`);
  amostra = await semearGradeDeDisciplinas(PROCESSO);
});

test.afterAll(async () => {
  await limparAmostraDaGrade(PROCESSO);
  await apagarConta(EMAIL);
});

/**
 * **O percurso por clique**: entra, vai pelo menu *Cursos* até o curso e abre a aba *Disciplinas*.
 *
 * ⚠️ O único `goto` da suíte está em `entrar`, e é o ponto de partida.
 *
 * ⚠️ **DESDE O BLOCO 3 (spec 018) A GRADE É A ABA DO CURSO**: o menu perdeu *Disciplinas* e a escolha de curso saiu
 *    (o curso vem do endereço da página). Antes o caminho era menu *Disciplinas* → escolher o curso na cascata.
 */
async function irAGradePorClique(page: Page): Promise<void> {
  await irAsDisciplinasDoCurso(page, EMAIL, SIGLA_DO_CURSO);
}

/**
 * **A grade EM EDIÇÃO**, por clique: Cursos → o curso → *Editar curso* → *Disciplinas e avaliações*.
 *
 * ⚠️ DESDE O AJUSTE 1 DA CONFERÊNCIA DO PR #82 (spec 021, 21/10/2026) A PÁGINA DO CURSO É SÓ LEITURA: criar, editar,
 *    acrescentar UE e excluir moram em *Editar curso*, no currículo escolhido (o vigente por padrão).
 */
async function irAGradeEmEdicao(page: Page): Promise<void> {
  await irAsDisciplinasDaEdicao(page, EMAIL, SIGLA_DO_CURSO);
}

/**
 * Abre o detalhe de uma disciplina clicando na célula do nome — **só se estiver fechado**.
 *
 * ⚠️ Desde 17/10/2026 (conferência do PR #67) clicar na linha aberta a FECHA; um auxiliar que clicasse
 * sem olhar o `aria-expanded` fecharia o detalhe em silêncio.
 */
async function abrirDetalhe(page: Page, nome: string): Promise<void> {
  await abrirLinha(page, nome);
  await expect(page.locator('[data-slot="detalhe-da-disciplina"]')).toBeVisible();
}

/**
 * **A página própria da disciplina**, por clique: *Editar curso* → *Disciplinas e avaliações* → a linha → o ícone
 * *Editar disciplina* do detalhe.
 *
 * ⚠️ SPEC 022 (Bloco 7, D-2): o cadastro, a situação, a exclusão, as UEs e as avaliações do currículo saíram do
 *    detalhe da linha e moram na página própria; as UEs e as avaliações se editam em diálogo.
 */
async function abrirPaginaDaDisciplina(page: Page, nome: string): Promise<void> {
  await irAGradeEmEdicao(page);
  await abrirDetalhe(page, nome);
  await page.locator('[data-slot="detalhe-da-disciplina"] [data-slot="editar-disciplina"]').click();
  await expect(page.locator('[data-slot="pagina-da-disciplina"]')).toBeVisible();
}

test.describe("`FR-001` a `FR-006` · chegar, escolher e ver", () => {
  test("o menu leva à grade, e o curso escolhido traz TODAS as disciplinas dele", async ({
    page,
  }) => {
    await irAGradePorClique(page);

    await expect(page.getByRole("gridcell", { name: DISCIPLINA_COM_UE.nome })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();

    /*
     * ⚠️ **A DISCIPLINA LIMPA APARECE AQUI, E É O QUE DISTINGUE AS DUAS TELAS.** Ela não está em
     *    turma nenhuma: o catálogo mostra todas as do curso, e a seção da ficha mostra só as da
     *    grade daquela turma. Antes de 04/10/2026 as duas vistas moravam nesta tela.
     */
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_LIMPA.nome })).toBeVisible();
  });

  test("⚠️ o que é POR TURMA degrada com aviso — nunca com zero", async ({ page }) => {
    await irAGradePorClique(page);
    // Spec 025 (RT-4, D-19): os indicadores e o aviso moram no painel do ícone *Estatísticas* da aba.
    await abrirPainel(page, "estatisticas");

    // ⚠️ "0 sem instrutor" afirmaria que está tudo designado. A frase diz ONDE isso se decide.
    await expect(page.getByText(/são \s*por turma/i).first()).toBeVisible();
    await expect(page.getByText(/ficha da turma/i).first()).toBeVisible();
  });

  test("⚠️ o endereço da vista reabre a MESMA tela, com a mesma linha aberta", async ({ page }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);

    const endereco = page.url();
    expect(
      new URL(endereco).searchParams.get("aberta"),
      "a linha aberta não foi para a URL",
    ).not.toBeNull();

    // ⚠️ Aqui o `goto` NÃO é percurso: é a prova de que o endereço basta (quickstart passo 6).
    await page.goto(endereco);
    await expect(page.locator('[data-slot="detalhe-da-disciplina"]')).toBeVisible();
  });

  /*
   * ⚠️ **O DEFEITO DA CONFERÊNCIA DO PR #67 (17/10/2026)**: clicar de novo na disciplina aberta não a
   *    fechava. A tela desenhava pela URL, mas decidia "abrir ou fechar" pela cópia do servidor, que o
   *    parâmetro visual `aberta` não refaz: o segundo clique gravava o mesmo código de novo.
   */
  test("a linha aberta FECHA e reabre — por clique, por Enter e por Espaço", async ({ page }) => {
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    await conferirQueALinhaAlterna(
      page,
      page,
      DISCIPLINA_COM_UE.nome,
      page.locator('[data-slot="detalhe-da-disciplina"]'),
    );
  });

  test("⚠️ e partindo do endereço com a linha aberta, fecha e REABRE", async ({ page }) => {
    /*
     * ⚠️ A FACE OPOSTA DO MESMO DEFEITO: chegando com `?aberta=` (ou depois de o servidor redesenhar a
     *    tela, como ao gravar dentro do detalhe), a cópia do servidor já era a linha aberta — o
     *    primeiro clique fechava, e o segundo NÃO reabria. O `goto` é o ponto de partida.
     */
    await irAGradePorClique(page);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    await page.goto(page.url());
    await expect(linhaExpansivel(page, DISCIPLINA_COM_UE.nome)).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await conferirQueALinhaAlterna(
      page,
      page,
      DISCIPLINA_COM_UE.nome,
      page.locator('[data-slot="detalhe-da-disciplina"]'),
    );
  });
});

test.describe("`FR-060` a `FR-063` · as unidades de ensino", () => {
  test("⚠️ O CASO QUE DISCRIMINA · com UE a seção aparece; sem UE não há NENHUMA menção", async ({
    page,
  }) => {
    await irAGradePorClique(page);

    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    // ⚠️ Linhas de TABELA desde 17/10/2026 (spec 016, FR-007.1): eram itens de lista com formulário.
    await expect(page.locator('[data-slot="tabela-de-unidades"] tbody tr')).toHaveCount(2);

    // A mesma tela, na disciplina sem unidade.
    await abrirDetalhe(page, DISCIPLINA_SEM_UE.nome);
    await expect(
      page.locator('[data-slot="tabela-de-unidades"] tbody tr'),
      "apareceu unidade numa disciplina que não tem",
    ).toHaveCount(0);
    // ⚠️ E **nenhum aviso de que faltam** — a ausência não é pendência (`FR-061`, D-B3).
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toHaveCount(0);
  });

  test("a soma que não fecha AVISA, e não bloqueia", async ({ page }) => {
    await abrirPaginaDaDisciplina(page, DISCIPLINA_COM_UE.nome);

    // As duas unidades somam 10, igual à CH: nenhum aviso.
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toHaveCount(0);

    // Acrescentar uma terceira quebra a soma — e a gravação PASSA, com aviso.
    // ⚠️ Spec 022 (Bloco 7): o formulário da unidade nova abre num diálogo, pelo ícone do topo da tabela.
    await page.locator('[data-slot="acrescentar-unidade"]').click();
    const nova = page.locator('[data-slot="formulario-de-unidade-nova"]');
    await nova.locator('input[name="numero_ue"]').fill("9");
    await nova.locator('input[name="topico"]').fill("Unidade que desequilibra");
    await nova.locator('input[name="ch"]').fill("3");
    await nova.locator('[data-slot="gravar-unidade-nova"]').click();
    // RC-6: se outra amostra deixar o currículo em uso (atividade global), a tela pede a justificativa.
    const acrescentada = page.getByRole("status").filter({ hasText: "acrescentada" });
    await justificarSePedir(page, "A unidade 9 entra no currículo.", acrescentada);

    await expect(acrescentada).toBeVisible();
    await expect(page.locator('[data-slot="aviso-da-soma"]')).toContainText("13");
  });

  test("`FR-007.1` da spec 016 e spec 022 · as UEs se LEEM sem campo nenhum, e *Editar* abre um diálogo da linha", async ({
    page,
  }) => {
    await abrirPaginaDaDisciplina(page, DISCIPLINA_COM_UE.nome);

    const tabela = page.locator('[data-slot="tabela-de-unidades"]');
    // ⚠️ Sem contar linhas: o caso da soma, acima, acrescenta a UE 9 à mesma disciplina.
    await expect(tabela.locator('[data-unidade="1"]')).toBeVisible();
    // ⚠️ O CASO QUE DISCRIMINA: até 17/10/2026 cada linha trazia três campos abertos.
    await expect(tabela.locator("input, select, textarea")).toHaveCount(0);
    await expect(page.locator('[data-slot="formulario-de-unidade-nova"]')).toHaveCount(0);

    await tabela.locator('[data-unidade="1"] [data-slot="editar-unidade"]').click();
    // ⚠️ Spec 022 (Bloco 7, FR-002): os três campos abrem num DIÁLOGO, só da linha 1; a tabela continua de leitura.
    const dialogo = page.locator('[data-slot="formulario-da-unidade"]');
    await expect(dialogo.locator("input")).toHaveCount(3);
    await expect(tabela.locator("input")).toHaveCount(0);

    const topico = `Tópico editado ${PROCESSO}`;
    await dialogo.locator('input[name="topico"]').fill(topico);
    await dialogo.locator('[data-slot="gravar-unidade"]').click();
    // RC-6: se outra amostra deixar o currículo em uso (atividade global), a tela pede a justificativa.
    const atualizada = page.getByRole("status").filter({ hasText: "atualizada" });
    await justificarSePedir(page, "O tópico da unidade 1 foi revisto.", atualizada);

    await expect(atualizada).toBeVisible();
    await expect(dialogo).toHaveCount(0);
    await expect(tabela.locator('[data-unidade="1"]')).toContainText(topico);
  });
});

/*
 * ⚠️ SPEC 022 (Bloco 7), ITEM 8 — *"legenda com o NOME da disciplina, não o código; nome longo usa o Nome no DSA (ou a
 *    abreviação automática do Bloco 2)"*. O nome esperado sai do BANCO (o caso do *Nome no DSA*, abaixo, grava um na
 *    mesma disciplina) e da mesma função da tela, `nomeNoGrafico`. Item 7: sem «Outras».
 */
/*
 * REGRA DOS VALORES ESPERADOS: (a), spec 025 (Bloco 10, item 4, D-23) — *"trocar a pizza por barras verticais: uma
 * barra por disciplina, altura = CH em TA, eixo X com o código da disciplina, eixo Y em tempos de aula. Interativo"*. O
 * NOME continua na legenda (*"código — nome: N TA"*), que é o item 8 da spec 022.
 */
test.describe("spec 025 (item 4) · a CH das disciplinas é uma barra por disciplina, pelo código", () => {
  test("as barras saem pelo código, em ordem natural, e a legenda nomeia cada uma PELO NOME", async ({
    page,
  }) => {
    const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await irAGradePorClique(page);
    await abrirPainel(page, "estatisticas");
    const proporcao = page.locator('[data-slot="proporcao-da-carga"]');
    await expect(proporcao.locator('[data-slot="grafico-barras"]')).toBeVisible();
    await expect(proporcao.locator('[data-slot="grafico-pizza"]')).toHaveCount(0);
    await expect(proporcao).toContainText("Tempos de aula (TA)");
    const barras = JSON.parse((await proporcao.getAttribute("data-barras")) ?? "[]") as string[];
    expect(barras, "as barras não seguem a ordem natural do código").toEqual(
      [...barras].sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    );
    // ⚠️ A disciplina limpa fica de fora: o caso da exclusão a apaga.
    for (const [d, id] of [
      [DISCIPLINA_COM_UE, amostra.disciplinaComUeId],
      [DISCIPLINA_SEM_UE, amostra.disciplinaSemUeId],
    ] as const) {
      const { data } = await banco
        .from("disciplinas")
        .select("nome_disciplina, nome_no_dsa")
        .eq("id", id)
        .single();
      const nome = nomeNoGrafico({
        nome: (data as { nome_disciplina: string }).nome_disciplina,
        nomeNoDsa: (data as { nome_no_dsa: string | null }).nome_no_dsa,
      });
      await expect(proporcao.locator('[data-slot="legenda-de-grafico"]')).toContainText(
        `${d.cod} — ${nome}:`,
      );
      expect(barras).toContain(d.cod);
    }
    await expect(proporcao).toContainText(" TA");
    await expect(proporcao).not.toContainText("Outras");
  });
});

/*
 * ⚠️ **A `PEND-016-3` (decisão de Bernardo Villas Boas, 18/10/2026)**: dentro do detalhe aberto, as
 *    teclas de navegação apertadas num campo eram capturadas pela grade de fora — `preventDefault` e o
 *    foco para uma célula: o cursor não andava no texto, a seta não mudava a data, e no seletor de
 *    instrutor do detalhe a seta tirava o foco do painel. A grade passou a tratar só as teclas que vêm
 *    de uma célula DELA.
 */
/*
 * ⚠️ SPEC 022 (Bloco 7): o campo da UE saiu do detalhe da linha e mora num diálogo, fora da grade — o caso continua
 *    medindo que as teclas são do CAMPO (o cursor anda, o foco fica) e que Enter grava.
 */
test.describe("`PEND-016-3` · as teclas num campo do formulário são do campo", () => {
  test("no texto da UE em edição, Home, End e setas movem o cursor, e Enter grava", async ({
    page,
  }) => {
    await abrirPaginaDaDisciplina(page, DISCIPLINA_COM_UE.nome);
    const tabela = page.locator('[data-slot="tabela-de-unidades"]');
    await tabela.locator('[data-unidade="1"] [data-slot="editar-unidade"]').click();
    const dialogo = page.locator('[data-slot="formulario-da-unidade"]');

    const campo = dialogo.locator('input[name="topico"]');
    const original = await campo.inputValue();
    expect(original.length, "a amostra não tem tópico para mover o cursor").toBeGreaterThan(1);
    const cursor = () => campo.evaluate((el) => (el as HTMLInputElement).selectionStart);
    await campo.focus();

    for (const [tecla, esperado] of [
      ["End", original.length],
      ["Home", 0],
      ["ArrowRight", 1],
      ["ArrowLeft", 0],
    ] as const) {
      await page.keyboard.press(tecla);
      await expect(campo, `${tecla} tirou o foco do campo`).toBeFocused();
      expect(await cursor(), `${tecla} não moveu o cursor do texto`).toBe(esperado);
    }
    for (const tecla of ["ArrowDown", "ArrowUp", "PageDown", "PageUp"]) {
      await page.keyboard.press(tecla);
      await expect(campo, `${tecla} tirou o foco do campo`).toBeFocused();
    }

    // Espaço é um espaço.
    await page.keyboard.press("End");
    await page.keyboard.press(" ");
    await expect(campo).toHaveValue(`${original} `);
    await page.keyboard.press("Backspace");
    await expect(campo).toHaveValue(original);

    // Enter grava a unidade (é o envio do formulário) — e o diálogo fecha.
    await page.keyboard.press("Enter");
    // RC-6: se outra amostra deixar o currículo em uso (atividade global), a tela pede a justificativa.
    const gravada = page.getByRole("status").filter({ hasText: "atualizada" });
    await justificarSePedir(page, "O tópico da unidade 1, gravado com Enter.", gravada);
    await expect(gravada).toBeVisible();
    await expect(dialogo).toHaveCount(0);
  });
});

test.describe("`FR-020` a `FR-024` · a exclusão, com código e rastro", () => {
  test("⚠️ disciplina COM linha de turma é recusada, NOMEANDO o impedimento", async ({ page }) => {
    await abrirPaginaDaDisciplina(page, DISCIPLINA_COM_UE.nome);

    // Spec 022 (D-2): a exclusão da disciplina fica no topo da página própria; as das UEs, nas linhas.
    // ⚠️ Spec 025 (D-32): a página pergunta ao banco ao abrir — o ícone JÁ CHEGA desabilitado, com a dica da D-COR-6
    //    e o impedimento NOMEADO no nome acessível; a recusa no clique fica para o que mudar depois da leitura.
    const excluir = page.locator('[data-slot="pagina-da-disciplina"] [data-slot="abrir-exclusao"]');
    await expect(excluir).toHaveAttribute("data-bloqueado", "true");
    await expect(excluir).toHaveAttribute("aria-disabled", "true");
    await expect(excluir).toHaveAttribute("aria-label", /linha de turma/);
    await expect(excluir).toHaveAttribute("aria-label", /tem registros: use Desativar/);
  });

  test("⚠️ o botão só libera com o CÓDIGO certo, e a disciplina LIMPA some com rastro", async ({
    page,
  }) => {
    await abrirPaginaDaDisciplina(page, DISCIPLINA_LIMPA.nome);

    await page.getByRole("button", { name: "Excluir disciplina" }).click();

    // ⚠️ Com o código errado, o botão continua desabilitado — o segundo passo é o que protege.
    await page.locator('input[name="codigo_confirmacao"]').fill("codigo-errado");
    await expect(page.locator('[data-slot="confirmar-exclusao"]')).toBeDisabled();

    await page.locator('input[name="codigo_confirmacao"]').fill(amostra.disciplinaLimpaCodigo);
    await expect(page.locator('[data-slot="confirmar-exclusao"]')).toBeEnabled();
    await page.locator('[data-slot="confirmar-exclusao"]').click();

    await expect
      .poll(() => contarDisciplina(amostra.disciplinaLimpaId), { timeout: 15_000 })
      .toBe(0);
    // A página da disciplina deixa de existir: a tela volta às disciplinas de Editar curso.
    await expect(page.locator('[data-slot="parte-disciplinas"]')).toBeVisible();
    // ⚠️ O rastro é o que a emenda D-B1 acrescentou em relação à exclusão de instrutor.
    expect(await rastroDaExclusao(amostra.disciplinaLimpaCodigo)).toBeGreaterThan(0);
  });
});

test.describe("`SC-011` · filtro, indicadores e gráfico refletem o MESMO subconjunto", () => {
  test("⚠️ filtrar muda os três juntos, e *Limpar filtros* mantém o curso", async ({ page }) => {
    await irAGradePorClique(page);

    // Spec 025 (RT-4): os dois painéis da aba, abertos juntos — são independentes (D-18).
    await abrirPainel(page, "estatisticas");
    const indicadorDeDisciplinas = page
      .locator('[data-slot="indicadores"] [data-slot="card-kpi"] .text-kpi')
      .first();
    const antes = await indicadorDeDisciplinas.textContent();

    await abrirPainel(page, "filtros");
    const filtro = page.locator('[data-slot="filtro-avancado"]');
    await filtro.getByLabel("Buscar").fill(DISCIPLINA_COM_UE.cod);

    await expect
      .poll(() => indicadorDeDisciplinas.textContent(), { timeout: 10_000 })
      .not.toBe(antes);
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toHaveCount(0);

    await page.locator('[data-slot="limpar-filtros"]').click();

    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toBeVisible();
    /*
     * ⚠️ **O CURSO FICA — ele é navegação, não filtro** (`FR-054`). Limpar filtros e perder o curso em
     *    que se estava faria o botão **navegar**, e quem clicou queria ver a lista inteira daquele
     *    curso. ⚠️ A asserção da **turma** saiu daqui em 04/10/2026 junto com o parâmetro: ela não é
     *    mais desta tela, e está coberta na seção da ficha.
     */
    const endereco = new URL(page.url());
    // Spec 018 (Bloco 3): o curso é o da PÁGINA (o caminho), e a aba continua a de Disciplinas.
    expect(decodeURIComponent(endereco.pathname)).toBe(`/cursos/${SIGLA_DO_CURSO}`);
    expect(endereco.searchParams.get("aba")).toBe("disciplinas");
    expect(
      endereco.searchParams.get("turma"),
      "a turma voltou ao endereço desta tela: o recorte por turma mora na ficha",
    ).toBeNull();
  });
});

/*
 * ── Spec 017 · `FR-007.1` e `FR-007.5` · o *Nome no DSA*, e a edição que PRESERVA técnica e local ─────────────
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA TÉCNICA E DO LOCAL** (defeito achado na triagem do Bloco 2): o formulário não
 *    trazia os dois preenchidos, e gravar QUALQUER campo os apagava. O preparo os grava no banco; a edição mexe só no
 *    *Nome no DSA*; e a prova é o BANCO depois (PEND-016-2), não o valor que o teste digitou.
 * ⚠️ **"O CAMPO AUSENTE NA CRIAÇÃO" GANHOU OBJETO NO BLOCO 3** (spec 018, C-2): a aba *Disciplinas* do curso monta o
 *    formulário em modo de criação (*Nova disciplina*), e o caso abaixo confere que o *Nome no DSA* não aparece ali.
 */
test.describe("`FR-007.1` e `FR-007.5` da spec 017 · o Nome no DSA, sem apagar técnica nem local", () => {
  test("editar SÓ o Nome no DSA: a prévia mostra o cartão, e o banco guarda o nome e preserva técnica e local", async ({
    page,
  }) => {
    const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const local = `Laboratório da prova ${PROCESSO}`;
    const { error } = await banco
      .from("disciplinas")
      .update({ tecnica_ensino_sugerida: "AE", local_padrao: local, nome_no_dsa: null })
      .eq("id", amostra.disciplinaComUeId);
    expect(error).toBeNull();

    // Spec 022 (D-2): o cadastro da disciplina mora na página própria — o formulário longo, na página.
    await abrirPaginaDaDisciplina(page, DISCIPLINA_COM_UE.nome);

    const formulario = page.locator('[data-slot="formulario-de-disciplina"]');
    await expect(formulario.locator('input[name="tecnica"]')).toHaveValue("AE");
    await expect(formulario.locator('input[name="local"]')).toHaveValue(local);
    const campo = formulario.locator('[data-slot="campo-nome-no-dsa"]');
    await expect(campo).toHaveValue("");
    const previa = formulario.locator('[data-slot="previa-do-cartao"]');
    await expect(previa).toHaveText(
      `No cartão: ${nomeNoCartao({ nomeNoDsa: "", nome: DISCIPLINA_COM_UE.nome })}`,
    );

    await campo.fill("NAV. DA PROVA");
    await expect(previa).toHaveText("No cartão: NAV. DA PROVA");
    await formulario.locator('[data-slot="gravar-disciplina"]').click();

    await expect
      .poll(async () => {
        const { data } = await banco
          .from("disciplinas")
          .select("nome_no_dsa, tecnica_ensino_sugerida, local_padrao")
          .eq("id", amostra.disciplinaComUeId)
          .single();
        return data;
      })
      .toEqual({
        nome_no_dsa: "NAV. DA PROVA",
        tecnica_ensino_sugerida: "AE",
        local_padrao: local,
      });
    // A página própria confirma a gravação, com o valor gravado no campo.
    await expect(
      page.getByRole("status").filter({ hasText: "Disciplina atualizada." }),
    ).toBeVisible();
  });
});

/*
 * ── Spec 018 (Bloco 3) · C-2 · *Nova disciplina* na aba do curso ──────────────────────────────────────────────────
 *
 * ⚠️ **O MODO DE CRIAÇÃO DO FORMULÁRIO EXISTIA DESDE A FATIA (b) E NENHUMA TELA O DESENHAVA** (triagem do Bloco 3,
 *    item 1a 🐛). A prova é o BANCO (PEND-016-2): a linha nova no curso, com o código digitado e a CH.
 */
test.describe("Spec 018 · C-2 · Nova disciplina (desde a spec 021, em Editar curso)", () => {
  test("cadastrar na edição do curso: a linha aparece na grade e o banco guarda a disciplina no curso", async ({
    page,
  }) => {
    const banco = createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const cod = `NV${PROCESSO}`;
    const nome = `Disciplina nova da prova ${PROCESSO}`;

    await irAGradeEmEdicao(page);
    // Spec 022 (D-2): *Nova disciplina* leva à página própria do cadastro, no currículo escolhido.
    await page.locator('[data-slot="nova-disciplina"]').click();
    await expect(page.locator('[data-slot="pagina-da-nova-disciplina"]')).toBeVisible();
    const cadastro = page.locator('[data-slot="cadastro-de-disciplina"]');
    await expect(cadastro).toBeVisible();
    // O *Nome no DSA* é só da edição (C-19 da spec 017).
    await expect(cadastro.locator('[data-slot="campo-nome-no-dsa"]')).toHaveCount(0);

    await cadastro.getByLabel("Código", { exact: true }).fill(cod);
    await cadastro.getByLabel("Nome", { exact: true }).fill(nome);
    await cadastro.getByLabel("Carga horária (tempos)").fill("12");
    await cadastro.locator('[data-slot="gravar-disciplina"]').click();
    /*
     * ⚠️ RC-6 (spec 021): se o currículo da amostra estiver em uso, acrescentar disciplina é correção e a tela pede a
     *    justificativa. "Em uso" depende da ordem dos arquivos (a atividade GLOBAL de outra amostra conta) — medido: o
     *    pedido veio aqui e não veio no CI de `fcbc48b`. Responde-se quando vier.
     */
    await justificarSePedir(
      page,
      "A disciplina nova entra no currículo em vigor.",
      page.getByRole("gridcell", { name: nome }),
    );

    // Depois de criar, de volta às disciplinas de Editar curso, com a linha nova na grade.
    await expect(page.getByRole("gridcell", { name: nome })).toBeVisible();
    await expect(cadastro).toHaveCount(0);

    const { data: curso } = await banco
      .from("cursos")
      .select("id")
      .eq("codigo", SIGLA_DO_CURSO)
      .single();
    const { data, error } = await banco
      .from("disciplinas")
      .select("cod_disciplina, nome_disciplina, carga_horaria_tempos, status")
      .eq("curso_id", (curso as { id: string }).id)
      .eq("cod_disciplina", cod)
      .single();
    expect(error).toBeNull();
    expect(data).toEqual({
      cod_disciplina: cod,
      nome_disciplina: nome,
      carga_horaria_tempos: 12,
      status: "ativo",
    });
  });
});

/*
 * ⚠️ O CASO QUE DISCRIMINA O AJUSTE 1 (spec 021, conferência do PR #82): a aba Disciplinas do curso mostra a grade e
 *    o detalhe, e NENHUMA ação — até 21/10/2026 ela trazia *Nova disciplina*, *Editar*, *Acrescentar unidade* e
 *    *Excluir*. A mesma disciplina, em *Editar curso*, traz as ações.
 */
test.describe("Spec 021 · ajuste 1 · a aba Disciplinas do curso é só leitura", () => {
  test("a página do curso não edita; *Editar curso* edita a mesma disciplina", async ({ page }) => {
    await irAGradePorClique(page);
    await expect(page.locator('[data-slot="nova-disciplina"]')).toHaveCount(0);
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    const detalhe = page.locator('[data-slot="detalhe-da-disciplina"]');
    await expect(
      detalhe.locator('[data-slot="tabela-de-unidades"] [data-unidade="1"]'),
    ).toBeVisible();
    for (const acao of [
      "editar-disciplina",
      "acrescentar-unidade",
      "editar-unidade",
      "abrir-exclusao",
    ]) {
      await expect(
        detalhe.locator(`[data-slot="${acao}"]`),
        `a página do curso ofereceu ${acao}`,
      ).toHaveCount(0);
    }

    await irAGradeEmEdicao(page);
    await expect(page.locator('[data-slot="nova-disciplina"]')).toBeVisible();
    await abrirDetalhe(page, DISCIPLINA_COM_UE.nome);
    // Spec 022 (D-2): em Editar curso, o detalhe leva à página própria; ele mesmo continua sem campo.
    const detalheNaEdicao = page.locator('[data-slot="detalhe-da-disciplina"]');
    await expect(detalheNaEdicao.locator('[data-slot="editar-disciplina"]')).toBeVisible();
    await expect(detalheNaEdicao.locator("input, select, textarea")).toHaveCount(0);
  });
});

test.describe("Spec 018 · C-1 · o endereço antigo /disciplinas", () => {
  test("com curso, leva à aba Disciplinas do curso, com a busca; sem curso, ao catálogo", async ({
    page,
  }) => {
    await entrar(page, EMAIL, "/inicio");
    /*
     * ⚠️ **AQUI O `goto` NÃO É PERCURSO: É A PROVA DO REDIRECIONAMENTO** — o endereço é o que alguém salvou antes do
     *    Bloco 3, e nenhum link da aplicação aponta mais para ele.
     */
    await page.goto(
      `/disciplinas?curso=${encodeURIComponent(SIGLA_DO_CURSO)}&busca=${DISCIPLINA_COM_UE.cod}`,
    );
    await expect
      .poll(() => decodeURIComponent(new URL(page.url()).pathname))
      .toBe(`/cursos/${SIGLA_DO_CURSO}`);
    const endereco = new URL(page.url());
    expect(endereco.searchParams.get("aba")).toBe("disciplinas");
    expect(endereco.searchParams.get("busca")).toBe(DISCIPLINA_COM_UE.cod);
    // ⚠️ A disciplina COM UE, e não a limpa: o caso da exclusão apaga a limpa no mesmo processo (CI, 20/10/2026).
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_COM_UE.nome })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: DISCIPLINA_SEM_UE.nome })).toHaveCount(0);

    await page.goto("/disciplinas");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos");
  });
});

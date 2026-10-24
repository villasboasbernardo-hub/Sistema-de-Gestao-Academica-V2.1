/**
 * `/cursos` — o catálogo, pelo percurso de quem usa (`SC-001`, `SC-001.3`, `SC-002`, US1 1 a 5).
 *
 * ⚠️ **OS CARTÕES LEVAM A `/cursos/[curso]`, E ESSA PÁGINA AINDA NÃO EXISTE.** Ela é a T144, da Fase
 * 16. O que a US1 entrega — e o que estes casos medem — é o **destino do vínculo**: a sigla no
 * caminho, codificada. Clicar e exigir uma página renderizada seria medir a fatia seguinte, e o caso
 * reprovaria por algo que ninguém prometeu ainda. Quando a T144 entrar, o caso ganha a asserção
 * sobre o conteúdo.
 *
 * ⚠️ **O TERCEIRO VAZIO DO `FR-047` NÃO SE PRODUZ AQUI.** *"Ainda não existe curso no sistema"* exige
 * base sem curso nenhum para um perfil de alcance total, e a base local tem 79. Esvaziá-la para o
 * teste seria apagar a carga — e curso não é apagável. Ele é provado em
 * `tests/unidade/consulta-de-cursos.test.ts`, onde a decisão mora, e é o estado da Production hoje.
 * Os outros dois são medidos aqui, com dado de verdade.
 *
 * ⚠️ **O ENCARREGADO DE CURSO É O ÚNICO PERFIL QUE PRODUZ O VAZIO DE *"você não vê"* numa base
 * povoada**: sem vínculo em `usuario_curso`, `app.cursos_do_usuario()` não lhe devolve nada. É o
 * mesmo mecanismo que prova o recorte quando ele tem um curso só.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { abrirPainel } from "./paineis";
import {
  limparCursos,
  responsabilizarPorCurso,
  semearCursos,
  type CursosSemeados,
} from "./cursos-de-teste";

let EMAIL_ADMIN = "";
let EMAIL_ENCARREGADO = "";
let EMAIL_SEM_CURSO = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("catalogo-admin", p);
  EMAIL_ENCARREGADO = emailDeTeste("catalogo-encarregado", p);
  EMAIL_SEM_CURSO = emailDeTeste("catalogo-sem-curso", p);

  await criarConta(EMAIL_ADMIN, `USR-CAT-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);

  await criarConta(EMAIL_ENCARREGADO, `USR-CAT-ENC-${p}`, "encarregado_curso");
  await responsabilizarPorCurso(EMAIL_ENCARREGADO, SEMEADO.porClassificacao.regular);

  // Sem vínculo nenhum — é ele que produz o vazio de "você não vê" numa base povoada.
  await criarConta(EMAIL_SEM_CURSO, `USR-CAT-SEM-${p}`, "encarregado_curso");
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_ENCARREGADO);
  await apagarConta(EMAIL_SEM_CURSO);
});

const catalogo = (page: import("@playwright/test").Page) =>
  page.locator('[data-slot="catalogo-de-cursos"]');

const grupos = (page: import("@playwright/test").Page) => catalogo(page).locator("[data-grupo]");

test.describe("`SC-001` · os cinco grupos, na ordem do Glossário", () => {
  test("os grupos aparecem na ordem fixa, e a amostra está em todos", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();

    /*
     * ⚠️ A ORDEM É `FR-003`, E ELA NÃO É A DO `ENUM`. É este caso que separa "os grupos aparecem" de
     * "os grupos aparecem na ordem certa" — uma implementação que derivasse a lista de `Constants`
     * passaria na primeira e reprovaria aqui, porque a ordem do tipo põe `estagio_qualificacao`
     * ANTES de `aperfeicoamento_avancado`, e o Glossário põe depois.
     *
     * ⚠️ **A ASSERÇÃO É SOBRE A ORDEM RELATIVA, E NÃO SOBRE OS CINCO ESTAREM LÁ** — e isso foi
     * medido, não previsto: o CI reseta o banco, e ali só existem os cursos da amostra. O único
     * `especial` dela nasce **desativado**, então a listagem padrão mostra **quatro** grupos, contra
     * os cinco da base carregada. Exigir cinco fazia o caso passar nesta máquina e reprovar no CI,
     * sobre o mesmo commit — que é o defeito de verificação que a spec 009 vem eliminando. A
     * promessa do `FR-003` é a ORDEM; quais grupos têm cartão é dado.
     */
    // Spec 022 (A-4, 22/10/2026): Estágio de Qualificação antes de Aperfeiçoamento Avançado.
    const GLOSSARIO = [
      "regular",
      "expedito",
      "especial",
      "estagio_qualificacao",
      "aperfeicoamento_avancado",
    ];
    const ordem = await grupos(page).evaluateAll((nos) =>
      nos.map((n) => n.getAttribute("data-grupo")),
    );
    expect(ordem).toEqual(GLOSSARIO.filter((c) => ordem.includes(c)));
    // A amostra garante pelo menos quatro grupos com curso ativo, em qualquer base.
    expect(ordem.length, "a amostra não produziu grupo nenhum").toBeGreaterThanOrEqual(4);
  });

  test("cada grupo mostra a própria contagem, e a soma bate com os cartões", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();

    const contagens = await catalogo(page)
      .locator('[data-slot="contagem-do-grupo"]')
      .evaluateAll((nos) => nos.map((n) => Number(n.textContent)));
    const cartoes = await catalogo(page).locator('[data-slot="cartao-de-curso"]').count();
    expect(contagens.reduce((s, n) => s + n, 0)).toBe(cartoes);
  });

  test("os cinco cursos da amostra estão cada um no seu grupo", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();

    for (const [classificacao, sigla] of Object.entries(SEMEADO.porClassificacao)) {
      // O especial nasce DESATIVADO na amostra: ele aparece só com `?situacao=inativo`.
      if (classificacao === "especial") continue;
      await expect(
        catalogo(page).locator(`[data-grupo="${classificacao}"] [data-curso="${sigla}"]`),
        `${sigla} não está no grupo ${classificacao}`,
      ).toBeVisible();
    }
  });
});

/*
 * ⚠️ SPEC 022 (Bloco 7), ITEM 10 — *"Cursos: estatísticas no mesmo componente/estilo das de Instrutores — cursos por
 *    classificação e duração em semanas de cada curso/estágio; remova o de duração média por classificação."* O painel
 *    nasce recolhido (como o de Instrutores) e abre por clique.
 */
/*
 * ⚠️ SPEC 025 (Bloco 10, RT-4): o painel abre pelo ÍCONE *Estatísticas* da barra, na linha de *Novo curso* — o botão de
 *    texto *"Exibir estatísticas"* saiu.
 */
async function exibirEstatisticas(page: Page): Promise<void> {
  await expect(page.locator('[data-slot="indicadores-do-catalogo"]')).toHaveCount(0);
  const antes = page.url();
  await abrirPainel(page, "estatisticas");
  expect(page.url(), "abrir as estatísticas foi para a URL — é estado efêmero").toBe(antes);
}

test.describe("`SC-002` · os indicadores do `FR-002`, e só eles", () => {
  test("um cartão por classificação, o total e os dois gráficos — e a duração média por classificação saiu", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await exibirEstatisticas(page);
    const painel = page.locator('[data-slot="indicadores-do-catalogo"]');
    await expect(painel).toBeVisible();

    /* Spec 025 (item 6, D-20): o total, as cinco classificações e os demais — sete cartões do mesmo tamanho. */
    await expect(painel.locator('[data-slot="card-kpi"]')).toHaveCount(7);
    for (const classe of [
      "total",
      "regular",
      "expedito",
      "especial",
      "estagio_qualificacao",
      "aperfeicoamento_avancado",
      "demais",
    ]) {
      await expect(
        painel.locator(`[data-classificacao="${classe}"] [data-slot="card-kpi"]`),
      ).toHaveCount(1);
    }
    await expect(painel.getByText("Total de cursos e estágios do CIAARA-11")).toBeVisible();
    await expect(painel.getByText("Cursos regulares")).toBeVisible();
    await expect(painel.getByText("Estágios de qualificação")).toBeVisible();
    // Os seis somam o total (SC-006 da spec 025).
    const numero = async (classe: string) =>
      Number(
        await painel
          .locator(`[data-classificacao="${classe}"] [data-slot="card-kpi"] .text-kpi`)
          .innerText(),
      );
    const partes = await Promise.all(
      [
        "regular",
        "expedito",
        "especial",
        "estagio_qualificacao",
        "aperfeicoamento_avancado",
        "demais",
      ].map(numero),
    );
    expect(partes.reduce((a, b) => a + b, 0)).toBe(await numero("total"));
    await expect(page.locator('[data-slot="grafico-do-catalogo"]')).toHaveCount(2);
    const pizza = page.locator('[data-chave="por-classificacao"] [data-slot="grafico-pizza"]');
    await expect(pizza).toContainText("Quantidade de cursos em cada classificação");
    const duracao = page.locator('[data-chave="duracao-em-semanas"]');
    await expect(duracao).toContainText("Duração em semanas de cada curso e estágio");
    /*
     * Cada curso com a duração em semanas é uma barra com a sigla no eixo; quem não a tem é nomeado embaixo. A ordem
     * das barras sai do atributo que a tela publica — como o `data-barras` de Instrutores —, não das classes internas
     * da biblioteca de gráficos (a primeira versão deste caso as adivinhou, e elas não existiam).
     */
    const barras = JSON.parse((await duracao.getAttribute("data-barras")) ?? "[]") as string[];
    const semDuracao = await duracao.locator('[data-slot="cursos-sem-duracao"]').count();
    expect(barras.length + semDuracao, "o gráfico não recebeu curso nenhum").toBeGreaterThan(0);
    if (barras.length > 0) await expect(duracao).toContainText(barras[0] as string);
    await expect(page.getByText("Duração média, em dias, por classificação")).toHaveCount(0);
  });

  test("⚠️ e o que a A-6 adiou e ninguém pediu NÃO aparece — turmas ativas seguem na PEND-5a-2", async ({
    page,
  }) => {
    // REGRA DOS VALORES ESPERADOS: (a), spec 025 (A-8) — o TOTAL de cursos entrou, pedido no item 6; o resto fica.
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await exibirEstatisticas(page);
    await expect(page.locator('[data-slot="indicadores-do-catalogo"]')).toBeVisible();
    await expect(page.getByText("Turmas ativas")).toHaveCount(0);
  });
});

test.describe("`SC-001.3` · os filtros vivem na URL", () => {
  test("filtrar por classificação muda a URL, encolhe o catálogo e sobrevive ao F5", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos?classificacao=expedito");
    await expect(catalogo(page)).toBeVisible();

    await expect(grupos(page)).toHaveCount(1);
    await expect(grupos(page)).toHaveAttribute("data-grupo", "expedito");

    await page.reload();
    await expect(catalogo(page)).toBeVisible();
    await expect(grupos(page)).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get("classificacao")).toBe("expedito");
  });

  test("⚠️ classificação fora das cinco degrada para o padrão — e a tela não abre vazia", async ({
    page,
  }) => {
    // `geral` está no ENUM e NÃO está no contrato de `/cursos`. Sem o porteiro, a consulta filtraria
    // por um valor que nenhum curso pode ter e a tela diria "nenhum curso com estes filtros".
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();
    const semFiltro = await grupos(page).count();

    await page.goto("/cursos?classificacao=geral");
    await expect(catalogo(page)).toBeVisible();
    // ⚠️ Comparado com a tela SEM filtro, e não com um número fixo: quantos grupos existem depende
    //    da base, e o que este caso mede é que o valor recusado degradou para "todas".
    await expect(grupos(page)).toHaveCount(semFiltro);
  });

  test("`?situacao=inativo` mostra o curso que saiu de oferta", async ({ page }) => {
    const especial = SEMEADO.porClassificacao.especial;

    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();
    await expect(
      catalogo(page).locator(`[data-curso="${especial}"]`),
      "o curso desativado apareceu na listagem padrão",
    ).toHaveCount(0);

    await page.goto("/cursos?situacao=inativo");
    await expect(catalogo(page)).toBeVisible();
    await expect(catalogo(page).locator(`[data-curso="${especial}"]`)).toBeVisible();
    await expect(
      catalogo(page).locator(`[data-curso="${especial}"]`).getByText("Fora de oferta"),
    ).toBeVisible();
  });

  test("modalidade recorta junto com a classificação, em E lógico", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos?classificacao=regular&modalidade=ead");
    // O curso regular da amostra é presencial: o E lógico o exclui.
    await expect(
      catalogo(page).locator(`[data-curso="${SEMEADO.porClassificacao.regular}"]`),
    ).toHaveCount(0);
  });
});

test.describe("Limpar filtros — padrão de toda tela que filtra (23/09/2026)", () => {
  test("aplicar um filtro, limpar, e a URL volta sem os parâmetros e o catálogo completo", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    await expect(catalogo(page)).toBeVisible();
    const gruposCompletos = await grupos(page).count();

    // ⚠️ Sem filtro, o botão NÃO existe — um botão de limpar que nunca some ensina a ignorá-lo.
    await abrirPainel(page, "filtros");
    await expect(page.locator('[data-slot="limpar-filtros"]')).toHaveCount(0);

    await page.goto("/cursos?classificacao=expedito&situacao=inativo");
    // Spec 025 (RT-4, D-18): o *Limpar filtros* mora no painel de Filtros, e o ícone conta os ativos.
    await expect(page.locator('[data-slot="filtros-ativos"]').first()).toHaveText("2");
    await abrirPainel(page, "filtros");
    await expect(page.locator('[data-slot="limpar-filtros"]')).toBeVisible();

    await page.locator('[data-slot="limpar-filtros"]').click();

    await expect.poll(() => new URL(page.url()).searchParams.get("classificacao")).toBeNull();
    expect(new URL(page.url()).searchParams.get("situacao")).toBeNull();
    expect(new URL(page.url()).searchParams.get("modalidade")).toBeNull();

    await expect(catalogo(page)).toBeVisible();
    await expect(grupos(page)).toHaveCount(gruposCompletos);
    await expect(page.locator('[data-slot="limpar-filtros"]')).toHaveCount(0);
  });

  test("⚠️ só trocar a situação já faz o botão aparecer — o padrão dela não é vazio", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos?situacao=inativo");
    await abrirPainel(page, "filtros");
    await expect(page.locator('[data-slot="limpar-filtros"]')).toBeVisible();
  });
});

test.describe("`FR-047` · os vazios dizem qual vazio é", () => {
  test("*não há* — com filtro aplicado, e a frase fala dos filtros", async ({ page }) => {
    /*
     * ⚠️ O VAZIO É PRODUZIDO PELO RECORTE DO ENCARREGADO, e não por uma combinação de filtros que
     * "deveria" estar vazia. A primeira versão usava `expedito` + `presencial` sobre o catálogo
     * inteiro, e a base real tem **4** cursos assim — o caso reprovou por uma suposição sobre dado
     * que ninguém tinha medido. O Encarregado responde por UM curso regular: qualquer outra
     * classificação lhe devolve zero, por construção da amostra.
     */
    await entrar(page, EMAIL_ENCARREGADO, "/cursos?classificacao=expedito");
    const vazio = page.locator("[data-motivo]");
    await expect(vazio).toBeVisible();
    await expect(vazio).toContainText("Nenhum curso com estes filtros");
    await expect(vazio).toHaveAttribute("data-motivo", "sem-dado");
  });

  test("⚠️ *você não vê* — Encarregado sem curso nenhum, e a frase NÃO diz 'não há'", async ({
    page,
  }) => {
    await entrar(page, EMAIL_SEM_CURSO, "/cursos");
    const vazio = page.locator("[data-motivo]");
    await expect(vazio).toBeVisible();
    await expect(vazio).toContainText("Você não alcança nenhum curso");
    await expect(vazio).toHaveAttribute("data-motivo", "sem-permissao");
    await expect(vazio, "disse 'não há' a quem só não alcança").not.toContainText(
      "Ainda não há curso",
    );
  });
});

test.describe("US1 · o recorte do Encarregado de Curso", () => {
  test("ele vê só o curso pelo qual responde", async ({ page }) => {
    await entrar(page, EMAIL_ENCARREGADO, "/cursos");
    await expect(catalogo(page)).toBeVisible();

    await expect(
      catalogo(page).locator(`[data-curso="${SEMEADO.porClassificacao.regular}"]`),
    ).toBeVisible();

    for (const [classificacao, sigla] of Object.entries(SEMEADO.porClassificacao)) {
      if (classificacao === "regular") continue;
      await expect(
        catalogo(page).locator(`[data-curso="${sigla}"]`),
        `${sigla} vazou para o Encarregado`,
      ).toHaveCount(0);
    }
  });

  test("⚠️ e os indicadores dele contam o recorte DELE, não o catálogo", async ({ page }) => {
    await entrar(page, EMAIL_ENCARREGADO, "/cursos");
    await exibirEstatisticas(page);
    const painel = page.locator('[data-slot="indicadores-do-catalogo"]');
    await expect(painel).toBeVisible();
    // Um curso regular alcançado, nenhum estágio: se os indicadores tivessem consulta própria sem
    // recorte, o número não bateria com o único cartão da tela.
    await expect(grupos(page)).toHaveCount(1);
    await expect(
      painel.locator('[data-slot="card-kpi"]').filter({ hasText: "Estágios de qualificação" }),
    ).toContainText("0");
  });
});

test.describe("US1 · o cartão leva à página do curso", () => {
  test("o vínculo aponta para `/cursos/<sigla>`, com a sigla codificada", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, "/cursos");
    const sigla = SEMEADO.porClassificacao.regular;
    const cartao = catalogo(page).locator(`[data-curso="${sigla}"]`);
    await expect(cartao).toBeVisible();
    await expect(cartao).toHaveAttribute("href", `/cursos/${encodeURIComponent(sigla)}`);
  });
});

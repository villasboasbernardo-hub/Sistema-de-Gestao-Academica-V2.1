/**
 * `/cursos/[curso]` — a página do curso, pelo percurso de quem usa.
 *
 * ⚠️ **A AMOSTRA É A DA T110, e os números da base real NÃO são usados como asserção.** O CI reseta o
 * banco e ali só existem os cursos semeados; exigir "22 disciplinas no CAHO" faria o caso passar
 * nesta máquina e reprovar no CI, sobre o mesmo commit — o defeito de verificação que esta fatia vem
 * eliminando. O que se mede é **comportamento**, sobre dado que a própria suíte criou.
 *
 * ⚠️ **NENHUM ACESSO A AVALIAÇÕES NEM A RELATÓRIO** (`FR-008`, A-4) — e o caso confere a ausência,
 * que é comportamento pretendido, não lacuna.
 *
 * Origem: T152 e T153 da spec 009 · `FR-006` a `FR-011`, `FR-031.4`, `SC-002`, `SC-003`.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import {
  limparCursos,
  responsabilizarPorCurso,
  semearCursos,
  type CursosSemeados,
} from "./cursos-de-teste";

let EMAIL_ADMIN = "";
let EMAIL_EXPEDITO = "";
let SEMEADO: CursosSemeados;

test.beforeAll(async ({}, info) => {
  const p = info.workerIndex;
  EMAIL_ADMIN = emailDeTeste("curso-pagina-admin", p);
  EMAIL_EXPEDITO = emailDeTeste("curso-pagina-expedito", p);

  await criarConta(EMAIL_ADMIN, `USR-CUR-ADM-${p}`);
  SEMEADO = await semearCursos(p, EMAIL_ADMIN);
  // Operador de escopo estreito: ele alcança só os cursos `expedito`.
  await criarConta(EMAIL_EXPEDITO, `USR-CUR-EXP-${p}`, "operador", "expedito");
  await responsabilizarPorCurso(EMAIL_ADMIN, SEMEADO.porClassificacao.regular);
});

test.afterAll(async () => {
  await limparCursos(SEMEADO);
  await apagarConta(EMAIL_ADMIN);
  await apagarConta(EMAIL_EXPEDITO);
});

const url = (sigla: string, consulta = "") =>
  `/cursos/${encodeURIComponent(sigla)}${consulta ? `?${consulta}` : ""}`;

/**
 * A página do curso **na aba Grade**. ⚠️ Desde 17/10/2026 a aba padrão é *Sobre o Curso* (spec 016,
 * FR-006.2): os casos que leem a lista de turmas, o seletor ou a turma selecionada pedem a Grade.
 */
const grade = (sigla: string, consulta = "") =>
  url(sigla, consulta ? `aba=grade&${consulta}` : "aba=grade");

const abas = (page: Page) => page.locator('[data-slot="abas-do-curso"] [role="tab"]');
const turmaSelecionada = (page: Page) => page.locator('[data-slot="turma-selecionada"]');

test.describe("`FR-006.2` · as abas moram na URL (sete desde a spec 021)", () => {
  test("são sete, na ordem do Bloco 3 mais *Currículo*, e a padrão é *Sobre o Curso*, a primeira (spec 018, FR-006.1)", async ({
    page,
  }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular));
    // Sete desde a spec 021 (ajuste 2 da conferência do PR #82): a aba *Currículo*, a última.
    await expect(abas(page)).toHaveCount(7);
    for (const [i, aba] of [
      "sobre",
      "grade",
      "disciplinas",
      "avaliacoes",
      "atividades",
      "horarios",
      "curriculo",
    ].entries())
      await expect(abas(page).nth(i)).toHaveAttribute("data-aba", aba);
    await expect(abas(page)).toHaveText([
      "Sobre o Curso",
      "Grade",
      "Disciplinas",
      "Avaliações",
      "Atividades",
      "Horários",
      "Currículo",
    ]);
    await expect(abas(page).nth(0)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[data-slot="aba-sobre"]')).toBeVisible();
  });

  test("⚠️ Relatório não aparece — a tela não anuncia o que não entrega", async ({ page }) => {
    /*
     * ⚠️ A ASSERÇÃO É SOBRE ACESSO, E DENTRO DA PÁGINA — não sobre a palavra, e não no documento
     * inteiro. Duas medições erradas vieram antes desta: varrer o documento pega o "em breve" do
     * MENU da casca, que é outra decisão (MENU-2) e é legítimo; e procurar a palavra "Avaliações"
     * pega o bloco **Avaliações previstas** da aba Sobre, que o `FR-007` manda existir. O que o
     * `FR-008` proíbe é **caminho** para as telas dos Épicos 8 e 10.
     */
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular));
    const pagina = page
      .locator('[data-slot="abas-do-curso"]')
      .locator("xpath=ancestor::section[1]");
    await expect(pagina).toBeVisible();

    // ⚠️ Spec 014 (FR-053): «Avaliações» ENTROU como aba, porque a tela passou a entregá-la; Relatório segue fora.
    await expect(pagina.locator('a[href*="/relatorio"]')).toHaveCount(0);
    await expect(pagina.getByText("em breve", { exact: false })).toHaveCount(0);
    await expect(abas(page).filter({ hasText: /Relatório/ })).toHaveCount(0);
  });

  test("colar a URL com `?aba=grade` numa aba nova reproduz a mesma vista, e o F5 também", async ({
    page,
  }) => {
    // ⚠️ `grade`, e não `sobre`: desde a spec 016 a `sobre` é a padrão, e o caso mede a aba que NÃO é.
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();
    await expect(abas(page).nth(1)).toHaveAttribute("aria-selected", "true");

    await page.reload();
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();
  });

  test("⚠️ trocar de aba EMPILHA: 'voltar' desfaz um passo", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular));
    await expect(page.locator('[data-slot="aba-sobre"]')).toBeVisible();

    await abas(page).nth(1).click();
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();

    await page.goBack();
    await expect(page.locator('[data-slot="aba-sobre"]')).toBeVisible();
  });
});

test.describe("`FR-006.1` · a pré-seleção e o `?turma=`", () => {
  test("sem `?turma=`, a janela decide — e a amostra abre na turma corrente", async ({ page }) => {
    // A `T2` do curso regular vai de agosto a dezembro de 2026; a `T1` terminou em junho.
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaTarde);
  });

  test("⚠️ `?turma=` explícito NUNCA é sobrescrito pela pré-seleção", async ({ page }) => {
    await entrar(
      page,
      EMAIL_ADMIN,
      grade(
        SEMEADO.porClassificacao.regular,
        `turma=${encodeURIComponent(SEMEADO.turmaJanelaCedo)}`,
      ),
    );
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaCedo);
  });

  test("⚠️ `?turma=` inválido degrada para a pré-seleção COM AVISO", async ({ page }) => {
    await entrar(
      page,
      EMAIL_ADMIN,
      grade(SEMEADO.porClassificacao.regular, "turma=CAHO%20T9%202099"),
    );
    await expect(page.locator('[data-slot="aviso-da-selecao"]')).toContainText("CAHO T9 2099");
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaTarde);
  });

  test("curso cujas turmas estão todas canceladas abre sem seleção", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.expedito));
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();
    await expect(turmaSelecionada(page)).toHaveCount(0);
  });
});

test.describe("`FR-033` a `FR-036` · o seletor de turma escreve na URL", () => {
  test("⚠️ trocar a turma escreve o código na URL, sem espaço cru, e a volta é fiel", async ({
    page,
  }) => {
    /*
     * ⚠️ `URLSearchParams` SERIALIZA ESPAÇO COMO `+`, e o código da turma tem espaços. As duas
     * grafias decodificam para o mesmo texto, e por isso o defeito passa despercebido — mas o
     * `FR-031.1` pede UMA representação só, senão comparação de link, cache e histórico divergem.
     */
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await expect(page.locator('[data-slot="seletor-turma"]')).toBeVisible();

    await page.locator('[data-slot="seletor-turma"]').click();
    await page.getByRole("option", { name: SEMEADO.turmaJanelaCedo, exact: false }).click();

    await expect
      .poll(() => new URL(page.url()).searchParams.get("turma"))
      .toBe(SEMEADO.turmaJanelaCedo);

    /*
     * ⚠️ **DUAS GRAFIAS CONVIVEM HOJE, E ISSO É `PEND-5a-8` — não é o que este caso mede.** O
     * `FR-036` obriga a escrita a ir pelo `useParametro`, e o `encodeQueryValue` do `nuqs` escapa
     * `%` primeiro e depois troca espaço por `+` (`nuqs/dist/context-Mu913OAK.js:31`): não há
     * costura para ele emitir `%20`, e `processUrlSearchParams` roda **antes** da serialização.
     * `enderecoDaTurmaNoCurso` escreve `%20`, e `tests/e2e/inicio.spec.ts` tem guarda para isso
     * desde o Épico 4 (c). As duas decisões são testadas e se contradizem — a escolha é de Bernardo.
     *
     * ⚠️ **O QUE ESTE CASO MEDE, E É MEDÍVEL: a ida e a volta são fiéis.** O parâmetro decodifica
     * para o código exato, a página resolve a turma certa, e o espaço **nunca** sai cru — que era o
     * defeito que o `FR-031.2` nomeou em 18/09/2026.
     */
    const bruto = page.url().split("?")[1] ?? "";
    expect(bruto, "o espaço saiu CRU na URL — o defeito do FR-031.2").not.toContain(" ");
    expect(new URL(page.url()).searchParams.get("turma")).toBe(SEMEADO.turmaJanelaCedo);

    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaCedo);
  });

  test("⚠️ a troca EMPILHA: 'voltar' devolve a turma anterior", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaTarde);

    await page.locator('[data-slot="seletor-turma"]').click();
    await page.getByRole("option", { name: SEMEADO.turmaJanelaCedo, exact: false }).click();
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaCedo);

    await page.goBack();
    await expect(turmaSelecionada(page)).toHaveAttribute("data-turma", SEMEADO.turmaJanelaTarde);
  });

  test("abrir, escolher e fechar só com o teclado", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    const gatilho = page.locator('[data-slot="seletor-turma"]');
    await gatilho.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(gatilho).toBeFocused();
  });

  test("`FR-034` · o rótulo é `código · Status`, e existe para toda opção", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await page.locator('[data-slot="seletor-turma"]').click();
    const opcoes = page.getByRole("option");
    await expect(opcoes).toHaveCount(2);
    for (const texto of await opcoes.allInnerTexts()) {
      expect(texto.trim().length, "opção em branco no seletor").toBeGreaterThan(0);
      expect(texto).toContain("·");
    }
  });

  test("`FR-006.1` · curso de uma turma só NÃO tem seletor", async ({ page }) => {
    // Sem seletor não há outra escolha — e a página abre naquela turma.
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.estagio_qualificacao));
    await expect(page.locator('[data-slot="aba-grade"]')).toBeVisible();
    await expect(page.locator('[data-slot="seletor-turma"]')).toHaveCount(0);
  });
});

test.describe("`FR-028.1` · a lista de turmas, com a SALA de cada uma (23/09/2026)", () => {
  test("a sala aparece na linha da turma e no painel da selecionada", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    const linha = page.locator(`[data-linha-turma="${SEMEADO.turmaJanelaCedo}"]`);
    await expect(linha).toBeVisible();
    await expect(linha.locator('[data-slot="sala-na-lista"]')).toHaveText("Sala 01");

    await expect(turmaSelecionada(page).locator('[data-slot="sala-da-turma"]')).toHaveText(
      SEMEADO.salaDeTeste,
    );
  });

  test("turma sem sala mostra o traço, e o aviso dela conta", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.aperfeicoamento_avancado));
    const linha = page.locator(`[data-linha-turma="${SEMEADO.turmaSemSala}"]`);
    await expect(linha.locator('[data-slot="sala-na-lista"]')).toHaveText("—");
    await expect(linha.locator('[data-slot="contagem-de-avisos"]')).not.toHaveText("0");
  });

  test("cada turma leva à ficha dela", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, grade(SEMEADO.porClassificacao.regular));
    await expect(page.locator(`[data-linha-turma="${SEMEADO.turmaJanelaCedo}"] a`)).toHaveAttribute(
      "href",
      `/turmas/${encodeURIComponent(SEMEADO.turmaJanelaCedo)}`,
    );
  });
});

test.describe("`FR-010.1` · o quadro de avisos fica ACIMA das abas, nas duas", () => {
  test("ele está presente na Grade e no Sobre, e nasce recolhido", async ({ page }) => {
    const sigla = SEMEADO.porClassificacao.estagio_qualificacao;

    await entrar(page, EMAIL_ADMIN, grade(sigla));
    const quadro = page.locator('[data-slot="quadro-de-avisos-do-curso"]');
    await expect(quadro).toBeVisible();
    // O estágio da amostra nasce sem duração em semanas e sem propósito: dois avisos.
    await expect(quadro.locator('[data-slot="total-de-avisos"]')).toHaveAttribute(
      "data-quantidade",
      "2",
    );
    await expect(quadro.locator('[data-slot="avisos-recolhiveis"]')).toHaveAttribute(
      "data-aberto",
      "false",
    );

    await page.goto(url(sigla, "aba=sobre"));
    await expect(page.locator('[data-slot="quadro-de-avisos-do-curso"]')).toBeVisible();
  });

  test("curso sem aviso diz isso, em vez de ficar vazio", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular));
    await expect(page.locator('[data-slot="quadro-de-avisos-do-curso"]')).toContainText(
      "Nenhum aviso neste curso",
    );
  });
});

test.describe("`FR-007` · a aba Sobre, só consulta", () => {
  test("os três blocos aparecem, com o total de TA da grade", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular, "aba=sobre"));
    await expect(page.locator('[data-slot="catalogo-do-curso"]')).toBeVisible();
    // A amostra dá uma disciplina de 20 TA ao curso regular.
    await expect(page.locator('[data-slot="total-de-tempos"]')).toHaveText("20");
    await expect(page.getByRole("heading", { name: "Avaliações previstas" })).toBeVisible();
  });

  test("⚠️ nada nela é editável — nenhum campo, nenhum botão de gravar", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular, "aba=sobre"));
    const painel = page.locator('[data-slot="aba-sobre"]');
    await expect(painel).toBeVisible();
    await expect(painel.locator("input, textarea, select, button")).toHaveCount(0);
  });

  test("curso sem avaliação prevista diz 'não há', e não 'você não vê'", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular, "aba=sobre"));
    const vazio = page.locator('[data-slot="aba-sobre"] [data-motivo]');
    await expect(vazio.first()).toHaveAttribute("data-motivo", "sem-dado");
  });
});

test.describe("`FR-031.4` · não encontrado depende do perfil", () => {
  test("Admin: o curso não existe", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url("C-Nao-Existe"));
    const aviso = page.locator('[data-slot="curso-nao-encontrado"]');
    await expect(aviso).toContainText("não encontrado");
    await expect(aviso).not.toContainText("alcance");
  });

  test("⚠️ Operador `expedito`: a frase acrescenta 'ou fora do seu alcance'", async ({ page }) => {
    // O curso regular da amostra existe, e ele não o alcança. Dizer-lhe "não existe" seria afirmar
    // sobre o que a consulta dele não pode ver.
    await entrar(page, EMAIL_EXPEDITO, url(SEMEADO.porClassificacao.regular));
    await expect(page.locator('[data-slot="curso-nao-encontrado"]')).toContainText(
      "fora do seu alcance",
    );
  });

  test("e ele alcança o curso expedito, com a página inteira", async ({ page }) => {
    await entrar(page, EMAIL_EXPEDITO, url(SEMEADO.porClassificacao.expedito));
    await expect(page.locator('[data-slot="cabecalho-do-curso"]')).toBeVisible();
    await expect(page.locator('[data-slot="sigla-do-curso"]')).toHaveText(
      SEMEADO.porClassificacao.expedito,
    );
  });
});

test.describe("`FR-011` · o regime vigente no cabeçalho", () => {
  test("ele aparece, e aponta para o histórico de quem pode editar", async ({ page }) => {
    await entrar(page, EMAIL_ADMIN, url(SEMEADO.porClassificacao.regular));
    const regime = page.locator('[data-slot="regime-vigente"]');
    await expect(regime).toContainText("8 TA por dia");
    await expect(regime.locator('[data-slot="ir-para-historico-de-regime"]')).toHaveAttribute(
      "href",
      `/cursos/${encodeURIComponent(SEMEADO.porClassificacao.regular)}/editar`,
    );
  });
});

test.describe("`FR-006` da spec 016 · a barra única e *Sobre o Curso* primeiro, por clique", () => {
  test("menu → Cursos → cartão: *Sobre o Curso* aberta, três botões do mesmo tamanho, e *Nova turma* leva ao formulário", async ({
    page,
  }) => {
    const sigla = SEMEADO.porClassificacao.regular;
    await entrar(page, EMAIL_ADMIN, "/inicio");
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Cursos", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/cursos");
    await page.locator(`[data-curso="${sigla}"]`).click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}`);

    // *Sobre o Curso* é a primeira e a aberta, sem `?aba=` no endereço (FR-006.2).
    await expect(abas(page).nth(0)).toHaveAttribute("data-aba", "sobre");
    await expect(abas(page).nth(0)).toHaveAttribute("aria-selected", "true");
    expect(new URL(page.url()).searchParams.get("aba")).toBeNull();

    // A barra única, no topo: os três, do mesmo tamanho, e Desativar destrutivo (FR-006.1).
    const barra = page.locator('[data-slot="barra-de-acoes"]');
    await expect(barra).toHaveAttribute("aria-label", "Ações do curso");
    const editar = barra.locator('[data-slot="ir-para-editar-curso"]');
    const desativar = barra.getByRole("button", { name: "Desativar curso" });
    const novaTurma = barra.locator('[data-slot="nova-turma"]');
    await expect(editar).toBeVisible();
    await expect(desativar).toHaveAttribute("data-variant", "destructive");
    await expect(novaTurma).toBeVisible();
    const alturas = await Promise.all(
      [editar, desativar, novaTurma].map(async (l) => (await l.boundingBox())?.height ?? 0),
    );
    expect(
      Math.max(...alturas) - Math.min(...alturas),
      `alturas ${alturas.join(" × ")}`,
    ).toBeLessThan(1);
    // ⚠️ E nenhum dos três ficou para trás nos lugares antigos.
    await expect(
      page.locator('[data-slot="cabecalho-do-curso"] [data-slot="ir-para-editar-curso"]'),
    ).toHaveCount(0);
    await abas(page).nth(1).click();
    await expect(page.locator('[data-slot="aba-grade"] [data-slot="nova-turma"]')).toHaveCount(0);

    await novaTurma.click();
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toBe(`/cursos/${encodeURIComponent(sigla)}/turmas/nova`);
    await expect(page.locator('[data-slot="formulario-de-turma"]')).toHaveAttribute(
      "data-modo",
      "novo",
    );
  });
});

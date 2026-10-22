/**
 * A casca de navegação (`RF-NAV-02`, `FR-016` a `FR-021`, `SC-002`, `SC-003`).
 *
 * ⚠️ **O QUE ESTA SUÍTE MEDE É QUE O SISTEMA DEIXOU DE SER UM BECO.** Até 11/09/2026, quem entrava
 * caía numa página com cabeçalho, nome do usuário, perfil — **e nenhum link**. A única forma de
 * alcançar outra tela era digitar o endereço, e o `SC-003` cobra que esse número seja **zero**.
 */
import { expect, test } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";
import { FORA_DO_MENU, MENU } from "../../lib/navegacao/menu";

let EMAIL = "";

test.beforeAll(async ({}, info) => {
  EMAIL = emailDeTeste("shell", info.workerIndex);
  await criarConta(EMAIL, `USR-SHELL-${info.workerIndex}`);
});

test.afterAll(async () => {
  await apagarConta(EMAIL);
});

test.describe("`SC-002` · depois de entrar, há para onde ir", () => {
  test("a navegação principal existe e é um marco anunciado", async ({ page }) => {
    await entrar(page, EMAIL);
    const navegacao = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(navegacao).toBeVisible();
    await expect(navegacao.getByRole("listitem")).toHaveCount(MENU.length);
  });

  test("⚠️ `SC-003` · a tela de permissões é alcançável POR CLIQUE", async ({ page }) => {
    /*
     * Ela existia desde o Épico 3 e só se chegava nela digitando o endereço. É a tela que a
     * contagem do `SC-003` pegava — e o conserto não foi acrescentar entrada no menu, porque se
     * Administração é entrada única ou grupo é pergunta de Bernardo, e o `RF-NAV-02` é
     * **[PRESERVADO]**.
     */
    await entrar(page, EMAIL);
    await page.getByRole("link", { name: "Permissões" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/permissoes");
  });

  test("a entrada ativa é comunicada ALÉM DA COR (`FR-021`)", async ({ page }) => {
    // ⚠️ É o `FR-025` da fatia (b) aplicado à navegação: quem não distingue as duas cores continua
    // sabendo onde está. `aria-current` é o que leitor de tela anuncia.
    await entrar(page, EMAIL);
    const ativa = page.locator('[data-slot="navegacao-lateral"] [aria-current="page"]');
    await expect(ativa).toHaveCount(1);
    await expect(ativa).toHaveAttribute("data-entrada", "/admin/usuarios");
  });

  test("⚠️ o ativo ACOMPANHA a navegação por clique — Turmas, Cursos, Disciplinas e Instrutores", async ({
    page,
  }) => {
    /*
     * ⚠️ **O DEFEITO QUE A CONFERÊNCIA DO PR #67 ACHOU (17/10/2026)**: só *Início* ficava marcado. O
     *    caminho vinha do cabeçalho da requisição, lido no `layout` — e o App Router **não redesenha o
     *    layout** na navegação por clique entre páginas filhas: o ativo ficava preso à primeira página
     *    carregada. Os casos acima chegam por endereço, e por isso não o viam. Aqui, **nenhum `goto`**
     *    depois do `entrar`: cada parada é um clique no menu, e em cada uma se confere o
     *    `aria-current` e a cor — o fundo do ativo é o `--marca`, resolvido pelo próprio navegador.
     */
    await entrar(page, EMAIL, "/inicio");
    const navegacao = page.getByRole("navigation", { name: "Navegação principal" });
    const ativa = navegacao.locator('[aria-current="page"]');
    await expect(ativa).toHaveAttribute("data-entrada", "/inicio");

    const corDaMarca = await page.evaluate(() => {
      const amostra = document.createElement("div");
      amostra.style.backgroundColor = "var(--marca)";
      document.body.appendChild(amostra);
      const cor = getComputedStyle(amostra).backgroundColor;
      amostra.remove();
      return cor;
    });

    for (const [rotulo, rota] of [
      ["Turmas", "/turmas"],
      ["Cursos", "/cursos"],
      // Spec 018 (Bloco 3): *Disciplinas* saiu do menu — a grade é a aba do curso.
      ["Instrutores", "/instrutores"],
      ["Início", "/inicio"],
    ] as const) {
      await navegacao.getByRole("link", { name: rotulo, exact: true }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(rota);
      await expect(ativa, `em ${rota}, o ativo é outro`).toHaveAttribute("data-entrada", rota);
      await expect(ativa).toHaveCount(1);
      await expect(ativa, `em ${rota}, o ativo não está com a cor da marca`).toHaveCSS(
        "background-color",
        corDaMarca,
      );
    }
  });

  test("⚠️ as abas da Administração e o menu acompanham a troca de aba por clique", async ({
    page,
  }) => {
    /*
     * ⚠️ **O MESMO DEFEITO, NAS ABAS DA ADMINISTRAÇÃO** (achado na conferência do PR #67): o layout de
     *    `/admin` também decidia a aba ativa pelo caminho da requisição, e não é redesenhado ao trocar
     *    de aba — a aba marcada ficava a de entrada. ⚠️ **E O MENU TEM DE SEGUIR NA ADMINISTRAÇÃO**: a
     *    entrada aponta para `/admin/usuarios`, e sem `ativaSob` ela se apagava em Permissões e Salas.
     */
    await entrar(page, EMAIL, "/inicio");
    const menu = page.getByRole("navigation", { name: "Navegação principal" });
    const abas = page.getByRole("navigation", { name: "Administração" });
    await menu.getByRole("link", { name: "Administração", exact: true }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/admin/usuarios");

    for (const [rotulo, rota] of [
      ["Permissões", "/admin/permissoes"],
      ["Salas", "/admin/salas"],
      ["Usuários", "/admin/usuarios"],
    ] as const) {
      await abas.getByRole("link", { name: rotulo, exact: true }).click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(rota);
      await expect(
        abas.locator('[aria-current="page"]'),
        `em ${rota}, a aba marcada é outra`,
      ).toHaveText(rotulo);
      await expect(
        menu.locator('[aria-current="page"]'),
        `em ${rota}, o menu não marca a Administração`,
      ).toHaveAttribute("data-entrada", "/admin/usuarios");
    }
  });

  test("⚠️ o item ativo se DESTACA da lateral nos dois temas (spec 016, 1.2, `RF-DS-03`)", async ({
    page,
  }) => {
    /*
     * ⚠️ **MEDIR "COR DIFERENTE" NÃO PROVARIA NADA**: até 17/10/2026 o ativo era `#eef4fa` sobre
     *    `#eef2f7` — cores diferentes, a 1,01:1. O que a correção promete é **contraste**: o fundo do
     *    ativo contra o da lateral, pelo limite de elemento de interface (3:1, par C-5). Com o estilo
     *    antigo de volta, este caso reprova nos dois temas.
     */
    await entrar(page, EMAIL);
    const razao = () =>
      page.evaluate(() => {
        const ativo = document.querySelector<HTMLElement>(
          '[data-slot="navegacao-lateral"] [aria-current="page"]',
        );
        if (!ativo) return 0;
        const rgb = (el: Element) => getComputedStyle(el).backgroundColor;
        const opaco = (cor: string) => !/rgba\(.*,\s*0\)$|transparent/.test(cor);
        let ancestral: Element | null = ativo.parentElement;
        while (ancestral && !opaco(rgb(ancestral))) ancestral = ancestral.parentElement;
        const luminancia = (cor: string) => {
          const [r, g, b] = (cor.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
          const canal = (v: number) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * canal(r ?? 0) + 0.7152 * canal(g ?? 0) + 0.0722 * canal(b ?? 0);
        };
        const a = luminancia(rgb(ativo));
        const b = luminancia(ancestral ? rgb(ancestral) : "rgb(255,255,255)");
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });

    // Spec 022 (Bloco 7, FR-001.5): o tema é um grupo de três ícones, cada um com o nome do tema.
    await page.getByRole("button", { name: "Tema claro", exact: true }).click();
    expect(await razao(), "tema claro: o ativo não se destaca da lateral").toBeGreaterThanOrEqual(
      3,
    );

    await page.getByRole("button", { name: "Tema noturno", exact: true }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await razao(), "tema noturno: o ativo não se destaca da lateral").toBeGreaterThanOrEqual(
      3,
    );
  });
});

test.describe("`FR-017` · o menu não inventa entrada, e não perde nenhuma", () => {
  test("⚠️ Avaliações e Relatório NÃO têm entrada própria (`RF-CURSO-02`)", async ({ page }) => {
    /*
     * O requisito é **[PRESERVADO]** e escreve que as duas são alcançadas pela página do curso.
     * Quem derivar o menu da árvore de rotas sem lê-lo acrescenta duas entradas que a v2.0 nunca
     * teve — e a ausência delas é comportamento pretendido, não lacuna.
     */
    await entrar(page, EMAIL);
    const navegacao = page.getByRole("navigation", { name: "Navegação principal" });
    for (const { rota, requisito } of FORA_DO_MENU) {
      await expect(
        navegacao.locator(`[data-entrada="${rota}"]`),
        `${rota} ganhou entrada no menu, contra o ${requisito}`,
      ).toHaveCount(0);
    }
  });

  for (const entrada of MENU) {
    test(`a entrada ${entrada.rotulo} diz a verdade sobre ${entrada.rota}`, async ({ page }) => {
      /*
       * ⚠️ OS DOIS SENTIDOS, E O SEGUNDO É O QUE COSTUMA ENVELHECER: entrada marcada como
       * disponível precisa resolver, e entrada marcada como futura **não pode já existir**. Sem o
       * segundo, a tela nasce e o menu continua dizendo "em breve" — e ninguém a encontra.
       */
      await entrar(page, EMAIL);
      const resposta = await page.request.get(entrada.rota);
      const existe = resposta.status() < 400;

      expect(
        existe,
        entrada.disponivel
          ? `${entrada.rota} está no menu como disponível e devolve ${resposta.status()}`
          : `${entrada.rota} já existe, e o menu ainda anuncia "em breve" — vire a bandeira em lib/navegacao/menu.ts`,
      ).toBe(entrada.disponivel);
    });
  }
});

test.describe("`FR-018` · substituição, não duplicação", () => {
  test("há UM alternador de tema na tela autenticada", async ({ page }) => {
    await entrar(page, EMAIL);
    await expect(page.getByTestId("seletor-de-tema")).toHaveCount(1);
  });

  test("⚠️ e a vitrine não tem mais o dela", async ({ page }) => {
    // Dois alternadores é o resultado que o `CHK019` previu. O da vitrine era provisório, e o
    // próprio componente dizia isso no cabeçalho desde a fatia (a).
    await page.goto("/estilo");
    await expect(page.getByTestId("seletor-de-tema")).toHaveCount(0);
  });
});

test.describe("`FR-032.1` · o brasão é o de tela, nunca o de impressão", () => {
  test("o cabeçalho carrega o arquivo leve", async ({ page }) => {
    // Medido: 226 KB contra 6,3 MB, para um desenho que aparece a quarenta pixels de altura. Trocar
    // um pelo outro não muda nada na tela — só o tempo de carregar, e só para quem está numa
    // conexão ruim, que é justamente quem não vai reportar.
    await entrar(page, EMAIL);
    const brasao = page.getByRole("img", { name: /bras[ãa]o/i });
    await expect(brasao).toBeVisible();
    expect(await brasao.getAttribute("src")).not.toContain("impressao");
  });
});

test.describe("`FR-038` · a vitrine fica FORA do grupo autenticado e sem a casca", () => {
  test("ela abre sem sessão e não traz a navegação principal", async ({ page }) => {
    /*
     * ⚠️ O RISCO É CONCRETO, e este é o passo que poderia capturá-la: trinta e poucos casos de
     * ponta a ponta abrem essa rota **sem autenticar**. Levá-la para dentro do grupo reescreveria a
     * suíte inteira para provar menos.
     */
    await page.goto("/estilo");
    await expect(page.getByRole("heading", { name: "Vocabulário visual", level: 1 })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
    await expect(page.locator('[data-slot="casca-do-app"]')).toHaveCount(0);
  });
});

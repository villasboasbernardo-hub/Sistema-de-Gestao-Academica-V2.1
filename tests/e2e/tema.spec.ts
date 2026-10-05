/**
 * Tema claro e noturno: escolha, persistência e — o que importa — AUSÊNCIA DE FLASH.
 * (`FR-006` a `FR-010`, `SC-003`, `SC-004`)
 *
 * ⚠️ **ELES MUDARAM DE LUGAR EM 11/09/2026, E O MOTIVO É O `FR-018`.** Até a fatia (b) o alternador
 * morava na vitrine, porque não existia cabeçalho nem navegação — sem ele não haveria onde clicar.
 * Com a casca de pé, o alternador definitivo vive no cabeçalho e **o da vitrine saiu**: manter os
 * dois seria a duplicação que o `CHK019` previu.
 *
 * ⚠️ **SÓ OS DOIS CASOS QUE CLICAM PRECISAM DE SESSÃO.** Os demais leem preferência do sistema,
 * armazenamento e a primeira classe escrita na raiz — nada disso exige alternador, e mantê-los na
 * vitrine preserva a medição do flash na tela mais pesada do sistema, que é onde ela é mais dura.
 *
 * ⚠️ **E A PERSISTÊNCIA CONTINUA SENDO CONFERIDA NA VITRINE**, de propósito: o tema é do documento
 * inteiro, e provar a escolha numa rota e o efeito noutra é prova mais forte que fazer as duas na
 * mesma tela.
 */
import { expect, test, type Page } from "@playwright/test";

import { apagarConta, criarConta, emailDeTeste, entrar } from "./conta-de-teste";

const VITRINE = "/estilo";

/** A tela autenticada onde o alternador existe. Serve de ponto de clique, não de objeto de teste. */
const COM_CABECALHO = "/admin/usuarios";

let EMAIL = "";
let contaPronta: Promise<void> | undefined;

/**
 * ⚠️ A CONTA NASCE SÓ QUANDO ALGUÉM PRECISA DELA, e não num `beforeAll`. Três dos cinco casos desta
 * suíte não têm sessão: criar conta para todos faria **todo** processo de trabalho falar com a CLI
 * do Supabase ao mesmo tempo — que é exatamente a falha de contenção medida em 11/09/2026.
 */
async function garantirConta(processo: number): Promise<string> {
  EMAIL = emailDeTeste("tema", processo);
  contaPronta ??= criarConta(EMAIL, `USR-TEMA-${processo}`);
  await contaPronta;
  return EMAIL;
}

test.afterAll(async () => {
  if (contaPronta) await apagarConta(EMAIL);
});

/** A classe que o provedor escreve no elemento raiz. */
const classeDoTema = (page: Page) => page.evaluate(() => document.documentElement.className);

test.describe("US2 · tema escolhido e lembrado", () => {
  test("a escolha do noturno atravessa a navegação e a aba nova", async ({
    page,
    context,
  }, info) => {
    await entrar(page, await garantirConta(info.workerIndex), COM_CABECALHO);
    await page.getByTestId("tema-dark").click();
    await expect.poll(() => classeDoTema(page)).toContain("dark");

    await page.goto(VITRINE);
    await expect
      .poll(() => classeDoTema(page), {
        message: "a escolha não atravessou a navegação para outra rota",
      })
      .toContain("dark");

    const outraAba = await context.newPage();
    await outraAba.goto(VITRINE);
    await expect
      .poll(() => classeDoTema(outraAba), { message: "a escolha não valeu na aba nova" })
      .toContain("dark");
    await outraAba.close();
  });

  test("sem escolha manual, segue a preferência do sistema operacional", async ({ browser }) => {
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await pagina.goto(VITRINE);
    await expect.poll(() => classeDoTema(pagina)).toContain("dark");
    await contexto.close();
  });

  test("havendo escolha manual, ela prevalece sobre o sistema operacional", async ({
    browser,
  }, info) => {
    // ⚠️ O sistema pede escuro; a pessoa escolheu claro. A escolha vence — é o `FR-008`, e é o
    // caso que uma implementação ingênua erra, porque o sinal do sistema chega depois.
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await entrar(pagina, await garantirConta(info.workerIndex), COM_CABECALHO);
    await pagina.getByTestId("tema-light").click();
    await expect.poll(() => classeDoTema(pagina)).toContain("light");

    await pagina.goto(VITRINE);
    await expect
      .poll(() => classeDoTema(pagina), { message: "o sistema operacional atropelou a escolha" })
      .toContain("light");
    await contexto.close();
  });

  test("armazenamento indisponível não quebra nem pisca — degradação segura", async ({
    browser,
  }) => {
    // ⚠️ Princípio V. Janela anônima ou política do navegador: a escolha não persiste, e isso é
    // aceitável. O que não é aceitável é a página quebrar — e não há aviso, porque não é falha do
    // usuário e não há o que ele faça a respeito.
    const contexto = await browser.newContext({ colorScheme: "dark" });
    const pagina = await contexto.newPage();
    await pagina.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("armazenamento indisponível");
        },
      });
    });
    await pagina.goto(VITRINE);
    await expect(pagina.getByRole("heading", { name: /vocabulário visual/i })).toBeVisible();
    await expect.poll(() => classeDoTema(pagina)).toContain("dark");
    await contexto.close();
  });
});

test.describe("US2 · nenhum quadro com o tema errado (`FR-009`)", () => {
  test("o tema já está aplicado ANTES da hidratação", async ({ browser }) => {
    const contexto = await browser.newContext();
    const pagina = await contexto.newPage();

    // ⚠️ A MEDIÇÃO É NA PRIMEIRA ESCRITA DA CLASSE, e não por captura de tela. O flash dura
    // milissegundos: uma captura tirada depois que a página assentou mostra o tema CERTO mesmo
    // quando o flash aconteceu — o teste passaria e o usuário continuaria vendo a página piscar.
    // É a mesma armadilha do V-4 do Épico 3, que lia a tela antes da conferência assíncrona.
    await pagina.addInitScript(() => {
      localStorage.setItem("ciaara-tema", "dark");
      const janela = window as unknown as { __primeiraClasse?: string };
      const observador = new MutationObserver(() => {
        if (janela.__primeiraClasse === undefined && document.documentElement.className) {
          janela.__primeiraClasse = document.documentElement.className;
        }
      });
      observador.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
    });

    await pagina.goto(VITRINE, { waitUntil: "commit" });
    await pagina.waitForLoadState("domcontentloaded");
    const primeira = await pagina.evaluate(
      () => (window as unknown as { __primeiraClasse?: string }).__primeiraClasse,
    );

    expect(
      primeira ?? (await classeDoTema(pagina)),
      "a PRIMEIRA classe escrita no elemento raiz não era o tema escolhido: houve um quadro claro " +
        "antes do noturno, que é exatamente o flash que o FR-009 proíbe",
    ).toContain("dark");
    await contexto.close();
  });
});

test.describe("US2 · no tema ESCURO a lista de seleção é legível (`FR-011`)", () => {
  /*
   * ⚠️ **ESTE BLOCO NASCEU DO DEFEITO QUE BERNARDO ACHOU NA TELA EM 05/10/2026**, e os cinco casos
   *    que existiam acima não o pegariam nem por acidente: todos eles medem
   *    `document.documentElement.className` — ou seja, provam que o tema FOI ESCOLHIDO, nunca que
   *    alguma coisa foi PINTADA. O relato era *"fundo claro e texto claro, ilegível"*, e a causa
   *    medida foi um token INVENTADO (`bg-superficie-1`), que não compila para nada.
   *
   * ⚠️ **O QUE DISCRIMINA NÃO É A RAZÃO DE CONTRASTE: É O FUNDO TRANSPARENTE.** Com o token
   *    fantasma, `background-color` resolvia para `rgba(0, 0, 0, 0)` e o `<select>` mostrava o que
   *    havia atrás — uma razão de contraste calculada sobre `transparent` não diz nada. Por isso o
   *    caso mede as duas coisas, e a primeira é a que vira de veredito.
   *
   * ⚠️ **A ARITMÉTICA DOS TOKENS JÁ É AUDITADA EM `tests/unidade/contraste.test.ts`, nos dois
   *    temas** — inclusive o par `C-3`, do item realçado, que entrou no mesmo dia. Aqui se mede o
   *    que o navegador de fato pintou, que é a metade que nenhuma conta sobre arquivo alcança.
   */
  const corDe = (page: Page, seletor: string) =>
    page
      .locator(seletor)
      .first()
      .evaluate((el) => {
        const estilo = getComputedStyle(el);
        return { fundo: estilo.backgroundColor, tinta: estilo.color };
      });

  /** `rgb(a, b, c)` ou `rgba(a, b, c, d)` → luminância relativa, pela fórmula do WCAG. */
  function luminancia(cor: string): number {
    const n = (cor.match(/[\d.]+/g) ?? []).map(Number);
    const [r, g, b] = [n[0] ?? 0, n[1] ?? 0, n[2] ?? 0];
    const canal = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
  }

  function razao(frente: string, fundo: string): number {
    const a = luminancia(frente);
    const b = luminancia(fundo);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  test("⚠️ o `<select>` nativo E o painel do shadcn: fundo pintado e texto legível", async ({
    page,
  }, info) => {
    /*
     * ⚠️ **O PRAZO DESTE CASO É DECLARADO, E O NÚMERO VEM DE MEDIÇÃO.** O prazo padrão é 30 s, e foi
     *    ele — não o do login — que a primeira redação estourou: *"Test timeout of 30000ms
     *    exceeded"*. O caso faz **um** login, **uma** troca de tema e **duas** medições em telas
     *    diferentes; isolado ele leva 3 a 4 s, e na cauda da suíte inteira o login sozinho chega a
     *    consumir 15 s. Com a segunda tentativa de login, o orçamento de 30 s não cabe.
     * ⚠️ **ISTO NÃO AFROUXA MEDIÇÃO NENHUMA:** as asserções de cor continuam sem prazo próprio e
     *    sem repetição. O que o número governa é quanto tempo o caso tem para **chegar** às telas.
     */
    test.setTimeout(90_000);
    /*
     * ⚠️ **OS DOIS ESTÃO NO MESMO CASO DE PROPÓSITO, e a razão é medida:** eles nasceram separados e,
     *    com dois processos de trabalho, o `entrar()` do segundo estourou o prazo — a fragilidade
     *    sob carga que este repositório já registra (`e2e-instrutores-fragil-sob-carga`). Um login,
     *    uma troca de tema e DUAS medições custam metade e provam o mesmo.
     * ⚠️ **A TRAVESSIA ENTRE AS DUAS É POR CLIQUE NO MENU**, e ela prova de passagem que o tema
     *    sobrevive à navegação — o que outro caso desta suíte já afirma por outro caminho.
     */
    /*
     * ⚠️ **O LOGIN ENTRA PELA TELA MAIS LEVE, E ISSO FOI MEDIDO:** entrar direto em `/cursos/novo`
     *    fez o `entrar()` estourar o prazo de 15 s com dois processos de trabalho, duas rodadas
     *    seguidas — a classe de fragilidade que este repositório já registra. O destino vem depois,
     *    por `goto`, que aqui é **ponto de partida** e não atalho no meio de um percurso.
     */
    /*
     * ⚠️ **O LOGIN TEM DUAS TENTATIVAS, E O QUE SE REPETE É SÓ ELE — nenhuma medição.** Medido em
     *    05/10/2026: este caso passa **24 de 24** rodando o arquivo isolado (`--repeat-each=4`), com
     *    base limpa e com a base suja de 128 cursos e 229 credenciais que a suíte deixa, e reprova
     *    **na cauda da suíte inteira**, com 1 e com 2 processos, sempre em `entrar()` —
     *    *"Timeout 15000ms … Expected: not /login"*. É a classe
     *    `e2e-instrutores-fragil-sob-carga` que este repositório registra, e **não** limite de taxa
     *    do Auth: 8 logins em um minuto passam.
     * ⚠️ **POR QUE ISSO É ACEITÁVEL AQUI E NÃO SERIA NUMA ASSERÇÃO:** o que a segunda tentativa
     *    recupera é **chegar à tela**; o que o caso mede — fundo pintado e contraste — continua com
     *    uma medição só, sem prazo e sem repetição. Repetir asserção seria decidir por tempo, que é
     *    o que o achado 9 do Épico 3 proíbe.
     */
    const email = await garantirConta(info.workerIndex);
    try {
      await entrar(page, email);
    } catch {
      await entrar(page, email);
    }
    await page.goto("/cursos/novo");
    await page.getByTestId("tema-dark").click();
    await expect.poll(() => classeDoTema(page)).toContain("dark");

    /*
     * ⚠️ **A ESCOLHA DA TELA É O QUE FAZ O CASO DISCRIMINAR.** O `<select>` de classificação do
     *    curso é um dos SETE que o token inventado derrubava — medido em 05/10/2026. Apontar para um
     *    campo que já estava com token válido (o perfil da conta, por exemplo) daria o mesmo
     *    veredito antes e depois, e não testaria a mudança (DoD 8).
     */
    const nativo = 'select[name="classificacao"]';
    await expect(page.locator(nativo).first()).toBeVisible();
    const campo = await corDe(page, nativo);

    expect(
      campo.fundo,
      `o campo de escolha está com fundo TRANSPARENTE no tema escuro (${campo.fundo}): é o estado ` +
        "exato que um token de cor inventado produz, e nele a lista aberta cai no fundo da UA, " +
        "claro, com o texto claro herdado — o defeito relatado em 05/10/2026",
    ).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(
      razao(campo.tinta, campo.fundo),
      `texto ${campo.tinta} sobre fundo ${campo.fundo} não alcança 4,5:1 no tema escuro`,
    ).toBeGreaterThanOrEqual(4.5);

    /*
     * ⚠️ **O `combobox` DO shadcn NUNCA FOI A CAUSA, e medi-lo é o controle positivo da metade de
     *    cima:** `bg-popover`/`text-popover-foreground` têm valor nos dois temas desde a fatia (a).
     *    Se um dia alguém trocar um deles por nome inventado, é aqui que aparece.
     */
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Turmas", exact: true })
      .click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/turmas");
    await expect(page.locator('[data-slot="lista-de-turmas"]')).toBeVisible();

    const filtro = page.locator('[data-slot="filtro-avancado"]');
    if (!(await filtro.getByLabel("Buscar pelo código").isVisible())) {
      await filtro.getByRole("button", { name: "Filtros" }).click();
    }
    await filtro.getByLabel("Situação").click();

    const painel = page.locator('[data-slot="select-content"]');
    await expect(painel).toBeVisible();

    const lista = await corDe(page, '[data-slot="select-content"]');
    expect(
      lista.fundo,
      `o painel de escolha ficou transparente no escuro (${lista.fundo})`,
    ).not.toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(
      razao(lista.tinta, lista.fundo),
      `texto ${lista.tinta} sobre o painel ${lista.fundo} não alcança 4,5:1 no tema escuro`,
    ).toBeGreaterThanOrEqual(4.5);
  });
});

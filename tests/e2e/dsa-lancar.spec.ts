/**
 * Lançar na grade, **por clique** (`RF-DSA-04`, `RF-EXTRA-01`, `RN-INST-01`, `RN-DIST-03`, `Q-1`,
 * `Q-7`, `Q-8`, `SC-009` · spec 013, PR 2).
 *
 * ⚠️ **O CASO MAIS IMPORTANTE DESTE ARQUIVO É O DA HABILITAÇÃO, e ele confere o VALOR NO BANCO.**
 * Medido em 05/10/2026: não existe FK para `instrutor_disciplina` nem gatilho em `registros_aula`,
 * então **o banco NÃO recusa** quem não está habilitado — a Server Action é a **única** defesa
 * (`RN-INST-01`, *Risco: Alto*). Um teste que só olhasse a mensagem na tela passaria com a defesa
 * removida, porque a mensagem poderia vir de outro lugar; só a contagem no banco prova que nada
 * foi gravado.
 *
 * ⚠️ **E O CONTROLE POSITIVO É METADE DA PROVA:** com o vínculo, o mesmo lançamento entra. Sem ele,
 * uma ação que recusasse **tudo** passaria no negativo.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const GRADE = '[data-slot="grade-alocacao"]';
const FORMULARIO = '[data-slot="formulario-de-lancamento"]';

/** Cliente de serviço — **só** para CONFERIR no banco o que a tela gravou (ou não gravou). */
let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsalancar", PROCESSO);
  await criarConta(EMAIL, `USR-DSAL-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

/** Ficha da turma → *Abrir o DSA* → a semana de referência. */
async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
  );
  await expect(page.locator(GRADE)).toBeVisible();
}

/*
 * ⚠️ **AS CÉLULAS ESCOLHIDAS AQUI SÃO LIVRES DE VERDADE, E A PRIMEIRA ESCOLHA NÃO ERA.** Eu havia
 * clicado em `4:0` — segunda-feira, TA 5 —, e o caso morria em `locator.click: Test timeout`. O
 * motivo: a segunda tem um bloco de 4 tempos a partir do TA 3, e as células de **continuação** não
 * são desenhadas (o `rowSpan` as cobre). Não havia `<td>` para clicar, e o sintoma — tempo
 * esgotado — se lê como lentidão, não como "a célula não existe".
 *
 * `7` é a última linha navegável (TA 8) da G45 de 8 tempos, e nenhum lançamento da semente a ocupa.
 */
const TA_LIVRE_NA_SEGUNDA = "7:0";
/**
 * O TA 8 da **sexta** — a célula do caso que GRAVA, e ela é separada por uma razão medida.
 *
 * ⚠️ **`playwright.config.ts` tem `fullyParallel: true`: os casos de um arquivo se espalham pelos
 * processos, e a ORDEM entre eles não é a da declaração.** Com o caso do alerta e o controle
 * positivo gravando na **mesma** célula da segunda, uma ordem possível era: o alerta lança 4 TA
 * (ficando 8 no dia) e o controle positivo lança 1, chegando a **9** — que passa dos 8 do regime e
 * **gera alerta**, mantendo o formulário aberto, corretamente. O caso media *"o formulário
 * fechou"* e lia a tela certa como erro: ele passava sozinho e reprovava na suíte.
 * ⚠️ **A sexta-feira está VAZIA na semente**, então o controle positivo deixa de depender do que
 * outro caso fez antes dele.
 */
const TA_LIVRE_NA_SEXTA = "7:4";
const TA_LIVRE_NA_TERCA = "7:1";
const OUTRO_TA_LIVRE_NA_TERCA = "6:1";

/** Clica numa célula LIVRE e espera o formulário. */
async function clicarCelulaLivre(page: Page, celula: string): Promise<void> {
  await page.locator(`${GRADE} td[data-celula="${celula}"]`).click();
  await expect(page.locator(FORMULARIO)).toBeVisible();
}

/**
 * Escolhe uma pessoa no **seletor canônico**, pelo nome.
 *
 * ⚠️ **ELE NÃO É UM `<select>`: é um popover com busca**, e é por isso que a primeira redação deste
 * arquivo não compilava — `selectOption({ label: RegExp })` não existe. O caminho é o que
 * `turma-disciplinas.spec.ts` já usa: clicar no seletor, buscar e escolher a opção. Reescrever o
 * percurso aqui faria a segunda forma de operar o mesmo componente.
 */
async function escolherNoSeletor(page: Page, nome: string): Promise<void> {
  await page.locator('[data-slot="seletor-instrutor"]').first().click();
  const painel = page.locator('[data-slot="popover-content"]');
  await painel
    .getByRole("option", { name: new RegExp(nome, "i") })
    .first()
    .click();
}

/** Quantas aulas a turma tem agora, lido pelo BANCO. */
async function quantasAulas(): Promise<number> {
  const { data } = await banco()
    .from("turmas")
    .select("id")
    .eq("codigo", SEMEADO.turmaComRelogio)
    .maybeSingle();
  const turmaId = (data as { id: string } | null)?.id;
  if (turmaId === undefined) return -1;
  const { count } = await banco()
    .from("registros_aula")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turmaId);
  return count ?? 0;
}

test.describe("`SC-009` · o esforço é o da planilha, ou menos", () => {
  test("clicar numa célula abre o formulário com o dia e o TA JÁ fixados", async ({ page }) => {
    await abrirASemana(page);
    /* A linha navegável 4 é o TA 5; a coluna 0 é a segunda-feira. */
    await clicarCelulaLivre(page, TA_LIVRE_NA_SEGUNDA);
    /*
     * ⚠️ **AS DUAS DECISÕES QUE O OPERADOR NÃO TOMA.** Elas vêm do clique, e o formulário as
     * MOSTRA em vez de pedir — é o que faz o esforço cair para duas escolhas (`P-2` da planilha:
     * duas células por bloco).
     */
    const alvo = page.locator('[data-slot="alvo-do-lancamento"]');
    await expect(alvo).toContainText("2026-04-06");
    await expect(alvo).toContainText("8");
    /* E não há campo de dia nem de tempo inicial para preencher. */
    await expect(page.locator("#dsa-dia")).toHaveCount(0);
    await expect(page.locator("#dsa-ta-inicial")).toHaveCount(0);
  });

  test("o pré-preenchimento vem da unidade, e os campos continuam EDITÁVEIS", async ({ page }) => {
    await abrirASemana(page);
    await clicarCelulaLivre(page, TA_LIVRE_NA_SEGUNDA);

    const unidade = page.locator("#dsa-unidade");
    /* ⚠️ Os TRÊS números por unidade (`FR-018`): lançada, prevista e restante. */
    await expect(unidade).toContainText("TA, restam");
    await unidade.selectOption({ index: 1 });

    /* O tópico chegou da unidade — e é um campo, não um rótulo: pode ser trocado. */
    const topico = page.locator("#dsa-conteudo");
    await expect(topico).not.toHaveValue("");
    await topico.fill("Tópico trocado neste lançamento");
    await expect(topico).toHaveValue("Tópico trocado neste lançamento");

    /* O local chegou da sala da turma (`FR-006`). */
    await expect(page.locator("#dsa-local")).toHaveValue(SEMEADO.sala);
  });
});

test.describe("⚠️ `RN-INST-01` · a habilitação, e a Server Action é a ÚNICA defesa", () => {
  test("⚠️ O CASO QUE DISCRIMINA · quem NÃO tem vínculo é recusado, e NADA é gravado", async ({
    page,
  }) => {
    await abrirASemana(page);
    const antes = await quantasAulas();
    expect(antes, "não li a contagem de aulas no banco").toBeGreaterThanOrEqual(0);

    await clicarCelulaLivre(page, TA_LIVRE_NA_SEGUNDA);
    await page.locator("#dsa-unidade").selectOption({ index: 1 });
    /*
     * ⚠️ Escolher **quem não tem vínculo** pelo seletor canônico. Ele aparece na lista porque está
     * ATIVO — o que falta é a habilitação naquela disciplina, e é isso que a regra cobra.
     */
    await escolherNoSeletor(page, SEMEADO.nomeSemHabilitacao);

    await page.locator('[data-slot="gravar-lancamento"]').click();

    /* A frase NOMEIA a habilitação que falta e diz onde resolver. */
    const recusa = page.locator('[data-slot="recusa-do-lancamento"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("não está habilitado");
    await expect(recusa).toContainText("ficha do instrutor");

    /*
     * ⚠️ **E A PROVA É A CONTAGEM NO BANCO.** Com a defesa removida, o banco aceitaria — não há FK
     * nem gatilho de habilitação — e a mensagem poderia continuar aparecendo por outro motivo.
     */
    expect(await quantasAulas(), "a aula entrou mesmo sem habilitação").toBe(antes);
  });

  test("controle positivo · quem TEM vínculo lança, e a aula aparece na grade", async ({
    page,
  }) => {
    await abrirASemana(page);
    const antes = await quantasAulas();

    await clicarCelulaLivre(page, TA_LIVRE_NA_SEXTA);
    await page.locator("#dsa-unidade").selectOption({ index: 1 });
    /*
     * ⚠️ **QUEM MINISTRA É ESCOLHIDO EXPLICITAMENTE, e a primeira redação contava com o
     * pré-preenchimento.** Ele vem de `turma_disciplina_unidade`, que a semente **não** preenche —
     * então o campo ficava vazio e o esquema recusava com *"Identificador inválido"*, uma mensagem
     * que não diz nada sobre habilitação e mandaria procurar no lugar errado.
     */
    await escolherNoSeletor(page, SEMEADO.nomeHabilitado);
    await page.locator("#dsa-conteudo").fill("Aula do percurso de lançar");
    /*
     * ⚠️ **UM TEMPO SÓ, E ISSO É DELIBERADO — a primeira redação deixou o pré-preenchido e o caso
     * reprovou por um motivo que é COMPORTAMENTO CORRETO.** O pré-preenchimento sugere o restante
     * da unidade (até 4), e 4 tempos a partir do TA 8 passam dos 8 do regime: isso gera **alerta**,
     * e alerta **mantém o formulário aberto** para ser lido (`RN-DEG-02`). O caso media *"o
     * formulário fechou"* e lia a tela certa como erro.
     * ⚠️ Com um tempo, nenhum alerta dispara e o caminho limpo — gravou e fechou — é o que se mede.
     * O caminho com alerta tem caso próprio, abaixo.
     */
    await page.locator("#dsa-tempos").fill("1");
    await page.locator('[data-slot="gravar-lancamento"]').click();

    await expect(page.locator(FORMULARIO)).toHaveCount(0);
    expect(await quantasAulas(), "a aula do instrutor habilitado não entrou").toBe(antes + 1);
    await expect(page.locator(GRADE)).toContainText("Aula do percurso de lançar");
  });
});

test.describe("`RN-DEG-02` · o alerta acompanha a gravação, e NÃO a impede", () => {
  test("⚠️ passar dos tempos do regime GRAVA e avisa — o formulário fica para ser lido", async ({
    page,
  }) => {
    await abrirASemana(page);
    const antes = await quantasAulas();

    await clicarCelulaLivre(page, TA_LIVRE_NA_SEGUNDA);
    await page.locator("#dsa-unidade").selectOption({ index: 1 });
    await escolherNoSeletor(page, SEMEADO.nomeHabilitado);
    await page.locator("#dsa-conteudo").fill("Aula que passa do regime");
    /* TA 8 + 4 tempos = até o 11º, e o regime prevê 8: é alerta, nunca bloqueio. */
    await page.locator("#dsa-tempos").fill("4");
    await page.locator('[data-slot="gravar-lancamento"]').click();

    /*
     * ⚠️ **O LANÇAMENTO ACONTECEU.** Os tetos AEC/TAD/TR e o TA excepcional são **alerta**
     * (`RN-DEG-02`), e os dois bloqueios do épico são o teto de TFM (`RN-DIST-03` (a)) e o dia
     * bloqueado no calendário (`RN-EVT-04`). Transformar este aviso
     * em impedimento mudaria a regra de negócio.
     */
    const avisos = page.locator('[data-slot="avisos-do-lancamento"]');
    await expect(avisos).toBeVisible();
    /*
     * ⚠️ **SÃO DOIS ALERTAS DA MESMA FAMÍLIA, e qual deles sai depende de quanto o DIA já tem** —
     * por isso a asserção aceita os dois. *"O regime prevê N tempos"* sai quando a **soma do dia**
     * passa do regime; *"usa o tempo de aula excepcional"* sai quando o **fim do bloco** passa dele.
     * Aqui o bloco vai do 8º ao 11º TA, então o segundo sai sempre; o primeiro depende do que mais
     * foi lançado naquele dia — e **os casos de um arquivo não rodam na ordem da declaração**
     * (`fullyParallel`), então fixar um dos dois fazia o caso reprovar por ordem, não por regra.
     * ⚠️ **O que ele mede é o que importa: o teto normativo VIRA ALERTA e a gravação ACONTECE.**
     */
    await expect(avisos).toContainText(/regime prevê|excepcional/);
    expect(await quantasAulas(), "o alerta impediu a gravação").toBe(antes + 1);
  });
});

test.describe("`Q-1` · o modo sem unidade só aparece onde a isenção vale", () => {
  test("o botão «Aula sem unidade» existe, e exige o tópico", async ({ page }) => {
    await abrirASemana(page);
    await clicarCelulaLivre(page, TA_LIVRE_NA_TERCA);

    /* A turma tem uma disciplina `sem_unidades_ensino`, então o modo é oferecido. */
    const botao = page.locator('[data-modo="aula_sem_ue"]');
    await expect(botao).toBeVisible();
    await botao.click();

    await expect(page.locator("#dsa-disciplina-isenta")).toBeVisible();
    /* ⚠️ A ajuda do campo diz POR QUE o tópico é obrigatório — não só que é. */
    await expect(page.locator("#dsa-disciplina-isenta-ajuda")).toContainText("tópico");
    await expect(page.locator('label[for="dsa-conteudo"]')).toContainText("obrigatório");
  });
});

test.describe("`Q-7` · o Estudo Individual da semana, em um clique", () => {
  test("lança nos dias úteis e, clicado de novo, diz que não há dia novo", async ({ page }) => {
    await abrirASemana(page);

    await page.locator('[data-slot="lancar-estudo-individual"]').click();
    const resposta = page.locator('[data-slot="resposta-do-estudo-individual"]');
    await expect(resposta).toBeVisible();
    await expect(resposta).toContainText("Estudo Individual lançado");

    /*
     * ⚠️ **CLICAR DE NOVO NÃO CRIA NADA, E A TELA DIZ ISSO.** Sem a frase, a segunda vez pareceria
     * não ter feito nada — que é exatamente o que uma falha invisível parece (a lição do
     * `AvisoDaLista` da spec 011).
     */
    await page.locator('[data-slot="lancar-estudo-individual"]').click();
    await expect(resposta).toContainText("Nenhum dia novo");
  });

  test("⚠️ e o dia de feriado de DIA INTEIRO não recebe Estudo Individual", async ({ page }) => {
    await abrirASemana(page);
    await page.locator('[data-slot="lancar-estudo-individual"]').click();
    await expect(page.locator('[data-slot="resposta-do-estudo-individual"]')).toBeVisible();

    /*
     * ⚠️ **A MEDIDA É O BANCO, E NÃO A MENSAGEM — e a primeira redação media a mensagem.** Ela
     * procurava a palavra *"pulado"*, que só aparece quando há dia criado **e** dia pulado na mesma
     * volta; rodando depois do caso anterior, a resposta vira *"Nenhum dia novo"* e a asserção
     * reprovava por **ordem de execução**, não por comportamento.
     * ⚠️ O que a `RN-EVT-02` promete é que a quarta — feriado de dia inteiro — **não tem** Estudo
     * Individual. Perguntar isso ao banco é independente de ordem e é o fato.
     */
    const { data: turma } = await banco()
      .from("turmas")
      .select("id")
      .eq("codigo", SEMEADO.turmaComRelogio)
      .maybeSingle();
    const turmaId = (turma as { id: string } | null)?.id;
    expect(turmaId, "não li a turma").not.toBeUndefined();

    const { count: naQuarta } = await banco()
      .from("atividades_nao_letivas")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turmaId as string)
      .eq("categoria_normativa", "Estudo_Individual")
      .eq("data", "2026-04-08");
    expect(naQuarta, "o feriado de dia inteiro recebeu Estudo Individual").toBe(0);

    /* Controle positivo: a segunda-feira, que não é feriado, RECEBEU. */
    const { count: naSegunda } = await banco()
      .from("atividades_nao_letivas")
      .select("id", { count: "exact", head: true })
      .eq("turma_id", turmaId as string)
      .eq("categoria_normativa", "Estudo_Individual")
      .eq("data", "2026-04-06");
    expect(naSegunda, "o dia útil não recebeu Estudo Individual").toBeGreaterThan(0);
  });
});

test.describe("`RF-EXTRA-01` e `Q-8` · a atividade não letiva", () => {
  test("o subtipo filtra pela categoria, e o responsável pode ser de fora", async ({ page }) => {
    await abrirASemana(page);
    await clicarCelulaLivre(page, OUTRO_TA_LIVRE_NA_TERCA);
    await page.locator('[data-modo="atividade"]').click();

    /*
     * ⚠️ **O SUBTIPO FILTRA POR CATEGORIA** — é a `H2` do analyze em funcionamento. A lista
     * `tipos_atividade` mistura tipo de aula com não-letivo, e oferecê-la inteira deixaria
     * *"Vista de Prova"* disponível como atividade administrativa.
     */
    const subtipo = page.locator("#dsa-subtipo");
    await expect(subtipo).toContainText("Palestra");
    await expect(subtipo).not.toContainText("Vista de Prova");

    await page.locator("#dsa-categoria").selectOption("TAD");
    await expect(subtipo).toContainText("Administração");
    await expect(subtipo).not.toContainText("Palestra");

    /* E o responsável de fora do cadastro tem campo próprio (`Q-8`). */
    await expect(page.locator("#dsa-responsavel-externo")).toBeVisible();
  });
});

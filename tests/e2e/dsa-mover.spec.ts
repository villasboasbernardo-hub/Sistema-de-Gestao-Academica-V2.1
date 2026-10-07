/**
 * Mover, editar e excluir pela grade — **por clique e por TECLADO** (`RF-DSA-07`, `FR-029` a
 * `FR-032`, `RNF-USA-03`, `Q-1`, `Q-12`, `SC-007`, `SC-012`, critério **7** · spec 013, PR 4).
 *
 * ⚠️ **O CASO MAIS IMPORTANTE DAQUI CONFERE O BANCO, NÃO A TELA.** O critério 7 diz *"o `id`
 * continua o mesmo, `criado_por` intacto, `editado_*` carimbado"* — e uma implementação que
 * **excluísse e recriasse** o lançamento mostraria **a mesma grade**. Só a leitura do `id` e de
 * `criado_em` antes e depois distingue mover de refazer.
 *
 * ⚠️ **MOVER SÓ PELO TECLADO É UM CASO PRÓPRIO, e não um detalhe de acessibilidade:** o
 * `RF-DSA-07` pede arrastar-e-soltar **e** uma alternativa de teclado. Um percurso que só
 * arrastasse deixaria a alternativa sem prova — e é ela que funciona em quem usa o sistema com a
 * mão no teclado todo o dia, que é o caso da operação da CIAARA-11.
 *
 * ⚠️ **ZERO `DELETE`: a exclusão é LÓGICA** (regra 4), e o caso confere **a contagem de linhas**
 * antes e depois. Uma exclusão que apagasse a linha sumiria da grade do mesmo jeito.
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
const ACOES = '[data-slot="acoes-do-bloco"]';

/** Cliente de serviço — **só** para CONFERIR no banco o que a tela fez (ou não fez). */
let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsamover", PROCESSO);
  await criarConta(EMAIL, `USR-DSAM-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

const sufixo = (): string =>
  SEMEADO.turmaComRelogio
    .replace(/^CUR-/, "")
    .replace(/ 2026$/, "")
    .replace(/-REL$/, "");

/** O retrato de um lançamento no banco, pelo código da semente. */
async function retratoDaAula(codigo: string): Promise<{
  id: string;
  data: string;
  ta_inicial: number | null;
  tempos_consumidos: number | null;
  criado_em: string;
  editado_em: string | null;
  status: string;
  local: string | null;
  conteudo_resumo: string | null;
} | null> {
  const { data } = await banco()
    .from("registros_aula")
    .select(
      "id, data, ta_inicial, tempos_consumidos, criado_em, editado_em, status, local, conteudo_resumo",
    )
    .eq("codigo", codigo)
    .maybeSingle();
  return (data ?? null) as never;
}

/** Quantas linhas de aula a turma tem — a prova de que a exclusão é LÓGICA. */
async function quantasLinhasDeAula(): Promise<number> {
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

/**
 * Espera a ação terminar e **diz o que aconteceu** — `fechou`, ou a frase que a tela mostrou.
 *
 * ⚠️ **ELE EXISTE PORQUE `toHaveCount(0)` NO PAINEL DÁ UM VEREDITO MUDO, e isso custou três
 * rodadas.** O painel fica aberto por **dois** motivos legítimos: recusa (`RN-DEG-01`) e aviso
 * (`RN-DEG-02`, *"o alerta acompanha a gravação e não a impede"*). Medir só *"fechou"* transforma
 * os dois em `Expected: 0, Received: 1`, que não diz **qual** dos dois foi nem o que a frase dizia.
 *
 * ⚠️ **E A ESPERA TEM DE VIR ANTES DA LEITURA, não depois:** o clique dispara uma Server Action, e
 * ler a recusa na linha seguinte lê a tela **antes** de a resposta chegar — o diagnóstico sai vazio
 * e o caso reprova pelo motivo errado. `expect.poll` reexecuta; leitura direta, não.
 */
async function aguardarAcao(page: Page): Promise<string> {
  const painel = page.locator(ACOES);
  const texto = async (slot: string): Promise<string | null> => {
    const alvo = page.locator(`[data-slot="${slot}"]`);
    return (await alvo.count()) > 0 ? alvo.innerText() : null;
  };
  await expect
    .poll(
      async () => {
        if ((await painel.count()) === 0) return "fechou";
        return (await texto("recusa-da-acao")) ?? (await texto("avisos-da-acao")) ?? "em curso";
      },
      { message: "a ação não terminou" },
    )
    .not.toBe("em curso");
  if ((await painel.count()) === 0) return "fechou";
  return (await texto("recusa-da-acao")) ?? (await texto("avisos-da-acao")) ?? "em curso";
}

/** Ficha da turma → *Abrir o DSA* → a semana de referência. */
async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
  );
  await expect(page.locator(GRADE)).toBeVisible();
}

test.describe("⚠️ critério 7 · mover é UPDATE do mesmo registro", () => {
  test("⚠️ SÓ PELO TECLADO · `Enter` na célula abre as ações, e o movimento preserva a auditoria", async ({
    page,
  }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-A1`;
    const antes = await retratoDaAula(codigo);
    expect(antes, "não li o bloco da semente no banco").not.toBeNull();

    /*
     * ⚠️ **O TECLADO ENTRA NA GRADE EM UM PASSO** (*roving tabindex*) e anda com as setas. A célula
     * do bloco é a da segunda-feira (coluna 0) no TA 3 — a terceira linha navegável.
     * ⚠️ **NENHUM CLIQUE NA GRADE NESTE CASO**, e é isso que ele existe para provar: a alternativa
     * do `RF-DSA-07` funciona sem mouse.
     */
    await page.locator(`${GRADE} td[data-celula="0:0"]`).focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(page.locator(ACOES)).toBeVisible();
    await expect(page.locator('[data-slot="bloco-escolhido"]')).toBeVisible();

    /*
     * Mover para a SEXTA-feira, no mesmo tempo inicial.
     * ⚠️ **O DESTINO É A SEXTA DE PROPÓSITO: ela está vazia na semente.** Os casos de um arquivo
     * rodam em sequência no mesmo processo, e o banco **acumula** — mover para a quinta deixaria
     * dois casos adiante clicando numa célula que este movimento ocupou, e o sintoma seria
     * *"o formulário de lançar não abriu"*, que não diz nada sobre a causa.
     */
    await page.locator("#dsa-mover-dia").selectOption("2026-04-10");
    await page.locator('[data-slot="confirmar-movimento"]').click();
    expect(await aguardarAcao(page)).toBe("fechou");

    const depois = await retratoDaAula(codigo);
    expect(depois?.data, "o bloco não mudou de dia").toBe("2026-04-10");
    /*
     * ⚠️ **AS TRÊS ASSERÇÕES DO CRITÉRIO 7.** Elas é que distinguem *mover* de *excluir e recriar* —
     * e a segunda implementação daria a mesma grade.
     */
    expect(depois?.id, "o identificador mudou: isto não foi um UPDATE").toBe(antes?.id);
    expect(depois?.criado_em, "`criado_em` foi reescrito").toBe(antes?.criado_em);
    expect(depois?.editado_em, "`editado_em` não foi carimbado").not.toBeNull();
  });

  test("arrastar e soltar chega ao MESMO resultado", async ({ page }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-AVNOVA`;
    const { data: antes } = await banco()
      .from("avaliacoes")
      .select("id, data_avaliacao, ta_inicial")
      .eq("codigo", codigo)
      .maybeSingle();
    expect(antes, "não li a avaliação nova no banco").not.toBeNull();

    /*
     * ⚠️ **OS EVENTOS SÃO DESPACHADOS, e isso está DITO em vez de escondido.** O gesto real de
     * arrastar no Chromium depende do tempo do movimento do ponteiro e é instável em suíte; aqui o
     * que se prova é que `dragstart` na origem e `drop` no destino **chegam à mesma `mover`** que o
     * teclado usa — que é a promessa do `RF-DSA-07`. ⚠️ **O caminho de interação de verdade é o do
     * TECLADO, e ele tem o caso acima, com teclas reais.**
     */
    const origem = page.locator(`${GRADE} td[data-celula="0:3"]`);
    await expect(origem).toBeVisible();
    await origem.dispatchEvent("dragstart");
    await page.locator(`${GRADE} td[data-celula="5:3"]`).dispatchEvent("drop");

    await expect(page.locator('[data-slot="resposta-do-movimento"]')).toContainText("movido");

    const { data: depois } = await banco()
      .from("avaliacoes")
      .select("id, data_avaliacao, ta_inicial")
      .eq("codigo", codigo)
      .maybeSingle();
    expect((depois as { ta_inicial: number }).ta_inicial, "o TA não mudou").toBe(6);
    expect((depois as { id: string }).id, "o identificador mudou").toBe(
      (antes as { id: string }).id,
    );
  });
});

test.describe("⚠️ `Q-1` · mover linha histórica SEM unidade de ensino pede a unidade", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA A SEGUNDA METADE DA `Q-1`.** A linha migrada sem UE **passa** nos dois
   * `CHECK` enquanto `editado_em` é nulo; no instante em que se move, o gatilho carimba `editado_em`
   * e o `CHECK` passa a cobrar a unidade. Sem a antecipação da ação, a recusa chegaria como `23514`
   * — *"o banco recusou: um campo não atende à regra"* —, que não diz o que fazer.
   */
  test("sem a unidade, a recusa é a frase da catraca — e nada é gravado", async ({ page }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-HERDSEMUE`;
    const antes = await retratoDaAula(codigo);
    expect(antes?.ta_inicial, "a aula herdada sem UE não está no TA 8 da quinta").toBe(8);

    /* A quinta-feira é a coluna 3; o TA 8 é a oitava linha navegável. */
    await page.locator(`${GRADE} td[data-celula="7:3"]`).click();
    await expect(page.locator(ACOES)).toBeVisible();

    /* ⚠️ O campo da unidade **aparece**, e só aqui: é a linha que a catraca alcança. */
    await expect(page.locator("#dsa-unidade-da-catraca")).toBeVisible();

    await page.locator("#dsa-mover-dia").selectOption("2026-04-07");
    await page.locator('[data-slot="confirmar-movimento"]').click();

    const recusa = page.locator('[data-slot="recusa-da-acao"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("unidade de ensino");
    await expect(recusa).toContainText("UE-1");

    const depois = await retratoDaAula(codigo);
    expect(depois?.data, "a aula se moveu sem a unidade").toBe(antes?.data);
    expect(depois?.editado_em, "a linha foi carimbada mesmo tendo sido recusada").toBeNull();
  });

  test("com a unidade escolhida no mesmo ato, o movimento acontece", async ({ page }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-HERDSEMUE`;

    await page.locator(`${GRADE} td[data-celula="7:3"]`).click();
    await expect(page.locator(ACOES)).toBeVisible();
    await page.locator("#dsa-unidade-da-catraca").selectOption({ index: 1 });
    await page.locator("#dsa-mover-dia").selectOption("2026-04-07");
    await page.locator('[data-slot="confirmar-movimento"]').click();
    expect(await aguardarAcao(page)).toBe("fechou");

    const depois = await retratoDaAula(codigo);
    expect(depois?.data, "o movimento com a unidade não aconteceu").toBe("2026-04-07");
  });
});

test.describe("`SC-012` · editar não toca o catálogo", () => {
  test("o local e o tópico mudam NAQUELE lançamento, e a unidade de ensino fica como está", async ({
    page,
  }) => {
    await abrirASemana(page);
    /*
     * ⚠️ **A AULA DA TERÇA (`A2`), e não a da segunda:** o primeiro caso deste arquivo MOVEU a da
     * segunda para a sexta, e o banco acumula entre os casos. Usar a mesma aula faria este caso
     * clicar numa célula vazia — e reprovar por interferência, não pela regra que ele mede.
     */
    const codigo = `DSA-${sufixo()}-A2`;

    const { data: ueAntes } = await banco()
      .from("unidades_ensino")
      .select("id, topico")
      .like("codigo", `DSA-${sufixo()}-%`)
      .limit(1)
      .maybeSingle();

    /* `A2` está na terça-feira (coluna 1), TA 1 — a primeira linha navegável. */
    await page.locator(`${GRADE} td[data-celula="0:1"]`).click();
    await expect(page.locator(ACOES)).toBeVisible();
    await page.locator('[data-aba="editar"]').click();

    await page.locator("#dsa-editar-local").fill("Sala 04");
    await page.locator("#dsa-editar-conteudo").fill("Tópico trocado só nesta aula");
    await page.locator('[data-slot="confirmar-edicao"]').click();
    expect(await aguardarAcao(page)).toBe("fechou");

    const depois = await retratoDaAula(codigo);
    expect(depois?.local).toBe("Sala 04");
    expect(depois?.conteudo_resumo).toBe("Tópico trocado só nesta aula");

    /*
     * ⚠️ **ESTA É A ASSERÇÃO DO `SC-012`, e ela corrige o `D-4` da planilha:** *"instrutor, local e
     * técnica são atributo DO ITEM do catálogo, não do lançamento: trocar o instrutor de uma UE
     * reescreve todo DSA passado"*. O tópico da unidade **não** mudou.
     */
    const { data: ueDepois } = await banco()
      .from("unidades_ensino")
      .select("id, topico")
      .eq("id", (ueAntes as { id: string }).id)
      .maybeSingle();
    expect(
      (ueDepois as { topico: string }).topico,
      "editar o lançamento reescreveu o catálogo",
    ).toBe((ueAntes as { topico: string }).topico);
  });

  /*
   * ⚠️ **A PORTA LATERAL DA HABILITAÇÃO.** Sem o porteiro em `editar`, bastaria lançar com quem é
   * habilitado e **trocar depois** por quem não é — e o banco **não recusa** (medido: não há FK nem
   * gatilho de habilitação). A frase e a contagem provam que a troca não entrou.
   */
  test("⚠️ trocar por quem NÃO está habilitado é recusado, e o instrutor não muda no banco", async ({
    page,
  }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-A2`;
    const { data: antes } = await banco()
      .from("registros_aula")
      .select("instrutor_id")
      .eq("codigo", codigo)
      .maybeSingle();

    await page.locator(`${GRADE} td[data-celula="0:1"]`).click();
    await page.locator('[data-aba="editar"]').click();
    await page.locator('[data-slot="seletor-instrutor"]').first().click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByRole("option", { name: new RegExp(SEMEADO.nomeSemHabilitacao, "i") })
      .first()
      .click();
    await page.locator('[data-slot="confirmar-edicao"]').click();

    const recusa = page.locator('[data-slot="recusa-da-acao"]');
    await expect(recusa).toBeVisible();
    await expect(recusa).toContainText("não está habilitado");

    const { data: depois } = await banco()
      .from("registros_aula")
      .select("instrutor_id")
      .eq("codigo", codigo)
      .maybeSingle();
    expect(
      (depois as { instrutor_id: string }).instrutor_id,
      "a troca passou pela porta lateral de `editar`",
    ).toBe((antes as { instrutor_id: string }).instrutor_id);
  });
});

test.describe("`FR-031` e regra 4 · excluir é LÓGICO, e o diálogo descreve o efeito", () => {
  test("⚠️ a linha fica `inativo` e NÃO é apagada — a contagem não muda", async ({ page }) => {
    await abrirASemana(page);
    /*
     * ⚠️ **O ALVO É UMA AULA DA SEMENTE (`A4`, a da quarta), e a primeira redação LANÇAVA uma antes
     * de excluir — com um defeito de teste sob carga.** Lançar primeiro fazia o caso depender do
     * refrescamento da grade depois da Server Action, que com dois processos passava dos 10 s do
     * prazo: ele passava sozinho e reprovava na suíte, que é a classe
     * `e2e-instrutores-fragil-sob-carga` do `CLAUDE.md` e o modo de falha que mais parece azar.
     * ⚠️ **E o caminho de LANÇAR pela tela já tem percurso próprio** (`dsa-lancar.spec.ts`): o que
     * este caso existe para medir é a EXCLUSÃO.
     */
    const codigo = `DSA-${sufixo()}-A4`;
    const antes = await quantasLinhasDeAula();
    expect(antes, "não li a contagem de aulas no banco").toBeGreaterThan(0);

    /* `A4` está na quarta-feira (coluna 2), TA 1 — e ela continua VISÍVEL apesar do feriado. */
    await page.locator(`${GRADE} td[data-celula="0:2"]`).click();
    await expect(page.locator(ACOES)).toBeVisible();
    await page.locator('[data-slot="excluir-bloco"]').click();

    /*
     * ⚠️ **A CONSEQUÊNCIA É OBRIGATÓRIA NO TIPO DO DIÁLOGO** (`RNF-USA-03`): *"sem isto o diálogo só
     * atrasa o clique"*. E ela diz a VERDADE — a exclusão é lógica, e dizer *"apagado para sempre"*
     * treinaria a pessoa a ler consequência falsa.
     */
    const dialogo = page.locator('[data-slot="dialogo-confirmacao"]');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText("deixa de contar na carga horária");
    await expect(dialogo).toContainText("fica inativo");
    await dialogo.getByRole("button", { name: "Excluir" }).click();

    /*
     * ⚠️ **ZERO `DELETE`**: a linha continua lá, **inativa** (regra 4). A contagem é a prova — uma
     * exclusão que apagasse a linha sumiria da grade do mesmo jeito.
     */
    await expect
      .poll(async () => (await retratoDaAula(codigo))?.status, {
        message: "a exclusão não mudou a situação da linha",
      })
      .toBe("inativo");
    expect(await quantasLinhasDeAula(), "a linha foi APAGADA, e devia ficar inativa").toBe(antes);
    await expect(page.locator(GRADE)).not.toContainText("Aula no dia do feriado");
  });
});

test.describe("`Q-12` · posicionar o que está na faixa «Sem posição» é o mesmo mover", () => {
  test("a faixa oferece o lançamento sem TA, e posicioná-lo o põe na grade", async ({ page }) => {
    await abrirASemana(page);
    const codigo = `DSA-${sufixo()}-SEMTA`;
    const antes = await retratoDaAula(codigo);
    expect(antes?.ta_inicial, "a aula sem TA da semente já tem posição").toBeNull();

    /*
     * ⚠️ **O ITEM É ESCOLHIDO PELO TEXTO, não por `.first()` — e o `.first()` acusou um defeito
     * REAL antes de ser trocado.** A faixa tem **dois** itens na semente: a avaliação herdada
     * (terça) e esta aula sem TA (quinta); `.first()` pegava a avaliação, e a ação a recusava com a
     * frase da `UE-1` — uma regra que **não se aplica** a `avaliacoes`, que não tem coluna de
     * unidade. O conserto foi na ação; aqui o item passou a ser nomeado, para o caso medir o que diz
     * medir.
     */
    const naFaixa = page
      .locator('[data-slot="posicionar-sem-posicao"]')
      .filter({ hasText: "Lançamento migrado" })
      .first();
    await expect(naFaixa).toBeVisible();
    await naFaixa.click();

    await expect(page.locator(ACOES)).toBeVisible();
    /* ⚠️ O botão diz **Posicionar**, não "Mover": é a mesma ação, com o nome do que se está fazendo. */
    await expect(page.locator('[data-slot="confirmar-movimento"]')).toContainText("Posicionar");

    await page.locator("#dsa-mover-ta").selectOption("7");
    await page.locator('[data-slot="confirmar-movimento"]').click();
    expect(await aguardarAcao(page)).toBe("fechou");

    const depois = await retratoDaAula(codigo);
    expect(depois?.ta_inicial, "o lançamento da faixa não ganhou posição").toBe(7);
    expect(depois?.id, "posicionar criou outro registro").toBe(antes?.id);
  });
});

/**
 * Conflito e alerta na grade — **sinalização, nunca bloqueio** (`RN-CONF-01`, `RN-DEG-02`,
 * `RNF-USA-05`, `Q-17`, critério **5** · spec 013, PR 4).
 *
 * > *"Mesmo instrutor (ou fiscal) com TA sobrepostos no mesmo dia em QUALQUER turma do sistema =
 * > conflito primário; mesma sala = alerta secundário; calculado em memória, sem tabela de
 * > conflitos, SEMPRE sinalização e nunca bloqueio."*
 * > — história **H6** da spec 013
 *
 * ⚠️ **O CONFLITO ENTRE TURMAS NÃO É DEMONSTRÁVEL NUMA TURMA SÓ, e é por isso que a semente cria a
 * atividade da outra turma** (critério 5). Um conflito dentro da mesma turma passaria com uma
 * implementação que só comparasse a semana aberta — e é exatamente essa a metade que a `RN-CONF-01`
 * acrescentou nesta revisão.
 *
 * ⚠️ **E O DSA ALHEIO NÃO VAZA** (`Q-17`): `public.conflitos_da_semana` é `SECURITY DEFINER` e
 * devolve **só** a ocupação — sem `turma_id` e sem `fato_id`. O caso confere que o código da outra
 * turma **não aparece** na tela; as colunas de saída da função já são aferidas em
 * `tests/invariantes/rls/dsa.test.ts`, com sessão autenticada.
 */
import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { apagarConta, chaveLocal, criarConta, emailDeTeste } from "./conta-de-teste";
import { ANO, limparDsa, SEMANA, semearDsa, type DsaSemeado } from "./dsa-de-teste";
import { escolherDisciplinaEUnidade } from "./percurso-do-dsa";
import { irAFichaDaTurma } from "./navegar-turmas";

let EMAIL = "";
let SEMEADO: DsaSemeado;
let PROCESSO = 0;

const GRADE = '[data-slot="grade-alocacao"]';

let servico: SupabaseClient | undefined;
const banco = (): SupabaseClient =>
  (servico ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

test.beforeAll(async ({}, info) => {
  PROCESSO = info.workerIndex;
  EMAIL = emailDeTeste("dsaconflito", PROCESSO);
  await criarConta(EMAIL, `USR-DSAC-${PROCESSO}`);
  SEMEADO = await semearDsa(PROCESSO, EMAIL);
});

test.afterAll(async () => {
  await limparDsa(SEMEADO);
  await apagarConta(EMAIL);
});

async function abrirASemana(page: Page): Promise<void> {
  await irAFichaDaTurma(page, EMAIL, SEMEADO.turmaComRelogio);
  await page.locator('[data-slot="abrir-o-dsa"]').click();
  await page.goto(
    `/turmas/${encodeURIComponent(SEMEADO.turmaComRelogio)}/dsa?semana=${SEMANA}&ano=${ANO}`,
  );
  await expect(page.locator(GRADE)).toBeVisible();
}

test.describe("⚠️ critério 5 · o mesmo instrutor em DUAS turmas no mesmo TA", () => {
  test("a célula é marcada, e a marca vai no ATRIBUTO e em TEXTO — não só na cor", async ({
    page,
  }) => {
    await abrirASemana(page);

    /*
     * O bloco do **sábado**, TA 1 — o mesmo intervalo que a atividade da outra turma ocupa.
     * ⚠️ **A COLUNA DO SÁBADO É A 5, e ela está aberta sem `?sabado=`** porque há lançamento nela
     * (`Q-4`): esconder um fato gravado porque um parâmetro de tela está em `nao` seria esconder o
     * lançamento.
     */
    const celula = page.locator(`${GRADE} td[data-celula="0:5"]`);
    await expect(celula).toBeVisible();

    /*
     * ⚠️ **O ESTADO VAI NO ATRIBUTO** (`RNF-USA-05`, e a lição da barra de progresso do Épico 5.5):
     * `data-conflito` e `data-tom` carregam o que a cor mostra. Um teste que só medisse a classe de
     * fundo passaria numa implementação que **só** pinta — e quem não distingue as cores ficaria
     * sem a informação.
     */
    await expect(celula).toHaveAttribute("data-tom", "conflito");
    await expect(celula).toHaveAttribute("data-conflito", /conflito de instrutor/);

    /* E a palavra está na célula, para quem lê a tela. */
    await expect(celula).toContainText("conflito de instrutor");
  });

  /*
   * ⚠️ **O ALERTA DE SALA É SECUNDÁRIO, E DIFERENTE DO CONFLITO.** A `RN-CONF-01` separa os dois:
   * pessoa é conflito **primário**, sala é alerta **secundário**. Uma implementação que os tratasse
   * como a mesma coisa passaria na asserção anterior e reprovaria aqui.
   */
  test("a MESMA SALA em outra turma sai como alerta secundário, com outra palavra", async ({
    page,
  }) => {
    await abrirASemana(page);
    const celula = page.locator(`${GRADE} td[data-celula="0:5"]`);
    await expect(celula).toHaveAttribute("data-conflito", /mesma sala em outra turma/);
    await expect(celula).toContainText("mesma sala em outra turma");
  });

  test("⚠️ `Q-17` · o conflito aparece SEM o DSA alheio — a outra turma não é nomeada", async ({
    page,
  }) => {
    await abrirASemana(page);
    const grade = page.locator(GRADE);
    await expect(grade).toContainText("conflito de instrutor");
    /*
     * ⚠️ **A FUNÇÃO NÃO DEVOLVE `turma_id` NEM `fato_id`, por desenho** — então o código da outra
     * turma não tem como chegar à tela. Esta asserção é o controle: se alguém "melhorasse" a função
     * acrescentando a turma para mostrar de quem é o conflito, ela reprovaria.
     */
    await expect(grade).not.toContainText(SEMEADO.turmaComVigenciaNova);
    await expect(grade).not.toContainText("Palestra que conflita");
  });
});

test.describe("`RN-CONF-01` e `RN-DEG-02` · o conflito NÃO impede a gravação", () => {
  /*
   * ⚠️ **ESTE É O CASO QUE SEPARA SINALIZAR DE BLOQUEAR.** Os dois bloqueios do épico são o teto
   * de TFM (`RN-DIST-03` (a)) e o dia bloqueado no calendário (`RN-EVT-04`); transformar o conflito em impedimento mudaria a regra de negócio, que é o
   * que a regra inviolável 6 proíbe: *"regra normativa vira alerta, nunca bloqueio"*.
   */
  test("lançar em cima de um conflito GRAVA, e a contagem no banco prova", async ({ page }) => {
    await abrirASemana(page);

    const { data: turma } = await banco()
      .from("turmas")
      .select("id")
      .eq("codigo", SEMEADO.turmaComRelogio)
      .maybeSingle();
    const turmaId = (turma as { id: string }).id;
    const contar = async (): Promise<number> => {
      const { count } = await banco()
        .from("registros_aula")
        .select("id", { count: "exact", head: true })
        .eq("turma_id", turmaId);
      return count ?? 0;
    };
    const antes = await contar();

    /*
     * ⚠️ O TA 8 da segunda está livre. **O que este caso mede é a GRAVAÇÃO**, com conflito na semana:
     * ela acontece, com ou sem marca na célula — porque conflito é **sinalização**, e o único
     * bloqueio do épico é o TFM.
     */
    await page.locator(`${GRADE} td[data-celula="7:0"]`).click();
    await escolherDisciplinaEUnidade(page, SEMEADO.codDisciplina);
    await page.locator('[data-slot="seletor-instrutor"]').first().click();
    await page
      .locator('[data-slot="popover-content"]')
      .getByRole("option", { name: new RegExp(SEMEADO.nomeHabilitado, "i") })
      .first()
      .click();
    await page.locator("#dsa-conteudo").fill("Aula lançada apesar do conflito");
    await page.locator("#dsa-tempos").fill("1");
    await page.locator('[data-slot="gravar-lancamento"]').click();

    /*
     * ⚠️ **A RECUSA, SE HOUVER, É LIDA E POSTA NA MENSAGEM — e isso não é diagnóstico temporário.**
     * Sem esta linha, um lançamento recusado aparece como *"o texto não está na grade"*, e a
     * mensagem acusa a grade quando o problema é a ação. Erro descartado não esconde a causa: ele
     * INVENTA outra (a lição da terceira reconferência da spec 011).
     */
    const recusa = page.locator('[data-slot="recusa-do-lancamento"]');
    if ((await recusa.count()) > 0) {
      throw new Error(`a tela recusou o lançamento: ${await recusa.innerText()}`);
    }

    /*
     * ⚠️ **A ESPERA VEM ANTES DA CONTAGEM, e a primeira redação deste caso fazia o contrário — com
     * um veredito FALSO e acusador.** O clique dispara uma Server Action; contar na linha seguinte
     * lê o banco **antes** de a gravação terminar, e a mensagem que sai é *"o conflito impediu a
     * gravação"* — exatamente a afirmação errada, apontando para a regra em vez da medição.
     * `toContainText` reexecuta; leitura direta de banco, não.
     */
    const avisos = page.locator('[data-slot="avisos-do-lancamento"]');
    if ((await avisos.count()) > 0) {
      throw new Error(`gravou com aviso: ${await avisos.innerText()}`);
    }
    await expect(page.locator(GRADE)).toContainText("Aula lançada apesar do conflito");
    expect(await contar(), "o conflito impediu a gravação — ele é sinalização").toBe(antes + 1);
  });
});

/**
 * Abrir a vitrine, e **esperar que ela esteja de pé** — num lugar só.
 *
 * ⚠️ ELE EXISTE POR CAUSA DE UM DEFEITO QUE CUSTOU DOIS DIAGNÓSTICOS. No CI da fatia (b), casos
 * começaram a falhar logo depois de abrir `/estilo` e a passar na repetição. **A primeira leitura
 * foi lentidão** — a vitrine ganhou biblioteca de gráficos, tabela de 45 linhas e dezesseis
 * componentes —, e alargar o prazo **piorou**: de dois instáveis para seis.
 *
 * ⚠️ **A CAUSA ERA OUTRA, E ESTAVA NA MENSAGEM INTEIRA DO ERRO:** *"strict mode violation:
 * locator('main') resolved to 2 elements"*. O `app/loading.tsx` também desenha um `<main>`, e
 * enquanto o segmento carrega os dois convivem no documento. Esperar por `main` é esperar por algo
 * **ambíguo** — e ambiguidade não se resolve com mais tempo, só fica mais provável de ser vista.
 *
 * ⚠️ **A ESPERA É PELO QUE SÓ A PÁGINA PRONTA TEM**: o título da vitrine. Quando ele aparece, a
 * silhueta de carregamento já saiu, e qualquer contagem de marcos feita depois mede a página, não
 * a transição.
 *
 * ⚠️ **O PRAZO MAIOR É SÓ O DA PRONTIDÃO.** As asserções de comportamento continuam com os 5
 * segundos padrão, de propósito: alargar os dois junto esconderia falha de verdade, porque uma tela
 * que leva quinze segundos para mostrar um emblema está quebrada.
 *
 * ⚠️ **Instável é defeito da verificação, não azar** — a regra vale mesmo quando o portão fica
 * verde na repetição, porque o próximo pode não ficar, e porque um teste que às vezes reprova
 * ensina a ignorar a cor vermelha.
 */
import { expect, type Page } from "@playwright/test";

/** O prazo da prontidão. Folga para o executor do CI, que é mais lento que a máquina local. */
export const PRAZO_DE_PRONTIDAO = 15_000;

/**
 * Navega para `/estilo` e só devolve quando a página **pronta** está desenhada.
 *
 * A vitrine **não pede sessão** — foi deixada aberta na fatia (a) de propósito: ela não exibe dado
 * algum, e exigir login para ver uma paleta não protegeria nada.
 *
 * @param consulta a parte da URL a partir de `?`, para exercitar link direto. Vazia por padrão.
 */
export async function abrirVitrine(page: Page, consulta = ""): Promise<void> {
  await page.goto(`/estilo${consulta}`);
  await expect(
    page.getByRole("heading", { name: "Vocabulário visual", level: 1 }),
    "a vitrine não terminou de carregar: o título da página não apareceu",
  ).toBeVisible({ timeout: PRAZO_DE_PRONTIDAO });

  /*
   * ⚠️ E A TRANSIÇÃO TERMINOU DE VERDADE — um `<main>` só. Sem esta linha, qualquer teste que use
   * `page.locator("main")` depois daqui pode esbarrar no `<main>` do carregamento, que **não
   * reexecuta**: violação de modo estrito falha na hora, não espera. É a diferença entre um teste
   * que às vezes reprova e um que não reprova.
   */
  await expect(page.locator("main")).toHaveCount(1, { timeout: PRAZO_DE_PRONTIDAO });
}

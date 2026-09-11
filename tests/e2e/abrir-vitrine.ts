/**
 * Abrir a vitrine, e **esperar que ela esteja de pé** — num lugar só.
 *
 * ⚠️ ELE EXISTE POR CAUSA DE UMA MEDIÇÃO, não por gosto de abstrair. No primeiro CI da fatia (b),
 * em 10/09/2026, **dois casos ficaram instáveis**: falharam em `expect(main).toBeVisible()` logo
 * depois de abrir `/estilo`, e passaram na repetição. A causa é o que a fatia acrescentou à
 * vitrine — biblioteca de gráficos, tabela de 45 linhas, dezesseis componentes —, carregada por
 * quatro processos de trabalho ao mesmo tempo num executor mais lento que a máquina de quem
 * desenvolve.
 *
 * ⚠️ **INSTÁVEL É DEFEITO DA VERIFICAÇÃO, NÃO AZAR**, e a regra vale mesmo quando o portão fica
 * verde na repetição — porque o próximo pode não ficar, e porque um teste que às vezes reprova
 * ensina a ignorar a cor vermelha.
 *
 * ⚠️ **O PRAZO MAIOR É SÓ O DA PRONTIDÃO.** As asserções de comportamento continuam com os 5
 * segundos padrão, de propósito: alargar os dois junto esconderia falha de verdade, porque uma
 * tela que leva meio minuto para mostrar um emblema está quebrada. O que se espera aqui é a
 * página **existir**; o que ela faz depois é medido no prazo normal.
 */
import { expect, type Page } from "@playwright/test";

/** O prazo da prontidão. Medido no executor do CI, não escolhido por cautela. */
export const PRAZO_DE_PRONTIDAO = 30_000;

/**
 * Navega para `/estilo` e só devolve quando a página está desenhada.
 *
 * A vitrine **não pede sessão** — foi deixada aberta na fatia (a) de propósito: ela não exibe dado
 * algum, e exigir login para ver uma paleta não protegeria nada.
 */
export async function abrirVitrine(page: Page): Promise<void> {
  await page.goto("/estilo");
  await expect(page.locator("main")).toBeVisible({ timeout: PRAZO_DE_PRONTIDAO });
}

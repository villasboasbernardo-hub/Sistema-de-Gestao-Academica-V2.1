/**
 * O papel do DSA enquadrado no Início — spec 029 (Bloco 14, item 8), `FR-008.3`, pedido de Bernardo Villas Boas de
 * 28/10/2026: *"o papel do DSA publicado aparece inteiro, sem rolar"*, em 1366 × 768 e em 1920 × 1080. Emenda o
 * FR-008.1 e a D-31 da spec 026, em que a escala saía **só da largura** — e em 1366 × 768 ela passava de 1, com o papel
 * de ~900 px numa janela de 768.
 *
 * Não há regra `RN-` aqui: é a geometria da tela, escrita como função pura para que a folha de cliente
 * (`app/(app)/inicio/EscalaDoPapel.tsx`) só meça e não decida nada que um teste não veja.
 *
 * ⚠️ **O PAPEL NÃO MUDA**: é a folha A4 paisagem da impressão (`app/print/dsa/documento.css`, 297 × 210 mm). Quem o
 *    reduz é uma escala de CSS sobre a folha inteira; estas são as medidas dela em pixels de CSS (96 por polegada).
 * ⚠️ **O PISO DE 0,35 (D-22)**: abaixo dele a página rola, em vez de o papel virar um selo ilegível — em 1366 × 768 e
 *    1920 × 1080 ele não age. Vale para as duas medidas: a largura estreita também para no piso.
 * ⚠️ **SEM TETO EM 1**: numa janela alta e larga a folha pode passar do tamanho natural (~1,03 em 1920 × 1080) — o
 *    pedido é caber, não ficar pequeno.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/** Milímetros por polegada, e pixels de CSS por polegada. */
const MM_POR_POLEGADA = 25.4;
const PX_POR_POLEGADA = 96;

/** A largura da folha A4 paisagem (297 mm) em pixels de CSS — ≈ 1122,52. */
export const LARGURA_DA_FOLHA_PX = (297 * PX_POR_POLEGADA) / MM_POR_POLEGADA;

/** A altura da folha A4 paisagem (210 mm) em pixels de CSS — ≈ 793,70. */
export const ALTURA_DA_FOLHA_PX = (210 * PX_POR_POLEGADA) / MM_POR_POLEGADA;

/** O piso da escala (D-22 da spec 029). */
export const PISO_DA_ESCALA = 0.35;

/**
 * A escala que faz a folha caber na área disponível — pela largura **e** pela altura (`FR-008.3`) —, nunca abaixo do
 * piso (D-22).
 *
 * ⚠️ **MEDIDA INVÁLIDA DEVOLVE O NEUTRO (1), SEM ESTOURAR** (`RN-DEG-01`): zero, negativa ou `NaN` é medida que não
 *    aconteceu (caixa ainda sem leiaute, por exemplo), e o papel fica no tamanho da impressão. Quem mede e sabe que
 *    *não sobrou espaço* — o que não é medida inválida — passa uma altura positiva mínima e recebe o piso.
 */
export function escalaQueCabe(
  larguraDisponivel: number,
  alturaDisponivel: number,
  piso: number = PISO_DA_ESCALA,
): number {
  const valida = (medida: number) => Number.isFinite(medida) && medida > 0;
  if (!valida(larguraDisponivel) || !valida(alturaDisponivel)) return 1;
  const cabe = Math.min(
    larguraDisponivel / LARGURA_DA_FOLHA_PX,
    alturaDisponivel / ALTURA_DA_FOLHA_PX,
  );
  return Math.max(cabe, piso);
}

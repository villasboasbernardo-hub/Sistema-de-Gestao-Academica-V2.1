/**
 * O carrossel do Início — spec 019 (Bloco 4), pedido de Bernardo Villas Boas de 20/10/2026: *"CARROSSEL que passa
 * sozinho E tem setas (pausa ao passar o mouse ou ao focar; respeita "reduzir movimento" do sistema; navegável por
 * teclado)"*.
 *
 * Não há regra `RN-` aqui: é o comportamento da tela, escrito como função pura para que o componente não decida nada
 * que um teste não veja. A WCAG 2.2.2 (*"pausar, parar, ocultar"*) é o que manda o botão e a pausa.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/** O item seguinte, voltando ao primeiro depois do último. */
export function indiceSeguinte(atual: number, total: number): number {
  return total <= 0 ? 0 : (atual + 1) % total;
}

/** O item anterior, indo ao último antes do primeiro. */
export function indiceAnterior(atual: number, total: number): number {
  return total <= 0 ? 0 : (atual - 1 + total) % total;
}

/**
 * O carrossel passa sozinho agora?
 *
 * ⚠️ **QUALQUER UMA DAS QUATRO SEGURA**: o botão *Pausar*, o ponteiro em cima, o foco dentro e o *"reduzir movimento"*
 *    do sistema. Com um item só não há para onde ir.
 */
export function passaSozinho(estado: {
  readonly total: number;
  readonly pausadoPeloBotao: boolean;
  readonly apontando: boolean;
  readonly focado: boolean;
  readonly reduzirMovimento: boolean;
}): boolean {
  return (
    estado.total > 1 &&
    !estado.pausadoPeloBotao &&
    !estado.apontando &&
    !estado.focado &&
    !estado.reduzirMovimento
  );
}

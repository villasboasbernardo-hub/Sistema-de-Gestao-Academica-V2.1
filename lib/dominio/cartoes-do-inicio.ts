/**
 * Os cartões do Início — spec 019 (Bloco 4), ajuste A-2 da conferência de 20/10/2026.
 *
 * > *"CARTÕES DO INÍCIO MAIORES, e só das turmas com situação ATIVA do ano escolhido (planejada, concluída, cancelada e
 * > arquivada fora). Os números do painel continuam contando todas. Sem turma ativa no ano: estado vazio com uma frase,
 * > não carrossel vazio."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ **O ANO E A ARQUIVADA JÁ VÊM RECORTADOS** pelo panorama (C-1, D-COR-5): aqui só se decide pela situação.
 * ⚠️ **A ORDEM DE CHEGADA SE MANTÉM** — é a do panorama, a única do sistema desde o Bloco 7 (spec 022, FR-003).
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/** As turmas que ganham cartão no Início: só as ativas. */
export function cartoesDoInicio<T extends { readonly status: string }>(turmas: readonly T[]): T[] {
  return turmas.filter((t) => t.status === "ativa");
}

/**
 * Os números do topo do Início: as turmas do ano escolhido por situação (RD-8, Bloco 11).
 *
 * > *"INÍCIO, CARTÕES (RD-8): Turmas ativas (= em andamento) · Planejadas · Concluídas · Canceladas, do ano escolhido.
 * > Sair: Turmas no recorte, Carga executada, Progresso no recorte."* — Bernardo Villas Boas, 26/10/2026
 *
 * ⚠️ **A POPULAÇÃO É A DO PANORAMA** (D-26): o ano da turma (RT-6) e o recorte de classificação e modalidade já vêm
 *    aplicados, e a arquivada já saiu (D-COR-5). Aqui só se conta pela situação.
 */
export function contagemPorSituacao(turmas: readonly { readonly status: string }[]): {
  readonly ativas: number;
  readonly planejadas: number;
  readonly concluidas: number;
  readonly canceladas: number;
} {
  const conta = (s: string) => turmas.filter((t) => t.status === s).length;
  return {
    ativas: conta("ativa"),
    planejadas: conta("planejada"),
    concluidas: conta("concluida"),
    canceladas: conta("cancelada"),
  };
}

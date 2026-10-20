/**
 * Os cartões do Início — spec 019 (Bloco 4), ajuste A-2 da conferência de 20/10/2026.
 *
 * > *"CARTÕES DO INÍCIO MAIORES, e só das turmas com situação ATIVA do ano escolhido (planejada, concluída, cancelada e
 * > arquivada fora). Os números do painel continuam contando todas. Sem turma ativa no ano: estado vazio com uma frase,
 * > não carrossel vazio."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ **O ANO E A ARQUIVADA JÁ VÊM RECORTADOS** pelo panorama (C-1, D-COR-5): aqui só se decide pela situação.
 * ⚠️ **A ORDEM DE CHEGADA SE MANTÉM** — é a do panorama (por curso).
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/** As turmas que ganham cartão no Início: só as ativas. */
export function cartoesDoInicio<T extends { readonly status: string }>(turmas: readonly T[]): T[] {
  return turmas.filter((t) => t.status === "ativa");
}

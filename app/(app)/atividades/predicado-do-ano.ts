/**
 * O recorte de ano da lista de Atividades — RT-6 (Bloco 10, spec 025, conferência de 24/10/2026).
 *
 * > *"REGRA PARA O SISTEMA TODO (RT-6): o ano de qualquer informação ligada a turma é o ANO DA TURMA, nunca a data do
 * > registro ou a janela da atribuição."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **DOIS CASOS, E SÓ UM É DE TURMA**: a atividade DE TURMA entra no ano da turma (`turma_id` entre as turmas do ano),
 *    qualquer que seja a data dela; a atividade GLOBAL (`turma_id` nulo, a que alcança todas as turmas) não tem turma, e
 *    entra pela data — como o feriado e a parada global do Calendário.
 * ⚠️ **OS IDS SÃO OS DAS TURMAS DO ANO** — poucas por ano (30 no remoto em 24/10/2026). A lista de ids na URL que já
 *    derrubou a leitura era a de 175 instrutores (`instrutores/consulta.ts`).
 */

/** A expressão `or` do PostgREST: as atividades das turmas do ano, e as globais com data no ano. */
export function predicadoDoAno(ano: number, turmasDoAno: readonly string[]): string {
  const globais = `and(turma_id.is.null,data.gte.${ano}-01-01,data.lte.${ano}-12-31)`;
  return turmasDoAno.length === 0 ? globais : `turma_id.in.(${turmasDoAno.join(",")}),${globais}`;
}

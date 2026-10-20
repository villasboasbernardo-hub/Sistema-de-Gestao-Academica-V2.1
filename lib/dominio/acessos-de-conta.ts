/**
 * Os acessos ao sistema — spec 020 (Bloco 5), C-13 a C-15.
 *
 * > *"CONTAGEM DE ACESSOS: o Admin vê, na lista de usuários, o número de acessos e o último acesso (que já existe), e um
 * > quadro "quem mais acessou / acessos recentes". Tabela nova só de acréscimo, gravada a cada login bem-sucedido; sem
 * > dado além de conta e instante."* — Bernardo Villas Boas, 20/10/2026
 *
 * ⚠️ **QUEM GRAVA É O BANCO** (`public.registrar_acesso()`), e quem decide quem lê também (só o Admin, pela RLS); aqui
 *    só se ordena o que chegou.
 * ⚠️ **CONTA EXCLUÍDA FICA DE FORA DAS LISTAS**: o acesso dela continua guardado (só conta e instante), mas a tela junta
 *    pelas contas vivas, e uma linha sem nome não diria nada a ninguém.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

export type ResumoDeAcessos = {
  readonly usuarioId: string;
  readonly total: number;
  /** Instante ISO do acesso mais recente. */
  readonly ultimoEm: string;
};

/** As contas com mais acessos; no empate, a do acesso mais recente primeiro. */
export function quemMaisAcessou(
  resumo: readonly ResumoDeAcessos[],
  limite: number,
  vivas?: ReadonlySet<string>,
): ResumoDeAcessos[] {
  return resumo
    .filter((r) => !vivas || vivas.has(r.usuarioId))
    .slice()
    .sort((a, b) => b.total - a.total || b.ultimoEm.localeCompare(a.ultimoEm))
    .slice(0, limite);
}

/** O total de uma conta — zero se ela nunca entrou desde que a contagem começou. */
export function totalDeAcessos(resumo: readonly ResumoDeAcessos[], usuarioId: string): number {
  return resumo.find((r) => r.usuarioId === usuarioId)?.total ?? 0;
}

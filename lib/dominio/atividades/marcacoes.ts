/**
 * RA-5 e RA-6 (Bloco 18, spec 033) — a MARCAÇÃO À MÃO: a AEC prevista cumprida e a APOINST concluída.
 *
 * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…) OU marcada à mão pelo trio
 * > (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha, como os ajustes de avaliação do Bloco 16."*
 * > (RA-5) — *"Concluída (TA lançados ≥ previstos ou marcada à mão com justificativa)"* (RA-6)
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **A MAIS RECENTE VALE, E SÓ NA LINHA** (o molde de `avaliacoes/ajustes.ts`): `cumprida` marca; `a_cumprir`
 *    desfaz — a linha volta ao que os lançamentos dizem. As anteriores são o histórico. Não muda CH.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

export type SituacaoDaMarcacao = "cumprida" | "a_cumprir";

export type MarcacaoNoHistorico = {
  readonly situacao: SituacaoDaMarcacao;
  readonly dataRealizada: string | null;
  readonly justificativa: string;
  /** O nome carimbado pelo banco; nulo quando gravada sem sessão. */
  readonly autor: string | null;
  /** `criado_em` (timestamptz ISO). */
  readonly em: string;
};

/** Uma linha de `marcacoes_de_atividade`, já traduzida. */
export type MarcacaoDeAtividade = MarcacaoNoHistorico & {
  readonly turmaId: string;
  readonly atividadePrevistaId: string | null;
  readonly apoinstId: string | null;
};

/** As marcações de cada alvo, da mais nova à mais velha. */
export function historicoPorAlvo(
  marcacoes: readonly MarcacaoDeAtividade[],
  chave: (m: MarcacaoDeAtividade) => string | null,
): ReadonlyMap<string, readonly MarcacaoNoHistorico[]> {
  const grupos = new Map<string, MarcacaoNoHistorico[]>();
  for (const m of [...marcacoes].sort((x, y) => (x.em < y.em ? 1 : x.em > y.em ? -1 : 0))) {
    const k = chave(m);
    if (k === null) continue;
    const lista = grupos.get(k) ?? [];
    lista.push({
      situacao: m.situacao,
      dataRealizada: m.dataRealizada,
      justificativa: m.justificativa,
      autor: m.autor,
      em: m.em,
    });
    grupos.set(k, lista);
  }
  return grupos;
}

/** A marcação que vale (a mais recente marca «cumprida»), ou `null`. */
export function marcadaAMao(
  historico: readonly MarcacaoNoHistorico[] | undefined,
): MarcacaoNoHistorico | null {
  const ultima = historico?.[0];
  return ultima !== undefined && ultima.situacao === "cumprida" ? ultima : null;
}

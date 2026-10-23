/**
 * O calendário: a quem uma linha se aplica e de que tipo ela é — spec 023 (Bloco 8).
 *
 * > **RN-EVT-02.** Um evento global (feriado) só desconta capacidade de cálculo quando seu impacto está marcado como
 * > "Dia Inteiro"; impacto parcial ou informativo não desconta nada. **Risco: Médio.**
 *
 * ⚠️ **O IMPACTO CONTINUA COM QUEM JÁ O DECIDE** (`andamentoDaTurma`, `motivoDoBloqueio`): aqui só se decide a quem a
 *    linha se aplica. A regra acima não muda.
 * ⚠️ **SEM TURMA ESCOLHIDA, A LINHA VALE PARA TODAS** (D-3): é o comportamento de antes do Bloco 8 e o de todo dado
 *    existente. Com turmas escolhidas, só para elas — e isso vale para TODO leitor do calendário (D-4).
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/** Uma ligação da linha a uma turma, como o banco a guarda (`feriado_turma`). */
export type LigacaoComTurma = { readonly turma_id: string; readonly status: string };

/** As turmas escolhidas ATIVAS da linha; a lista vazia quer dizer todas as turmas. */
export function turmasEscolhidas(
  ligacoes: readonly LigacaoComTurma[] | null | undefined,
): readonly string[] {
  return (ligacoes ?? []).filter((l) => l.status === "ativo").map((l) => l.turma_id);
}

/** A linha alcança a turma? Sem turma escolhida, sim. */
export function alcancaTurma(escolhidas: readonly string[], turmaId: string): boolean {
  return escolhidas.length === 0 || escolhidas.includes(turmaId);
}

/** As linhas que alcançam a turma, na ordem em que chegaram. */
export function feriadosDaTurma<T extends { readonly turmas: readonly string[] }>(
  linhas: readonly T[],
  turmaId: string,
): T[] {
  return linhas.filter((l) => alcancaTurma(l.turmas, turmaId));
}

/** As datas das linhas que alcançam a turma — o insumo de `andamentoDaTurma`. */
export function datasQueAlcancam(
  linhas: readonly { readonly data: string; readonly turmas: readonly string[] }[],
  turmaId: string,
): string[] {
  return feriadosDaTurma(linhas, turmaId).map((l) => l.data);
}

/**
 * A sigla do tipo: a da coluna (`tipo_parada_id`, Bloco 8); sem ela, a do prefixo *"<sigla> — "* do nome, quando a
 * sigla é da lista — a mesma leitura que `vw_dias_parados_turma` faz desde a spec 014 —; senão, `null` (*"não
 * informado"*). Não se infere tipo de palavra solta no nome (D-2).
 */
export function tipoDaLinha(
  linha: { readonly tipo: string | null; readonly descricao: string },
  siglasConhecidas: readonly string[],
): string | null {
  if (linha.tipo !== null) return linha.tipo;
  const prefixo = /^(\S+) — /.exec(linha.descricao)?.[1];
  return prefixo !== undefined && siglasConhecidas.includes(prefixo) ? prefixo : null;
}

/** *"Todas as turmas"*, ou os códigos das escolhidas, na ordem recebida. */
export function rotuloDaAbrangencia(codigosEscolhidos: readonly string[]): string {
  return codigosEscolhidos.length === 0 ? "Todas as turmas" : codigosEscolhidos.join(", ");
}

/** Uma posição ocupada na grade (`vw_ocupacao_ta`): o dia e a turma. */
export type OcupacaoDoDia = { readonly data: string; readonly turma_id: string | null };

/**
 * As linhas de dia inteiro ATIVAS que caem sobre dia com lançamento nas turmas que alcançam — o aviso do sininho
 * (FR-013, D-15). Os lançamentos ficam (`RN-EVT-04`, emenda D-AA-13): o aviso só diz que o dia está bloqueado para
 * aula nova e já tem o que foi lançado antes, para quem cuida do calendário conferir.
 */
export function diasBloqueadosComLancamento(
  linhas: readonly {
    readonly codigo: string;
    readonly data: string;
    readonly descricao: string;
    readonly turmas: readonly string[];
  }[],
  ocupacoes: readonly OcupacaoDoDia[],
): { codigo: string; data: string; descricao: string; lancamentos: number }[] {
  return linhas.flatMap((l) => {
    const lancamentos = ocupacoes.filter(
      (o) => o.data === l.data && o.turma_id !== null && alcancaTurma(l.turmas, o.turma_id),
    ).length;
    return lancamentos > 0
      ? [{ codigo: l.codigo, data: l.data, descricao: l.descricao, lancamentos }]
      : [];
  });
}

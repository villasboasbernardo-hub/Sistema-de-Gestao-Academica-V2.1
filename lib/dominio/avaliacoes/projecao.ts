/**
 * O alerta de projeção da disciplina na turma (FR-031.11 da spec 014):
 *
 * > *"restam X TA; faltam N avaliações (Y TA) → sobram Z TA para aula", com X = CH − cumprido, Y = tempo previsto
 * > das avaliações ainda não aplicadas e Z = X − Y. Z negativo é alerta de estouro, nunca bloqueio. Avaliação sem
 * > tempo definido entra em N e não em Y, e o texto diz quantas.*
 *
 * ⚠️ **ESTOURO É ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`): nada no lançamento consulta este módulo.
 * ⚠️ TypeScript puro (Princípio II).
 */

export type AvaliacaoQueFalta = { rotulo: string; tempo: number | null };

export type ProjecaoDaDisciplina = {
  restam: number;
  faltam: number;
  tempoQueFalta: number;
  semTempo: number;
  sobram: number;
  estouro: boolean;
  frase: string;
};

export function projecaoDaDisciplina(entrada: {
  ch: number;
  cumprido: number;
  /** As avaliações previstas ainda não aplicadas (prova e trabalho; a OD não tem aplicação). */
  faltam: readonly AvaliacaoQueFalta[];
}): ProjecaoDaDisciplina {
  const restam = entrada.ch - entrada.cumprido;
  const faltam = entrada.faltam.length;
  const tempoQueFalta = entrada.faltam.reduce((s, a) => s + (a.tempo ?? 0), 0);
  const semTempo = entrada.faltam.filter((a) => a.tempo === null).length;
  const sobram = restam - tempoQueFalta;
  const avaliacoes = faltam === 1 ? "falta 1 avaliação" : `faltam ${faltam} avaliações`;
  let frase = `restam ${restam} TA; ${avaliacoes} (${tempoQueFalta} TA) → sobram ${sobram} TA para aula`;
  if (semTempo > 0)
    frase += semTempo === 1 ? " (1 sem tempo definido)" : ` (${semTempo} sem tempo definido)`;
  if (sobram < 0) frase += " — estouro";
  return { restam, faltam, tempoQueFalta, semTempo, sobram, estouro: sobram < 0, frase };
}

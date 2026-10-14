/**
 * O histórico da v2.0: as avaliações planejadas casadas com as avaliações lançadas **por nome normalizado**.
 *
 * > *"O catálogo de avaliações planejadas é estático e correspondido às avaliações realmente agendadas por casamento
 * > de nome normalizado (maiúsculas, sem acento, tolerante a abreviação em qualquer direção) — nunca por um
 * > identificador rígido 1:1. Uma matéria planejada sem correspondência encontrada é reportada como «Sem
 * > correspondência», nunca escondida ou descartada."* — `RN-AVAL-01`, documento 04
 *
 * ⚠️ **SÓ PARA O HISTÓRICO** (FR-039.1 da spec 014): a avaliação ligada a um item do currículo
 * (`avaliacao_curriculo_id`) não passa por aqui — o vínculo dela é explícito.
 *
 * ⚠️ **A NORMALIZAÇÃO NÃO É REIMPLEMENTADA EM TS**: a chave chega pronta do banco —
 * `avaliacoes_planejadas.nome_normalizado` (coluna gerada por `app.normalizar_texto`) e o nome da disciplina
 * normalizado pela mesma função. Aqui só se compara. *"Tolerante a abreviação em qualquer direção"* é
 * lido como: uma chave começa com a outra, palavra a palavra (*"navegacao cost"* casa *"navegacao costeira"*,
 * nos dois sentidos).
 * ⚠️ TypeScript puro (Princípio II).
 */

export type PlanejadaDoHistorico = { id: string; cursoId: string; nomeNormalizado: string | null };
export type AvaliacaoDoHistorico = {
  id: string;
  cursoId: string;
  /** Nome da disciplina da avaliação, normalizado pelo banco. */
  disciplinaNomeNormalizado: string | null;
  /** A avaliação ligada ao currículo fica fora do casamento por nome. */
  ligadaAoCurriculo: boolean;
};

export type CasamentoDoHistorico = {
  planejadaId: string;
  avaliacoes: string[];
  situacao: "casada" | "sem_correspondencia";
};

function abrevia(curta: string, longa: string): boolean {
  const a = curta.split(" ");
  const b = longa.split(" ");
  if (a.length > b.length) return false;
  return a.every((p, i) => b[i]!.startsWith(p));
}

export function casaPorNome(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b || abrevia(a, b) || abrevia(b, a);
}

export function casarHistorico(entrada: {
  planejadas: readonly PlanejadaDoHistorico[];
  avaliacoes: readonly AvaliacaoDoHistorico[];
}): CasamentoDoHistorico[] {
  return entrada.planejadas.map((p) => {
    const casadas = entrada.avaliacoes
      .filter(
        (a) =>
          !a.ligadaAoCurriculo &&
          a.cursoId === p.cursoId &&
          casaPorNome(p.nomeNormalizado, a.disciplinaNomeNormalizado),
      )
      .map((a) => a.id);
    return {
      planejadaId: p.id,
      avaliacoes: casadas,
      situacao: casadas.length > 0 ? "casada" : "sem_correspondencia",
    };
  });
}

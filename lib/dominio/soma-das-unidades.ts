/**
 * `FR-062` — a soma das Unidades de Ensino contra a CH da disciplina.
 *
 * ⚠️ **AVISA, NÃO BLOQUEIA** (`RN-DEG-02`, regra 6). O invariante do catálogo fecha em **134/134**
 * nos currículos da DEnsM — mas o currículo é construído ao longo do ano, e uma disciplina com as
 * UEs pela metade é um estado **normal de trabalho**, não um erro. Transformar o aviso em `CHECK`
 * impediria de gravar a primeira UE de qualquer disciplina, já que uma UE sozinha nunca fecha a CH.
 *
 * ⚠️ **E CURSO OU DISCIPLINA SEM UE NÃO AVISA NADA** (`FR-061`, decisão D-B3). Ter UE é **dado**, não
 * dedução: 138 das 175 disciplinas reais têm; as demais simplesmente não fazem parte dos currículos
 * extraídos. Avisar *"faltam unidades"* nas 37 restantes seria inventar uma pendência que ninguém
 * tem — e é por isso que a ausência devolve `null` em vez de um aviso vazio.
 *
 * Módulo **puro**.
 */

export type ConferenciaDaSoma = {
  readonly unidades: number;
  readonly somaTempos: number;
  readonly cargaHorariaTempos: number;
  readonly diferenca: number;
  readonly fecha: boolean;
  /** A frase para a tela. `null` quando fecha. */
  readonly aviso: string | null;
};

export type UnidadeParaSomar = {
  readonly chPrevistaTempos: number;
  /** ⚠️ UE inativa **não entra na soma** — exclusão é lógica, e a linha continua no banco. */
  readonly ativa: boolean;
};

/**
 * Confere a soma. Devolve `null` quando **não há UE nenhuma** — que não é pendência (`FR-061`).
 */
export function conferirSomaDasUnidades(
  unidades: readonly UnidadeParaSomar[],
  cargaHorariaTempos: number,
): ConferenciaDaSoma | null {
  const ativas = unidades.filter((u) => u.ativa);
  if (ativas.length === 0) return null;

  const somaTempos = ativas.reduce((total, u) => total + u.chPrevistaTempos, 0);
  const diferenca = somaTempos - cargaHorariaTempos;
  const fecha = diferenca === 0;

  return {
    unidades: ativas.length,
    somaTempos,
    cargaHorariaTempos,
    diferenca,
    fecha,
    aviso: fecha
      ? null
      : diferenca < 0
        ? `As ${ativas.length} unidades somam ${somaTempos} TA e a disciplina tem ` +
          `${cargaHorariaTempos} TA — faltam ${Math.abs(diferenca)} TA para fechar.`
        : `As ${ativas.length} unidades somam ${somaTempos} TA e a disciplina tem ` +
          `${cargaHorariaTempos} TA — passam ${diferenca} TA da carga horária.`,
  };
}

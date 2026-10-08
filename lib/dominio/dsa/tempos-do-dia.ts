/**
 * `RF-DSA-04` — **em qual tempo o lançamento começa**: os Tempos de Aula do dia, com o horário de
 * cada um (item 1d do comando de correções do DSA, decisão de Bernardo Villas Boas de 08/10/2026).
 *
 * > *"d) EM QUAL TEMPO COMEÇA: lista dos TA do dia com o horário de cada um, vindo pré-selecionado
 * > pela célula clicada e editável."*
 *
 * ⚠️ **A CÉLULA CLICADA DEIXOU DE SER A ÚNICA FONTE DO TA INICIAL.** Até 08/10/2026 o formulário só
 * mostrava o tempo da célula, e trocar de tempo era fechar e clicar em outra. Agora ela continua sendo
 * o **ponto de partida** — vem pré-selecionada —, e a lista deixa escolher outro.
 *
 * ⚠️ **O HORÁRIO SAI DO RELÓGIO JÁ MONTADO NA GRADE**, nunca recalculado aqui: a célula traz o trecho
 * (`montarSemana` → `tempoDeAula`). Sem relógio (`RN-DEG-01`), o tempo sai **numerado**, sem horário
 * — inventar horário seria o que não se pode.
 *
 * ⚠️ **O TEMPO OCUPADO CONTINUA NA LISTA, MARCADO.** Escolhê-lo não é recusado: a sobreposição dentro
 * da turma é aviso (`sobreposicao.ts`), e esconder a opção esconderia também o porquê.
 *
 * ⚠️ **TypeScript puro.** O dia chega pronto, de `montarSemana`.
 */
import type { DiaDaGrade } from "./grade";

export type TempoParaEscolher = {
  readonly ta: number;
  readonly rotulo: string;
  readonly ocupado: boolean;
};

/** Os tempos do dia, na ordem — `linhas` é quantos TA a grade da semana tem. */
export function temposParaEscolher(
  dia: DiaDaGrade | undefined,
  linhas: number,
): readonly TempoParaEscolher[] {
  const tempos: TempoParaEscolher[] = [];
  for (let ta = 1; ta <= Math.max(linhas, 1); ta += 1) {
    const celula = dia?.celulas[ta - 1];
    const horario = celula?.horario ?? null;
    const ocupado = celula?.estado === "ocupada" || celula?.estado === "continuacao";
    tempos.push({
      ta,
      rotulo:
        `${ta}º tempo` +
        (horario ? ` · ${horario.inicio}–${horario.fim}` : "") +
        (ocupado ? " · ocupado" : ""),
      ocupado,
    });
  }
  return tempos;
}

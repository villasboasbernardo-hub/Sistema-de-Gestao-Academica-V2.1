/**
 * `FR-060` e `FR-061` — **ter Unidade de Ensino é DADO, nunca dedução** (decisão D-B3, 24/09/2026).
 *
 * ⚠️ **ESTE MÓDULO EXISTE PARA IMPEDIR UMA INFERÊNCIA TENTADORA.** Das 175 disciplinas reais, **138
 * têm UE** e 37 não têm; dos 24 cursos, uns aparecem nos currículos da DEnsM e outros não. É muito
 * fácil escrever *"curso expedito não tem UE"* ou *"disciplina curta não tem UE"* e acertar na
 * maioria — e é exatamente por acertar na maioria que a regra inventada passaria despercebida. A
 * resposta é olhar se **há linha em `unidades_ensino`**, e nada mais.
 *
 * ⚠️ **A CONSEQUÊNCIA NA TELA É "NÃO RENDERIZAR", NÃO "AVISAR"** (`FR-061`). Disciplina sem UE não
 * mostra a seção de unidades **nem** um aviso de que faltam: avisar inventaria uma pendência que
 * ninguém tem. A diferença entre *"não há"* e *"está incompleto"* é a mesma do gotcha 4, noutro
 * lugar.
 *
 * Módulo **puro**.
 */

export type DisciplinaComUnidades = {
  readonly disciplinaId: string;
  /** Quantas UEs **ativas** a disciplina tem. Zero = a seção não existe para ela. */
  readonly unidadesAtivas: number;
};

/**
 * A disciplina participa do modelo de currículo?
 *
 * ⚠️ É uma pergunta sobre **dado presente**, e a função existe para que a resposta tenha um nome — em
 * vez de um `> 0` solto espalhado por três telas, que é como uma regra inventada se instala.
 */
export function disciplinaTemCurriculo(disciplina: DisciplinaComUnidades): boolean {
  return disciplina.unidadesAtivas > 0;
}

/**
 * O curso participa do modelo de currículo?
 *
 * ⚠️ **BASTA UMA disciplina com UE**, e não "todas". Um curso em que só parte das disciplinas foi
 * extraída dos currículos **tem** currículo — o que falta é completá-lo, e esconder a seção do curso
 * inteiro tiraria da pessoa justamente a tela onde ela completaria.
 */
export function cursoTemCurriculo(disciplinas: readonly DisciplinaComUnidades[]): boolean {
  return disciplinas.some(disciplinaTemCurriculo);
}

/**
 * As disciplinas do curso que **ainda não** têm UE, para a tela oferecer o caminho de criá-las.
 *
 * ⚠️ **SÓ FAZ SENTIDO QUANDO O CURSO JÁ TEM CURRÍCULO.** Num curso sem nenhuma UE, esta lista seria
 * *todas* as disciplinas, e apresentá-la seria o aviso que o `FR-061` proíbe. Quem chama confere
 * `cursoTemCurriculo` antes — e a função devolve vazio nesse caso, para que o descuido não vire
 * ruído na tela.
 */
export function disciplinasSemUnidade(
  disciplinas: readonly DisciplinaComUnidades[],
): readonly DisciplinaComUnidades[] {
  if (!cursoTemCurriculo(disciplinas)) return [];
  return disciplinas.filter((d) => !disciplinaTemCurriculo(d));
}

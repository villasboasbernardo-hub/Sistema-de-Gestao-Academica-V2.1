/**
 * RT-6 — **o selecionado tem ano; o habilitado não** (Bloco 10, spec 025, conferência do PR #90).
 *
 * > *"Regra: habilitado não tem ano (disciplina marcada na ficha); SELECIONADO tem ano = instrutor designado para
 * > disciplina em turma cujo ano é o escolhido. Em 2027 sem turma: 0 selecionados, e todos os cartões e gráficos de
 * > Instrutores (status da seleção, habilitados × selecionados) e a ficha do instrutor recalculam pelo ano."*
 * > — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **A COLUNA `vw_instrutores.selecionado` NÃO TEM ANO** (migration `20260915091717`): ela vale para qualquer
 *    atribuição ativa, de qualquer turma — e em 2027, sem turma designada, a lista mostrava os 34 de 2026. A view fica
 *    como está (recriá-la mudaria o resultado de algo em tela, e é portão); quem decide o ano é esta função, sobre as
 *    designações lidas com o ano da turma.
 * ⚠️ **O ANO É O DA TURMA** (`turmas.ano_letivo`), não o da janela da disciplina: é o que a regra diz — e a regra vale
 *    para o sistema todo (RT-6, 24/10/2026): *"o ano de qualquer informação ligada a turma é o ANO DA TURMA, nunca a
 *    data do registro ou a janela da atribuição"*.
 * ⚠️ **OS FILTROS CURSO E CLASSIFICAÇÃO TAMBÉM** (D-39 invertida, 24/10/2026): *"só pelas designações do ano
 *    escolhido"* — antes casavam a habilitação OU a atribuição de qualquer ano (`cursos_vinculados` da view).
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Uma designação ativa — instrutor numa linha de turma ativa —, com o ano e o curso da turma. */
export type DesignacaoComAno = {
  readonly instrutorId: string;
  /** `turmas.ano_letivo`; nulo quando a leitura não trouxe a turma. */
  readonly anoDaTurma: number | null;
  /** A sigla do curso da turma (`cursos.codigo`). */
  readonly cursoCodigo?: string | null;
  /** A classificação do curso da turma. */
  readonly classificacao?: string | null;
};

/** Os instrutores designados para disciplina em turma do ano escolhido. */
export function selecionadosNoAno(
  designacoes: readonly DesignacaoComAno[],
  ano: number,
): ReadonlySet<string> {
  return new Set(designacoes.filter((d) => d.anoDaTurma === ano).map((d) => d.instrutorId));
}

/**
 * O filtro *Selecionado* da lista (`?selecionado=sim|nao`) pelo ano: *sim* fica com os selecionados no ano, *não* com
 * os demais; vazio não filtra. É aplicado sobre a lista em memória, e não na consulta — a lista de ids na URL da
 * interface de dados já derrubou a leitura com a base real (`consulta.ts`).
 */
export function filtrarPorSelecao<T extends { readonly id: string | null }>(
  linhas: readonly T[],
  selecionados: ReadonlySet<string>,
  filtro: string,
): readonly T[] {
  const selecionado = (l: T) => l.id !== null && selecionados.has(l.id);
  if (filtro === "sim") return linhas.filter(selecionado);
  if (filtro === "nao") return linhas.filter((l) => !selecionado(l));
  return linhas;
}

/**
 * Os instrutores do recorte de *Curso* e *Classificação* — designados em turma DO ANO desse curso (ou de curso dessa
 * classificação). Com os dois, vale o E lógico, cada um pela sua designação, como os dois predicados de antes. Sem
 * nenhum dos dois, `null`: não há recorte.
 */
export function noRecorteDeCurso(
  designacoes: readonly DesignacaoComAno[],
  ano: number,
  filtro: { readonly curso: string; readonly classificacao: string },
): ReadonlySet<string> | null {
  if (filtro.curso === "" && filtro.classificacao === "") return null;
  const doAno = designacoes.filter((d) => d.anoDaTurma === ano);
  const quem = (casa: (d: DesignacaoComAno) => boolean) =>
    new Set(doAno.filter(casa).map((d) => d.instrutorId));
  const porCurso = filtro.curso === "" ? null : quem((d) => d.cursoCodigo === filtro.curso);
  const porClassificacao =
    filtro.classificacao === "" ? null : quem((d) => d.classificacao === filtro.classificacao);
  if (porCurso === null) return porClassificacao;
  if (porClassificacao === null) return porCurso;
  return new Set([...porCurso].filter((id) => porClassificacao.has(id)));
}

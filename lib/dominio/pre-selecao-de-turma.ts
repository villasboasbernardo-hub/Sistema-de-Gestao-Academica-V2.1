/**
 * `FR-006.1` — qual turma a página do curso abre quando `?turma=` não veio.
 *
 * > *"Quando `?turma=` está ausente, a turma pré-selecionada MUST ser decidida **pela janela de
 * > datas, não pelo status** (Q-28, 16/09/2026), nesta ordem: 1. a turma cuja janela **contém hoje**
 * > (`data_inicio ≤ hoje ≤ data_termino`); 2. se nenhuma, a de **início mais próximo no futuro**;
 * > 3. em empate, a de **início mais recente**; 4. turma `concluida` ou `cancelada` **nunca** é
 * > pré-selecionada; 5. se nenhuma sobrar, a página abre **sem turma selecionada**, e o seletor
 * > **pede a escolha**. Curso com **uma única** turma abre **nela**, sem seletor — sem seletor não há
 * > outra escolha (`RF-CURSO-01`)."*
 * > — `FR-006.1` da spec 009
 *
 * ⚠️ **POR QUE A JANELA E NÃO O STATUS:** *"a navegação não pode depender de um campo que a própria
 * decisão anterior não garante. A janela é fato."* O status é manual e livre (`FR-028`), e entra
 * **só como veto**.
 *
 * ⚠️ **HOJE É ARGUMENTO** (`FR-043`). Lido do relógio aqui dentro, o veredito mudaria à meia-noite e
 * o teste verde de hoje reprovaria amanhã sem ninguém ter tocado no código.
 *
 * ⚠️ **JANELA ABERTA NUMA PONTA CONTA COMO "CONTÉM HOJE".** O requisito escreve a forma fechada;
 * uma turma que começou e não tem término é uma turma **em andamento**, e lê-la como "não contém"
 * faria a página de um curso corrente abrir sem turma. É a mesma leitura que
 * `app.lancamentos_que_travam_vigencia()` faz das janelas nesta mesma fatia — duas leituras
 * diferentes da mesma janela, no mesmo PR, divergiriam em silêncio.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O mínimo que uma turma precisa trazer para entrar na decisão. */
export type TurmaParaSelecao = {
  readonly codigo: string;
  readonly status: string;
  /** `yyyy-mm-dd`, ou nulo. */
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
};

/** Os status que impedem a pré-seleção — o veto do item 4. */
const VETADOS: readonly string[] = ["concluida", "cancelada"];

/** A janela alcança `hoje`? Ponta ausente é ponta aberta. */
function contemHoje(t: TurmaParaSelecao, hoje: string): boolean {
  if (t.dataInicio === null && t.dataTermino === null) return false;
  if (t.dataInicio !== null && t.dataInicio > hoje) return false;
  if (t.dataTermino !== null && t.dataTermino < hoje) return false;
  return true;
}

/**
 * Desempata pelo **início mais recente**, e depois pelo código.
 *
 * ⚠️ O SEGUNDO CRITÉRIO NÃO ESTÁ NO REQUISITO, e existe para a função ser **determinística**: duas
 * turmas com a mesma data de início empatariam para sempre, e a página abriria numa delas conforme a
 * ordem que o banco devolvesse — que é a definição de comportamento não reprodutível.
 */
function maisRecente(a: TurmaParaSelecao, b: TurmaParaSelecao): TurmaParaSelecao {
  const ia = a.dataInicio ?? "";
  const ib = b.dataInicio ?? "";
  if (ia !== ib) return ia > ib ? a : b;
  return a.codigo <= b.codigo ? a : b;
}

/** Devolve o `codigo` da turma a pré-selecionar, ou `null` quando a página abre sem seleção. */
export function preSelecionarTurma(
  turmas: readonly TurmaParaSelecao[],
  hoje: string,
): string | null {
  /*
   * ⚠️ O CURSO DE UMA TURMA ABRE NELA, E O VETO NÃO SE APLICA. O requisito é explícito, e a razão é
   * de interface: sem seletor não há outra escolha, e abrir "sem turma" num curso que só tem uma
   * deixaria a tela vazia sem que houvesse o que escolher.
   */
  if (turmas.length === 1) return turmas[0]?.codigo ?? null;

  const elegiveis = turmas.filter((t) => !VETADOS.includes(t.status));
  if (elegiveis.length === 0) return null;

  const correntes = elegiveis.filter((t) => contemHoje(t, hoje));
  if (correntes.length > 0) return correntes.reduce(maisRecente).codigo;

  const futuras = elegiveis.filter((t) => t.dataInicio !== null && t.dataInicio > hoje);
  if (futuras.length === 0) return null;

  // A mais próxima: o menor início futuro. Em empate, o código decide — ver `maisRecente`.
  return futuras.reduce((a, b) => {
    const ia = a.dataInicio as string;
    const ib = b.dataInicio as string;
    if (ia !== ib) return ia < ib ? a : b;
    return a.codigo <= b.codigo ? a : b;
  }).codigo;
}

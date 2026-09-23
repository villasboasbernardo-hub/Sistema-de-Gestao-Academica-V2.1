/**
 * `FR-034` / `FR-035` — o rótulo e a ordem das turmas no seletor.
 *
 * > *"O **rótulo** exibido MUST existir para **toda** turma, inclusive as 18 sem `T1`/`T2`. […]
 * > **decidido em 17/09/2026 (A-13): o código da turma e o status**, `C-ApA-PCN-PR-EAD T2 2026 ·
 * > Ativa`. O código nunca é nulo (28 de 28) e é o mesmo identificador da URL; a `vw_turmas_rotulo`
 * > **não** é usada (D-3)."*
 * > — `FR-034` da spec 009
 *
 * > *"**decidido em 17/09/2026 (A-14): entram as quatro situações**, na ordem **ano letivo
 * > decrescente, data de início decrescente (sem data por último), código**. Sem pré-filtro por
 * > situação: o status é manual e está incoerente em 11 de 28, e a pré-seleção já veta `concluida` e
 * > `cancelada` (`FR-006.1`)."*
 * > — `FR-035` da spec 009
 *
 * ⚠️ **QUEM ORDENA É QUEM CHAMA** (`FR-033`). O componente `components/ciaara/seletor-turma.tsx`
 * exibe a lista como ela chega; a ordem é esta função, e mora aqui para ser exercitada sem tela.
 *
 * ⚠️ **SEM DATA VAI POR ÚLTIMO, e não por primeiro.** Numa ordenação decrescente, tratar a ausência
 * como "menor que tudo" a jogaria para o topo — e a turma sem janela abriria a lista.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O mínimo que uma turma precisa trazer para o seletor. */
export type TurmaNoSeletor = {
  readonly codigo: string;
  readonly ano: number;
  /** `yyyy-mm-dd`, ou nulo. */
  readonly dataInicio: string | null;
  readonly status: string;
};

/**
 * O nome de tela de cada situação.
 *
 * ⚠️ **ESTE É O ÚNICO LUGAR ONDE ELES SÃO ESCRITOS.** A aba "Grade" consome daqui — duas listas dos
 * mesmos quatro nomes divergiriam no dia em que alguém corrigisse uma, e a tabela diria "Concluída"
 * enquanto o seletor dizia outra coisa para a mesma turma.
 */
export const ROTULO_DO_STATUS_DE_TURMA: Readonly<Record<string, string>> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/**
 * `código · Status` — o rótulo de uma opção do seletor.
 *
 * ⚠️ **ELE NUNCA SAI VAZIO.** É a razão inteira de a `vw_turmas_rotulo` ter sido recusada: ela
 * devolve `NULL` em 18 das 28 turmas, e um seletor com 18 opções em branco é um seletor inutilizável
 * para quem mais precisa dele.
 *
 * ⚠️ **STATUS DESCONHECIDO DEGRADA PARA O VALOR BRUTO**, e não some. Um domínio novo no banco não
 * pode produzir opção pela metade (`RN-DEG-01`).
 */
export function rotuloDaTurma(turma: TurmaNoSeletor): string {
  const situacao = ROTULO_DO_STATUS_DE_TURMA[turma.status] ?? turma.status;
  const codigo = turma.codigo.trim() === "" ? "(sem código)" : turma.codigo;
  return `${codigo} · ${situacao}`;
}

/**
 * A ordem do `FR-035`: ano ↓, início ↓ (sem data por último), código ↑.
 *
 * ⚠️ **ELA NÃO ALTERA A LISTA RECEBIDA.** Ordenar no lugar mudaria a lista de quem chamou — e o
 * mesmo arranjo passaria a alimentar a tabela e o seletor com ordens diferentes conforme quem
 * rodasse primeiro.
 */
export function ordenarTurmasParaSeletor<T extends TurmaNoSeletor>(
  turmas: readonly T[],
): readonly T[] {
  return [...turmas].sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;

    // Ausência por último, nos dois sentidos — nunca "menor que tudo".
    if (a.dataInicio === null && b.dataInicio !== null) return 1;
    if (a.dataInicio !== null && b.dataInicio === null) return -1;
    if (a.dataInicio !== null && b.dataInicio !== null && a.dataInicio !== b.dataInicio) {
      return a.dataInicio < b.dataInicio ? 1 : -1;
    }

    return a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0;
  });
}

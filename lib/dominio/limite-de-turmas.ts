/**
 * `FR-030` / `FR-030.1` — o limite de turmas por **ano letivo**.
 *
 * > *"O **limite de turmas por ano** é **regra**: **1 por ano letivo para curso Regular, 2 por ano
 * > letivo para as demais classificações** […]. ⚠️ **É POR ANO LETIVO, NUNCA TOTAL.** Um curso
 * > regular pode ter uma turma em 2026 e outra em 2027; a contagem para efeito do limite considera
 * > **apenas as turmas daquele ano letivo**."*
 * > — `FR-003.2` da spec 009
 *
 * ⚠️ **ELE É ALERTA, NUNCA BLOQUEIO** (`RN-DEG-02`, regra 6 do `CLAUDE.md`). A gravação passa; o que
 * o limite produz é uma confirmação e uma linha no quadro de avisos. Transformá-lo em `CHECK`
 * mudaria a regra de negócio.
 *
 * ⚠️ **A ENUMERAÇÃO É POSITIVA, E ISSO É A REGRA — não estilo.** `STATUS_QUE_CONTAM` lista os três;
 * escrever *"≠ cancelada"* daria o mesmo resultado hoje e passaria a contar, sozinha, qualquer status
 * que o domínio ganhasse depois. O teste prova a diferença com um status inventado.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Os status que ocupam vaga no ano. Enumeração positiva, nunca negação. */
export const STATUS_QUE_CONTAM = ["planejada", "ativa", "concluida"] as const;

/** O mínimo que uma turma precisa trazer para a contagem. */
export type TurmaParaLimite = {
  readonly ano: number;
  readonly status: string;
};

/** Um ano em que a contagem passa do limite — o que o diálogo e o quadro mostram. */
export type AnoAcimaDoLimite = {
  readonly ano: number;
  readonly turmas: number;
  readonly limite: number;
};

const conta = (status: string): boolean =>
  (STATUS_QUE_CONTAM as readonly string[]).includes(status);

/** Quantas turmas ocupam vaga naquele ano letivo. */
export function contarNoAno(turmas: readonly TurmaParaLimite[], ano: number): number {
  return turmas.filter((t) => t.ano === ano && conta(t.status)).length;
}

/**
 * A gravação de uma turma passa do limite do ano?
 *
 * ⚠️ **A CONTAGEM RECEBIDA É A DE ANTES DA GRAVAÇÃO**, e por isso a comparação é `>=`: com duas
 * turmas e limite 2, a terceira é que estoura. Comparar `>` avisaria uma turma tarde — e o aviso
 * chegaria depois de o teto já ter sido passado.
 */
export function passaDoLimite(
  turmas: readonly TurmaParaLimite[],
  ano: number,
  limite: number | null,
): AnoAcimaDoLimite | null {
  if (limite === null) return null;
  const contagem = contarNoAno(turmas, ano);
  return contagem >= limite ? { ano, turmas: contagem, limite } : null;
}

/**
 * Os anos em que **baixar o limite do curso** o deixaria abaixo da contagem — um por ano afetado.
 *
 * ⚠️ **EM ORDEM CRESCENTE DE ANO.** Um diálogo cuja lista muda de ordem entre duas aberturas faz a
 * pessoa reler tudo para achar o que já tinha lido.
 */
export function anosAcimaDoLimite(
  turmas: readonly TurmaParaLimite[],
  limite: number | null,
): AnoAcimaDoLimite[] {
  if (limite === null) return [];
  const anos = [...new Set(turmas.filter((t) => conta(t.status)).map((t) => t.ano))].sort(
    (a, b) => a - b,
  );
  return anos
    .map((ano) => ({ ano, turmas: contarNoAno(turmas, ano), limite }))
    .filter((a) => a.turmas > limite);
}

/**
 * A frase do diálogo de confirmação (`FR-030`).
 *
 * ⚠️ **ELA PERGUNTA, E NÃO PROÍBE.** É o teto normativo virando alerta: quem confirma, grava.
 */
export function mensagemDoDialogo({ ano, turmas, limite }: AnoAcimaDoLimite): string {
  return `Este curso já tem ${turmas} turma(s) em ${ano}, e o limite é ${limite}; confirmar mesmo assim?`;
}

/** A mesma informação no quadro de avisos do curso — informa, não pergunta. */
export function mensagemDoQuadro({ ano, turmas, limite }: AnoAcimaDoLimite): string {
  return `${ano}: ${turmas} turmas, limite ${limite}`;
}

/**
 * Os DSA da semana no Início — spec 019 (Bloco 4), C-8, C-10 e C-11.
 *
 * Regras que este módulo aplica, e de onde cada uma vem:
 *
 * - **Turma EAD pura não tem DSA** (item 9 da conferência do PR #40, 08/10/2026; `ehEadPuro`): ela não entra.
 * - **`D-DSA-2`** — *"a turma semipresencial só tem DSA na etapa presencial"* (Bernardo Villas Boas, 08/10/2026): a
 *   semana fora da etapa não tem DSA; **sem etapa cadastrada, o DSA aparece com aviso** — e por isso ela entra
 *   (`etapaDaSemana`).
 * - **D-COR-5** (16/10/2026) — a turma arquivada some das listas: ela não entra.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** A semana chega por parâmetro (`semanaDoPainel` com o
 *    dia de São Paulo, de quem chama).
 */
import { ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import { etapaDaSemana } from "@/lib/dominio/dsa/etapa-presencial";

export type TurmaParaODsaDaSemana = {
  readonly status: string;
  readonly modalidade: string | null;
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
  readonly inicioEtapaPresencial: string | null;
  readonly terminoEtapaPresencial: string | null;
  readonly arquivada: boolean;
};

/**
 * A turma tem DSA nesta semana? (C-8)
 *
 * ⚠️ **AS DUAS PONTAS DA JANELA SÃO EXIGIDAS**: sem início ou sem término, não há como dizer que a semana é dela — e o
 *    carrossel não anuncia DSA que ninguém sabe se existe.
 */
export function temDsaNaSemana(turma: TurmaParaODsaDaSemana, dias: readonly string[]): boolean {
  if (turma.arquivada || turma.status === "cancelada" || ehEadPuro(turma.modalidade)) return false;
  if (turma.dataInicio === null || turma.dataTermino === null || dias.length === 0) return false;
  const inicio = turma.dataInicio;
  const termino = turma.dataTermino;
  if (!dias.some((d) => d >= inicio && d <= termino)) return false;
  return etapaDaSemana(turma, dias).tipo !== "fora";
}

/** Um lançamento da semana, como `vw_ocupacao_ta` o entrega (a origem, o dia, a disciplina e os TA). */
export type LancamentoDaSemana = {
  readonly origem: string;
  readonly data: string;
  readonly disciplinaId: string | null;
  readonly tempos: number;
};

export type ResumoDoDsa = {
  readonly ta: number;
  readonly dias: number;
  readonly disciplinas: number;
  /** As provas aplicadas na semana (a 1ª sessão). Sessões seguintes e vistas somam TA, não contam prova nova. */
  readonly avaliacoes: number;
  readonly atividades: number;
};

/** O resumo do que está lançado na semana (C-10). */
export function resumoDoDsa(lancamentos: readonly LancamentoDaSemana[]): ResumoDoDsa {
  return {
    ta: lancamentos.reduce((s, l) => s + (Number(l.tempos) || 0), 0),
    dias: new Set(lancamentos.map((l) => l.data)).size,
    disciplinas: new Set(
      lancamentos.map((l) => l.disciplinaId).filter((d): d is string => d !== null),
    ).size,
    avaliacoes: lancamentos.filter((l) => l.origem === "avaliacao").length,
    atividades: lancamentos.filter((l) => l.origem === "atividade_nao_letiva").length,
  };
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** *"15 TA lançados em 4 dias · 2 disciplinas · 1 avaliação · 1 atividade"*, ou que não há nada ainda. */
export function fraseDoResumo(resumo: ResumoDoDsa): string {
  if (resumo.ta === 0 && resumo.avaliacoes === 0 && resumo.atividades === 0) {
    return "Nada lançado nesta semana ainda";
  }
  const partes = [
    `${plural(resumo.ta, "TA lançado", "TA lançados")} em ${plural(resumo.dias, "dia", "dias")}`,
    plural(resumo.disciplinas, "disciplina", "disciplinas"),
    ...(resumo.avaliacoes > 0 ? [plural(resumo.avaliacoes, "avaliação", "avaliações")] : []),
    ...(resumo.atividades > 0 ? [plural(resumo.atividades, "atividade", "atividades")] : []),
  ];
  return partes.join(" · ");
}

/**
 * O regime de horário da turma — spec 018 (Bloco 3), pedido de Bernardo Villas Boas de 19/10/2026: *"regimes de
 * horário NOMEADOS por curso (…). Cada TURMA escolhe o seu regime (padrão: o regime vigente do curso, para nada
 * mudar em turma que não escolher), e o DSA dela usa esse regime."*
 *
 * Regras que este módulo aplica, e de onde cada uma vem:
 *
 * - **`RF-HOR-02`** — *"O sistema deve tratar como **imutáveis pelo usuário** — por decorrerem do currículo aprovado —
 *   a duração do tempo de aula (45 ou 50 minutos) e a quantidade de tempos de aula por dia."* A imutabilidade mora no
 *   banco (gatilho de `regimes_de_horario`); aqui só se lê.
 * - **`RF-HOR-05`** — *"uma mudança de configuração **não altere nenhum registro já lançado** sob a configuração
 *   anterior."* Sem vigência no regime nomeado, a garantia é a trava: a escolha da turma não muda depois do primeiro
 *   lançamento (banco), e a frase dela está aqui.
 * - **`RN-MAT-04`** — *"A decisão entre tratar uma turma como Presencial, EAD ou Semipresencial para fins de
 *   capacidade diária é sempre tomada pela modalidade real cadastrada na turma, nunca inferida do nome do curso."* O
 *   regime nomeado troca só os TA **presenciais**; a turma EAD continua no limite EAD.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */
import type { RegimeDoCurso } from "@/lib/dominio/andamento-da-turma";

/** O que o regime nomeado da turma traz para as contas. `null` = a turma não escolheu. */
export type RegimeDaTurma = { readonly regimeTempos: number };

/**
 * O regime que o saldo da turma usa: o do curso com os TA presenciais trocados pelos do regime da turma.
 *
 * ⚠️ **DESDE A SPEC 029 (`FR-005`) ELE É O DE PARTIDA, NÃO O DA JANELA INTEIRA**: as semanas com regime gravado, «só
 *    esta semana» ou «desde» no relógio do DSA trocam o TA/dia dos dias delas, em `andamentoDaTurma` (pela mesma
 *    `regimeDaSemana` do DSA). Até o Bloco 14 o saldo usava este regime em todos os dias (D-15 da spec 026).
 *
 * ⚠️ **SEM ESCOLHA, DEVOLVE O DO CURSO INTEIRO** — é o que garante *"nada mudar em turma que não escolher"*.
 * ⚠️ **O LIMITE EAD NÃO É TOCADO** (`RN-MAT-04`): `capacidadeDiaria` escolhe pela modalidade da turma.
 */
export function regimeEfetivo(
  doCurso: RegimeDoCurso,
  daTurma: RegimeDaTurma | null,
): RegimeDoCurso {
  if (daTurma === null) return doCurso;
  return { ...doCurso, regimePadraoTempos: daTurma.regimeTempos };
}

/**
 * Os TA do dia nas ações do DSA (alertas, cascata, dia parado): o regime da turma, senão o do curso.
 *
 * ⚠️ **`null` QUANDO NÃO HÁ NENHUM** — a reserva de cada chamador continua sendo a dele (o dia parado usa 8; os
 *    alertas não alertam), exatamente como antes do Bloco 3.
 */
export function temposDoDiaDaTurma(
  temposDaTurma: number | null,
  temposDoCurso: number | null,
): number | null {
  return temposDaTurma ?? temposDoCurso;
}

/** *"Regime B — 9 TA de 45 min"*. */
export function rotuloDoRegime(regime: {
  readonly nome: string;
  readonly regimeTempos: number;
  readonly taDuracaoMin: number;
}): string {
  return `${regime.nome} — ${regime.regimeTempos} TA de ${regime.taDuracaoMin} min`;
}

/**
 * A turma pode escolher regime nomeado? Só a EAD pura fica fora: ela não tem tempos presenciais (C-15). A
 * semipresencial escolhe, porque a etapa presencial dela tem DSA.
 */
export function aceitaRegimeNomeado(modalidade: string | null): boolean {
  return modalidade !== "ead";
}

/** A recusa da troca de regime em turma com lançamento (`RF-HOR-05`, C-8). */
export const FRASE_DA_ESCOLHA_TRAVADA =
  "O regime de horário desta turma não pode mais mudar: ela já tem lançamento no DSA, e trocar o regime " +
  "reinterpretaria o que foi lançado.";

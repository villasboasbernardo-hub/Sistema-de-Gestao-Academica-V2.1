/**
 * A abrangência das linhas do calendário, como as leituras a pedem ao banco — spec 023 (Bloco 8, D-4).
 *
 * ⚠️ **TODA LEITURA DE `feriados` PEDE `feriado_turma` JUNTO** e filtra pela turma antes de decidir bloqueio ou
 *    capacidade: um leitor esquecido contaria o feriado de turmas escolhidas para todas. Guardado por
 *    `tests/unidade/calendario-abrangencia.test.ts`.
 */
import { turmasEscolhidas, type LigacaoComTurma } from "@/lib/dominio/calendario";

/** O embutido do PostgREST: as ligações da linha com turma (as inativas vêm junto; quem filtra é o domínio). */
export const COLUNAS_DA_ABRANGENCIA = "feriado_turma(turma_id, status)";

/** A linha lida, com as turmas escolhidas ativas (vazio = todas as turmas). */
export function comAbrangencia<T extends { feriado_turma?: readonly LigacaoComTurma[] | null }>(
  linha: T,
): Omit<T, "feriado_turma"> & { readonly turmas: readonly string[] } {
  const { feriado_turma: ligacoes, ...resto } = linha;
  return { ...resto, turmas: turmasEscolhidas(ligacoes) };
}

/**
 * As linhas que o PostgREST devolveu, cada uma com as turmas escolhidas. `T` são as colunas pedidas além do
 * embutido — a consulta é quem as garante (o cliente sem tipo das `select` com modelo de texto não as conhece).
 */
export function linhasComAbrangencia<T extends object>(
  linhas: readonly unknown[] | null | undefined,
): (T & { readonly turmas: readonly string[] })[] {
  return ((linhas ?? []) as (T & { feriado_turma?: readonly LigacaoComTurma[] | null })[]).map(
    (l) => comAbrangencia(l) as unknown as T & { readonly turmas: readonly string[] },
  );
}

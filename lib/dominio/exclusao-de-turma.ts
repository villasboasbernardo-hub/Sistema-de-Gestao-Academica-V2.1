/**
 * A exclusão permanente de turma sem registro — D-COR-6 (spec 025, D-9, D-10 e D-13).
 *
 * > *"Excluir turma (alerta de exclusão permanente)."* · *"Excluir turma e Excluir feriado só habilitados sem semana
 * > salva/publicada ligada; com registros, ícone desabilitado com dica 'tem registros: use Arquivar/Desativar'."*
 * > — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **AS CHAVES SÃO AS DE `app.impedimentos_de_exclusao_da_turma`** (a migration da spec 025): lançamento, a trilha do
 *    DSA, as trocas de situação, os arquivamentos, o previsto, o planejamento anual, as avaliações do currículo da
 *    turma e o feriado de turmas escolhidas (D-10). A estrutura — as linhas da grade, as atribuições e o rateio — sai
 *    junto com a turma e não é impedimento.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */
import { chavesDaRecusa, estadoDaExclusao, type EstadoDaExclusao } from "./exclusao-permanente";

export const ROTULO_DO_IMPEDIMENTO_DA_TURMA: Readonly<Record<string, string>> = {
  aula_lancada: "aula lançada",
  avaliacao: "avaliação lançada",
  atividade: "atividade lançada",
  dia_parado: "dia parado",
  ta_fora_do_dsa: "TA fora do DSA",
  semana_do_dsa: "semana do DSA salva ou publicada",
  troca_de_situacao: "troca de situação registrada",
  arquivamento: "arquivamento registrado",
  previsto: "previsto do PROENS",
  planejamento: "planejamento anual",
  avaliacao_da_turma: "avaliação do currículo arbitrada para a turma",
  feriado_da_turma: "feriado das turmas escolhidas",
};

/** A dica do ícone com registros — a da D-COR-6, para a turma. */
export const DICA_DA_TURMA_COM_REGISTROS = "tem registros: use Arquivar";

export function estadoDaExclusaoDaTurma(impedimentos: readonly string[] | null): EstadoDaExclusao {
  return estadoDaExclusao(
    impedimentos,
    ROTULO_DO_IMPEDIMENTO_DA_TURMA,
    DICA_DA_TURMA_COM_REGISTROS,
  );
}

/** As chaves da recusa `turma_com_historico: a, b`. */
export function chavesDaRecusaDaTurma(mensagem: string): readonly string[] {
  return chavesDaRecusa(mensagem, "turma_com_historico:");
}

/**
 * A exclusão permanente do **regime de horário**, do **item de avaliação do currículo** e da **sala** — a varredura do
 * Bloco 10 (spec 025, D-30).
 *
 * > *"Tudo que se cadastra tem Editar, Desativar/Reativar e Excluir (permanente, com alerta)."* — RT-2, Bernardo Villas
 * > Boas, 24/10/2026
 *
 * ⚠️ **AS CHAVES SÃO AS DAS FUNÇÕES DO BANCO** (`app.registros_do_regime`, `…_do_item`, `…_da_sala`). O
 *    `curriculo_em_uso` existe porque apagar parte de currículo com lançamento mudaria em silêncio o que a RC-6 (spec
 *    021) manda corrigir com justificativa: ali o caminho é Desativar.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */
import { estadoDaExclusao, type EstadoDaExclusao } from "./exclusao-permanente";

const DICA = "tem registros: use Desativar";

export const ROTULO_DO_IMPEDIMENTO_DO_REGIME: Readonly<Record<string, string>> = {
  turma_usa: "turma que o usa",
  curriculo_em_uso: "currículo em uso (turma com lançamento)",
  correcao_registrada: "correção registrada",
};

export const ROTULO_DO_IMPEDIMENTO_DO_ITEM: Readonly<Record<string, string>> = {
  avaliacao_lancada: "avaliação lançada",
  arbitragem: "arbitragem para turma",
  correcao_registrada: "correção registrada",
  curriculo_em_uso: "currículo em uso (turma com lançamento)",
};

export const ROTULO_DO_IMPEDIMENTO_DA_SALA: Readonly<Record<string, string>> = {
  turma_usa: "turma que a usa",
};

export const estadoDaExclusaoDoRegime = (
  impedimentos: readonly string[] | null,
): EstadoDaExclusao => estadoDaExclusao(impedimentos, ROTULO_DO_IMPEDIMENTO_DO_REGIME, DICA);

export const estadoDaExclusaoDoItem = (impedimentos: readonly string[] | null): EstadoDaExclusao =>
  estadoDaExclusao(impedimentos, ROTULO_DO_IMPEDIMENTO_DO_ITEM, DICA);

export const estadoDaExclusaoDaSala = (impedimentos: readonly string[] | null): EstadoDaExclusao =>
  estadoDaExclusao(impedimentos, ROTULO_DO_IMPEDIMENTO_DA_SALA, DICA);

/**
 * O curso: o Excluir aparece **sempre desabilitado** (D-30), porque todo curso tem o histórico do regime — que é
 * permanente, recusado inclusive para a `service_role` (regra 9.1 do `CLAUDE.md`) — e o currículo.
 */
export const EXCLUSAO_DO_CURSO: EstadoDaExclusao = {
  liberada: false,
  dica: DICA,
  detalhe: "Tem histórico do regime do curso, que é permanente, e currículo.",
};

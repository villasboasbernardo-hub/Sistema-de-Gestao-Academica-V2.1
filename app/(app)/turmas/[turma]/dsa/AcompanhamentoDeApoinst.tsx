/**
 * Bloco 18 (spec 033, FR-008.1) — a aba «APOINST» do acompanhamento do DSA: a APOINST planejada da turma, previsto ×
 * realizado, SÓ LEITURA (as ações ficam na ficha da turma e no módulo Atividades).
 *
 * ⚠️ **O «HOJE» É O ÚLTIMO DIA DA SEMANA MOSTRADA** (`contexto.hoje`): é ele que decide a *Atrasada*. Os TA lançados
 *    salvos da turma contam todos — é o acompanhamento da turma, não o recorte da semana.
 */
import { ApoinstDeUmaTurma } from "../../../atividades/PlanejadoDaTurma";

import type { ContextoDaTurmaNasAbas } from "../contexto-das-abas";

export async function AcompanhamentoDeApoinst({
  contexto,
}: {
  readonly contexto: ContextoDaTurmaNasAbas;
}) {
  return <ApoinstDeUmaTurma contexto={{ ...contexto, somenteLeitura: true }} />;
}

/**
 * Bloco 18 (spec 033, FR-008.1) — a aba «APOINST» do acompanhamento do DSA: a APOINST planejada da turma, previsto ×
 * realizado, SÓ LEITURA (as ações ficam na ficha da turma e no módulo Atividades).
 *
 * ⚠️ **O «HOJE» É O DE HOJE** (`contexto.hoje`, o `hojeNaCiaara` da página do DSA): é ele que decide a *Atrasada* e a
 *    data do «situação em». Os TA lançados salvos da turma contam todos — é o acompanhamento da turma, não o recorte da
 *    semana mostrada; com o fim da semana no lugar do hoje, a data impressa contradiria os números (achado da revisão do
 *    Bloco 18).
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

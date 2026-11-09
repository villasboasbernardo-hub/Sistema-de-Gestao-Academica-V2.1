/**
 * Bloco 18 (spec 033, FR-008.1) — a aba «Palestras» do acompanhamento do DSA: as AEC previstas do currículo da turma e
 * as palestras fora do currículo, SÓ LEITURA (as ações ficam na ficha da turma e no módulo Atividades).
 *
 * ⚠️ **O «HOJE» É O DE HOJE** (`contexto.hoje`, o `hojeNaCiaara` da página do DSA): os lançamentos salvos da turma
 *    contam todos — é o acompanhamento da turma, não o recorte da semana mostrada —, e a data do «situação em» tem de
 *    ser a dos números (achado da revisão do Bloco 18).
 */
import { PalestrasDeUmaTurma } from "../../../atividades/PlanejadoDaTurma";

import type { ContextoDaTurmaNasAbas } from "../contexto-das-abas";

export async function AcompanhamentoDePalestras({
  contexto,
}: {
  readonly contexto: ContextoDaTurmaNasAbas;
}) {
  return <PalestrasDeUmaTurma contexto={{ ...contexto, somenteLeitura: true }} />;
}

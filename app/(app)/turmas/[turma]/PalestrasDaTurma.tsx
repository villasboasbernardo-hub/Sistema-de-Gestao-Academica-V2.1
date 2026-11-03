/**
 * Bloco 18 (spec 033, RA-3 e RA-5; FR-002.4, FR-005 e FR-007.2) — a aba «Palestras» da ficha da turma: as AEC previstas
 * do currículo da turma (a cumprir, em andamento, cumprida) e as palestras fora do currículo, com *Registrar cumprimento*
 * e *Desfazer* para o trio.
 *
 * ⚠️ **SÓ A ABA ABERTA É LIDA**: a ficha desenha este componente só com `?aba=palestras`.
 * ⚠️ O desenho é o mesmo do acompanhamento do DSA (`PalestrasDeUmaTurma`); aqui, com as ações.
 */
import { PalestrasDeUmaTurma } from "../../atividades/PlanejadoDaTurma";

import type { ContextoDaTurmaNasAbas } from "./contexto-das-abas";

export async function PalestrasDaTurma({
  contexto,
}: {
  readonly contexto: ContextoDaTurmaNasAbas;
}) {
  return <PalestrasDeUmaTurma contexto={contexto} />;
}

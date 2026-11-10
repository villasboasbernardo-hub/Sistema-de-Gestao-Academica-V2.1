/**
 * Bloco 18 (spec 033, RA-6; FR-004 e FR-007.2) — a aba «APOINST» da ficha da turma: a APOINST planejada (previsto ×
 * realizado, situação), com *Nova APOINST*, *Editar*, *Desativar/Reativar* e *Concluída à mão* para o trio.
 *
 * ⚠️ **SÓ A ABA ABERTA É LIDA**: a ficha desenha este componente só com `?aba=apoinst`.
 * ⚠️ **SÓ DO ANO INICIAL EM DIANTE** (`apoinst.ano_inicial`, parâmetro): a turma anterior diz por que não tem.
 * ⚠️ O desenho é o mesmo do acompanhamento do DSA (`ApoinstDeUmaTurma`); aqui, com as ações.
 */
import { ApoinstDeUmaTurma } from "../../atividades/PlanejadoDaTurma";

import type { ContextoDaTurmaNasAbas } from "./contexto-das-abas";

export async function ApoinstDaTurma({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  return <ApoinstDeUmaTurma contexto={contexto} />;
}

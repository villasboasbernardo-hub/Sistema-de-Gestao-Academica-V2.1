/**
 * Bloco 18 (spec 033) — a aba «atividades» da ficha da turma. [esqueleto — preenchido no Bloco 18]
 */
import { EmBreve } from "@/components/ciaara/em-breve";

import type { ContextoDaTurmaNasAbas } from "./contexto-das-abas";

export async function AtividadesDaTurma({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  void contexto;
  return <EmBreve slot="aba-atividades-em-breve" />;
}

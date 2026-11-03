/**
 * Bloco 18 (spec 033) — a aba «palestras» da ficha da turma. [esqueleto — preenchido no Bloco 18]
 */
import { EmBreve } from "@/components/ciaara/em-breve";

import type { ContextoDaTurmaNasAbas } from "./contexto-das-abas";

export async function PalestrasDaTurma({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  void contexto;
  return <EmBreve slot="aba-palestras-em-breve" />;
}

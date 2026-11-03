/**
 * Bloco 18 (spec 033, FR-008.1) — o acompanhamento no DSA, SÓ LEITURA. [esqueleto — preenchido no Bloco 18]
 */
import { EmBreve } from "@/components/ciaara/em-breve";

import type { ContextoDaTurmaNasAbas } from "../contexto-das-abas";

export async function AcompanhamentoDePalestras({ contexto }: { readonly contexto: ContextoDaTurmaNasAbas }) {
  void contexto;
  return <EmBreve slot="acompanhamento-em-breve" />;
}

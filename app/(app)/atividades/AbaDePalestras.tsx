/**
 * Bloco 18 (spec 033) — a aba «palestras» do módulo Atividades. [esqueleto — preenchido no Bloco 18]
 */
import { EmBreve } from "@/components/ciaara/em-breve";

import { AbasDeAtividades } from "./AbasDeAtividades";
import type { ContextoDoModulo } from "./contexto";

export async function AbaDePalestras({ contexto }: { readonly contexto: ContextoDoModulo }) {
  return (
    <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold">Atividades</h1>
      </header>
      <AbasDeAtividades comCalendario={contexto.temCalendario}>
        <EmBreve slot="aba-palestras-em-breve" />
      </AbasDeAtividades>
    </div>
  );
}

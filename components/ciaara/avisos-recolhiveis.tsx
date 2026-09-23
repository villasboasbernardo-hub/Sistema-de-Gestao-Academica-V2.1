/**
 * O botão de exibir e ocultar a lista de um quadro de avisos — **folha de cliente** (`FR-027` e
 * `RNF-USA-04` da spec 006, emendados por decisão de Bernardo Villas Boas, 15/09/2026).
 *
 * ⚠️ **VEIO DE `app/(app)/instrutores/` NA FATIA (a) DO ÉPICO 5** (T111 da spec 009), sem mudar uma
 * linha de comportamento. Deixou de ser detalhe de uma tela quando curso e turma passaram a ter
 * quadro próprio (`FR-010.1` e `FR-028.1` da spec 009): três consumidores com um componente é
 * vocabulário; três cópias seriam três recolhimentos que divergem.
 *
 * ⚠️ AS CONTAGENS NÃO SE RECOLHEM. Elas chegam em `contagens` e ficam sempre à vista; o que abre e fecha
 * é só a lista de nomes, em `children`. É o que preserva o `RNF-USA-04`: o aviso nunca sai da tela.
 *
 * ⚠️ O ESTADO É EFÊMERO, E FICA NO COMPONENTE — fora da URL, como o painel de estatísticas
 * (`EstatisticasRecolhiveis`). O quadro estar aberto não faz sentido num link mandado a outra pessoa.
 *
 * ⚠️ NASCE RECOLHIDO, e fechado a lista não é montada.
 */
"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AvisosRecolhiveis({
  contagens,
  children,
}: {
  readonly contagens: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-2" data-slot="avisos-recolhiveis" data-aberto={aberto}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {contagens}
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={aberto}
          aria-controls="lista-de-avisos"
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? "Ocultar avisos" : "Exibir avisos"}
          <ChevronDownIcon
            aria-hidden="true"
            className={
              aberto ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"
            }
          />
        </Button>
      </div>
      <div id="lista-de-avisos">{aberto ? children : null}</div>
    </div>
  );
}

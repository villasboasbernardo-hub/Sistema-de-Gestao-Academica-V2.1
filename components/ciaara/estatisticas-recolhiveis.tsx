/**
 * O botão de exibir e ocultar as estatísticas — **folha de cliente** (`FR-026.5` da spec 006, emenda de
 * 15/09/2026, decisão de Bernardo Villas Boas; spec 015 da v2.0).
 *
 * > *"Expandir o painel de Estatísticas."* — spec 015 da v2.0, quickstart, passo 1 — o painel da v2.0
 * > nascia recolhido e era expandido por quem queria vê-lo.
 *
 * ⚠️ **VOCABULÁRIO DESDE 22/10/2026** (spec 022, Bloco 7, item 10): *"Cursos: estatísticas no mesmo componente/estilo
 *    das de Instrutores"* (Bernardo Villas Boas). Ele morava em `app/(app)/instrutores/`; a segunda tela que o usa
 *    o trouxe para cá — um painel só, e não duas cópias que divergem.
 *
 * ⚠️ O ESTADO É EFÊMERO, E FICA NO COMPONENTE. A pergunta do contrato de estado é *"isto faz sentido num
 * link que eu mando para outra pessoa?"* — o painel estar aberto não faz, como o painel de filtros
 * recolhido não faz (`tests/unidade/estado-efemero-intacto.test.ts`).
 *
 * ⚠️ O CONTEÚDO CHEGA PRONTO DO SERVIDOR, JÁ COM O RECORTE FILTRADO. Abrir o painel não refaz leitura: o
 * que aparece é o recorte corrente, nunca o total seguido de uma correção (spec 015, `FR-017`).
 *
 * ⚠️ FECHADO, O CONTEÚDO NÃO É MONTADO. Gráfico medido dentro de um contêiner escondido nasce com
 * largura zero — a v2.0 registrou o mesmo cuidado (research §3 da spec 015).
 */
"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function EstatisticasRecolhiveis({
  id,
  children,
}: {
  /** O `id` do painel — o `aria-controls` do botão aponta para ele; um por tela. */
  readonly id: string;
  readonly children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-3" data-slot="estatisticas-recolhiveis" data-aberto={aberto}>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={aberto}
          aria-controls={id}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? "Ocultar estatísticas" : "Exibir estatísticas"}
          <ChevronDownIcon
            aria-hidden="true"
            className={
              aberto ? "size-4 rotate-180 transition-transform" : "size-4 transition-transform"
            }
          />
        </Button>
      </div>
      <div id={id}>{aberto ? children : null}</div>
    </div>
  );
}

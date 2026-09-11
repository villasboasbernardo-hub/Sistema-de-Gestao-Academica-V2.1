/**
 * Recolhível — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ ELE CARREGA O `aria-expanded` E O VÍNCULO ENTRE GATILHO E CONTEÚDO. Um `useState` com
 * `hidden` faria a mesma coisa na tela e nada no leitor de tela — que é exatamente o tipo de
 * diferença que não aparece em captura de tela nem em revisão de código.
 */
"use client";

import * as React from "react";
import { Collapsible as CollapsiblePrimitivo } from "radix-ui";

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitivo.Root>) {
  return <CollapsiblePrimitivo.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitivo.CollapsibleTrigger>) {
  return <CollapsiblePrimitivo.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitivo.CollapsibleContent>) {
  return <CollapsiblePrimitivo.CollapsibleContent data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

/**
 * Painel flutuante — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ ELE É A BASE DO SELETOR DE INSTRUTOR, e essa escolha tem história: a receita pronta do shadcn
 * para "escolha com busca" arrasta um pacote novo. Ele não é biblioteca de componentes no sentido
 * do BRIEF §1 — e por isso o portão de dependências NÃO o pegaria. A saída escolhida foi não
 * passar por essa porta: painel flutuante, que já está instalado, mais a lista navegável que a
 * tabela densa precisaria construir de qualquer jeito (research §R-3).
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { Popover as PopoverPrimitivo } from "radix-ui";

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitivo.Root>) {
  return <PopoverPrimitivo.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitivo.Trigger>) {
  return <PopoverPrimitivo.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitivo.Anchor>) {
  return <PopoverPrimitivo.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
  className,
  align = "start",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitivo.Content>) {
  return (
    <PopoverPrimitivo.Portal>
      <PopoverPrimitivo.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border-borda z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden",
          className,
        )}
        {...props}
      />
    </PopoverPrimitivo.Portal>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };

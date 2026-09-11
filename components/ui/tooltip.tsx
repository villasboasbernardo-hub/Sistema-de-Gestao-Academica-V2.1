/**
 * Dica ao apontar — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ DICA AO APONTAR NUNCA É A ÚNICA VIA DE UMA INFORMAÇÃO (`FR-025`, `FR-030` item a). Quem
 * navega por teclado alcança a dica pelo foco, mas quem usa toque não aponta nada — então o que
 * estiver só aqui não existe para parte das pessoas. No `BadgeTeto`, a comparação numérica fica
 * NO EMBLEMA; aqui fica só a explicação do teto.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { Tooltip as TooltipPrimitivo } from "radix-ui";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitivo.Provider>) {
  return (
    <TooltipPrimitivo.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitivo.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitivo.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitivo.Trigger>) {
  return <TooltipPrimitivo.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitivo.Content>) {
  return (
    <TooltipPrimitivo.Portal>
      <TooltipPrimitivo.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-primary text-primary-foreground z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitivo.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipPrimitivo.Content>
    </TooltipPrimitivo.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

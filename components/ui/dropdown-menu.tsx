/**
 * Menu suspenso — sobre o primitivo do Radix (`FR-001` da spec 008; `FR-002` da spec 011).
 *
 * ⚠️ **ZERO DEPENDÊNCIA NOVA.** `radix-ui`, já instalado, exporta `DropdownMenu` — medido em
 * 29/09/2026 (R-2 da spec 011).
 *
 * ⚠️ **POR QUE MENU SUSPENSO E NÃO O PAINEL FLUTUANTE QUE JÁ EXISTE.** O `Popover` está aqui desde a
 * fatia (b) do Épico 4 e desenharia igual. A diferença é de TECLADO: o menu suspenso do Radix trata
 * as setas, `Home`/`End` e a digitação para saltar item, e devolve o foco ao gatilho ao fechar —
 * comportamento que o painel flutuante não traz e que teria de ser reescrito à mão aqui. Para um
 * menu cujo item mais importante é **Sair**, alcançável por teclado, isso não é detalhe.
 *
 * ⚠️ **SÓ AS PARTES QUE ESTA FATIA USA.** O primitivo exporta submenu, caixa de marcar e grupo de
 * opção; nada disso entra enquanto nenhuma tela pedir — componente exportado sem consumidor é
 * superfície que envelhece sem ninguém notar.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { DropdownMenu as MenuPrimitivo } from "radix-ui";

function DropdownMenu({ ...props }: React.ComponentProps<typeof MenuPrimitivo.Root>) {
  return <MenuPrimitivo.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({ ...props }: React.ComponentProps<typeof MenuPrimitivo.Trigger>) {
  return <MenuPrimitivo.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof MenuPrimitivo.Content>) {
  return (
    <MenuPrimitivo.Portal>
      <MenuPrimitivo.Content
        data-slot="dropdown-menu-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover text-popover-foreground border-borda z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-md",
          className,
        )}
        {...props}
      />
    </MenuPrimitivo.Portal>
  );
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitivo.Item>) {
  return (
    <MenuPrimitivo.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "text-texto data-highlighted:bg-superficie-elevada relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitivo.Label>) {
  return (
    <MenuPrimitivo.Label
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitivo.Separator>) {
  return (
    <MenuPrimitivo.Separator
      data-slot="dropdown-menu-separator"
      className={cn("bg-borda -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
};

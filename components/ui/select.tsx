/**
 * Seleção — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ ELE JÁ TRAZ A NAVEGAÇÃO POR TECLADO, o fechamento por `Esc` e o anúncio da opção escolhida.
 * É por isso que o `SeletorTurma` se constrói sobre ele e NÃO sobre a lista navegável desta fatia:
 * 29 turmas não pedem busca, e uma lista de escolha simples já é resolvida aqui, com correção.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { Select as SelectPrimitivo } from "radix-ui";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

function Select({ ...props }: React.ComponentProps<typeof SelectPrimitivo.Root>) {
  return <SelectPrimitivo.Root data-slot="select" {...props} />;
}

function SelectGroup({ ...props }: React.ComponentProps<typeof SelectPrimitivo.Group>) {
  return <SelectPrimitivo.Group data-slot="select-group" {...props} />;
}

function SelectValue({ ...props }: React.ComponentProps<typeof SelectPrimitivo.Value>) {
  return <SelectPrimitivo.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.Trigger> & { size?: "sm" | "default" }) {
  return (
    <SelectPrimitivo.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        // veste: o traço identificador do campo de escolha e o texto de sua dica (FR-031, FR-032)
        "border-texto-tenue data-[placeholder]:text-texto-tenue",
        "bg-superficie text-texto flex w-fit items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none",
        "data-[size=default]:h-9 data-[size=sm]:h-8",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "*:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitivo.Icon asChild>
        {/* veste: a seta do seletor — desenho de apoio, nunca dado (FR-031) */}
        <ChevronDownIcon className="text-texto-tenue size-4" />
      </SelectPrimitivo.Icon>
    </SelectPrimitivo.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.Content>) {
  return (
    <SelectPrimitivo.Portal>
      <SelectPrimitivo.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "bg-popover text-popover-foreground border-borda relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitivo.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitivo.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitivo.Content>
    </SelectPrimitivo.Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitivo.Label>) {
  return (
    <SelectPrimitivo.Label
      data-slot="select-label"
      // veste: o rótulo do agrupamento de opções — texto estático (FR-031)
      className={cn("text-texto-tenue px-2 py-1.5 text-xs", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.Item>) {
  return (
    <SelectPrimitivo.Item
      data-slot="select-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitivo.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitivo.ItemIndicator>
      </span>
      <SelectPrimitivo.ItemText>{children}</SelectPrimitivo.ItemText>
    </SelectPrimitivo.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.Separator>) {
  return (
    <SelectPrimitivo.Separator
      data-slot="select-separator"
      className={cn("bg-borda pointer-events-none -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.ScrollUpButton>) {
  return (
    <SelectPrimitivo.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </SelectPrimitivo.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitivo.ScrollDownButton>) {
  return (
    <SelectPrimitivo.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn("flex cursor-default items-center justify-center py-1", className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </SelectPrimitivo.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};

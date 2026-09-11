/**
 * Diálogo — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ O QUE SE COMPRA AQUI É O FOCO PRESO E O RETORNO DE FOCO. Um `<div>` com `position: fixed`
 * desenha a mesma caixa e deixa o teclado passear pela página atrás dela: quem navega por teclado
 * "sai" do diálogo sem fechá-lo e não sabe mais onde está. É o `FR-013`, e não se improvisa.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { Dialog as DialogPrimitivo } from "radix-ui";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitivo.Root>) {
  return <DialogPrimitivo.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitivo.Trigger>) {
  return <DialogPrimitivo.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitivo.Portal>) {
  return <DialogPrimitivo.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitivo.Close>) {
  return <DialogPrimitivo.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitivo.Overlay>) {
  return (
    <DialogPrimitivo.Overlay
      data-slot="dialog-overlay"
      className={cn("bg-foreground/50 fixed inset-0 z-50", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitivo.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitivo.Content
        data-slot="dialog-content"
        className={cn(
          "bg-superficie text-texto border-borda fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-ciaara-lg border p-6 shadow-ciaara-3 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitivo.Close className="focus-visible:ring-ring/50 absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-[3px] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          {/* ⚠️ NOME ACESSÍVEL OBRIGATÓRIO (`FR-030` item a): nenhum controle depende só de ícone. */}
          <span className="sr-only">Fechar</span>
        </DialogPrimitivo.Close>
      </DialogPrimitivo.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitivo.Title>) {
  return (
    <DialogPrimitivo.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitivo.Description>) {
  return (
    <DialogPrimitivo.Description
      data-slot="dialog-description"
      className={cn("text-texto-suave text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

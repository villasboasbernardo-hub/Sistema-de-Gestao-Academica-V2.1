/**
 * Diálogo de confirmação — sobre o primitivo do Radix (`FR-001`).
 *
 * ⚠️ ELE NÃO É O DIÁLOGO COMUM COM OUTRO TEXTO. O papel `alertdialog` é anunciado de outro jeito,
 * e ele NÃO fecha por clique fora nem por `Esc` sem passar pelos botões — confirmação que se
 * perde por um clique distraído não confirma nada.
 *
 * ⚠️ NESTE SISTEMA A CONSEQUÊNCIA NÃO É PERDA. Nada é apagado (regra 4 do contrato do projeto):
 * desativar um instrutor é reversível no banco e CONSEQUENTE na tela, e é para a consequência que
 * o `RNF-USA-03` pede confirmação. Achado P-4 do plano.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { AlertDialog as AlertDialogPrimitivo } from "radix-ui";

import { buttonVariants } from "@/components/ui/button";

function AlertDialog({ ...props }: React.ComponentProps<typeof AlertDialogPrimitivo.Root>) {
  return <AlertDialogPrimitivo.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Trigger>) {
  return <AlertDialogPrimitivo.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({ ...props }: React.ComponentProps<typeof AlertDialogPrimitivo.Portal>) {
  return <AlertDialogPrimitivo.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Overlay>) {
  return (
    <AlertDialogPrimitivo.Overlay
      data-slot="alert-dialog-overlay"
      className={cn("bg-foreground/50 fixed inset-0 z-50", className)}
      {...props}
    />
  );
}

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitivo.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-superficie text-texto border-borda rounded-ciaara-lg shadow-ciaara-3 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border p-6 sm:max-w-lg",
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Title>) {
  return (
    <AlertDialogPrimitivo.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Description>) {
  return (
    <AlertDialogPrimitivo.Description
      data-slot="alert-dialog-description"
      className={cn("text-texto-suave text-sm", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Action>) {
  return <AlertDialogPrimitivo.Action className={cn(buttonVariants(), className)} {...props} />;
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitivo.Cancel>) {
  return (
    <AlertDialogPrimitivo.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};

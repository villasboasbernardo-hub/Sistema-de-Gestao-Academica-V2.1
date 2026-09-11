/**
 * Diálogo de confirmação (`RNF-USA-03`, `FR-013`).
 *
 * ⚠️ COM MARCADOR DE CLIENTE, e aqui ele é necessário: abrir, fechar, prender o foco e devolvê-lo
 * são comportamento de navegador.
 *
 * ⚠️ A CONSEQUÊNCIA NÃO É PERDA — nada é apagado neste sistema (regra 4 do contrato do projeto).
 * Desativar um instrutor é reversível no banco e CONSEQUENTE na tela: ele some das listagens, os
 * vínculos param de aparecer, a LIQ muda. É para a consequência que o `RNF-USA-03` pede
 * confirmação, não para a perda. Achado P-4 do plano.
 *
 * ⚠️ ELE NÃO EXECUTA A AÇÃO. Recebe o que fazer e chama; quem sabe o que acontece é quem chama.
 * O texto da consequência é obrigatório justamente por isso: só quem chama sabe qual é.
 */
"use client";

import * as React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type DialogoConfirmacaoProps = {
  readonly titulo: string;
  /** ⚠️ OBRIGATÓRIA: o que muda se a pessoa confirmar. Sem isto o diálogo só atrasa o clique. */
  readonly consequencia: string;
  readonly rotuloConfirmar: string;
  readonly rotuloCancelar?: string;
  readonly aoConfirmar: () => void;
  /** O que dispara o diálogo. Fica sob o controle de quem chama. */
  readonly children: React.ReactNode;
};

export function DialogoConfirmacao({
  titulo,
  consequencia,
  rotuloConfirmar,
  rotuloCancelar = "Cancelar",
  aoConfirmar,
  children,
}: DialogoConfirmacaoProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent data-slot="dialogo-confirmacao">
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{consequencia}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{rotuloCancelar}</AlertDialogCancel>
          <AlertDialogAction onClick={aoConfirmar}>{rotuloConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

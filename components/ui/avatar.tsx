/**
 * Avatar — sobre o primitivo do Radix (`FR-001` da spec 008; `FR-010` a `FR-012` da spec 011).
 *
 * ⚠️ **ZERO DEPENDÊNCIA NOVA.** `radix-ui`, já instalado, exporta `Avatar` — medido em 29/09/2026
 * (R-2 da spec 011). A receita do shadcn mandaria instalar `@radix-ui/react-avatar` à parte, e o
 * portão de dependências reprovaria o pacote a mais sem nada mudar na tela.
 *
 * ⚠️ **O RECUO PARA AS INICIAIS NÃO É ENFEITE: é o estado NORMAL** (`FR-010`). A foto é opcional, e
 * a maioria das contas não terá nenhuma. O primitivo do Radix só mostra o recuo depois que a imagem
 * **falha ou não existe**, o que evita o piscar de iniciais em quem tem foto.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { Avatar as AvatarPrimitivo } from "radix-ui";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitivo.Root>) {
  return (
    <AvatarPrimitivo.Root
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImagem({ className, ...props }: React.ComponentProps<typeof AvatarPrimitivo.Image>) {
  return (
    <AvatarPrimitivo.Image
      data-slot="avatar-imagem"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

/**
 * O recuo, mostrado quando não há foto.
 *
 * ⚠️ `delayMs` fica em ZERO de propósito. O padrão do Radix atrasa o recuo para evitar piscada em
 * quem tem imagem lenta — mas aqui a ausência de foto é o caso comum, e o atraso viraria um buraco
 * cinza em toda tela de quem nunca enviou nada.
 */
function AvatarRecuo({
  className,
  delayMs = 0,
  ...props
}: React.ComponentProps<typeof AvatarPrimitivo.Fallback>) {
  return (
    <AvatarPrimitivo.Fallback
      data-slot="avatar-recuo"
      delayMs={delayMs}
      className={cn(
        "bg-marca text-marca-contraste flex size-full items-center justify-center rounded-full text-xs font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImagem, AvatarRecuo };

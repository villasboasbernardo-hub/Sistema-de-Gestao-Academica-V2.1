/**
 * Silhueta de carregamento — primitivo de folha de estilo pura (`FR-001`).
 *
 * ⚠️ A PULSAÇÃO É DESLIGADA POR PREFERÊNCIA DO SISTEMA (`FR-029`). A camada base de
 * `app/globals.css` já reduz toda animação sob `prefers-reduced-motion`, mas aqui a exclusão é
 * ESCRITA no componente: uma silhueta é justamente o lugar onde a animação é o componente inteiro,
 * e reduzir a duração a 0,01ms deixaria um retângulo piscando uma vez em vez de parar.
 */
import * as React from "react";
import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "bg-superficie-2 rounded-ciaara-sm animate-pulse motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };

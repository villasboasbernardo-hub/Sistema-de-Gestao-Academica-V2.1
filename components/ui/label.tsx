/**
 * Rótulo — sobre o primitivo do Radix, que faz a associação com o controle (`FR-001`).
 *
 * ⚠️ A ASSOCIAÇÃO É O PONTO, e é por ela que isto não é um `<span>`: rótulo que não aponta para o
 * controle existe só para quem enxerga. Quem usa leitor de tela ouve o campo sem saber o que ele
 * pede, e nada na tela acusa isso.
 */
import * as React from "react";
import { cn } from "cn";
import { Label as LabelPrimitivo } from "radix-ui";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitivo.Root>) {
  return (
    <LabelPrimitivo.Root
      data-slot="label"
      className={cn(
        "text-texto flex items-center gap-2 text-sm leading-none font-medium select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };

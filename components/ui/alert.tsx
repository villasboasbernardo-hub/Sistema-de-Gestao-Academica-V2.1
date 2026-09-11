/**
 * Aviso — primitivo de folha de estilo pura (`FR-001`).
 *
 * ⚠️ `role="alert"` NÃO É DECORAÇÃO: é o que faz o leitor de tela anunciar a mudança sem que o
 * foco seja roubado (`FR-030`, item b). Uma faixa colorida sem papel declarado é invisível para
 * quem não vê a tela — e o `AlertaConformidade`, que se constrói sobre este primitivo, existe
 * justamente para comunicar norma a quem precisa dela.
 *
 * ⚠️ O TOM VEM DE QUEM CHAMA, por token. Este primitivo não conhece os nove status do domínio —
 * quem os conhece é `components/ciaara/alerta-conformidade.tsx`.
 */
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-ciaara border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-superficie text-texto border-borda",
        destructive: "bg-conflito-fundo text-conflito-tinta border-conflito-borda",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-texto-suave col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };

/**
 * Campo de texto — primitivo de folha de estilo pura (`FR-001`).
 *
 * ⚠️ ELE NÃO TEM PRIMITIVO DO RADIX POR BAIXO, e isso é medição, não esquecimento: no shadcn,
 * campo, alerta e esqueleto são um elemento HTML com classes. Procurar um pacote para eles é
 * instalar dependência para não resolver problema nenhum.
 *
 * ⚠️ O TRAÇO QUE IDENTIFICA O CAMPO É `--texto-tenue`, e não `--borda-forte` (`FR-032`, decisão de
 * 10/09/2026 sobre medição). Nenhum dos catorze tokens de borda da paleta alcança o limite de 3:1
 * de borda interativa — o melhor mede 2,23. O `--texto-tenue` mede 4,49 no claro e 4,85 no
 * noturno contra o preenchimento do campo. Nenhuma cor mudou e nenhum token nasceu: o que mudou
 * foi o papel que um token já existente desempenha.
 *
 * ⚠️ A CONSEQUÊNCIA VISUAL É INTENCIONAL — o campo fica com traço mais escuro que toda outra borda
 * do sistema. É isso que faz um campo parecer um campo numa tela densa.
 */
import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // veste: o traço identificador do campo e o texto da dica de preenchimento (FR-031, FR-032)
        "border-texto-tenue placeholder:text-texto-tenue",
        "bg-superficie text-texto selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

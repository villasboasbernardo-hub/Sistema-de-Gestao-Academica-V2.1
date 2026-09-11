/**
 * Emblema de teto normativo (`RNF-NORM-01` a `RNF-NORM-03`, `FR-009`).
 *
 * ⚠️ ELE **NUNCA BLOQUEIA, NUNCA DESABILITA, NUNCA IMPEDE O SALVAMENTO** (`RN-DEG-02`, regra 6 do
 * contrato do projeto). Os tetos AEC 10%, TAD 5%, TR 10% e o 9º TA são **alerta**. Transformá-los
 * em impedimento mudaria a regra de negócio — é a mesma razão pela qual eles nunca viram `CHECK`.
 *
 * ⚠️ NENHUM NÚMERO DE TETO ESTÁ ESCRITO AQUI. O limite chega por propriedade, vindo de
 * `config_parametros` (`RNF-NORM-08`, Princípio VII). Uma constante neste arquivo passaria em todo
 * teste desta fatia enquanto viola o princípio — e mentiria no dia em que a norma mudasse.
 *
 * ⚠️ ELE COMPARA E SINALIZA; NÃO DECIDE SE HOUVE ESTOURO. Quem avalia o teto é função pura
 * (`RN-EVT-01`), e o resultado chega pronto.
 *
 * ⚠️ A COMPARAÇÃO NUMÉRICA FICA NO EMBLEMA, NÃO NA DICA AO APONTAR. Quem usa toque não aponta nada,
 * e o que estiver só na dica não existe para essa pessoa (`FR-025`). Na dica fica a explicação.
 *
 * ⚠️ COM MARCADOR DE CLIENTE: a dica ao apontar é comportamento de navegador.
 */
"use client";

import { cn } from "cn";
import { TriangleAlertIcon } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Teto = {
  /** Vocabulário intraduzível: "AEC", "TAD", "TR". */
  readonly rotulo: string;
  /** Vem de `config_parametros`. NUNCA de constante. */
  readonly limite: number;
  readonly medido: number;
  readonly unidade?: string;
  /** O texto que aparece ao apontar. Obrigatório: um teto sem explicação é um número solto. */
  readonly explicacao: string;
};

export function BadgeTeto({
  teto,
  className,
}: {
  readonly teto: Teto;
  readonly className?: string;
}) {
  const estourou = teto.medido > teto.limite;
  const unidade = teto.unidade ?? "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="badge-teto"
          data-estourou={estourou}
          tabIndex={0}
          className={cn(
            "rounded-ciaara-sm inline-flex w-fit items-center gap-1 border px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums",
            estourou
              ? "bg-atrasado-fundo text-atrasado-tinta border-atrasado-borda"
              : "bg-executado-fundo text-executado-tinta border-executado-borda",
            className,
          )}
        >
          {estourou ? <TriangleAlertIcon aria-hidden="true" className="size-3" /> : null}
          <span>
            {teto.rotulo} {teto.medido}
            {unidade} / {teto.limite}
            {unidade}
          </span>
          {/* ⚠️ O ESTADO VAI EM TEXTO, e não só na cor e no ícone: quem não distingue as cores
              precisa continuar lendo o sistema (`FR-025`). */}
          <span className="sr-only">
            {estourou ? "acima do teto normativo — é alerta, não impedimento" : "dentro do teto"}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{teto.explicacao}</TooltipContent>
    </Tooltip>
  );
}

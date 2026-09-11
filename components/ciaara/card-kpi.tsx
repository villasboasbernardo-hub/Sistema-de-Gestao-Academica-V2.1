/**
 * Indicador — número grande, rótulo, unidade e variação (`RF-DS-02`, `FR-004`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. Ele não tem interação nenhuma, e o documento 23 §3.1 o marca como
 * *não*. Um `"use client"` por precaução aqui contaminaria toda a subárvore de quem o importasse.
 *
 * ⚠️ ELE NÃO CALCULA NADA. Quem divide, soma ou compara é quem chama — `FR-020` e documento 24.
 * Um indicador que soubesse somar seria um indicador que precisa saber o que está somando.
 *
 * ⚠️ A VARIAÇÃO DECLARA O SENTIDO, NÃO O SINAL. Uma queda de 5% pode ser boa ou ruim conforme o
 * indicador — carga horária ociosa que cai é boa; instrutor habilitado que cai é ruim — e o
 * componente não tem como saber qual. Quem chama diz se a variação é favorável.
 */
import { cn } from "cn";
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

export type Variacao = {
  /** O número já formatado por quem chama — o componente não formata nada. */
  readonly texto: string;
  /** Se esta variação é boa para ESTE indicador. Não é o sinal do número. */
  readonly favoravel: boolean;
};

export type CardKpiProps = {
  readonly rotulo: string;
  readonly valor: string | number;
  readonly unidade?: string;
  readonly variacao?: Variacao;
  readonly className?: string;
};

export function CardKpi({ rotulo, valor, unidade, variacao, className }: CardKpiProps) {
  const Seta = variacao?.favoravel ? TrendingUpIcon : TrendingDownIcon;

  return (
    <Card data-slot="card-kpi" className={cn("gap-0 py-4", className)}>
      <CardContent className="flex flex-col gap-1 px-4">
        <p className="text-texto-suave text-sm font-medium">{rotulo}</p>
        <p className="flex items-baseline gap-1">
          <span className="text-kpi leading-none font-semibold tabular-nums">{valor}</span>
          {unidade ? (
            /* veste: a unidade do indicador — texto estático, nunca o valor (FR-031) */
            <span className="text-texto-tenue text-2xs font-medium">{unidade}</span>
          ) : null}
        </p>
        {variacao ? (
          <p
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              variacao.favoravel ? "text-executado-tinta" : "text-atrasado-tinta",
            )}
          >
            {/* ⚠️ A COR NÃO É A ÚNICA CODIFICAÇÃO (`FR-025`): a seta e o texto dizem o mesmo, e
                os dois sobrevivem à impressão em preto e branco. */}
            <Seta aria-hidden="true" className="size-3.5" />
            <span>{variacao.texto}</span>
            <span className="sr-only">
              {variacao.favoravel ? "variação favorável" : "variação desfavorável"}
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

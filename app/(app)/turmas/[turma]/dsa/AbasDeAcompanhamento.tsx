/**
 * As abas do **acompanhamento** abaixo da grade do DSA — *Disciplinas · Avaliações · APOINST · Palestras* — folha de
 * cliente (Bloco 16, spec 031, `FR-009`).
 *
 * > *"O acompanhamento das disciplinas que fica embaixo da grade continua IGUAL, mas vira a aba 'Disciplinas'. Ao lado:
 * > aba 'Avaliações' (…), aba 'APOINST' e aba 'Palestras', as duas em branco com o aviso 'Em breve'. Aba na URL. Para
 * > todas as turmas."* — Bernardo Villas Boas, 30/10/2026
 *
 * ⚠️ **A ABA MORA NA URL E EMPILHA HISTÓRICO** (`?acompanhamento=`, D-15), como as abas de versão (`AbasDeVersao`).
 * ⚠️ **O CONTEÚDO É DESENHADO NO SERVIDOR, SÓ O DA ABA ABERTA**, e chega como `children`: a de avaliações lê o quadro de
 *    avaliações da turma só quando aberta.
 */
"use client";

import * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import { ROTA_DO_DSA } from "./consulta";

export type AbaDeAcompanhamento = "disciplinas" | "avaliacoes" | "apoinst" | "palestras";

export const ABAS_DE_ACOMPANHAMENTO: readonly (readonly [AbaDeAcompanhamento, string])[] = [
  ["disciplinas", "Disciplinas"],
  ["avaliacoes", "Avaliações"],
  ["apoinst", "APOINST"],
  ["palestras", "Palestras"],
];

export function AbasDeAcompanhamento({
  atual,
  children,
}: {
  /** A aba que o servidor desenhou. */
  readonly atual: AbaDeAcompanhamento;
  readonly children: React.ReactNode;
}) {
  const [, definir, esperando] = useParametro(ROTA_DO_DSA, "acompanhamento");
  return (
    <div className="flex min-w-0 flex-col gap-3" data-slot="abas-de-acompanhamento">
      <div
        role="tablist"
        aria-label="Acompanhamento da turma"
        className="border-borda flex flex-wrap gap-1 border-b"
      >
        {ABAS_DE_ACOMPANHAMENTO.map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            id={`aba-acompanhamento-${valor}`}
            aria-selected={atual === valor}
            aria-controls="painel-do-acompanhamento"
            data-acompanhamento={valor}
            onClick={() => void definir(valor === "disciplinas" ? null : valor)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              atual === valor
                ? "border-marca text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="painel-do-acompanhamento"
        aria-labelledby={`aba-acompanhamento-${atual}`}
        aria-busy={esperando || undefined}
        className="flex min-w-0 flex-col gap-3"
      >
        {children}
      </div>
    </div>
  );
}

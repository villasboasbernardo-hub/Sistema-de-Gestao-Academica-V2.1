/**
 * As abas da ficha da turma — **Ficha** e **Avaliações** — folha de cliente (spec 014, PR 5, R-12, T177).
 *
 * ⚠️ **A ABA MORA NA URL E EMPILHA HISTÓRICO** (decisão de Bernardo Villas Boas, 14/10/2026, que recusou a D5.1):
 *    o card de avaliações leva a `?aba=avaliacoes`, e «voltar» desfaz um passo. O padrão das abas da página do
 *    curso (`AbasDoCurso.tsx`).
 * ⚠️ **O CONTEÚDO DAS DUAS É DESENHADO NO SERVIDOR** e chega por propriedade: esta folha só decide qual mostrar —
 *    se ela buscasse dado, a página inteira iria para o navegador.
 * ⚠️ O que fica ACIMA das abas (cabeçalho, avisos, Andamento e a faixa dos cards) é da página, não desta folha.
 */
"use client";

import type * as React from "react";

import { cn } from "cn";
import { ROTA_DA_FICHA_DA_TURMA } from "@/lib/navegacao/endereco-de-turma";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ABAS = [
  { valor: "ficha", rotulo: "Ficha" },
  { valor: "avaliacoes", rotulo: "Avaliações" },
] as const;

export function AbasDaTurma({
  ficha,
  avaliacoes,
}: {
  readonly ficha: React.ReactNode;
  readonly avaliacoes: React.ReactNode;
}) {
  const [aba, definirAba] = useParametro(ROTA_DA_FICHA_DA_TURMA, "aba");
  const atual = aba === "avaliacoes" ? "avaliacoes" : "ficha";

  return (
    <div className="flex flex-col gap-4" data-slot="abas-da-turma">
      <div role="tablist" aria-label="Seções da turma" className="border-borda flex gap-1 border-b">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="tab"
            id={`aba-${a.valor}`}
            aria-selected={atual === a.valor}
            aria-controls={`painel-${a.valor}`}
            data-aba={a.valor}
            onClick={() => void definirAba(a.valor)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              atual === a.valor
                ? "border-marca text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`painel-${atual}`}
        aria-labelledby={`aba-${atual}`}
        className="flex flex-col gap-5"
      >
        {atual === "avaliacoes" ? avaliacoes : ficha}
      </div>
    </div>
  );
}

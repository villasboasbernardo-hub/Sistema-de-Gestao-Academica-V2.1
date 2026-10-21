/**
 * As partes do currículo em edição — spec 021, Bloco 6, ajuste 3 da conferência do PR #82 (21/10/2026) — **folha de
 * cliente**, ligada ao `?parte=` de *Editar curso*.
 *
 * > *"Editar ali TODAS as informações dele — disciplinas, códigos, CH, UEs, avaliações, horários, atividades/limites,
 * > propósito, duração, PDF."*
 *
 * ⚠️ O PADRÃO TEM UM DONO SÓ, O CONTRATO (`dados`), como nas abas do curso. Trocar de parte empilha histórico.
 */
"use client";

import type * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const PARTES = [
  { valor: "dados", rotulo: "Dados e PDF" },
  { valor: "disciplinas", rotulo: "Disciplinas e avaliações" },
  { valor: "horarios", rotulo: "Horários" },
  { valor: "atividades", rotulo: "Atividades e limites" },
] as const;

type ValorDaParte = (typeof PARTES)[number]["valor"];

export function PartesDoCurriculo(paineis: { readonly [parte in ValorDaParte]: React.ReactNode }) {
  const [atual, definirParte] = useParametro("/cursos/[curso]/editar", "parte");

  return (
    <div className="flex flex-col gap-4" data-slot="partes-do-curriculo">
      <div
        role="tablist"
        aria-label="Partes do currículo"
        className="border-borda flex flex-wrap gap-1 border-b"
      >
        {PARTES.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="tab"
            id={`parte-${p.valor}`}
            aria-selected={atual === p.valor}
            aria-controls={`painel-parte-${p.valor}`}
            data-parte={p.valor}
            onClick={() => void definirParte(p.valor)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm",
              atual === p.valor
                ? "border-marca text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {p.rotulo}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`painel-parte-${atual}`} aria-labelledby={`parte-${atual}`}>
        {paineis[atual as ValorDaParte] ?? paineis.dados}
      </div>
    </div>
  );
}

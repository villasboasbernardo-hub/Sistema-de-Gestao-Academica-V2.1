/**
 * As abas de Atividades — **Atividades** e **Calendário** — folha de cliente (spec 023, Bloco 8, FR-005, D-6).
 *
 * ⚠️ **A ABA MORA NA URL E EMPILHA HISTÓRICO**, como as abas da turma (`AbasDaTurma.tsx`) e do curso.
 * ⚠️ **SÓ EXISTE PARA QUEM TEM PERMISSÃO DE CALENDÁRIO**: a página não a desenha para os demais.
 * ⚠️ **O CONTEÚDO É DESENHADO NO SERVIDOR** e chega por propriedade — só o da aba aberta.
 */
"use client";

import * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ABAS = [
  { valor: "atividades", rotulo: "Atividades" },
  { valor: "calendario", rotulo: "Calendário" },
] as const;

export function AbasDeAtividades({ children }: { readonly children: React.ReactNode }) {
  const [aba, definirAba] = useParametro("/atividades", "aba");
  const atual = aba === "calendario" ? "calendario" : "atividades";

  return (
    <div className="flex flex-col gap-4" data-slot="abas-de-atividades">
      <div
        role="tablist"
        aria-label="Seções de Atividades"
        className="border-borda flex gap-1 border-b"
      >
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
        className="flex flex-col gap-4"
      >
        {children}
      </div>
    </div>
  );
}

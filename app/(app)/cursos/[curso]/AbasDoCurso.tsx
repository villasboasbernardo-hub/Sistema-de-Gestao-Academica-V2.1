/**
 * As **duas** abas da página do curso — folha de cliente (`FR-006.2`, `FR-041`).
 *
 * ⚠️ **SÃO EXATAMENTE DUAS, E ISSO É A DECISÃO Q-02.** "Grade" e "Sobre o Curso". Avaliações e
 * Relatório **não** entram — nem como aba desabilitada, nem com marca *"em breve"* (`FR-008`, A-4):
 * *"a tela não anuncia o que não entrega"*.
 *
 * ⚠️ **A ABA MORA NA URL, E EMPILHA HISTÓRICO.** Trocar de aba é navegação: quem aperta "voltar"
 * desfaz **um** passo. É a diferença para os filtros de `/cursos`, que substituem.
 *
 * ⚠️ **O CONTEÚDO DAS DUAS É DESENHADO NO SERVIDOR** e chega por propriedade. Esta folha só decide
 * qual mostrar — se ela buscasse dado, a página inteira iria para o navegador.
 */
"use client";

import type * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ABAS = [
  { valor: "grade", rotulo: "Grade" },
  { valor: "sobre", rotulo: "Sobre o Curso" },
] as const;

export function AbasDoCurso({
  grade,
  sobre,
}: {
  readonly grade: React.ReactNode;
  readonly sobre: React.ReactNode;
}) {
  const [aba, definirAba] = useParametro("/cursos/[curso]", "aba");
  const atual = aba === "sobre" ? "sobre" : "grade";

  return (
    <div className="flex flex-col gap-4" data-slot="abas-do-curso">
      <div role="tablist" aria-label="Seções do curso" className="border-borda flex gap-1 border-b">
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
                ? "border-acento text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`painel-${atual}`} aria-labelledby={`aba-${atual}`}>
        {atual === "sobre" ? sobre : grade}
      </div>
    </div>
  );
}

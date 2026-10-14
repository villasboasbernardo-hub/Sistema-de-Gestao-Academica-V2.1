/**
 * As **três** abas da página do curso — folha de cliente (`FR-006.2`, `FR-041`; spec 014, FR-053).
 *
 * ⚠️ **ERAM EXATAMENTE DUAS (decisão Q-02 da spec 009), E A TERCEIRA ENTROU QUANDO A TELA PASSOU A ENTREGAR:**
 * "Grade", "Sobre o Curso" e — desde a spec 014 (`RF-CURSO-02`, FR-053) — "Avaliações". Relatório continua
 * **fora** — nem como aba desabilitada, nem com marca *"em breve"* (`FR-008`, A-4): *"a tela não anuncia o que
 * não entrega"*.
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
  { valor: "avaliacoes", rotulo: "Avaliações" },
] as const;

export function AbasDoCurso({
  grade,
  sobre,
  avaliacoes,
}: {
  readonly grade: React.ReactNode;
  readonly sobre: React.ReactNode;
  readonly avaliacoes: React.ReactNode;
}) {
  const [aba, definirAba] = useParametro("/cursos/[curso]", "aba");
  const atual = aba === "sobre" || aba === "avaliacoes" ? aba : "grade";

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
                ? "border-marca text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`painel-${atual}`} aria-labelledby={`aba-${atual}`}>
        {atual === "sobre" ? sobre : atual === "avaliacoes" ? avaliacoes : grade}
      </div>
    </div>
  );
}

/**
 * As abas de *Editar curso* — **Cadastro** e **Currículo** (item 7 do Bloco 10, spec 025, D-28) — **folha de cliente**.
 *
 * > *"Editar curso — página própria com abas: Cadastro (dados do curso) e Currículo (currículo, vigência, PDF; e dentro
 * > dela sub-abas Disciplinas, Horários, Atividades e limites). Um Salvar por aba, não dois soltos."* — Bernardo Villas
 * > Boas, 24/10/2026
 *
 * ⚠️ **A ABA MORA NA URL E EMPILHA HISTÓRICO** (`?aba=`), como as abas da turma, do curso e de Atividades.
 * ⚠️ **O CONTEÚDO É DESENHADO NO SERVIDOR** e chega por propriedade — só o da aba aberta é lido.
 */
"use client";

import type * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

const ABAS = [
  { valor: "cadastro", rotulo: "Cadastro" },
  { valor: "curriculo", rotulo: "Currículo" },
] as const;

export function AbasDaEdicaoDoCurso({
  cadastro,
  curriculo,
}: {
  readonly cadastro: React.ReactNode;
  readonly curriculo: React.ReactNode;
}) {
  const [aba, definirAba] = useParametro("/cursos/[curso]/editar", "aba");
  const [, definirParte] = useParametro("/cursos/[curso]/editar", "parte");
  const atual = aba === "curriculo" ? "curriculo" : "cadastro";

  return (
    <div className="flex flex-col gap-4" data-slot="abas-da-edicao-do-curso">
      <div
        role="tablist"
        aria-label="Partes de Editar curso"
        className="border-borda flex gap-1 border-b"
      >
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="tab"
            id={`aba-da-edicao-${a.valor}`}
            aria-selected={atual === a.valor}
            aria-controls={`painel-da-edicao-${a.valor}`}
            data-aba={a.valor}
            onClick={() => {
              /*
               * ⚠️ *Cadastro* LIMPA A SUB-ABA NA MESMA NAVEGAÇÃO (o nuqs junta as duas): sem isso sobrava `?parte=` sem
               *    `?aba=`, que é a forma do link antigo, e a página devolvia ao *Currículo* (revisão do PR #90).
               */
              if (a.valor === "cadastro") void definirParte(null);
              void definirAba(a.valor);
            }}
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
        id={`painel-da-edicao-${atual}`}
        aria-labelledby={`aba-da-edicao-${atual}`}
        className="flex flex-col gap-4"
      >
        {atual === "curriculo" ? curriculo : cadastro}
      </div>
    </div>
  );
}

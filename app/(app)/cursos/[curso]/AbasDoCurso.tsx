/**
 * As **seis** abas da página do curso — folha de cliente (`FR-006.2`, `FR-041`; spec 014, FR-053; spec 018).
 *
 * ⚠️ **SEIS DESDE O BLOCO 3** (spec 018, 19/10/2026): *Sobre o Curso · Grade · Disciplinas · Avaliações · Atividades ·
 * Horários*. Nenhuma delas mostra acompanhamento de turma — o curso mostra o **previsto** (FR-002.2 e FR-005.2 da spec 018); o andamento é da
 * turma.
 *
 * ⚠️ **ERAM EXATAMENTE DUAS (decisão Q-02 da spec 009), E A TERCEIRA ENTROU QUANDO A TELA PASSOU A ENTREGAR:**
 * "Sobre o Curso" (a primeira e a padrão desde a spec 016, FR-006.2), "Grade" e — desde a spec 014 (`RF-CURSO-02`, FR-053) — "Avaliações". Relatório continua
 * **fora** — nem como aba desabilitada, nem com marca *"em breve"* (`FR-008`, A-4): *"a tela não anuncia o que
 * não entrega"*.
 *
 * ⚠️ **A ABA MORA NA URL, E EMPILHA HISTÓRICO.** Trocar de aba é navegação: quem aperta "voltar"
 * desfaz **um** passo. É a diferença para os filtros de `/cursos`, que substituem.
 *
 * ⚠️ **O CONTEÚDO DE CADA ABA É DESENHADO NO SERVIDOR** e chega por propriedade. Esta folha só decide
 * qual mostrar — se ela buscasse dado, a página inteira iria para o navegador.
 */
"use client";

import type * as React from "react";

import { cn } from "cn";
import { useParametro } from "@/lib/navegacao/usar-parametro";

/* Spec 016 (FR-006.2, Q-10): *Sobre o Curso* primeiro — a ordem é a do contrato de parâmetros. */
const ABAS = [
  { valor: "sobre", rotulo: "Sobre o Curso" },
  // Spec 022 (Bloco 7, FR-005.1): a aba *Grade* passou a *Turmas* — e concentra as turmas do curso.
  { valor: "turmas", rotulo: "Turmas" },
  { valor: "disciplinas", rotulo: "Disciplinas" },
  { valor: "avaliacoes", rotulo: "Avaliações" },
  { valor: "atividades", rotulo: "Atividades" },
  { valor: "horarios", rotulo: "Horários" },
  // Spec 021 (Bloco 6), ajuste 2 da conferência do PR #82: os currículos do curso, para consulta.
  { valor: "curriculo", rotulo: "Currículo" },
] as const;

type ValorDaAba = (typeof ABAS)[number]["valor"];

export function AbasDoCurso(paineis: { readonly [aba in ValorDaAba]: React.ReactNode }) {
  /*
   * ⚠️ O PADRÃO TEM UM DONO SÓ, O CONTRATO (spec 016, FR-006.2). Até 17/10/2026 esta linha repetia
   *    `"grade"` num ternário, e trocar o padrão no contrato deixaria a aba aberta discordando da URL. O
   *    gancho já devolve o padrão quando o parâmetro falta ou vem podre (`withDefault`).
   */
  const [atual, definirAba] = useParametro("/cursos/[curso]", "aba");

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
        {paineis[atual as ValorDaAba] ?? paineis.sobre}
      </div>
    </div>
  );
}

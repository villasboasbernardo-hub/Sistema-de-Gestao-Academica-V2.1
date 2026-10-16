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

import * as React from "react";

import { cn } from "cn";
import {
  ANCORA_DAS_ABAS_DA_TURMA,
  ROTA_DA_FICHA_DA_TURMA,
} from "@/lib/navegacao/endereco-de-turma";
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
  const raiz = React.useRef<HTMLDivElement>(null);

  /*
   * ⚠️ **VINDO DE OUTRA PÁGINA, A ÂNCORA NÃO BASTA** (medido em 16/10/2026, caso 4 de `cards-levam-a-aba.spec.ts`):
   *    o `loading.tsx` da ficha entra primeiro, o Next procura `#abas-da-turma` antes de as abas existirem e deixa a
   *    página no topo. Ao MONTAR, com a âncora na URL, a folha leva às abas. Só ao montar: trocar de aba depois é
   *    clique nas próprias abas, que já estão à vista, e não deve fazer a página pular.
   */
  React.useEffect(() => {
    if (window.location.hash === `#${ANCORA_DAS_ABAS_DA_TURMA}`) {
      raiz.current?.scrollIntoView({ block: "start" });
    }
  }, []);

  return (
    // ⚠️ O `id` é o destino da âncora do card e dos alertas (`enderecoDasAvaliacoesDaTurma`): sem ele, o clique
    //    trocava a aba ABAIXO da dobra e a página subia para o topo (defeito de 16/10/2026).
    <div
      ref={raiz}
      id={ANCORA_DAS_ABAS_DA_TURMA}
      className="flex scroll-mt-4 flex-col gap-4"
      data-slot="abas-da-turma"
    >
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

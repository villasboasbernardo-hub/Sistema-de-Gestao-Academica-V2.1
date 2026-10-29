/**
 * As abas de versão do DSA — **Minuta · Original · ALT 1 · ALT 2…** — folha de cliente (Bloco 15, spec 030, `FR-007`;
 * RP-3 emendada).
 *
 * > *"'Minuta' (a de trabalho, editável, com o selo de situação) · 'Original' · 'ALT 1' · 'ALT 2'… (papel de cada versão
 * > publicada, só leitura, com Reimprimir). Substituem a lista 'Versões publicadas'. Semana nunca publicada: só a aba
 * > Minuta. Estado da aba na URL."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **A ABA MORA NA URL E EMPILHA HISTÓRICO** (`?versao=`, D-15), como as abas da turma (`AbasDaTurma.tsx`).
 * ⚠️ **O CONTEÚDO É DESENHADO NO SERVIDOR, SÓ O DA ABA ABERTA**, e chega como `children`: o papel de uma versão é grande,
 *    e mandar todos ao navegador para mostrar um seria o gotcha 1 com o maior conteúdo da aplicação. Trocar de aba vai
 *    ao servidor (`avisaServidor`).
 * ⚠️ **O SELO VAI NA ABA MINUTA** (D-15): é a situação da cópia de trabalho; as abas de versão são papel publicado.
 */
"use client";

import * as React from "react";

import { cn } from "cn";
import type { AbaDeVersao } from "@/lib/dominio/dsa/versao-escolhida";
import { useParametro } from "@/lib/navegacao/usar-parametro";

import { ROTA_DO_DSA } from "./consulta";

export function AbasDeVersao({
  abas,
  atual,
  seloDaMinuta,
  children,
}: {
  readonly abas: readonly AbaDeVersao[];
  /** A aba que o servidor desenhou (`""` = a Minuta). */
  readonly atual: string;
  /** O selo da situação e o contador de não salvos, já desenhados. */
  readonly seloDaMinuta: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const [, definirVersao, esperando] = useParametro(ROTA_DO_DSA, "versao");
  return (
    <div className="flex min-w-0 flex-col gap-3" data-slot="abas-de-versao">
      <div
        role="tablist"
        aria-label="Versões da semana"
        className="border-borda flex flex-wrap gap-1 border-b"
      >
        {abas.map((a) => (
          <button
            key={a.valor || "minuta"}
            type="button"
            role="tab"
            id={`aba-versao-${a.valor || "minuta"}`}
            aria-selected={atual === a.valor}
            aria-controls="painel-da-versao"
            data-versao={a.valor === "" ? "minuta" : a.valor}
            onClick={() => void definirVersao(a.valor === "" ? null : a.valor)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm",
              atual === a.valor
                ? "border-marca text-texto font-semibold"
                : "text-texto-suave hover:text-texto border-transparent",
            )}
          >
            {a.rotulo}
            {a.valor === "" ? seloDaMinuta : null}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="painel-da-versao"
        aria-labelledby={`aba-versao-${atual || "minuta"}`}
        aria-busy={esperando || undefined}
        className="flex min-w-0 flex-col gap-3"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A barra de ações de uma ficha — **os verbos da página numa linha só, do mesmo tamanho**.
 *
 * > *"Editar, Desativar e Nova turma numa barra só, mesmo tamanho."*
 * > — item 1.6 do plano de correções em blocos, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **NASCE COM DOIS CONSUMIDORES, e é por isso que é componente:** a página do curso (Editar ·
 * Desativar/Reativar · Nova turma, FR-006.1 da spec 016) e a ficha do instrutor (Editar ·
 * Desativar/Reativar · Excluir, FR-010.2). Duas barras escritas à mão divergiriam no espaçamento na
 * primeira tela que mexesse numa só.
 *
 * ⚠️ **A BARRA NÃO DECIDE PERMISSÃO.** Cada filho chega já filtrado por quem a monta (`SePodeVer`, ou a
 * condição da própria tela): decidir aqui seria uma segunda regra de "quem pode", e a regra da casa é
 * que o botão segue a permissão do destino, nunca uma regra própria.
 *
 * ⚠️ **O "MESMO TAMANHO" É CONTRATO DE QUEM USA:** todo filho usa o tamanho `sm` do `Button` (ou
 * `buttonVariants({ size: "sm" })` num link). A prova é o caso de ponta a ponta que mede a altura das
 * caixas, não uma regra de CSS que forçasse altura em qualquer descendente — essa esconderia o filho
 * que veio no tamanho errado.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** É uma linha flexível; os filhos que têm estado (diálogos) são folhas
 * próprias.
 */
import type * as React from "react";
import { cn } from "cn";

export type BarraDeAcoesProps = {
  /** Nome acessível da barra — *"Ações do curso"*, *"Ações do instrutor"*. */
  readonly rotulo: string;
  readonly children: React.ReactNode;
  readonly className?: string;
};

export function BarraDeAcoes({ rotulo, children, className }: BarraDeAcoesProps): React.ReactNode {
  return (
    <div
      role="group"
      aria-label={rotulo}
      data-slot="barra-de-acoes"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {children}
    </div>
  );
}

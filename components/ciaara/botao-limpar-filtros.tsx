/**
 * "Limpar filtros" — **o botão de toda tela que filtra** (padrão de tela, 23/09/2026).
 *
 * > *"Toda página que tem filtros tem o botão 'Limpar filtros', igual ao do módulo de instrutores.
 * > É padrão do sistema."*
 * > — decisão de Bernardo Villas Boas, 23/09/2026
 *
 * ⚠️ **ELE NASCEU COMO JSX SOLTO DENTRO DE `FiltrosDeInstrutores.tsx`**, e virou componente no dia em
 * que a segunda tela precisou dele. É a mesma história de `AvisosRecolhiveis` e da lista de
 * classificações nesta fatia: **três consumidores com um componente é vocabulário; três cópias são
 * três botões que divergem**.
 *
 * ⚠️ **A REGRA DE QUANDO APARECER MORA AQUI DENTRO, e não em cada tela.** Ele só existe quando há
 * filtro aplicado — um botão de limpar sempre visível numa tela sem filtro é um botão que não faz
 * nada, e ensina a ignorá-lo. Deixar essa condição a cargo de quem chama faria a terceira tela
 * esquecê-la.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Ele recebe o manipulador por propriedade e é sempre consumido por
 * uma folha de cliente — a barra de filtros. O marcador aqui não acrescentaria nada e o poria na
 * lista fechada do documento 23 §3.1 sem motivo.
 */
import type * as React from "react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";

export type BotaoLimparFiltrosProps = {
  /** Há algum filtro fora do padrão? Sem isso, o botão não aparece. */
  readonly haFiltroAtivo: boolean;
  /** Devolve cada parâmetro ao padrão. Quem sabe quais são é a tela. */
  readonly aoLimpar: () => void;
  readonly className?: string;
};

export function BotaoLimparFiltros({
  haFiltroAtivo,
  aoLimpar,
  className,
}: BotaoLimparFiltrosProps): React.ReactNode {
  if (!haFiltroAtivo) return null;

  return (
    <div className={cn("flex", className)}>
      <Button type="button" variant="ghost" size="sm" onClick={aoLimpar} data-slot="limpar-filtros">
        Limpar filtros
      </Button>
    </div>
  );
}

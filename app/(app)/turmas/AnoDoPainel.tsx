/**
 * O seletor de ano do painel de `/turmas` — **folha de cliente** (ajuste da conferência do PR #73, 19/10/2026).
 *
 * > *"O PAINEL MOSTRA UM ANO SÓ: por padrão o ano letivo vigente; um seletor de ano (na URL) troca."* — Bernardo Villas
 * > Boas, 19/10/2026
 *
 * ⚠️ **É O MESMO `ano` DA URL QUE O FILTRO DA LISTA USA**, e não um parâmetro segundo: o painel é do recorte (C-14), e
 *    dois anos na mesma tela — um do painel, outro da lista — dariam um painel de zeros sem dizer por quê. Escolher um
 *    ano aqui recorta a lista também; **o vigente é o padrão**, então escolhê-lo LIMPA o parâmetro (URL sem `ano` = o
 *    ano vigente no painel e todos os anos na lista).
 * ⚠️ **BOTÕES, E NÃO UM `<select>`**: são poucos anos, e cada um fica a um clique, com o escolhido marcado
 *    (`aria-pressed`).
 */
"use client";

import { Button } from "@/components/ui/button";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export function AnoDoPainel({
  anos,
  ano,
  vigente,
}: {
  /** Os anos oferecidos (`anosDoSeletor`), do mais novo ao mais velho. */
  readonly anos: readonly number[];
  /** O ano que o painel mostra agora. */
  readonly ano: number;
  /** O ano letivo vigente — o padrão. */
  readonly vigente: number;
}) {
  const [, definirAno] = useParametro("/turmas", "ano");

  return (
    <div
      role="group"
      aria-label="Ano letivo do painel"
      className="flex flex-wrap items-center gap-1"
      data-slot="ano-do-painel"
    >
      <span className="text-texto-suave mr-1 text-sm">Ano letivo</span>
      {anos.map((a) => (
        <Button
          key={a}
          type="button"
          size="sm"
          variant={a === ano ? "default" : "outline"}
          aria-pressed={a === ano}
          data-slot="ano-do-painel-opcao"
          data-ano={a}
          onClick={() => void definirAno(a === vigente ? null : String(a))}
        >
          {a}
          {a === vigente ? " (vigente)" : ""}
        </Button>
      ))}
    </div>
  );
}

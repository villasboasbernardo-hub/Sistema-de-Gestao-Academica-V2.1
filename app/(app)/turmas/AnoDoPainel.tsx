/**
 * O seletor de ano do Início e de Turmas — **folha de cliente** (ajuste da conferência do PR #73, 19/10/2026; ajuste A-1
 * da conferência do PR #77, 20/10/2026).
 *
 * > *"ANO: sem o termo "ano letivo" e sem os botões de ano. Uma CAIXA DE SELEÇÃO única (select) com os anos que existem
 * > nas turmas, no CANTO SUPERIOR DIREITO da página, no Início E em Turmas (o componente é o mesmo, AnoDoPainel).
 * > Padrão: o ano da data de hoje em São Paulo (hojeNaCiaara), nunca um ano fixo no código."* — Bernardo Villas Boas,
 * > 20/10/2026
 *
 * ⚠️ **É O MESMO `ano` DA URL QUE O FILTRO DA LISTA USA**, e não um parâmetro segundo: o painel é do recorte (C-14 da
 *    spec 017), e dois anos na mesma tela dariam um painel de zeros sem dizer por quê. **O vigente é o padrão**, então
 *    escolhê-lo LIMPA o parâmetro (URL sem `ano` = o ano de hoje no painel e todos os anos na lista de Turmas).
 * ⚠️ **QUEM POSICIONA É A PÁGINA**: o seletor vai no cabeçalho dela, à direita do título.
 * ⚠️ **O ANO PADRÃO CHEGA POR PROPRIEDADE** (`vigente`), calculado no servidor por `anoDoPainel("", hojeNaCiaara())`:
 *    aqui não há relógio nem número.
 */
"use client";

import { useParametro } from "@/lib/navegacao/usar-parametro";

export function AnoDoPainel({
  anos,
  ano,
  vigente,
  rota = "/turmas",
}: {
  /** Os anos oferecidos (`anosDoSeletor`), do mais novo ao mais velho. */
  readonly anos: readonly number[];
  /** O ano que a página mostra agora. */
  readonly ano: number;
  /** O ano de hoje em São Paulo — o padrão. */
  readonly vigente: number;
  /** A tela cujo `?ano=` ele escreve. */
  readonly rota?: "/turmas" | "/inicio";
}) {
  const [, definirAnoDasTurmas] = useParametro("/turmas", "ano");
  const [, definirAnoDoInicio] = useParametro("/inicio", "ano");
  const definirAno = rota === "/inicio" ? definirAnoDoInicio : definirAnoDasTurmas;

  return (
    <label className="flex shrink-0 items-center gap-2 text-sm" data-slot="ano-do-painel">
      <span className="text-texto-suave">Ano</span>
      <select
        value={ano}
        onChange={(e) => {
          const escolhido = Number(e.target.value);
          void definirAno(escolhido === vigente ? null : String(escolhido));
        }}
        data-slot="ano-do-painel-escolha"
        className="border-borda bg-superficie text-texto rounded-ciaara h-9 border px-2 text-sm"
      >
        {anos.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </label>
  );
}

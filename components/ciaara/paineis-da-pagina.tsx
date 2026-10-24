/**
 * Os painéis recolhíveis da página — **Filtros** e **Estatísticas** como ícones na barra de ações (RT-4 do Bloco 10,
 * spec 025, D-18 e D-19).
 *
 * > *"Filtros e Estatísticas são ícones na mesma linha das ações, abrem painel recolhível."* — Bernardo Villas Boas,
 * > 24/10/2026 (`docs/correcoes/padroes-de-tela.md`)
 *
 * ⚠️ **TRÊS PEÇAS, E A PÁGINA (SERVIDOR) AS MONTA**: o `ProvedorDePaineis` envolve o cabeçalho e o conteúdo; o
 *    `GatilhoDePainel` vai na `BarraDeAcoes`, ao lado de *Novo…*; o `ConteudoDePainel` vai abaixo do cabeçalho, com o
 *    filtro ou as estatísticas que o servidor desenhou e passou por `children`. Esta folha só guarda o aberto/fechado.
 * ⚠️ **ABRIR NÃO MUDA A URL** (`estado-efemero-intacto.test.ts`): é estado de olhar, não de navegação — o que o filtro
 *    filtra é que vai para a URL, pelos campos dele.
 * ⚠️ **OS DOIS COMEÇAM RECOLHIDOS E SÃO INDEPENDENTES** (D-18): abrir as estatísticas não fecha os filtros.
 * ⚠️ **O CONTEÚDO SÓ EXISTE ABERTO**: fechado, nada é montado — os gráficos não são desenhados à toa, e os testes que
 *    contam cartões contam zero.
 * ⚠️ **O NÚMERO DE FILTROS ATIVOS CHEGA PRONTO DO SERVIDOR** (`filtrosForaDoPadrao`, a mesma régua do *Limpar
 *    filtros*): a página o recalcula a cada troca de filtro, que avisa o servidor.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";

export type NomeDoPainel = "filtros" | "estatisticas";

type Paineis = {
  readonly abertos: ReadonlySet<NomeDoPainel>;
  readonly alternar: (painel: NomeDoPainel) => void;
  readonly id: (painel: NomeDoPainel) => string;
};

const ContextoDosPaineis = React.createContext<Paineis | null>(null);
/** Verdadeiro dentro de um `ConteudoDePainel` — o `FiltroAvancado` deixa de ter gatilho próprio ali. */
const ContextoDoConteudo = React.createContext(false);

/** Dentro de um painel da página, o componente não desenha o próprio botão de abrir. */
export function useDentroDePainel(): boolean {
  return React.useContext(ContextoDoConteudo);
}

export function ProvedorDePaineis({ children }: { readonly children: React.ReactNode }) {
  const base = React.useId();
  const [abertos, definirAbertos] = React.useState<ReadonlySet<NomeDoPainel>>(() => new Set());
  const valor = React.useMemo<Paineis>(
    () => ({
      abertos,
      alternar: (painel) =>
        definirAbertos((atual) => {
          const proximo = new Set(atual);
          if (proximo.has(painel)) proximo.delete(painel);
          else proximo.add(painel);
          return proximo;
        }),
      id: (painel) => `${base}-${painel}`,
    }),
    [abertos, base],
  );
  return <ContextoDosPaineis.Provider value={valor}>{children}</ContextoDosPaineis.Provider>;
}

function usePaineis(): Paineis {
  const paineis = React.useContext(ContextoDosPaineis);
  if (!paineis)
    throw new Error("GatilhoDePainel e ConteudoDePainel moram dentro de ProvedorDePaineis.");
  return paineis;
}

const ROTULO: Readonly<Record<NomeDoPainel, string>> = {
  filtros: "Filtros",
  estatisticas: "Estatísticas",
};

export function GatilhoDePainel({
  painel,
  contagem = 0,
}: {
  readonly painel: NomeDoPainel;
  /** Quantos filtros estão fora do padrão (só nos Filtros). */
  readonly contagem?: number;
}) {
  const { abertos, alternar, id } = usePaineis();
  const aberto = abertos.has(painel);
  const rotulo =
    contagem > 0
      ? `${ROTULO[painel]} (${contagem} ${contagem === 1 ? "ativo" : "ativos"})`
      : ROTULO[painel];
  return (
    <span className="relative inline-flex" data-slot={`gatilho-de-${painel}`}>
      <BotaoDeIcone
        acao={painel}
        rotulo={rotulo}
        variante={aberto ? "padrao" : "contorno"}
        aria-expanded={aberto}
        aria-controls={id(painel)}
        onClick={() => alternar(painel)}
        data-slot={`abrir-${painel}`}
      />
      {contagem > 0 ? (
        <span
          aria-hidden="true"
          data-slot="filtros-ativos"
          className="bg-marca-suave text-texto rounded-ciaara-sm pointer-events-none absolute -top-1.5 -right-1.5 px-1 text-2xs font-medium tabular-nums"
        >
          {contagem}
        </span>
      ) : null}
    </span>
  );
}

export function ConteudoDePainel({
  painel,
  children,
}: {
  readonly painel: NomeDoPainel;
  readonly children: React.ReactNode;
}) {
  const { abertos, id } = usePaineis();
  if (!abertos.has(painel)) return null;
  return (
    <section
      id={id(painel)}
      aria-label={ROTULO[painel]}
      data-slot={`painel-de-${painel}`}
      className="border-borda bg-superficie rounded-ciaara flex flex-col gap-3 border p-3"
    >
      <ContextoDoConteudo.Provider value={true}>{children}</ContextoDoConteudo.Provider>
    </section>
  );
}

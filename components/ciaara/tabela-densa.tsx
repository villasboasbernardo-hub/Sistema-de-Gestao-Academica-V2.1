/**
 * Tabela densa — genérica, navegável por teclado (`RNF-USA-02`, `RNF-USA-06`, `FR-006`, `FR-023`).
 *
 * ⚠️ ELA RENDERIZA **TODAS** AS LINHAS (`FR-006.1`, decisão de 10/09/2026, e é a mais difícil de
 * reverter desta fatia). Os volumes reais não pedem janela de visão: 177 instrutores, 175
 * disciplinas, 29 turmas, e o maior conjunto — cerca de 1.753 registros de aula — chega **filtrado
 * por turma e semana**, nunca inteiro. E há a razão que decide: renderização parcial precisa de
 * artifício para que o teclado alcance linha que não está na tela, e o `FR-023` exige justamente
 * isso. **Complexidade que briga com acessibilidade precisa de um problema medido, e não há.**
 * Se um dia um conjunto real chegar inteiro e grande, a decisão se reabre **com a medição na mão**
 * — não com um limite arbitrário escrito aqui.
 *
 * ⚠️ A ORDENAÇÃO DAQUI É DE APRESENTAÇÃO, **NUNCA DE DOMÍNIO**. A antiguidade não passa por esta
 * tabela: ela é da função pura, aplicada antes. Uma tabela que soubesse ordenar por antiguidade
 * seria um segundo lugar onde a `RN-ANT-01` vive, e essa regra tem *Risco: Alto* justamente por ser
 * fácil de duplicar.
 *
 * ⚠️ COLUNA NUMÉRICA LIGA O ALGARISMO TABULAR que a fatia (a) deixou no `@theme`. Sem ele uma
 * coluna de horas não alinha, e a tabela densa perde exatamente o que a torna densa.
 *
 * ⚠️ COM MARCADOR DE CLIENTE: teclado, foco, ordenação e filtro são comportamento de navegador.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";

import { EstadoVazio, type MotivoDoVazio } from "@/components/ciaara/EstadoVazio";
import { CelulaNavegavel, ListaNavegavel } from "@/components/ciaara/lista-navegavel";
import { Input } from "@/components/ui/input";

/** As três densidades do documento 23 §5. */
export type Densidade = "compacta" | "padrao" | "confortavel";

const ALTURA_DA_LINHA: Record<Densidade, string> = {
  compacta: "h-[var(--altura-linha-compacta)]",
  padrao: "h-[var(--altura-linha-padrao)]",
  confortavel: "h-[var(--altura-linha-confortavel)]",
};

type ColunaBase<T> = {
  readonly chave: string;
  readonly titulo: string;
  readonly alinhamento?: "inicio" | "fim" | "centro";
  /** Liga o algarismo tabular. Sem ele, a coluna de horas dança a cada linha. */
  readonly numerica?: boolean;
  /** Formata para exibir. **Ela formata; nunca calcula regra.** */
  readonly celula: (linha: T) => React.ReactNode;
};

/**
 * Uma coluna da tabela.
 *
 * ⚠️ `ordenavel` EXIGE `valor` NO TIPO, e isso é deliberado: uma coluna marcada como ordenável sem
 * dizer por qual valor ordenar é um cabeçalho que parece clicável e não faz nada. Aqui ela não
 * compila.
 *
 * ⚠️ `valor` NÃO É `celula`, e o par não é redundância. A célula devolve nó de React — não há como
 * comparar dois nós nem procurar texto dentro deles sem renderizar. O acessor devolve o que ordena
 * e o que a busca lê. **É acréscimo desta implementação ao modelo da Fase 1**, que previa só
 * `celula`; sem ele, `ordenavel` seria uma promessa sem mecanismo.
 */
export type Coluna<T> = ColunaBase<T> &
  (
    | { readonly ordenavel?: false; readonly valor?: (linha: T) => string | number }
    | { readonly ordenavel: true; readonly valor: (linha: T) => string | number }
  );

export type TabelaDensaProps<T> = {
  readonly linhas: readonly T[];
  readonly colunas: readonly Coluna<T>[];
  readonly chaveLinha: (linha: T) => string;
  readonly rotulo: string;
  readonly densidade?: Densidade;
  /** Liga o campo de busca textual sobre as colunas que declaram `valor`. */
  readonly comBusca?: boolean;
  readonly aoAtivarLinha?: (linha: T) => void;
  readonly motivoDoVazio?: MotivoDoVazio;
  readonly className?: string;
};

const ALINHAMENTO = {
  inicio: "text-left",
  fim: "text-right",
  centro: "text-center",
} as const;

type Ordem = { readonly chave: string; readonly crescente: boolean };

/** Compara dois valores de célula. Texto por `localeCompare`; número por subtração. */
function comparar(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}

function alinhamentoDe<T>(coluna: Coluna<T>): string {
  return ALINHAMENTO[coluna.alinhamento ?? (coluna.numerica ? "fim" : "inicio")];
}

export function TabelaDensa<T>({
  linhas,
  colunas,
  chaveLinha,
  rotulo,
  densidade = "padrao",
  comBusca = false,
  aoAtivarLinha,
  motivoDoVazio = "sem-dado",
  className,
}: TabelaDensaProps<T>) {
  const [ordem, definirOrdem] = React.useState<Ordem | null>(null);
  const [busca, definirBusca] = React.useState("");

  const filtradas = React.useMemo(() => {
    const alvo = busca.trim().toLocaleLowerCase("pt-BR");
    if (!alvo) return linhas;
    /*
     * ⚠️ A BUSCA LÊ SÓ AS COLUNAS QUE DECLARAM `valor`. Não é limitação escondida: uma coluna cujo
     * conteúdo é um componente — um emblema de status, um nome com negrito — não tem texto para
     * procurar sem renderizar, e renderizar para buscar seria a tabela adivinhando o que quem
     * chama quis dizer.
     */
    return linhas.filter((linha) =>
      colunas.some((c) =>
        c.valor ? String(c.valor(linha)).toLocaleLowerCase("pt-BR").includes(alvo) : false,
      ),
    );
  }, [linhas, colunas, busca]);

  const visiveis = React.useMemo(() => {
    if (!ordem) return filtradas;
    const coluna = colunas.find((c) => c.chave === ordem.chave);
    const acessor = coluna?.valor;
    if (!acessor) return filtradas;
    return filtradas
      .slice()
      .sort((a, b) => (ordem.crescente ? 1 : -1) * comparar(acessor(a), acessor(b)));
  }, [filtradas, colunas, ordem]);

  function alternarOrdem(chave: string) {
    definirOrdem((atual) => {
      if (!atual || atual.chave !== chave) return { chave, crescente: true };
      // ⚠️ Três estados, e o terceiro importa: crescente, decrescente e DE VOLTA À ORDEM ORIGINAL.
      // Sem ele, quem clicou por engano não tem como desfazer — e a ordem original pode ser a de
      // domínio, que é a única que o sistema garante.
      return atual.crescente ? { chave, crescente: false } : null;
    });
  }

  const semBusca = busca.trim().length === 0;

  /*
   * ⚠️ O CABEÇALHO É A LINHA 0 DA GRADE, e não uma fila de botões antes dela. A primeira versão
   * punha um `<button>` dentro de cada `<th>` para ordenar — e cada botão virava uma parada de
   * tabulação, dentro do contêiner. Uma tabela de oito colunas passava a ter nove paradas, e a
   * primeira frase do contrato de teclado — *"`Tab` entra na grade e sai dela em UM passo"* —
   * deixava de valer sem que nada acusasse.
   *
   * ⚠️ É TAMBÉM O PADRÃO DA GRADE ARIA: o cabeçalho é uma linha, e ordenar é ativar a célula de
   * cabeçalho. `aria-sort` continua no `<th>`, e quem usa leitor de tela ouve por qual coluna a
   * tabela está ordenada.
   */
  const linhasNavegaveis = visiveis.length === 0 ? 0 : visiveis.length + 1;
  const colunasNavegaveis = visiveis.length === 0 ? 0 : colunas.length;

  function ativar({ linha, coluna }: { linha: number; coluna: number }) {
    if (linha === 0) {
      const alvo = colunas[coluna];
      if (alvo?.ordenavel) alternarOrdem(alvo.chave);
      return;
    }
    const alvo = visiveis[linha - 1];
    if (alvo !== undefined) aoAtivarLinha?.(alvo);
  }

  return (
    <div data-slot="tabela-densa" className={cn("flex flex-col gap-2", className)}>
      {comBusca ? (
        <div className="flex items-center gap-2">
          {/* veste: o desenho de apoio do campo de busca — nunca dado (FR-031) */}
          <SearchIcon aria-hidden="true" className="text-texto-tenue size-4 shrink-0" />
          <Input
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            placeholder="Filtrar"
            aria-label={`Filtrar ${rotulo.toLocaleLowerCase("pt-BR")}`}
            className="h-8 max-w-xs"
          />
        </div>
      ) : null}

      {/*
        ⚠️ A LISTA NAVEGÁVEL ENVOLVE OS DOIS CASOS, INCLUSIVE O VAZIO, e isso é o contrato de
        teclado: *"tabela sem linhas — o contêiner continua alcançável por `Tab`, e o estado vazio
        é lido"*. Trocar o contêiner por um estado vazio solto faria a tabulação pular a região
        inteira, e quem navega por teclado passaria direto por uma tela que tem o que dizer.

        ⚠️ `papel="nenhum"`: o papel de grade vai no `<table>`, não nesta caixa. Um
        `<div role="grid">` em volta de um `<table>` produz árvore quebrada — grade contendo tabela
        contendo linhas — e leitor de tela anuncia duas estruturas onde há uma.

        ⚠️ O PONTO DE QUEBRA DO `FR-028` É ESTA CAIXA, não a página: abaixo de 1024px a tabela rola
        aqui dentro e a página não rola na horizontal. 1024px não é gosto — oito colunas a 14px numa
        tabela densa ocupam perto de 900px, e o `RNF-USA-02` diz que o uso típico é em tela grande.
      */}
      <ListaNavegavel
        linhas={linhasNavegaveis}
        colunas={colunasNavegaveis}
        papel="nenhum"
        rotulo={rotulo}
        chaveDeReinicio={busca}
        aoAtivar={ativar}
        className="w-full max-w-full overflow-x-auto"
      >
        {visiveis.length === 0 ? (
          <EstadoVazio
            motivo={semBusca ? motivoDoVazio : "sem-dado"}
            {...(semBusca ? {} : { detalhe: `Nenhuma linha corresponde a “${busca}”.` })}
          />
        ) : (
          <table
            role="grid"
            aria-label={rotulo}
            aria-rowcount={visiveis.length}
            className="w-full min-w-[64rem] caption-bottom text-sm lg:min-w-0"
          >
            <thead className="bg-superficie-2">
              <tr className="border-borda border-b">
                {colunas.map((coluna, indiceColuna) => {
                  const ativa = ordem !== null && ordem.chave === coluna.chave;
                  const crescente = ativa && ordem.crescente;
                  const Seta = !ativa
                    ? ChevronsUpDownIcon
                    : crescente
                      ? ArrowUpIcon
                      : ArrowDownIcon;
                  return (
                    <CelulaNavegavel key={coluna.chave} linha={0} coluna={indiceColuna}>
                      <th
                        scope="col"
                        /*
                         * ⚠️ `aria-sort` É O QUE TORNA A ORDENAÇÃO AUDÍVEL. A seta desenhada informa
                         * só quem vê a tela; sem este atributo, quem usa leitor de tela não sabe
                         * por qual coluna a tabela está ordenada nem em que sentido.
                         */
                        aria-sort={!ativa ? "none" : crescente ? "ascending" : "descending"}
                        onClick={coluna.ordenavel ? () => alternarOrdem(coluna.chave) : undefined}
                        className={cn(
                          "text-texto px-2 py-1 font-medium whitespace-nowrap",
                          alinhamentoDe(coluna),
                          coluna.ordenavel && "cursor-pointer select-none",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {coluna.titulo}
                          {coluna.ordenavel ? (
                            <>
                              <Seta aria-hidden="true" className="size-3" />
                              <span className="sr-only">
                                {ativa
                                  ? crescente
                                    ? "ordenado em ordem crescente"
                                    : "ordenado em ordem decrescente"
                                  : "ordenável: pressione Enter para ordenar por esta coluna"}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </th>
                    </CelulaNavegavel>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((linha, indiceLinha) => (
                <tr
                  key={chaveLinha(linha)}
                  className={cn(
                    "border-borda hover:bg-muted/50 border-b",
                    ALTURA_DA_LINHA[densidade],
                  )}
                >
                  {colunas.map((coluna, indiceColuna) => (
                    /* ⚠️ `+ 1`: a linha 0 é o cabeçalho, e é ele que torna a grade um único ponto
                       de parada na ordem de tabulação. */
                    <CelulaNavegavel
                      key={coluna.chave}
                      linha={indiceLinha + 1}
                      coluna={indiceColuna}
                    >
                      <td
                        className={cn(
                          "px-2 py-1 align-middle whitespace-nowrap",
                          alinhamentoDe(coluna),
                          coluna.numerica && "tabular-nums",
                        )}
                      >
                        {coluna.celula(linha)}
                      </td>
                    </CelulaNavegavel>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ListaNavegavel>
    </div>
  );
}

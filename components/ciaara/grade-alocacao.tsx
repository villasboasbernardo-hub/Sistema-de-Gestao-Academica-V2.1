/**
 * `GradeAlocacao` — a matriz densa `linha × coluna`, genérica (documento 23 §3.2 e §3.3).
 *
 * ⚠️ **ELA NÃO SABE O QUE É UM TEMPO DE AULA, E ISSO É O REQUISITO, não minimalismo.** Nenhuma
 * regra `RN-` mora aqui: ela recebe linhas, colunas e células prontas e desenha. Quem sabe o que é
 * TA, bloco, feriado e conflito é `GradeDsa`, que compõe sobre esta — e antes dele, as funções
 * puras de `lib/dominio/dsa/`. Uma grade que soubesse montar a semana seria um **segundo** lugar
 * onde a montagem vive, e a `RF-DSA-03` passaria a ter duas implementações.
 *
 * ⚠️ **ELA É FOLHA DE CLIENTE, E A PRIMEIRA VERSÃO NÃO ERA — o `next build` provou que não podia
 * ser.** Eu a escrevi como Server Component, porque o plano pedia *"sem `use client`"* e porque o
 * marcador contamina a subárvore de importação (gotcha 1). **O resultado foi um defeito que só
 * aparece em produção:** a tela do DSA caía no `error.tsx` com *"Minified React error #130"*
 * (*element type is invalid: got undefined*), enquanto `next dev` servia a mesma rota com **200** e
 * a vitrine `/estilo` renderizava a grade sem queixa.
 *
 * ⚠️ **A CAUSA É O `cloneElement` DE `CelulaNavegavel`.** Ela clona o filho para lhe pôr `ref` e
 * `tabIndex` — e faz isso **no cliente**. Com a grade no servidor, o `<td>` que ela recebe chega
 * como nó **serializado** do RSC, cujo tipo o cliente não consegue clonar: `cloneElement` devolve um
 * elemento de tipo `undefined`, e é esse `undefined` que o React #130 nomeia. A vitrine passava
 * porque `app/estilo/amostras.tsx` é `"use client"` — lá a grade já estava no grafo de cliente, e o
 * `<td>` era um elemento de verdade.
 *
 * ⚠️ **E O PRECEDENTE JÁ ESTAVA NO REPOSITÓRIO:** `tabela-densa.tsx` usa as MESMAS duas primitivas
 * e **é** `"use client"` desde a fatia (b) do Épico 4. A exigência do plano era incompatível com o
 * teclado que ele mesmo mandava reaproveitar; o custo real é o markup da grade no bundle — **não** o
 * dado, que continua sendo lido e montado no servidor e chega por propriedade.
 *
 * ⚠️ **O TECLADO É O `proximaPosicao` QUE JÁ EXISTE, e não uma segunda navegação.** A `TabelaDensa`
 * e o `SeletorInstrutor` usam a mesma função; escrever setas aqui faria **três** navegações por
 * teclado divergirem, que é exatamente o defeito que a fatia (b) do Épico 4 veio fechar. A grade
 * entra e sai da tabulação em **um** passo, por *roving tabindex*.
 *
 * ⚠️ **A ROLAGEM HORIZONTAL É DELA, NÃO DA PÁGINA** (`RNF-COMP-01`). Numa tela de 1280×600 a
 * semana com sábado não cabe, e deixar a página rolar lateralmente arrasta o cabeçalho e o menu
 * junto — o operador perde a referência de qual dia está olhando. O contêiner rola; a página, não.
 * Os cabeçalhos da esquerda e do topo ficam **presos** (`sticky`), senão rolar perde justamente o
 * rótulo que diz onde se está.
 *
 * ⚠️ **O NÚMERO VAI NO ATRIBUTO, NUNCA SÓ NA COR** (`RNF-USA-05`, e a lição da barra de progresso
 * do Épico 5.5): `data-tom` e `aria-label` carregam o estado de cada célula, para que a diferença
 * entre *livre*, *ocupada* e *bloqueada* não dependa de quem distingue as cores.
 */
"use client";

import * as React from "react";
import { cn } from "cn";

import { CelulaNavegavel, ListaNavegavel } from "@/components/ciaara/lista-navegavel";

/**
 * O tom visual de uma célula.
 *
 * ⚠️ **SÃO NOMES DO VOCABULÁRIO DO TEMA, não do domínio.** Cada um resolve para um trio
 * `--color-<papel>-fundo/tinta/borda` declarado em `app/globals.css` — os mesmos trios que a
 * `BadgeStatus` usa. Inventar um nome aqui faria `bg-<nome>-fundo` **não compilar para cor
 * nenhuma** e a célula sair sem fundo, sem erro: é o defeito que a invariante `I-4c` passou a
 * guardar depois dos cinco tokens inexistentes de 05/10/2026.
 */
export type TomDaCelula =
  "livre" | "ocupada" | "nao_letivo" | "avaliacao" | "bloqueada" | "sem_relogio" | "conflito";

const TINTA_DO_TOM: Readonly<Record<TomDaCelula, string>> = {
  livre: "bg-superficie",
  ocupada: "bg-executado-fundo text-executado-tinta",
  nao_letivo: "bg-nao-letivo-fundo text-nao-letivo-tinta",
  avaliacao: "bg-reserva-fundo text-reserva-tinta",
  bloqueada: "bg-inativo-fundo text-inativo-tinta",
  // veste: o ESTADO VAZIO da célula sem relógio — não há valor nela, só a ausência.
  sem_relogio: "bg-superficie-2 text-texto-tenue",
  conflito: "bg-conflito-fundo text-conflito-tinta",
};

/** Como cada tom se chama para quem não vê a cor. */
const NOME_DO_TOM: Readonly<Record<TomDaCelula, string>> = {
  livre: "livre",
  ocupada: "ocupado",
  nao_letivo: "atividade não letiva",
  avaliacao: "avaliação",
  bloqueada: "bloqueado",
  sem_relogio: "sem relógio",
  conflito: "em conflito",
};

export type ColunaDaGrade = {
  readonly chave: string;
  readonly rotulo: React.ReactNode;
  /** Realça a coluna — a tela do DSA usa para o dia de hoje. */
  readonly destacada?: boolean;
  /** Texto curto sob o rótulo: aviso que **não** bloqueia. */
  readonly nota?: string;
  /** Quando presente, a coluna inteira está impedida, e este é o motivo escrito. */
  readonly bloqueio?: string;
};

export type LinhaDaGrade = {
  readonly chave: string;
  readonly rotulo: React.ReactNode;
  /**
   * Linha de separação, sem células próprias — a grade do DSA usa para intervalo e almoço.
   *
   * ⚠️ Ela **não** entra na contagem de linhas navegáveis: dar foco a um intervalo faria o
   * teclado parar onde não há nada para fazer.
   */
  readonly separadora?: boolean;
};

export type CelulaDaGrade = {
  readonly conteudo?: React.ReactNode;
  readonly tom?: TomDaCelula;
  /** `rowSpan` — o bloco de vários tempos ocupa uma célula alta. */
  readonly alturaEmLinhas?: number;
  /** A célula foi coberta pelo `rowSpan` de uma acima: não se desenha `<td>`. */
  readonly coberta?: boolean;
  /** O que quem usa leitor de tela ouve antes do tom. */
  readonly rotuloAcessivel?: string;
};

export type GradeAlocacaoProps = {
  readonly rotulo: string;
  readonly colunas: readonly ColunaDaGrade[];
  readonly linhas: readonly LinhaDaGrade[];
  /** `celulas[linha][coluna]`, na mesma ordem de `linhas` e `colunas`. */
  readonly celulas: readonly (readonly CelulaDaGrade[])[];
  /** O canto de cima à esquerda — o DSA põe o rótulo da coluna de horários. */
  readonly cantoSuperior?: React.ReactNode;
  /** Abaixo de cada coluna, fora da matriz — o DSA põe a faixa "Sem posição" do dia. */
  readonly rodapeDasColunas?: readonly React.ReactNode[];
  readonly className?: string;
};

/**
 * Quantas linhas o teclado percorre — as separadoras ficam fora.
 *
 * ⚠️ Exportada porque `GradeDsa` precisa do **mesmo** número para não discordar da grade sobre
 * onde o foco pode parar.
 */
export function linhasNavegaveis(linhas: readonly LinhaDaGrade[]): number {
  return linhas.filter((l) => !l.separadora).length;
}

export function GradeAlocacao({
  rotulo,
  colunas,
  linhas,
  celulas,
  cantoSuperior,
  rodapeDasColunas,
  className,
}: GradeAlocacaoProps) {
  const navegaveis = linhasNavegaveis(linhas);

  /*
   * ⚠️ O ÍNDICE NAVEGÁVEL NÃO É O ÍNDICE DA LINHA, e confundir os dois põe o foco na linha errada
   * assim que existe um intervalo. A posição do teclado conta só as linhas que recebem foco.
   */
  let proximoNavegavel = -1;
  const indiceNavegavelDaLinha = linhas.map((l) => (l.separadora ? null : ++proximoNavegavel));

  return (
    <ListaNavegavel
      linhas={navegaveis}
      colunas={colunas.length}
      rotulo={rotulo}
      papel="nenhum"
      className={cn("w-full", className)}
    >
      {/*
       * ⚠️ `papel="nenhum"` acima e `role="grid"` na tabela: o papel tem de estar no elemento que
       * CONTÉM as linhas, e um `<div role="grid">` em volta de uma `<table>` daria DOIS grids
       * encaixados — leitor de tela anuncia os dois e a contagem de linhas sai dobrada.
       */}
      <div
        data-slot="grade-alocacao"
        /* A rolagem é DAQUI. `min-w-0` é o que permite o contêiner encolher dentro de um flex. */
        className="min-w-0 overflow-x-auto rounded-md border border-borda"
      >
        <table role="grid" aria-label={rotulo} className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th
                scope="col"
                /* O canto fica preso nos DOIS eixos: ele é a origem das duas réguas. */
                className="sticky left-0 top-0 z-20 min-w-14 border-b border-r border-borda bg-superficie-2 p-1 text-left align-bottom font-medium text-texto-suave"
              >
                {cantoSuperior}
              </th>
              {colunas.map((c) => (
                <th
                  key={c.chave}
                  scope="col"
                  aria-describedby={c.bloqueio ? `bloqueio-${c.chave}` : undefined}
                  className={cn(
                    "sticky top-0 z-10 min-w-36 border-b border-l border-borda p-1 text-left align-bottom font-medium",
                    c.destacada ? "bg-marca-suave text-texto" : "bg-superficie-2 text-texto-suave",
                  )}
                >
                  <span className="block">{c.rotulo}</span>
                  {c.bloqueio ? (
                    <span
                      id={`bloqueio-${c.chave}`}
                      className="mt-0.5 block truncate text-[11px] font-normal text-inativo-tinta"
                      title={c.bloqueio}
                    >
                      {c.bloqueio}
                    </span>
                  ) : null}
                  {c.nota ? (
                    <span
                      /*
                       * ⚠️ `--texto-suave` e NAO `--texto-tenue`: a nota e **valor vindo de
                       * propriedade** (a descrição do feriado), e o tênue é para rótulo e dica.
                       * A guarda de `texto-tenue.test.ts` diz isso com essas palavras.
                       */
                      className="mt-0.5 block truncate text-[11px] font-normal text-texto-suave"
                      title={c.nota}
                    >
                      {c.nota}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, iLinha) => {
              const navegavel = indiceNavegavelDaLinha[iLinha];
              return (
                <tr key={linha.chave} data-separadora={linha.separadora ? "sim" : undefined}>
                  <th
                    scope="row"
                    className={cn(
                      "sticky left-0 z-10 whitespace-nowrap border-r border-borda bg-superficie-2 p-1 text-left font-normal text-texto-suave",
                      // veste: o rótulo da linha SEPARADORA (intervalo, almoço) — não é dado.
                      linha.separadora && "py-0 text-[10px] text-texto-tenue",
                    )}
                  >
                    {linha.rotulo}
                  </th>
                  {linha.separadora ? (
                    /* A separadora é uma faixa só: ela não tem célula por dia. */
                    <td
                      colSpan={colunas.length}
                      className="border-l border-borda bg-superficie-2 py-0"
                    />
                  ) : (
                    colunas.map((coluna, iColuna) => {
                      const celula = celulas[iLinha]?.[iColuna];
                      if (celula?.coberta) return null;
                      const tom: TomDaCelula = celula?.tom ?? "livre";
                      const rotuloDaCelula = [
                        celula?.rotuloAcessivel,
                        NOME_DO_TOM[tom],
                        typeof linha.chave === "string" ? linha.chave : undefined,
                        coluna.chave,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <CelulaNavegavel key={coluna.chave} linha={navegavel ?? 0} coluna={iColuna}>
                          <td
                            rowSpan={celula?.alturaEmLinhas ?? 1}
                            data-tom={tom}
                            aria-label={rotuloDaCelula}
                            className={cn(
                              "border-l border-t border-borda p-1 align-top outline-none focus-visible:ring-2 focus-visible:ring-foco",
                              TINTA_DO_TOM[tom],
                            )}
                          >
                            {celula?.conteudo}
                          </td>
                        </CelulaNavegavel>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
          {rodapeDasColunas ? (
            <tfoot>
              <tr>
                <th
                  scope="row"
                  // veste: o cabeçalho da faixa do rodapé — rótulo fixo, não valor.
                  className="sticky left-0 z-10 border-r border-t border-borda bg-superficie-2 p-1 text-left align-top font-normal text-texto-tenue"
                >
                  Sem posição
                </th>
                {colunas.map((c, i) => (
                  <td
                    key={c.chave}
                    className="border-l border-t border-borda bg-superficie p-1 align-top"
                  >
                    {rodapeDasColunas[i]}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </ListaNavegavel>
  );
}

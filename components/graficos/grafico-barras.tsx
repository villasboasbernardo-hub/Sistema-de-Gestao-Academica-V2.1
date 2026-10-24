/**
 * Gráfico de barras — genérico (`FR-016`, documento 23 §7).
 *
 * ⚠️ ELE COBRE SEIS DOS SETE GRÁFICOS QUE A SPEC 006 NOMEIA. Aqueles sete são sete **perguntas
 * sobre instrutores**, não sete formas de desenhar; construir sete componentes seria construir a
 * tela do Épico 5 dentro do Design System — a mesma decisão que esta fatia recusou para as três
 * grades em 10/09/2026.
 *
 * ⚠️ ELE **NÃO ORDENA E NÃO AGREGA**. O gráfico de posto/graduação da spec 006 vem *"sempre em
 * ordem de antiguidade"*, e a ordenação alfabética é **proibida** nele — mas quem impõe essa ordem
 * é a função pura, como no seletor. O componente recebe a ordem pronta e a respeita.
 *
 * ⚠️ E UM INSTRUTOR COM DUAS QUALIFICAÇÕES CONTA NAS DUAS BARRAS, enquanto quem tem o campo vazio
 * não conta em nenhuma. **A soma das barras não fecha com o total, e isso é correto.** O componente
 * não "conserta" a soma, porque consertá-la apagaria o fato.
 *
 * ⚠️ O EIXO VERTICAL COMEÇA EM ZERO, E ISSO NÃO É PROPRIEDADE. Eixo truncado exagera diferença, e
 * estes gráficos vão para documento institucional.
 *
 * ⚠️ O VALOR DE CADA BARRA VAI ESCRITO EM CIMA DELA, além do eixo (emenda de 15/09/2026 ao `FR-026.2`
 * da spec 006, decisão de Bernardo Villas Boas; documento 23 §7, *"rótulo direto"*). Ler a altura pelo
 * eixo é aproximação; o número escrito é o dado.
 *
 * ⚠️ `corPorCategoria` PINTA CADA CATEGORIA COM UMA COR DA PALETA, em ordem fixa, quando o gráfico tem
 * **uma** série — "habilitados × selecionados" em duas cores, posto e OM com uma cor por barra. Com
 * várias séries a cor continua sendo da série. Toda cor segue vindo de `var(--serie-N)`.
 *
 * ⚠️ **INTERATIVO** desde 24/10/2026 (RT-5 do Bloco 10, spec 025, D-22): a legenda é feita de botões que ocultam e
 * mostram o grupo — com **uma** série, cada **categoria** (a barra); com várias, cada **série** —, e clicar na barra faz
 * o mesmo. A cor é a de origem: ocultar uma barra não repinta as outras.
 *
 * ⚠️ SEM ANIMAÇÃO DE ENTRADA. A preferência por menos movimento (`FR-029`) valeria de qualquer
 * forma, e a impressão captura o quadro errado quando há animação.
 */
"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Symbols,
  XAxis,
  YAxis,
} from "recharts";

import {
  LegendaInterativa,
  MarcadorDaSerie,
  MolduraDeGrafico,
} from "@/components/graficos/moldura";
import {
  alternarGrupo,
  corDaSerie,
  SIMBOLO_DA_FORMA,
  type Serie,
} from "@/components/graficos/tipos";

/** Até quantas categorias o rótulo do eixo vai reto; acima, todos aparecem inclinados. */
const ROTULOS_RETOS_ATE = 8;

export type GraficoBarrasProps = {
  readonly series: readonly Serie[];
  readonly rotulo: string;
  readonly altura?: number;
  readonly className?: string;
  /** Uma cor por categoria do eixo, quando há uma série só. */
  readonly corPorCategoria?: boolean;
  /** O nome do eixo vertical (*"Tempos de aula (TA)"*) — spec 025, item 4. */
  readonly rotuloDoEixoY?: string;
  /**
   * O texto de cada categoria na legenda, quando difere do nome do eixo (as disciplinas: o eixo leva o código, a
   * legenda *"código — nome"*). Sem ele, a legenda usa o nome do eixo.
   */
  readonly legendaDaCategoria?: (nome: string) => string;
  /** A unidade depois do valor na legenda (*"12 TA"*), quando o eixo a declara. */
  readonly unidadeNaLegenda?: string;
};

type Linha = { nome: string; [chave: string]: string | number };

/** Pivota as séries para a forma que a biblioteca espera: uma linha por categoria do eixo. */
function paraLinhas(series: readonly Serie[]): Linha[] {
  const categorias: string[] = [];
  for (const serie of series) {
    for (const ponto of serie.pontos) {
      if (!categorias.includes(ponto.nome)) categorias.push(ponto.nome);
    }
  }
  return categorias.map((nome) => {
    const linha: Linha = { nome };
    for (const serie of series) {
      const ponto = serie.pontos.find((p) => p.nome === nome);
      // ⚠️ Categoria ausente numa série vira 0, e NÃO some: uma barra que desaparece faz o leitor
      // concluir que a categoria não existe, quando o que houve foi a série não tê-la.
      linha[serie.chave] = ponto?.valor ?? 0;
    }
    return linha;
  });
}

export function GraficoBarras({
  series,
  rotulo,
  altura = 260,
  className,
  corPorCategoria = false,
  rotuloDoEixoY,
  legendaDaCategoria,
  unidadeNaLegenda,
}: GraficoBarrasProps) {
  const [ocultos, definirOcultos] = React.useState<ReadonlySet<string>>(() => new Set());
  const todasAsLinhas = paraLinhas(series);
  /* RT-5: com uma série, o grupo é a CATEGORIA; com várias, é a SÉRIE. */
  const porCategoriaNaLegenda = series.length === 1;
  const porCategoria = corPorCategoria && series.length === 1;
  const grupos = porCategoriaNaLegenda
    ? todasAsLinhas.map((l) => l.nome)
    : series.map((s) => s.chave);
  const alternar = (grupo: string) =>
    definirOcultos((atual) => alternarGrupo(atual, grupo, grupos));
  const mostrarTodos = () => definirOcultos(new Set());

  /* O índice de origem fica com cada linha e cada série: é dele que sai a cor. */
  const linhas = todasAsLinhas
    .map((linha, indice) => ({ linha, indice }))
    .filter(({ linha }) => !porCategoriaNaLegenda || !ocultos.has(linha.nome));
  const seriesVisiveis = series
    .map((serie, indice) => ({ serie, indice }))
    .filter(({ serie }) => porCategoriaNaLegenda || !ocultos.has(serie.chave));
  /*
   * ⚠️ MUITAS CATEGORIAS: TODO RÓTULO DO EIXO APARECE, INCLINADO (spec 022, item 10 — a duração de cada curso). Sem
   *    isto a biblioteca pula rótulos quando eles não cabem, e a barra fica sem nome.
   */
  const muitas = linhas.length > ROTULOS_RETOS_ATE;
  const primeira = series[0];

  const legenda =
    porCategoriaNaLegenda && primeira ? (
      <LegendaInterativa
        rotulo={rotulo}
        aoAlternar={alternar}
        aoMostrarTodos={mostrarTodos}
        itens={todasAsLinhas.map((l, i) => ({
          chave: l.nome,
          oculto: ocultos.has(l.nome),
          marcador: <MarcadorDaSerie serie={primeira} indice={porCategoria ? i : 0} />,
          texto: `${legendaDaCategoria ? legendaDaCategoria(l.nome) : l.nome}: ${l[primeira.chave] ?? 0}${unidadeNaLegenda ? ` ${unidadeNaLegenda}` : ""}`,
        }))}
      />
    ) : (
      <LegendaInterativa
        rotulo={rotulo}
        aoAlternar={alternar}
        aoMostrarTodos={mostrarTodos}
        itens={series.map((serie, i) => ({
          chave: serie.chave,
          oculto: ocultos.has(serie.chave),
          marcador: <MarcadorDaSerie serie={serie} indice={i} />,
          texto: serie.rotulo,
        }))}
      />
    );

  return (
    <MolduraDeGrafico
      series={series}
      rotulo={rotulo}
      altura={altura}
      legenda={legenda}
      {...(className === undefined ? {} : { className })}
    >
      <div data-slot="grafico-barras" data-visiveis={linhas.length} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={linhas.map((l) => l.linha)}
            margin={{ top: 34, right: 8, bottom: 4, left: rotuloDoEixoY ? 12 : 0 }}
          >
            <CartesianGrid stroke="var(--borda)" vertical={false} />
            <XAxis
              dataKey="nome"
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
              {...(muitas
                ? { interval: 0, angle: -40, textAnchor: "end" as const, height: 76 }
                : {})}
            />
            {/* ⚠️ `domain` começando em zero, fixo — ver o cabeçalho. */}
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
              {...(rotuloDoEixoY
                ? {
                    label: {
                      value: rotuloDoEixoY,
                      angle: -90,
                      position: "insideLeft" as const,
                      fill: "var(--texto-suave)",
                      fontSize: 11,
                      style: { textAnchor: "middle" },
                    },
                  }
                : {})}
            />
            {seriesVisiveis.map(({ serie, indice: i }) => (
              <Bar
                key={serie.chave}
                dataKey={serie.chave}
                name={serie.rotulo}
                fill={corDaSerie(i)}
                isAnimationActive={false}
                className="cursor-pointer"
                /* RT-5: clicar na barra oculta o grupo dela — a categoria, com uma série; a série, com várias. */
                onClick={(_: unknown, n: number) => {
                  const alvo = linhas[n];
                  if (!porCategoriaNaLegenda) alternar(serie.chave);
                  else if (alvo) alternar(alvo.linha.nome);
                }}
                /*
                 * ⚠️ O MARCADOR DE FORMA VAI EM CIMA DA BARRA, não só na legenda (`FR-018`). É o
                 * que mantém duas séries distinguíveis quando a cor some — impressa em cinza ou
                 * lida por quem não distingue cores. Com até quatro séries o rótulo também vai
                 * direto; acima disso a legenda assume, e o marcador continua nos dois lugares.
                 */
                label={(props: {
                  x?: string | number | undefined;
                  y?: string | number | undefined;
                  width?: string | number | undefined;
                  value?: unknown;
                  index?: number | undefined;
                }) => {
                  // A biblioteca tipa as coordenadas como texto OU número — ela aceita as duas
                  // formas em SVG. O marcador precisa de número para calcular o centro da barra.
                  const x = Number(props.x ?? 0) + Number(props.width ?? 0) / 2;
                  const y = Number(props.y ?? 0);
                  const origem = linhas[props.index ?? 0]?.indice ?? 0;
                  const cor = porCategoria ? corDaSerie(origem) : corDaSerie(i);
                  return (
                    <g data-slot="rotulo-da-barra">
                      <Symbols
                        type={SIMBOLO_DA_FORMA[serie.forma]}
                        cx={x}
                        cy={y - 22}
                        size={50}
                        fill={cor}
                      />
                      <text
                        x={x}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize={11}
                        fill="var(--texto)"
                        className="tabular-nums"
                      >
                        {typeof props.value === "number" || typeof props.value === "string"
                          ? props.value
                          : ""}
                      </text>
                    </g>
                  );
                }}
              >
                {porCategoria
                  ? linhas.map(({ linha, indice }) => (
                      <Cell key={String(linha.nome)} fill={corDaSerie(indice)} />
                    ))
                  : null}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </MolduraDeGrafico>
  );
}

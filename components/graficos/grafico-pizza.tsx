/**
 * Gráfico de pizza — genérico (`FR-016`, documento 23 §7).
 *
 * ⚠️ **TODAS AS FATIAS, SEM TETO** desde 22/10/2026 (spec 022, Bloco 7, item 7 — emenda ao documento 23 §7 e ao
 *    `FR-007.2` da spec 016). Até ali, mais de cinco categorias eram RECUSADAS aqui. Agora: até cinco, cada fatia leva
 *    nome e percentual; acima, a fatia leva o **número** dela e a legenda numerada diz nome, valor e percentual — a
 *    legenda é que fica legível com muitas fatias, não a fatia (`rotuloDaFatia`).
 *
 * ⚠️ O PERCENTUAL É **ESCRITO**, não só desenhado. Julgar ângulo é a coisa que olho humano faz
 * pior, e o número impresso continua legível quando a cor some.
 *
 * ⚠️ ELE RECEBE **UMA** SÉRIE. Pizza com duas séries é rosca dentro de rosca, que o documento 23
 * não prevê e que ninguém lê. A série chega com seus pontos, e cada ponto é uma categoria.
 */
"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { MarcadorDaSerie } from "@/components/graficos/moldura";
import {
  corDaSerie,
  MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO,
  percentualDaFatia,
  rotuloDaFatia,
  type Serie,
} from "@/components/graficos/tipos";

export type GraficoPizzaProps = {
  readonly serie: Serie;
  readonly rotulo: string;
  readonly altura?: number;
  readonly className?: string;
};

export function GraficoPizza({ serie, rotulo, altura = 260, className }: GraficoPizzaProps) {
  const pontos = serie.pontos;
  const total = pontos.reduce((soma, p) => soma + p.valor, 0);
  const numeradas = pontos.length > MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO;

  if (pontos.length === 0 || total <= 0) {
    return (
      <EstadoVazio
        motivo="sem-dado"
        titulo={rotulo}
        detalhe="Não há dado para desenhar este gráfico."
        {...(className === undefined ? {} : { className })}
      />
    );
  }

  const percentual = (valor: number) => percentualDaFatia(valor, total);

  return (
    <figure
      data-slot="grafico-pizza"
      data-fatias={pontos.length}
      data-numeradas={numeradas ? "sim" : "nao"}
      className={className}
    >
      <figcaption className="text-texto-suave text-sm font-medium">{rotulo}</figcaption>
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pontos.map((p) => ({ ...p }))}
              dataKey="valor"
              nameKey="nome"
              isAnimationActive={false}
              outerRadius="75%"
              /*
               * ⚠️ O rótulo direto traz NOME e PERCENTUAL ESCRITO — nunca só a fatia; com muitas fatias, o NÚMERO
               *    dela, que abre a linha da legenda (`rotuloDaFatia`).
               */
              label={(p: { index?: number }) => {
                const i = p.index ?? 0;
                const ponto = pontos[i];
                return ponto ? rotuloDaFatia(i, ponto, total, pontos.length) : "";
              }}
              labelLine={{ stroke: "var(--borda-forte)" }}
            >
              {pontos.map((p, i) => (
                /* A borda na cor da superfície separa duas fatias vizinhas da mesma cor (a paleta tem 8). */
                <Cell
                  key={`${i}-${p.nome}`}
                  fill={corDaSerie(i)}
                  stroke="var(--superficie)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/*
        ⚠️ A LISTA ABAIXO NÃO É ENFEITE: é a alternativa em texto do mesmo dado. Quem usa leitor de
        tela não "vê" a fatia, e quem imprime em cinza não distingue duas delas. O documento 23 §7
        exige alternativa em tabela para todo gráfico — este é o encaixe pronto, e promovê-lo a
        requisito continua sendo decisão pendente (achado P-5 do plano).
      */}
      {numeradas ? (
        /* Muitas fatias: a legenda numerada, em colunas, é a leitura do gráfico (spec 022, item 7). */
        <ol
          className="text-texto-suave mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2"
          data-slot="legenda-da-pizza"
        >
          {pontos.map((p, i) => (
            <li key={`${i}-${p.nome}`} className="flex items-start gap-1.5" data-fatia={i + 1}>
              <MarcadorDaSerie serie={serie} indice={i} />
              <span className="text-texto w-5 shrink-0 text-right font-medium tabular-nums">
                {i + 1}.
              </span>
              <span className="min-w-0">
                {p.nome}: <span className="tabular-nums">{p.valor}</span> ({percentual(p.valor)})
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul
          className="text-texto-suave mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
          data-slot="legenda-da-pizza"
        >
          {pontos.map((p, i) => (
            <li key={`${i}-${p.nome}`} className="flex items-center gap-1.5">
              <MarcadorDaSerie serie={serie} indice={i} />
              <span>
                {p.nome}: <span className="tabular-nums">{p.valor}</span> ({percentual(p.valor)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

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
 * ⚠️ **INTERATIVA** desde 24/10/2026 (RT-5 do Bloco 10, spec 025, D-22): cada linha da legenda é um botão que oculta e
 * mostra a fatia, e clicar na própria fatia faz o mesmo; os percentuais se refazem sobre o que ficou à vista (*"clicar
 * em 'Não informado' tira o grupo e o gráfico se redistribui"*). A cor e o número de cada fatia são os de origem.
 *
 * ⚠️ ELE RECEBE **UMA** SÉRIE. Pizza com duas séries é rosca dentro de rosca, que o documento 23
 * não prevê e que ninguém lê. A série chega com seus pontos, e cada ponto é uma categoria.
 */
"use client";

import * as React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { LegendaInterativa, MarcadorDaSerie } from "@/components/graficos/moldura";
import {
  alternarGrupo,
  ocultosEmVigor,
  corDaSerie,
  gruposVisiveis,
  MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO,
  percentualDaFatia,
  rotuloDaFatia,
  totalVisivel,
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
  const [guardados, definirOcultos] = React.useState<ReadonlySet<string>>(() => new Set());
  const nomes = React.useMemo(() => pontos.map((p) => p.nome), [pontos]);
  const ocultos = ocultosEmVigor(guardados, nomes);
  const totalGeral = pontos.reduce((soma, p) => soma + p.valor, 0);
  const numeradas = pontos.length > MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO;

  if (pontos.length === 0 || totalGeral <= 0) {
    return (
      <EstadoVazio
        motivo="sem-dado"
        titulo={rotulo}
        detalhe="Não há dado para desenhar este gráfico."
        {...(className === undefined ? {} : { className })}
      />
    );
  }

  const visiveis = gruposVisiveis(pontos, (p) => p.nome, ocultos);
  const total = totalVisivel(visiveis);
  const alternar = (nome: string) => definirOcultos(alternarGrupo(ocultos, nome, nomes));
  const percentual = (valor: number) => (total > 0 ? percentualDaFatia(valor, total) : "—");

  return (
    <figure
      data-slot="grafico-pizza"
      data-fatias={pontos.length}
      data-visiveis={visiveis.length}
      data-numeradas={numeradas ? "sim" : "nao"}
      className={className}
    >
      <figcaption className="text-texto-suave text-sm font-medium">{rotulo}</figcaption>
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visiveis.map((v) => ({ ...v.item }))}
              dataKey="valor"
              nameKey="nome"
              isAnimationActive={false}
              outerRadius="75%"
              className="cursor-pointer"
              /* RT-5: clicar na fatia a oculta; a legenda a traz de volta. */
              onClick={(_: unknown, indice: number) => {
                const v = visiveis[indice];
                if (v) alternar(v.item.nome);
              }}
              /*
               * ⚠️ O rótulo direto traz NOME e PERCENTUAL ESCRITO — nunca só a fatia; com muitas fatias, o NÚMERO
               *    dela, que abre a linha da legenda (`rotuloDaFatia`). O número é o de origem: ocultar não renumera.
               */
              label={(p: { index?: number }) => {
                const v = visiveis[p.index ?? 0];
                return v ? rotuloDaFatia(v.indice, v.item, total, pontos.length) : "";
              }}
              labelLine={{ stroke: "var(--borda-forte)" }}
            >
              {visiveis.map((v) => (
                /* A borda na cor da superfície separa duas fatias vizinhas da mesma cor (a paleta tem 8). */
                <Cell
                  key={`${v.indice}-${v.item.nome}`}
                  fill={corDaSerie(v.indice)}
                  stroke="var(--superficie)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/*
        ⚠️ A LISTA ABAIXO NÃO É ENFEITE: é a alternativa em texto do mesmo dado — e, desde a RT-5, o caminho por
        teclado para ocultar e mostrar cada fatia. Quem usa leitor de tela não "vê" a fatia, e quem imprime em cinza
        não distingue duas delas.
      */}
      <LegendaInterativa
        rotulo={rotulo}
        slot="legenda-da-pizza"
        numerada={numeradas}
        aoAlternar={alternar}
        aoMostrarTodos={() => definirOcultos(new Set())}
        itens={pontos.map((p, i) => {
          const oculto = ocultos.has(p.nome);
          return {
            chave: p.nome,
            oculto,
            ...(numeradas ? { numero: i + 1 } : {}),
            marcador: <MarcadorDaSerie serie={serie} indice={i} />,
            texto: `${p.nome}: ${p.valor} (${oculto ? "oculto" : percentual(p.valor)})`,
          };
        })}
      />
    </figure>
  );
}

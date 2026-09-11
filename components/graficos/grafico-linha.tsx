/**
 * Gráfico de linha — genérico (`FR-016`, documento 23 §7).
 *
 * ⚠️ ELE É O ÚNICO COMPONENTE DESTA FATIA SEM CONSUMIDOR NOMEADO, e isso está registrado em vez de
 * escondido. Nenhum dos sete gráficos da spec 006 o usa. Ele entra pelo inventário do documento 23
 * §3.1 e serve série temporal, que os Épicos 9 e 12 vão pedir — o primeiro uso real ainda não tem
 * endereço (research §R-6).
 *
 * ⚠️ TRÊS CODIFICAÇÕES ALÉM DA COR: marcador de forma em cada ponto, traço tracejado próprio por
 * série, e rótulo. O documento 23 §7 manda *"traço tracejado, marcador distinto ou rótulo direto"*
 * — aqui são os três, porque num gráfico de linha as séries se cruzam, e cruzamento é onde duas
 * cores próximas viram uma só.
 */
"use client";

import type * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Symbols,
  XAxis,
  YAxis,
} from "recharts";

import { MolduraDeGrafico } from "@/components/graficos/moldura";
import { corDaSerie, SIMBOLO_DA_FORMA, type Serie } from "@/components/graficos/tipos";

export type GraficoLinhaProps = {
  readonly series: readonly Serie[];
  readonly rotulo: string;
  readonly altura?: number;
  readonly className?: string;
};

/**
 * Os padrões de tracejado, em ordem fixa — a terceira codificação.
 *
 * ⚠️ O PRIMEIRO É CONTÍNUO DE PROPÓSITO: a série mais importante costuma ser a primeira, e
 * tracejar tudo tornaria o gráfico ruidoso sem distinguir mais nada.
 */
const TRACEJADO = ["0", "6 3", "2 3", "10 4 2 4", "4 2 1 2", "12 4"] as const;

function paraLinhas(series: readonly Serie[]): Record<string, string | number>[] {
  const categorias: string[] = [];
  for (const serie of series) {
    for (const ponto of serie.pontos) {
      if (!categorias.includes(ponto.nome)) categorias.push(ponto.nome);
    }
  }
  return categorias.map((nome) => {
    const linha: Record<string, string | number> = { nome };
    for (const serie of series) {
      const ponto = serie.pontos.find((p) => p.nome === nome);
      if (ponto) linha[serie.chave] = ponto.valor;
    }
    return linha;
  });
}

export function GraficoLinha({ series, rotulo, altura = 260, className }: GraficoLinhaProps) {
  const linhas = paraLinhas(series);

  return (
    <MolduraDeGrafico
      series={series}
      rotulo={rotulo}
      altura={altura}
      {...(className === undefined ? {} : { className })}
    >
      <div data-slot="grafico-linha" className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={linhas} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--borda)" vertical={false} />
            <XAxis
              dataKey="nome"
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
            />
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tick={{ fill: "var(--texto-suave)", fontSize: 11 }}
              stroke="var(--borda-forte)"
            />
            {series.map((serie, i) => (
              <Line
                key={serie.chave}
                type="linear"
                dataKey={serie.chave}
                name={serie.rotulo}
                stroke={corDaSerie(i)}
                strokeWidth={2}
                strokeDasharray={TRACEJADO[i % TRACEJADO.length] ?? "0"}
                isAnimationActive={false}
                connectNulls={false}
                activeDot={false}
                dot={(props: {
                  cx?: number | undefined;
                  cy?: number | undefined;
                  key?: React.Key | null | undefined;
                }) => (
                  <Symbols
                    key={props.key ?? `${serie.chave}-${props.cx}-${props.cy}`}
                    type={SIMBOLO_DA_FORMA[serie.forma]}
                    cx={props.cx ?? 0}
                    cy={props.cy ?? 0}
                    size={60}
                    fill={corDaSerie(i)}
                  />
                )}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </MolduraDeGrafico>
  );
}

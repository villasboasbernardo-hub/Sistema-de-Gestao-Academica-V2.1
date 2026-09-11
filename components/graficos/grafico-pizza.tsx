/**
 * Gráfico de pizza — genérico (`FR-016`, documento 23 §7).
 *
 * ⚠️ ATÉ CINCO CATEGORIAS, E O LIMITE É VERIFICADO. Acima disso a fatia fica menor que o próprio
 * rótulo, e o gráfico passa a esconder o que deveria mostrar.
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
import { corDaSerie, MAXIMO_DE_CATEGORIAS_NA_PIZZA, type Serie } from "@/components/graficos/tipos";

export type GraficoPizzaProps = {
  readonly serie: Serie;
  readonly rotulo: string;
  readonly altura?: number;
  readonly className?: string;
};

export function GraficoPizza({ serie, rotulo, altura = 260, className }: GraficoPizzaProps) {
  const pontos = serie.pontos;
  const total = pontos.reduce((soma, p) => soma + p.valor, 0);

  if (pontos.length > MAXIMO_DE_CATEGORIAS_NA_PIZZA) {
    return (
      <div
        data-slot="grafico-recusado"
        role="alert"
        className="border-conflito-borda bg-conflito-fundo text-conflito-tinta rounded-ciaara border p-4 text-sm"
      >
        <p className="font-medium">{rotulo}: gráfico recusado</p>
        <p>
          {pontos.length} categorias excedem o máximo de {MAXIMO_DE_CATEGORIAS_NA_PIZZA} (documento
          23 §7). Acima disso a fatia fica menor que o rótulo — use a tabela densa ou o gráfico de
          barras.
        </p>
      </div>
    );
  }

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

  const percentual = (valor: number) => `${((valor / total) * 100).toFixed(1)}%`;

  return (
    <figure data-slot="grafico-pizza" className={className}>
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
              /* ⚠️ O rótulo direto traz NOME e PERCENTUAL ESCRITO — nunca só a fatia. */
              label={(p: { name?: string; value?: number }) =>
                `${p.name ?? ""} — ${percentual(p.value ?? 0)}`
              }
              labelLine={{ stroke: "var(--borda-forte)" }}
            >
              {pontos.map((p, i) => (
                <Cell key={p.nome} fill={corDaSerie(i)} />
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
      <ul className="text-texto-suave mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {pontos.map((p, i) => (
          <li key={p.nome} className="flex items-center gap-1.5">
            <MarcadorDaSerie serie={serie} indice={i} />
            <span>
              {p.nome}: <span className="tabular-nums">{p.valor}</span> ({percentual(p.valor)})
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

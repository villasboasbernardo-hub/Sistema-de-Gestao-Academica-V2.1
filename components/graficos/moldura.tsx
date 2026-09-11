/**
 * A moldura comum dos três gráficos — vazio, recusa e a legenda com forma.
 *
 * ⚠️ POR QUE ELA EXISTE, sendo que o inventário do documento 23 §7 nomeia três gráficos e não
 * quatro: os três precisam do **mesmo** estado vazio, da **mesma** recusa acima de seis séries e da
 * **mesma** legenda com marcador. Escrever isso três vezes faria três legendas divergirem — que é o
 * defeito que esta fatia veio fechar, só que num vocabulário diferente. É a mesma justificativa da
 * `lista-navegavel`, e as duas estão registradas como tais.
 *
 * ⚠️ ELA NÃO DESENHA GRÁFICO NENHUM. Recebe o gráfico pronto e o envolve.
 */
"use client";

import type * as React from "react";
import { cn } from "cn";
import { Symbols } from "recharts";

import { EstadoVazio, type MotivoDoVazio } from "@/components/ciaara/EstadoVazio";
import {
  conferirTetoDeSeries,
  corDaSerie,
  MAXIMO_PARA_ROTULO_DIRETO,
  SIMBOLO_DA_FORMA,
  type Serie,
} from "@/components/graficos/tipos";

export type MolduraDeGraficoProps = {
  readonly series: readonly Serie[];
  readonly rotulo: string;
  readonly motivoDoVazio?: MotivoDoVazio;
  readonly altura?: number;
  readonly className?: string;
  readonly children: React.ReactNode;
};

/**
 * O marcador de uma série, desenhado pela própria biblioteca de gráficos.
 *
 * ⚠️ ELE NÃO É SVG ESCRITO À MÃO, e isso é requisito (`FR-003.2`): a biblioteca já traz as seis
 * formas. Treze componentes desenhando o próprio símbolo é a mesma divergência que a paleta veio
 * fechar.
 */
export function MarcadorDaSerie({ serie, indice }: { serie: Serie; indice: number }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <Symbols
        type={SIMBOLO_DA_FORMA[serie.forma]}
        cx={7}
        cy={7}
        size={70}
        fill={corDaSerie(indice)}
      />
    </svg>
  );
}

export function MolduraDeGrafico({
  series,
  rotulo,
  motivoDoVazio = "sem-dado",
  altura = 260,
  className,
  children,
}: MolduraDeGraficoProps) {
  const recusa = conferirTetoDeSeries(series);
  const semDado = series.length === 0 || series.every((s) => s.pontos.length === 0);

  if (recusa) {
    /*
     * ⚠️ RECUSA, NÃO AVISO (`FR-017`, documento 23 §7). Um gráfico de oito séries já é uma tabela
     * mal desenhada; deixá-lo passar com um aviso ao lado é deixá-lo passar. E a recusa aponta para
     * onde ir — barrar sem indicar caminho é como uma regra acaba contornada.
     */
    return (
      <div
        data-slot="grafico-recusado"
        role="alert"
        className={cn(
          "border-conflito-borda bg-conflito-fundo text-conflito-tinta rounded-ciaara border p-4 text-sm",
          className,
        )}
      >
        <p className="font-medium">{rotulo}: gráfico recusado</p>
        <p>{recusa.motivo}</p>
      </div>
    );
  }

  if (semDado) {
    // ⚠️ Estado vazio, NÃO área em branco sem explicação — e ele distingue "não há" de "você não
    // vê", como todo componente desta fatia.
    return (
      <EstadoVazio
        motivo={motivoDoVazio}
        titulo={rotulo}
        detalhe="Não há dado para desenhar este gráfico."
        {...(className === undefined ? {} : { className })}
      />
    );
  }

  return (
    <figure data-slot="moldura-grafico" className={cn("flex flex-col gap-2", className)}>
      <figcaption className="text-texto-suave text-sm font-medium">{rotulo}</figcaption>
      <div style={{ height: altura }}>{children}</div>
      <LegendaComForma series={series} />
    </figure>
  );
}

/**
 * A legenda — **reforço, nunca a única leitura**.
 *
 * ⚠️ ATÉ QUATRO SÉRIES O RÓTULO VAI DIRETO NO TRAÇO (documento 23 §7), e a legenda aqui embaixo
 * repete. Acima disso ela deixa de ser repetição e passa a ser a leitura principal — por isso o
 * marcador de forma aparece nos dois lugares, e não só aqui.
 */
export function LegendaComForma({ series }: { series: readonly Serie[] }) {
  return (
    <ul
      data-slot="legenda-de-grafico"
      data-rotulo-direto={series.length <= MAXIMO_PARA_ROTULO_DIRETO}
      className="text-texto-suave flex flex-wrap gap-x-4 gap-y-1 text-xs"
    >
      {series.map((serie, i) => (
        <li key={serie.chave} className="flex items-center gap-1.5">
          <MarcadorDaSerie serie={serie} indice={i} />
          <span>{serie.rotulo}</span>
        </li>
      ))}
    </ul>
  );
}

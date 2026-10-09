/**
 * A aba CRONOS — `FR-026` (spec 015): os TA de cada disciplina em cada semana da pasta, comparados com
 * a ocupação do período agrupada pela semana ISO do domínio (`semanaIsoDe`).
 */
import { describe, expect, it } from "vitest";

import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import {
  ABA,
  K,
  K_LINHA_DOS_TITULOS,
  K_PRIMEIRA_LINHA,
  P,
} from "@/lib/dominio/dsa/planilha/layout";
import { linhaDoTa } from "@/lib/dominio/dsa/planilha/preenchimento";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";
import type { Valor } from "@/lib/planilha/formula";
import { avaliador, chaveDaCelula } from "@/lib/planilha/pasta";

import { ANO, DISCIPLINAS, SEMANAS, insumoSintetico } from "./planilha/sintetico";

const insumo = insumoSintetico();
const { pasta, entrada: g } = montarPlanilhaComGeometria(insumo);
const ordem = emOrdemNaturalDoCodigo(DISCIPLINAS, (d) => d.codigo);
const semanas = insumo.semanas.map((s) => s.semana.numero);
const distribuida = K.primeiraSemana + semanas.length;
const restante = distribuida + 1;

function avaliarCom(trocas: readonly [string, number, number, Valor][] = []) {
  const { valorDe } = avaliador(
    pasta,
    new Map(trocas.map(([aba, l, c, v]) => [chaveDaCelula(aba, l, c), v])),
  );
  return (l: number, c: number) => valorDe(ABA.cronos, l, c);
}

/** A ocupação do período por disciplina e semana — TA com posição, de disciplina, pela semana ISO. */
function ocupacao(codigo: string, numero: number): number {
  return SEMANAS.flatMap((s) => {
    const dias = datasDaSemanaIso(ANO, s.numero);
    return s.lancamentos.map((l) => ({ ...l, data: dias[l.dia] ?? "" }));
  })
    .filter(
      (l) =>
        l.ta !== null &&
        l.disciplina === codigo &&
        l.origem !== "atividade_nao_letiva" &&
        semanaIsoDe(l.data)?.numero === numero,
    )
    .reduce((n, l) => n + l.tempos, 0);
}

describe("`FR-026` · a CRONOS", () => {
  const valor = avaliarCom();

  it("uma coluna por semana da pasta, com o número da semana ISO", () => {
    expect(semanas.map((_, k) => valor(K_LINHA_DOS_TITULOS, K.primeiraSemana + k))).toEqual(
      semanas.map((n) => `S${n}`),
    );
  });

  it.each(ordem.map((d) => [d.codigo, d] as const))(
    "%s: os TA de cada semana, a distribuída e a restante",
    (_, d) => {
      const l = K_PRIMEIRA_LINHA + ordem.indexOf(d);
      const porSemana = semanas.map((n) => ocupacao(d.codigo, n));
      expect(semanas.map((_, k) => valor(l, K.primeiraSemana + k))).toEqual(porSemana);
      const total = porSemana.reduce((a, b) => a + b, 0);
      expect(valor(l, distribuida)).toBe(total);
      expect(valor(l, restante)).toBe(Math.max(0, d.chPrevista - total));
    },
  );

  it("acompanha o que se lança offline: +1 na semana em que entrou", () => {
    const sabado16 = linhaDoTa(g, 1, 5, 1);
    const com = avaliarCom([
      [ABA.preenchimento, sabado16, P.cod, "IV"],
      [ABA.preenchimento, sabado16, P.item, "SEM UE"],
    ]);
    const l = K_PRIMEIRA_LINHA + ordem.findIndex((d) => d.codigo === "IV");
    expect(com(l, K.primeiraSemana + 1)).toBe(Number(valor(l, K.primeiraSemana + 1)) + 1);
    expect(com(l, distribuida)).toBe(Number(valor(l, distribuida)) + 1);
  });
});

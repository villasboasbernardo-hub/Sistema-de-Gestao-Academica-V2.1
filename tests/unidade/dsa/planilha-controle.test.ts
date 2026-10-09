/**
 * A aba CONTROLE — `FR-025`, `Q-7` e a sexta reexpressão da `DP-1` (spec 015).
 *
 * ⚠️ **O ESPERADO DA SITUAÇÃO SAI DE `situacaoDaDisciplina`**, sem conflito e sem atraso — os três
 * degraus que são conta. A CH lançada esperada é a regra do sistema: todo fato com TA e disciplina,
 * até a data de referência.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { situacaoDaDisciplina } from "@/lib/dominio/dsa/situacao";
import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { PALAVRA_DA_SITUACAO } from "@/lib/dominio/dsa/planilha/controle";
import {
  ABA,
  C,
  C_LINHA_DOS_TITULOS,
  C_PRIMEIRA_LINHA,
  C_REFERENCIA,
  P,
} from "@/lib/dominio/dsa/planilha/layout";
import { linhaDoTa } from "@/lib/dominio/dsa/planilha/preenchimento";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";
import type { Valor } from "@/lib/planilha/formula";
import { avaliador, celulaEm, chaveDaCelula, serieDaData } from "@/lib/planilha/pasta";

import { ANO, DISCIPLINAS, HOJE, SEMANAS, insumoSintetico } from "./planilha/sintetico";

const insumo = insumoSintetico();
const { pasta, entrada: g } = montarPlanilhaComGeometria(insumo);
const controle = pasta.abas.find((a) => a.nome === ABA.controle);
const ordem = emOrdemNaturalDoCodigo(DISCIPLINAS, (d) => d.codigo);
const linhaDe = (codigo: string) => C_PRIMEIRA_LINHA + ordem.findIndex((d) => d.codigo === codigo);

const lancamentos = SEMANAS.flatMap((s) => {
  const dias = datasDaSemanaIso(ANO, s.numero);
  return s.lancamentos.map((l) => ({ ...l, data: dias[l.dia] ?? "" }));
});
/** A regra do sistema: TA com posição, de disciplina, até a data — a atividade não consome CH. */
const lancadaAte = (codigo: string, ate: string) =>
  lancamentos
    .filter(
      (l) =>
        l.ta !== null &&
        l.disciplina === codigo &&
        l.origem !== "atividade_nao_letiva" &&
        l.data <= ate,
    )
    .reduce((n, l) => n + l.tempos, 0);

function avaliarCom(trocas: readonly [string, number, number, Valor][] = []) {
  const { valorDe } = avaliador(
    pasta,
    new Map(trocas.map(([aba, l, c, v]) => [chaveDaCelula(aba, l, c), v])),
  );
  return (l: number, c: number) => valorDe(ABA.controle, l, c);
}

describe("`FR-025` · a CONTROLE", () => {
  it("a data de referência é `TODAY()`, com o dia da geração no cache", () => {
    expect(
      celulaEm(controle as NonNullable<typeof controle>, C_REFERENCIA.linha, C_REFERENCIA.coluna)
        ?.formula,
    ).toEqual({
      tipo: "funcao",
      nome: "TODAY",
      args: [],
    });
    expect(avaliarCom()(C_REFERENCIA.linha, C_REFERENCIA.coluna)).toBe(serieDaData(HOJE));
  });

  it("disciplinas na ordem natural, com a CH prevista", () => {
    const valor = avaliarCom();
    expect(ordem.map((_, i) => valor(C_PRIMEIRA_LINHA + i, C.cod))).toEqual([
      "I",
      "II",
      "IV",
      "IX",
    ]);
    expect(ordem.map((_, i) => valor(C_PRIMEIRA_LINHA + i, C.prevista))).toEqual(
      ordem.map((d) => d.chPrevista),
    );
  });

  it.each([HOJE, "2026-04-30"])(
    "CH lançada, restante e situação até %s — as do sistema",
    (referencia) => {
      const valor = avaliarCom([
        [ABA.controle, C_REFERENCIA.linha, C_REFERENCIA.coluna, serieDaData(referencia)],
      ]);
      for (const d of ordem) {
        const l = linhaDe(d.codigo);
        const lancada = lancadaAte(d.codigo, referencia);
        expect.soft(valor(l, C.lancada), `${d.codigo} lançada`).toBe(lancada);
        expect
          .soft(valor(l, C.restante), `${d.codigo} restante`)
          .toBe(Math.max(0, d.chPrevista - lancada));
        const situacao = situacaoDaDisciplina({
          temLancamento: lancada > 0,
          temConflito: false,
          chPrevista: d.chPrevista,
          chAcumulada: lancada,
          atrasada: false,
        });
        expect
          .soft(valor(l, C.situacao), `${d.codigo} situação`)
          .toBe(PALAVRA_DA_SITUACAO[situacao]);
      }
    },
  );

  it("`DP-1` · prevista zero: nada lançado é Aguardando início, e qualquer TA já é Concluída", () => {
    const l = linhaDe("IV");
    const semNada = avaliarCom([
      [ABA.controle, l, C.prevista, 0],
      [ABA.controle, C_REFERENCIA.linha, C_REFERENCIA.coluna, serieDaData(HOJE)],
    ]);
    expect(semNada(l, C.situacao)).toBe(
      PALAVRA_DA_SITUACAO[
        situacaoDaDisciplina({
          temLancamento: false,
          temConflito: false,
          chPrevista: 0,
          chAcumulada: 0,
          atrasada: false,
        })
      ],
    );
    const comTa = avaliarCom([
      [ABA.controle, l, C.prevista, 0],
      [ABA.controle, C_REFERENCIA.linha, C_REFERENCIA.coluna, serieDaData("2026-04-30")],
    ]);
    expect(comTa(l, C.situacao)).toBe(PALAVRA_DA_SITUACAO.concluida);
  });

  it("acompanha o que se lança offline: +1 na lançada, −1 na restante; depois da referência, não conta", () => {
    const quarta3 = linhaDoTa(g, 0, 2, 3);
    const sabado16 = linhaDoTa(g, 1, 5, 1);
    const base = avaliarCom();
    const com = avaliarCom([
      [ABA.preenchimento, quarta3, P.cod, "IX"],
      [ABA.preenchimento, quarta3, P.item, 1],
      [ABA.preenchimento, sabado16, P.cod, "IX"],
      [ABA.preenchimento, sabado16, P.item, 1],
    ]);
    const l = linhaDe("IX");
    expect(com(l, C.lancada)).toBe(Number(base(l, C.lancada)) + 1);
    expect(com(l, C.restante)).toBe(Number(base(l, C.restante)) - 1);
  });

  it("*Atrasada* e *Conflitou* são retrato do sistema, numa coluna própria e datada", () => {
    const valor = avaliarCom();
    expect(valor(C_LINHA_DOS_TITULOS, C.retrato)).toBe("No sistema em 08/04/2026");
    expect(valor(linhaDe("II"), C.retrato)).toBe("Atrasada");
    expect(valor(linhaDe("I"), C.retrato)).toBeNull();
    expect(valor(linhaDe("II"), C.situacao)).not.toBe("Atrasada");
  });

  it("as palavras são as do painel de situação do DSA", () => {
    const painel = readFileSync(
      join(process.cwd(), "app", "(app)", "turmas", "[turma]", "dsa", "PainelDeSituacao.tsx"),
      "utf8",
    );
    for (const [codigo, palavra] of Object.entries(PALAVRA_DA_SITUACAO)) {
      expect(painel, codigo).toContain(`${codigo}: { rotulo: "${palavra}"`);
    }
  });
});

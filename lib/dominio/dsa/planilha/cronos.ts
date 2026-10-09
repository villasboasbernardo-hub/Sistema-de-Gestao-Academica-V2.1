/**
 * A aba CRONOS — os TA lançados por disciplina e por semana (`FR-026`, `contracts/planilha.md` §6 da
 * spec 015).
 *
 * > *"A CRONOS MUST mostrar, por disciplina e por semana, os TA lançados, com a CH prevista, a
 * > distribuída e a restante."* — `FR-026`
 *
 * ⚠️ **A SEMANA É A DA PASTA** — cada coluna é um bloco de semana da PREENCHIMENTO, pelo índice dela, e
 * a semana de cada bloco é a ISO do domínio (`RN-DIST-01`). A conta é a mesma da CH (R-6): os TA da
 * entrada que consomem a disciplina e a lista sem posição que conta. O que a turma lançou fora das
 * semanas da pasta entra na distribuída, que é o total.
 */
import { emOrdemNaturalDoCodigo } from "../../ordem-natural";
import { dataParaLeitura } from "../../../formato/data";
import { fn, intervalo, nome, num, op, ref, type Formula } from "../../../planilha/formula";
import { definir, novaAba, type Aba } from "../../../planilha/pasta";
import { COR_DA_REGUA } from "../../../planilha/cores";

import {
  ABA,
  K,
  K_LINHA_DAS_DATAS,
  K_LINHA_DOS_TITULOS,
  K_PRIMEIRA_LINHA,
  NOME,
  P,
} from "./layout";
import type { GeometriaDaEntrada } from "./preenchimento";
import type { InsumoDaPlanilha } from "./tipos";

const daEntrada = (coluna: number, g: GeometriaDaEntrada) =>
  intervalo({ linha: 1, coluna }, { linha: g.ultimaLinha, coluna }, ABA.preenchimento);

/** Os TA de uma disciplina na semana de índice `k` (1-based) da pasta. */
export function taDaSemana(cod: Formula, k: number, g: GeometriaDaEntrada): Formula {
  return op(
    fn("COUNTIFS", daEntrada(P.disciplinaDaCh, g), cod, daEntrada(P.semana_indice, g), num(k)),
    "+",
    fn(
      "SUMIFS",
      daEntrada(P.spTempos, g),
      daEntrada(P.spDisciplinaDaCh, g),
      cod,
      daEntrada(P.semana_indice, g),
      num(k),
    ),
  );
}

export const COLUNAS_DEPOIS_DAS_SEMANAS = { distribuida: 0, restante: 1 } as const;

export function abaDeCronos(insumo: InsumoDaPlanilha, g: GeometriaDaEntrada): Aba {
  const aba = novaAba(ABA.cronos);
  definir(aba, 1, 1, {
    valor:
      "TA lançados por disciplina e por semana da planilha. A distribuída soma as semanas e o que a turma lançou fora delas; a restante é a prevista menos a distribuída.",
    estilo: { negrito: true },
  });
  const semanas = insumo.semanas;
  const distribuida = K.primeiraSemana + semanas.length + COLUNAS_DEPOIS_DAS_SEMANAS.distribuida;
  const restante = K.primeiraSemana + semanas.length + COLUNAS_DEPOIS_DAS_SEMANAS.restante;
  const titulo = { negrito: true, fundo: COR_DA_REGUA, horizontal: "center" as const };
  for (const [coluna, texto] of [
    [K.cod, "Cód."],
    [K.disciplina, "Disciplina"],
    [K.prevista, "CH prevista"],
    [distribuida, "Distribuída"],
    [restante, "Restante"],
  ] as const) {
    definir(aba, K_LINHA_DOS_TITULOS, coluna, { valor: texto, estilo: titulo });
  }
  semanas.forEach((s, k) => {
    definir(aba, K_LINHA_DOS_TITULOS, K.primeiraSemana + k, {
      valor: `S${s.semana.numero}`,
      estilo: titulo,
    });
    definir(aba, K_LINHA_DAS_DATAS, K.primeiraSemana + k, {
      valor: dataParaLeitura(s.seisDias[0] ?? "").slice(0, 5),
      estilo: { tamanho: 7, horizontal: "center" },
    });
    aba.larguras.set(K.primeiraSemana + k, 5);
  });

  emOrdemNaturalDoCodigo(insumo.disciplinas, (d) => d.codigo).forEach((d, i) => {
    const l = K_PRIMEIRA_LINHA + i;
    const cod = ref(l, K.cod, { fixaColuna: true });
    definir(aba, l, K.cod, { valor: d.codigo });
    definir(aba, l, K.disciplina, { valor: d.nome });
    definir(aba, l, K.prevista, { valor: d.chPrevista });
    semanas.forEach((_, k) => {
      definir(aba, l, K.primeiraSemana + k, {
        formula: taDaSemana(cod, k + 1, g),
        estilo: { horizontal: "center" },
      });
    });
    const ultimaSemana = K.primeiraSemana + Math.max(0, semanas.length - 1);
    definir(aba, l, distribuida, {
      formula: op(
        semanas.length === 0
          ? num(0)
          : fn(
              "SUM",
              intervalo({ linha: l, coluna: K.primeiraSemana }, { linha: l, coluna: ultimaSemana }),
            ),
        "+",
        fn("SUMIFS", nome(NOME.foraTempos), nome(NOME.foraDisciplina), cod),
      ),
      estilo: { negrito: true },
    });
    definir(aba, l, restante, {
      formula: fn("MAX", num(0), op(ref(l, K.prevista), "-", ref(l, distribuida))),
      estilo: { negrito: true },
    });
  });

  aba.larguras.set(K.cod, 10);
  aba.larguras.set(K.disciplina, 36);
  aba.larguras.set(K.prevista, 11);
  aba.larguras.set(distribuida, 11);
  aba.larguras.set(restante, 10);
  aba.congelar = { linhas: K_LINHA_DAS_DATAS, colunas: K.prevista };
  return aba;
}

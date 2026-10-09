/**
 * A aba CONTROLE — a carga horária por disciplina até a data de referência (`FR-025`, `Q-7`,
 * `contracts/planilha.md` §6 da spec 015).
 *
 * > *"A CONTROLE MUST mostrar, por disciplina, a CH prevista, a lançada até uma data de referência
 * > (por padrão, hoje; editável), a restante e a situação (`Q-7`): a CH lançada e a restante MUST ser
 * > fórmula (soma), e acompanhar o que se lançar offline; a situação MUST ser fórmula só nos três
 * > degraus que são conta […]; Atrasada e Conflitou MUST ser retrato do sistema na geração, numa
 * > coluna própria rotulada com a data dela — nunca misturados na célula da situação calculada."*
 * > — `FR-025`
 *
 * ⚠️ **OS TRÊS DEGRAUS SÃO OS DE `situacaoDaDisciplina` SEM CONFLITO E SEM ATRASO** (`DP-1`, item 6):
 * nada lançado → *Aguardando início*; lançou a prevista ou mais → *Concluída*; senão → *Em andamento*.
 * ⚠️ **ATRASADA E CONFLITOU NÃO SÃO CONTA DA PLANILHA**: o atraso depende das datas de previsão, e o
 * conflito de outras turmas, que a planilha não tem — vêm do painel do sistema, como retrato datado.
 *
 * ⚠️ **AS PALAVRAS SÃO AS DO PAINEL DE SITUAÇÃO DA TELA** (`PainelDeSituacao.tsx`), conferidas por
 * teste: a mesma disciplina não pode ter um nome no DSA e outro na planilha.
 */
import { emOrdemNaturalDoCodigo } from "../../ordem-natural";
import type { SituacaoDaDisciplina } from "../situacao";
import { dataParaLeitura } from "../../../formato/data";
import {
  concat,
  fn,
  intervalo,
  nome,
  num,
  op,
  ref,
  txt,
  type Formula,
} from "../../../planilha/formula";
import { definir, novaAba, type Aba } from "../../../planilha/pasta";
import { COR_DA_REGUA } from "../../../planilha/cores";

import { ABA, C, C_LINHA_DOS_TITULOS, C_PRIMEIRA_LINHA, C_REFERENCIA, NOME, P } from "./layout";
import type { GeometriaDaEntrada } from "./preenchimento";
import type { InsumoDaPlanilha } from "./tipos";

/** As palavras do painel de situação do DSA — as mesmas, na mesma grafia. */
export const PALAVRA_DA_SITUACAO: Readonly<Record<SituacaoDaDisciplina, string>> = {
  aguardando_inicio: "Aguardando início",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
  conflitou: "Conflitou",
};

const SE = (c: Formula, a: Formula, b: Formula) => fn("IF", c, a, b);
const daEntrada = (coluna: number, g: GeometriaDaEntrada) =>
  intervalo({ linha: 1, coluna }, { linha: g.ultimaLinha, coluna }, ABA.preenchimento);

/**
 * A CH lançada de uma disciplina até uma data: os TA da entrada, a lista sem posição que conta e o
 * que a turma lançou fora das semanas da pasta — a mesma conta da CH cumprida do rodapé (R-6).
 */
export function chLancadaAte(cod: Formula, ate: Formula, g: GeometriaDaEntrada): Formula {
  const corte = concat(txt("<="), ate);
  return op(
    op(
      fn("COUNTIFS", daEntrada(P.disciplinaDaCh, g), cod, daEntrada(P.data, g), corte),
      "+",
      fn(
        "SUMIFS",
        daEntrada(P.spTempos, g),
        daEntrada(P.spDisciplinaDaCh, g),
        cod,
        daEntrada(P.data, g),
        corte,
      ),
    ),
    "+",
    fn("SUMIFS", nome(NOME.foraTempos), nome(NOME.foraDisciplina), cod, nome(NOME.foraData), corte),
  );
}

export function abaDeControle(insumo: InsumoDaPlanilha, g: GeometriaDaEntrada): Aba {
  const aba = novaAba(ABA.controle);
  definir(aba, 1, 1, {
    valor:
      "Carga horária por disciplina até a data de referência. A CH lançada, a restante e a situação acompanham o que você lançar na PREENCHIMENTO; «Atrasada» e «Conflitou» são retrato do sistema no dia da geração.",
    estilo: { negrito: true },
  });
  definir(aba, C_REFERENCIA.linha, 1, { valor: "Data de referência:", estilo: { negrito: true } });
  definir(aba, C_REFERENCIA.linha, C_REFERENCIA.coluna, {
    formula: fn("TODAY"),
    estilo: { negrito: true, formato: "data", fundo: COR_DA_REGUA },
  });
  definir(aba, C_REFERENCIA.linha, 3, {
    valor: "(por padrão, hoje — escreva outra data para conferir até ela)",
  });

  const titulos: readonly [number, string][] = [
    [C.cod, "Cód."],
    [C.disciplina, "Disciplina"],
    [C.prevista, "CH prevista"],
    [C.lancada, "CH lançada"],
    [C.restante, "CH restante"],
    [C.situacao, "Situação"],
    [C.retrato, `No sistema em ${dataParaLeitura(insumo.hoje)}`],
  ];
  for (const [coluna, texto] of titulos) {
    definir(aba, C_LINHA_DOS_TITULOS, coluna, {
      valor: texto,
      estilo: { negrito: true, fundo: COR_DA_REGUA },
    });
  }

  const referencia = ref(C_REFERENCIA.linha, C_REFERENCIA.coluna, { fixa: true });
  emOrdemNaturalDoCodigo(insumo.disciplinas, (d) => d.codigo).forEach((d, i) => {
    const l = C_PRIMEIRA_LINHA + i;
    const c = (coluna: number) => ref(l, coluna);
    definir(aba, l, C.cod, { valor: d.codigo });
    definir(aba, l, C.disciplina, { valor: d.nome });
    definir(aba, l, C.prevista, { valor: d.chPrevista });
    definir(aba, l, C.lancada, { formula: chLancadaAte(c(C.cod), referencia, g) });
    definir(aba, l, C.restante, {
      formula: fn("MAX", num(0), op(c(C.prevista), "-", c(C.lancada))),
    });
    /* Os três degraus de `situacaoDaDisciplina` sem conflito e sem atraso (`DP-1`). */
    definir(aba, l, C.situacao, {
      formula: SE(
        op(c(C.lancada), "=", num(0)),
        txt(PALAVRA_DA_SITUACAO.aguardando_inicio),
        SE(
          op(c(C.lancada), ">=", c(C.prevista)),
          txt(PALAVRA_DA_SITUACAO.concluida),
          txt(PALAVRA_DA_SITUACAO.em_andamento),
        ),
      ),
    });
    const retrato = insumo.retrato.get(d.codigo);
    if (retrato !== undefined) {
      definir(aba, l, C.retrato, {
        valor: PALAVRA_DA_SITUACAO[retrato],
        estilo: { negrito: true },
      });
    }
  });

  for (const [coluna, largura] of [
    [C.cod, 10],
    [C.disciplina, 40],
    [C.prevista, 12],
    [C.lancada, 12],
    [C.restante, 12],
    [C.situacao, 18],
    [C.retrato, 22],
  ] as const) {
    aba.larguras.set(coluna, largura);
  }
  aba.congelar = { linhas: C_LINHA_DOS_TITULOS, colunas: 0 };
  return aba;
}

/**
 * A fórmula como árvore tipada — R-4 da spec 015.
 *
 * > *"funciona no Excel e no Google Planilhas; só funções comuns aos dois."* (`Q-4`) ·
 * > *"Excel 2007 em diante."* (`DP-2`) — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **CADA NÓ TEM DUAS PROVAS**: o texto que ele escreve no arquivo, e o valor que ele avalia. A
 * planilha só confere com o sistema se as duas estiverem certas — e é o avaliador que deixa a suíte
 * comparar a fórmula com a função do domínio, sem abrir o Excel.
 */
import { describe, expect, it } from "vitest";

import {
  FUNCOES,
  avaliar,
  bool,
  chaveSemCuringa,
  concat,
  escrever,
  fn,
  intervalo,
  nome,
  num,
  op,
  ref,
  txt,
  type ContextoDeAvaliacao,
  type Formula,
  type Valor,
} from "@/lib/planilha/formula";

/** Uma pasta de mentira: abas com valores por endereço `A1`. */
function contexto(abas: Record<string, Record<string, Valor>>, aba = "P"): ContextoDeAvaliacao {
  const letras = (c: number) => {
    let s = "";
    for (let n = c; n > 0; n = Math.floor((n - 1) / 26))
      s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  };
  return {
    aba,
    valorDe: (a, linha, coluna) => abas[a]?.[`${letras(coluna)}${linha}`] ?? null,
    nome: (n) =>
      n === "LISTA"
        ? { aba: "BD", de: { linha: 1, coluna: 1 }, ate: { linha: 3, coluna: 1 } }
        : undefined,
  };
}

const ctx = contexto({
  P: { A1: 5, A2: "texto", A3: null, B1: 46304, C1: "I", C2: "ii", C3: "I" },
  BD: { A1: "I|1", A2: "II|SEM UE", A3: "AEC|—", B1: "Tópico 1", B2: "", B3: "Atividade" },
});

describe("R-4 · escrever: o texto que vai para o OOXML", () => {
  it.each<[string, Formula, string]>([
    ["número", num(12), "12"],
    ["texto com aspas", txt('diz "olá"'), '"diz ""olá"""'],
    ["lógico", bool(true), "TRUE"],
    ["referência relativa", ref(3, 2), "B3"],
    ["referência absoluta", ref(3, 2, { fixa: true }), "$B$3"],
    ["linha fixa, coluna livre", ref(3, 28, { fixaLinha: true }), "AB$3"],
    ["outra aba, com acento", ref(2, 2, { aba: "IMPRESSÃO", fixa: true }), "'IMPRESSÃO'!$B$2"],
    [
      "intervalo de outra aba",
      intervalo({ linha: 2, coluna: 1 }, { linha: 300, coluna: 1 }, "BD DISCIPLINAS"),
      "'BD DISCIPLINAS'!$A$2:$A$300",
    ],
    ["nome definido", nome("LISTA_COD"), "LISTA_COD"],
    ["operador", op(ref(1, 1), "&", txt("|")), '(A1&"|")'],
    ["função", fn("IF", bool(true), num(1), num(2)), "IF(TRUE,1,2)"],
    ["concatenação", concat(ref(1, 1), txt("-"), ref(2, 1)), '((A1&"-")&A2)'],
  ])("%s", (_nome, formula, texto) => {
    expect(escrever(formula)).toBe(texto);
  });

  it("⚠️ o vocabulário é fechado: só as funções comuns ao Excel 2007 e ao Google", () => {
    expect([...FUNCOES].sort()).toEqual(
      [
        "AND",
        "CHAR",
        "COUNTIF",
        "COUNTIFS",
        "DAY",
        "IF",
        "IFERROR",
        "INDEX",
        "ISNUMBER",
        "LEN",
        "MATCH",
        "MAX",
        "MOD",
        "MIN",
        "MONTH",
        "NOT",
        "OR",
        "RIGHT",
        "SUM",
        "SUMIFS",
        "YEAR",
      ].sort(),
    );
    // @ts-expect-error — `XLOOKUP` não existe no Excel 2007: montá-la não compila.
    expect(() => fn("XLOOKUP", num(1))).toThrow(/fora do vocabulário/);
  });

  it.each(["I*", "UE?", "A~B"])("chave com curinga do MATCH (%s) é recusada na montagem", (c) => {
    expect(() => chaveSemCuringa(c)).toThrow(/curinga/);
  });
});

describe("R-4 · avaliar: o valor que o Excel calcularia", () => {
  it.each<[string, Formula, Valor]>([
    ["referência", ref(1, 1), 5],
    ["célula vazia é nulo", ref(3, 1), null],
    ["soma com vazio", op(ref(1, 1), "+", ref(3, 1)), 5],
    ["texto & vazio", op(ref(3, 1), "&", txt("")), ""],
    ["número & texto", op(ref(1, 1), "&", txt(" TA")), "5 TA"],
    ["igualdade de texto sem caixa", op(txt("ABC"), "=", txt("abc")), true],
    ["vazio = texto vazio", op(ref(3, 1), "=", txt("")), true],
    ["vazio = zero", op(ref(3, 1), "=", num(0)), true],
    ["número = texto é falso", op(num(5), "=", txt("5")), false],
    [
      "IF preguiçoso não avalia o ramo errado",
      fn(
        "IF",
        bool(true),
        num(1),
        fn("INDEX", intervalo({ linha: 1, coluna: 1 }, { linha: 1, coluna: 1 }), num(9)),
      ),
      1,
    ],
    [
      "IFERROR pega o #N/A do MATCH",
      fn("IFERROR", fn("MATCH", txt("nada"), nome("LISTA"), num(0)), txt("sem par")),
      "sem par",
    ],
    ["MATCH exato, sem caixa", fn("MATCH", txt("ii|sem ue"), nome("LISTA"), num(0)), 2],
    [
      "INDEX/MATCH",
      fn(
        "INDEX",
        intervalo({ linha: 1, coluna: 2 }, { linha: 3, coluna: 2 }, "BD"),
        fn("MATCH", txt("AEC|—"), nome("LISTA"), num(0)),
      ),
      "Atividade",
    ],
    [
      'INDEX de célula vazia & ""',
      op(
        fn("INDEX", intervalo({ linha: 1, coluna: 2 }, { linha: 3, coluna: 2 }, "BD"), num(2)),
        "&",
        txt(""),
      ),
      "",
    ],
    ["INDEX fora do intervalo é #REF!", fn("INDEX", nome("LISTA"), num(9)), { erro: "#REF!" }],
    [
      "COUNTIF por texto",
      fn("COUNTIF", intervalo({ linha: 1, coluna: 3 }, { linha: 3, coluna: 3 }), txt("i")),
      2,
    ],
    [
      "COUNTIFS com critério de data",
      fn(
        "COUNTIFS",
        intervalo({ linha: 1, coluna: 2 }, { linha: 1, coluna: 2 }),
        op(txt("<="), "&", num(46304)),
      ),
      1,
    ],
    [
      "COUNTIFS com data depois",
      fn(
        "COUNTIFS",
        intervalo({ linha: 1, coluna: 2 }, { linha: 1, coluna: 2 }),
        op(txt("<="), "&", num(46303)),
      ),
      0,
    ],
    [
      "SUMIFS",
      fn(
        "SUMIFS",
        intervalo({ linha: 1, coluna: 1 }, { linha: 1, coluna: 1 }),
        intervalo({ linha: 1, coluna: 3 }, { linha: 1, coluna: 3 }),
        txt("I"),
      ),
      5,
    ],
    [
      "SUM ignora texto do intervalo",
      fn("SUM", intervalo({ linha: 1, coluna: 1 }, { linha: 3, coluna: 1 })),
      5,
    ],
    [
      "MAX de vazio é zero",
      fn("MAX", intervalo({ linha: 3, coluna: 1 }, { linha: 3, coluna: 1 })),
      0,
    ],
    ["CHAR(10) é quebra de linha", fn("CHAR", num(10)), "\n"],
    [
      "DAY/MONTH/YEAR da série 46304 (09/10/2026)",
      concat(
        fn("DAY", num(46304)),
        txt("/"),
        fn("MONTH", num(46304)),
        txt("/"),
        fn("YEAR", num(46304)),
      ),
      "9/10/2026",
    ],
    [
      "RIGHT para zero à esquerda",
      fn("RIGHT", concat(txt("0"), fn("DAY", num(46304))), num(2)),
      "09",
    ],
    ["ISNUMBER", fn("ISNUMBER", fn("MATCH", txt("I|1"), nome("LISTA"), num(0))), true],
    [
      "MOD de bloco par e ímpar",
      concat(fn("MOD", num(3), num(2)), fn("MOD", num(4), num(2))),
      "10",
    ],
    ["AND e NOT", fn("AND", bool(true), fn("NOT", bool(false))), true],
    ["divisão por zero", op(num(1), "/", num(0)), { erro: "#DIV/0!" }],
    ["texto em soma é #VALUE!", op(ref(2, 1), "+", num(1)), { erro: "#VALUE!" }],
  ])("%s", (_nome, formula, valor) => {
    expect(avaliar(formula, ctx)).toEqual(valor);
  });
});

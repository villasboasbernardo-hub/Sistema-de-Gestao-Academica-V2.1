/**
 * A sonda de semântica das fórmulas no Google Planilhas — T053 da spec 015 (`Q-4`, `FR-031`, `DP-4`).
 *
 * ⚠️ **POR QUE UMA SONDA EM CSV, E NÃO O `.xlsx`** (medido em 09/10/2026): nesta máquina não há
 * sincronização do Google Drive, e o conector só recebe o arquivo DENTRO da chamada. O `.xlsx` de uma
 * semana tem 37 KB — 49,6 KB em base64, perto de 59 mil tokens numa chamada, e um caractere errado
 * corrompe o ZIP. O CSV é texto: o Google o converte em planilha e RECALCULA cada célula que começa
 * por `=`. A sonda leva cada função do vocabulário e cada armadilha de semântica que a planilha usa,
 * escritas pelo MESMO escritor (`escrever`), e o esperado é o que a árvore avalia (`avaliar`).
 *
 * O que ela NÃO prova — e fica para a conferência de Bernardo no Google, com o arquivo de verdade:
 * nome definido, formatação condicional, lista de escolha e página.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  concat,
  escrever,
  fn,
  intervalo,
  num,
  op,
  ref,
  txt,
  type Formula,
} from "@/lib/planilha/formula";
import { avaliador, definir, novaAba, serieDaData, type Pasta } from "@/lib/planilha/pasta";

export const PASTA_DA_SONDA = join(tmpdir(), "ciaara-planilha-google");

const A = 1;
const B = 2;
const C = 3;
const D = 4;
const faixa = (coluna: number, de: number, ate: number) =>
  intervalo({ linha: de, coluna }, { linha: ate, coluna });

/** Os dados da sonda: chaves, números, um vazio no meio e datas — em A1:D6. */
const DADOS: readonly (readonly (string | number | null)[])[] = [
  ["I|1", 3, null, serieDaData("2026-04-06")],
  ["I|SEM UE", 1, "Sala 1", serieDaData("2026-04-07")],
  ["Estudo Individual|—", 2, null, serieDaData("2026-04-08")],
  ["TAD|—", null, "x", serieDaData("2026-04-11")],
  ["PM", 5, "PO", serieDaData("2026-04-13")],
  ["I|1", 4, "Biblioteca", serieDaData("2026-04-20")],
];

/** Cada caso: o nome e a fórmula — a forma que a planilha usa. */
const CASOS: readonly [string, Formula][] = [
  ["número concatenado vira texto inteiro", concat(ref(1, B), txt(" TA"))],
  ['vazio & "" é texto vazio', concat(ref(1, C), txt(""))],
  ['INDEX de célula vazia & ""', concat(fn("INDEX", faixa(C, 1, 6), num(1)), txt(""))],
  ["INDEX com linha calculada", fn("INDEX", faixa(A, 1, 6), op(num(1), "+", num(1)))],
  ["MATCH exato, sem diferenciar maiúscula", fn("MATCH", txt("i|sem ue"), faixa(A, 1, 6), num(0))],
  [
    "IFERROR do MATCH que não acha",
    fn("IFERROR", fn("MATCH", txt("II|9"), faixa(A, 1, 6), num(0)), txt("sem par")),
  ],
  ["ISNUMBER(MATCH) que acha", fn("ISNUMBER", fn("MATCH", txt("TAD|—"), faixa(A, 1, 6), num(0)))],
  ["COUNTIF de texto", fn("COUNTIF", faixa(A, 1, 6), txt("I|1"))],
  [
    "COUNTIFS com >= e número concatenado",
    fn("COUNTIFS", faixa(D, 1, 6), concat(txt(">="), ref(2, D))),
  ],
  [
    "COUNTIFS com <= e texto",
    fn("COUNTIFS", faixa(A, 1, 6), txt("I|1"), faixa(D, 1, 6), concat(txt("<="), ref(1, D))),
  ],
  [
    "SUMIFS com dois critérios",
    fn(
      "SUMIFS",
      faixa(B, 1, 6),
      faixa(A, 1, 6),
      txt("I|1"),
      faixa(D, 1, 6),
      concat(txt("<="), ref(6, D)),
    ),
  ],
  ["SUMIFS sobre vazio", fn("SUMIFS", faixa(B, 1, 6), faixa(C, 1, 6), txt("nada"))],
  ["MAX com vazio no meio e célula avulsa", fn("MAX", faixa(B, 1, 6), ref(5, B))],
  ["MIN", fn("MIN", faixa(B, 1, 6))],
  ["SUM", fn("SUM", faixa(B, 1, 6))],
  ["MOD da paridade do bloco", fn("MOD", num(5), num(2))],
  ['vazio = ""', op(ref(1, C), "=", txt(""))],
  ["vazio = 0", op(ref(1, C), "=", num(0))],
  ['vazio <> ""', op(ref(1, C), "<>", txt(""))],
  ["texto sem diferenciar maiúscula", op(txt("abc"), "=", txt("ABC"))],
  ["número e texto do mesmo dígito não são iguais", op(num(1), "=", txt("1"))],
  [
    "IF com AND, OR e NOT",
    fn(
      "IF",
      fn(
        "AND",
        fn("OR", op(ref(1, B), ">", num(2)), fn("NOT", op(ref(2, B), "=", num(1)))),
        op(ref(5, C), "=", txt("po")),
      ),
      txt("sim"),
      txt("não"),
    ),
  ],
  [
    "DD/MM/AAAA sem TEXT",
    concat(
      fn("RIGHT", concat(txt("0"), fn("DAY", ref(1, D))), num(2)),
      txt("/"),
      fn("RIGHT", concat(txt("0"), fn("MONTH", ref(1, D))), num(2)),
      txt("/"),
      fn("YEAR", ref(1, D)),
    ),
  ],
  ["CHAR(10) entre linhas do cartão", concat(txt("título"), fn("CHAR", num(10)), txt("pé"))],
  ["LEN", fn("LEN", ref(2, A))],
  ["IF devolvendo número ou travessão", fn("IF", op(ref(4, B), "=", txt("")), txt("—"), ref(4, B))],
  [
    "MATCH de número não casa texto",
    fn("IFERROR", fn("MATCH", num(1), faixa(C, 1, 6), num(0)), txt("não casa")),
  ],
];

function pastaDaSonda(): Pasta {
  const aba = novaAba("sonda");
  DADOS.forEach((linha, i) =>
    linha.forEach((v, j) => {
      if (v !== null) definir(aba, i + 1, j + 1, { valor: v });
    }),
  );
  CASOS.forEach(([, formula], i) => definir(aba, i + 1, 6, { formula }));
  return {
    abas: [aba],
    nomes: [],
    abaAtiva: 0,
    propriedades: { titulo: "sonda", autor: "teste", criadaEm: "2026-10-09T00:00:00Z" },
  };
}

/**
 * ⚠️ **O CSV É LIDO NO IDIOMA DA PLANILHA, e o `.xlsx` não** (medido em 09/10/2026, primeira rodada da
 * sonda): numa conta em pt-BR a vírgula é o separador decimal, e toda fórmula com vírgula entre
 * argumentos voltou `#ERROR!` — `MOD(5,2)` virou `MOD(5.2)` e deu `#N/A`. A fórmula do `.xlsx` é
 * sempre a do OOXML, em inglês e com vírgula, e não passa por isso. Na sonda, a vírgula entre
 * argumentos vira ponto e vírgula, só fora das aspas — nenhum texto da sonda tem vírgula.
 */
export function paraCsvEmPortugues(formula: string): string {
  let dentro = false;
  let saida = "";
  for (const c of formula) {
    if (c === '"') dentro = !dentro;
    saida += c === "," && !dentro ? ";" : c;
  }
  return saida;
}

const csv = (v: string | number | null) => {
  if (v === null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

describe("T053 · a sonda de semântica do Google Planilhas", () => {
  it("cada caso avalia sem erro, e o CSV e o esperado saem para a pasta temporária", () => {
    const pasta = pastaDaSonda();
    const { valorDe } = avaliador(pasta);
    const esperado = CASOS.map(([nome], i) => {
      const v = valorDe("sonda", i + 1, 6);
      expect(typeof v === "object" && v !== null, nome).toBe(false);
      return { caso: nome, linha: i + 1, valor: v };
    });
    const linhas = Array.from({ length: Math.max(DADOS.length, CASOS.length) }, (_, i) => {
      const dados = DADOS[i] ?? [null, null, null, null];
      const caso = CASOS[i];
      return [
        ...dados.map(csv),
        "",
        caso === undefined ? "" : csv(`=${paraCsvEmPortugues(escrever(caso[1]))}`),
      ].join(",");
    });
    mkdirSync(PASTA_DA_SONDA, { recursive: true });
    writeFileSync(join(PASTA_DA_SONDA, "sonda.csv"), `${linhas.join("\n")}\n`);
    writeFileSync(join(PASTA_DA_SONDA, "sonda.esperado.json"), JSON.stringify(esperado, null, 1));
    expect(esperado).toHaveLength(CASOS.length);
  });
});

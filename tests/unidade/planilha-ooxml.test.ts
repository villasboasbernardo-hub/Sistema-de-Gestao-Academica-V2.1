/**
 * O escritor do `.xlsx` sem pacote — R-1, R-5, I-P1, I-P3, I-P7 e I-P8 da spec 015.
 *
 * ⚠️ **ISTO PROVA O PACOTE, não os programas.** Que o Excel e o Google Planilhas abrem e recalculam
 * igual se prova à parte, nos programas de verdade (R-12). Aqui o que se confere é que o arquivo traz
 * cada parte, cada parte é XML bem formado e diz o que o modelo mandou dizer.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { concat, fn, nome, num, op, ref, txt } from "@/lib/planilha/formula";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { calcularCaches, celulasComErro, definir, novaAba, type Pasta } from "@/lib/planilha/pasta";

import { aba, lerXlsx, xmlBemFormado } from "./planilha/ler-xlsx";

function pastaDeExemplo(): Pasta {
  const entrada = novaAba("PREENCHIMENTO");
  definir(entrada, 1, 1, { valor: "x" });
  definir(entrada, 2, 1, { valor: "y" });
  definir(entrada, 3, 1, { formula: concat(ref(1, 1), txt("-"), ref(2, 1)) });
  definir(entrada, 4, 1, { data: "2026-10-09" });
  definir(entrada, 5, 1, { valor: 'A & B < C "D"\u0007' });
  definir(entrada, 6, 1, { valor: 7, estilo: { negrito: true, fundo: "FFE6F4EC", quebra: true } });
  definir(entrada, 7, 1, { formula: op(ref(6, 1), "+", num(1)) });
  entrada.larguras.set(1, 14);
  entrada.colunasOcultas.add(5);
  entrada.alturas.set(6, 30);
  entrada.congelar = { linhas: 2, colunas: 0 };
  entrada.topoVisivel = { linha: 5, coluna: 1 };
  entrada.validacoes.push({
    intervalos: [
      { de: { linha: 10, coluna: 6 }, ate: { linha: 20, coluna: 6 } },
      { de: { linha: 30, coluna: 6 }, ate: { linha: 40, coluna: 6 } },
    ],
    fonte: nome("LISTA_COD"),
  });

  const papel = novaAba("IMPRESSÃO");
  definir(papel, 1, 1, { valor: "I" });
  definir(papel, 2, 2, {
    formula: fn("IFERROR", fn("MATCH", ref(1, 1), nome("LISTA_COD"), num(0)), txt("")),
  });
  papel.regras.push({
    de: { linha: 2, coluna: 2 },
    ate: { linha: 9, coluna: 4 },
    formula: op(ref(2, 2), "=", num(1)),
    estilo: { fundo: "FFEEF0F5", negrito: true },
  });
  papel.pagina = { paisagem: true };
  papel.areaDeImpressao = { de: { linha: 1, coluna: 1 }, ate: { linha: 40, coluna: 16 } };
  papel.semGrade = true;

  return {
    abas: [entrada, papel],
    nomes: [
      {
        nome: "LISTA_COD",
        aba: "IMPRESSÃO",
        de: { linha: 1, coluna: 1 },
        ate: { linha: 3, coluna: 1 },
      },
    ],
    abaAtiva: 0,
    propriedades: {
      titulo: "Planilha de contingência do DSA",
      autor: "Conta de teste",
      criadaEm: "2026-10-09T12:00:00.000Z",
    },
  };
}

const arquivo = escreverXlsx(pastaDeExemplo());
const lida = lerXlsx(arquivo);

describe("R-1 · o pacote", () => {
  const partes = [
    "[Content_Types].xml",
    "_rels/.rels",
    "docProps/core.xml",
    "docProps/app.xml",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml",
    "xl/styles.xml",
    "xl/sharedStrings.xml",
  ];

  it("I-P1 · todas as partes, nenhuma a mais", () => {
    expect([...lida.partes.keys()].sort()).toEqual([...partes].sort());
  });

  it.each(partes)("I-P1 · %s é XML bem formado", (parte) => {
    expect(xmlBemFormado(lida.partes.get(parte) ?? "")).toBe(true);
  });

  it("I-P1 · toda parte que não é relação tem tipo em [Content_Types].xml", () => {
    const tipos = lida.partes.get("[Content_Types].xml") ?? "";
    for (const parte of partes.filter((p) => !p.endsWith(".rels") && p !== "[Content_Types].xml")) {
      expect(tipos, parte).toContain(`PartName="/${parte}"`);
    }
  });

  it("I-P7, I-P8 · nenhuma mescla, nenhuma proteção, nenhum `_xlfn.`", () => {
    const tudo = [...lida.partes.values()].join("");
    expect(tudo).not.toMatch(/<mergeCell/);
    expect(tudo).not.toMatch(/sheetProtection|workbookProtection/);
    expect(tudo).not.toMatch(/_xlfn\./);
  });

  it("R-5 · a pasta pede recálculo completo ao abrir", () => {
    expect(lida.partes.get("xl/workbook.xml")).toContain('fullCalcOnLoad="1"');
  });
});

describe("R-1 · as células", () => {
  const entrada = aba(lida, "PREENCHIMENTO");
  const papel = aba(lida, "IMPRESSÃO");

  it("constante de texto pela tabela de cadeias", () => {
    expect(entrada.celulas.get("A1")).toMatchObject({ tipo: "s", valor: "x", formula: null });
  });

  it("R-5 · fórmula com o valor em cache", () => {
    expect(entrada.celulas.get("A3")).toMatchObject({
      formula: '((A1&"-")&A2)',
      valor: "x-y",
      tipo: "str",
    });
    expect(entrada.celulas.get("A7")).toMatchObject({ formula: "(A6+1)", valor: 8 });
  });

  it("R-13 · data como número de série com o formato dd/mm/yyyy", () => {
    const celula = entrada.celulas.get("A4");
    expect(celula?.valor).toBe(46304);
    const estilos = lida.partes.get("xl/styles.xml") ?? "";
    expect(estilos).toContain('formatCode="dd/mm/yyyy"');
    const xfs = [...estilos.matchAll(/<xf numFmtId="(\d+)"[^>]*fontId/g)].map((m) => m[1]);
    expect(xfs[(celula?.estilo ?? 0) + 1]).toBe("164");
  });

  it('escapa `&`, `<` e `"`, e tira o caractere de controle', () => {
    expect(entrada.celulas.get("A5")?.valor).toBe('A & B < C "D"');
  });

  it("fórmula de outra aba, com nome definido, escrita em inglês e com vírgula", () => {
    expect(papel.celulas.get("B2")?.formula).toBe('IFERROR(MATCH(A1,LISTA_COD,0),"")');
    expect(papel.celulas.get("B2")?.valor).toBe(1);
  });
});

describe("R-1 · a aba", () => {
  const entrada = aba(lida, "PREENCHIMENTO").xml;
  const papel = aba(lida, "IMPRESSÃO").xml;

  it("painel congelado e a primeira célula visível", () => {
    expect(entrada).toMatch(
      /<pane ySplit="2" topLeftCell="A5" activePane="bottomLeft" state="frozen"\/>/,
    );
  });

  it("coluna oculta e largura", () => {
    expect(entrada).toContain('<col min="1" max="1" width="14" customWidth="1"/>');
    expect(entrada).toContain('<col min="5" max="5" width="9" customWidth="1" hidden="1"/>');
  });

  it("FR-019 · lista de escolha que só avisa, em mais de uma área", () => {
    expect(entrada).toContain(
      '<dataValidation type="list" allowBlank="1" showErrorMessage="0" showInputMessage="0" sqref="F10:F20 F30:F40"><formula1>LISTA_COD</formula1></dataValidation>',
    );
  });

  it("R-7 · formatação condicional com fundo, lendo a própria aba", () => {
    expect(papel).toContain(
      '<conditionalFormatting sqref="B2:D9"><cfRule type="expression" dxfId="0" priority="1"><formula>(B2=1)</formula></cfRule></conditionalFormatting>',
    );
    expect(lida.partes.get("xl/styles.xml")).toContain('<bgColor rgb="FFEEF0F5"/>');
  });

  it("FR-022 · A4 paisagem ajustada a 1 × 1, com área de impressão", () => {
    expect(papel).toContain('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
    expect(papel).toContain(
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>',
    );
    expect(lida.nomesDefinidos.get("_xlnm.Print_Area")).toBe("'IMPRESSÃO'!$A$1:$P$40");
  });

  it("os nomes definidos", () => {
    expect(lida.nomesDefinidos.get("LISTA_COD")).toBe("'IMPRESSÃO'!$A$1:$A$3");
  });
});

describe("R-5 · o cache aponta o erro, para a suíte reprovar", () => {
  it("I-P2 · uma divisão por zero aparece em `celulasComErro`", () => {
    const pasta = pastaDeExemplo();
    definir(pasta.abas[0] as (typeof pasta.abas)[number], 8, 1, {
      formula: op(num(1), "/", num(0)),
    });
    expect(celulasComErro(calcularCaches(pasta))).toEqual(["PREENCHIMENTO!8,1"]);
  });
});

describe("a fronteira de `lib/planilha/`", () => {
  it("só importa `node:zlib` e a si mesma — lido sem comentário (regra 9.1.1)", () => {
    const pasta = join(process.cwd(), "lib", "planilha");
    const importados = readdirSync(pasta)
      .filter((n) => n.endsWith(".ts"))
      .flatMap((n) =>
        [
          ...readFileSync(join(pasta, n), "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .matchAll(/^import[^;]*?from\s+"([^"]+)"/gm),
        ].map((m) => m[1] as string),
      );
    expect(importados.length).toBeGreaterThan(0);
    expect(importados.filter((i) => i !== "node:zlib" && !i.startsWith("./"))).toEqual([]);
  });
});

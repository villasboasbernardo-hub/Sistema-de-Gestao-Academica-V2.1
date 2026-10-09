/**
 * A pasta inteira, escrita e relida — I-P1 a I-P4, I-P7, I-P8, I-P12 e I-P13 da spec 015, sobre a
 * turma sintética. ⚠️ É a prova do PACOTE; a dos programas de verdade é a da T052/T053.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { ABA } from "@/lib/dominio/dsa/planilha/layout";
import {
  NOME_DA_ORGANIZACAO,
  SIGLA_DA_ORGANIZACAO,
  SUBTITULO_DO_DOCUMENTO,
} from "@/lib/dominio/dsa/planilha/impressao";
import { FUNCOES, letrasDaColuna } from "@/lib/planilha/formula";
import { BARRA, COR_DA_REGUA, FUNDO, TITULO } from "@/lib/planilha/cores";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { calcularCaches, celulasComErro } from "@/lib/planilha/pasta";

import { aba, lerXlsx, xmlBemFormado } from "../planilha/ler-xlsx";
import { insumoSintetico } from "./planilha/sintetico";

const inicio = performance.now();
const { pasta, impressao: g } = montarPlanilhaComGeometria(insumoSintetico());
const arquivo = escreverXlsx(pasta);
const duracao = performance.now() - inicio;
const lida = lerXlsx(arquivo);

describe("a ordem e a forma da pasta", () => {
  it("seis abas, na ordem do contrato, a entrada ativa", () => {
    expect(lida.abas.map((a) => a.nome)).toEqual([
      ABA.preenchimento,
      ABA.impressao,
      ABA.catalogo,
      ABA.horarios,
      ABA.controle,
      ABA.cronos,
    ]);
    expect(pasta.abaAtiva).toBe(0);
  });
  it("I-P1 · toda parte é XML bem formado", () => {
    for (const [nome, xml] of lida.partes) expect(xmlBemFormado(xml), nome).toBe(true);
  });
  it("I-P7, I-P8 · nenhuma mescla, nenhuma proteção", () => {
    const tudo = [...lida.partes.values()].join("");
    expect(tudo).not.toMatch(/<mergeCell/);
    expect(tudo).not.toMatch(/sheetProtection|workbookProtection/);
  });
});

describe("as fórmulas", () => {
  const formulas = lida.abas.flatMap((a) =>
    [...a.celulas.values()].filter((c) => c.formula !== null).map((c) => c.formula as string),
  );
  it("há fórmula de verdade em todas as abas que dependem da entrada", () => {
    expect(formulas.length).toBeGreaterThan(1000);
  });
  it("I-P3 · nenhum `_xlfn.` e nenhuma função fora do vocabulário (Excel 2007, `DP-2`)", () => {
    const usadas = new Set(
      formulas.flatMap((f) => [...f.matchAll(/([A-Z][A-Z0-9.]*)\(/g)].map((m) => m[1])),
    );
    expect(
      [...usadas].filter((f) => !(FUNCOES as readonly string[]).includes(f as string)),
    ).toEqual([]);
    expect(formulas.some((f) => f.includes("_xlfn."))).toBe(false);
    expect(formulas.some((f) => /INDIRECT|OFFSET|TEXT\(/.test(f))).toBe(false);
  });
  it("I-P2 · nenhum valor de erro em cache, em aba nenhuma", () => {
    expect(celulasComErro(calcularCaches(pasta))).toEqual([]);
    const comErro = lida.abas.flatMap((a) => [...a.celulas.values()].filter((c) => c.tipo === "e"));
    expect(comErro).toEqual([]);
  });
  it("I-P4 · o valor em cache no arquivo é o que a árvore avalia", () => {
    const caches = calcularCaches(pasta);
    let conferidas = 0;
    for (const a of pasta.abas) {
      const doArquivo = aba(lida, a.nome);
      for (const [linha, celulas] of a.celulas) {
        for (const [coluna, celula] of celulas) {
          if (celula.formula === undefined) continue;
          const esperado = caches.get(`${a.nome}!${linha},${coluna}`);
          const noArquivo =
            doArquivo.celulas.get(`${letrasDaColuna(coluna)}${linha}`)?.valor ?? null;
          const normal = esperado === null || esperado === "" ? null : esperado;
          const lido = noArquivo === "" ? null : noArquivo;
          if (lido !== normal)
            throw new Error(
              `${a.nome}!${letrasDaColuna(coluna)}${linha}: ${String(noArquivo)} ≠ ${String(normal)}`,
            );
          conferidas += 1;
        }
      }
    }
    expect(conferidas).toBeGreaterThan(1000);
  });
});

describe("a página (`FR-022`, `SC-005`)", () => {
  const xml = aba(lida, ABA.impressao).xml;
  it("I-P12 · A4 paisagem ajustada a 1 × 1, sem as colunas de apoio na área de impressão", () => {
    expect(xml).toContain('paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"');
    const area = lida.nomesDefinidos.get("_xlnm.Print_Area") ?? "";
    expect(area).toBe(`'${ABA.impressao}'!$A$3:$${letrasDaColuna(g.ultimaColuna)}$${g.emitido}`);
  });
  it("o seletor é uma lista das semanas que só avisa", () => {
    expect(xml).toMatch(
      /<dataValidation type="list" allowBlank="1" showErrorMessage="0"[^>]*><formula1>LISTA_SEMANAS<\/formula1>/,
    );
  });
});

describe("I-P13 · as cores e o texto fixo são os do papel", () => {
  it("toda cor de fundo das regras é de `lib/planilha/cores.ts`", () => {
    const estilos = lida.partes.get("xl/styles.xml") ?? "";
    const dxfs = [...estilos.matchAll(/<bgColor rgb="(FF[0-9A-F]{6})"\/>/g)].map((m) => m[1]);
    const permitidas = new Set<string>([
      COR_DA_REGUA,
      ...Object.values(BARRA),
      ...Object.values(FUNDO).flat(),
      ...Object.values(TITULO),
    ]);
    expect(dxfs.length).toBeGreaterThan(0);
    expect(dxfs.filter((c) => !permitidas.has(c as string))).toEqual([]);
  });
  it("a organização e o subtítulo são os mesmos do `/print/dsa`", () => {
    const papel = readFileSync(
      join(process.cwd(), "app", "print", "dsa", "DocumentoDoDsa.tsx"),
      "utf8",
    );
    expect(papel).toContain(`const SIGLA_DA_ORGANIZACAO = "${SIGLA_DA_ORGANIZACAO}";`);
    expect(papel).toContain(`const NOME_DA_ORGANIZACAO = "${NOME_DA_ORGANIZACAO}";`);
    expect(papel).toContain(`>${SUBTITULO_DO_DOCUMENTO}<`);
  });
});

describe("custo", () => {
  it("a turma sintética monta, avalia e escreve em menos de 5 s", () => {
    expect(duracao).toBeLessThan(5000);
  });
});

/**
 * O ZIP da planilha de contingência, sem pacote — R-1 da spec 015 (`Q-2`: *"sem pacote novo; o .xlsx
 * é montado pelo próprio sistema"*).
 *
 * ⚠️ **O CRC-32 É PRÓPRIO, E É CONFERIDO CONTRA O DO NODE** quando ele existe: o `engines` aceita o
 * Node 22.0, e `zlib.crc32` só chegou na 22.2.0.
 */
import { createHash, randomBytes } from "node:crypto";
import * as zlib from "node:zlib";

import { describe, expect, it } from "vitest";

import { crc32, montarZip } from "@/lib/planilha/zip";

import { lerZip } from "./planilha/ler-xlsx";

const crcDoNode = (zlib as unknown as { crc32?: (d: Uint8Array) => number }).crc32;

describe("R-1 · o ZIP sem pacote", () => {
  it.each([
    ["vazio", new Uint8Array()],
    ["uma letra", new TextEncoder().encode("a")],
    ["um texto com acento", new TextEncoder().encode("PLANILHA DE CONTINGÊNCIA — IMPRESSÃO")],
    ["1 MB aleatório", new Uint8Array(randomBytes(1024 * 1024))],
  ])("CRC-32 de %s igual ao do Node", (_nome, dados) => {
    if (crcDoNode === undefined) return;
    expect(crc32(dados)).toBe(crcDoNode(dados));
  });

  it("o CRC-32 conhecido de «123456789» é cbf43926", () => {
    expect(crc32(new TextEncoder().encode("123456789")).toString(16)).toBe("cbf43926");
  });

  it("duas entradas voltam com os mesmos bytes, descomprimidas pelo zlib", () => {
    const xml = '<?xml version="1.0"?><a>ç</a>';
    const grande = "linha\n".repeat(20_000);
    const zip = montarZip([
      { caminho: "xl/workbook.xml", conteudo: xml },
      { caminho: "pasta/grande.txt", conteudo: grande },
    ]);
    const lido = lerZip(zip);
    expect([...lido.keys()]).toEqual(["xl/workbook.xml", "pasta/grande.txt"]);
    expect(new TextDecoder().decode(lido.get("xl/workbook.xml"))).toBe(xml);
    expect(new TextDecoder().decode(lido.get("pasta/grande.txt"))).toBe(grande);
    /* O grande foi comprimido de verdade. */
    expect(zip.length).toBeLessThan(grande.length / 10);
  });

  it("a mesma entrada gera os mesmos bytes — o arquivo é determinístico", () => {
    const entradas = [{ caminho: "a.xml", conteudo: "<a/>" }];
    const resumo = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
    expect(resumo(montarZip(entradas))).toBe(resumo(montarZip(entradas)));
  });
});

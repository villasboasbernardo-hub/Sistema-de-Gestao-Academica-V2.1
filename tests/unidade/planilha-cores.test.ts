/**
 * As cores da planilha são as do papel do DSA, e só `lib/planilha/cores.ts` as escreve — I-P13 e a
 * dúvida 1 do analyze da spec 015.
 *
 * > *"(a) — exceção nominal só para lib/planilha/cores.ts, ao lado da exceção do CSS de impressão;
 * > teste garantindo que as cores são as do app/print/dsa/documento.css e teste reprovando cor em
 * > qualquer outro arquivo de lib/planilha/."*
 * > — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1) e procura as DUAS formas: `#RRGGBB`, que
 * é a da regra de lint, e `FFRRGGBB`, que é a do OOXML — e que a expressão da regra de lint não pega.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CORES_DO_PAPEL, FUNDO } from "@/lib/planilha/cores";

const RAIZ = process.cwd();
const css = readFileSync(join(RAIZ, "app", "print", "dsa", "documento.css"), "utf8");

const argb = (hex: string) => `FF${hex.replace("#", "").toUpperCase()}`;

function variavel(nome: string): string {
  const m = new RegExp(`--dsa4-${nome}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  if (!m) throw new Error(`documento.css sem --dsa4-${nome}`);
  return argb(m[1] as string);
}

function daRegra(seletor: string, propriedade: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const bloco = new RegExp(`(?:^|\\n)${escapado}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
  if (bloco === undefined) throw new Error(`documento.css sem a regra ${seletor}`);
  const m = new RegExp(`${propriedade}:[^;]*?(#[0-9a-fA-F]{6})`).exec(bloco);
  if (!m) throw new Error(`a regra ${seletor} não tem cor em ${propriedade}`);
  return argb(m[1] as string);
}

/** Código sem comentário de bloco nem de linha — a menção não é uso. */
const semComentario = (codigo: string) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

const COR = /#[0-9a-fA-F]{3,8}\b|\bFF[0-9A-F]{6}\b|\b(?:rgb|rgba|hsl|hsla)\(/;

describe("I-P13 · as cores da planilha são as do papel do DSA", () => {
  it.each<[keyof typeof CORES_DO_PAPEL, () => string]>([
    ["marinho", () => variavel("marinho")],
    ["verde", () => variavel("verde")],
    ["amarelo", () => variavel("amarelo")],
    ["texto", () => variavel("texto")],
    ["suave", () => variavel("suave")],
    ["borda", () => variavel("borda")],
    ["reguaFundo", () => variavel("regua-fundo")],
    ["fundoDaAula", () => daRegra(".dsa4-cartao", "background")],
    ["fundoDaAvaliacao", () => daRegra(".dsa4-cartao-avaliacao", "background")],
    ["tituloDaAvaliacao", () => daRegra(".dsa4-cartao-avaliacao .dsa4-cartao-titulo", "color")],
    ["estudo", () => daRegra(".dsa4-cartao-estudo", "border")],
  ])("%s igual ao documento.css", (nome, doCss) => {
    expect(CORES_DO_PAPEL[nome]).toBe(doCss());
  });

  it("os dois tons de cada tipo são diferentes — dois blocos vizinhos nunca têm o mesmo fundo", () => {
    for (const [tipo, [um, outro]] of Object.entries(FUNDO)) {
      expect(um, tipo).not.toBe(outro);
    }
  });
});

describe("dúvida 1 do analyze · nenhuma cor fora de `lib/planilha/cores.ts`", () => {
  const pasta = join(RAIZ, "lib", "planilha");
  const arquivos = readdirSync(pasta).filter((n) => n.endsWith(".ts"));

  it("controle positivo: a varredura acha as cores de `cores.ts`", () => {
    expect(COR.test(semComentario(readFileSync(join(pasta, "cores.ts"), "utf8")))).toBe(true);
  });

  it.each(arquivos.filter((n) => n !== "cores.ts"))("%s não escreve cor", (arquivo) => {
    const codigo = semComentario(readFileSync(join(pasta, arquivo), "utf8"));
    expect(COR.exec(codigo)?.[0] ?? null).toBeNull();
  });

  it("⚠️ a exceção da regra de lint é desse arquivo, e só dele", () => {
    const config = readFileSync(join(RAIZ, "eslint.config.mjs"), "utf8");
    const ignorados = [...config.matchAll(/ignores:\s*\[([^\]]*)\]/g)].map((m) => m[1] ?? "");
    const comPlanilha = ignorados.filter((i) => i.includes("lib/planilha"));
    expect(comPlanilha).toEqual(['"lib/planilha/cores.ts"']);
  });
});

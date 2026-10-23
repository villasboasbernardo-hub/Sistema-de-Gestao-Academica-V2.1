/**
 * **Toda leitura do calendário pede a abrangência** — spec 023 (Bloco 8, D-4, FR-015).
 *
 * ⚠️ **O MODO DE FALHA É SILENCIOSO**: um leitor de `feriados` sem `feriado_turma` trataria o feriado de turmas
 *    escolhidas como de TODAS — bloquearia aula ou descontaria capacidade em turma que ele não alcança, sem erro
 *    nenhum. Esta varredura lê o código sem comentário (regra 9.1.1) e exige, em toda cadeia `.from("feriados")` que
 *    faz `.select(`, o embutido da abrangência — escrito, por `COLUNAS_DA_ABRANGENCIA` ou por `COLUNAS_DO_FERIADO`.
 * ⚠️ **ESCRITA NÃO CONTA** (`insert`/`update`), nem a leitura só do `codigo` (relido depois de gravar, `pararDia`) ou só
 *    do `ano` (o seletor de anos): elas não decidem bloqueio nem capacidade. São as únicas isenções, e são de forma.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "lib", "components"];

function arquivos(): string[] {
  const achados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
    }
  };
  for (const d of DIRETORIOS) percorrer(resolve(RAIZ, d));
  return achados;
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const ABRANGENCIA = /feriado_turma|COLUNAS_DA_ABRANGENCIA|COLUNAS_DO_FERIADO/;

/** Cada cadeia que começa em `.from("feriados")`, até o fim do comando (`;` ou a próxima `.from(`). */
export function cadeiasDeFeriados(codigo: string): string[] {
  const cadeias: string[] = [];
  const re = /\.from\(\s*["']feriados["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(codigo)) !== null) {
    const resto = codigo.slice(m.index + m[0].length);
    const fim = resto.search(/;|\.from\(/);
    cadeias.push(resto.slice(0, fim === -1 ? 600 : Math.min(fim, 600)));
  }
  return cadeias;
}

/** As colunas que não decidem bloqueio nem capacidade: o `codigo` relido depois de gravar e o `ano` do seletor. */
const SO_IDENTIFICACAO = /^\s*["'](codigo|ano)["']\s*$/;

export function leituraSemAbrangencia(cadeia: string): boolean {
  if (/\.(insert|update)\(/.test(cadeia)) return false;
  const inicio = cadeia.indexOf(".select(");
  if (inicio === -1) return false;
  /* O argumento vai até o primeiro filtro encadeado — o embutido tem parênteses próprios. */
  const resto = cadeia.slice(inicio + ".select(".length);
  /* Argumento de texto simples: o que está entre as aspas. */
  const simples = /^\s*(["'])([^"'`]*)\1\s*[,)]/.exec(resto);
  if (simples) {
    const colunas = simples[2] ?? "";
    return !/^(codigo|ano)$/.test(colunas.trim()) && !ABRANGENCIA.test(colunas);
  }
  const fim = resto.search(
    /\)\s*\.\s*(eq|neq|gte|lte|in|is|order|range|maybeSingle|single|limit)\(/,
  );
  const argumento = (fim === -1 ? resto : resto.slice(0, fim)).replace(/\)\s*,?\s*$/, "");
  if (SO_IDENTIFICACAO.test(argumento)) return false;
  return !ABRANGENCIA.test(argumento);
}

describe("FR-015 · toda leitura de `feriados` pede a abrangência", () => {
  const leituras = arquivos().flatMap((caminho) =>
    cadeiasDeFeriados(semComentarios(readFileSync(caminho, "utf8"))).map((cadeia) => ({
      arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
      cadeia,
    })),
  );

  it("nenhuma leitura sem `feriado_turma`", () => {
    const faltando = leituras
      .filter((l) => leituraSemAbrangencia(l.cadeia))
      .map((l) => `${l.arquivo}: ${l.cadeia.slice(0, 80).replace(/\s+/g, " ")}`);
    expect(faltando, faltando.join("\n")).toEqual([]);
  });

  it("controle positivo: a varredura enxerga as leituras de hoje", () => {
    /* DSA (leitura e duas ações), ficha, /turmas, /inicio, avisos (2) e o Calendário. */
    expect(leituras.length).toBeGreaterThanOrEqual(9);
  });

  it("⚠️ controle positivo: uma leitura sem o embutido é acusada", () => {
    expect(leituraSemAbrangencia(`.select("data").eq("status", "ativo")`)).toBe(true);
    expect(leituraSemAbrangencia(`.select(\`data, \${COLUNAS_DA_ABRANGENCIA}\`).eq("x", 1)`)).toBe(
      false,
    );
    expect(leituraSemAbrangencia(`.insert({ id }).select("codigo")`)).toBe(false);
    expect(leituraSemAbrangencia(`.select("codigo").eq("id", id)`)).toBe(false);
  });
});

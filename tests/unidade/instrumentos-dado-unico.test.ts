/**
 * Guarda do DADO ÚNICO das regras de prova da emenda de 15/10/2026 (spec 014, `RN-AV-10`, `RN-AV-11`, `RN-AV-13`):
 * `lib/dominio/avaliacoes/instrumentos.json` é lido pela tela (`vista-obrigatoria.ts`) E pela sincronização
 * (`scripts/carga_dsa/regras_de_prova.py` ou `resolver.py`). Uma regra, um arquivo.
 *
 * ⚠️ **AS DUAS METADES SÃO NECESSÁRIAS.** (a) nenhuma tela escreve a lista de vista obrigatória à mão — um
 *    `["PM", "PO"]` numa página divergiria do JSON no dia em que Bernardo mudasse a regra; (b) o Python lê o MESMO
 *    caminho — sem isso, a carga e a tela decidiriam a vista por duas listas.
 * ⚠️ **A VARREDURA LÊ CÓDIGO, NÃO COMENTÁRIO** (regra 9.1.1): o cabeçalho de `vista-obrigatoria.ts` cita «PM e PO» na
 *    regra literal, e isso é documentação, não uma segunda lista. No Python, saem as linhas `#` e as docstrings.
 * ⚠️ **A LISTA PROIBIDA É O CONJUNTO {PM, PO} EXATO.** O catálogo inteiro de instrumentos
 *    (`PainelDeAvaliacoesDoCurriculo.tsx`) e as siglas que pintam o cartão do papel (`grade-do-papel.ts`, `PM`/`PO`/`PP`)
 *    contêm os dois e NÃO são a regra da vista — medido em 15/10/2026, por varredura de `app/`, `lib/` e `components/`.
 * ⚠️ **COM CONTROLE POSITIVO**: o detector reprova uma lista escrita à mão de propósito, e `vista-obrigatoria.ts` tem de
 *    ser encontrado importando o JSON — varredura que não acha nada passa igual quando está cega.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "lib", "components"];
const DONO = "lib/dominio/avaliacoes/vista-obrigatoria.ts";
const CAMINHO_DO_JSON = "lib/dominio/avaliacoes/instrumentos.json";
const PYTHON = ["scripts/carga_dsa/regras_de_prova.py", "scripts/carga_dsa/resolver.py"];

function arquivosDeCodigo(): string[] {
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

/** O código TypeScript sem comentários — mede o que o arquivo FAZ, não o que ele diz. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** O código Python sem comentário (`#` no início da linha) e sem docstring (`"""…"""`, `'''…'''`). */
function pythonSemComentarios(fonte: string): string {
  return fonte
    .replace(/"""[\s\S]*?"""/g, " ")
    .replace(/'''[\s\S]*?'''/g, " ")
    .split("\n")
    .filter((linha) => !/^\s*#/.test(linha))
    .join("\n");
}

const LITERAL = /(["'`])([A-Za-z]+)\1/g;

/**
 * Uma lista de vista escrita à mão: um `[…]` cujos literais de texto são EXATAMENTE {PM, PO}, ou um arquivo que
 * compara com `"PM"` e com `"PO"` (`=== "PM" || === "PO"`).
 */
function listaDeVistaAMao(codigo: string): string[] {
  const achados: string[] = [];
  for (const colchete of codigo.match(/\[[^[\]]*\]/g) ?? []) {
    const literais = new Set([...colchete.matchAll(LITERAL)].map((m) => m[2]!.toUpperCase()));
    if (literais.size === 2 && literais.has("PM") && literais.has("PO"))
      achados.push(colchete.trim());
  }
  const compara = (sigla: string) =>
    new RegExp(`[=!]==?\\s*(["'\`])${sigla}\\1|(["'\`])${sigla}\\2\\s*[=!]==?`).test(codigo);
  if (compara("PM") && compara("PO")) achados.push('comparação com "PM" e com "PO"');
  return achados;
}

describe("RN-AV-13 · a lista de vista obrigatória mora só em instrumentos.json", () => {
  it("controle positivo: o detector reprova a lista escrita à mão (nas três formas)", () => {
    expect(listaDeVistaAMao(`const X = new Set(["PM", "PO"]);`)).not.toEqual([]);
    expect(listaDeVistaAMao(`const X = ['PO', 'PM'] as const;`)).not.toEqual([]);
    expect(listaDeVistaAMao(`if (i === "PM" || i === "PO") return true;`)).not.toEqual([]);
    // E não confunde o catálogo inteiro nem as siglas do papel com a regra.
    expect(listaDeVistaAMao(`const I = ["PE", "PM", "PP", "PO"];`)).toEqual([]);
    expect(listaDeVistaAMao(`new Set(["PM", "PO", "PP"])`)).toEqual([]);
  });

  it("nenhum arquivo de app/, lib/ e components/ escreve a lista à mão (lido sem comentário)", () => {
    const violacoes = arquivosDeCodigo()
      .map((caminho) => ({
        arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
        achados: listaDeVistaAMao(semComentarios(readFileSync(caminho, "utf8"))),
      }))
      .filter((v) => v.arquivo !== DONO && v.achados.length > 0);
    expect(
      violacoes,
      `lista de vista obrigatória escrita à mão: ${JSON.stringify(violacoes)}. ` +
        `Use exigeVista (${DONO}), que lê ${CAMINHO_DO_JSON}.`,
    ).toEqual([]);
  });

  it("controle positivo: vista-obrigatoria.ts importa o JSON (no código, não no comentário)", () => {
    const codigo = semComentarios(readFileSync(resolve(RAIZ, DONO), "utf8"));
    expect(codigo).toMatch(/from\s+["']\.\/instrumentos\.json["']/);
  });
});

describe("RN-AV-13 · a sincronização lê o MESMO arquivo", () => {
  it("regras_de_prova.py ou resolver.py referencia o caminho do JSON no código (sem comentário nem docstring)", () => {
    const existentes = PYTHON.filter((p) => existsSync(resolve(RAIZ, p)));
    expect(
      existentes,
      `nenhum dos arquivos da sincronização existe (${PYTHON.join(", ")}): ` +
        "a sincronização precisa ler as regras de prova de " +
        CAMINHO_DO_JSON +
        " — crie o módulo Python que o faz.",
    ).not.toEqual([]);
    const leem = existentes.filter((p) =>
      pythonSemComentarios(readFileSync(resolve(RAIZ, p), "utf8")).includes(CAMINHO_DO_JSON),
    );
    expect(
      leem,
      `nenhum de ${existentes.join(", ")} lê ${CAMINHO_DO_JSON} no código: a carga decidiria a vista por outra lista.`,
    ).not.toEqual([]);
  });

  it("controle positivo: a leitura sem comentário não enxerga o caminho só citado em docstring ou em `#`", () => {
    const soCitado = `"""Lê ${CAMINHO_DO_JSON}."""\n# ${CAMINHO_DO_JSON}\nX = 1\n`;
    expect(pythonSemComentarios(soCitado).includes(CAMINHO_DO_JSON)).toBe(false);
    const lido = `A = Path("${CAMINHO_DO_JSON}")\n`;
    expect(pythonSemComentarios(lido).includes(CAMINHO_DO_JSON)).toBe(true);
  });
});

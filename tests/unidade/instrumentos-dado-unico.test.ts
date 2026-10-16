/**
 * Guarda do DADO ÚNICO das regras de prova (spec 014, `RN-AV-10`, `RN-AV-11`, `RN-AV-13`):
 * - o de-para do COD da planilha mora em `lib/dominio/avaliacoes/instrumentos.json`, lido pela sincronização;
 * - **a lista de quem EXIGE VISTA mora só no BANCO** desde 16/10/2026 (`config_listas.metadados.vista_obrigatoria`,
 *   migration D-9: PM, PO e PE — A4 do desenho de 15/10/2026, aprovado por Bernardo Villas Boas em 16/10/2026).
 *
 * ⚠️ **AS METADES SÃO NECESSÁRIAS.** (a) nenhum arquivo de `app/`, `lib/` e `components/` escreve a lista à mão — um
 *    `["PM", "PO", "PE"]` numa página divergiria do banco no dia em que a regra mudasse; (b) o JSON não volta a ter a
 *    lista; (c) a sincronização lê a marca do BANCO (`scripts/carga_dsa/banco.py`), não de uma constante; (d) o Python
 *    lê o JSON do COD pelo mesmo caminho da tela.
 * ⚠️ **A VARREDURA LÊ CÓDIGO, NÃO COMENTÁRIO** (regra 9.1.1): o cabeçalho de `vista-obrigatoria.ts` cita «PM, PO e
 *    PE» na regra literal, e isso é documentação, não uma segunda lista. No Python, saem as linhas `#` e as docstrings.
 * ⚠️ **A LISTA PROIBIDA É O CONJUNTO EXATO** {PM, PO} ou {PM, PO, PE}. O catálogo inteiro de instrumentos
 *    (`PainelDeAvaliacoesDoCurriculo.tsx`) e as siglas que pintam o cartão do papel (`grade-do-papel.ts`, `PM`/`PO`/`PP`)
 *    contêm os dois e NÃO são a regra da vista — medido em 15/10/2026, por varredura de `app/`, `lib/` e `components/`.
 * ⚠️ **COM CONTROLE POSITIVO**: o detector reprova uma lista escrita à mão de propósito, e `banco.py` tem de ser
 *    encontrado lendo a marca — varredura que não acha nada passa igual quando está cega.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "lib", "components"];
const DONO = "lib/dominio/avaliacoes/vista-obrigatoria.ts";
const CAMINHO_DO_JSON = "lib/dominio/avaliacoes/instrumentos.json";
const PYTHON = ["scripts/carga_dsa/regras_de_prova.py", "scripts/carga_dsa/resolver.py"];
const BANCO_PY = "scripts/carga_dsa/banco.py";

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
 * Uma lista de vista escrita à mão: um `[…]` cujos literais de texto são EXATAMENTE {PM, PO} ou {PM, PO, PE}, ou um
 * arquivo que compara com `"PM"` e com `"PO"` (`=== "PM" || === "PO"`).
 */
function listaDeVistaAMao(codigo: string): string[] {
  const achados: string[] = [];
  for (const colchete of codigo.match(/\[[^[\]]*\]/g) ?? []) {
    const literais = new Set([...colchete.matchAll(LITERAL)].map((m) => m[2]!.toUpperCase()));
    const soAsDaVista = [...literais].every((l) => l === "PM" || l === "PO" || l === "PE");
    if (soAsDaVista && literais.has("PM") && literais.has("PO")) achados.push(colchete.trim());
  }
  const compara = (sigla: string) =>
    new RegExp(`[=!]==?\\s*(["'\`])${sigla}\\1|(["'\`])${sigla}\\2\\s*[=!]==?`).test(codigo);
  if (compara("PM") && compara("PO")) achados.push('comparação com "PM" e com "PO"');
  return achados;
}

describe("RN-AV-13 · a lista de vista obrigatória mora só no banco", () => {
  it("controle positivo: o detector reprova a lista escrita à mão (nas formas conhecidas)", () => {
    expect(listaDeVistaAMao(`const X = new Set(["PM", "PO"]);`)).not.toEqual([]);
    expect(listaDeVistaAMao(`const X = ['PO', 'PM', 'PE'] as const;`)).not.toEqual([]);
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
      .filter((v) => v.achados.length > 0);
    expect(
      violacoes,
      `lista de vista obrigatória escrita à mão: ${JSON.stringify(violacoes)}. ` +
        `Use exigeVista (${DONO}) com a marca que a consulta lê de config_listas.metadados.`,
    ).toEqual([]);
  });

  it("o JSON do COD não volta a ter a lista da vista", () => {
    const json = JSON.parse(readFileSync(resolve(RAIZ, CAMINHO_DO_JSON), "utf8")) as Record<
      string,
      unknown
    >;
    expect(Object.keys(json)).not.toContain("vistaObrigatoria");
    expect(json).toHaveProperty("codDaPlanilha");
  });

  it("controle positivo: a sincronização lê a marca do BANCO (banco.py, no SQL da referência)", () => {
    /*
     * A consulta da referência é texto SQL dentro de uma string de três aspas — que `pythonSemComentarios` tiraria
     * junto com as docstrings. Aqui saem só as linhas de comentário (`#` do Python e `--` do SQL): a marca tem de
     * estar numa linha que a consulta EXECUTA.
     */
    const codigo = readFileSync(resolve(RAIZ, BANCO_PY), "utf8")
      .split("\n")
      .filter((linha) => !/^\s*(#|--)/.test(linha))
      .join("\n");
    expect(codigo).toMatch(/metadados ->> 'vista_obrigatoria'/);
    for (const p of PYTHON) {
      const py = pythonSemComentarios(readFileSync(resolve(RAIZ, p), "utf8"));
      expect(py, `${p} não pode ler a lista da vista do JSON`).not.toMatch(
        /\[["']vistaObrigatoria["']\]/,
      );
    }
  });
});

describe("RN-AV-10 · a sincronização lê o MESMO arquivo do COD", () => {
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

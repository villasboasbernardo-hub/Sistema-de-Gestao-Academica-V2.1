/**
 * Guarda da `RN-AV-13` NOS CHAMADORES (emenda de 15/10/2026 à spec 014): *"vista é obrigatória só para PM e PO. PP, T
 * e TG não geram alerta de vista; se a planilha trouxer vista, registra."*
 *
 * ⚠️ **POR QUE ESTA GUARDA EXISTE:** `alertasDeVista` recebe `temItemDeVista` PRONTO — quem decide é o chamador. O teste
 *    de unidade do módulo calcula esse valor ele mesmo, então voltar o `/inicio` ou a ficha da turma para o critério
 *    antigo (o TEMPO de vista do item, `ta_vista > 0`) não reprovava nada. Aqui se lê o código dos chamadores e se
 *    exige que o valor seja EXATAMENTE `exigeVista(…)`, sem `ta_vista`/`taVista` na decisão.
 * ⚠️ **A VARREDURA LÊ CÓDIGO, NÃO COMENTÁRIO** (regra 9.1.1): um `exigeVista` citado num comentário não é uso, e o
 *    `ta_vista` que a ficha lê para o quadro (o previsto) não é a decisão da vista — por isso só se olha o VALOR da
 *    propriedade `temItemDeVista`.
 * ⚠️ **COM CONTROLE POSITIVO**: as formas da HEAD de 14/10/2026 são reprovadas pelo detector, e os dois chamadores
 *    conhecidos têm de ser ENCONTRADOS — varredura que não acha nada passa igual quando está cega.
 * ⚠️ **TODO `app/` E `components/`**, não só os dois: o terceiro chamador que nascer cai na mesma régua. `lib/dominio/`
 *    fica de fora — é onde mora a regra (`quadro-da-turma.ts` decide a OD, que não tem vista, por `false`).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
/*
 * Spec 022 (Bloco 7): os alertas de vista saíram do `/inicio` para a página Avisos — o chamador agora é a leitura dela,
 * com a mesma decisão e o mesmo recorte do item ativo.
 */
const CHAMADORES = [
  "app/(app)/avisos/leitura.ts",
  "app/(app)/turmas/[turma]/consulta-de-avaliacoes.ts",
];
const DIRETORIOS = ["app", "components"];

/** O código TypeScript sem comentários — mede o que o arquivo FAZ, não o que ele diz. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** O valor de cada `chave: <valor>` do código: até a vírgula, o `;` ou o fecho no MESMO nível. */
function valoresDe(codigo: string, chave: string): string[] {
  const valores: string[] = [];
  for (const m of codigo.matchAll(new RegExp(`\\b${chave}\\s*:`, "g"))) {
    const inicio = m.index + m[0].length;
    let i = inicio;
    let profundidade = 0;
    let aspas: string | null = null;
    for (; i < codigo.length; i++) {
      const c = codigo[i]!;
      if (aspas !== null) {
        if (c === "\\") i++;
        else if (c === aspas) aspas = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") aspas = c;
      else if ("([{".includes(c)) profundidade++;
      else if (")]}".includes(c)) {
        if (profundidade === 0) break;
        profundidade--;
      } else if ((c === "," || c === ";") && profundidade === 0) break;
    }
    valores.push(codigo.slice(inicio, i).trim());
  }
  return valores;
}

/** O valor é UMA chamada a `exigeVista(…)`, inteira, e o tempo de vista não entra nela. */
function decidePeloInstrumento(valor: string): boolean {
  if (!valor.startsWith("exigeVista(")) return false;
  let profundidade = 0;
  let fim = -1;
  for (let i = "exigeVista".length; i < valor.length; i++) {
    if (valor[i] === "(") profundidade++;
    else if (valor[i] === ")" && --profundidade === 0) {
      fim = i;
      break;
    }
  }
  if (fim < 0 || valor.slice(fim + 1).trim() !== "") return false;
  return !/\bta_vista\b|\btaVista\b/.test(valor);
}

/** As decisões de vista de um arquivo que NÃO passam por `exigeVista` (o tipo `boolean` de uma anotação não é decisão). */
function violacoesDe(codigo: string): string[] {
  return valoresDe(codigo, "temItemDeVista").filter(
    (v) => v !== "boolean" && !decidePeloInstrumento(v),
  );
}

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

const ler = (caminho: string) => semComentarios(readFileSync(resolve(RAIZ, caminho), "utf8"));

describe("RN-AV-13 · os chamadores decidem a vista por exigeVista", () => {
  it("controle positivo: o detector reprova as formas antigas (pelo TEMPO de vista) e aceita a nova", () => {
    // As duas formas da HEAD de 14/10/2026, uma de cada chamador.
    expect(
      violacoesDe(
        `x({ temItemDeVista: a.avaliacao_curriculo_id === null || (a.item?.ta_vista ?? 0) > 0, itemLigado: true })`,
      ),
    ).toHaveLength(1);
    expect(
      violacoesDe(
        `x({ temItemDeVista: a.itemId === null || (vista !== null && vista > 0), y: 1 })`,
      ),
    ).toHaveLength(1);
    // A nova, com o tempo de vista enxertado ao lado ou dentro: também reprova.
    expect(
      violacoesDe(
        `x({ temItemDeVista: exigeVista({ instrumento: i }) || (item?.taVista ?? 0) > 0 })`,
      ),
    ).toHaveLength(1);
    expect(
      violacoesDe(`x({ temItemDeVista: exigeVista({ instrumento: item?.taVista }) })`),
    ).toHaveLength(1);
    // E a certa passa.
    expect(
      violacoesDe(
        `x({ temItemDeVista: exigeVista({ instrumento: item?.instrumento ?? null }), y: 1 })`,
      ),
    ).toEqual([]);
  });

  it("controle positivo: exigeVista só num comentário não conta (regra 9.1.1)", () => {
    const codigo = semComentarios(
      `x({\n  // temItemDeVista: exigeVista({ instrumento: i }),\n  temItemDeVista: true,\n})`,
    );
    expect(violacoesDe(codigo)).toEqual(["true"]);
  });

  it("controle positivo: a varredura ACHA a decisão nos dois chamadores conhecidos, e ela é exigeVista", () => {
    for (const caminho of CHAMADORES) {
      const valores = valoresDe(ler(caminho), "temItemDeVista");
      expect(valores.length, `${caminho}: nenhum temItemDeVista no código`).toBeGreaterThan(0);
      expect(valores.every(decidePeloInstrumento), `${caminho}: ${JSON.stringify(valores)}`).toBe(
        true,
      );
      expect(ler(caminho), caminho).toMatch(
        /import\s*\{[^}]*\bexigeVista\b[^}]*\}\s*from\s*["']@\/lib\/dominio\/avaliacoes\/vista-obrigatoria["']/,
      );
    }
  });

  it("nenhum arquivo de app/ e components/ decide a vista sem exigeVista (lido sem comentário)", () => {
    const violacoes = arquivosDeCodigo()
      .map((caminho) => ({
        arquivo: relative(RAIZ, caminho).replaceAll("\\", "/"),
        achados: violacoesDe(semComentarios(readFileSync(caminho, "utf8"))),
      }))
      .filter((v) => v.achados.length > 0);
    expect(
      violacoes,
      `temItemDeVista decidido fora de exigeVista: ${JSON.stringify(violacoes)}. ` +
        "A vista é obrigatória pelo INSTRUMENTO do item (RN-AV-13), não pelo tempo de vista.",
    ).toEqual([]);
  });

  it("a página Avisos (antes o /inicio) só conta o item ATIVO como ligado, como a ficha (que lê os itens com status = ativo)", () => {
    const inicio = ler(CHAMADORES[0]!);
    expect(inicio).toMatch(/item:avaliacoes_curriculo![a-z_]+\(\s*status\s*,/);
    expect(inicio).toMatch(/\.status\s*===\s*"ativo"\s*\?/);
  });
});

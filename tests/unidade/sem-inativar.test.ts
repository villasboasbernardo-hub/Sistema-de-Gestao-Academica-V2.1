/**
 * *"Inativar"* não aparece em texto do sistema — RT-2 do Bloco 10 (spec 025, D-17):
 *
 * > *"Tudo que se cadastra tem Editar, Desativar/Reativar e Excluir (…); "Inativar" vira "Desativar" em todo o
 * > sistema."* — Bernardo Villas Boas, 24/10/2026 (`docs/correcoes/padroes-de-tela.md`)
 *
 * ⚠️ **SÓ O VERBO SAI** (*inativar*, *inativado*, *inativação*): a situação gravada continua `inativo`, e o adjetivo
 *    (*"Inativo"*, *"· inativa"*) continua sendo o nome do estado.
 * ⚠️ **LÊ TEXTO, NÃO CÓDIGO** (regra 9.1.1): literais de texto e texto de JSX, pelo compilador do TypeScript — o
 *    comentário que explica a troca e o nome de função (`inativarRegimeDeHorario`) não são texto de tela.
 * ⚠️ **CONTROLE POSITIVO**: a varredura tem de achar o verbo plantado, senão passaria cega.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const PASTAS = ["app", "components", "lib"];
const VERBO = /\binativa(?:r|d[oa]s?|ç(?:ão|ões))\b/i;

function arquivosDe(pasta: string): string[] {
  const caminho = join(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return /\.(ts|tsx)$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/** Os textos de um arquivo: literais e texto de JSX — nunca comentário nem identificador. */
function textos(nome: string, fonte: string): string[] {
  const arquivo = ts.createSourceFile(nome, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const achados: string[] = [];
  const visitar = (no: ts.Node): void => {
    if (
      ts.isStringLiteral(no) ||
      ts.isNoSubstitutionTemplateLiteral(no) ||
      ts.isTemplateHead(no) ||
      ts.isTemplateMiddle(no) ||
      ts.isTemplateTail(no)
    ) {
      achados.push(no.text);
    } else if (ts.isJsxText(no)) {
      achados.push(no.getText());
    }
    ts.forEachChild(no, visitar);
  };
  visitar(arquivo);
  return achados;
}

function comOVerbo(nome: string, fonte: string): string[] {
  return textos(nome, fonte).filter((t) => VERBO.test(t));
}

describe("RT-2 · «Inativar» virou «Desativar» em todo o sistema", () => {
  it("controle positivo: acha o verbo em literal, em template e em JSX — e ignora comentário, nome e estado", () => {
    const plantado = [
      'const a = "Inativar o item";',
      "const b = `Regime ${x} inativado.`;",
      "const c = <p>Linha inativada</p>;",
      "// Inativar no comentário não conta",
      "/* inativado aqui também não */",
      "inativarRegime();",
      'const d = "Inativo"; const e = "· inativa";',
    ].join("\n");
    expect(comOVerbo("plantado.tsx", plantado)).toEqual([
      "Inativar o item",
      " inativado.",
      "Linha inativada",
    ]);
  });

  it("a varredura enxerga o repositório", () => {
    expect(PASTAS.flatMap(arquivosDe).length).toBeGreaterThan(300);
  });

  it("nenhum texto de tela usa o verbo", { timeout: 60_000 }, () => {
    const violacoes = PASTAS.flatMap(arquivosDe).flatMap((arquivo) =>
      comOVerbo(arquivo, readFileSync(join(RAIZ, arquivo), "utf8")).map(
        (t) => `${arquivo}: «${t.trim()}»`,
      ),
    );
    expect(violacoes, "use «Desativar» (RT-2 do Bloco 10)").toEqual([]);
  });
});

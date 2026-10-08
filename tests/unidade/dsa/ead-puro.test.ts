/**
 * `Q-13` — EAD puro não tem DSA, e a frase que diz isso mora num lugar só (item 9 da conferência do
 * PR #40, 08/10/2026).
 *
 * ⚠️ **A GUARDA DO PONTO ÚNICO TEM CONTROLE POSITIVO**: ela exige que as quatro telas IMPORTEM a
 * constante, e não só que ninguém escreva a frase à mão — varredura que não acha nada passa igual
 * quando está cega.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { AVISO_DE_TURMA_EAD, ehEadPuro } from "@/lib/dominio/dsa/ead-puro";

const RAIZ = join(__dirname, "..", "..", "..");

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

/** Código sem comentário (regra 9.1.1): uso mencionado não é uso. */
const semComentario = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

describe("ehEadPuro", () => {
  it("só a modalidade `ead` é EAD puro; semipresencial TEM DSA", () => {
    expect(ehEadPuro("ead")).toBe(true);
    expect(ehEadPuro("semipresencial")).toBe(false);
    expect(ehEadPuro("presencial")).toBe(false);
    expect(ehEadPuro(null)).toBe(false);
    expect(ehEadPuro(undefined)).toBe(false);
  });

  it("o aviso é o texto de Bernardo, literal", () => {
    expect(AVISO_DE_TURMA_EAD).toBe(
      "Turma EAD: o andamento é controlado pela Divisão de Ensino a Distância, em sistema próprio.",
    );
  });
});

describe("o aviso de turma EAD mora num lugar só", () => {
  const telas = [
    "app/(app)/turmas/[turma]/page.tsx",
    "app/(app)/turmas/TabelaDeTurmas.tsx",
    "app/(app)/inicio/page.tsx",
    "app/(app)/turmas/[turma]/dsa/page.tsx",
  ];

  it("controle positivo: as quatro telas usam a constante", () => {
    for (const tela of telas) {
      const codigo = semComentario(readFileSync(join(RAIZ, tela), "utf8"));
      expect(codigo, `${tela} não usa AVISO_DE_TURMA_EAD`).toMatch(/\{AVISO_DE_TURMA_EAD\}/);
    }
  });

  it("ninguém em `app/` nem em `components/` escreve a frase à mão", () => {
    const trecho = "Divisão de Ensino a Distância";
    const achados = ["app", "components"]
      .flatMap((d) => arquivos(join(RAIZ, d)))
      .filter((f) => semComentario(readFileSync(f, "utf8")).includes(trecho))
      .map((f) => relative(RAIZ, f));
    expect(achados).toEqual([]);
  });
});

/**
 * Nenhum ano escrito à mão no código que decide o ano do Início, de Turmas e do submenu — spec 019, ajuste A-1 da
 * conferência de 20/10/2026: *"nunca um ano fixo no código — em 01/01/2027 a tela abre em 2027 sozinha."*
 *
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): os cabeçalhos citam 2026 e 2027 como exemplo, e exemplo não é uso.
 * ⚠️ **CONTROLE POSITIVO**: a varredura tem de achar o ano num trecho plantado, senão ela passaria cega.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** Os arquivos que escolhem ou aplicam o ano padrão. */
const ARQUIVOS = [
  "app/(app)/inicio/page.tsx",
  "app/(app)/inicio/CartaoDaTurma.tsx",
  "app/(app)/inicio/ManchetesDoDsa.tsx",
  "app/(app)/turmas/page.tsx",
  "app/(app)/turmas/AnoDoPainel.tsx",
  "app/(app)/turmas/PainelDeTurmas.tsx",
  "app/(app)/layout.tsx",
  "lib/dominio/painel-de-turmas.ts",
  "lib/dominio/submenu-da-lateral.ts",
  "lib/dominio/cartoes-do-inicio.ts",
];

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/**
 * Um ano de quatro dígitos (19xx ou 20xx) solto no código — inclusive o de uma DATA escrita à mão (`"2026-10-20"`).
 *
 * ⚠️ **A PRIMEIRA VERSÃO EXCLUÍA O ANO SEGUIDO DE HÍFEN, e o defeito deliberado mostrou que ela era cega** para o caso
 *    mais provável: trocar `hojeNaCiaara()` por uma data fixa. Medido em 20/10/2026.
 */
const ANO_FIXO = /(?<!\w)(?:19|20)\d{2}(?!\d)/g;

function anosFixos(fonte: string): string[] {
  return [...semComentarios(fonte).matchAll(ANO_FIXO)].map((m) => m[0]);
}

describe("A-1 · o ano padrão nunca é um número escrito no código", () => {
  it("controle positivo: a varredura acha o ano e a data plantados, e ignora o do comentário", () => {
    expect(
      anosFixos(
        'const ano = 2026; // 2027\n/* 2028 */ const x = "CAHO 2026";\nanoDoPainel("", "2026-10-20");',
      ),
    ).toEqual(["2026", "2026", "2026"]);
  });

  it.each(ARQUIVOS)("%s não tem ano fixo", (arquivo) => {
    expect(anosFixos(readFileSync(join(RAIZ, arquivo), "utf8")), arquivo).toEqual([]);
  });
});

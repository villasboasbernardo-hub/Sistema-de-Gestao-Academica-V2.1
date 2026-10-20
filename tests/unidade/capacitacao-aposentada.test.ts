/**
 * A coluna antiga da capacitação didática é aposentada — spec 020 (Bloco 5), C-10: depois da conversão para a lista
 * fechada, `instrutores.capacitacao_didatica` fica intocada no banco (o texto original, como foi escrito) e **nenhuma
 * tela a lê nem a grava**. Quem lê a capacitação lê `capacitacoes_didaticas` e `capacitacao_didatica_a_corrigir`.
 *
 * ⚠️ **SEM ESTA GUARDA, A COLUNA VELHA VOLTA SEM AVISO**: ela continua existindo no banco e no tipo gerado, então um
 *    `select` ou um formulário que a usasse compila, roda e mostra um dado congelado em 20/10/2026.
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1) e tem **CONTROLE POSITIVO**: os comentários que explicam a
 *    aposentadoria citam o nome da coluna, e citação não é uso.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const PASTAS = ["app", "lib", "components"];
/** O tipo gerado do banco descreve a coluna; ele não é uma tela. */
const FORA = new Set(["lib/tipos/database.ts"]);

function arquivos(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta)).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(join(RAIZ, caminho)).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome)
      ? [relative(RAIZ, join(RAIZ, caminho)).replace(/\\/g, "/")]
      : [];
  });
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/** O nome da coluna antiga, inteiro — `capacitacao_didatica_a_corrigir` é outra coluna e não casa. */
const COLUNA_ANTIGA = /\bcapacitacao_didatica\b/g;

const usos = (fonte: string) => [...semComentarios(fonte).matchAll(COLUNA_ANTIGA)].length;

describe("C-10 · nenhuma tela lê nem grava a capacitação antiga", () => {
  it("controle positivo: acha o uso plantado e ignora a coluna nova e o comentário", () => {
    expect(
      usos(
        'select("capacitacao_didatica"); // capacitacao_didatica\nconst x = "capacitacao_didatica_a_corrigir";',
      ),
    ).toBe(1);
  });

  it("app/, lib/ e components/ não usam a coluna aposentada", () => {
    const comUso = PASTAS.flatMap(arquivos)
      .filter((a) => !FORA.has(a))
      .filter((a) => usos(readFileSync(join(RAIZ, a), "utf8")) > 0);
    expect(comUso).toEqual([]);
  });
});

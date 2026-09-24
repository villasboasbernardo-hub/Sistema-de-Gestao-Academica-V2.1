/**
 * `FR-031.2` · **parâmetro de URL não se decodifica à mão** — nem o de consulta, nem o de caminho.
 *
 * > *"Decidido em 23/09/2026, fechando a `PEND-5a-8`: se algum leitor decodifica à mão, conserte-o
 * > para usar `searchParams`/`nuqs` e acrescente uma guarda proibindo `decodeURIComponent` em
 * > parâmetro de URL."*
 * > — decisão de Bernardo Villas Boas
 *
 * ⚠️ **O DEFEITO QUE ISTO IMPEDE É MUDO.** O Next entrega `searchParams` e `params` **já
 * decodificados**; decodificar de novo é inofensivo para os 28 códigos de hoje e **destrutivo** para
 * qualquer código que venha a conter `%` — `50%` viraria sequência de escape inválida. Ninguém
 * percebe até existir esse código.
 *
 * ⚠️ **HÁ UMA EXCEÇÃO DECLARADA, E ELA NÃO É UM LEITOR DE PARÂMETRO.**
 * `lib/navegacao/endereco-de-turma.ts` decodifica um **segmento de caminho** dentro da função única
 * do `FR-031.2`, com `try/catch` e teste próprio. A lista abaixo é fechada: acrescentar arquivo a ela
 * é decisão, não manutenção.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "components", "lib"];

/** O único arquivo autorizado a decodificar — e ele trata de **caminho**, não de consulta. */
const AUTORIZADOS = ["lib/navegacao/endereco-de-turma.ts"];

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

/** O código sem comentários — a varredura mede o que o arquivo FAZ, não o que ele diz (regra 9.1.1). */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

const relativo = (caminho: string) => relative(RAIZ, caminho).replaceAll("\\", "/");

describe("`FR-031.2` · ninguém decodifica parâmetro de URL à mão", () => {
  it("`decodeURIComponent` só aparece no arquivo autorizado", () => {
    const usam = arquivosDeCodigo()
      .filter((c) => semComentarios(readFileSync(c, "utf8")).includes("decodeURIComponent"))
      .map(relativo)
      .filter((c) => !AUTORIZADOS.includes(c));
    expect(
      usam,
      `decodificação manual de URL em: ${usam.join(", ")}. O Next entrega searchParams e params ` +
        `JÁ decodificados; decodificar de novo destrói qualquer código que contenha "%".`,
    ).toEqual([]);
  });

  it("⚠️ e `decodeURI` também não — ele tem o mesmo efeito com outro nome", () => {
    const usam = arquivosDeCodigo()
      .filter((c) => /\bdecodeURI\s*\(/.test(semComentarios(readFileSync(c, "utf8"))))
      .map(relativo)
      .filter((c) => !AUTORIZADOS.includes(c));
    expect(usam, `decodeURI em: ${usam.join(", ")}`).toEqual([]);
  });

  it("⚠️ controle positivo: o arquivo autorizado de fato decodifica", () => {
    // Sem isto, a lista de exceções envelheceria em silêncio: bastava a função sumir para a
    // varredura passar a vigiar nada.
    const codigo = semComentarios(readFileSync(resolve(RAIZ, AUTORIZADOS[0] as string), "utf8"));
    expect(codigo).toContain("decodeURIComponent");
  });

  it("controle positivo: a varredura enxerga arquivos de verdade", () => {
    expect(arquivosDeCodigo().length, "a varredura não achou código nenhum").toBeGreaterThan(20);
  });
});

describe("⚠️ e a leitura do `?turma=` não passa pela função de CAMINHO", () => {
  it("`app/(app)/cursos/[curso]/consulta.ts` não chama `codigoDaTurmaNoSegmento`", () => {
    /*
     * Ela era chamada ali até 23/09/2026, sobre um valor que o `searchParams` já tinha decodificado.
     * O nome da função diz o escopo dela: **segmento**, que é caminho.
     */
    const codigo = semComentarios(
      readFileSync(resolve(RAIZ, "app/(app)/cursos/[curso]/consulta.ts"), "utf8"),
    );
    expect(codigo).not.toContain("codigoDaTurmaNoSegmento");
  });
});

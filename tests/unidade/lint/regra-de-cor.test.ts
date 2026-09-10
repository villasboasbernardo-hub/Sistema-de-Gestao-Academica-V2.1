/**
 * O TESTE QUE PROVA AS DUAS REGRAS DE COR ATIVAS (`FR-004`, `SC-002`).
 *
 * "Regra de lint que ninguém verificou é regra que alguém desligou." — mesma frase que governa
 * `fronteiras.test.ts`, e vale igual aqui.
 *
 * ⚠️ CADA CASO AFIRMA A PRESENÇA DO ERRO, nunca a ausência. Um teste que só verifica que o código
 * bom passa não distingue "a regra funcionou" de "a regra não existe mais".
 *
 * ⚠️ E O CONTROLE POSITIVO IMPORTA TANTO QUANTO: sem ele, uma regra que reprovasse TUDO — inclusive
 * token legítimo — passaria nos dois casos negativos e tornaria o vocabulário inutilizável.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../../..");
const FIXTURES = path.join(RAIZ, "tests/unidade/lint/fixtures");

/** Mesmo motivo do `fronteiras.test.ts`: a configuração inteira do Next carrega a cada caso. */
const TEMPO_LIMITE = 30_000;

async function lintarComo(arquivo: string, caminhoVirtual: string) {
  const codigo = await readFile(path.join(FIXTURES, arquivo), "utf8");
  const eslint = new ESLint({ cwd: RAIZ });
  const [resultado] = await eslint.lintText(codigo, {
    filePath: path.join(RAIZ, caminhoVirtual),
    warnIgnored: false,
  });
  return resultado?.messages ?? [];
}

describe("Fronteira 3 — nenhuma cor entra fora do ponto único (`FR-001`)", () => {
  it(
    "BARRA cor escrita à mão em componente",
    async () => {
      const erros = await lintarComo("cor-escrita-a-mao.tsx", "components/ciaara/fixture.tsx");
      const cor = erros.filter((m) => m.ruleId === "no-restricted-syntax");
      expect(
        cor.length,
        "a regra de cor escrita à mão não acusou — ela está ativa?",
      ).toBeGreaterThan(0);
      expect(cor[0]?.message).toContain("globals.css");
    },
    TEMPO_LIMITE,
  );

  it(
    "BARRA utilitário da paleta padrão — a metade que costuma escapar",
    async () => {
      const erros = await lintarComo("paleta-padrao.tsx", "components/ciaara/fixture.tsx");
      const cor = erros.filter((m) => m.ruleId === "no-restricted-syntax");
      expect(cor.length, "a regra da paleta padrão não acusou — ela está ativa?").toBeGreaterThan(
        0,
      );
      expect(cor[0]?.message).toContain("paleta padrão");
    },
    TEMPO_LIMITE,
  );

  it(
    "DEIXA PASSAR quem usa só token — controle positivo",
    async () => {
      const erros = await lintarComo("so-token.tsx", "components/ciaara/fixture.tsx");
      const cor = erros.filter((m) => m.ruleId === "no-restricted-syntax");
      expect(
        cor,
        "a regra reprovou token legítimo: assim o vocabulário fica inutilizável e alguém a desliga",
      ).toEqual([]);
    },
    TEMPO_LIMITE,
  );
});

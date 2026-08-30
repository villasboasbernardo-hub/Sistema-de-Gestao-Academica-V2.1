/**
 * O TESTE QUE PROVA AS DUAS FRONTEIRAS ATIVAS (FR-006, doc 06 critério 5, doc 10 §6.2).
 *
 * "Regra de lint que ninguém verificou é regra que alguém desligou."
 *
 * Cada caso AFIRMA A PRESENÇA DO ERRO — nunca a ausência. Um teste que só verifica que o código
 * bom passa não distingue "a regra funcionou" de "a regra não existe mais".
 *
 * COMO: os fixtures são lintados por `lintText` com um **caminho virtual**. Isso é necessário, não
 * conveniência: a fronteira 1 só se aplica a `lib/dominio/**`, então um arquivo fisicamente em
 * `tests/` jamais seria avaliado por ela. O caminho virtual coloca o fixture sob a regra sem sujar
 * `lib/dominio/`, que precisa terminar esta fatia vazia (FR-004, SC-007).
 *
 * PROVA MANUAL EXIGIDA (T022, quickstart V-4): comentar cada regra em `eslint.config.mjs` e
 * confirmar que ESTE arquivo fica VERMELHO. Se continuar verde, ele não prova nada.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "../../..");
const FIXTURES = path.join(RAIZ, "tests/unidade/lint/fixtures");

/** Linta o conteúdo do fixture como se ele vivesse em `caminhoVirtual`. */
async function lintarComo(arquivoFixture: string, caminhoVirtual: string) {
  const codigo = await readFile(path.join(FIXTURES, arquivoFixture), "utf8");
  const eslint = new ESLint({ cwd: RAIZ });
  const [resultado] = await eslint.lintText(codigo, {
    filePath: path.join(RAIZ, caminhoVirtual),
    warnIgnored: false,
  });
  return resultado?.messages ?? [];
}

/**
 * Instanciar o ESLint carrega a configuração inteira do Next a cada caso. Em instalação fria —
 * que é como o CI sempre roda — isso passa dos 5 s padrão do Vitest, e o teste falhava por
 * TEMPO, não por lógica: a fronteira estava certa. Descoberto no replantio (FR-021), ao rodar
 * a suíte num clone limpo pela primeira vez.
 */
const TEMPO_LIMITE = 30_000;

describe("Fronteira 1 — lib/dominio/ é puro (Princípio II, risco R-10)", () => {
  it(
    "BARRA import de cliente de banco dentro de lib/dominio/",
    async () => {
      const mensagens = await lintarComo(
        "dominio-importa-supabase.ts",
        "lib/dominio/_fixture-fronteira-1.ts",
      );

      const violacao = mensagens.find((m) => m.ruleId === "no-restricted-imports");

      // A ausência desta violação significa que a fronteira foi desligada.
      expect(
        violacao,
        "a fronteira 1 não acusou o import proibido — regra desligada?",
      ).toBeDefined();
      expect(violacao?.severity).toBe(2); // erro, não aviso: aviso não barra merge
      expect(violacao?.message).toContain("puro");
    },
    TEMPO_LIMITE,
  );

  it(
    "DEIXA PASSAR uma função pura equivalente — a regra não é um bloqueio cego",
    async () => {
      const eslint = new ESLint({ cwd: RAIZ });
      const [resultado] = await eslint.lintText(
        "export function somarTempos(a: number, b: number) {\n  return a + b;\n}\n",
        { filePath: path.join(RAIZ, "lib/dominio/_fixture-puro.ts"), warnIgnored: false },
      );

      expect(
        (resultado?.messages ?? []).filter((m) => m.ruleId === "no-restricted-imports"),
      ).toHaveLength(0);
    },
    TEMPO_LIMITE,
  );
});

describe("Fronteira 2 — a service_role nunca chega ao navegador (risco R-09)", () => {
  it(
    "BARRA import de @/lib/supabase/admin em componente de navegador",
    async () => {
      const mensagens = await lintarComo(
        "cliente-importa-admin.tsx",
        "app/_fixture-fronteira-2.tsx",
      );

      const violacao = mensagens.find((m) => m.ruleId === "no-restricted-imports");

      expect(
        violacao,
        "a fronteira 2 não acusou o import de admin — regra desligada?",
      ).toBeDefined();
      expect(violacao?.severity).toBe(2);
      expect(violacao?.message).toContain("service_role");
    },
    TEMPO_LIMITE,
  );

  it(
    "DEIXA PASSAR o próprio admin.ts — ele é a exceção nomeada",
    async () => {
      const eslint = new ESLint({ cwd: RAIZ });
      const [resultado] = await eslint.lintText('import "server-only";\nexport const x = 1;\n', {
        filePath: path.join(RAIZ, "lib/supabase/admin.ts"),
        warnIgnored: false,
      });

      expect(
        (resultado?.messages ?? []).filter((m) => m.ruleId === "no-restricted-imports"),
      ).toHaveLength(0);
    },
    TEMPO_LIMITE,
  );
});

describe("A isenção dos fixtures continua estreita (T020, achado A1)", () => {
  it(
    "isenta APENAS tests/unidade/lint/fixtures/ — alargar desliga a fronteira em silêncio",
    async () => {
      const config = await readFile(path.join(RAIZ, "eslint.config.mjs"), "utf8");

      expect(config).toContain('"tests/unidade/lint/fixtures/**"');

      // Padrões largos que engoliriam código de verdade junto com os fixtures.
      for (const largoDemais of [
        '"tests/**"',
        '"tests/unidade/**"',
        '"**/fixtures/**"',
        '"lib/**"',
      ]) {
        expect(
          config,
          `isenção larga demais em eslint.config.mjs: ${largoDemais} desligaria a fronteira`,
        ).not.toContain(largoDemais);
      }
    },
    TEMPO_LIMITE,
  );

  it(
    "os fixtures continuam existindo — sem eles, os testes acima passam por vacuidade",
    async () => {
      await expect(
        readFile(path.join(FIXTURES, "dominio-importa-supabase.ts"), "utf8"),
      ).resolves.toContain("@supabase/supabase-js");
      await expect(
        readFile(path.join(FIXTURES, "cliente-importa-admin.tsx"), "utf8"),
      ).resolves.toContain("@/lib/supabase/admin");
    },
    TEMPO_LIMITE,
  );
});

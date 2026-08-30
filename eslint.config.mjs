import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * ESLint do CIAARA-11 v2.1.
 *
 * Além do preset do Next, aqui vivem AS DUAS FRONTEIRAS mais caras deste projeto. Elas não são
 * estilo: são arquitetura imposta por ferramenta, porque memória humana falha no décimo quarto
 * épico. Ver specs/001-fundacao-repositorio-ci/spec.md, US3.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "lib/tipos/database.ts", // gerado por `pnpm db:tipos` — nunca editado à mão (FR-009)
    "supabase/.temp/**",
    /*
     * T020 — ISENÇÃO DELIBERADA E ESTREITA.
     * Os fixtures VIOLAM as fronteiras de propósito: são o insumo do teste que prova as regras
     * ativas (FR-006). Sem esta linha, `pnpm lint` fica vermelho para sempre.
     * ⚠️ ALARGAR ESTE PADRÃO DESLIGA A FRONTEIRA EM SILÊNCIO. Só `fixtures/`, nada além.
     * `tests/unidade/lint/fronteiras.test.ts` falha se o alcance crescer.
     */
    "tests/unidade/lint/fixtures/**",
  ]),

  /*
   * ⚠️ A ORDEM DOS DOIS BLOCOS ABAIXO É LOAD-BEARING. NÃO INVERTER.
   *
   * No flat config, quando dois blocos casam com o mesmo arquivo, o ÚLTIMO vence para uma mesma
   * regra — ele SUBSTITUI a configuração anterior, não soma. Como `lib/dominio/**` também casa com
   * `**\/*.ts`, pôr a fronteira 2 depois APAGA a fronteira 1 dentro de lib/dominio/.
   *
   * Isso aconteceu de verdade em 27/08/2026, e quem pegou foi
   * `tests/unidade/lint/fronteiras.test.ts` — que é exatamente o que o FR-006 existe para fazer.
   * Regra: a mais LARGA primeiro, a mais ESTREITA por último.
   */

  {
    /*
     * FRONTEIRA 2 (larga) — a `service_role` NUNCA chega ao navegador.
     *
     * Segunda das três defesas (risco R-09). As outras duas: `SUPABASE_SERVICE_ROLE_KEY` sem
     * prefixo `NEXT_PUBLIC_`, e `import "server-only"` no topo de `lib/supabase/admin.ts` — que
     * transforma a violação em ERRO DE BUILD, não aviso. Por isso `next build` faz parte da
     * verificação local: o `tsc` sozinho não vê erro de fronteira.
     */
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["lib/supabase/admin.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "admin.ts usa a service_role e ignora TODA a RLS: só de Server Action, ETL ou script de manutenção. Nunca por requisição de tela. Ver constitution, Restrições Adicionais.",
            },
          ],
        },
      ],
    },
  },

  {
    /*
     * FRONTEIRA 1 (estreita) — `lib/dominio/` é PURO. Nada de I/O, nada de plataforma.
     *
     * POR QUÊ: é onde as ~40 regras `RN-` viram funções TypeScript testáveis sem banco. Um único
     * import de `supabase` aqui apodrece a testabilidade de todas elas — e o defeito só aparece
     * meses depois, quando alguém tenta escrever o teste e descobre que precisa de um banco.
     * Princípio II · risco R-10 · BRIEF §4.
     *
     * O grupo `@/lib/supabase/*` cobre `admin` também, então a fronteira 2 não se perde aqui.
     */
    files: ["lib/dominio/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/lib/supabase/*"],
              message:
                "lib/dominio/ é puro: sem acesso a banco (Princípio II). Receba o dado por parâmetro.",
            },
            {
              group: ["next/*", "next", "react", "react-dom", "@/lib/acoes/*"],
              message:
                "lib/dominio/ é puro: sem dependência de plataforma (risco R-10). A regra não sabe que existe UI.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

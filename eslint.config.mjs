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
    /*
     * ⚠️ A LISTA DE EXCEÇÕES É A LISTA DOS USOS AUTORIZADOS, e alargá-la é DECISÃO, não
     * conveniência. O BRIEF §3 autoriza três usos da `service_role`, e só três: convite de
     * usuário pelo Admin, carga do ETL, e script de manutenção versionado rodado à mão.
     *
     * `lib/acoes/usuarios.ts` entrou aqui no Épico 3 por ser o PRIMEIRO consumidor real — a
     * Server Action de convite. Está nomeada por arquivo, e não como `lib/acoes/**`, de
     * propósito: um padrão amplo autorizaria toda Server Action futura a ignorar a RLS, que é
     * exatamente o que esta regra existe para impedir. Se uma tela precisou da `service_role`
     * para funcionar, a policy está errada — conserte a policy (Princípio XI).
     */
    ignores: ["lib/supabase/admin.ts", "lib/acoes/usuarios.ts"],
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

  {
    /*
     * FRONTEIRA 3 — NENHUMA COR ENTRA FORA DO PONTO ÚNICO (`RF-DS-01`, `RNF-MAN-03`, `FR-001`).
     *
     * POR QUÊ: o objeto global `UI` da v2.0 centralizava cor POR CONVENÇÃO, e convenção é o que
     * cede num dia de pressa. Aqui a centralização passa a ser garantia do motor de build: cor
     * fora de `app/globals.css` é ERRO, não divergência que ninguém notou.
     *
     * ⚠️ SÃO DUAS REGRAS, E A SEGUNDA É A QUE COSTUMA ESCAPAR. Proibir só `#003366` deixa passar
     * `text-gray-500`, que também é uma cor que NÃO VEM do ponto único. Decisão de 09/09/2026.
     *
     * ⚠️ A MENSAGEM ENSINA O CAMINHO, em vez de só barrar: quem esbarra na regra precisa saber
     * para onde ir, senão contorna. Contrato: contracts/verificacao-de-cor.md.
     *
     * ⚠️ EXCEÇÃO AUTORIZADA, UMA SÓ: o CSS de impressão, para a normalização preto-no-branco.
     * Ela ainda NÃO EXISTE — a rota de impressão é dos épicos 10 e 11 — e fica prevista aqui para
     * não ser negociada às pressas no dia em que aparecer, que é como exceção vira regra.
     */
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: String.raw`Literal[value=/#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla)\(/]`,
          message:
            "Cor escrita à mão é proibida fora de app/globals.css (RF-DS-01, FR-001). " +
            "Use um token: bg-executado-fundo, text-conflito-tinta, border-borda. " +
            "Falta um token? Acrescente-o em globals.css NOS DOIS TEMAS, no par auditado de " +
            "lib/design/vocabulario.ts e na vitrine — as três coisas, ou nenhuma.",
        },
        {
          selector: String.raw`Literal[value=/\b(text|bg|border|ring|fill|stroke|from|via|to|decoration|outline|shadow|accent|caret|divide|placeholder)-(slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(-\d{2,3})?\b/]`,
          message:
            "Utilitário da paleta padrão é proibido (FR-001, decisão de 09/09/2026): " +
            "text-gray-500 é uma cor que NÃO VEM do ponto único. " +
            "Use um token do vocabulário CIAARA: text-texto-suave, bg-superficie-2, border-borda.",
        },
      ],
    },
  },
]);

export default eslintConfig;

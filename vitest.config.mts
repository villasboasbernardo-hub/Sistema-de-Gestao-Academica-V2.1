/**
 * Vitest — suítes de unidade e de RLS.
 *
 * DUAS SUÍTES, PROPÓSITOS DIFERENTES (BRIEF §7, itens 2 e 4):
 *   tests/unidade/        — funções puras de lib/dominio/ e as regras de fronteira. Sem banco,
 *                           sem rede, segundos. Roda no bloco `qualidade` do CI.
 *   tests/invariantes/rls/ — teste NEGATIVO por perfil: o que cada perfil NÃO pode ler ou escrever
 *                           é negado PELO BANCO. Exige banco no ar. Roda no bloco `banco`.
 *
 * Estão separadas porque testar só o caminho feliz aprovaria uma RLS desligada.
 */
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": raiz },
  },
  test: {
    environment: "node",
    include: ["tests/unidade/**/*.test.ts", "tests/invariantes/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/dominio/**"],
      reporter: ["text", "html"],
    },
  },
});

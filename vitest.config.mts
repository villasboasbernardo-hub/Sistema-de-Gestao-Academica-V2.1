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
 *
 * ⚠️ E `test:rls` RODA UM ARQUIVO POR VEZ — `--no-file-parallelism`, no script do `package.json`.
 * O motivo mora aqui porque sinalizador sem motivo registrado é removido pela primeira pessoa que
 * queira acelerar a suíte:
 *
 *   Os arquivos de `tests/invariantes/rls/` compartilham UM banco, e algumas asserções tratam como
 *   privado um estado que é GLOBAL. O caso mais claro: `cursos-e-turmas.test.ts` cria uma conta
 *   **Admin**, e `app.impedir_remocao_do_ultimo_admin()` conta os outros Admins ativos do banco
 *   inteiro — enquanto essa conta existe, o caso *"desativar o último Admin é recusado"* do
 *   `rls.test.ts` deixa de ter um último Admin para proteger. É a mesma causa raiz da instabilidade
 *   de `inicio.spec.ts` no Playwright, onde a amostra do panorama é por processo e os trabalhadores
 *   semeiam em paralelo: **trabalhadores concorrentes sobre estado global do banco**.
 *
 * Medido em 17/09/2026: em três execuções paralelas seguidas a corrida NÃO se materializou — a
 * janela é de tempo, e é real. Uma suíte que depende de CONTAGEM GLOBAL não deve depender de
 * escalonamento. Custo: ~10 s na suíte de RLS. A suíte de unidade continua paralela.
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

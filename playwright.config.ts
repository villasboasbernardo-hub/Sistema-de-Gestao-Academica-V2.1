/**
 * Playwright — percurso principal, convite e rotas de impressão (BRIEF §7, item 5).
 *
 * Contra o BUILD DE PRODUÇÃO, não contra o `dev`: a impressão (/print/*) se comporta diferente em
 * desenvolvimento por causa do overlay, e é justamente a impressão que a v2.0 entrega e a v2.1
 * precisa manter em paridade.
 *
 * ⚠️ A APLICAÇÃO SOB TESTE É CONSTRUÍDA CONTRA O SUPABASE **LOCAL**, e isto não é detalhe.
 *
 * O `.env.local` aponta, de propósito, para o projeto Supabase **remoto** de desenvolvimento — é o
 * ambiente em que se trabalha à mão. Sem a sobrescrita abaixo, `pnpm build` embute a URL remota no
 * bundle, e a suíte passa a exercitar uma aplicação que fala com OUTRO banco: o convite é emitido
 * pelo stack local, a tela tenta validá-lo no remoto, e o erro que aparece é
 * `unrecognized JWT kid ... for algorithm ES256` — que não sugere ambiente trocado a ninguém.
 *
 * Custou uma investigação inteira. Fica aqui, resolvido na configuração, para não custar duas.
 */
import { execFileSync } from "node:child_process";

import { defineConfig, devices } from "@playwright/test";

const URL_BASE = process.env.URL_BASE_E2E ?? "http://localhost:3000";

/** Pergunta ao próprio Supabase CLI. Nenhuma chave é embutida neste arquivo. */
function doStackLocal(nome: string): string {
  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split("\n")
    .find((l) => l.startsWith(`${nome}=`))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^"|"$/g, "")
    .trim();
  if (!valor)
    throw new Error(`nao achei ${nome} no \`supabase status\` — o stack local está de pé?`);
  return valor;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: URL_BASE, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: doStackLocal("API_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: doStackLocal("PUBLISHABLE_KEY"),
      NEXT_PUBLIC_URL_APLICACAO: URL_BASE,
      NEXT_PUBLIC_AMBIENTE: "local",
      // A Server Action de convite precisa dela; é a chave do stack local, descartável.
      SUPABASE_SERVICE_ROLE_KEY: doStackLocal("SECRET_KEY"),
    },
  },
});

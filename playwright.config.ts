/**
 * Playwright — percurso principal e rotas de impressão (BRIEF §7, item 5).
 *
 * Contra o BUILD DE PRODUÇÃO, não contra o `dev`: a impressão (/print/*) se comporta diferente em
 * desenvolvimento por causa do overlay, e é justamente a impressão que a v2.0 entrega e a v2.1
 * precisa manter em paridade.
 */
import { defineConfig, devices } from "@playwright/test";

const URL_BASE = process.env.URL_BASE_E2E ?? "http://localhost:3000";

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
  },
});

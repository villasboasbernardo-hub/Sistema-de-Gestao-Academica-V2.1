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

/**
 * Pergunta ao próprio Supabase CLI. Nenhuma chave é embutida neste arquivo.
 *
 * ⚠️ O AMBIENTE VEM PRIMEIRO, E NÃO É CONVENIÊNCIA — É O CONSERTO DE UMA CORRIDA MEDIDA.
 * O Playwright carrega esta configuração UMA VEZ POR PROCESSO DE TRABALHO. Com quatro deles,
 * eram quatro `supabase status` simultâneos, e o CLI reescreve `~/.supabase/telemetry.json` a
 * cada execução: dois processos renomeando o mesmo temporário produzem no Windows
 * `EPERM: operation not permitted, rename ... telemetry.json`, e a suíte morre no CARREGAMENTO
 * da configuração, antes do primeiro teste, com mensagem que não fala de concorrência nenhuma.
 * Reprovou DUAS VEZES EM TRÊS EXECUÇÕES, em testes diferentes a cada vez — assinatura de corrida,
 * não de defeito.
 *
 * O processo principal resolve os três valores e os GRAVA EM `process.env`; os processos de
 * trabalho nascem dele e herdam, então nenhum deles chama o CLI. De quatro invocações
 * concorrentes para uma sequencial. No CI as variáveis já vêm de fora e não há chamada alguma.
 *
 * ⚠️ `DO_NOT_TRACK=1` NÃO resolve: medido em 09/09/2026, o arquivo de telemetria continua sendo
 * reescrito. O que remove a corrida é não haver concorrência.
 *
 * É o mesmo contrato de `tests/invariantes/rls/chaves-locais.ts`, e agora os nomes batem.
 */
function doStackLocal(nomeNoCli: string, nomeNoAmbiente: string): string {
  const doAmbiente = process.env[nomeNoAmbiente];
  if (doAmbiente) return doAmbiente;

  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split("\n")
    .find((l) => l.startsWith(`${nomeNoCli}=`))
    ?.split("=")
    .slice(1)
    .join("=")
    .replace(/^"|"$/g, "")
    .trim();
  if (!valor)
    throw new Error(`nao achei ${nomeNoCli} no \`supabase status\` — o stack local está de pé?`);
  process.env[nomeNoAmbiente] = valor;
  return valor;
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  /**
   * ⚠️ NAVEGAÇÃO COM PRAZO PRÓPRIO, MAIOR QUE O DAS ASSERÇÕES — e o número saiu de uma medição, não
   * de cautela. Em 10/09/2026, no primeiro CI da fatia (b), **dois casos ficaram instáveis**:
   * falharam em `expect(page.locator("main")).toBeVisible()` logo depois de abrir `/estilo`, e
   * passaram na repetição. A causa é o que a fatia acrescentou à vitrine — biblioteca de gráficos,
   * tabela de 45 linhas, dezesseis componentes —, tudo carregado por quatro processos de trabalho
   * ao mesmo tempo, num executor mais lento que esta máquina.
   *
   * ⚠️ **O PRAZO DE ASSERÇÃO CONTINUA EM 5 SEGUNDOS, DE PROPÓSITO.** Alargar os dois junto
   * esconderia falha de verdade: uma tela que leva 15s para mostrar um emblema está quebrada. O que
   * cresce é só o prazo de CARREGAR a página, que é onde a lentidão de fato mora.
   *
   * ⚠️ **Instável é defeito da verificação, não azar** — é a regra do projeto desde o `SC-005`, e
   * ela vale mesmo quando o portão fica verde na repetição, porque o próximo pode não ficar.
   */
  use: { baseURL: URL_BASE, trace: "on-first-retry", navigationTimeout: 60_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: URL_BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: doStackLocal("API_URL", "SUPABASE_URL_TESTE"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: doStackLocal("PUBLISHABLE_KEY", "SUPABASE_ANON_KEY_TESTE"),
      NEXT_PUBLIC_URL_APLICACAO: URL_BASE,
      NEXT_PUBLIC_AMBIENTE: "local",
      // A Server Action de convite precisa dela; é a chave do stack local, descartável.
      SUPABASE_SERVICE_ROLE_KEY: doStackLocal("SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY_TESTE"),
    },
  },
});

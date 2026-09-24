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

  /*
   * ⚠️ **10 SEGUNDOS, E NÃO OS 5 DO PADRÃO** *(decisão de Bernardo Villas Boas, 23/09/2026, opção (a)
   *    da `PEND-5a-7`)*. Este é o prazo de cada `expect` — o tempo que ele reexecuta a asserção antes
   *    de desistir —, e não o limite do caso, que continua em 30 s.
   *
   *    **O que foi medido**, sem `retries`, em paralelo, na base resetada: três execuções da suíte
   *    inteira deram 251, 251 e 250 passados, e a única reprovação foi o **primeiro** `expect` de um
   *    percurso de `/admin/salas` — tela que lê a lista de salas **e** todas as turmas para dizer quem
   *    usa cada uma. Os passos seguintes do mesmo percurso já pediam 15 s e passavam. Com quatro
   *    processos de trabalho, um servidor Next de produção e o stack do Supabase na mesma máquina,
   *    **tela de gestão passa de 5 s** — e um prazo que reprova por carga da máquina não mede a tela.
   *
   * ⚠️ **ISTO NÃO ESCONDE LENTIDÃO REAL, E A DISTINÇÃO IMPORTA.** O que o prazo absorve é a variação
   *    sob carga; uma tela que passe a levar 10 s continua reprovando. A otimização do que as torna
   *    lentas — `vw_instrutor_carga_anual` a ~700 ms sob RLS, e a leitura de todas as turmas na tela de
   *    salas — **fica registrada como não bloqueante**, para reavaliar se a conferência no preview
   *    mostrar lentidão (opção (b) da mesma decisão).
   */
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: URL_BASE, trace: "on-first-retry" },
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

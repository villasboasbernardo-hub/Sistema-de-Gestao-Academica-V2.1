/**
 * `pnpm dev:local` — o sistema em desenvolvimento, falando com o banco do DOCKER desta máquina.
 *
 * ⚠️ **POR QUE ISTO EXISTE, MEDIDO EM 22/09/2026, COM CUSTO.** O `.env.local` aponta para o
 * Supabase **remoto** — é o achado 3 do Épico 3, e ele continua valendo. `pnpm dev` lê esse
 * arquivo, então **toda tela aberta por `pnpm dev` conversa com o remoto**, mesmo com o Docker
 * de pé e a carga feita. O roteiro de conferência da spec 009 mandou criar a conta no banco
 * local e entrar por `pnpm dev`: a conta existia, estava confirmada, e o login respondia
 * *"e-mail ou senha incorretos"* — porque a pergunta ia para outro banco.
 *
 * O Playwright nunca sofreu isso porque `playwright.config.ts` injeta as chaves locais por
 * `webServer.env`. **Este script faz a mesma coisa para quem abre o sistema com as mãos**, lendo
 * as chaves da mesma fonte — o `supabase status` — em vez de uma cópia que envelhece.
 *
 * ⚠️ **NÃO MEXE NO `.env.local`.** Variável já presente no ambiente do processo não é
 * sobrescrita pelos arquivos `.env*` do Next, então basta pôr as locais aqui antes de iniciar.
 * O `pnpm dev` de sempre continua indo ao remoto, como ia.
 *
 * Argumentos passam adiante: `pnpm dev:local -p 3100`.
 */
import { execSync, spawn } from "node:child_process";
import { createRequire } from "node:module";

function lerStackLocal() {
  let saida;
  try {
    saida = execSync("supabase status -o env", {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.error(
      "[dev:local] o `supabase status` falhou. O Docker esta aberto e o banco de pe? Rode `pnpm db:start`.",
    );
    process.exit(1);
  }
  const mapa = {};
  for (const linha of saida.split("\n")) {
    const corte = linha.indexOf("=");
    if (corte <= 0) continue;
    mapa[linha.slice(0, corte).trim()] = linha
      .slice(corte + 1)
      .trim()
      .replace(/^"|"$/g, "");
  }
  return mapa;
}

const local = lerStackLocal();
const exigidas = ["API_URL", "PUBLISHABLE_KEY", "SECRET_KEY", "DB_URL"];
const faltando = exigidas.filter((c) => !local[c]);
if (faltando.length > 0) {
  console.error(`[dev:local] o \`supabase status\` nao trouxe: ${faltando.join(", ")}`);
  process.exit(1);
}

// ⚠️ A RECUSA QUE IMPORTA: este comando existe para NUNCA falar com o remoto. Se o `status`
//    devolver outro endereço, é melhor não subir do que subir enganado.
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(local.API_URL)) {
  console.error(`[dev:local] o endereco do banco nao e local (${local.API_URL}). Recusado.`);
  process.exit(3);
}

const argumentos = process.argv.slice(2);
const indicePorta = argumentos.findIndex((a) => a === "-p" || a === "--port");
const porta = indicePorta >= 0 ? argumentos[indicePorta + 1] : "3000";

const ambiente = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: local.PUBLISHABLE_KEY,
  // A chave de serviço LOCAL — sem esta linha, a ação de convite usaria a do remoto.
  SUPABASE_SERVICE_ROLE_KEY: local.SECRET_KEY,
  DATABASE_URL: local.DB_URL,
  NEXT_PUBLIC_URL_APLICACAO: `http://localhost:${porta}`,
  NEXT_PUBLIC_AMBIENTE: "local",
};

console.log(`[dev:local] banco: ${local.API_URL}  ·  sistema: http://localhost:${porta}/login`);

// ⚠️ O Next é chamado DIRETO, pelo próprio Node, e não por `pnpm exec` com `shell: true`: no
//    Windows isso imprimia um `DeprecationWarning` na cara de quem só queria abrir o sistema, e
//    concatenava os argumentos sem escapar. Resolver o executável do Next e passar ao Node evita
//    o shell nos três sistemas.
const binarioDoNext = createRequire(import.meta.url).resolve("next/dist/bin/next");
const filho = spawn(process.execPath, [binarioDoNext, "dev", "--turbo", ...argumentos], {
  env: ambiente,
  stdio: "inherit",
});
filho.on("exit", (codigo) => process.exit(codigo ?? 0));

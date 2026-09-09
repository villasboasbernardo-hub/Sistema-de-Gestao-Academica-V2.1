/**
 * As chaves do stack LOCAL, pedidas ao próprio Supabase CLI. Nenhuma é embutida aqui.
 *
 * **Duas razões, e as duas importam.**
 *
 * A primeira é que este repositório é público: uma literal `sb_secret_…` no código, ainda que seja
 * só a chave do stack local, dispara a varredura de segredos do GitHub e normaliza o hábito que o
 * BRIEF §2 proíbe — a `service_role` ignora a RLS inteira, e o lugar dela nunca é o versionamento.
 *
 * A segunda é que **`.env.local` não serve para estas suítes**: ele aponta para o projeto Supabase
 * remoto de desenvolvimento e traz `SUPABASE_SERVICE_ROLE_KEY` vazia, de propósito. Ler dali faria
 * a suíte rodar contra o banco errado — ou, pior, criar usuários de teste nele.
 *
 * `supabase status -o env` devolve sempre as chaves do stack local em pé, e nada disso encosta no
 * versionamento. No CI, as variáveis de ambiente têm precedência.
 */
import { execFileSync } from "node:child_process";

export function chaveLocal(nomeNoCli: string, nomeNoAmbiente: string): string {
  const doAmbiente = process.env[nomeNoAmbiente];
  if (doAmbiente) return doAmbiente;

  const saida = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const valor = saida
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${nomeNoCli}=`))
    ?.slice(nomeNoCli.length + 1)
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!valor) {
    throw new Error(
      `${nomeNoCli} não veio de \`supabase status\`. O stack local está de pé? ` +
        `Rode \`pnpm db:start\`. Estas suítes precisam de sessão autenticada de verdade, ` +
        `contra o banco local — não contra o projeto remoto do \`.env.local\`.`,
    );
  }
  return valor;
}

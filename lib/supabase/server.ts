/**
 * Cliente do Supabase para o SERVIDOR (Server Components, Server Actions, Route Handlers).
 *
 * FR-007. A sessão vive em cookie, e é aqui que mora a armadilha mais cara do `@supabase/ssr`
 * com o App Router — resolvida NESTA fatia de propósito, não espalhada pelos épicos seguintes
 * (documento 06, riscos do Épico 0):
 *
 *   Server Components NÃO PODEM escrever cookie. Quando o Supabase renova o token durante a
 *   renderização, `setAll` é chamado — e falha. Engolir a exceção é o comportamento correto:
 *   o middleware (ver ./middleware.ts) já renovou a sessão antes de a rota renderizar, então a
 *   escrita perdida aqui é redundante, não perda de dado. Sem esse try/catch, toda página
 *   autenticada quebra de forma intermitente, no momento exato da renovação do token — e o
 *   defeito só aparece depois de a sessão envelhecer, que é o pior momento para descobri-lo.
 *
 * `cookies()` é assíncrono no Next 15+, por isso esta função é `async`.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { credenciaisPublicasDoSupabase } from "@/lib/ambiente";

export async function criarClienteDeServidor() {
  const armazemDeCookies = await cookies();
  const { url, chaveAnonima } = credenciaisPublicasDoSupabase();

  return createServerClient(url, chaveAnonima, {
    cookies: {
      getAll() {
        return armazemDeCookies.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            armazemDeCookies.set(name, value, options);
          }
        } catch {
          // Server Component: escrita de cookie é proibida. O middleware já renovou a sessão.
          // Ver o comentário no topo deste arquivo antes de "consertar" isto.
        }
      },
    },
  });
}

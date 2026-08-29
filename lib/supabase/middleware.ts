/**
 * Renovação de sessão no middleware do Next.
 *
 * FR-007. É o par obrigatório do `try/catch` de `./server.ts`: como Server Components não escrevem
 * cookie, a renovação do token TEM de acontecer aqui, antes de a rota renderizar. Sem isto, a
 * sessão expira em silêncio e o usuário é deslogado no meio do trabalho.
 *
 * Duas regras que produzem defeito silencioso quando quebradas:
 *   1. O objeto `NextResponse` devolvido precisa ser o MESMO em que os cookies foram gravados.
 *      Criar outro depois descarta a renovação.
 *   2. Chamar `supabase.auth.getUser()` — não `getSession()`. `getUser()` valida o token contra o
 *      servidor de Auth; `getSession()` confia no cookie, que o usuário controla.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { conferirAmbiente } from "@/lib/ambiente";

export async function renovarSessao(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });

  // RN-DEG-01: sem configuração, o middleware sai de lado em vez de derrubar toda requisição.
  // A tela informa o que falta (ver lib/ambiente.ts e app/error.tsx).
  if (conferirAmbiente().length > 0) return resposta;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll() {
          return requisicao.cookies.getAll();
        },
        setAll(cookiesParaGravar) {
          for (const { name, value } of cookiesParaGravar) {
            requisicao.cookies.set(name, value);
          }
          resposta = NextResponse.next({ request: requisicao });
          for (const { name, value, options } of cookiesParaGravar) {
            resposta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Valida contra o servidor de Auth. Não trocar por getSession().
  await supabase.auth.getUser();

  return resposta;
}

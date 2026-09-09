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

/** Rotas alcançáveis SEM sessão. Tudo o mais em `(app)` exige uma. */
const SEM_SESSAO = ["/login", "/convite", "/recuperar-senha", "/sem-configuracao"];

function ehRotaAberta(caminho: string): boolean {
  return SEM_SESSAO.some((r) => caminho === r || caminho.startsWith(`${r}/`));
}

export async function renovarSessao(requisicao: NextRequest) {
  let resposta = NextResponse.next({ request: requisicao });
  const caminho = requisicao.nextUrl.pathname;

  // ⚠️ SEM CONFIGURAÇÃO, A ROTA PROTEGIDA É NEGADA — e isto CUMPRE o RN-DEG-01, não o excetua.
  //
  // O princípio proíbe **exceção não tratada** quando falta **dado de domínio**. Aqui falta
  // **configuração da fronteira de segurança**, e a resposta é uma tela que diz o que falta —
  // exatamente o "vazio/neutro com aviso" que ele pede. O princípio nunca disse "deixe a
  // requisição passar"; disse "não estoure".
  //
  // A versão anterior seguia em frente (`return resposta`). Numa aplicação sem autenticação isso
  // era inofensivo; a partir do momento em que existe rota protegida, uma variável de ambiente
  // faltando abriria o sistema inteiro. Muda o DESTINO da requisição, não o tratamento. (FR-005.1)
  if (conferirAmbiente().length > 0) {
    if (ehRotaAberta(caminho)) return resposta;
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/sem-configuracao";
    destino.search = "";
    return NextResponse.rewrite(destino);
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rota protegida sem sessão vai para o login, **guardando o destino** — quem clicou num link
  // para a tela X volta para X depois de entrar, e não para a raiz (FR-005).
  if (!user && !ehRotaAberta(caminho)) {
    const destino = requisicao.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    destino.searchParams.set("destino", `${caminho}${requisicao.nextUrl.search}`);
    return NextResponse.redirect(destino);
  }

  return resposta;
}

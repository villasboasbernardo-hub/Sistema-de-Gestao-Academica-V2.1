/**
 * Proxy da aplicação — renova a sessão do Supabase antes de cada rota renderizar.
 *
 * **Chamava-se `middleware.ts` até o Next 15.** O Next 16 depreciou a convenção e avisa no build:
 * "The middleware file convention is deprecated. Please use proxy instead." Migrado em 27/08/2026,
 * na fundação, para que nenhum épico seguinte herde a depreciação.
 *
 * FR-007. A lógica vive em `lib/supabase/middleware.ts`; aqui fica só o ponto de entrada e o
 * `matcher`, que exclui o que não precisa de sessão (assets, imagens) para não pagar o custo à toa.
 */
import type { NextRequest } from "next/server";

import { renovarSessao } from "@/lib/supabase/middleware";

export default async function proxy(requisicao: NextRequest) {
  return renovarSessao(requisicao);
}

export const config = {
  matcher: [
    /*
     * Tudo, exceto: _next/static, _next/image, favicon e arquivos de imagem.
     * Rotas de impressão (/print/*) SÃO incluídas de propósito: também exigem sessão.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

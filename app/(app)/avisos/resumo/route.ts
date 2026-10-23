/**
 * `GET /avisos/resumo` — o número de avisos e as chaves, para o sininho do cabeçalho (spec 022, Bloco 7, D-9).
 *
 * ⚠️ **A MESMA LEITURA DA PÁGINA** (`lerAvisos`), pelo cliente da sessão: a RLS recorta, e o número do sininho é o da
 *    página. ⚠️ **NADA É ESCRITO.** ⚠️ **SEM CACHE**: o sininho decide quando pedir (no máximo a cada 2 minutos), e uma
 *    resposta guardada pelo caminho faria o aviso novo não chegar.
 * ⚠️ **SEM SESSÃO, 401** e o sininho fica sem número — nunca um zero que afirmaria que não há aviso.
 */
import { NextResponse } from "next/server";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { lerAvisos } from "../leitura";

export const dynamic = "force-dynamic";

export async function GET() {
  const usuario = await usuarioDaSessao();
  if (!usuario) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  const supabase = await criarClienteDeServidor();
  const permissoes = await permissoesDoPerfil(usuario.perfil);
  const { avisos, naoLidos } = await lerAvisos(
    supabase,
    hojeNaCiaara(),
    pode(permissoes, "calendario", "editar"),
  );
  return NextResponse.json(
    { total: avisos.length, chaves: avisos.map((a) => a.chave), naoLidos },
    { headers: { "Cache-Control": "no-store" } },
  );
}

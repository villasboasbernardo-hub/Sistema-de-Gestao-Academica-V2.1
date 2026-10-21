/**
 * O download do currículo em PDF — spec 020 (Bloco 5), C-8: `GET /cursos/<sigla>/curriculo`.
 *
 * ⚠️ **O ARQUIVO NÃO PASSA POR AQUI**: a Vercel corta a RESPOSTA de uma função em 4,5 MB, como o pedido. Este endereço
 *    lê o curso com a sessão de quem pede (a RLS decide: `cursos.ler` e alcance), gera um link assinado de 60 segundos
 *    pela mesma sessão (a policy `curriculos_ler` decide de novo) e REDIRECIONA — o navegador baixa direto do Storage.
 * ⚠️ **SEM CURRÍCULO, OU SEM PERMISSÃO, A RESPOSTA DIZ OS DOIS** — as duas recusas chegam iguais da RLS, e afirmar só
 *    uma seria inventar o motivo (gotcha 4).
 */
import { NextResponse } from "next/server";

import { BALDE_DE_CURRICULOS, caminhoDoCurriculo } from "@/lib/dominio/curriculo-em-pdf";
import { criarClienteDeServidor } from "@/lib/supabase/server";

const SEGUNDOS_DO_LINK = 60;

function indisponivel(): Response {
  return new Response(
    "Currículo indisponível: este curso não tem currículo carregado, ou o seu perfil não o lê.",
    { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

export async function GET(_pedido: Request, { params }: { params: Promise<{ curso: string }> }) {
  /* O Next entrega `params` já decodificado — decodificar de novo destruiria uma sigla com "%". */
  const { curso: sigla } = await params;
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select("id, codigo, curriculo_pdf_em")
    .eq("codigo", sigla)
    .maybeSingle();
  if (!curso || !curso.curriculo_pdf_em) return indisponivel();

  const { data, error } = await supabase.storage
    .from(BALDE_DE_CURRICULOS)
    .createSignedUrl(caminhoDoCurriculo(curso.id as string), SEGUNDOS_DO_LINK, {
      download: `Curriculo ${curso.codigo as string}.pdf`,
    });
  if (error || !data) return indisponivel();

  return NextResponse.redirect(data.signedUrl, 302);
}

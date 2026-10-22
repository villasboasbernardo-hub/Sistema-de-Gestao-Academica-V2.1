/**
 * O download do currículo em PDF — spec 020 (Bloco 5), C-8: `GET /cursos/<sigla>/curriculo`.
 *
 * ⚠️ **O ARQUIVO NÃO PASSA POR AQUI**: a Vercel corta a RESPOSTA de uma função em 4,5 MB, como o pedido. Este endereço
 *    lê o curso com a sessão de quem pede (a RLS decide: `cursos.ler` e alcance), gera um link assinado de 60 segundos
 *    pela mesma sessão (a policy `curriculos_ler` decide de novo) e REDIRECIONA — o navegador baixa direto do Storage.
 * ⚠️ **SEM CURRÍCULO, OU SEM PERMISSÃO, A RESPOSTA DIZ OS DOIS** — as duas recusas chegam iguais da RLS, e afirmar só
 *    uma seria inventar o motivo (gotcha 4).
 * ⚠️ **SPEC 021 (Bloco 6, RC-11): CADA CURRÍCULO TEM O SEU PDF.** `?curriculo=N` baixa o do "Currículo N"; sem ele, o do
 *    vigente hoje — o mesmo link de antes. O arquivo é o que `curriculos.pdf_caminho` aponta.
 */
import { NextResponse } from "next/server";

import { BALDE_DE_CURRICULOS } from "@/lib/dominio/curriculo-em-pdf";
import { curriculoVigenteEm, type CurriculoParaVigencia } from "@/lib/dominio/curriculos";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

const SEGUNDOS_DO_LINK = 60;

type CurriculoComPdf = CurriculoParaVigencia & { readonly pdf_caminho: string | null };

function indisponivel(): Response {
  return new Response(
    "Currículo indisponível: este curso não tem currículo carregado, ou o seu perfil não o lê.",
    { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

export async function GET(pedido: Request, { params }: { params: Promise<{ curso: string }> }) {
  /* O Next entrega `params` já decodificado — decodificar de novo destruiria uma sigla com "%". */
  const { curso: sigla } = await params;
  const numero = new URL(pedido.url).searchParams.get("curriculo")?.trim() ?? "";
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, curriculos:curriculos!curriculos_curso_id_fkey(versao, vigente_de, status, arquivado_em, pdf_caminho)",
    )
    .eq("codigo", sigla)
    .maybeSingle();
  const curriculos = ((curso as unknown as { curriculos?: CurriculoComPdf[] } | null)?.curriculos ??
    []) as CurriculoComPdf[];
  const curriculo =
    numero === ""
      ? curriculoVigenteEm(curriculos, hojeNaCiaara())
      : (curriculos.find((c) => String(c.versao) === numero) ?? null);
  if (!curso || !curriculo?.pdf_caminho) return indisponivel();

  const { data, error } = await supabase.storage
    .from(BALDE_DE_CURRICULOS)
    .createSignedUrl(curriculo.pdf_caminho, SEGUNDOS_DO_LINK, {
      download:
        numero === ""
          ? `Curriculo ${curso.codigo as string}.pdf`
          : `Curriculo ${curso.codigo as string} - ${curriculo.versao}.pdf`,
    });
  if (error || !data) return indisponivel();

  return NextResponse.redirect(data.signedUrl, 302);
}

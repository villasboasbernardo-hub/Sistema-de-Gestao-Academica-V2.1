/**
 * `GET /turmas/<código>/dsa/planilha` — o download da planilha de contingência do DSA (spec 015,
 * `contracts/rota-de-download.md`). O primeiro Route Handler do repositório.
 *
 * ⚠️ **TODA LEITURA PELO CLIENTE DA SESSÃO** (Princípio XI): a RLS é a fronteira, e a `service_role`
 * não tem uso autorizado aqui (gotcha 2). ⚠️ **E NADA É ESCRITO** — nem rastro de download (`FR-004`).
 */
import { permissoesDoPerfil } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { montarPlanilhaDeContingencia } from "@/lib/dominio/dsa/planilha-de-contingencia";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { escreverXlsx } from "@/lib/planilha/ooxml";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { COLUNAS_DA_TURMA_DA_PLANILHA, lerDadosDaPlanilha, type TurmaDaPlanilha } from "./leitura";
import { responderDownload } from "./resposta";

/* O escritor usa `node:zlib`. */
export const runtime = "nodejs";

export async function GET(pedido: Request, { params }: { params: Promise<{ turma: string }> }) {
  const { turma: segmento } = await params;
  const usuario = await usuarioDaSessao();
  const supabase = await criarClienteDeServidor();
  return responderDownload(pedido, segmento, {
    permissoes: () => permissoesDoPerfil(usuario?.perfil ?? null),
    nomeDeQuemGera: async () => usuario?.nome ?? "",
    turma: async (codigo) => {
      const { data } = await supabase
        .from("turmas")
        .select(COLUNAS_DA_TURMA_DA_PLANILHA)
        .eq("codigo", codigo)
        .maybeSingle();
      return (data as TurmaDaPlanilha | null) ?? null;
    },
    ler: (turma, contexto) => lerDadosDaPlanilha(supabase, turma, contexto),
    escrever: (insumo) => escreverXlsx(montarPlanilhaDeContingencia(insumo)),
    hoje: hojeNaCiaara,
    agora: () => new Date(),
  });
}

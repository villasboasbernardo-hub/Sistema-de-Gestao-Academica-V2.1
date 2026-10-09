/**
 * A resposta da rota de download da planilha de contingência — `contracts/rota-de-download.md` da
 * spec 015.
 *
 * ⚠️ **FORA DO `route.ts` DE PROPÓSITO**: o Next só aceita ali os nomes de rota (`GET`, `runtime`…),
 * e a falha da geração precisa ser provada com o leitor substituído (`FR-006`). Aqui as dependências
 * entram por parâmetro; o `route.ts` passa as de verdade.
 *
 * ⚠️ **A RECUSA NÃO CONFIRMA QUE A TURMA EXISTE** (`FR-003`): sem permissão, turma inexistente e turma
 * fora do alcance dão o MESMO 404, com o mesmo corpo.
 *
 * ⚠️ **NUNCA UM ARQUIVO PELA METADE** (`FR-006`): qualquer falha de leitura ou de montagem volta à
 * tela do DSA com o aviso — o corpo do arquivo só existe quando ele está inteiro.
 */
import type { Permissoes } from "@/lib/autorizacao/matriz";
import type { InsumoDaPlanilha } from "@/lib/dominio/dsa/planilha/tipos";
import { codigoDaTurmaNoSegmento, enderecoDoDsa } from "@/lib/navegacao/endereco-de-turma";

import { podeBaixarPlanilhaDeContingencia, podeLancarNoDsa } from "./acesso";
import type { TurmaDaPlanilha } from "./leitura";

export const TIPO_DO_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const AVISO_DE_FALHA = "falhou";

export type DependenciasDaRota = {
  readonly permissoes: () => Promise<Permissoes>;
  readonly nomeDeQuemGera: () => Promise<string>;
  /** A turma pelo cliente da SESSÃO — a RLS decide se ela existe para quem pede. */
  readonly turma: (codigo: string) => Promise<TurmaDaPlanilha | null>;
  readonly ler: (
    turma: TurmaDaPlanilha,
    contexto: { readonly hoje: string; readonly geradaEm: string; readonly geradaPor: string },
  ) => Promise<InsumoDaPlanilha>;
  readonly escrever: (insumo: InsumoDaPlanilha) => Uint8Array;
  readonly hoje: () => string;
  readonly agora: () => Date;
};

const naoEncontrada = () =>
  new Response("Não encontrado.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

const paraODsa = (codigo: string, base: string, comAviso: boolean) => {
  const destino = new URL(enderecoDoDsa(codigo), base);
  if (comAviso) destino.searchParams.set("planilha", AVISO_DE_FALHA);
  return new Response(null, {
    status: 303,
    headers: { Location: destino.toString(), "Cache-Control": "no-store" },
  });
};

/** `DSA-contingencia-<código>-<AAAA-MM-DD>.xlsx` — o ASCII sem acento e com hífen no espaço. */
export function nomeDoArquivo(
  codigo: string,
  data: string,
): { readonly ascii: string; readonly utf8: string } {
  const utf8 = `DSA-contingencia-${codigo}-${data}.xlsx`;
  const ascii = utf8
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");
  return { ascii, utf8 };
}

export async function responderDownload(
  pedido: Request,
  segmento: string,
  d: DependenciasDaRota,
): Promise<Response> {
  const codigo = codigoDaTurmaNoSegmento(segmento).trim();
  if (codigo === "") return naoEncontrada();

  const permissoes = await d.permissoes();
  if (!podeLancarNoDsa(permissoes)) return naoEncontrada();

  const turma = await d.turma(codigo);
  if (turma === null) return naoEncontrada();
  if (!podeBaixarPlanilhaDeContingencia(permissoes, turma.modalidade)) {
    return paraODsa(turma.codigo, pedido.url, false);
  }

  let arquivo: Uint8Array;
  const hoje = d.hoje();
  try {
    const insumo = await d.ler(turma, {
      hoje,
      geradaEm: d.agora().toISOString(),
      geradaPor: await d.nomeDeQuemGera(),
    });
    arquivo = d.escrever(insumo);
  } catch (erro) {
    console.error("planilha de contingência não gerada", turma.codigo, erro);
    return paraODsa(turma.codigo, pedido.url, true);
  }

  const nome = nomeDoArquivo(turma.codigo, hoje);
  return new Response(arquivo as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": TIPO_DO_XLSX,
      "Content-Disposition": `attachment; filename="${nome.ascii}"; filename*=UTF-8''${encodeURIComponent(nome.utf8)}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

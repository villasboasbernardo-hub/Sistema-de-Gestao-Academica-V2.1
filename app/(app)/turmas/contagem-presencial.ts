/**
 * Os insumos da etapa presencial das turmas semipresenciais — spec 024 (Bloco 9, FR-019/FR-020), num ponto único para os
 * quatro leitores do andamento (Início, Turmas, ficha e avisos).
 *
 * ⚠️ **UMA RODADA, SEM LAÇO**: três leituras independentes, montadas em memória. Só as turmas semipresenciais entram.
 * ⚠️ **SEM `server-only`**: a leitura dos avisos importa este módulo e é chamada por teste de invariante sem servidor.
 * ⚠️ **A FALHA DEGRADA PARA «CONTA TUDO»** (`RN-DEG-01`): sem a leitura, o mapa sai vazio, e `contagemDaTurma` conta
 *    como antes do Bloco 9, com o aviso da marca — nunca um número de uma etapa que não se leu.
 */
import type { ContagemPresencial } from "@/lib/dominio/andamento-da-turma";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export async function lerContagemPresencial(
  supabase: Cliente,
  hoje: string,
): Promise<ReadonlyMap<string, ContagemPresencial>> {
  const [turmasRes, cargaRes, etapaRes] = await Promise.all([
    supabase
      .from("turmas")
      .select("id, inicio_etapa_presencial, termino_etapa_presencial")
      .eq("modalidade", "semipresencial"),
    supabase
      .from("vw_carga_presencial_turma")
      .select("turma_id, disciplinas_presenciais, ch_presencial"),
    supabase.rpc("chd_da_turma_na_etapa_ate", { p_ate: hoje }),
  ]);
  if (turmasRes.error || cargaRes.error || etapaRes.error) return new Map();
  const carga = new Map(
    (
      (cargaRes.data ?? []) as {
        turma_id: string;
        disciplinas_presenciais: number;
        ch_presencial: number;
      }[]
    ).map((c) => [c.turma_id, c] as const),
  );
  const naEtapa = new Map(
    ((etapaRes.data ?? []) as { turma_id: string; chd_executada: number }[]).map(
      (e) => [e.turma_id, Number(e.chd_executada)] as const,
    ),
  );
  return new Map(
    (
      (turmasRes.data ?? []) as {
        id: string;
        inicio_etapa_presencial: string | null;
        termino_etapa_presencial: string | null;
      }[]
    ).map((t) => [
      t.id,
      {
        disciplinasMarcadas: Number(carga.get(t.id)?.disciplinas_presenciais ?? 0),
        chPresencial: Number(carga.get(t.id)?.ch_presencial ?? 0),
        executadaNaEtapa: naEtapa.get(t.id) ?? 0,
        inicioEtapa: t.inicio_etapa_presencial,
        terminoEtapa: t.termino_etapa_presencial,
      },
    ]),
  );
}

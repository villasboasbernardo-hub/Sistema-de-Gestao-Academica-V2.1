/**
 * A leitura da publicação da semana do DSA — spec 024 (Bloco 9, RP-3): a trilha `dsa_eventos_da_semana`, com o nome
 * de quem fez, e o número de rascunhos da semana.
 *
 * ⚠️ **SÓ LEITURA**: quem grava é `lib/acoes/publicacao-do-dsa.ts`, pelas funções do banco.
 * ⚠️ **O NOME DE QUEM FEZ PODE NÃO VIR** (a RLS de `usuarios` recorta por perfil): sem ele, o histórico diz «—», nunca
 *    um nome inventado.
 */
import "server-only";

import type { EventoDaSemana, TipoDeEvento } from "@/lib/dominio/dsa/publicacao";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export type EventoComRetrato = EventoDaSemana & {
  /** O documento publicado (só nas publicações). */
  readonly dados: unknown;
};

export type PublicacaoDaSemana = {
  readonly eventos: readonly EventoComRetrato[];
  readonly rascunhos: number;
  /** A leitura falhou — a tela não oferece publicar sobre o que não leu. */
  readonly erro: boolean;
};

export async function lerPublicacaoDaSemana(
  supabase: Cliente,
  entrada: {
    readonly turmaId: string;
    readonly ano: number;
    readonly numero: number;
    readonly de: string;
    readonly ate: string;
  },
): Promise<PublicacaoDaSemana> {
  const [eventosRes, rascunhosRes] = await Promise.all([
    supabase
      .from("dsa_eventos_da_semana")
      .select("tipo, numero, justificativa, retrato, autor_id, ocorrido_em")
      .eq("turma_id", entrada.turmaId)
      .eq("ano", entrada.ano)
      .eq("semana", entrada.numero)
      .order("ocorrido_em"),
    supabase.rpc("quantos_rascunhos_na_semana", {
      p_turma: entrada.turmaId,
      p_de: entrada.de,
      p_ate: entrada.ate,
    }),
  ]);
  const linhas = (eventosRes.data ?? []) as {
    tipo: TipoDeEvento;
    numero: number | null;
    justificativa: string | null;
    retrato: { hoje?: string; dados?: unknown } | null;
    autor_id: string | null;
    ocorrido_em: string;
  }[];
  const autores = [
    ...new Set(linhas.map((l) => l.autor_id).filter((id): id is string => id !== null)),
  ];
  const nomes = new Map<string, string>();
  if (autores.length > 0) {
    const { data } = await supabase
      .from("usuarios")
      .select("auth_user_id, nome_exibicao, nome")
      .in("auth_user_id", autores);
    for (const u of (data ?? []) as {
      auth_user_id: string;
      nome_exibicao: string | null;
      nome: string;
    }[]) {
      nomes.set(u.auth_user_id, u.nome_exibicao ?? u.nome);
    }
  }
  return {
    eventos: linhas.map((l) => ({
      tipo: l.tipo,
      numero: l.numero,
      justificativa: l.justificativa,
      ocorridoEm: l.ocorrido_em,
      autor: l.autor_id === null ? null : (nomes.get(l.autor_id) ?? null),
      hoje: l.retrato?.hoje ?? null,
      dados: l.retrato?.dados ?? null,
    })),
    rascunhos: Number(rascunhosRes.data ?? 0),
    erro: eventosRes.error !== null || rascunhosRes.error !== null,
  };
}

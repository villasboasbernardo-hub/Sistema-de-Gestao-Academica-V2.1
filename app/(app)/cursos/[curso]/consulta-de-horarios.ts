/**
 * A leitura da aba **Horários** do curso — spec 018 (Bloco 3), FR-003, C-7, C-12, C-18.
 *
 * ⚠️ **UMA RODADA SÓ** (`Promise.all`): os regimes nomeados, o catálogo de horários e as vigências do curso; o uso de
 *    cada regime (quais turmas) sai das turmas que a página já leu, e a trava do relógio é uma leitura por regime —
 *    poucos por curso, todas em paralelo, nunca em laço com `await`.
 * ⚠️ **ERRO DE LEITURA NÃO VIRA LISTA VAZIA EM SILÊNCIO** (gotcha 4): a aba diz que não leu.
 */
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type RegimeNaTela = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly regimeTempos: number;
  readonly taDuracaoMin: number;
  readonly intervaloManhaMin: number;
  readonly intervaloTardeMin: number;
  /** `HH:MM`. */
  readonly horaInicioManha: string;
  readonly horaInicioTarde: string;
  readonly configuracaoHorarioId: string | null;
  readonly observacao: string | null;
  readonly ativo: boolean;
  /** Os códigos das turmas que usam o regime. */
  readonly turmas: readonly string[];
  /** Alguma turma que o usa já tem lançamento: o relógio não muda mais (`RF-HOR-05`). */
  readonly relogioTravado: boolean;
};

export type ConfiguracaoDoCatalogo = { readonly id: string; readonly nome: string };

export type VigenciaNaTela = {
  readonly codigo: string;
  readonly tipo: string;
  readonly vigenteDe: string;
  readonly vigenteAte: string | null;
  readonly regimeTempos: number;
  readonly taDuracaoMin: number;
  readonly horaInicioManha: string | null;
  readonly horaInicioTarde: string | null;
  readonly limiteDiarioEadHoras: number | null;
};

export type HorariosDoCurso = {
  readonly regimes: readonly RegimeNaTela[];
  readonly configuracoes: readonly ConfiguracaoDoCatalogo[];
  readonly vigencias: readonly VigenciaNaTela[];
  readonly erro: string | null;
};

const hhmm = (t: string | null) => (t === null ? null : t.slice(0, 5));

export async function lerHorariosDoCurso(entrada: {
  readonly cursoId: string;
  /** As turmas do curso, como a página já as leu: o código e o regime de cada uma. */
  readonly turmas: readonly { readonly codigo: string; readonly regimeId: string | null }[];
}): Promise<HorariosDoCurso> {
  const supabase = await criarClienteDeServidor();
  const [regimesRes, configuracoesRes, vigenciasRes] = await Promise.all([
    supabase
      .from("regimes_de_horario")
      .select(
        "id, codigo, nome, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, configuracao_horario_id, observacao, status",
      )
      .eq("curso_id", entrada.cursoId)
      .order("status")
      .order("nome"),
    supabase
      .from("configuracoes_horario")
      .select("id, nome_config")
      .eq("status", "ativo")
      .order("nome_config"),
    supabase
      .from("curso_regime_historico")
      .select(
        "codigo, tipo_regime, vigente_de, vigente_ate, regime_tempos, ta_duracao_min, hora_inicio_manha, hora_inicio_tarde, limite_diario_ead_horas",
      )
      .eq("curso_id", entrada.cursoId)
      .eq("status", "ativo")
      .order("vigente_de", { ascending: false }),
  ]);

  const erro =
    regimesRes.error?.message ?? configuracoesRes.error?.message ?? vigenciasRes.error?.message;
  const regimes = regimesRes.data ?? [];
  const travas = await Promise.all(
    regimes.map((r) =>
      supabase.rpc("regime_de_horario_em_uso", { p_regime: r.id }).then((x) => x.data === true),
    ),
  );

  return {
    erro: erro ?? null,
    regimes: regimes.map((r, i) => ({
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      regimeTempos: Number(r.regime_tempos),
      taDuracaoMin: Number(r.ta_duracao_min),
      intervaloManhaMin: Number(r.intervalo_manha_min),
      intervaloTardeMin: Number(r.intervalo_tarde_min),
      horaInicioManha: hhmm(r.hora_inicio_manha) ?? "",
      horaInicioTarde: hhmm(r.hora_inicio_tarde) ?? "",
      configuracaoHorarioId: r.configuracao_horario_id,
      observacao: r.observacao,
      ativo: r.status === "ativo",
      turmas: entrada.turmas.filter((t) => t.regimeId === r.id).map((t) => t.codigo),
      relogioTravado: travas[i] ?? false,
    })),
    configuracoes: (configuracoesRes.data ?? []).map((c) => ({ id: c.id, nome: c.nome_config })),
    vigencias: (vigenciasRes.data ?? []).map((v) => ({
      codigo: v.codigo,
      tipo: v.tipo_regime,
      vigenteDe: v.vigente_de,
      vigenteAte: v.vigente_ate,
      regimeTempos: Number(v.regime_tempos),
      taDuracaoMin: Number(v.ta_duracao_min),
      horaInicioManha: hhmm(v.hora_inicio_manha),
      horaInicioTarde: hhmm(v.hora_inicio_tarde),
      limiteDiarioEadHoras:
        v.limite_diario_ead_horas === null ? null : Number(v.limite_diario_ead_horas),
    })),
  };
}

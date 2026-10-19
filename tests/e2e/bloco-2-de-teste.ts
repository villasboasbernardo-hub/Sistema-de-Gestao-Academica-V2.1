/**
 * A semente das provas de ponta a ponta do Bloco 2 (spec 017) — TA fora do DSA, arquivamento e painel de turmas.
 *
 * ⚠️ **IDEMPOTENTE, E PROVADA RODANDO DUAS VEZES** (regra 9.1): o curso não é apagável, então ele é reaproveitado; o
 *    resto é apagado e refeito a cada execução. **A turma nasce de novo a cada execução, com `id` novo** — e é isso
 *    que dispensa desarquivar no fim: os eventos de arquivamento e as trocas de situação são só de acréscimo,
 *    imutáveis inclusive para a `service_role`, e ficam presos ao `id` da turma que a limpeza apagou (sem FK).
 * ⚠️ **CÓDIGOS POR PROCESSO DE TRABALHO**: quem chama passa a sigla com o índice do processo, como as outras sementes.
 * ⚠️ **A LIMPEZA CONFERE CADA `delete`**: a que descartava o erro deixava a linha da turma de pé (FK `restrict`) e a
 *    execução seguinte achava a amostra anterior — o modo de falha medido no PR #68 (`apagarLinhasDaTurma`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chaveLocal } from "./conta-de-teste";
import { apagarLinhasDaTurma } from "./dsa-de-teste";

let cliente: SupabaseClient | undefined;
export const bancoDoBloco2 = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export type DisciplinaDaSemente = {
  readonly cod: string;
  readonly nome: string;
  readonly ch: number;
};
export type TurmaDaSemente = {
  /** A chave da turma na semente — vira o rótulo (`T1`) quando `semRotulo` não é pedido. */
  readonly chave: string;
  readonly semRotulo?: boolean;
  readonly ano: number;
  readonly status: "planejada" | "ativa" | "concluida" | "cancelada";
  readonly inicio: string | null;
  readonly termino: string | null;
};
export type AulaDaSemente = {
  readonly sufixo: string;
  readonly turma: string;
  readonly cod: string;
  readonly data: string;
  readonly tempos: number;
  /** `null` = o lançamento histórico, sem posição na grade. */
  readonly taInicial: number | null;
};

export type Bloco2Semeado = {
  readonly sigla: string;
  readonly cursoId: string;
  readonly instrutorId: string;
  /** chave → `{ id, codigo }`. */
  readonly turmas: Readonly<Record<string, { readonly id: string; readonly codigo: string }>>;
  /** cod → id da disciplina. */
  readonly disciplinas: Readonly<Record<string, string>>;
  /** `${chaveDaTurma}|${cod}` → id da linha da turma. */
  readonly linhas: Readonly<Record<string, string>>;
};

function conferir(o: string, error: { message: string } | null): void {
  if (error) throw new Error(`semente do Bloco 2 — ${o}: ${error.message}`);
}

/** O código que o banco gera: `sigla [rótulo] ano` (`FR-025.1` da spec 009). */
export function codigoDaTurma(sigla: string, t: TurmaDaSemente): string {
  return t.semRotulo ? `${sigla} ${t.ano}` : `${sigla} ${t.chave} ${t.ano}`;
}

/** A data `n` dias depois de `iso` (`aaaa-mm-dd`); negativo volta. */
export function maisDias(iso: string, n: number): string {
  const [a, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}

export async function limparBloco2(sigla: string, instrutorCodigo: string): Promise<void> {
  const banco = bancoDoBloco2();
  const { data: curso } = await banco.from("cursos").select("id").eq("codigo", sigla).maybeSingle();
  if (curso) {
    const cursoId = (curso as { id: string }).id;
    const { data: turmas, error } = await banco.from("turmas").select("id").eq("curso_id", cursoId);
    conferir("ler as turmas", error);
    for (const t of (turmas ?? []) as { id: string }[]) {
      conferir(
        "TA fora do DSA",
        (await banco.from("ta_fora_do_dsa").delete().eq("turma_id", t.id)).error,
      );
      conferir("aulas", (await banco.from("registros_aula").delete().eq("turma_id", t.id)).error);
      await apagarLinhasDaTurma(t.id);
      conferir("turma", (await banco.from("turmas").delete().eq("id", t.id)).error);
    }
    conferir("UEs", (await banco.from("unidades_ensino").delete().eq("curso_id", cursoId)).error);
    conferir(
      "disciplinas",
      (await banco.from("disciplinas").delete().eq("curso_id", cursoId)).error,
    );
    // ⚠️ O CURSO FICA — a vigência é só de acréscimo e a FK é `restrict` (regra 9.1).
  }
  conferir(
    "instrutor",
    (await banco.from("instrutores").delete().eq("codigo", instrutorCodigo)).error,
  );
}

export async function semearBloco2(opcoes: {
  readonly sigla: string;
  readonly nome: string;
  readonly disciplinas: readonly DisciplinaDaSemente[];
  readonly turmas: readonly TurmaDaSemente[];
  readonly aulas: readonly AulaDaSemente[];
  readonly instrutorCodigo: string;
}): Promise<Bloco2Semeado> {
  const banco = bancoDoBloco2();
  const { sigla } = opcoes;
  await limparBloco2(sigla, opcoes.instrutorCodigo);

  const { data: existe } = await banco
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  if (!existe) {
    const { error } = await banco.rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: sigla,
        nome_curso: opcoes.nome,
        classificacao: "regular",
        modalidade: "presencial",
        duracao_dias: 300,
      },
      p_regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    conferir(`curso ${sigla}`, error);
  }
  const { data: curso } = await banco.from("cursos").select("id").eq("codigo", sigla).single();
  const cursoId = (curso as { id: string }).id;
  conferir(
    "curso ativo",
    (await banco.from("cursos").update({ status: "ativo" }).eq("id", cursoId)).error,
  );

  const disciplinas: Record<string, string> = {};
  const unidades: Record<string, string> = {};
  for (const d of opcoes.disciplinas) {
    const { data, error } = await banco
      .from("disciplinas")
      .insert({
        codigo: `${sigla}-D-${d.cod}`,
        curso_id: cursoId,
        cod_disciplina: d.cod,
        nome_disciplina: d.nome,
        carga_horaria_tempos: d.ch,
      })
      .select("id")
      .single();
    conferir(`disciplina ${d.cod}`, error);
    disciplinas[d.cod] = (data as { id: string }).id;
    const { data: ue, error: erroUe } = await banco
      .from("unidades_ensino")
      .insert({
        codigo: `${sigla}-UE-${d.cod}`,
        disciplina_id: disciplinas[d.cod],
        curso_id: cursoId,
        numero_ue: 1,
        topico: `Tópico de ${d.cod}`,
        ch_prevista_tempos: d.ch,
      })
      .select("id")
      .single();
    conferir(`UE ${d.cod}`, erroUe);
    unidades[d.cod] = (ue as { id: string }).id;
  }

  const { data: instrutor, error: erroInstrutor } = await banco
    .from("instrutores")
    .insert({
      codigo: opcoes.instrutorCodigo,
      posto_graduacao: "CT",
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor do Bloco 2 ${opcoes.instrutorCodigo}`,
      categoria: "Militar",
      om: "CIAARA",
    })
    .select("id")
    .single();
  conferir("instrutor", erroInstrutor);
  const instrutorId = (instrutor as { id: string }).id;

  /* A turma nasce DEPOIS das disciplinas: o gatilho cria uma linha da turma por disciplina ativa do curso. */
  const turmas: Record<string, { id: string; codigo: string }> = {};
  for (const t of opcoes.turmas) {
    const codigo = codigoDaTurma(sigla, t);
    const { error } = await banco.from("turmas").insert({
      codigo,
      curso_id: cursoId,
      ...(t.semRotulo ? {} : { turma: t.chave }),
      ano_letivo: t.ano,
      status: t.status,
      modalidade: "presencial",
      data_inicio: t.inicio,
      data_termino: t.termino,
    });
    conferir(`turma ${codigo}`, error);
    const { data } = await banco.from("turmas").select("id, codigo").eq("codigo", codigo).single();
    turmas[t.chave] = data as { id: string; codigo: string };
  }

  const linhas: Record<string, string> = {};
  const { data: todas, error: erroLinhas } = await banco
    .from("turma_disciplina")
    .select("id, turma_id, disciplina_id")
    .in(
      "turma_id",
      Object.values(turmas).map((t) => t.id),
    );
  conferir("linhas da turma", erroLinhas);
  for (const [chave, t] of Object.entries(turmas)) {
    for (const [cod, disciplinaId] of Object.entries(disciplinas)) {
      const l = ((todas ?? []) as { id: string; turma_id: string; disciplina_id: string }[]).find(
        (x) => x.turma_id === t.id && x.disciplina_id === disciplinaId,
      );
      if (l) linhas[`${chave}|${cod}`] = l.id;
    }
  }

  for (const a of opcoes.aulas) {
    const turma = turmas[a.turma];
    if (!turma) throw new Error(`semente do Bloco 2 — aula de turma desconhecida: ${a.turma}`);
    const { error } = await banco.from("registros_aula").insert({
      codigo: `${sigla}-A-${a.sufixo}`,
      data: a.data,
      ta_inicial: a.taInicial,
      tempos_consumidos: a.tempos,
      turma_id: turma.id,
      curso_id: cursoId,
      unidade_ensino_id: unidades[a.cod],
      instrutor_id: instrutorId,
    });
    conferir(`aula ${a.sufixo}`, error);
  }

  return { sigla, cursoId, instrutorId, turmas, disciplinas, linhas };
}

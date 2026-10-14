/**
 * A semente dos cards de AEC, TAD e TR (spec 014, PR 2, T065).
 *
 * ⚠️ **SEMENTE PRÓPRIA, E NÃO EXTENSÃO DE `panorama-de-teste.ts` / `cursos-de-teste.ts`** — decisão
 *    registrada em `aprovacoes-pendentes.md` (D2.1): acrescentar turmas àquelas sementes mudaria as
 *    contagens que as suítes delas afirmam. Aqui os cursos são `TET-E2E<processo>-*`, só desta suíte.
 * ⚠️ **IDEMPOTENTE, COM CURSO REAPROVEITADO** (regra 9.1): curso não é apagável; turma, atividade,
 *    previsto e limite saem no `limparTetos`.
 * ⚠️ **AS DATAS SÃO DE MARÇO DE 2026**, e as atividades não têm instrutor — não colidem com grade de
 *    nenhuma outra semente.
 * ⚠️ **A TRILHA DO PREVISTO FICA** (é imutável e não tem FK): o `limparTetos` apaga o previsto, e as
 *    linhas da trilha ficam órfãs, que é o desenho (D1.1.1).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chaveLocal } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export type TetosSemeados = {
  readonly cursoNorma: string;
  readonly cursoCurriculo: string;
  readonly cursoEad: string;
  readonly turmaAcima: string;
  readonly turmaSemPrevisto: string;
  readonly turmaEad: string;
  /** O parâmetro da reserva genérica de TAD foi criado por esta semente (e sai no fim)? */
  readonly criouSugestao: boolean;
};

const MARCA = "semeado pela suite de tetos (spec 014)";

async function curso(
  codigo: string,
  modalidade: "presencial" | "ead",
  ch: number,
): Promise<string> {
  const { data: existe } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();
  let id = existe?.id as string | undefined;
  if (!id) {
    const ead = modalidade === "ead";
    const { data, error } = await admin()
      .rpc("criar_curso_com_regime", {
        p_curso: {
          codigo,
          nome_curso: `Curso ${codigo} de tetos`,
          classificacao: "regular",
          modalidade,
          duracao_dias: 200,
        },
        p_regime: {
          regime_tempos: ead ? 0 : 8,
          ta_duracao_min: ead ? 0 : 45,
          limite_diario_ead_horas: ead ? 4 : null,
          intervalo_manha_min: 10,
          intervalo_tarde_min: 10,
          hora_inicio_manha: "07:30",
          hora_inicio_tarde: "13:30",
          vigente_de: "2020-01-01",
        },
      })
      .single();
    if (error) throw new Error(`falha ao semear o curso ${codigo}: ${error.message}`);
    id = (data as { id: string }).id;
  }
  // ⚠️ A disciplina de amostra é REAPROVEITADA, como o curso: ela não sai por `DELETE` (regra 4).
  const { data: disciplina } = await admin()
    .from("disciplinas")
    .select("id")
    .eq("curso_id", id)
    .eq("cod_disciplina", "TET-01")
    .maybeSingle();
  if (!disciplina) {
    const { error } = await admin()
      .from("disciplinas")
      .insert({
        codigo: `DIS-${codigo}`,
        curso_id: id,
        cod_disciplina: "TET-01",
        nome_disciplina: `Disciplina de tetos de ${codigo}`,
        carga_horaria_tempos: ch,
      });
    if (error) throw new Error(`falha ao semear a disciplina de ${codigo}: ${error.message}`);
  }
  return id;
}

async function turma(cursoId: string, modalidade: string): Promise<{ id: string; codigo: string }> {
  const { data, error } = await admin()
    .from("turmas")
    .insert({
      curso_id: cursoId,
      ano_letivo: 2026,
      status: "ativa",
      modalidade,
      data_inicio: "2026-03-02",
      data_termino: "2026-12-15",
    })
    .select("id, codigo")
    .single();
  if (error) throw new Error(`falha ao semear turma: ${error.message}`);
  return data as { id: string; codigo: string };
}

export async function semearTetos(processo: number): Promise<TetosSemeados> {
  const s = `TET-E2E${processo}`;
  await limparTetos({
    cursoNorma: `${s}-N`,
    cursoCurriculo: `${s}-C`,
    cursoEad: `${s}-E`,
    turmaAcima: "",
    turmaSemPrevisto: "",
    turmaEad: "",
    criouSugestao: false,
  });

  // Pela NORMA: CH 545 → máximo de TAD 27,25 (5 %). Cumprido 29, previsto 25: acima dos dois.
  const norma = await curso(`${s}-N`, "presencial", 545);
  const acima = await turma(norma, "presencial");
  const { data: tipoTad } = await admin()
    .from("config_listas")
    .select("valor")
    .eq("lista", "tipos_atividade")
    .eq("metadados->>categoria", "TAD")
    .eq("ativo", true)
    .limit(1)
    .single();
  const tempos = [12, 12, 5];
  const dias = ["2026-03-03", "2026-03-04", "2026-03-05"];
  const { error: erroAtividade } = await admin()
    .from("atividades_nao_letivas")
    .insert(
      tempos.map((t, i) => ({
        codigo: `${s}-ATV-${i + 1}`,
        categoria_normativa: "TAD",
        subtipo: (tipoTad as { valor: string }).valor,
        escopo: "turma",
        turma_id: acima.id,
        data: dias[i],
        ta_inicial: 1,
        tempos_consumidos: t,
        descricao: `Atividade de tetos ${i + 1}`,
      })),
    );
  if (erroAtividade) throw new Error(`falha ao semear atividades: ${erroAtividade.message}`);
  const { error: erroPrevisto } = await admin()
    .from("previstos_proens_turma")
    .insert({ turma_id: acima.id, categoria: "TAD", tempos_previstos: 25, origem_proens: MARCA });
  if (erroPrevisto) throw new Error(`falha ao semear o previsto: ${erroPrevisto.message}`);

  // Pelo CURRÍCULO: AEC 65 declarado na p. 7; turma sem previsto nenhum.
  const curriculo = await curso(`${s}-C`, "presencial", 600);
  await admin()
    .from("limites_curriculo")
    .insert({
      curso_id: curriculo,
      categoria: "AEC",
      tempos: 65,
      fonte_arquivo: `tet-e2e-${processo}.pdf`,
      fonte_pagina: 7,
    });
  const semPrevisto = await turma(curriculo, "presencial");

  // EAD: sem cards.
  const ead = await curso(`${s}-E`, "ead", 100);
  const turmaEad = await turma(ead, "ead");

  // A sugestão da reserva genérica (só se a base não a tiver — na cópia do remoto ela existe).
  const { data: sugestao } = await admin()
    .from("config_parametros")
    .select("id")
    .eq("chave", "proens.reserva_generica_tad")
    .eq("status", "ativo")
    .maybeSingle();
  let criouSugestao = false;
  if (!sugestao) {
    const { error } = await admin().from("config_parametros").insert({
      chave: "proens.reserva_generica_tad",
      valor: "2",
      tipo: "inteiro",
      unidade: "TA",
      ano_vigencia: 2026,
      descricao: MARCA,
      fundamento_normativo: "PROENS — reserva genérica (semente de teste)",
      natureza: "normativo",
    });
    if (error) throw new Error(`falha ao semear a sugestão: ${error.message}`);
    criouSugestao = true;
  }

  return {
    cursoNorma: `${s}-N`,
    cursoCurriculo: `${s}-C`,
    cursoEad: `${s}-E`,
    turmaAcima: acima.codigo,
    turmaSemPrevisto: semPrevisto.codigo,
    turmaEad: turmaEad.codigo,
    criouSugestao,
  };
}

export async function limparTetos(semeado: TetosSemeados | undefined): Promise<void> {
  if (!semeado) return;
  const { data: cursos } = await admin()
    .from("cursos")
    .select("id")
    .in("codigo", [semeado.cursoNorma, semeado.cursoCurriculo, semeado.cursoEad]);
  const ids = (cursos ?? []).map((c) => c.id as string);
  if (ids.length > 0) {
    const { data: turmas } = await admin().from("turmas").select("id").in("curso_id", ids);
    const idsDeTurma = (turmas ?? []).map((t) => t.id as string);
    if (idsDeTurma.length > 0) {
      await admin().from("atividades_nao_letivas").delete().in("turma_id", idsDeTurma);
      await admin().from("previstos_proens_turma").delete().in("turma_id", idsDeTurma);
      // A grade nasce por gatilho junto com a turma, e a FK é `restrict`: sai antes dela.
      await admin().from("turma_disciplina").delete().in("turma_id", idsDeTurma);
      await admin().from("turmas").delete().in("id", idsDeTurma);
    }
    await admin().from("limites_curriculo").delete().in("curso_id", ids);
  }
  await admin().from("config_parametros").delete().eq("descricao", MARCA);
}

/** O percentual de TAD da norma no banco — lido antes e restaurado depois pela suíte. */
export async function percentualDeTad(): Promise<{ id: string; valor: string } | null> {
  const { data } = await admin()
    .from("config_parametros")
    .select("id, valor")
    .eq("chave", "teto.tad_percentual_chr")
    .eq("status", "ativo")
    .is("ano_vigencia", null)
    .maybeSingle();
  return (data as { id: string; valor: string } | null) ?? null;
}

export async function mudarPercentualDeTad(id: string, valor: string): Promise<void> {
  const { error } = await admin().from("config_parametros").update({ valor }).eq("id", id);
  if (error) throw new Error(`falha ao mudar o percentual: ${error.message}`);
}

/** O previsto gravado no banco, para conferir a gravação e restaurar no fim. */
export async function previstoNoBanco(
  turmaCodigo: string,
  categoria: string,
): Promise<number | null> {
  const { data } = await admin()
    .from("previstos_proens_turma")
    .select("tempos_previstos, turmas!inner(codigo)")
    .eq("turmas.codigo", turmaCodigo)
    .eq("categoria", categoria)
    .eq("status", "ativo")
    .maybeSingle();
  return data ? Number((data as { tempos_previstos: number }).tempos_previstos) : null;
}

"use server";

/**
 * «Parar dia» e «Desfazer» no DSA — `FR-023` a `FR-028.1` da spec 014 (R-1, Q-8, Q-13, Q-14).
 *
 * O DESTINO sai do alcance, da extensão e do Tempo Reserva (R-1):
 *
 * | Alcance | Extensão | Consome TR? | Grava em |
 * |---|---|---|---|
 * | todas as turmas | dia inteiro | não | `feriados` (o calendário; código `FER-` pelo `DEFAULT`) |
 * | todas as turmas | parte do dia | não | `dias_parados` com `turma_id` nulo |
 * | todas as turmas | qualquer | sim | TR global com `bloqueia_aula` (Q-13) |
 * | a turma | qualquer | não | `dias_parados` da turma |
 * | a turma | qualquer | sim | TR da turma com `bloqueia_aula` |
 *
 * ⚠️ **A PERMISSÃO É DO BANCO** (Q-8): a parada de todas as turmas pede `calendario.criar` (Admin e
 *    Encarregado); a da turma, quem lança atividade (Operador incluído). O `42501` vira frase.
 * ⚠️ **COM LANÇAMENTO NO DIA, PEDE CONFIRMAÇÃO** e não grava sem ela — os lançamentos ficam; a parada só
 *    impede aula NOVA (`RN-EVT-04`, emenda D-AA-13).
 * ⚠️ **NADA É APAGADO** (regra 4): desfazer inativa o destino, com a mesma permissão de criar.
 * ⚠️ Zod na primeira linha.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { temposDoDiaDaTurmaNoServidor } from "@/lib/acoes/regime-do-dia";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeDesfazerParada, esquemaDePararDia } from "@/lib/validacao/dia-parado";

export type DestinoDaParada = "feriado" | "dia_parado" | "atividade";

export type ResultadoDaParada =
  | { readonly ok: true; readonly destino: DestinoDaParada; readonly codigo: string }
  | { readonly ok: false; readonly erro: "confirmar"; readonly lancamentosNoDia: number }
  | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO_GLOBAL =
  "O seu perfil não para todas as turmas: isso é do calendário (Encarregado e Admin).";
const SEM_PERMISSAO_TURMA = "O seu perfil não pode parar o dia desta turma.";

function revalidar(): void {
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath("/atividades");
  revalidatePath("/turmas");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath("/inicio");
}

export async function pararDia(entrada: unknown): Promise<ResultadoDaParada> {
  const conferido = esquemaDePararDia.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const p = conferido.data;
  const supabase = await criarClienteDeServidor();
  const global = p.alcance === "todas";
  /*
   * D-COR-5: a parada DA TURMA não grava em turma arquivada. A parada GLOBAL segue — ela é do calendário, e o
   * desenho da M4 declara que o global continua alcançando a arquivada (analyze, achado 67; portão de Bernardo).
   */
  if (!global && p.turmaId !== null) {
    const arquivada = await recusaSeTurmaArquivada(supabase, p.turmaId);
    if (arquivada) return { ok: false, erro: arquivada };
  }

  const [{ data: tipo }, { data: turma }] = await Promise.all([
    supabase
      .from("config_listas")
      .select("valor, metadados, ativo")
      .eq("id", p.tipoParadaId)
      .eq("lista", "tipos_parada")
      .maybeSingle(),
    /* Spec 023 (D-8): sem turma (o «Parar dia» do Calendário), não há o que ler. */
    p.turmaId === null
      ? Promise.resolve({ data: null })
      : supabase.from("turmas").select("id, curso_id").eq("id", p.turmaId).maybeSingle(),
  ]);
  if (!tipo || tipo.ativo === false)
    return { ok: false, erro: "Escolha um tipo de parada da lista." };
  const meta = (tipo.metadados ?? {}) as { pode_global?: boolean; aceita_tr?: boolean };
  if (global && meta.pode_global === false) {
    return { ok: false, erro: `O tipo ${tipo.valor} é só de uma turma; escolha a turma.` };
  }
  if (p.consomeTempoReserva && meta.aceita_tr === false) {
    return { ok: false, erro: `O tipo ${tipo.valor} não consome Tempo Reserva.` };
  }
  if (p.turmaId !== null && !turma) return { ok: false, erro: "Não encontrei a turma." };

  // Os tempos da parada: os informados, ou o dia inteiro do regime quando o TR precisa contar tempos.
  let taInicial = p.diaInteiro ? null : p.taInicial;
  let tempos = p.diaInteiro ? null : p.tempos;
  if (p.consomeTempoReserva && taInicial === null && turma) {
    /* Spec 018 (C-9): o dia inteiro é o do regime da TURMA, senão o do curso, senão 8 (a reserva de antes). */
    const doDia = await temposDoDiaDaTurmaNoServidor(supabase, {
      turmaId: turma.id as string,
      cursoId: turma.curso_id as string,
    });
    taInicial = 1;
    tempos = Math.min(12, Math.max(1, Number(doDia ?? 8)));
  }

  if (!p.confirmado) {
    let consulta = supabase
      .from("vw_ocupacao_ta")
      .select("fato_id", { count: "exact", head: true })
      .eq("data", p.data);
    if (!global && p.turmaId !== null) consulta = consulta.eq("turma_id", p.turmaId);
    const { count } = await consulta;
    if ((count ?? 0) > 0) return { ok: false, erro: "confirmar", lancamentosNoDia: count ?? 0 };
  }

  const sigla = tipo.valor as string;
  let destino: DestinoDaParada;
  let codigo: string;
  let erro: ErroDoBanco | null = null;

  if (p.consomeTempoReserva) {
    destino = "atividade";
    codigo = `DSA-PARADA-${Date.now().toString(36).toUpperCase()}`;
    const r = await supabase.from("atividades_nao_letivas").insert({
      id: randomUUID(),
      codigo,
      categoria_normativa: "TR",
      subtipo: "Tempo Reserva",
      escopo: global ? "global" : "turma",
      turma_id: global ? null : p.turmaId,
      data: p.data,
      ta_inicial: taInicial,
      tempos_consumidos: tempos ?? 1,
      descricao: `${sigla} não prevista — ${p.motivo}`,
      bloqueia_aula: true,
      tipo_parada_id: p.tipoParadaId,
    } as never);
    erro = r.error as ErroDoBanco | null;
  } else if (global && p.diaInteiro) {
    destino = "feriado";
    const id = randomUUID();
    const r = await supabase.from("feriados").insert({
      id,
      ano: Number(p.data.slice(0, 4)),
      data: p.data,
      descricao: `${sigla} — ${p.motivo}`,
      impacto: "dia_inteiro",
      /* Spec 023 (D-16): o tipo vai também na coluna, não só no prefixo do nome. */
      tipo_parada_id: p.tipoParadaId,
    } as never);
    erro = r.error as ErroDoBanco | null;
    const { data: lido } = await supabase
      .from("feriados")
      .select("codigo")
      .eq("id", id)
      .eq("status", "ativo")
      .maybeSingle();
    codigo = (lido?.codigo as string | undefined) ?? id;
  } else {
    destino = "dia_parado";
    const id = randomUUID();
    const r = await supabase.from("dias_parados").insert({
      id,
      turma_id: global ? null : p.turmaId,
      data: p.data,
      ta_inicial: taInicial,
      tempos,
      tipo_parada_id: p.tipoParadaId,
      motivo: p.motivo,
      prevista: p.prevista,
    } as never);
    erro = r.error as ErroDoBanco | null;
    const { data: lido } = await supabase
      .from("dias_parados")
      .select("codigo")
      .eq("id", id)
      .maybeSingle();
    codigo = (lido?.codigo as string | undefined) ?? id;
  }

  if (erro) {
    if (erro.code === "42501")
      return { ok: false, erro: global ? SEM_PERMISSAO_GLOBAL : SEM_PERMISSAO_TURMA };
    return { ok: false, erro: traduzirRecusa(erro) };
  }
  revalidar();
  return { ok: true, destino, codigo };
}

const TABELA_DO_DESTINO = {
  feriado: "feriados",
  dia_parado: "dias_parados",
  atividade: "atividades_nao_letivas",
} as const;

export async function desfazerParada(
  entrada: unknown,
): Promise<{ readonly ok: true } | { readonly ok: false; readonly erro: string }> {
  const conferido = esquemaDeDesfazerParada.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { destino, codigo } = conferido.data;
  const supabase = await criarClienteDeServidor();
  /*
   * D-COR-5: desfazer a parada DA TURMA também é gravar nela; a global segue (como em `pararDia`). O feriado é do
   * calendário e não tem turma.
   */
  if (destino !== "feriado") {
    const { data: alvo, error: erroDoAlvo } = await supabase
      .from(TABELA_DO_DESTINO[destino] as "dias_parados")
      .select("turma_id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (erroDoAlvo) return { ok: false, erro: traduzirRecusa(erroDoAlvo as ErroDoBanco) };
    const turmaDoAlvo = (alvo as { turma_id: string | null } | null)?.turma_id ?? null;
    if (turmaDoAlvo !== null) {
      const arquivada = await recusaSeTurmaArquivada(supabase, turmaDoAlvo);
      if (arquivada) return { ok: false, erro: arquivada };
    }
  }
  const { data, error } = await supabase
    .from(TABELA_DO_DESTINO[destino] as "dias_parados")
    .update({ status: "inativo" } as never)
    .eq("codigo", codigo)
    .select("codigo");
  if (error) return { ok: false, erro: traduzirRecusa(error as ErroDoBanco) };
  if (!data || data.length === 0)
    return { ok: false, erro: "O seu perfil não pode desfazer esta parada." };
  revalidar();
  return { ok: true };
}

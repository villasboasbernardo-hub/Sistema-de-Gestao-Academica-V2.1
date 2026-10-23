"use server";

/**
 * As ações da aba Calendário em Atividades — spec 023 (Bloco 8): FR-009 a FR-011.
 *
 * ⚠️ **A PERMISSÃO É DO BANCO**: `feriados` e `feriado_turma` só aceitam escrita com `calendario.criar`/`editar` (Admin
 *    e Encarregado). O `42501` vira frase.
 * ⚠️ **NADA É APAGADO** (regra 4): inativar a linha e tirar uma turma são `status = 'inativo'`; devolver é `ativo` na
 *    MESMA linha (o par feriado × turma é único).
 * ⚠️ **A LINHA DE TURMAS ESCOLHIDAS NASCE INATIVA E SÓ SE ATIVA DEPOIS DAS LIGAÇÕES**: ativa e sem ligação ela valeria
 *    para TODAS as turmas (D-3) — uma falha no meio bloquearia o dia em todo o sistema.
 * ⚠️ Zod na primeira linha.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDaLinhaDoCalendario, esquemaDaSituacaoDaLinha } from "@/lib/validacao/calendario";

export type RespostaDoCalendario =
  { readonly ok: true; readonly mensagem: string } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "O seu perfil não altera o calendário (Encarregado e Admin).";

function revalidar(): void {
  revalidatePath("/atividades");
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath("/turmas");
  revalidatePath("/inicio");
  revalidatePath("/avisos");
}

function recusa(erro: ErroDoBanco): RespostaDoCalendario {
  return { ok: false, erro: erro.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(erro) };
}

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

/** Quantos lançamentos há no dia, nas turmas que a linha alcança (todas, quando `turmas` é vazia). */
async function lancamentosNoDia(
  supabase: Cliente,
  data: string,
  turmas: readonly string[],
): Promise<number> {
  let consulta = supabase
    .from("vw_ocupacao_ta")
    .select("fato_id", { count: "exact", head: true })
    .eq("data", data);
  if (turmas.length > 0) consulta = consulta.in("turma_id", [...turmas]);
  const { count } = await consulta;
  return count ?? 0;
}

const avisoDeLancamentos = (n: number) =>
  n > 0
    ? ` Há ${n} lançamento${n === 1 ? "" : "s"} neste dia; ele${n === 1 ? " fica" : "s ficam"}, e o dia passa a recusar aula nova.`
    : "";

/** Põe as ligações da linha no conjunto pedido: acrescenta, devolve e tira — nunca apaga. */
async function ajustarTurmas(
  supabase: Cliente,
  feriadoId: string,
  pedidas: readonly string[],
): Promise<ErroDoBanco | null> {
  const { data: atuais, error } = await supabase
    .from("feriado_turma")
    .select("id, turma_id, status")
    .eq("feriado_id", feriadoId);
  if (error) return error as ErroDoBanco;
  const porTurma = new Map((atuais ?? []).map((l) => [l.turma_id as string, l]));
  const novas = pedidas.filter((t) => !porTurma.has(t));
  const devolver = (atuais ?? [])
    .filter((l) => pedidas.includes(l.turma_id as string) && l.status !== "ativo")
    .map((l) => l.id as string);
  const tirar = (atuais ?? [])
    .filter((l) => !pedidas.includes(l.turma_id as string) && l.status === "ativo")
    .map((l) => l.id as string);
  /* Primeiro o que entra, depois o que sai: o estado do meio é um superconjunto, nunca "todas as turmas". */
  if (novas.length > 0) {
    const r = await supabase
      .from("feriado_turma")
      .insert(novas.map((turma_id) => ({ feriado_id: feriadoId, turma_id })) as never);
    if (r.error) return r.error as ErroDoBanco;
  }
  if (devolver.length > 0) {
    const r = await supabase
      .from("feriado_turma")
      .update({ status: "ativo" } as never)
      .in("id", devolver);
    if (r.error) return r.error as ErroDoBanco;
  }
  if (tirar.length > 0) {
    const r = await supabase
      .from("feriado_turma")
      .update({ status: "inativo" } as never)
      .in("id", tirar);
    if (r.error) return r.error as ErroDoBanco;
  }
  return null;
}

/** Cadastrar (sem `id`) ou editar (com `id`) uma linha do calendário — FR-009 e FR-010. */
export async function gravarLinhaDoCalendario(entrada: unknown): Promise<RespostaDoCalendario> {
  const conferido = esquemaDaLinhaDoCalendario.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const l = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { data: tipo } = await supabase
    .from("config_listas")
    .select("valor, metadados, ativo")
    .eq("id", l.tipoParadaId)
    .eq("lista", "tipos_parada")
    .maybeSingle();
  const meta = (tipo?.metadados ?? {}) as { pode_global?: boolean };
  if (!tipo || tipo.ativo === false || meta.pode_global === false) {
    return {
      ok: false,
      erro: "Escolha um tipo da lista (feriado, licença, recesso ou ponto facultativo).",
    };
  }

  const turmas = l.abrangencia === "turmas" ? l.turmas : [];
  const campos = {
    ano: Number(l.data.slice(0, 4)),
    data: l.data,
    descricao: l.descricao,
    impacto: l.impacto,
    tipo_parada_id: l.tipoParadaId,
  };

  let feriadoId: string;
  let ativa = true;
  if (l.id === null) {
    feriadoId = randomUUID();
    /* Com turmas escolhidas, nasce inativa e só se ativa depois das ligações (cabeçalho). */
    const r = await supabase.from("feriados").insert({
      id: feriadoId,
      ...campos,
      status: turmas.length > 0 ? "inativo" : "ativo",
    } as never);
    if (r.error) return recusa(r.error as ErroDoBanco);
  } else {
    feriadoId = l.id;
    const r = await supabase
      .from("feriados")
      .update(campos as never)
      .eq("id", feriadoId)
      .select("status");
    if (r.error) return recusa(r.error as ErroDoBanco);
    if (!r.data || r.data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
    ativa = (r.data[0] as { status: string }).status === "ativo";
  }

  const erroDasTurmas = await ajustarTurmas(supabase, feriadoId, turmas);
  if (erroDasTurmas) {
    revalidar();
    const base = recusa(erroDasTurmas);
    return l.id === null && turmas.length > 0 && !base.ok
      ? { ok: false, erro: `${base.erro} A linha ficou inativa; corrija as turmas e ative-a.` }
      : base;
  }

  if (l.id === null && turmas.length > 0) {
    const r = await supabase
      .from("feriados")
      .update({ status: "ativo" } as never)
      .eq("id", feriadoId);
    if (r.error) return recusa(r.error as ErroDoBanco);
  }

  revalidar();
  /* D-18: a linha de dia inteiro ativa que cai sobre dia com lançamento diz quantos ficaram. */
  const n =
    ativa && l.impacto === "dia_inteiro" ? await lancamentosNoDia(supabase, l.data, turmas) : 0;
  return {
    ok: true,
    mensagem: `${l.id === null ? "Linha cadastrada" : "Linha alterada"} no calendário.${avisoDeLancamentos(n)}`,
  };
}

/** Inativar ou reativar uma linha — FR-011. Nunca apaga. */
export async function mudarSituacaoDaLinha(entrada: unknown): Promise<RespostaDoCalendario> {
  const conferido = esquemaDaSituacaoDaLinha.safeParse(entrada);
  if (!conferido.success) return { ok: false, erro: "Dados inválidos." };
  const { id, situacao } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const r = await supabase
    .from("feriados")
    .update({ status: situacao } as never)
    .eq("id", id)
    .select("data, impacto, feriado_turma(turma_id, status)");
  if (r.error) return recusa(r.error as ErroDoBanco);
  if (!r.data || r.data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
  revalidar();
  if (situacao === "inativo")
    return { ok: true, mensagem: "Linha inativada: o dia está liberado." };
  const linha = r.data[0] as unknown as {
    data: string;
    impacto: string;
    feriado_turma: { turma_id: string; status: string }[] | null;
  };
  const turmas = (linha.feriado_turma ?? [])
    .filter((t) => t.status === "ativo")
    .map((t) => t.turma_id);
  const n =
    linha.impacto === "dia_inteiro" ? await lancamentosNoDia(supabase, linha.data, turmas) : 0;
  return { ok: true, mensagem: `Linha reativada.${avisoDeLancamentos(n)}` };
}

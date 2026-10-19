"use server";

/**
 * `registrarTaForaDoDsa` e `desfazerTaForaDoDsa` — D-COR-3 (spec 017, FR-001).
 *
 * > *"TA fora do DSA, com observação (…) com quantidade, disciplina, instrutor quando houver e observação
 * > obrigatória (…) Só o Encarregado da Divisão, os ajudantes e o Admin registram."* — D-COR-3, Bernardo Villas Boas,
 * > 16/10/2026
 *
 * ⚠️ **A PERMISSÃO É DO BANCO**: o recurso `ta_fora_do_dsa`/`editar` (Admin, Encarregado e Ajudante da Administração
 *    Acadêmica) na policy. O Operador recebe `42501` no `INSERT` e zero linhas no `UPDATE`; as duas viram a mesma
 *    frase. O botão da tela segue a mesma permissão, mas não é a proteção.
 * ⚠️ **A LINHA DA TURMA DECIDE TURMA E DISCIPLINA**: a ação as lê da linha (e o gatilho confere), e o código da turma
 *    que veio do formulário tem de ser o da linha — senão é recusa, não gravação na turma errada.
 * ⚠️ **GERA O `id` E NÃO PEDE A LINHA DE VOLTA** (gotcha 4.1). **Desfazer** é `status = inativo`; o resto não muda (o
 *    gatilho recusa com `ta_fora_so_desfaz`).
 * ⚠️ **A TURMA ARQUIVADA NÃO RECEBE** (D-COR-5): `recusaSeTurmaArquivada`, antes de tudo que grava.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaTurma, enderecoDaTurmaGravada } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeDesfazerTaForaDoDsa, esquemaDoTaForaDoDsa } from "@/lib/validacao/ta-fora-do-dsa";

export type ResultadoDoTaForaDoDsa =
  { readonly ok: true; readonly destino: string } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO =
  "O seu perfil não registra TA fora do DSA. Quem registra é o Admin, o Encarregado ou o Ajudante da Administração Acadêmica.";

const falha = (erro: string): ResultadoDoTaForaDoDsa => ({ ok: false, erro });

function revalidarTelas(turmaCodigo: string): void {
  revalidatePath(enderecoDaTurma(turmaCodigo));
  revalidatePath("/turmas");
  revalidatePath("/inicio");
}

export async function registrarTaForaDoDsa(entrada: unknown): Promise<ResultadoDoTaForaDoDsa> {
  const conferido = esquemaDoTaForaDoDsa(hojeNaCiaara()).safeParse(entrada);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");
  const { turmaCodigo, turmaDisciplinaId, data, tempos, instrutorId, observacao } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: linha, error: erroLinha } = await supabase
    .from("turma_disciplina")
    .select("id, turma_id, disciplina_id, turmas!inner(codigo)")
    .eq("id", turmaDisciplinaId)
    .maybeSingle();
  if (erroLinha) return falha(traduzirRecusa(erroLinha as ErroDoBanco));
  const turma = (linha as { turmas?: { codigo?: string } } | null)?.turmas;
  if (!linha || turma?.codigo !== turmaCodigo) {
    return falha("A disciplina não é desta turma, ou o seu perfil não a alcança.");
  }
  const { turma_id: turmaId, disciplina_id: disciplinaId } = linha as {
    turma_id: string;
    disciplina_id: string;
  };

  const arquivada = await recusaSeTurmaArquivada(supabase, turmaId);
  if (arquivada) return falha(arquivada);

  const { error } = await supabase.from("ta_fora_do_dsa").insert({
    id: randomUUID(),
    turma_disciplina_id: turmaDisciplinaId,
    turma_id: turmaId,
    disciplina_id: disciplinaId,
    data,
    tempos,
    instrutor_id: instrutorId,
    observacao,
  });
  if (error)
    return falha(error.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(error as ErroDoBanco));

  revalidarTelas(turmaCodigo);
  return { ok: true, destino: enderecoDaTurmaGravada(turmaCodigo, "ta-fora") };
}

export async function desfazerTaForaDoDsa(entrada: unknown): Promise<ResultadoDoTaForaDoDsa> {
  const conferido = esquemaDeDesfazerTaForaDoDsa.safeParse(entrada);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");
  const { turmaCodigo, codigo } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: registro, error: erroLeitura } = await supabase
    .from("ta_fora_do_dsa")
    .select("turma_id")
    .eq("codigo", codigo)
    .maybeSingle();
  if (erroLeitura) return falha(traduzirRecusa(erroLeitura as ErroDoBanco));
  if (!registro) return falha("O registro não existe mais, ou o seu perfil não o alcança.");

  const arquivada = await recusaSeTurmaArquivada(
    supabase,
    (registro as { turma_id: string }).turma_id,
  );
  if (arquivada) return falha(arquivada);

  const { data, error } = await supabase
    .from("ta_fora_do_dsa")
    .update({ status: "inativo" })
    .eq("codigo", codigo)
    .eq("status", "ativo")
    .select("id");
  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  if (!data || data.length === 0) return falha(SEM_PERMISSAO);

  revalidarTelas(turmaCodigo);
  return { ok: true, destino: enderecoDaTurmaGravada(turmaCodigo, "ta-fora-desfeito") };
}

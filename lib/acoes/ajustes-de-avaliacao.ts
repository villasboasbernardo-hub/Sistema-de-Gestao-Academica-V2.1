"use server";

/**
 * O ajuste MANUAL da situação e das datas de uma avaliação da turma (Bloco 16, spec 031, ajuste D de 31/10/2026).
 *
 * > *"Ícone Editar por linha (diálogo): situação (…), data de aplicação e data da vista, com JUSTIFICATIVA OBRIGATÓRIA
 * > (mín. 10 caracteres), gravando autor e data num histórico visível na linha. Edita quem lança o DSA da turma. A edição
 * > manual NÃO muda a CH."* — Bernardo Villas Boas, 31/10/2026
 *
 * ⚠️ **SÓ ACRESCENTA**: cada ajuste é uma linha nova de `ajustes_de_avaliacao`; o mais recente vale, os anteriores são o
 *    histórico. O autor é carimbado pelo banco, pela sessão.
 * ⚠️ **A PERMISSÃO É DO BANCO** (`registros_aula.criar` + alcance + turma em oferta, pela policy); a recusa chega como
 *    `42501` e vira a frase. A turma arquivada é recusada antes (D-COR-5).
 * ⚠️ Gera o `id` antes e não usa `RETURNING` (gotcha 4.1).
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDoAjusteDeAvaliacao } from "@/lib/validacao/ajuste-de-avaliacao";

export type ResultadoDoAjuste =
  { readonly ok: true } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "Só quem lança o DSA desta turma ajusta a situação das avaliações.";

export async function ajustarAvaliacao(entrada: unknown): Promise<ResultadoDoAjuste> {
  const conferido = esquemaDoAjusteDeAvaliacao.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const a = conferido.data;
  const supabase = await criarClienteDeServidor();
  const arquivada = await recusaSeTurmaArquivada(supabase, a.turmaId);
  if (arquivada) return { ok: false, erro: arquivada };

  const { error } = await supabase.from("ajustes_de_avaliacao").insert({
    id: randomUUID(),
    turma_id: a.turmaId,
    avaliacao_curriculo_id: a.avaliacaoCurriculoId,
    avaliacao_id: a.avaliacaoId,
    situacao: a.situacao,
    data_aplicacao: a.dataAplicacao,
    data_vista: a.dataVista,
    justificativa: a.justificativa,
  });
  if (error) {
    return {
      ok: false,
      erro: error.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(error as ErroDoBanco),
    };
  }
  revalidatePath("/turmas", "layout");
  return { ok: true };
}

/**
 * A leitura das AEC PREVISTAS de um currículo — Bloco 18 (spec 033), RA-2 e FR-002: *Editar curso → Currículo →
 * Atividades e limites* (todas, para editar) e a página do curso, aba *Atividades* e consulta da aba *Currículo* (só as
 * ativas, para ler).
 *
 * ⚠️ **UM LEITOR SÓ PARA AS DUAS TELAS** — a mesma consulta e a mesma tradução (`aecPrevistaDoBanco`), para a edição e a
 *    consulta não divergirem no que mostram.
 * ⚠️ **ERRO DE LEITURA NÃO VIRA LISTA VAZIA EM SILÊNCIO** (gotcha 4, `RN-DEG-01`): volta em `erro`, e a tela diz que não
 *    leu — *"não foi possível ler"* não é *"não há"*.
 * ⚠️ **NA TURMA, A LEITURA É OUTRA** (`app/(app)/atividades/leitura-do-planejado.ts`): lá entram os lançamentos e as
 *    marcações; aqui, só o que o currículo diz.
 */
import "server-only";

import {
  aecPrevistaDoBanco,
  emOrdemDoCurriculo,
  type AecPrevistaDoCurriculo,
  type LinhaDaAecPrevistaNoBanco,
} from "@/lib/dominio/atividades/aec-previstas-no-curriculo";
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type AecPrevistasLidas = {
  readonly lista: readonly AecPrevistaDoCurriculo[];
  /** A frase da falha de leitura, ou `null` quando leu. */
  readonly erro: string | null;
};

export const FRASE_DA_FALHA_DAS_AEC_PREVISTAS =
  "Não foi possível ler as AEC previstas do currículo agora. Recarregue a página; se persistir, procure o suporte.";

const COLUNAS =
  "id, codigo, nome, tipo_atividade_id, ta_previstos, obrigatoria, ordem, fonte_arquivo, fonte_pagina, observacao, status, tipo:config_listas!aec_previstas_curriculo_tipo_atividade_id_fkey(valor, rotulo_exibicao), disciplina:disciplinas!aec_previstas_curriculo_disciplina_id_fkey(id, cod_disciplina, nome_disciplina)";

/** As AEC previstas do currículo, na ordem dele — todas (`soAtivas: false`, a edição) ou só as ativas (a consulta). */
export async function lerAecPrevistasDoCurriculo(
  curriculoId: string,
  soAtivas: boolean,
): Promise<AecPrevistasLidas> {
  const supabase = await criarClienteDeServidor();
  const doCurriculo = supabase
    .from("aec_previstas_curriculo")
    .select(COLUNAS)
    .eq("curriculo_id", curriculoId);
  const { data, error } = await (soAtivas ? doCurriculo.eq("status", "ativo") : doCurriculo)
    .order("ordem")
    .order("nome");
  if (error) return { lista: [], erro: FRASE_DA_FALHA_DAS_AEC_PREVISTAS };
  return {
    lista: emOrdemDoCurriculo(
      ((data ?? []) as unknown as LinhaDaAecPrevistaNoBanco[]).map(aecPrevistaDoBanco),
    ),
    erro: null,
  };
}

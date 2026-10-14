"use server";

/**
 * `gravarPrevistoProens` — o previsto do PROENS de uma turma (`FR-008.1` a `FR-008.3` da spec 014).
 *
 * ⚠️ **GRAVA E AVISA, NUNCA RECUSA POR TETO** (`FR-008.3`, `RN-DEG-02`): o previsto acima do limite
 *    máximo é aceito e volta com `aviso: "acima_do_limite_maximo"`. O máximo é decidido por
 *    `limiteMaximo`, o mesmo dos cards — nenhum segundo cálculo aqui.
 * ⚠️ **A PERMISSÃO É DO BANCO**: `previsto_proens.editar` (Admin, Encarregado e Ajudante) e
 *    `alcanca_turma`. O Operador recebe `42501` no `INSERT` e zero linhas no `UPDATE` — as duas viram a
 *    mesma frase de recusa. O botão da tela segue a mesma permissão, mas não é a proteção.
 * ⚠️ **GERA O `id` ANTES E LÊ EM COMANDO SEPARADO** (gotcha 4.1): `INSERT … RETURNING` passa pela policy
 *    de leitura, que resolve o alcance por função `STABLE` e não enxerga a linha recém-inserida.
 * ⚠️ A trilha (`previstos_proens_alteracoes`) é escrita pelo gatilho do banco, nunca por aqui.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { limiteMaximo } from "@/lib/dominio/limite-maximo";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDoPrevistoProens } from "@/lib/validacao/previsto-proens";

export type ResultadoDoPrevisto =
  | {
      readonly ok: true;
      readonly aviso?: "acima_do_limite_maximo";
      readonly alteradoPor: string;
      readonly alteradoEm: string;
    }
  | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO = "O seu perfil não pode editar o previsto do PROENS desta turma.";

export async function gravarPrevistoProens(entrada: unknown): Promise<ResultadoDoPrevisto> {
  const conferido = esquemaDoPrevistoProens.safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { turmaId, categoria, tempos, origemProens } = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { data: existente, error: erroLeitura } = await supabase
    .from("previstos_proens_turma")
    .select("id")
    .eq("turma_id", turmaId)
    .eq("categoria", categoria)
    .eq("status", "ativo")
    .maybeSingle();
  if (erroLeitura) return { ok: false, erro: traduzirRecusa(erroLeitura as ErroDoBanco) };

  let id: string;
  if (existente) {
    id = existente.id;
    const { data, error } = await supabase
      .from("previstos_proens_turma")
      .update({
        tempos_previstos: tempos,
        ...(origemProens ? { origem_proens: origemProens } : {}),
      })
      .eq("id", id)
      .select("id");
    if (error) return { ok: false, erro: traduzirRecusa(error as ErroDoBanco) };
    if (!data || data.length === 0) return { ok: false, erro: SEM_PERMISSAO };
  } else {
    id = randomUUID();
    const { error } = await supabase.from("previstos_proens_turma").insert({
      id,
      turma_id: turmaId,
      categoria,
      tempos_previstos: tempos,
      origem_proens: origemProens ?? null,
    });
    if (error) {
      return {
        ok: false,
        erro: error.code === "42501" ? SEM_PERMISSAO : traduzirRecusa(error as ErroDoBanco),
      };
    }
  }

  // Comando separado: retrato novo, com a auditoria que o gatilho gravou.
  const [{ data: gravado }, { data: tetos }] = await Promise.all([
    supabase
      .from("previstos_proens_turma")
      .select("criado_por, criado_em, editado_por, editado_em")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("vw_conformidade_tetos")
      .select("limite_declarado, ch_curricular, percentual_norma")
      .eq("turma_id", turmaId)
      .eq("categoria", categoria)
      .maybeSingle(),
  ]);

  const autorId = gravado?.editado_por ?? gravado?.criado_por ?? null;
  const alteradoEm = gravado?.editado_em ?? gravado?.criado_em ?? new Date().toISOString();
  let alteradoPor = "—";
  if (autorId) {
    const { data: autor } = await supabase
      .from("usuarios")
      .select("nome_exibicao, nome")
      .eq("auth_user_id", autorId)
      .maybeSingle();
    alteradoPor = autor?.nome_exibicao || autor?.nome || "outra conta";
  }

  const maximo = limiteMaximo({
    declarado: tetos?.limite_declarado ?? null,
    chCurricular: tetos?.ch_curricular ?? null,
    percentual: tetos?.percentual_norma ?? null,
  });

  revalidatePath("/turmas", "layout");
  revalidatePath("/inicio");

  return {
    ok: true,
    ...(typeof maximo === "object" && tempos > maximo.valor
      ? { aviso: "acima_do_limite_maximo" as const }
      : {}),
    alteradoPor,
    alteradoEm,
  };
}

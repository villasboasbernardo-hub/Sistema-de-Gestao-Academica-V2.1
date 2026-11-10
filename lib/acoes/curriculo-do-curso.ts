/**
 * Ajudantes das Server Actions do currículo — spec 021 (Bloco 6) e, desde o Bloco 18 (spec 033, FR-002), também das AEC
 * previstas (`lib/acoes/aec-previstas.ts`).
 *
 * ⚠️ **SEM `"use server"`, E É DE PROPÓSITO**: num arquivo de ações, toda função exportada vira endpoint HTTP de fato
 *    (`GUARDA-ACAO`). `curriculoDoCurso` só servia às ações de `curriculo.ts` e passou a servir também às das AEC
 *    previstas — exportá-la de lá a abriria como ação sem tela; daqui, ela é só ajudante do servidor (como
 *    `justificativa.ts`), e nenhum componente a importa.
 * ⚠️ **A LEITURA É COM A SESSÃO** (RLS): `null` quer dizer que a sessão não alcança o curso ou o currículo — quem chama
 *    responde com `recusaPorAlcance`.
 */
import "server-only";

import { revalidatePath } from "next/cache";

import { criarClienteDeServidor } from "@/lib/supabase/server";

/** O curso pela sigla e o currículo pelo número — `null` quando a sessão não alcança. */
export async function curriculoDoCurso(
  sigla: string,
  versao: number,
): Promise<{ readonly cursoId: string; readonly curriculoId: string } | null> {
  const supabase = await criarClienteDeServidor();
  const { data } = await supabase
    .from("curriculos")
    .select("id, curso_id, cursos!curriculos_curso_id_fkey!inner(codigo)")
    .eq("cursos.codigo", sigla)
    .eq("versao", versao)
    .maybeSingle();
  if (!data) return null;
  return { cursoId: data.curso_id as string, curriculoId: data.id as string };
}

/** As telas que mostram o currículo do curso: o catálogo, a página do curso, *Editar curso* e as turmas. */
export function revalidarCurriculoDoCurso(sigla: string): void {
  revalidatePath("/cursos");
  revalidatePath(`/cursos/${sigla}`);
  revalidatePath("/cursos/[curso]", "page");
  revalidatePath("/cursos/[curso]/editar", "page");
  revalidatePath("/turmas", "layout");
}

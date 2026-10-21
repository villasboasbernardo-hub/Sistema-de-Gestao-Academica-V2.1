"use server";

/**
 * Server Actions do currículo — spec 021, Bloco 6 (RC-1 a RC-12, Bernardo Villas Boas, 21/10/2026).
 *
 * ⚠️ **SERVER ACTION É ENDPOINT HTTP DE FATO.** `safeParse` na primeira linha de cada uma.
 * ⚠️ **NENHUMA USA `service_role`.** Quem decide é o banco: a cópia e o arquivamento são funções com porteiro
 *    (`public.criar_curriculo`, `public.arquivar_curriculo`), a edição passa pela policy `curriculos_editar` e, no
 *    currículo seguido por turma com lançamento, pelo gatilho da correção (RC-6), que exige a justificativa.
 * ⚠️ **"HOJE" É O DE SÃO PAULO, mandado daqui** (`hojeNaCiaara()`, D20): o banco não lê relógio.
 * ⚠️ **ZERO LINHAS É RECUSA**, não sucesso vazio (gotcha 4 do lado da escrita).
 */
import { revalidatePath } from "next/cache";

import { comJustificativa, pedeJustificativa } from "@/lib/acoes/justificativa";
import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { BALDE_DE_CURRICULOS } from "@/lib/dominio/curriculo-em-pdf";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaRetiradaDoLimite,
  esquemaDeEdicaoDoCurriculo,
  esquemaDeNovoCurriculo,
  esquemaDoArquivamentoDoCurriculo,
  esquemaDoLimiteDoCurriculo,
  esquemaDoPdfDoCurriculo,
} from "@/lib/validacao/curriculo";

export type ResultadoDoCurriculo =
  | { readonly ok: true; readonly versao: number }
  | {
      readonly ok: false;
      readonly erro: string;
      /** RC-6: o banco pediu a justificativa — a tela a pergunta e manda de novo. */
      readonly pedeJustificativa?: true | undefined;
    };

const falha = (erro: string): ResultadoDoCurriculo => ({ ok: false, erro });

function falhaDoBanco(error: ErroDoBanco): ResultadoDoCurriculo {
  return pedeJustificativa(error)
    ? { ok: false, erro: traduzirRecusa(error), pedeJustificativa: true }
    : { ok: false, erro: traduzirRecusa(error) };
}

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

function revalidar(sigla: string): void {
  revalidatePath("/cursos");
  revalidatePath(`/cursos/${sigla}`);
  revalidatePath("/cursos/[curso]", "page");
  revalidatePath("/cursos/[curso]/editar", "page");
  revalidatePath("/turmas", "layout");
}

/** O curso pela sigla e o currículo pelo número — `null` quando a sessão não alcança. */
async function curriculoDoCurso(
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

/** RC-7 — o currículo novo, cópia do vigente hoje. Devolve o número dele ("Currículo N"). */
export async function criarCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDeNovoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const { sigla, vigenteDe, descricao } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const { data: curso } = await supabase
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .maybeSingle();
  if (!curso) return falha(recusaPorAlcance());

  const { data: id, error } = await supabase.rpc("criar_curriculo", {
    p_curso_id: curso.id as string,
    p_vigente_de: vigenteDe,
    p_descricao: descricao ?? "",
    p_hoje: hojeNaCiaara(),
  });
  if (error) return falhaDoBanco(error as ErroDoBanco);

  const { data: novo } = await supabase
    .from("curriculos")
    .select("versao")
    .eq("id", id as string)
    .maybeSingle();
  revalidar(sigla);
  return { ok: true, versao: Number(novo?.versao ?? 0) };
}

/** RC-5 — edita o currículo escolhido. No currículo em uso, a mudança é correção (RC-6): justificativa. */
export async function editarCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDeEdicaoDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const c = conferido.data;

  const alvo = await curriculoDoCurso(c.sigla, c.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { data, error } = await comJustificativa(
    supabase
      .from("curriculos")
      .update({
        vigente_de: c.vigenteDe,
        descricao: c.descricao,
        proposito: c.proposito,
        duracao_dias: c.duracaoDias,
        duracao_semanas: c.duracaoSemanas,
      })
      .eq("id", alvo.curriculoId)
      .select("versao"),
    c.justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());

  revalidar(c.sigla);
  return { ok: true, versao: c.versao };
}

/** RC-10 — arquivar o currículo passado (o banco confere: passado, e todas as turmas arquivadas). */
export async function arquivarCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDoArquivamentoDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const alvo = await curriculoDoCurso(conferido.data.sigla, conferido.data.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("arquivar_curriculo", {
    p_curriculo_id: alvo.curriculoId,
    p_hoje: hojeNaCiaara(),
  });
  if (error) return falhaDoBanco(error as ErroDoBanco);
  revalidar(conferido.data.sigla);
  return { ok: true, versao: conferido.data.versao };
}

/**
 * D-19 e D-36 — descartar o currículo criado por engano: exclusão lógica (`status = 'inativo'`), nada é apagado
 * (regra 4). O banco recusa o que alguma turma segue (`versao_em_uso`); a policy `curriculos_editar` decide quem.
 */
export async function descartarCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDoArquivamentoDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const alvo = await curriculoDoCurso(conferido.data.sigla, conferido.data.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("curriculos")
    .update({ status: "inativo" })
    .eq("id", alvo.curriculoId)
    .select("versao");
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());
  revalidar(conferido.data.sigla);
  return { ok: true, versao: conferido.data.versao };
}

/** RC-10 e D-28 — desarquivar devolve o currículo ao seletor. */
export async function desarquivarCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDoArquivamentoDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const alvo = await curriculoDoCurso(conferido.data.sigla, conferido.data.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("desarquivar_curriculo", {
    p_curriculo_id: alvo.curriculoId,
  });
  if (error) return falhaDoBanco(error as ErroDoBanco);
  revalidar(conferido.data.sigla);
  return { ok: true, versao: conferido.data.versao };
}

/**
 * RC-11 — registra o PDF que o navegador acabou de carregar para o currículo.
 *
 * ⚠️ **O ARQUIVO NÃO PASSA POR AQUI** (a Vercel corta o corpo de uma função em 4,5 MB, gotcha 14): o PDF sobe do
 *    navegador direto ao Storage, num caminho novo do currículo, e esta ação confere que ele chegou e aponta o
 *    currículo para ele. No currículo em uso, trocar o PDF é correção (RC-6) — e a trilha guarda o caminho anterior.
 */
export async function registrarPdfDoCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDoPdfDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const { sigla, versao, caminho, justificativa } = conferido.data;

  const alvo = await curriculoDoCurso(sigla, versao);
  if (!alvo) return falha(recusaPorAlcance());
  if (!caminho.startsWith(`${alvo.cursoId}/${alvo.curriculoId}/`)) {
    return falha("O PDF não é deste currículo.");
  }

  const supabase = await criarClienteDeServidor();
  const pasta = `${alvo.cursoId}/${alvo.curriculoId}`;
  const arquivo = caminho.slice(pasta.length + 1);
  const { data: objetos, error: erroDaLista } = await supabase.storage
    .from(BALDE_DE_CURRICULOS)
    .list(pasta, { search: arquivo });
  if (erroDaLista || !(objetos ?? []).some((o) => o.name === arquivo)) {
    return falha(
      "O PDF não chegou ao armazenamento. Carregue de novo; se persistir, procure o suporte.",
    );
  }

  const { data, error } = await comJustificativa(
    supabase
      .from("curriculos")
      .update({ pdf_caminho: caminho, pdf_carregado_em: new Date().toISOString() })
      .eq("id", alvo.curriculoId)
      .select("versao"),
    justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());

  revalidar(sigla);
  return { ok: true, versao };
}

/**
 * Ajuste 3 (conferência do PR #82): grava o LIMITE de AEC, TAD ou TR do currículo — atualiza o declarado, ou declara o
 * que não havia. No currículo em uso, mudar o limite que já tinha valor é correção (RC-6): o banco pede a justificativa.
 * ⚠️ ZERO LINHAS É RECUSA (a policy `limites_curriculo_editar` é `cursos.editar`, alcance e curso em oferta).
 */
export async function salvarLimiteDoCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDoLimiteDoCurriculo.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const l = conferido.data;
  const alvo = await curriculoDoCurso(l.sigla, l.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { data: atual } = await supabase
    .from("limites_curriculo")
    .select("id")
    .eq("curriculo_id", alvo.curriculoId)
    .eq("categoria", l.categoria)
    .eq("status", "ativo")
    .maybeSingle();
  const valores = { tempos: l.tempos, fonte_arquivo: l.fonteArquivo, fonte_pagina: l.fontePagina };
  const { data, error } = atual
    ? await comJustificativa(
        supabase
          .from("limites_curriculo")
          .update(valores)
          .eq("id", atual.id as string)
          .select("id"),
        l.justificativa,
      )
    : await comJustificativa(
        supabase
          .from("limites_curriculo")
          .insert({
            ...valores,
            curso_id: alvo.cursoId,
            curriculo_id: alvo.curriculoId,
            categoria: l.categoria,
          })
          .select("id"),
        l.justificativa,
      );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());
  revalidar(l.sigla);
  return { ok: true, versao: l.versao };
}

/** Ajuste 3: retira o limite declarado (exclusão lógica): a categoria volta ao percentual da norma. RC-6 no em uso. */
export async function retirarLimiteDoCurriculo(entrada: unknown): Promise<ResultadoDoCurriculo> {
  const conferido = esquemaDaRetiradaDoLimite.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const l = conferido.data;
  const alvo = await curriculoDoCurso(l.sigla, l.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { data, error } = await comJustificativa(
    supabase
      .from("limites_curriculo")
      .update({ status: "inativo" })
      .eq("curriculo_id", alvo.curriculoId)
      .eq("categoria", l.categoria)
      .eq("status", "ativo")
      .select("id"),
    l.justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());
  revalidar(l.sigla);
  return { ok: true, versao: l.versao };
}

"use server";

/**
 * A APOINST PLANEJADA da turma (Bloco 18, spec 033, RA-6; FR-004.1): *Nova APOINST*, *Editar*, *Desativar* e
 * *Reativar*. A *Concluída à mão* é a marcação (`registrarMarcacao`, em `marcacoes-de-atividade.ts`).
 *
 * > *"APOINST: planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado
 * > da disciplina), período previsto, TA previstos. Execução = lançamentos do DSA vinculados (Operador lança). (…) Só
 * > turmas de 2027 em diante; as de 2026 ficam como estão, sem retroajuste."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **A PERMISSÃO É DO BANCO** (`planejamento_de_atividades`/`editar` — só o trio — + alcance + turma em oferta, pela
 *    policy). O Operador recebe `42501` no `INSERT` e ZERO linhas no `UPDATE` (a RLS nega em silêncio, gotcha 4): as
 *    duas viram a mesma frase.
 * ⚠️ **CURSO FORA DE OFERTA NÃO É «O SEU PERFIL NÃO PLANEJA»** (achado da revisão do Bloco 18; `FR-032` da spec 009):
 *    a policy também exige `app.turma_em_oferta`, e o Admin recebe o MESMO `42501` na turma de curso inativo. Antes da
 *    frase, a ação lê o curso da turma (`recusaDaPolicy`): inativo → a frase do curso; ativo → a da permissão; leitura
 *    que falha → a frase que não afirma nenhuma das duas (o erro não vira outra causa).
 * ⚠️ **O BANCO CONFERE O RESTO**: a disciplina é da turma, o instrutor é designado nela, a turma é do ano inicial em
 *    diante (`apoinst.ano_inicial`, parâmetro) e não muda depois. As recusas chegam com a chave e viram frase
 *    (`traduzirRecusa`).
 * ⚠️ **NADA SE APAGA** (regra 4): *Desativar* é `status = inativo`; não há *Excluir*.
 * ⚠️ **A TURMA ARQUIVADA NÃO RECEBE** (D-COR-5, D-11 da spec 033): `recusaSeTurmaArquivada`, antes de gravar — na
 *    edição, pela turma lida do banco, nunca pela que o formulário mandaria.
 * ⚠️ Gera o `id` antes e não usa `RETURNING` no `INSERT` (gotcha 4.1).
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaEdicaoDaApoinst,
  esquemaDaNovaApoinst,
  esquemaDaSituacaoDaApoinst,
} from "@/lib/validacao/apoinst";

export type ResultadoDaApoinst =
  { readonly ok: true } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO =
  "O seu perfil não planeja APOINST. Quem planeja é o Admin, o Encarregado ou o Ajudante da Administração Acadêmica.";

const NAO_ENCONTRADA = "A APOINST não existe mais, ou o seu perfil não a alcança.";

const falha = (erro: string): ResultadoDaApoinst => ({ ok: false, erro });

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

const POLICY_NAO_CONFERIDA =
  "O banco recusou a gravação da APOINST — por permissão do perfil ou por o curso da turma estar fora de oferta —, e " +
  "não foi possível conferir agora qual das duas. Recarregue a página e tente de novo.";

/**
 * O curso da turma está fora de oferta? `frase` é a recusa do curso inativo (`recusaPorAlcance`), ou nula com o curso
 * ativo; `conferido: false` quando a leitura falhou — e aí ninguém afirma causa nenhuma (o erro não vira outra causa).
 * A situação do curso é legível no escopo (`FR-017.1` da spec 009).
 */
async function cursoForaDeOferta(
  supabase: Cliente,
  turmaId: string,
): Promise<{ readonly frase: string | null; readonly conferido: boolean }> {
  const { data, error } = await supabase
    .from("turmas")
    .select("curso:cursos!turmas_curso_id_fkey(codigo, status)")
    .eq("id", turmaId)
    .maybeSingle();
  if (error) return { frase: null, conferido: false };
  const curso = (data as { curso: { codigo: string; status: string } | null } | null)?.curso;
  if (curso && curso.status !== "ativo") {
    return {
      frase: recusaPorAlcance({
        cursoInativo: true,
        sigla: curso.codigo,
        oQueNaoRecebe: "APOINST planejada",
      }),
      conferido: true,
    };
  }
  return { frase: null, conferido: true };
}

/**
 * A recusa da POLICY (`42501`, ou o `UPDATE` com zero linhas) dita pela causa: a policy nega igual a falta de permissão e
 * o curso da turma fora de oferta, e quem distingue é a ação, lendo a situação do curso.
 */
async function recusaDaPolicy(supabase: Cliente, turmaId: string): Promise<string> {
  const curso = await cursoForaDeOferta(supabase, turmaId);
  if (!curso.conferido) return POLICY_NAO_CONFERIDA;
  return curso.frase ?? SEM_PERMISSAO;
}

function revalidarTelas(): void {
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath("/atividades");
  revalidatePath("/avisos");
}

export async function criarApoinst(entrada: unknown): Promise<ResultadoDaApoinst> {
  const conferido = esquemaDaNovaApoinst.safeParse(entrada);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");
  const a = conferido.data;

  const supabase = await criarClienteDeServidor();
  const arquivada = await recusaSeTurmaArquivada(supabase, a.turmaId);
  if (arquivada) return falha(arquivada);

  const { error } = await supabase.from("apoinst_planejadas").insert({
    id: randomUUID(),
    turma_id: a.turmaId,
    disciplina_id: a.disciplinaId,
    instrutor_id: a.instrutorId,
    nome: a.nome,
    inicio_previsto: a.inicioPrevisto,
    fim_previsto: a.fimPrevisto,
    ta_previstos: a.taPrevistos,
    observacao: a.observacao,
  });
  if (error) {
    return falha(
      error.code === "42501"
        ? await recusaDaPolicy(supabase, a.turmaId)
        : traduzirRecusa(error as ErroDoBanco),
    );
  }
  revalidarTelas();
  return { ok: true };
}

/** A turma da APOINST, lida do banco — é ela que a trava da arquivada confere. */
async function turmaDaApoinst(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  id: string,
): Promise<{ readonly turmaId: string } | { readonly erro: string }> {
  const { data, error } = await supabase
    .from("apoinst_planejadas")
    .select("turma_id")
    .eq("id", id)
    .maybeSingle();
  if (error) return { erro: traduzirRecusa(error as ErroDoBanco) };
  if (!data) return { erro: NAO_ENCONTRADA };
  return { turmaId: (data as { turma_id: string }).turma_id };
}

export async function editarApoinst(entrada: unknown): Promise<ResultadoDaApoinst> {
  const conferido = esquemaDaEdicaoDaApoinst.safeParse(entrada);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");
  const a = conferido.data;

  const supabase = await criarClienteDeServidor();
  const turma = await turmaDaApoinst(supabase, a.id);
  if ("erro" in turma) return falha(turma.erro);
  const arquivada = await recusaSeTurmaArquivada(supabase, turma.turmaId);
  if (arquivada) return falha(arquivada);

  const { data, error } = await supabase
    .from("apoinst_planejadas")
    .update({
      disciplina_id: a.disciplinaId,
      instrutor_id: a.instrutorId,
      nome: a.nome,
      inicio_previsto: a.inicioPrevisto,
      fim_previsto: a.fimPrevisto,
      ta_previstos: a.taPrevistos,
      observacao: a.observacao,
    })
    .eq("id", a.id)
    .select("id");
  if (error) {
    return falha(
      error.code === "42501"
        ? await recusaDaPolicy(supabase, turma.turmaId)
        : traduzirRecusa(error as ErroDoBanco),
    );
  }
  // ⚠️ A RLS do UPDATE nega em silêncio (gotcha 4): zero linhas é recusa, não sucesso — e dita pela causa.
  if (!data || data.length === 0) return falha(await recusaDaPolicy(supabase, turma.turmaId));
  revalidarTelas();
  return { ok: true };
}

export async function desativarApoinst(entrada: unknown): Promise<ResultadoDaApoinst> {
  return mudarSituacao(entrada, "inativo", "ativo");
}

export async function reativarApoinst(entrada: unknown): Promise<ResultadoDaApoinst> {
  return mudarSituacao(entrada, "ativo", "inativo");
}

async function mudarSituacao(
  entrada: unknown,
  para: "ativo" | "inativo",
  de: "ativo" | "inativo",
): Promise<ResultadoDaApoinst> {
  const conferido = esquemaDaSituacaoDaApoinst.safeParse(entrada);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");
  const { id } = conferido.data;

  const supabase = await criarClienteDeServidor();
  const turma = await turmaDaApoinst(supabase, id);
  if ("erro" in turma) return falha(turma.erro);
  const arquivada = await recusaSeTurmaArquivada(supabase, turma.turmaId);
  if (arquivada) return falha(arquivada);

  const { data, error } = await supabase
    .from("apoinst_planejadas")
    .update({ status: para })
    .eq("id", id)
    .eq("status", de)
    .select("id");
  if (error) {
    return falha(
      error.code === "42501"
        ? await recusaDaPolicy(supabase, turma.turmaId)
        : traduzirRecusa(error as ErroDoBanco),
    );
  }
  if (!data || data.length === 0) {
    /* Zero linhas: já na situação pedida, ou a policy negou — e, se negou pelo curso fora de oferta, é isso que se diz. */
    const curso = await cursoForaDeOferta(supabase, turma.turmaId);
    if (curso.frase) return falha(curso.frase);
    return falha(
      para === "inativo"
        ? "A APOINST já estava desativada, ou o seu perfil não a desativa."
        : "A APOINST já estava ativa, ou o seu perfil não a reativa.",
    );
  }
  revalidarTelas();
  return { ok: true };
}

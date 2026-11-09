"use server";

/**
 * A marcação À MÃO (Bloco 18, spec 033, RA-5 e RA-6; FR-005.2): a AEC prevista do currículo *cumprida* e a APOINST
 * *concluída* — ou o *Desfazer* das duas.
 *
 * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…) OU marcada à mão pelo trio
 * > (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha, como os ajustes de avaliação do Bloco 16."*
 * > (RA-5) — *"Concluída (TA lançados ≥ previstos ou marcada à mão com justificativa)"* (RA-6)
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **SÓ ACRESCENTA**: cada marcação é uma linha nova de `marcacoes_de_atividade` (o gatilho recusa reescrever); a mais
 *    recente vale, as anteriores são o histórico na linha. *Desfazer* é uma marcação nova `a_cumprir`. Não muda CH.
 * ⚠️ **A PERMISSÃO É DO BANCO** (`planejamento_de_atividades`/`editar` — só o trio — + alcance + turma em oferta, pela
 *    policy): o Operador recebe `42501`, que vira a frase. O botão da tela segue a mesma permissão, mas não é a proteção.
 * ⚠️ **CURSO FORA DE OFERTA NÃO É «O SEU PERFIL NÃO MARCA»** (achado da revisão do Bloco 18; `FR-032` da spec 009): a
 *    policy também exige `app.turma_em_oferta`, e o Admin recebe o MESMO `42501` na turma de curso inativo. Antes da
 *    frase, a ação lê o curso da turma: inativo → a frase do curso; ativo → a da permissão; leitura que falha → a frase
 *    que não afirma nenhuma das duas (o erro não vira outra causa).
 * ⚠️ **O ALVO É DA TURMA** (o gatilho confere: a AEC prevista pelo currículo da turma, a APOINST pela própria turma).
 * ⚠️ **A TURMA ARQUIVADA NÃO RECEBE** (D-COR-5, D-11 da spec 033): `recusaSeTurmaArquivada`, antes de gravar.
 * ⚠️ Gera o `id` antes e não usa `RETURNING` (gotcha 4.1). O autor é carimbado pelo banco, pela sessão.
 */
import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { recusaSeTurmaArquivada } from "@/lib/acoes/turma-arquivada";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDaMarcacao } from "@/lib/validacao/marcacao-de-atividade";

export type ResultadoDaMarcacao =
  { readonly ok: true } | { readonly ok: false; readonly erro: string };

const SEM_PERMISSAO =
  "O seu perfil não marca atividade à mão. Quem marca é o Admin, o Encarregado ou o Ajudante da Administração Acadêmica.";

const POLICY_NAO_CONFERIDA =
  "O banco recusou a marcação — por permissão do perfil ou por o curso da turma estar fora de oferta —, e não foi " +
  "possível conferir agora qual das duas. Recarregue a página e tente de novo.";

/**
 * A recusa da POLICY (`42501`) dita pela causa: ela nega igual a falta de permissão e o curso da turma fora de oferta, e
 * quem distingue é a ação, lendo a situação do curso (legível no escopo, `FR-017.1` da spec 009).
 */
async function recusaDaPolicy(
  supabase: Awaited<ReturnType<typeof criarClienteDeServidor>>,
  turmaId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("turmas")
    .select("curso:cursos!turmas_curso_id_fkey(codigo, status)")
    .eq("id", turmaId)
    .maybeSingle();
  if (error) return POLICY_NAO_CONFERIDA;
  const curso = (data as { curso: { codigo: string; status: string } | null } | null)?.curso;
  if (curso && curso.status !== "ativo") {
    return recusaPorAlcance({
      cursoInativo: true,
      sigla: curso.codigo,
      oQueNaoRecebe: "marcação à mão",
    });
  }
  return SEM_PERMISSAO;
}

export async function registrarMarcacao(entrada: unknown): Promise<ResultadoDaMarcacao> {
  const conferido = esquemaDaMarcacao(hojeNaCiaara()).safeParse(entrada);
  if (!conferido.success) {
    return { ok: false, erro: conferido.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const m = conferido.data;
  const supabase = await criarClienteDeServidor();
  const arquivada = await recusaSeTurmaArquivada(supabase, m.turmaId);
  if (arquivada) return { ok: false, erro: arquivada };

  const { error } = await supabase.from("marcacoes_de_atividade").insert({
    id: randomUUID(),
    turma_id: m.turmaId,
    atividade_prevista_id: m.atividadePrevistaId,
    apoinst_id: m.apoinstId,
    situacao: m.situacao,
    data_realizada: m.dataRealizada,
    justificativa: m.justificativa,
  });
  if (error) {
    return {
      ok: false,
      erro:
        error.code === "42501"
          ? await recusaDaPolicy(supabase, m.turmaId)
          : traduzirRecusa(error as ErroDoBanco),
    };
  }
  revalidarTelas();
  return { ok: true };
}

/** A ficha da turma (abas Palestras e APOINST), o acompanhamento do DSA, o módulo e os avisos. */
function revalidarTelas(): void {
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath(ROTA_DO_DSA, "page");
  revalidatePath("/atividades");
  revalidatePath("/avisos");
}

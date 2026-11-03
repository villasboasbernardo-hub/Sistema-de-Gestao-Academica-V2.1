"use server";

/**
 * Server Actions das AEC PREVISTAS do currículo — Bloco 18 (spec 033), RA-2 e FR-002.
 *
 * > *"RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória
 * > sim/não. Editadas na aba Atividades de Editar curso → Currículo. Correção em currículo em uso segue RC-6."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **SERVER ACTION É ENDPOINT HTTP DE FATO.** `safeParse` na primeira linha de cada uma.
 * ⚠️ **NENHUMA USA `service_role`.** Quem decide é o banco: a policy (`cursos.editar`, alcance, curso em oferta), o guarda
 *    `app.guardar_aec_prevista` (tipo AEC, disciplina do mesmo currículo, currículo imutável) e, no currículo seguido por
 *    turma com lançamento, o gatilho da correção `app.guardar_curriculo_em_uso` (RC-6: o trio, com justificativa, e a
 *    trilha em `correcoes_de_curriculo`). Completar o que estava vazio (o TA «não definido») é livre.
 * ⚠️ **INCLUIR GERA O `id` ANTES E NÃO USA `RETURNING`** (gotcha 4.1); o `curriculo_id` vai explícito — com dois
 *    currículos ativos no curso, o gatilho `versao` não teria como escolher (`versao_obrigatoria`).
 * ⚠️ **ZERO LINHAS É RECUSA**, não sucesso vazio (gotcha 4 do lado da escrita).
 * ⚠️ **DESATIVAR, NUNCA APAGAR** (regra 4): a tabela não tem exceção nominal de exclusão permanente.
 */
import { randomUUID } from "node:crypto";

import { curriculoDoCurso, revalidarCurriculoDoCurso } from "@/lib/acoes/curriculo-do-curso";
import { comJustificativa, pedeJustificativa } from "@/lib/acoes/justificativa";
import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { proximaOrdem } from "@/lib/dominio/atividades/aec-previstas-no-curriculo";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDaAecPrevista, esquemaDaSituacaoDaAecPrevista } from "@/lib/validacao/aec-prevista";

export type ResultadoDaAecPrevista =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly erro: string;
      /** RC-6: o banco pediu a justificativa — a tela a pergunta e manda de novo. */
      readonly pedeJustificativa?: true | undefined;
    };

const falha = (erro: string): ResultadoDaAecPrevista => ({ ok: false, erro });

/* ⚠️ O `42501` da RC-6 (`curriculo_em_uso`) tem frase própria; o da policy (sem `cursos.editar`), a do alcance. */
function falhaDoBanco(error: ErroDoBanco): ResultadoDaAecPrevista {
  if (pedeJustificativa(error)) {
    return { ok: false, erro: traduzirRecusa(error), pedeJustificativa: true };
  }
  if (error.code === "42501" && error.hint !== "curriculo_em_uso") return falha(recusaPorAlcance());
  return falha(traduzirRecusa(error));
}

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/** Inclui (sem `id`) ou altera (com `id`) a AEC prevista do currículo escolhido. */
export async function salvarAecPrevista(entrada: unknown): Promise<ResultadoDaAecPrevista> {
  const conferido = esquemaDaAecPrevista.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  const a = conferido.data;

  const alvo = await curriculoDoCurso(a.sigla, a.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const valores = {
    nome: a.nome,
    tipo_atividade_id: a.tipoAtividadeId,
    ta_previstos: a.taPrevistos,
    disciplina_id: a.disciplinaId,
    obrigatoria: a.obrigatoria,
    fonte_arquivo: a.fonteArquivo,
    fonte_pagina: a.fontePagina,
    observacao: a.observacao,
  };

  if (a.id) {
    const { data, error } = await comJustificativa(
      supabase
        .from("aec_previstas_curriculo")
        .update(valores)
        .eq("id", a.id)
        .eq("curriculo_id", alvo.curriculoId)
        .select("id"),
      a.justificativa,
    );
    if (error) return falhaDoBanco(error as ErroDoBanco);
    if (!data || data.length === 0) return falha(recusaPorAlcance());
  } else {
    /* A posição na ordem do currículo: depois da última (as desativadas contam — nada muda de lugar). */
    const { data: ordens, error: erroDasOrdens } = await supabase
      .from("aec_previstas_curriculo")
      .select("ordem")
      .eq("curriculo_id", alvo.curriculoId);
    if (erroDasOrdens) return falhaDoBanco(erroDasOrdens as ErroDoBanco);
    const { error } = await comJustificativa(
      supabase.from("aec_previstas_curriculo").insert({
        id: randomUUID(),
        curso_id: alvo.cursoId,
        curriculo_id: alvo.curriculoId,
        ordem: proximaOrdem((ordens ?? []).map((o) => o.ordem)),
        ...valores,
      }),
      a.justificativa,
    );
    if (error) return falhaDoBanco(error as ErroDoBanco);
  }

  revalidarCurriculoDoCurso(a.sigla);
  return { ok: true };
}

/** A troca da situação, já conferida: desativar (`inativo`) ou reativar (`ativo`). No currículo em uso, RC-6. */
async function gravarSituacao(
  s: {
    readonly sigla: string;
    readonly versao: number;
    readonly id: string;
    readonly justificativa?: string | undefined;
  },
  status: "ativo" | "inativo",
): Promise<ResultadoDaAecPrevista> {
  const alvo = await curriculoDoCurso(s.sigla, s.versao);
  if (!alvo) return falha(recusaPorAlcance());

  const supabase = await criarClienteDeServidor();
  const { data, error } = await comJustificativa(
    supabase
      .from("aec_previstas_curriculo")
      .update({ status })
      .eq("id", s.id)
      .eq("curriculo_id", alvo.curriculoId)
      .select("id"),
    s.justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(recusaPorAlcance());

  revalidarCurriculoDoCurso(s.sigla);
  return { ok: true };
}

/** Desativa a AEC prevista (exclusão lógica, regra 4): sai da turma como «a cumprir», e fica no currículo. */
export async function desativarAecPrevista(entrada: unknown): Promise<ResultadoDaAecPrevista> {
  const conferido = esquemaDaSituacaoDaAecPrevista.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return gravarSituacao(conferido.data, "inativo");
}

/** Reativa a AEC prevista desativada. No currículo em uso, RC-6. */
export async function reativarAecPrevista(entrada: unknown): Promise<ResultadoDaAecPrevista> {
  const conferido = esquemaDaSituacaoDaAecPrevista.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return gravarSituacao(conferido.data, "ativo");
}

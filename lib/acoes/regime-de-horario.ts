"use server";

/**
 * Server Actions dos regimes de horário nomeados do curso — spec 018 (Bloco 3), a aba *Horários*.
 *
 * ⚠️ **QUATRO AÇÕES E NENHUM APAGAR** (regra 4): criar, editar, inativar e reativar. Regime errado se inativa e se
 *    cadastra outro; a turma que o usava continua com ele (C-11).
 * ⚠️ **QUEM PODE É O BANCO**: `horarios.criar`/`editar` pela RLS, `horarios.desativar` pelo gatilho (a policy não vê
 *    OLD). O curso tem de estar em oferta. Aqui só se traduz a recusa.
 * ⚠️ **A EDIÇÃO NÃO MANDA QUANTIDADE NEM DURAÇÃO** (`RF-HOR-02`): o esquema as descarta.
 */
import { revalidatePath } from "next/cache";

import { comJustificativa, pedeJustificativa } from "@/lib/acoes/justificativa";
import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { ROTA_DA_FICHA_DA_TURMA, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaEdicaoDoRegime,
  esquemaDaSituacaoDoRegime,
  esquemaDoRegime,
} from "@/lib/validacao/regime-de-horario";

export type ResultadoDoRegime =
  | { readonly ok: true; readonly id: string }
  | {
      readonly ok: false;
      readonly erro: string;
      /** Spec 021 (RC-6): no currículo em uso, o banco pediu a justificativa — a tela a pergunta e manda de novo. */
      readonly pedeJustificativa?: true | undefined;
    };

const falha = (erro: string): ResultadoDoRegime => ({ ok: false, erro });

function falhaDoBanco(error: ErroDoBanco): ResultadoDoRegime {
  return pedeJustificativa(error)
    ? { ok: false, erro: traduzirRecusa(error), pedeJustificativa: true }
    : { ok: false, erro: traduzirRecusa(error) };
}

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

const SEM_ALCANCE =
  "O seu perfil não pode alterar os regimes de horário deste curso, ou o regime não existe mais.";

/* A aba Horários do curso, a edição do curso, a ficha e o DSA das turmas (o regime que elas usam). */
function revalidar(): void {
  revalidatePath("/cursos/[curso]", "page");
  revalidatePath("/cursos/[curso]/editar", "page");
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  revalidatePath(ROTA_DO_DSA, "page");
}

/** Cadastra um regime nomeado no curso. */
export async function criarRegimeDeHorario(entrada: unknown): Promise<ResultadoDoRegime> {
  const conferido = esquemaDoRegime.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  /*
   * ⚠️ O ID É GERADO AQUI, e o INSERT vai sem `RETURNING` (gotcha 4.1): a leitura da linha nova passa pela policy de
   *    leitura, e ler em comando separado tira retrato novo.
   */
  const id = crypto.randomUUID();
  const { justificativa, ...regime } = conferido.data;
  const { error } = await comJustificativa(
    supabase.from("regimes_de_horario").insert({ id, ...regime }),
    justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);

  revalidar();
  return { ok: true, id };
}

/** Edita o nome, o relógio e a observação. O banco recusa o relógio de regime em uso com lançamento. */
export async function editarRegimeDeHorario(entrada: unknown): Promise<ResultadoDoRegime> {
  const conferido = esquemaDaEdicaoDoRegime.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { id, justificativa, ...campos } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { data, error } = await comJustificativa(
    supabase.from("regimes_de_horario").update(campos).eq("id", id).select("id"),
    justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  /* ⚠️ UPDATE recusado pela RLS chega VAZIO, sem erro (gotcha 4): o comprimento é o que diz. */
  if (!data || data.length === 0) return falha(SEM_ALCANCE);

  revalidar();
  return { ok: true, id };
}

async function mudarSituacao(
  id: string,
  status: "ativo" | "inativo",
  justificativa: string | undefined,
): Promise<ResultadoDoRegime> {
  const supabase = await criarClienteDeServidor();
  const { data, error } = await comJustificativa(
    supabase.from("regimes_de_horario").update({ status }).eq("id", id).select("id"),
    justificativa,
  );
  if (error) return falhaDoBanco(error as ErroDoBanco);
  if (!data || data.length === 0) return falha(SEM_ALCANCE);

  revalidar();
  return { ok: true, id };
}

/**
 * Inativa o regime (C-11). ⚠️ **REGIME EM USO PODE SER INATIVADO**: ele sai da lista de escolha, e as turmas que o
 * usam continuam com ele — trocar o regime delas reinterpretaria o que foi lançado.
 */
export async function inativarRegimeDeHorario(entrada: unknown): Promise<ResultadoDoRegime> {
  const conferido = esquemaDaSituacaoDoRegime.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return mudarSituacao(conferido.data.id, "inativo", conferido.data.justificativa);
}

/** Devolve o regime à lista de escolha. */
export async function reativarRegimeDeHorario(entrada: unknown): Promise<ResultadoDoRegime> {
  const conferido = esquemaDaSituacaoDoRegime.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return mudarSituacao(conferido.data.id, "ativo", conferido.data.justificativa);
}

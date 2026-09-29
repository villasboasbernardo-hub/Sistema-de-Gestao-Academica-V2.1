"use server";

/**
 * Server Actions de **disciplina** (`FR-010` a `FR-024`, `FR-030`).
 *
 * ⚠️ **NENHUMA USA A CHAVE PRIVILEGIADA.** Quem autoriza é a RLS, com a sessão de quem pede — e o
 * caso que discrimina desta fatia depende disso: o **Operador** edita período e instrutores por
 * turma (tem `disciplinas.editar`, `Q-10`) e **não** cria nem exclui disciplina. Com `service_role` a
 * distinção sumiria, e a tela mostraria botões que o banco recusa.
 *
 * ⚠️ **A CRIAÇÃO VAI POR RPC, NÃO POR `insert`** (decisão A-2, 25/09/2026). `criar_disciplina` faz
 * duas coisas na mesma transação: grava a disciplina **e** cria a `turma_disciplina` de cada turma
 * ativa do curso. Um `AFTER INSERT` faria isso também — e colidiria com a ordem do ETL e com quatro
 * amostras de pgTAP, que inserem disciplina antes da turma.
 *
 * ⚠️ **`id` GERADO ANTES, LEITURA EM COMANDO SEPARADO** (gotcha 4.1). `INSERT … RETURNING` exige que
 * a linha passe **também** pela policy de `SELECT`, e o alcance é resolvido por função `STABLE` que
 * não enxerga a linha recém-inserida dentro do mesmo comando: a recusa chega como *"new row violates
 * row-level security policy"*, apontando para a escrita, cuja permissão estava certa o tempo todo.
 *
 * ⚠️ **`UPDATE` BARRADO PELO `USING` DA POLICY NÃO DÁ ERRO** — o motor atualiza zero linhas e responde
 * sucesso. Por isso toda edição aqui confere a **contagem** e trata zero como recusa; sem isso a tela
 * diria "salvo" sem ter salvado nada, que é o gotcha 4 do lado da escrita.
 */
import { revalidatePath } from "next/cache";

import {
  recusaPorAlcance,
  traduzirRecusa,
  type ErroDoBanco,
} from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeDisciplina,
  esquemaDeEdicaoDeDisciplina,
  esquemaDeExclusaoDeDisciplina,
  esquemaDePeriodoDaTurma,
  esquemaDeSituacaoDaDisciplina,
} from "@/lib/validacao/disciplina";

export type ResultadoDeDisciplina =
  // ⚠️ `| undefined` explícito: com `exactOptionalPropertyTypes` ligado, `?:` NÃO aceita
  //    `undefined` atribuído — e a criação devolve o `id` que a RPC trouxe, que pode faltar.
  | { readonly ok: true; readonly disciplinaId?: string | undefined }
  | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeDisciplina => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

function revalidar(): void {
  revalidatePath("/disciplinas");
  revalidatePath("/cursos");
}

/** Cria a disciplina e, com ela, a grade de cada turma ativa do curso (`FR-010`). */
export async function criarDisciplina(entrada: unknown): Promise<ResultadoDeDisciplina> {
  const conferido = esquemaDeDisciplina.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const d = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { data, error } = await supabase
    .rpc("criar_disciplina", {
      p_disciplina: {
        curso_id: d.cursoId,
        cod_disciplina: d.codDisciplina,
        nome_disciplina: d.nomeDisciplina,
        carga_horaria_tempos: d.cargaHorariaTempos,
        ordem_sugerida: d.ordemSugerida ?? null,
        modo_atribuicao_padrao: d.modoAtribuicaoPadrao,
        tecnica_ensino_sugerida: d.tecnicaEnsinoSugerida ?? null,
        local_padrao: d.localPadrao ?? null,
      },
    })
    .single();

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true, disciplinaId: (data as { id: string } | null)?.id };
}

/** Edita o cadastro da disciplina (`FR-011`). O curso **não** muda. */
export async function editarDisciplina(entrada: unknown): Promise<ResultadoDeDisciplina> {
  const conferido = esquemaDeEdicaoDeDisciplina.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const d = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { error, count } = await supabase
    .from("disciplinas")
    .update(
      {
        cod_disciplina: d.codDisciplina,
        nome_disciplina: d.nomeDisciplina,
        carga_horaria_tempos: d.cargaHorariaTempos,
        ordem_sugerida: d.ordemSugerida ?? null,
        modo_atribuicao_padrao: d.modoAtribuicaoPadrao,
        tecnica_ensino_sugerida: d.tecnicaEnsinoSugerida ?? null,
        local_padrao: d.localPadrao ?? null,
      },
      { count: "exact" },
    )
    .eq("id", d.disciplinaId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  // ⚠️ Zero linhas é RECUSA, não sucesso vazio — ver o cabeçalho.
  if (count === 0) return falha(recusaPorAlcance());

  revalidar();
  return { ok: true, disciplinaId: d.disciplinaId };
}

/** Muda só a situação (`FR-013`). Reenviar a linha inteira deixaria uma edição viajar junto. */
async function mudarSituacao(
  entrada: unknown,
  status: "ativo" | "inativo",
): Promise<ResultadoDeDisciplina> {
  const conferido = esquemaDeSituacaoDaDisciplina.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();

  // ⚠️ **REATIVAR VAI POR RPC**, e desativar não. `reativar_disciplina` refaz a grade das turmas
  //    ativas — o mesmo trabalho da criação —, e por isso não é um `update` de coluna (decisão A-2).
  if (status === "ativo") {
    const { error } = await supabase
      .rpc("reativar_disciplina", { p_disciplina_id: conferido.data.disciplinaId })
      .single();
    if (error) return falha(traduzirRecusa(error as ErroDoBanco));
    revalidar();
    return { ok: true, disciplinaId: conferido.data.disciplinaId };
  }

  const { error, count } = await supabase
    .from("disciplinas")
    .update({ status: "inativo" }, { count: "exact" })
    .eq("id", conferido.data.disciplinaId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  if (count === 0) return falha(recusaPorAlcance());

  revalidar();
  return { ok: true, disciplinaId: conferido.data.disciplinaId };
}

export async function desativarDisciplina(entrada: unknown): Promise<ResultadoDeDisciplina> {
  return mudarSituacao(entrada, "inativo");
}

export async function reativarDisciplina(entrada: unknown): Promise<ResultadoDeDisciplina> {
  return mudarSituacao(entrada, "ativo");
}

/**
 * Exclusão permanente, com código e rastro (`FR-020` a `FR-024`, D-B1).
 *
 * ⚠️ **NÃO HÁ `delete` AQUI, e não pode haver**: `authenticated` não tem privilégio de `DELETE` e não
 * existe policy de `DELETE` (regra 4). O caminho é a RPC com porteiro, que confere os impedimentos no
 * banco, exige o código e grava o rastro em `exclusoes_registradas` — tabela só de acréscimo.
 */
export async function excluirDisciplina(entrada: unknown): Promise<ResultadoDeDisciplina> {
  const conferido = esquemaDeExclusaoDeDisciplina.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("excluir_disciplina", {
    p_disciplina_id: conferido.data.disciplinaId,
    p_codigo_confirmacao: conferido.data.codigoConfirmacao,
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}

/**
 * O período previsto **daquela turma** (`FR-030`).
 *
 * ⚠️ **O CASO CRÍTICO DA FATIA INTEIRA MORA AQUI.** A escrita é em `turma_disciplina`, filtrada pelo
 * `id` da linha **daquela** turma — nunca por `disciplina_id`. Gravar por disciplina alteraria a
 * previsão em **todas** as turmas de uma vez, e o sintoma seria mudo: a turma editada ficaria certa e
 * as outras mudariam sem ninguém pedir. É o critério 4 do Épico 5, e o e2e o mede.
 *
 * ⚠️ **`origem_periodo` É DERIVADA DAS DATAS, NUNCA ESCOLHIDA PELA TELA**, e o banco cobra isso: o
 * `CHECK` de `turma_disciplina` exige que `nao_informado` venha com **as duas datas nulas**, e que
 * qualquer outro valor venha com `previsao_inicio` preenchida. Mandar um valor independente das datas
 * produziria `23514` numa gravação perfeitamente razoável. O enum aceita
 * `herdado_grade | manual | nao_informado` — medido em 29/09/2026; **não existe `tela`**, e a
 * primeira escrita desta ação mandava exatamente isso.
 */
export async function definirPeriodoDaTurma(entrada: unknown): Promise<ResultadoDeDisciplina> {
  const conferido = esquemaDePeriodoDaTurma.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const p = conferido.data;
  const supabase = await criarClienteDeServidor();

  // Limpar as duas datas é voltar ao estado "não informado"; informar o início é decisão manual.
  const origem = p.previsaoInicio === null ? "nao_informado" : "manual";
  const termino = p.previsaoInicio === null ? null : p.previsaoTermino;

  const { error, count } = await supabase
    .from("turma_disciplina")
    .update(
      {
        previsao_inicio: p.previsaoInicio,
        previsao_termino: termino,
        origem_periodo: origem,
      },
      { count: "exact" },
    )
    .eq("id", p.turmaDisciplinaId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  if (count === 0) return falha(recusaPorAlcance());

  revalidar();
  return { ok: true };
}

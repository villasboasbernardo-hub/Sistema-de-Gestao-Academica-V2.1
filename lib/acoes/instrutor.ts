"use server";

/**
 * Server Actions do cadastro de instrutor (`RN-INST-03`, `FR-005` a `FR-012`, `FR-032` da spec 006).
 *
 * ⚠️ SERVER ACTION É ENDPOINT HTTP DE FATO. `safeParse` na primeira linha de cada uma, sem exceção —
 * quem chama pode ser a tela ou pode ser `curl`.
 *
 * ⚠️ NENHUMA DELAS USA `service_role`. Ela é para convite, ETL e manutenção, nunca por requisição de
 * tela. Quem decide se a escrita passa é a RLS, o privilégio de coluna e o porteiro da função de
 * dado pessoal — esta camada só recusa cedo e traduz o erro.
 *
 * ⚠️ O DADO PESSOAL NÃO ENTRA NO INSERT NEM NO UPDATE DA TABELA. `authenticated` não tem mais escrita
 * nas 12 colunas (migration `20260915052719`): ele passa por `gravar_dados_pessoais_instrutor`, que
 * recusa quem não lê a PII. Quem não vê, não escreve.
 */
import { revalidatePath } from "next/cache";

import { chavesDaRecusa, motivoDoImpedimento } from "@/lib/dominio/exclusao-de-instrutor";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeCriacaoDeInstrutor,
  esquemaDeEdicaoDeInstrutor,
  esquemaDeExclusaoDeInstrutor,
  esquemaDeGravacaoDePessoais,
  esquemaDeHabilitacoes,
  esquemaDeSituacao,
  ESPECIALIDADE_DE_MILITAR,
  ESPECIALIDADE_EM_BRANCO,
  OBRIGATORIOS_DO_INSTRUTOR,
} from "@/lib/validacao/instrutor";

export type ResultadoDeInstrutor =
  | { readonly ok: true; readonly codigo: string; readonly id?: string }
  | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeInstrutor => ({ ok: false, erro });

type ErroDoBanco = { readonly code?: string; readonly message: string };

/**
 * A mensagem de cada `CHECK` de `instrutores`, pelo nome da restrição.
 *
 * ⚠️ O NOME DA RESTRIÇÃO É NOSSO, E ESTÁVEL — é declarado nas migrations. Não é o texto do erro da
 * plataforma, que pode mudar de redação; é o identificador que o próprio schema escolheu.
 */
const MENSAGEM_DO_CHECK: Readonly<Record<string, string>> = {
  instrutores_posto_graduacao_preenchido: OBRIGATORIOS_DO_INSTRUTOR[0].mensagem,
  instrutores_esp_hab_obs_preenchido: ESPECIALIDADE_EM_BRANCO,
  instrutores_esp_hab_obs_de_militar_novo: ESPECIALIDADE_DE_MILITAR,
  instrutores_nome_completo_preenchido: OBRIGATORIOS_DO_INSTRUTOR[1].mensagem,
  instrutores_categoria_preenchida: OBRIGATORIOS_DO_INSTRUTOR[2].mensagem,
  instrutores_om_preenchida: OBRIGATORIOS_DO_INSTRUTOR[3].mensagem,
  instrutores_email_formato: "Informe um e-mail válido.",
  instrutores_docencia_coerente:
    "O início da docência no CIAARA não pode ser anterior ao início da docência na MB.",
};

/**
 * Traduz o erro do banco para quem está na tela.
 *
 * ⚠️ O DISCRIMINADOR É O CÓDIGO, e a mensagem desconhecida NÃO é repassada — ela vai para o log do
 * servidor. Repassar o texto cru seria o vazamento que o PR #13 corrigiu no reenvio de convite.
 */
function traduzirErro(erro: ErroDoBanco): string {
  if (erro.code === "23514") {
    for (const [restricao, mensagem] of Object.entries(MENSAGEM_DO_CHECK)) {
      if (erro.message.includes(restricao)) return mensagem;
    }
    return "O banco recusou o cadastro: um campo não atende à regra.";
  }
  if (erro.code === "42501") return "O seu perfil não pode fazer esta alteração.";
  if (erro.code === "23505") return "Já existe instrutor com este código.";
  console.error("[CIAARA-11] escrita de instrutor recusada:", erro);
  return "Não foi possível gravar o instrutor.";
}

/** A primeira mensagem do Zod — a que diz qual campo falta. */
function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/**
 * Cadastra um instrutor. O `codigo` é gerado pelo banco (`FR-007`), e volta para a tela abrir a ficha.
 *
 * ⚠️ SEM DADO PESSOAL. A identificação civil é gravada na ficha, por quem a lê — ver o cabeçalho.
 */
export async function criarInstrutor(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeCriacaoDeInstrutor.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("instrutores")
    .insert(conferido.data.funcional)
    .select("id, codigo")
    .single();
  if (error) return falha(traduzirErro(error));

  revalidatePath("/instrutores");
  return { ok: true, codigo: data.codigo, id: data.id };
}

/**
 * Edita o dado funcional de um instrutor.
 *
 * ⚠️ ZERO LINHAS NÃO É SUCESSO. A RLS nega edição **filtrando**, e não com erro: sem o `select` de
 * volta, uma edição negada pareceria gravada. É o gotcha nº 4 do BRIEF, do lado da escrita.
 */
export async function editarInstrutor(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeEdicaoDeInstrutor.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("instrutores")
    .update(conferido.data.funcional)
    .eq("id", conferido.data.id)
    .select("codigo");
  if (error) return falha(traduzirErro(error));
  const linha = data?.[0];
  if (!linha) return falha("Instrutor inexistente, ou o seu perfil não pode editá-lo.");

  revalidatePath("/instrutores");
  revalidatePath(`/instrutores/${linha.codigo}`);
  return { ok: true, codigo: linha.codigo };
}

/**
 * Grava identificação civil e residência (`FR-032`).
 *
 * ⚠️ O PORTEIRO É DO BANCO. Esta ação não confere perfil: a função recusa com `42501` quem não lê a
 * PII, e a mensagem abaixo só traduz essa recusa.
 */
export async function gravarDadosPessoaisDoInstrutor(
  dados: unknown,
): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeGravacaoDePessoais.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("gravar_dados_pessoais_instrutor", {
    p_instrutor_id: conferido.data.id,
    p_dados: conferido.data.pessoal,
  });
  if (error) {
    if (error.code === "42501") return falha("O seu perfil não grava dado pessoal de instrutor.");
    return falha(traduzirErro(error));
  }

  const { data } = await supabase
    .from("vw_instrutores")
    .select("codigo")
    .eq("id", conferido.data.id)
    .maybeSingle();
  revalidatePath("/instrutores");
  if (data?.codigo) revalidatePath(`/instrutores/${data.codigo}`);
  return { ok: true, codigo: data?.codigo ?? "" };
}

/**
 * Grava a situação de cadastro. Chamada só pelas duas ações abaixo, **depois** do Zod delas.
 *
 * ⚠️ É `UPDATE` DE `status`, E NUNCA `DELETE` (`RN-INST-05`, regra 4 do BRIEF). Nenhuma tabela tem
 * policy de `DELETE`; um `delete` aqui seria negado pelo banco, mas a intenção errada ficaria escrita.
 *
 * ⚠️ A CONTA DE ACESSO NÃO É TOCADA (`FR-010.1`). Desativar o docente diz que ele não recebe aula
 * nova, não que perdeu o acesso — `tests/invariantes/rls/rls.test.ts` prova pela sessão real.
 */
async function gravarSituacao(
  id: string,
  status: "ativo" | "inativo",
): Promise<ResultadoDeInstrutor> {
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("instrutores")
    .update({ status })
    .eq("id", id)
    .select("codigo");
  if (error) return falha(traduzirErro(error));
  const linha = data?.[0];
  // ⚠️ Zero linhas não é sucesso: a RLS nega filtrando, e sem o `select` a negação pareceria gravada.
  if (!linha) return falha("Instrutor inexistente, ou o seu perfil não pode alterá-lo.");

  revalidatePath("/instrutores");
  revalidatePath(`/instrutores/${linha.codigo}`);
  revalidatePath("/admin/usuarios");
  return { ok: true, codigo: linha.codigo };
}

/**
 * Desativa um instrutor (`FR-008`, `RN-INST-02`): sai das atribuições futuras e fica em todo histórico.
 *
 * ⚠️ O CLIENTE MANDA SÓ O `id`. A situação é decidida pela ação que ele chamou; um `status` no corpo
 * da requisição é descartado pelo Zod, que não conhece a chave.
 */
export async function desativarInstrutor(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeSituacao.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return gravarSituacao(conferido.data.id, "inativo");
}

/** Reativa um instrutor (`FR-010`): volta às atribuições futuras, sem perda de nada. */
export async function reativarInstrutor(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeSituacao.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));
  return gravarSituacao(conferido.data.id, "ativo");
}

/**
 * Sincroniza as habilitações do instrutor com o painel de disciplinas (`FR-022`, spec 019 da v2.0).
 *
 * ⚠️ UMA CHAMADA, UMA TRANSAÇÃO. `sincronizar_habilitacoes` cria, reativa sem duplicar e inativa sem
 * apagar; fazer isso aqui, em várias escritas, deixaria o painel pela metade na primeira recusa.
 *
 * ⚠️ A NEGAÇÃO É DO BANCO: a função é `SECURITY INVOKER`, consulta a permissão da sessão e recusa com
 * `42501` quando a RLS não alcança alguma disciplina.
 */
export async function sincronizarHabilitacoes(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeHabilitacoes.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc("sincronizar_habilitacoes", {
    p_instrutor_id: conferido.data.instrutorId,
    p_disciplinas: conferido.data.disciplinas,
  });
  if (error) {
    if (error.code === "42501") {
      return falha("O seu perfil não alcança alguma das disciplinas marcadas.");
    }
    if (error.code === "22023") {
      return falha("Há disciplina inativa ou inexistente entre as marcadas.");
    }
    return falha(traduzirErro(error));
  }

  const { data } = await supabase
    .from("vw_instrutores")
    .select("codigo")
    .eq("id", conferido.data.instrutorId)
    .maybeSingle();
  revalidatePath("/instrutores");
  if (data?.codigo) revalidatePath(`/instrutores/${data.codigo}`);
  return { ok: true, codigo: data?.codigo ?? "" };
}

/**
 * Exclui **permanentemente** um instrutor sem histórico nenhum — a exceção única à regra 4, autorizada
 * por Bernardo Villas Boas em 15/09/2026.
 *
 * ⚠️ O PORTEIRO É DO BANCO. `excluir_instrutor` confere a permissão (`criar` instrutor, a mais restritiva
 * que a matriz oferece), o código digitado e cada impedimento, na mesma transação, e recusa com erro
 * específico. Esta ação só traduz. Quem tem histórico continua só podendo ser desativado.
 */
export async function excluirInstrutor(dados: unknown): Promise<ResultadoDeInstrutor> {
  const conferido = esquemaDeExclusaoDeInstrutor.safeParse(dados);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase.rpc("excluir_instrutor", {
    p_instrutor_id: conferido.data.id,
    p_codigo_confirmacao: conferido.data.codigoConfirmacao,
  });
  if (error) {
    if (error.code === "42501") return falha("O seu perfil não exclui instrutor.");
    if (error.code === "22023") return falha("O código digitado não é o deste instrutor.");
    if (error.code === "P0002") return falha("Instrutor inexistente.");
    if (error.code === "23503") {
      return falha(
        motivoDoImpedimento(chavesDaRecusa(error.message)) ??
          "Este instrutor tem histórico e só pode ser desativado.",
      );
    }
    return falha(traduzirErro(error));
  }

  const excluido = data as { codigo?: string } | null;
  revalidatePath("/instrutores");
  return { ok: true, codigo: excluido?.codigo ?? "" };
}

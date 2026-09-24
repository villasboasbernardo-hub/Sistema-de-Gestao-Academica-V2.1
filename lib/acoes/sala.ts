"use server";

/**
 * Server Actions de sala (`FR-029.2`, `FR-029.4`, `FR-029.5`).
 *
 * ⚠️ **SÃO TRÊS AÇÕES, E NÃO QUATRO: não existe renomear** (`FR-029.5`). O nome da sala é o valor
 * gravado em `turmas.sala_alocada`; renomeá-lo deixaria as turmas apontando para um nome que não
 * existe mais. Sala errada se **desativa** e se acrescenta outra — o histórico fica de pé.
 *
 * ⚠️ **E NÃO EXISTE APAGAR.** É a regra 4 do `CLAUDE.md`: exclusão é lógica, e nenhuma tabela tem
 * policy `FOR DELETE`.
 *
 * ⚠️ **DESATIVAR E REATIVAR MANDAM SÓ `ativo`** (`FR-029.4`, `FR-029.5`). Reenviar a linha inteira
 * abriria caminho para uma renomeação viajar junto por engano — justamente o que não existe.
 *
 * ⚠️ **A NATUREZA VAI EM `metadados.ambiente_virtual`**, e é de lá que toda regra a lê (`SC-014.2`).
 * Gravá-la no nome faria a leitura depender de texto.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeSala, esquemaDeSituacaoDaSala } from "@/lib/validacao/sala";

export type ResultadoDeSala =
  { readonly ok: true; readonly valor: string } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDeSala => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

function revalidar(): void {
  revalidatePath("/admin/salas");
  revalidatePath("/cursos");
}

/** Acrescenta uma sala à lista (`FR-029.2`, `FR-029.6`). */
export async function acrescentarSala(entrada: unknown): Promise<ResultadoDeSala> {
  const conferido = esquemaDeSala.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { valor, natureza } = conferido.data;
  const supabase = await criarClienteDeServidor();

  /*
   * ⚠️ A ORDEM VAI PARA O FIM DA LISTA. `config_listas.ordem` é `NOT NULL`, e a sala nova entra
   * depois das que já existem — inserir no meio reordenaria a lista de todo mundo sem pedido.
   */
  const { data: ultima } = await supabase
    .from("config_listas")
    .select("ordem")
    .eq("lista", "salas")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("config_listas").insert({
    lista: "salas",
    valor,
    rotulo_exibicao: valor,
    ordem: Number(ultima?.ordem ?? 0) + 1,
    ativo: true,
    metadados: { ambiente_virtual: natureza === "virtual" },
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true, valor };
}

/** Muda só `ativo` — o que as duas ações abaixo compartilham. */
async function mudarSituacao(entrada: unknown, ativo: boolean): Promise<ResultadoDeSala> {
  const conferido = esquemaDeSituacaoDaSala.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { valor } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase
    .from("config_listas")
    .update({ ativo })
    .eq("lista", "salas")
    .eq("valor", valor)
    .select("valor");

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));
  if (!data || data.length === 0) {
    return falha("O seu perfil não pode alterar a lista de salas.");
  }

  revalidar();
  return { ok: true, valor };
}

/**
 * Tira a sala da lista de escolha (`FR-029.4`).
 *
 * ⚠️ **SALA EM USO PODE SER DESATIVADA** — o diálogo lista as turmas e deixa prosseguir. Bloquear
 * obrigaria a mexer em turma antiga para arrumar a lista de salas, e as turmas continuam com a sala
 * registrada.
 */
export async function desativarSala(entrada: unknown): Promise<ResultadoDeSala> {
  return mudarSituacao(entrada, false);
}

/** Devolve a sala à lista de escolha (`FR-029.5`). */
export async function reativarSala(entrada: unknown): Promise<ResultadoDeSala> {
  return mudarSituacao(entrada, true);
}

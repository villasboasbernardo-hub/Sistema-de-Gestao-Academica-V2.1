"use server";

/**
 * Server Actions do **próprio cadastro** (`FR-012` a `FR-014`, `FR-020` a `FR-022`).
 *
 * ⚠️ **NENHUMA DELAS USA A CHAVE PRIVILEGIADA, E ISSO É DESENHO, NÃO ECONOMIA.** A policy
 * `usuarios_editar` já permite `id = app.usuario_atual()` — medido no banco em 29/09/2026 —, e as
 * policies do bucket decidem pela **primeira pasta do caminho**. Então a sessão de quem pede basta,
 * e o banco continua sendo quem autoriza. Usar `lib/supabase/admin.ts` aqui seria `service_role`
 * **por requisição de tela**, que o gotcha 2 do `CLAUDE.md` proíbe sem discussão — e, pior, tiraria
 * a RLS do caminho justamente onde ela está certa.
 *
 * ⚠️ **PERFIL, ESCOPO E SITUAÇÃO NÃO PASSAM POR AQUI** (`FR-022`). Não estão no esquema, então o
 * `safeParse` os descarta; e o gatilho `app.impedir_autoescalonamento` recusa no banco quem tentar
 * por outro caminho. São duas guardas, e a de baixo é a que vale.
 *
 * ⚠️ **O E-MAIL NÃO É EDITÁVEL POR NINGUÉM** (`FR-021`). Ele é a credencial do Auth: trocá-lo na
 * tabela `usuarios` sem trocá-lo no schema de autenticação criaria uma conta que entra com um
 * endereço e aparece com outro.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { conferirConfirmacao, regraDaSenhaEmPortugues } from "@/lib/dominio/politica-de-senha";
import { BALDE_DE_AVATARES } from "@/lib/supabase/avatar";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDaFoto,
  esquemaDaPropriaSenha,
  esquemaDoProprioCadastro,
} from "@/lib/validacao/perfil";

export type ResultadoDePerfil =
  { readonly ok: true } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDePerfil => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/**
 * Quem está pedindo — e o caminho onde a foto dele mora.
 *
 * ⚠️ **O CAMINHO É DERIVADO DA SESSÃO, NUNCA RECEBIDO DA TELA.** Se ele viesse do formulário, a
 * policy continuaria recusando a pasta alheia — mas a mensagem de erro seria de permissão, para uma
 * tentativa que o servidor nunca deveria ter montado. Derivar aqui torna a escrita no caminho errado
 * **impossível de expressar**, em vez de apenas negada.
 *
 * ⚠️ **E É SEMPRE O MESMO ARQUIVO, `<auth_user_id>/avatar`.** Nome novo a cada envio deixaria uma
 * foto antiga por envio dentro do balde, e não há policy de DELETE para limpá-las (regra 4). Com
 * caminho fixo e `upsert`, o lixo fica limitado a **um arquivo por conta** — medido em 29/09/2026,
 * e guardado por `tests/invariantes/rls/avatar-no-storage.test.ts`.
 */
async function quemPede() {
  const supabase = await criarClienteDeServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, authUserId: user.id, caminhoDaFoto: `${user.id}/avatar` };
}

function revalidar(): void {
  // A casca lê nome e foto em TODA tela, então o que muda aqui muda no cabeçalho de todas.
  revalidatePath("/", "layout");
}

/** Edita o próprio nome de exibição (`FR-020`). */
export async function editarProprioCadastro(entrada: unknown): Promise<ResultadoDePerfil> {
  const conferido = esquemaDoProprioCadastro.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const sessao = await quemPede();
  if (!sessao) return falha("Sua sessão expirou. Entre de novo.");

  const { error } = await sessao.supabase
    .from("usuarios")
    .update({ nome_exibicao: conferido.data.nomeExibicao })
    .eq("auth_user_id", sessao.authUserId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}

/**
 * Envia a foto e liga o caminho ao cadastro (`FR-012`).
 *
 * ⚠️ **SÃO DUAS ESCRITAS E A ORDEM IMPORTA: o arquivo primeiro, a coluna depois.** Ao contrário, um
 * envio que falhasse deixaria `avatar_caminho` apontando para arquivo que não existe, e a tela
 * mostraria um buraco em vez das iniciais. Nesta ordem, a falha do arquivo não muda nada, e a falha
 * da coluna deixa no balde um arquivo que ninguém referencia — que é o mesmo lixo limitado a um por
 * conta que o envio seguinte sobrescreve.
 */
export async function enviarFoto(dados: FormData): Promise<ResultadoDePerfil> {
  const arquivo = dados.get("foto");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return falha("Escolha um arquivo de imagem.");
  }

  const conferido = esquemaDaFoto.safeParse({ tipo: arquivo.type, tamanho: arquivo.size });
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const sessao = await quemPede();
  if (!sessao) return falha("Sua sessão expirou. Entre de novo.");

  const { error: erroDoArquivo } = await sessao.supabase.storage
    .from(BALDE_DE_AVATARES)
    .upload(sessao.caminhoDaFoto, arquivo, { contentType: arquivo.type, upsert: true });

  if (erroDoArquivo) {
    // ⚠️ A recusa do Storage vem por HTTP, não como código do PostgreSQL — `traduzirRecusa` não a
    //    entende. As três formas estão medidas em `avatar-no-storage.test.ts`: `413` grande demais,
    //    `415` tipo errado, `403` pasta alheia. As duas primeiras o esquema acima já teria pegado;
    //    chegar aqui significa que o bucket é mais estrito que o esquema, e a frase diz isso.
    return falha(`Não foi possível enviar a foto: ${erroDoArquivo.message}`);
  }

  const { error } = await sessao.supabase
    .from("usuarios")
    .update({ avatar_caminho: sessao.caminhoDaFoto })
    .eq("auth_user_id", sessao.authUserId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}

/**
 * Remove a foto, e a tela volta às iniciais (`FR-014`, `FR-010`).
 *
 * ⚠️ **ELA NÃO APAGA O ARQUIVO, E ISSO ESTÁ DECLARADO, NÃO ESQUECIDO.** A regra 4 do `CLAUDE.md`
 * proíbe policy `FOR DELETE` sem discussão, e a exceção é nominal, de Bernardo. Sem ela, a sessão da
 * pessoa não apaga objeto no balde.
 *
 * ⚠️ **E CHAMAR `remove()` AQUI SERIA PIOR QUE NÃO CHAMAR.** Medido em 29/09/2026: sem policy de
 * DELETE, o Storage devolve **`error: null` e uma lista vazia** de removidos — não erro. Um código
 * que fizesse `if (!error) avisar("foto removida")` estaria mentindo, e ninguém descobriria. O
 * requisito é *"voltar às iniciais"*, e é o que anular a coluna entrega; o arquivo fica, **um por
 * conta**, sobrescrito no envio seguinte, invisível porque o balde é privado e ninguém pede o
 * endereço dele.
 */
export async function removerFoto(): Promise<ResultadoDePerfil> {
  const sessao = await quemPede();
  if (!sessao) return falha("Sua sessão expirou. Entre de novo.");

  const { error } = await sessao.supabase
    .from("usuarios")
    .update({ avatar_caminho: null })
    .eq("auth_user_id", sessao.authUserId);

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidar();
  return { ok: true };
}

/**
 * Troca a **própria** senha (`FR-030` a `FR-032`).
 *
 * ⚠️ **QUEM IMPÕE O MÍNIMO É O SERVIDOR DE AUTENTICAÇÃO, não este código.**
 * `minimum_password_length = 12` vive em `supabase/config.toml`, e
 * `tests/invariantes/rls/politica-de-senha.test.ts` prova pelo caminho real que `PUT /auth/v1/user`
 * recusa 11 caracteres com `422 weak_password`. A conferência abaixo existe para a recusa chegar
 * **em português**, e não como a frase estrangeira da plataforma — foi o defeito do Épico 3, em que
 * o 12 existia só no formulário, que ensinou a separar as duas coisas.
 *
 * ⚠️ **NÃO PEDE A SENHA ATUAL, e é decisão do desenho, não esquecimento.** Quem chega aqui já tem
 * sessão válida — o token no navegador é a prova de identidade que a senha atual reconfirmaria. A
 * defesa contra sessão esquecida aberta é **sair**, que esta mesma fatia acabou de entregar.
 *
 * ⚠️ **ESTA AÇÃO SERVIRÁ TAMBÉM À TROCA OBRIGATÓRIA DO PR 2**, quando a marca em `app_metadata`
 * mandar a pessoa para cá no login seguinte. Escrever uma segunda ação lá seria escrever duas.
 */
export async function trocarPropriaSenha(entrada: unknown): Promise<ResultadoDePerfil> {
  const conferido = esquemaDaPropriaSenha.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const veredito = conferirConfirmacao(conferido.data.senha, conferido.data.confirmacao);
  if (!veredito.aceita) return falha(veredito.motivo);

  const sessao = await quemPede();
  if (!sessao) return falha("Sua sessão expirou. Entre de novo.");

  const { error } = await sessao.supabase.auth.updateUser({ password: conferido.data.senha });
  if (error) {
    // ⚠️ A recusa vem do servidor de autenticação, em inglês. Traduzir o caso conhecido e repassar
    //    o resto é o que evita tanto a frase estrangeira quanto a mensagem genérica que esconde a
    //    causa.
    if (/weak.?password|at least/i.test(error.message)) return falha(regraDaSenhaEmPortugues());
    return falha(`Não foi possível trocar a senha: ${error.message}`);
  }

  return { ok: true };
}

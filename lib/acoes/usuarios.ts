"use server";

/**
 * Server Actions de gestão de usuários.
 *
 * ⚠️ SERVER ACTION É ENDPOINT HTTP DE FATO. `safeParse` na primeira linha de cada uma, sem
 * exceção — quem chama pode ser a tela ou pode ser `curl`.
 *
 * ⚠️ ESTE É O PRIMEIRO CONSUMIDOR REAL DE `lib/supabase/admin.ts` no projeto. A `service_role`
 * ignora a RLS inteira, e o convite é um dos três usos autorizados (BRIEF §3). Ela aparece aqui e
 * em nenhum outro lugar desta fatia: se uma tela precisou dela para funcionar, a policy está
 * errada — conserte a policy (Princípio XI).
 */
import { revalidatePath } from "next/cache";

import { urlDaAplicacao } from "@/lib/ambiente";
import { criarClienteAdministrativo } from "@/lib/supabase/admin";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeConvite,
  esquemaDeDesativacao,
  esquemaDeEdicao,
  esquemaDeRecuperacao,
  esquemaDeReenvio,
} from "@/lib/validacao/usuarios";

export type Resultado = { readonly ok: true } | { readonly ok: false; readonly erro: string };

const falha = (erro: string): Resultado => ({ ok: false, erro });
const sucesso: Resultado = { ok: true };

/**
 * Confere que quem chama é Admin — **perguntando ao banco**, não confiando no que a tela mandou.
 *
 * A RLS já protege cada tabela; esta conferência existe para que a ação recuse cedo, com mensagem
 * legível, em vez de deixar a `service_role` executar um convite que o perfil não podia pedir.
 */
async function exigirAdmin(): Promise<Resultado> {
  const supabase = await criarClienteDeServidor();
  const { data, error } = await supabase.rpc("eh_admin" as never);
  if (error) {
    // A função vive no schema `app`, que o PostgREST não expõe. Caímos para a leitura da própria
    // linha, que a policy `usuarios_ler` permite — e que a RLS já restringe ao próprio usuário.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return falha("Sessão ausente.");
    const { data: linha } = await supabase
      .from("usuarios")
      .select("perfil")
      .eq("auth_user_id", user.id)
      .eq("status", "ativo")
      .maybeSingle();
    return linha?.perfil === "admin" ? sucesso : falha("Ação restrita ao perfil Admin.");
  }
  return data === true ? sucesso : falha("Ação restrita ao perfil Admin.");
}

/**
 * Convida alguém. A ordem das duas escritas é o contrato, não preferência.
 *
 * ⚠️ **1. INSERT em `usuarios`. 2. convite pela plataforma.** Nunca o inverso.
 *
 * A ordem inversa produz **credencial sem linha** — o único dos dois estados de inconsistência que
 * não alcança nada **e** não aparece na tela de usuários. Invisível é pior que incompleto.
 *
 * ⚠️ **A falha do passo 2 NÃO é compensada, e isso é desenho.** O estado resultante é "linha com
 * perfil, sem credencial", que é exatamente o estado legítimo do FR-008: a janela em que o Admin
 * ainda revisa. O caminho de saída já existe e é `reenviarConvite`. Compensar seria apagar linha,
 * contra a regra 4 do CLAUDE.md.
 */
export async function convidar(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeConvite.safeParse(dados);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { nome, email, perfil, escopoCurso, cursos } = conferido.data;
  const supabase = await criarClienteDeServidor();

  // FR-012: e-mail com conta ativa não recebe segundo convite, e não vira duplicata.
  const { data: existente } = await supabase
    .from("usuarios")
    .select("id, auth_user_id, status")
    .eq("email", email)
    .maybeSingle();
  if (existente?.status === "ativo" && existente.auth_user_id) {
    return falha("Já existe conta ativa para este e-mail.");
  }
  if (existente) {
    return falha("Já existe convite pendente para este e-mail. Use “reenviar convite”.");
  }

  // ---------------------------------------------------------------- passo 1
  const { data: linha, error: erroLinha } = await supabase
    .from("usuarios")
    .insert({
      codigo: `USR-${Date.now().toString(36).toUpperCase()}`,
      email,
      nome,
      perfil,
      escopo_curso: escopoCurso,
      // auth_user_id fica NULO de propósito: é a janela do FR-008.
    })
    .select("id")
    .single();
  if (erroLinha || !linha) return falha(erroLinha?.message ?? "Não foi possível cadastrar.");

  for (const cursoId of cursos) {
    await supabase.from("usuario_curso").insert({
      codigo: `UC-${linha.id.slice(0, 8)}-${cursoId.slice(0, 8)}`,
      usuario_id: linha.id,
      curso_id: cursoId,
    });
  }

  // ---------------------------------------------------------------- passo 2
  const admin = criarClienteAdministrativo();
  const { error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${urlDaAplicacao()}/convite`,
  });
  if (erroConvite) {
    // Sem compensação. Ver o comentário do cabeçalho desta função.
    return falha(
      `Cadastro criado, mas o convite não pôde ser enviado: ${erroConvite.message}. ` +
        "Use “reenviar convite” — o cadastro está lá, sem credencial, e não alcança nada.",
    );
  }

  revalidatePath("/admin/usuarios");
  return sucesso;
}

/**
 * Traduz o erro da API de autenticação para português (`RNF-USA-…`, e o padrão de mensagem do
 * resto deste arquivo).
 *
 * ⚠️ **A MENSAGEM DA PLATAFORMA NÃO CHEGA MAIS À TELA.** Ela vem em inglês, fala de conceito da
 * plataforma e não do domínio — *"A user with this email address has already been registered"* não
 * diz a quem lê o que fazer a seguir. O sistema inteiro fala português, e o `CLAUDE.md` trata isso
 * como regra, não preferência.
 *
 * ⚠️ **O CÓDIGO É O DISCRIMINADOR, NUNCA O TEXTO.** Casar por trecho da mensagem quebraria em
 * silêncio na primeira vez que a plataforma reescrevesse a frase — e quebraria devolvendo o texto
 * genérico, que é o modo de falha mais difícil de notar. `AuthError.code` é campo estável.
 *
 * ⚠️ **O PADRÃO DEVOLVE TEXTO GENÉRICO DE PROPÓSITO, e o original vai para o log do servidor.**
 * Repassar a mensagem desconhecida seria o mesmo vazamento, só que com mais passos.
 */
function erroDeConviteEmPortugues(erro: {
  readonly code?: string | undefined;
  readonly message: string;
}): string {
  switch (erro.code) {
    // O e-mail já tem credencial. É a MESMA frase da guarda por `auth_user_id` logo acima, e a
    // repetição é intencional: os dois caminhos descrevem o mesmo estado para quem lê.
    case "email_exists":
      return "Esta conta já tem credencial. Use recuperação de senha.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Muitos envios em pouco tempo. Aguarde alguns minutos e tente de novo.";
    case "email_address_invalid":
      return "O e-mail cadastrado não é válido. Corrija o cadastro antes de reenviar.";
    case "email_address_not_authorized":
      return "Este e-mail não é aceito pelo provedor de envio.";
    case "email_provider_disabled":
      return "O envio de e-mail está desligado neste ambiente.";
    case "user_not_found":
      return "Usuário não encontrado.";
    case "validation_failed":
      return "Dados inválidos.";
    default:
      // O que a pessoa vê é português; o que a investigação precisa fica no log do servidor.
      console.error("[reenviarConvite] erro não mapeado da API de autenticação:", erro);
      return "Não foi possível reenviar o convite. Tente de novo em alguns minutos.";
  }
}

/**
 * Reenvia o convite. O link anterior deixa de valer — quem emite o novo é a plataforma.
 *
 * ⚠️ **`inviteUserByEmail` É A ROTINA CERTA, E FOI MEDIDO.** A suspeita natural é que ela falhe
 * por tentar recriar quem já existe, e **não é isso**. Medido no stack local em 14/09/2026, para um
 * usuário já convidado e **ainda não confirmado** — que é o estado "convite enviado":
 *
 *   inviteUserByEmail            -> ok, e o e-mail CHEGA (a caixa vai de 1 para 2)
 *   generateLink({type:"invite"}) -> ok, devolve `action_link`, e NÃO ENVIA NADA (a caixa não muda)
 *
 * ⚠️ **TROCAR POR `generateLink` QUEBRARIA O REENVIO PARECENDO CONSERTÁ-LO:** a ação passaria a
 * devolver sucesso sem que e-mail nenhum saísse, e ninguém descobriria até alguém reclamar que o
 * convite não chegou. É o pior desfecho possível para esta correção.
 *
 * ⚠️ **O `email_exists` SÓ APARECE PARA USUÁRIO CONFIRMADO** — medido: com a conta confirmada,
 * tanto `inviteUserByEmail` quanto `generateLink({type:"invite"})` devolvem `422 email_exists`.
 * Quem chega aqui nesse estado passou pela guarda de `auth_user_id` porque **a coluna estava
 * vazia**, e é o defeito que o `FR-010` corrige à parte. Aqui a resposta deixa de ser a frase em
 * inglês da plataforma e passa a ser a mesma frase em português da guarda.
 */
export async function reenviarConvite(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeReenvio.safeParse(dados);
  if (!conferido.success) return falha("Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const supabase = await criarClienteDeServidor();
  const { data: linha } = await supabase
    .from("usuarios")
    .select("email, auth_user_id")
    .eq("id", conferido.data.usuarioId)
    .maybeSingle();
  if (!linha) return falha("Usuário não encontrado.");
  if (linha.auth_user_id) return falha("Esta conta já tem credencial. Use recuperação de senha.");

  const admin = criarClienteAdministrativo();
  const { error } = await admin.auth.admin.inviteUserByEmail(linha.email, {
    redirectTo: `${urlDaAplicacao()}/convite`,
  });
  if (error) return falha(erroDeConviteEmPortugues(error));

  revalidatePath("/admin/usuarios");
  return sucesso;
}

/**
 * Desativa — **exclusão lógica**, nunca remoção (FR-015).
 *
 * O efeito é imediato e não depende de sessão: `app.usuario_atual()` filtra por `status = 'ativo'`,
 * então o token que a pessoa já tem no navegador para de resolver na consulta seguinte.
 *
 * ⚠️ A proteção do último Admin é conferida **no banco**, por gatilho. A conferência aqui é
 * cortesia — dá mensagem legível antes de o banco recusar. Quem chamar por fora não a tem, e é
 * por isso que ela não pode ser a única.
 */
export async function desativar(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeDesativacao.safeParse(dados);
  if (!conferido.success) return falha("Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ status: "inativo" })
    .eq("id", conferido.data.usuarioId);
  if (error) return falha(error.message);

  revalidatePath("/admin/usuarios");
  return sucesso;
}

/** Edita perfil, escopo e vínculos de curso. O gatilho anti-escalonamento vigia o resto. */
export async function editarPerfilEEscopo(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeEdicao.safeParse(dados);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { usuarioId, perfil, escopoCurso, cursos } = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { error } = await supabase
    .from("usuarios")
    .update({ perfil, escopo_curso: escopoCurso })
    .eq("id", usuarioId);
  if (error) return falha(error.message);

  // Vínculos: o conjunto informado passa a ser o conjunto vigente.
  await supabase.from("usuario_curso").delete().eq("usuario_id", usuarioId);
  for (const cursoId of cursos) {
    await supabase.from("usuario_curso").insert({
      codigo: `UC-${usuarioId.slice(0, 8)}-${cursoId.slice(0, 8)}`,
      usuario_id: usuarioId,
      curso_id: cursoId,
    });
  }

  revalidatePath("/admin/usuarios");
  return sucesso;
}

/**
 * Recuperação de senha.
 *
 * ⚠️ A RESPOSTA É A MESMA EXISTA OU NÃO A CONTA (FR-019). Se ela variasse, a tela viraria oráculo
 * de quem tem acesso ao sistema — bastaria testar endereços para levantar o quadro de pessoal.
 * O e-mail só sai para linha **ativa**: credencial órfã não recupera acesso.
 *
 * ⚠️ Por isso esta função devolve `sucesso` em TODOS os caminhos, inclusive quando não faz nada.
 * Não é descuido; é o requisito.
 */
export async function recuperarSenha(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeRecuperacao.safeParse(dados);
  if (!conferido.success) return sucesso; // nem o formato do e-mail é revelado

  const admin = criarClienteAdministrativo();
  const { data: linha } = await admin
    .from("usuarios")
    .select("id")
    .eq("email", conferido.data.email)
    .eq("status", "ativo")
    .not("auth_user_id", "is", null)
    .maybeSingle();

  if (linha) {
    await admin.auth.resetPasswordForEmail(conferido.data.email, {
      redirectTo: `${urlDaAplicacao()}/recuperar-senha`,
    });
  }

  return sucesso;
}

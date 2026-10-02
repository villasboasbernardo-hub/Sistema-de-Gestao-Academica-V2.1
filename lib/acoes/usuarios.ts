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
import { randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";

import { urlDaAplicacao } from "@/lib/ambiente";
import { gerarSenhaTemporaria } from "@/lib/dominio/senha-gerada";
import { vereditoSobreConta } from "@/lib/dominio/ultimo-admin";
import { criarClienteAdministrativo } from "@/lib/supabase/admin";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeConvite,
  esquemaDeDesativacao,
  esquemaDeEdicao,
  esquemaDeEdicaoDeNome,
  esquemaDeRecuperacao,
  esquemaDeRedefinicao,
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

/** As seis ações que a trilha de `auditoria_de_conta` aceita (`FR-047`, CHECK do banco). */
type AcaoRegistrada =
  "editar_perfil" | "editar_nome" | "redefinir_senha" | "desativar" | "reativar" | "excluir";

/**
 * Grava a linha da trilha (`FR-047`).
 *
 * ⚠️ **ELA NÃO RECEBE O AUTOR, E ISSO É O PONTO.** `app.registrar_acao_em_conta` lê `auth.uid()`
 * **dentro** dela: receber o autor por parâmetro faria da trilha um campo preenchível, e é o modo de
 * falha já medido nesta base — `set_auditoria()` gravava `criado_por` mandado pelo cliente, achado na
 * fatia (c) do Épico 5.
 *
 * ⚠️ **VAI PELA SESSÃO DE QUEM PEDIU, NUNCA pela `service_role`** — que não tem `usage` no schema
 * `app` (medido na fatia (b)). O porteiro de Admin está dentro da função, no banco.
 *
 * ⚠️ **A FALHA DO RASTRO NÃO DESFAZ A AÇÃO, e isso é declarado.** A ação já aconteceu; abortar aqui
 * deixaria o sistema mentindo para quem clicou. O que ela faz é devolver a falha para que a tela
 * diga que a ação valeu **e** o rastro não foi gravado — estado incompleto, nunca invisível.
 */
async function registrarNaTrilha(
  contaAlvoId: string,
  acao: AcaoRegistrada,
  contaAlvoCodigo?: string,
): Promise<string | null> {
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.rpc(
    "registrar_acao_em_conta" as never,
    {
      p_conta_alvo_id: contaAlvoId,
      p_acao: acao,
      p_conta_alvo_codigo: contaAlvoCodigo ?? null,
    } as never,
  );
  return error ? error.message : null;
}

/**
 * Quem está pedindo — o `usuarios.id` da própria conta, que é o que a `FR-041` compara.
 *
 * ⚠️ **É `usuarios.id`, NÃO `auth.uid()`.** A tela manda o `id` da linha de `usuarios`, e comparar
 * com o `auth_user_id` daria sempre "diferente": o Admin passaria a poder rebaixar a si mesmo, com a
 * guarda no lugar e sem nada acusando.
 */
async function minhaContaId(): Promise<string | null> {
  const supabase = await criarClienteDeServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Os Admins **ativos**, para a regra pura do último Admin (`FR-042`).
 *
 * ⚠️ **LÊ PELA SESSÃO, e o Admin vê todas as linhas de `usuarios`** — é a policy `usuarios_ler`
 * somada a `app.pode('usuarios','ler')`. Usar a `service_role` aqui funcionaria e esconderia o dia em
 * que a policy mudasse.
 */
async function adminsAtivos(): Promise<readonly { readonly id: string }[]> {
  const supabase = await criarClienteDeServidor();
  const { data } = await supabase
    .from("usuarios")
    .select("id")
    .eq("perfil", "admin")
    .eq("status", "ativo");
  return data ?? [];
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

  const { usuarioId } = conferido.data;

  // ⚠️ A REGRA PURA ANTES DA ESCRITA, e ela NÃO substitui o gatilho: o banco continua sendo a
  //    garantia. Esta conferência existe para a mensagem ser legível e para a tela não oferecer o
  //    que vai ser recusado (`FR-041` a `FR-043`).
  const eu = await minhaContaId();
  if (!eu) return falha("Sua sessão expirou. Entre de novo.");
  const veredito = vereditoSobreConta("desativar", usuarioId, eu, await adminsAtivos());
  if (!veredito.permitido) return falha(veredito.motivo);

  const supabase = await criarClienteDeServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ status: "inativo" })
    .eq("id", usuarioId);
  if (error) return falha(error.message);

  const erroDoRastro = await registrarNaTrilha(usuarioId, "desativar");
  revalidatePath("/admin/usuarios");
  if (erroDoRastro) return falha(`A conta foi desativada, mas o rastro falhou: ${erroDoRastro}`);
  return sucesso;
}

/**
 * Reativa uma conta desativada (`FR-045`).
 *
 * ⚠️ **SOB A MESMA PERMISSÃO DE DESATIVAR, e NENHUMA ação nova na matriz** (decisão **D-6** de
 * Bernardo Villas Boas, 29/09/2026). A matriz `perfil_permissao` segue com quatro ações — `criar`,
 * `desativar`, `editar`, `ler` — e a asserção existente de **zero** `reativar` fica **intacta**.
 * Criar uma ação nova obrigaria a semear 9 perfis × 14 recursos para um verbo que é o desfazer de
 * outro.
 */
export async function reativar(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeDesativacao.safeParse(dados);
  if (!conferido.success) return falha("Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { usuarioId } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase.from("usuarios").update({ status: "ativo" }).eq("id", usuarioId);
  if (error) return falha(error.message);

  const erroDoRastro = await registrarNaTrilha(usuarioId, "reativar");
  revalidatePath("/admin/usuarios");
  if (erroDoRastro) return falha(`A conta foi reativada, mas o rastro falhou: ${erroDoRastro}`);
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

  // ⚠️ **REBAIXAR É O CASO QUE A CONTAGEM SOZINHA NÃO PEGA.** Trocar o perfil de `admin` para
  //    qualquer outro deixa a conta ATIVA e o sistema sem Admin — uma regra escrita só sobre
  //    `status` passaria por aqui. A conferência só vale quando o perfil novo NÃO é admin: trocar o
  //    escopo de um Admin, mantendo-o Admin, não mexe no chão da `FR-042`.
  if (perfil !== "admin") {
    const eu = await minhaContaId();
    if (!eu) return falha("Sua sessão expirou. Entre de novo.");
    const veredito = vereditoSobreConta("rebaixar", usuarioId, eu, await adminsAtivos());
    if (!veredito.permitido) return falha(veredito.motivo);
  }

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

  const erroDoRastro = await registrarNaTrilha(usuarioId, "editar_perfil");
  revalidatePath("/admin/usuarios");
  if (erroDoRastro) return falha(`O perfil foi trocado, mas o rastro falhou: ${erroDoRastro}`);
  return sucesso;
}

/**
 * Edita o **nome de exibição** de outra conta (`FR-040`).
 *
 * ⚠️ **AÇÃO PRÓPRIA, NÃO UM CAMPO A MAIS EM `editarPerfilEEscopo`**, porque a trilha distingue
 * `editar_nome` de `editar_perfil` (`FR-047`). Juntá-las faria toda correção de grafia de nome
 * registrar troca de perfil, e quem lesse o rastro veria mudança de permissão que não houve.
 *
 * ⚠️ **SEM A CHAVE PRIVILEGIADA.** A policy `usuarios_editar` já deixa quem tem `usuarios.editar`
 * escrever na linha de outro; se precisasse da `service_role`, a policy estaria errada — e o conserto
 * seria a policy (Princípio XI).
 */
export async function editarNomeDeConta(dados: unknown): Promise<Resultado> {
  const conferido = esquemaDeEdicaoDeNome.safeParse(dados);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { usuarioId, nomeExibicao } = conferido.data;
  const supabase = await criarClienteDeServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ nome_exibicao: nomeExibicao })
    .eq("id", usuarioId);
  if (error) return falha(error.message);

  const erroDoRastro = await registrarNaTrilha(usuarioId, "editar_nome");
  revalidatePath("/admin/usuarios");
  if (erroDoRastro) return falha(`O nome foi gravado, mas o rastro falhou: ${erroDoRastro}`);
  return sucesso;
}

/**
 * Redefine a senha de outra conta (`FR-033` a `FR-038`).
 *
 * ⚠️ **A SENHA É DEVOLVIDA UMA VEZ, NO RETORNO, E NÃO VAI PARA LUGAR NENHUM** (`FR-034`): nem para
 * coluna, nem para log, nem para o endereço. Recarregar a tela a perde, e o caminho de quem perdeu é
 * redefinir de novo. Guardá-la "para o caso de" seria guardar credencial em claro.
 *
 * ⚠️ **ESTA É A ÚNICA AÇÃO DESTA FATIA QUE PRECISA DA `service_role`**, e o motivo é estrutural:
 * trocar a senha de OUTRA pessoa é `auth.admin.updateUserById`, que não existe para sessão de
 * usuário. É o uso autorizado nº 1 do BRIEF §3, e vive **neste arquivo** porque é o que o
 * `no-restricted-imports` já permite — pôr noutro exigiria um terceiro furo na lista, que hoje tem
 * **dois** nomes.
 *
 * ⚠️ **A PLATAFORMA JÁ DERRUBA TODAS AS SESSÕES ABERTAS** (`FR-038`, decisão **D-4**): medido em
 * 29/09/2026, `admin.updateUserById(id, { password })` leva os refresh tokens da conta de 2 a 0. **Não
 * há etapa de revogação a escrever** — e revogar por SQL não funciona nem com a `service_role`, que
 * não tem o privilégio. O que existe é a **prova** de que continua assim.
 *
 * ⚠️ **A MARCA DA TROCA OBRIGATÓRIA VAI EM `app_metadata`, NÃO em `user_metadata`** (`FR-035`): o
 * segundo é **escrevível pelo próprio usuário** por chamada direta à API de auth, e a pessoa obrigada
 * a trocar a senha apagaria a própria obrigação.
 */
export async function redefinirSenha(
  dados: unknown,
): Promise<Resultado | { readonly ok: true; readonly senha: string }> {
  const conferido = esquemaDeRedefinicao.safeParse(dados);
  if (!conferido.success) return falha("Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { usuarioId } = conferido.data;

  // ⚠️ Redefinir a PRÓPRIA senha não é esta ação — é `/perfil/senha`, que não precisa de Admin. A
  //    recusa aqui evita que o Admin se obrigue a trocar a senha e caia na própria armadilha.
  const eu = await minhaContaId();
  if (!eu) return falha("Sua sessão expirou. Entre de novo.");
  if (eu === usuarioId) {
    return falha(
      "Para trocar a sua própria senha, use «Trocar a minha senha» no seu perfil — " +
        "assim você escolhe a senha em vez de receber uma temporária.",
    );
  }

  const admin = criarClienteAdministrativo();
  const { data: alvo } = await admin
    .from("usuarios")
    .select("auth_user_id, codigo")
    .eq("id", usuarioId)
    .maybeSingle();

  if (!alvo) return falha("Conta não encontrada.");
  if (!alvo.auth_user_id) {
    return falha(
      "Esta conta ainda não tem credencial — o convite não foi concluído. " +
        "Use «Reenviar convite» em vez de redefinir a senha.",
    );
  }

  const senha = gerarSenhaTemporaria((n) => randomInt(n));

  const { error } = await admin.auth.admin.updateUserById(alvo.auth_user_id, {
    password: senha,
    app_metadata: { trocar_senha: true },
  });
  if (error) return falha(error.message);

  const erroDoRastro = await registrarNaTrilha(usuarioId, "redefinir_senha", alvo.codigo);
  revalidatePath("/admin/usuarios");
  if (erroDoRastro) return falha(`A senha foi redefinida, mas o rastro falhou: ${erroDoRastro}`);

  return { ok: true, senha };
}

/**
 * Tira a obrigação de trocar senha da **própria** conta de quem chama (`FR-037`).
 *
 * ⚠️ **ELA NÃO RECEBE PARÂMETRO, E ISSO É A AUTORIZAÇÃO.** Server Action é endpoint HTTP de fato:
 * se ela aceitasse um `authUserId`, qualquer sessão autenticada limparia a obrigação de **qualquer
 * conta**. Sem parâmetro, o único alvo possível é a linha de quem está autenticado.
 *
 * ⚠️ **ELA VIVE AQUI, E NÃO EM `lib/acoes/perfil.ts`, POR CAUSA DO LINT — e isso é desenho, não
 * contorno.** `app_metadata` só se escreve com a `service_role`, e o `no-restricted-imports`
 * autoriza **dois** arquivos. Pôr a limpeza em `perfil.ts` exigiria um **terceiro** furo na lista, e
 * a decisão do plano foi explícita em manter dois.
 *
 * ⚠️ **O QUE ELA GARANTE E O QUE NÃO GARANTE, dito de frente.** Ela garante que **ninguém limpa a
 * obrigação de outra pessoa** e que o **cliente não limpa a sua** por chamada direta à API de auth —
 * que é a razão de a marca morar em `app_metadata` e não em `user_metadata`. Ela **não** garante que
 * o dono da conta não possa pular o aviso chamando-a sozinha: quem tem a senha temporária já tem a
 * conta inteira, então pular o aviso não concede nada que ele já não tivesse. A obrigação é guarda de
 * percurso (`FR-036`), não fronteira de autorização.
 */
export async function concluirObrigacaoDeTrocarSenha(): Promise<Resultado> {
  const supabase = await criarClienteDeServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return falha("Sessão ausente.");

  const admin = criarClienteAdministrativo();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { trocar_senha: false },
  });
  if (error) return falha(error.message);
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

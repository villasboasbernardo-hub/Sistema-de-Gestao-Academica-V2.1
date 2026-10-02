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

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { urlDaAplicacao } from "@/lib/ambiente";
import { conferirExigenciasDoPerfil } from "@/lib/dominio/exigencias-do-perfil";
import { gerarSenhaTemporaria } from "@/lib/dominio/senha-gerada";
import { vereditoSobreConta } from "@/lib/dominio/ultimo-admin";
import { criarClienteAdministrativo } from "@/lib/supabase/admin";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import {
  esquemaDeCadastro,
  esquemaDeDesativacao,
  esquemaDeEdicao,
  esquemaDeEdicaoDeNome,
  esquemaDeRecuperacao,
  esquemaDeRedefinicao,
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
 * Cadastra a conta **direto**, com senha temporária gerada no servidor (`FR-033`, `FR-035`).
 *
 * ⚠️ **ELA SUBSTITUI `convidar`, E O CONVITE POR E-MAIL SAIU DO SISTEMA** *(decisão de Bernardo
 * Villas Boas, 03/10/2026, reprovando a conferência do PR 2)*: *"Admin CADASTRA usuário direto (sem
 * convite por e-mail) … o admin repassa em mãos."* Não há SMTP a configurar, não há link a expirar, e
 * não há mais o estado *"cadastro sem credencial"* que o `FR-008` descrevia — a conta nasce inteira.
 *
 * ⚠️ **A ORDEM É CREDENCIAL PRIMEIRO, CADASTRO DEPOIS — E ELA É O INVERSO DA DO `convidar`.** Aquela
 * gravava a linha antes porque o passo 2 podia falhar e o estado resultante — *linha sem credencial* —
 * era **legítimo e recuperável** por «reenviar convite». ⚠️ **Aqui esse estado deixou de ter saída**:
 * sem convite, uma linha sem credencial é conta que ninguém consegue usar e que nenhuma tela conserta.
 * Então a credencial vem primeiro, e se a linha falhar a credencial é **desfeita**.
 *
 * ⚠️ **DESFAZER A CREDENCIAL NÃO É EXCEÇÃO À REGRA 4, e a distinção já está no `CLAUDE.md`:**
 * *"A CÓPIA NÃO TRAZ O SCHEMA `auth` — credencial não é cadastro."* A regra 4 protege **registro do
 * domínio acadêmico**; o que se apaga aqui é uma credencial criada há milissegundos, sem uma única
 * linha de histórico por construção. **Nada em `public` é apagado em nenhum caminho desta função.**
 *
 * ⚠️ **A SENHA É DEVOLVIDA UMA VEZ E NÃO VAI PARA LUGAR NENHUM** (`FR-034`) — nem coluna, nem log,
 * nem endereço. É o mesmo gerador de `redefinirSenha`, o mesmo alfabeto sem caracteres ambíguos e o
 * mesmo comprimento: duplicar a geração aqui faria duas políticas de senha divergirem com o tempo.
 *
 * ⚠️ **E A CONTA NASCE OBRIGADA A TROCAR** (`FR-035`), com a marca em `app_metadata` — que o próprio
 * usuário **não** escreve. O percurso do primeiro acesso é o **mesmo** do PR 2, sem uma linha nova:
 * `renovarSessao` já devolve quem tem a marca para `/perfil/senha`, e `trocarPropriaSenha` já a limpa.
 */
export async function cadastrarUsuario(
  dados: unknown,
): Promise<Resultado | { readonly ok: true; readonly senha: string; readonly usuarioId: string }> {
  const conferido = esquemaDeCadastro.safeParse(dados);
  if (!conferido.success) return falha(conferido.error.issues[0]?.message ?? "Dados inválidos.");

  const permitido = await exigirAdmin();
  if (!permitido.ok) return permitido;

  const { nome, email, perfil, escopoCurso, cursos, instrutorId } = conferido.data;

  // A exigência por perfil é do domínio, e ela impede a conta que nasce sem ver nada (gotcha 4).
  const exigencia = conferirExigenciasDoPerfil(perfil, cursos.length);
  if (!exigencia.atendida) return falha(exigencia.motivo);

  const admin = criarClienteAdministrativo();

  // ---------------------------------------------------------------- passo 1: a credencial
  const senha = gerarSenhaTemporaria((n) => randomInt(n));
  const { data: criada, error: erroDaCredencial } = await admin.auth.admin.createUser({
    email,
    password: senha,
    // ⚠️ `email_confirm: true` porque NÃO HÁ e-mail de confirmação a mandar. Sem isto a pessoa
    //    recebe a senha em mãos e o Auth recusa o login, dizendo que o e-mail não foi confirmado.
    email_confirm: true,
    app_metadata: { trocar_senha: true },
  });
  if (erroDaCredencial) return falha(erroDeAutenticacaoEmPortugues(erroDaCredencial));

  // ---------------------------------------------------------------- passo 2: o cadastro
  const { data: linha, error: erroDoCadastro } = await admin
    .from("usuarios")
    .insert({
      codigo: `USR-${Date.now().toString(36).toUpperCase()}`,
      auth_user_id: criada.user.id,
      email,
      nome,
      nome_exibicao: nome,
      perfil,
      escopo_curso: escopoCurso,
      instrutor_id: instrutorId,
    })
    .select("id")
    .single();

  if (erroDoCadastro) {
    // Ver o cabeçalho: a credencial recém-criada é desfeita, porque sem cadastro ela não alcança
    // nada e nenhuma tela a conserta. Nada de `public` é tocado.
    await admin.auth.admin.deleteUser(criada.user.id);
    return falha(`A conta não foi criada: ${traduzirRecusa(erroDoCadastro as ErroDoBanco)}`);
  }

  // ---------------------------------------------------------------- passo 3: os vínculos
  for (const cursoId of cursos) {
    await admin.from("usuario_curso").insert({
      codigo: `UC-${linha.id.slice(0, 8)}-${cursoId.slice(0, 8)}`,
      usuario_id: linha.id,
      curso_id: cursoId,
    });
  }

  /*
   * ⚠️ **A CRIAÇÃO NÃO ENTRA NA TRILHA `auditoria_de_conta`, E ISSO É DESENHO.** O `CHECK` dela tem
   * **seis** valores, fixados pela decisão D-2, e nenhum é "cadastrar" — acrescentar um sétimo é
   * decisão de Bernardo, não de quem escreve a ação. ⚠️ **E a criação já é auditável sem ela**: o
   * gatilho `app.set_auditoria()` grava `criado_por` e `criado_em` **na própria linha**, a partir de
   * `auth.uid()`. A trilha responde *"quem mexeu numa conta que já existia"*; quem criou está no
   * quarteto de auditoria da linha criada.
   */

  revalidatePath("/admin/usuarios");
  return { ok: true, senha, usuarioId: linha.id };
}

/**
 * Traduz o erro da API de autenticação para português (`RNF-USA-…`, e o padrão de mensagem do
 * resto deste arquivo).
 *
 * ⚠️ **ELA NASCEU PARA O CONVITE E FICOU, porque o caso que ela mais importa é o MESMO:**
 * `email_exists`. O convite saiu em 03/10/2026; `createUser` devolve o mesmo código quando alguém
 * cadastra um e-mail que já tem conta, e é o erro que de fato acontece na mesa de quem administra.
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
function erroDeAutenticacaoEmPortugues(erro: {
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
      console.error("[auth] erro não mapeado da API de autenticação:", erro);
      return "Não foi possível reenviar o convite. Tente de novo em alguns minutos.";
  }
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

  const { usuarioId, perfil, escopoCurso, cursos, instrutorId } = conferido.data;
  const supabase = await criarClienteDeServidor();

  // A mesma exigência do cadastro: editar para `encarregado_curso` sem vínculo produziria a conta
  // que entra e não vê nada — o mesmo defeito, pelo outro caminho.
  const exigencia = conferirExigenciasDoPerfil(perfil, cursos.length);
  if (!exigencia.atendida) return falha(exigencia.motivo);

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
    .update({ perfil, escopo_curso: escopoCurso, instrutor_id: instrutorId })
    .eq("id", usuarioId);
  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

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

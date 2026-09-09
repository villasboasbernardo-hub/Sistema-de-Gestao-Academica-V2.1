import "server-only";

/**
 * Quem é o usuário desta requisição — lido do BANCO, toda vez.
 *
 * ⚠️ NADA DE PERFIL EM CACHE, e a razão é o requisito mais concreto desta fatia. A desativação de
 * uma conta tem de valer na **requisição seguinte** (FR-015): `app.usuario_atual()` filtra por
 * `status = 'ativo'`, então o token que a pessoa já tem no navegador para de resolver na consulta
 * seguinte. Guardar perfil, escopo ou permissão em cookie ou em memória do servidor manteria a
 * pessoa alcançando o que já lhe foi tirado — e o teste automatizado NÃO pegaria, porque ele abre
 * conexão nova a cada caso.
 *
 * O custo é uma consulta pequena por requisição sobre uma tabela de poucas dezenas de linhas. O
 * benefício é que a única fonte de verdade continua sendo uma só.
 */
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type UsuarioDaSessao = {
  readonly id: string;
  readonly codigo: string;
  readonly email: string;
  readonly nome: string;
  readonly nomeExibicao: string | null;
  readonly perfil: string;
  readonly escopoCurso: string | null;
};

/**
 * Devolve o usuário corrente, ou `null`.
 *
 * `null` cobre TRÊS estados diferentes, e nenhum deles alcança dado:
 *   1. ninguém autenticado;
 *   2. credencial válida sem linha em `usuarios` — o T-09 do documento 22;
 *   3. linha existente com `status = 'inativo'`.
 * Quem chama não precisa distinguir: em todos, a resposta é a mesma.
 */
export async function usuarioDaSessao(): Promise<UsuarioDaSessao | null> {
  const supabase = await criarClienteDeServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // A RLS já restringe a linha; o filtro por `auth_user_id` é o que a identifica.
  const { data } = await supabase
    .from("usuarios")
    .select("id, codigo, email, nome, nome_exibicao, perfil, escopo_curso")
    .eq("auth_user_id", user.id)
    .eq("status", "ativo")
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    codigo: data.codigo,
    email: data.email,
    nome: data.nome,
    nomeExibicao: data.nome_exibicao,
    perfil: data.perfil,
    escopoCurso: data.escopo_curso,
  };
}

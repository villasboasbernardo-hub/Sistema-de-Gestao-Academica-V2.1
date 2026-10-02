"use server";

/**
 * Ações de sessão.
 *
 * ⚠️ `ultimo_acesso` NÃO PODE SER GATILHO. O evento de autenticação acontece no schema de
 * autenticação da plataforma, fora do alcance do domínio — não há `INSERT` nem `UPDATE` nosso
 * para pendurar um gatilho. E não deve ser no proxy, que rodaria a escrita a cada requisição.
 * Fica aqui: uma vez, na autenticação bem-sucedida.
 *
 * ⚠️ A ESCRITA É DO PRÓPRIO USUÁRIO SOBRE A PRÓPRIA LINHA, e passa por dois guardas: a policy
 * `usuarios_editar` e o gatilho `app.impedir_autoescalonamento`. O gatilho bloqueia mudança de
 * `perfil`, `escopo_curso` e `status`, e **não** bloqueia `ultimo_acesso`. Isso está coberto por
 * teste — a lista de colunas protegidas pode crescer, e no dia em que `ultimo_acesso` entrar nela
 * o login quebraria em silêncio.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { criarClienteDeServidor } from "@/lib/supabase/server";

/**
 * Carimba o acesso. Chamada depois da autenticação, e **falha em silêncio de propósito**:
 * não registrar o último acesso é uma perda de auditoria, não motivo para impedir alguém de
 * trabalhar. O que não pode é passar despercebido — daí o teste.
 */
export async function registrarAcesso(): Promise<void> {
  const supabase = await criarClienteDeServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("usuarios")
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq("auth_user_id", user.id);
}

/**
 * Encerra a sessão e leva de volta à entrada (`FR-004` da spec 003; `FR-002` a `FR-004` da 011).
 *
 * ⚠️ **ELA FICOU SEM CONSUMIDOR NENHUM DO ÉPICO 3 ATÉ 29/09/2026** — escrita, correta e
 * inalcançável. Quem entrava pelo preview **não conseguia sair**. O consumidor é
 * `components/casca/menu-do-avatar.tsx`.
 *
 * ⚠️ **O `redirect` É PARTE DA AÇÃO, e não da tela que a chama.** Sem ele, sair deixaria a pessoa
 * na mesma rota, com a casca já renderizada, até a navegação seguinte — e "saí e continuo vendo o
 * sistema" é indistinguível de "não saí". ⚠️ `redirect` funciona lançando: ele MUST ser a última
 * linha, e nada depois dele executa.
 *
 * ⚠️ **`revalidatePath` VEM ANTES do `redirect`** porque a casca é servidor e fica em cache por
 * requisição: sem invalidar, a tela de destino poderia ser montada com o retrato de quem acabou de
 * sair.
 */
export async function encerrarSessao(): Promise<void> {
  const supabase = await criarClienteDeServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

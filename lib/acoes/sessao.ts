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

/** Encerra a sessão (FR-004). */
export async function encerrarSessao(): Promise<void> {
  const supabase = await criarClienteDeServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}

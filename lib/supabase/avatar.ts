import "server-only";

/**
 * O endereço de leitura da foto do avatar (`FR-011`, `FR-015`).
 *
 * ⚠️ **O BALDE É PRIVADO, e é por isso que existe esta função.** Não há URL adivinhável para a foto
 * de ninguém: a leitura passa por um endereço **assinado e temporário**, emitido pelo servidor a
 * cada requisição. O que o banco guarda em `usuarios.avatar_caminho` é o **caminho**, nunca o
 * endereço — guardar um endereço seria guardar algo que vence (decisão D-3, 29/09/2026).
 *
 * ⚠️ **QUEM ASSINA É A SESSÃO DE QUEM PEDE, NÃO A CHAVE PRIVILEGIADA.** O cliente de servidor carrega
 * o JWT da pessoa, então a policy `avatares_ler` decide: o dono, ou quem tem `usuarios.ler`. Usar
 * `lib/supabase/admin.ts` aqui emitiria endereço para foto que quem pediu não pode ver — e seria
 * `service_role` **por requisição de tela**, que o gotcha 2 proíbe sem discussão.
 *
 * ⚠️ **DEGRADAÇÃO SEGURA** (`RN-DEG-01`): caminho nulo, balde fora do ar ou recusa de permissão
 * devolvem `null`, e a tela mostra as iniciais — que é o estado normal de quem não tem foto. Foto
 * que não carrega **nunca** pode impedir alguém de ver o cabeçalho e sair do sistema, que é
 * justamente a função que esta fatia veio entregar.
 */
import { criarClienteDeServidor } from "@/lib/supabase/server";

/** Balde privado das fotos. Criado por `20260929135747_avatar_e_bucket.sql`. */
export const BALDE_DE_AVATARES = "avatares";

/**
 * Meia hora. ⚠️ É mais que a vida de uma tela e menos que a de uma sessão: um endereço vazado por
 * captura de tela ou histórico do navegador para de valer sozinho, sem que ninguém precise agir.
 */
const VALIDADE_EM_SEGUNDOS = 1800;

export async function enderecoDaFoto(caminho: string | null | undefined): Promise<string | null> {
  if (!caminho) return null;

  try {
    const supabase = await criarClienteDeServidor();
    const { data, error } = await supabase.storage
      .from(BALDE_DE_AVATARES)
      .createSignedUrl(caminho, VALIDADE_EM_SEGUNDOS);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

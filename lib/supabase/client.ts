/**
 * Cliente do Supabase para o NAVEGADOR (Client Components).
 *
 * FR-007. Usa apenas a chave pública — o papel `anon`/`authenticated`. Isso é seguro **porque
 * existe RLS**: toda linha ainda passa pelas policies. Se alguma tabela ficar sem RLS, esta chave
 * lê a tabela inteira; daí a regra do BRIEF §2 de que TODA tabela tem `ENABLE ROW LEVEL SECURITY`.
 *
 * NUNCA importe `./admin` daqui. Ver contracts/variaveis-ambiente.md, invariante V-3.
 */
import { createBrowserClient } from "@supabase/ssr";

import { credenciaisPublicasDoSupabase } from "@/lib/ambiente";

export function criarClienteDeNavegador() {
  const { url, chaveAnonima } = credenciaisPublicasDoSupabase();
  return createBrowserClient(url, chaveAnonima);
}

import "server-only";

/**
 * Cliente ADMINISTRATIVO do Supabase. Usa a `service_role`, que **ignora toda a RLS**.
 * Equivale a acesso administrativo ao banco.
 *
 * ─── AS TRÊS DEFESAS (risco R-09) ─────────────────────────────────────────────────────────────
 *   1. `SUPABASE_SERVICE_ROLE_KEY` NUNCA recebe prefixo `NEXT_PUBLIC_` — não vai ao bundle.
 *   2. `import "server-only"` na PRIMEIRA linha deste arquivo. Importá-lo de um Client Component
 *      vira **erro de build**, não aviso — e é por isso que `next build` faz parte da verificação
 *      local: o `tsc` sozinho não vê erro de fronteira.
 *   3. Regra ESLint `no-restricted-imports` sobre `@/lib/supabase/admin` (ver eslint.config.mjs).
 *
 * ─── USOS AUTORIZADOS, E SÓ ESTES TRÊS ────────────────────────────────────────────────────────
 *   1. Convite de usuário pelo Admin — `auth.admin.inviteUserByEmail()` (BRIEF §3);
 *   2. Carga do ETL Sheets → PostgreSQL (Épico 2);
 *   3. Script de manutenção versionado, executado à mão.
 *
 *   **NUNCA por requisição de tela.** Se você precisou disto para uma página funcionar, a policy
 *   está errada — conserte a policy (Princípio XI: o banco é a fronteira).
 *
 * Se a chave vazar: rotacione IMEDIATAMENTE no painel do Supabase. Ela não expira sozinha, e o
 * repositório é público — apagar o commit não desfaz a exposição (FR-002.2).
 */
import { createClient } from "@supabase/supabase-js";

export function criarClienteAdministrativo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveDeServico = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chaveDeServico) {
    throw new Error(
      "Cliente administrativo indisponível: falta NEXT_PUBLIC_SUPABASE_URL ou " +
        "SUPABASE_SERVICE_ROLE_KEY. Esta chave é segredo e nunca tem prefixo NEXT_PUBLIC_.",
    );
  }

  return createClient(url, chaveDeServico, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

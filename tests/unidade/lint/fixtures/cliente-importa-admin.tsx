/**
 * FIXTURE — VIOLA A FRONTEIRA 2 DE PROPÓSITO. Não é código de produção.
 *
 * Um componente de navegador alcançando a `service_role`. É o risco R-09 encenado, para que
 * `tests/unidade/lint/fronteiras.test.ts` prove que a regra o barra (FR-006).
 */
"use client";

// O import resolve em tempo de tipo. Quem tem de barrar isto é o ESLint (fronteira 2) e o
// `server-only` no build — não o compilador.
import { criarClienteAdministrativo } from "@/lib/supabase/admin";

export function PainelIndevido() {
  const cliente = criarClienteAdministrativo();
  return cliente ? null : null;
}

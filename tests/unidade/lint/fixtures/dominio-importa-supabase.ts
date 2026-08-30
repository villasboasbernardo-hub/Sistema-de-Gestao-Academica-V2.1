/**
 * FIXTURE — VIOLA A FRONTEIRA 1 DE PROPÓSITO. Não é código de produção.
 *
 * Insumo de `tests/unidade/lint/fronteiras.test.ts` (FR-006). Este arquivo é isento do lint do
 * repositório (ver eslint.config.mjs, T020) porque tem de ficar quebrado para provar a regra.
 * Se um dia ele parar de acusar erro, a fronteira foi desligada.
 */
// O import resolve em tempo de tipo. O que este fixture viola é a FRONTEIRA, não o tipo —
// e quem tem de acusar é o ESLint, não o compilador.
import { createClient } from "@supabase/supabase-js";

export function calcularCargaHoraria() {
  return createClient;
}

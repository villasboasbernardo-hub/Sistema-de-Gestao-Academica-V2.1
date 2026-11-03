/**
 * RA-4 (Bloco 18, spec 033) — o responsável ou palestrante EXTERNO: nome e OM.
 *
 * > *"Responsável/Palestrante (instrutor cadastrado OU texto livre com nome e OM para externo)"* — Bernardo Villas Boas,
 * > 03/11/2026
 *
 * ⚠️ **O NOME MORA EM `responsavel_externo` E A OM EM `responsavel_externo_om`** (M1): a grade, o papel e as listas
 *    mostram «Nome (OM)»; sem OM, só o nome — como antes do Bloco 18.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
export function externoComOm(nome: string | null | undefined, om: string | null | undefined): string | null {
  const n = nome?.trim() ?? "";
  if (n === "") return null;
  const o = om?.trim() ?? "";
  return o === "" ? n : `${n} (${o})`;
}

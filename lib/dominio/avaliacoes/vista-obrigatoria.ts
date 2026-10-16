/**
 * `RN-AV-13` — a vista de prova é obrigatória pelo INSTRUMENTO (emenda de 15/10/2026 à spec 014; PE acrescentada em
 * 16/10/2026).
 *
 * > *"RN-AV-13: vista é obrigatória só para PM e PO. PP, T e TG não geram alerta de vista; se a planilha trouxer
 * > vista, registra."* — Bernardo Villas Boas, 15/10/2026
 * > *"Vista obrigatória para PM, PO e PE."* — Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O DADO MORA NO BANCO, E SÓ LÁ** (A4 do desenho de 15/10/2026, aprovado em 16/10/2026): a marca
 *    `vista_obrigatoria` em `config_listas.metadados` de cada instrumento de `instrumentos_avaliacao`, posta pela
 *    migration D-9 (`20261016092315`). A tela a recebe pela consulta (`instrumentoDaVista`, abaixo), a sincronização
 *    pelo retrato do banco, e o espelho SQL `app.fn_status_vista` a lê direto. Escrever a lista aqui — ou numa tela —
 *    a faria divergir do banco em silêncio; a guarda `tests/unidade/instrumentos-dado-unico.test.ts` reprova quem
 *    tentar, e a prova cruzada `tests/invariantes/situacao-sql-igual-ts.test.ts` compara as duas implementações.
 * ⚠️ **INSTRUMENTO DESCONHECIDO = EXIGE, COMO ANTES.** A prova sem item ligado e sem `avaliacoes.instrumento_id`
 *    (o histórico; o `AV` que nada nomeia) não tem instrumento: a situação dela continua a de antes da emenda.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */

/** O instrumento de uma avaliação, com a marca do banco (`config_listas.metadados.vista_obrigatoria`). */
export type InstrumentoDaVista = {
  /** `config_listas.instrumentos_avaliacao.valor`: `PM`, `PP`, `TG`… */
  readonly valor: string;
  readonly vistaObrigatoria: boolean;
};

/**
 * Traduz a linha de `config_listas` que a consulta trouxe (`valor` e `metadados`) para o instrumento da vista.
 * Linha ausente → `null` (desconhecido). Marca ausente ou diferente de `true` → não exige: a D-9 marca TODO
 * instrumento, e o que não é `true` é a decisão de não exigir.
 */
export function instrumentoDaVista(
  linha: { readonly valor?: unknown; readonly metadados?: unknown } | null | undefined,
): InstrumentoDaVista | null {
  if (!linha || typeof linha.valor !== "string" || linha.valor.trim() === "") return null;
  const metadados = (linha.metadados ?? {}) as { vista_obrigatoria?: unknown };
  return { valor: linha.valor.trim(), vistaObrigatoria: metadados.vista_obrigatoria === true };
}

/** O instrumento exige vista? Desconhecido (nulo) → sim, como antes da emenda. */
export function exigeVista(entrada: {
  readonly instrumento: InstrumentoDaVista | null | undefined;
}): boolean {
  if (!entrada.instrumento) return true;
  return entrada.instrumento.vistaObrigatoria;
}

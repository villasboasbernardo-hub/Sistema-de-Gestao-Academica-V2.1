/**
 * As **abas de versão** do DSA — Bloco 15, spec 030, `FR-007` (RP-3 emendada).
 *
 * > *"ABAS DE VERSÃO na página do DSA: 'Minuta' (a de trabalho, editável, com o selo de situação) · 'Original' · 'ALT 1'
 * > · 'ALT 2'… (papel de cada versão publicada, só leitura, com Reimprimir). Substituem a lista 'Versões publicadas'.
 * > Semana nunca publicada: só a aba Minuta. Estado da aba na URL."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **A ABA MORA NO `?versao=`** (D-15): vazio é a Minuta, `0` a Original, `N` a ALT N. A semana abre sempre na Minuta
 *    (D-23). ⚠️ **VERSÃO QUE NÃO EXISTE ABRE A MINUTA, COM AVISO** (`RN-DEG-01`): um link antigo, ou de outra semana, não
 *    pode abrir uma aba vazia nem calar a troca.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase` (regra 9 do `CLAUDE.md`).
 */

/** Uma aba: o valor que vai para a URL e o rótulo da tela. */
export type AbaDeVersao = { readonly valor: string; readonly rotulo: string };

/** O rótulo de uma versão publicada: *Original* (0) ou *ALT N*. */
export function rotuloDaVersao(numero: number): string {
  return numero === 0 ? "Original" : `ALT ${numero}`;
}

/** As abas da semana: a Minuta e, depois, as versões publicadas, em ordem de número. */
export function abasDeVersao(publicadas: readonly number[]): readonly AbaDeVersao[] {
  return [
    { valor: "", rotulo: "Minuta" },
    ...[...new Set(publicadas)]
      .sort((a, b) => a - b)
      .map((n) => ({ valor: String(n), rotulo: rotuloDaVersao(n) })),
  ];
}

/** A versão que o `?versao=` pede: `null` é a Minuta; o aviso diz quando o pedido não existia. */
export function versaoEscolhida(
  daUrl: string,
  publicadas: readonly number[],
): { readonly numero: number | null; readonly aviso: string | null } {
  const texto = daUrl.trim();
  if (texto === "") return { numero: null, aviso: null };
  const numero = /^\d+$/.test(texto) ? Number(texto) : NaN;
  if (Number.isInteger(numero) && publicadas.includes(numero)) return { numero, aviso: null };
  return {
    numero: null,
    aviso: "A versão pedida no endereço não existe nesta semana: abrimos a Minuta.",
  };
}

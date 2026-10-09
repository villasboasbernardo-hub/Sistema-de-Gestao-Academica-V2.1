/**
 * A ordem das disciplinas pelo CÓDIGO (ajuste 5 do PR #40, e a dúvida 5 respondida).
 *
 * > *"ORDEM DAS DISCIPLINAS: na situação por disciplina (abaixo da grade) e nos seletores de
 * > disciplina do lançamento, sempre por ordem alfabética do código, em ordem natural (2 antes de
 * > 10)."* — Bernardo Villas Boas, 08/10/2026
 * >
 * > *"Códigos em algarismo romano ordenam pelo VALOR do numeral (I, II, III, IV, V … IX, X, XI), não
 * > pela letra. Códigos que não são romanos seguem a ordem natural."* — Bernardo Villas Boas,
 * > 08/10/2026 (resposta à dúvida 5)
 *
 * ⚠️ **NATURAL QUER DIZER QUE O NÚMERO DENTRO DO TEXTO VALE COMO NÚMERO**: `D2` antes de `D10`.
 * ⚠️ **ROMANO SÓ QUANDO OS DOIS SÃO ROMANOS VÁLIDOS**: um romano contra um código comum cai na ordem
 * natural, porque não há valor para comparar do outro lado.
 * ⚠️ **UM COMPARADOR SÓ**: a situação e os seletores ordenam pelo mesmo.
 */

const COLADOR = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

const ROMANO = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;
const VALOR: Readonly<Record<string, number>> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

/** O valor de um numeral romano válido (`IX` → 9), ou `null` se o código não é romano. */
export function valorRomano(codigo: string): number | null {
  const c = codigo.trim().toUpperCase();
  if (c === "" || !ROMANO.test(c)) return null;
  let total = 0;
  for (let i = 0; i < c.length; i += 1) {
    const atual = VALOR[c[i] as string] ?? 0;
    const proximo = VALOR[c[i + 1] as string] ?? 0;
    total += atual < proximo ? -atual : atual;
  }
  return total;
}

/** Compara dois códigos: pelo valor, se ambos forem romanos; senão em ordem alfabética natural. */
export function compararCodigoNatural(a: string, b: string): number {
  const ra = valorRomano(a);
  const rb = valorRomano(b);
  if (ra !== null && rb !== null) return ra - rb;
  return COLADOR.compare(a, b);
}

/** Uma cópia da lista em ordem do código — a lista recebida não é tocada. */
export function emOrdemNaturalDoCodigo<T>(itens: readonly T[], codigo: (item: T) => string): T[] {
  return [...itens].sort((x, y) => compararCodigoNatural(codigo(x), codigo(y)));
}

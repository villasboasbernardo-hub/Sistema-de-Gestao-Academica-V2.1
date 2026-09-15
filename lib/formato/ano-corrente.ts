/**
 * O ano corrente, contado no fuso da CIAARA-11 (`FR-014` e `FR-027.1` da spec 006).
 *
 * ⚠️ O BANCO GUARDA UTC, E A APRESENTAÇÃO É EM `America/Sao_Paulo` (convenção de banco do projeto).
 * Na virada do ano, entre 21h de 31/12 e a meia-noite em UTC, `new Date().getFullYear()` no servidor
 * da Vercel já diz o ano seguinte — e a carga do ano "corrente" sairia zerada para todo mundo durante
 * três horas, sem erro nenhum. A data da aula é `date` local; o ano que a casa com ela também é.
 */
const FUSO_DA_CIAARA = "America/Sao_Paulo";

export function anoCorrente(agora: Date = new Date()): number {
  const ano = new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_DA_CIAARA,
    year: "numeric",
  }).format(agora);
  return Number(ano);
}

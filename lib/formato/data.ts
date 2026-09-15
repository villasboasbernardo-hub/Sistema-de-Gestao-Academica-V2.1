/**
 * Datas de calendário para leitura — documento 24, `lib/formato/`.
 *
 * ⚠️ DATA DE CALENDÁRIO NÃO PASSA POR `Date`. `new Date("2021-03-01")` é meia-noite **em UTC**, e em
 * `America/Sao_Paulo` isso é 28/02 às 21h: a ficha mostraria o dia anterior ao gravado, sem erro. A
 * coluna é `date`, sem hora; a conversão é de texto para texto.
 */

/** `AAAA-MM-DD` → `DD/MM/AAAA`. Vazio ou fora do formato devolve "—", nunca "Invalid Date". */
export function dataParaLeitura(valor: string | null | undefined): string {
  const casamento = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor?.trim() ?? "");
  if (!casamento) return "—";
  const [, ano, mes, dia] = casamento;
  return `${dia}/${mes}/${ano}`;
}

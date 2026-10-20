/**
 * Reais na tela — spec 020 (Bloco 5), C-3: o custo do curso se digita com vírgula (*12.345,67*) e se lê *R$ 12.345,67*.
 *
 * ⚠️ **SÓ INFORMATIVO**: nada no sistema calcula a partir do custo; este módulo só lê o que se digita e escreve o que
 *    se mostra.
 * ⚠️ **O `Intl` ESCREVE UM ESPAÇO QUE NÃO QUEBRA** (U+00A0) entre *R$* e o número; ele é trocado pelo espaço comum, e a
 *    leitura aceita os dois (`\s` já o inclui) — senão o valor mostrado não voltaria a ser lido igual.
 */

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const DUAS_CASAS = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ESPACO_QUE_NAO_QUEBRA = new RegExp("\\u00a0", "g");

/** Milhar com ponto (opcional) e até duas casas depois da vírgula. Negativo não é custo. */
const FORMA = /^(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{1,2})?$/;

/**
 * O valor digitado: `null` quando vazio; `NaN` quando não é um valor em reais; o número, quando é.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$/i, "").replace(/\s/g, "");
  if (limpo === "") return null;
  if (!FORMA.test(limpo)) return Number.NaN;
  return Number(limpo.replace(/\./g, "").replace(",", "."));
}

/** O valor para ler: *R$ 12.345,67*, ou *Não informado*. */
export function reaisParaLeitura(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "Não informado";
  return REAIS.format(valor).replace(ESPACO_QUE_NAO_QUEBRA, " ");
}

/** O valor para o campo de edição: *12.345,67*, sem o *R$* — e vazio quando não há. */
export function reaisParaEdicao(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "";
  return DUAS_CASAS.format(valor);
}

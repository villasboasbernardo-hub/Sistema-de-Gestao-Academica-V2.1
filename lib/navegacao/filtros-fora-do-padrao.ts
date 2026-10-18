/**
 * Quantos filtros de uma tela estão **fora do padrão** — FR-004.2 da spec 016 (item 1.4).
 *
 * > *"Filtros recolhidos: começam fechados; o botão mostra quantos filtros estão ativos."*
 * > — item 1.4 do plano de correções, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **A RÉGUA É O `padrao` DO CONTRATO DE PARÂMETROS, e é a mesma do "Limpar filtros".** Até
 * 17/10/2026 o selo do botão contava qualquer valor não vazio, e cada tela reescrevia à mão a sua
 * condição do *"Limpar filtros"*. Onde o padrão não é vazio — `situacao=ativo` em `/cursos`,
 * `/instrutores` e `/disciplinas` — o selo dizia **1** com a tela limpa e o botão de limpar não
 * aparecia: os dois discordavam. Com uma régua só, o número do selo e a existência do botão são a
 * mesma pergunta.
 *
 * ⚠️ **SÓ CONTA O QUE A TELA PASSA.** O contrato de uma rota também guarda navegação (`curso` e
 * `turma` em `/disciplinas`), ordenação e a linha aberta — nada disso é filtro. Quem sabe quais
 * parâmetros são filtro é a tela; daqui só sai a comparação com o padrão.
 */
import { CONTRATO, type ParametroDe, type Rota } from "@/lib/navegacao/contrato";

type ValorDoParametro = string | number | readonly string[] | null | undefined;

function foraDoPadrao(
  padrao: string | number | readonly string[],
  valor: ValorDoParametro,
): boolean {
  if (Array.isArray(padrao)) {
    const lista = Array.isArray(valor) ? valor.filter((v) => String(v).trim() !== "") : [];
    return lista.length !== padrao.length || lista.some((v, i) => v !== padrao[i]);
  }
  if (typeof padrao === "number") {
    return valor !== null && valor !== undefined && Number(valor) !== padrao;
  }
  const texto = valor === null || valor === undefined ? "" : String(valor).trim();
  return texto !== padrao;
}

export function filtrosForaDoPadrao<R extends Rota>(
  rota: R,
  valores: Partial<Record<ParametroDe<R>, ValorDoParametro>>,
): number {
  const parametros = CONTRATO[rota].parametros as Readonly<
    Record<string, { readonly padrao: string | number | readonly string[] }>
  >;
  let contagem = 0;
  for (const [nome, valor] of Object.entries(valores) as [string, ValorDoParametro][]) {
    const descritor = parametros[nome];
    if (descritor === undefined) continue;
    if (foraDoPadrao(descritor.padrao, valor)) contagem += 1;
  }
  return contagem;
}

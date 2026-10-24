/**
 * O ano escolhido — **RT-6** do Bloco 10 (spec 025, D-24 a D-27).
 *
 * > *"Seletor de ano aceita qualquer ano, padrão = ano da data atual, todos os módulos mostram só o ano selecionado,
 * > virada automática."* — Bernardo Villas Boas, 24/10/2026 (`docs/correcoes/padroes-de-tela.md`)
 *
 * ⚠️ **UM ANO PARA O SISTEMA INTEIRO, ESCOLHIDO EM QUALQUER TELA** (D-24): a tela lê o `?ano=` do link; sem ele, o ano
 *    guardado no navegador; sem os dois, o de hoje em São Paulo. O link vale mais que o guardado porque um endereço
 *    compartilhado tem de mostrar o que diz.
 * ⚠️ **QUALQUER ANO DO DOMÍNIO DO BANCO** (D-25): `turmas.ano_letivo`, `feriados.ano` e `config_parametros.ano_vigencia`
 *    aceitam de 2020 a 2099 — é o mesmo intervalo aqui, e não *"os anos que têm dado"*, que era o seletor do Bloco 4.
 * ⚠️ **A VIRADA É AUTOMÁTICA** porque a escolha guardada **expira** na meia-noite de 1º de janeiro em São Paulo
 *    (`expiracaoDaEscolha`): no ano novo, sem escolha, toda tela abre no ano de hoje.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase` (regra 9 do `CLAUDE.md`).
 */

/** O menor e o maior ano que o banco aceita (as restrições de `ano_letivo`, `feriados.ano` e `ano_vigencia`). */
export const ANO_MINIMO = 2020;
export const ANO_MAXIMO = 2099;

/** Quantos anos à frente do de hoje o seletor oferece (D-25). */
export const ANOS_ADIANTE = 10;

/** O ano de um texto, se ele for um ano do domínio do banco; senão `null`. */
export function anoValido(texto: string | null | undefined): number | null {
  const limpo = (texto ?? "").trim();
  if (!/^\d{4}$/.test(limpo)) return null;
  const ano = Number(limpo);
  return ano >= ANO_MINIMO && ano <= ANO_MAXIMO ? ano : null;
}

export type OrigemDoAno = "url" | "guardado" | "hoje";

/**
 * O ano que a tela mostra, e de onde ele veio.
 *
 * ⚠️ **O GUARDADO IGUAL AO DE HOJE NÃO É ESCOLHA**: escolher o ano de hoje apaga a escolha (D-24), e um valor velho igual
 *    ao vigente conta como padrão — senão a tela poria `?ano=` de hoje na URL sem ninguém ter pedido.
 */
export function anoDaTela(
  daUrl: string | null | undefined,
  guardado: string | null | undefined,
  hoje: string,
): { readonly ano: number; readonly origem: OrigemDoAno } {
  const vigente = Number(hoje.slice(0, 4));
  const doLink = anoValido(daUrl);
  if (doLink !== null) return { ano: doLink, origem: "url" };
  const daEscolha = anoValido(guardado);
  if (daEscolha !== null && daEscolha !== vigente) return { ano: daEscolha, origem: "guardado" };
  return { ano: vigente, origem: "hoje" };
}

/**
 * As opções do seletor: do mínimo do banco ao ano de hoje mais `ANOS_ADIANTE`, do mais novo ao mais velho — e o ano
 * escolhido, se estiver além disso (um link para 2050 mostra 2050 na caixa, e não o primeiro da lista).
 */
export function opcoesDeAno(vigente: number, escolhido: number): readonly number[] {
  const ultimo = Math.min(ANO_MAXIMO, Math.max(vigente + ANOS_ADIANTE, escolhido));
  const anos: number[] = [];
  for (let ano = ultimo; ano >= ANO_MINIMO; ano -= 1) anos.push(ano);
  return anos;
}

/**
 * Quando a escolha guardada deixa de valer: **1º de janeiro do ano seguinte, à meia-noite de São Paulo**.
 *
 * ⚠️ **03:00 UTC** porque São Paulo está em UTC−3 o ano inteiro desde que o horário de verão acabou (2019). Se ele
 *    voltar, a escolha dura uma hora a mais na virada — e a tela continua certa a partir dali.
 */
export function expiracaoDaEscolha(hoje: string): Date {
  const ano = Number(hoje.slice(0, 4));
  return new Date(Date.UTC(ano + 1, 0, 1, 3, 0, 0));
}

/**
 * A data com que se escolhe **o currículo vigente no ano** (D-27): hoje, no ano de hoje; 1º de janeiro, nos outros.
 *
 * ⚠️ É a data de referência da função de vigência que já existe (`curriculoVigenteEm`, spec 021) — esta função não
 *    escolhe currículo nenhum, só diz **em que dia** perguntar.
 */
export function curriculoDeReferencia(ano: number, hoje: string): string {
  return Number(hoje.slice(0, 4)) === ano ? hoje : `${ano}-01-01`;
}

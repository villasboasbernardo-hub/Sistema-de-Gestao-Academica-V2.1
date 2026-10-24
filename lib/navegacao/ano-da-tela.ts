/**
 * O ano da tela, lido **no servidor** — o `?ano=` do link, senão o ano escolhido no navegador, senão o de hoje em São
 * Paulo (RT-6 do Bloco 10, D-24 da spec 025).
 *
 * ⚠️ **SÓ PÁGINA E LAYOUT CHAMAM ISTO**: ele lê `cookies()`, que é do servidor. A regra de qual ano vale é
 *    `anoDaTela` (`lib/dominio/ano-escolhido.ts`), pura e testada; aqui só se busca o cookie.
 */
import "server-only";

import { cookies } from "next/headers";

import { anoDaTela, type OrigemDoAno } from "@/lib/dominio/ano-escolhido";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { COOKIE_DO_ANO } from "@/lib/navegacao/cookie-do-ano";

export type AnoDaTela = {
  readonly ano: number;
  readonly origem: OrigemDoAno;
  /** O ano de hoje em São Paulo — o padrão, que o seletor limpa da URL. */
  readonly vigente: number;
  /** O dia de São Paulo com que tudo foi calculado. */
  readonly hoje: string;
};

/** @param daUrl o `?ano=` já lido pelo contrato da rota (texto; vazio quando não veio). */
export async function anoEscolhido(
  daUrl: string,
  hoje: string = hojeNaCiaara(),
): Promise<AnoDaTela> {
  const armazem = await cookies();
  const { ano, origem } = anoDaTela(daUrl, armazem.get(COOKIE_DO_ANO)?.value, hoje);
  return { ano, origem, vigente: Number(hoje.slice(0, 4)), hoje };
}

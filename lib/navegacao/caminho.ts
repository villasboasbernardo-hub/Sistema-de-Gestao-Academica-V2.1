/**
 * O caminho da requisição, entregue do proxy ao servidor (`FR-016`, `FR-017`).
 *
 * ⚠️ **ELE EXISTE PORQUE A CASCA É SERVIDOR, E ISSO FOI ESCOLHA, NÃO ACIDENTE.** Marcar a entrada
 * ativa do menu exige saber o caminho; no navegador isso é uma linha, e custaria o marcador de
 * cliente na casca — que manda **toda tela do sistema** para o pacote do navegador. O cabeçalho é o
 * preço de manter a navegação inteira no servidor, e é o menor dos dois.
 *
 * ⚠️ **A AUSÊNCIA DEGRADA, NÃO ESTOURA** (`RN-DEG-01`): sem o cabeçalho, nenhuma entrada fica
 * marcada e a navegação continua inteira. Uma casca que lançasse exceção por não saber onde está
 * derrubaria a tela por causa de um enfeite.
 */

/** O nome do cabeçalho. Prefixo `x-` porque não é cabeçalho padrão de HTTP. */
export const CABECALHO_DO_CAMINHO = "x-ciaara-caminho";

/** O caminho, ou a raiz quando ele não veio. */
export function caminhoOuRaiz(bruto: string | null | undefined): string {
  return bruto && bruto.startsWith("/") ? bruto : "/";
}

/**
 * `FR-033` e `FR-034` · a senha temporária que o servidor gera quando o Admin redefine.
 *
 * > **`FR-034`**: *"A senha gerada MUST ser imprevisível e MUST NOT aparecer em registro de
 * > execução, em endereço nem em nada que sobreviva à tela."*
 *
 * ⚠️ **`crypto.randomInt`, NUNCA `Math.random()`.** `Math.random()` não é criptográfico: a sequência
 * é previsível a partir de saídas observadas, e uma senha previsível não é senha. É `node:crypto`,
 * que já vem com a plataforma — **nenhuma biblioteca nova** (restrição da spec).
 *
 * ⚠️ **O ALFABETO EXCLUI O QUE SE CONFUNDE AO LER EM VOZ ALTA: `O`, `0`, `l`, `1`, `I`.** A senha vai
 * ser **ditada ou copiada à mão** — o Admin a lê na tela uma vez e passa adiante. Um `l` lido como `1`
 * produz *"a senha não funciona"*, e o caminho de saída é outra redefinição, que recomeça o problema.
 * ⚠️ **Isso reduz o espaço de busca, e a compensação é o COMPRIMENTO**: 16 caracteres sobre 57
 * símbolos dão mais entropia que 12 sobre 62.
 *
 * ⚠️ **NÃO HÁ `Math.floor(Math.random() * n)` NEM MÓDULO SOBRE BYTE.** `randomInt(n)` é uniforme por
 * construção; `byte % n` enviesa os primeiros símbolos do alfabeto quando `n` não divide 256, e o
 * viés é invisível em qualquer teste que só olhe o formato.
 */

/**
 * ⚠️ **O COMPRIMENTO VEM DE `politica-de-senha`, NÃO DAQUI.** Ele já morava lá — redeclará-lo faria
 * duas fontes para o mesmo número, e o dia em que a política subisse o mínimo só uma das duas
 * mudaria. **Gerar no mínimo exato seria frágil pelo mesmo motivo**: se `minimum_password_length`
 * subisse e a geração ficasse atrás, o sistema passaria a emitir senha que ele mesmo recusa, e o
 * sintoma apareceria no Admin, não em teste.
 */
import { COMPRIMENTO_DA_SENHA_GERADA } from "./politica-de-senha";

/**
 * Os símbolos que entram na senha gerada.
 *
 * ⚠️ **A AUSÊNCIA DE `O`, `0`, `l`, `1` e `I` É GUARDADA POR TESTE**, porque é o tipo de coisa que
 * alguém "conserta" ao reescrever o alfabeto em ordem.
 */
export const ALFABETO_SEM_AMBIGUIDADE =
  "ABCDEFGHJKLMNPQRSTUVWXYZ" + // sem I nem O
  "abcdefghijkmnopqrstuvwxyz" + // sem l
  "23456789" + // sem 0 nem 1
  "!@#$%*-_";

/**
 * Sorteia um inteiro em `[0, limite)`. É o único ponto de aleatoriedade, e ele é **injetado** para
 * que o teste possa provar a distribuição sem monkey-patch.
 */
export type SorteioDeInteiro = (limite: number) => number;

/**
 * Gera a senha temporária.
 *
 * ⚠️ **ELA NÃO É GUARDADA EM LUGAR NENHUM** — nem em coluna, nem em log, nem no endereço. Quem a
 * recebe é a tela, **uma vez**, no retorno da Server Action; recarregar a página a perde, e é isso
 * que a `FR-034` pede. O caminho de quem perdeu é redefinir de novo.
 */
export function gerarSenhaTemporaria(
  sortear: SorteioDeInteiro,
  comprimento: number = COMPRIMENTO_DA_SENHA_GERADA,
): string {
  let senha = "";
  for (let i = 0; i < comprimento; i += 1) {
    const posicao = sortear(ALFABETO_SEM_AMBIGUIDADE.length);
    senha += ALFABETO_SEM_AMBIGUIDADE[posicao];
  }
  return senha;
}

/** Os cinco símbolos que a senha gerada **nunca** traz, nomeados para o teste e para quem lê. */
export const AMBIGUOS_PROIBIDOS = ["O", "0", "l", "1", "I"] as const;

/**
 * O estado da lateral — **cookie, e não URL** (`FR-005`, `FR-010` da spec 012).
 *
 * > *"D-NAV-2 — 'fixada' é estado de UI e vive em cookie, não na URL."*
 * > — decisão de Bernardo Villas Boas, 04/10/2026
 *
 * ⚠️ **ISTO É EXCEÇÃO DECLARADA À REGRA DE QUE ESTADO DE TELA VAI PARA A URL**, e a exceção está
 * escrita aqui para não ser deduzida da ausência. A razão: o painel estar fixo **não pertence a link
 * nenhum** — compartilhar um endereço não deve impor ao outro a largura do menu dele. É a mesma razão
 * que já mantém o abre-e-fecha de tela estreita fora da barra de endereço, e a mesma do tema.
 *
 * ⚠️ **E É POR ISSO QUE ELE NÃO ENTRA EM `contrato.ts`:** o contrato declara **parâmetro de
 * navegação**, e um parâmetro declarado ali nasce com histórico, com padrão e com aviso ao servidor —
 * três coisas que não fazem sentido para a largura de um menu.
 *
 * ⚠️ **O VALOR É LIDO NO SERVIDOR, e essa é a diferença em relação ao tema.** O `next-themes` guarda
 * em `localStorage` e conserta a tela com um script que roda antes da pintura — o servidor **não
 * sabe** o tema. Aqui o servidor **tem** de saber, porque a largura da lateral muda o layout do
 * conteúdo inteiro: um salto depois da hidratação é exatamente o que o `FR-005` proíbe. Quem lê é
 * `app/(app)/layout.tsx`, por `cookies()`; quem escreve é a folha de cliente da lateral.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase` — é o que permite provar a grafia do
 * cookie por teste de unidade, sem subir nada.
 */

/** O nome do cookie. Um só, e é daqui que os dois lados o leem. */
export const COOKIE_DA_LATERAL = "ciaara-lateral";

export const LATERAL_FIXADA = "fixada";
export const LATERAL_RECOLHIDA = "recolhida";

/** Um ano. A preferência é de quem usa a máquina, não da sessão — ela sobrevive a sair e entrar. */
const VALIDADE_EM_SEGUNDOS = 31_536_000;

/**
 * O estado inicial, a partir do que veio no cookie.
 *
 * ⚠️ **QUALQUER COISA QUE NÃO SEJA EXATAMENTE `fixada` VALE RECOLHIDA** — ausência, valor
 * desconhecido, cookie corrompido, navegador que bloqueia cookie. O padrão é o estado seguro: a
 * lateral recolhida mostra menos, e nunca esconde navegação (os ícones ficam, e o rótulo continua no
 * DOM para leitor de tela). Decidir o contrário faria um cookie estragado abrir o menu de todo mundo.
 */
export function lateralFixadaNoCookie(valor: string | undefined | null): boolean {
  return valor === LATERAL_FIXADA;
}

/**
 * A linha que a folha de cliente atribui a `document.cookie`.
 *
 * ⚠️ **`path=/` NÃO É DETALHE:** sem ele o cookie nasce no caminho da página que o gravou, e fixar a
 * lateral em `/cursos` não valeria em `/instrutores` — o `FR-005` fala de **entre páginas**.
 *
 * ⚠️ **`SameSite=Lax` É O SUFICIENTE E O CORRETO:** o cookie não autoriza nada, não identifica
 * ninguém e não é lido por requisição de terceiro. `Strict` o apagaria da primeira navegação vinda de
 * fora (um link no e-mail institucional, por exemplo), e `None` exigiria `Secure` sempre — o que
 * mataria o estado no `http://localhost` do desenvolvimento.
 *
 * ⚠️ **`Secure` ENTRA QUANDO A PÁGINA É `https:`, e sai quando não é.** Fixá-lo sempre faria o cookie
 * ser **descartado em silêncio** no local, e o sintoma seria *"fixar não funciona nesta máquina"* —
 * do tipo que custa uma tarde.
 */
export function cookieDaLateral(fixada: boolean, conexaoSegura: boolean): string {
  const valor = fixada ? LATERAL_FIXADA : LATERAL_RECOLHIDA;
  const partes = [
    `${COOKIE_DA_LATERAL}=${valor}`,
    "path=/",
    `max-age=${VALIDADE_EM_SEGUNDOS}`,
    "samesite=lax",
    ...(conexaoSegura ? ["secure"] : []),
  ];
  return partes.join("; ");
}

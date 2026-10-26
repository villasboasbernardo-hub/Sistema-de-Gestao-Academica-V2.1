/**
 * O ano escolhido no navegador — **cookie** (RT-6 do Bloco 10, D-24 da spec 025).
 *
 * > *"…todos os módulos mostram só o ano selecionado, virada automática."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **É A MESMA EXCEÇÃO DECLARADA DA LATERAL FIXADA** (`lateral.ts`, D-NAV-2 da spec 012): o estado de tela continua
 *    na URL — cada tela escreve o seu `?ano=` —, e o cookie só leva **para as outras telas** o ano que alguém escolheu
 *    numa. Sem ele, escolher 2027 em Turmas e clicar em Instrutores voltaria a 2026, e *"todos os módulos seguem o ano
 *    selecionado"* não valeria.
 * ⚠️ **ELE EXPIRA NA VIRADA DO ANO** (`expiracaoDaEscolha`): é o que faz a virada ser automática — em 1º de janeiro,
 *    sem escolha guardada, toda tela abre no ano novo.
 * ⚠️ **O VALOR É LIDO NO SERVIDOR** (`ano-da-tela.ts`, por `cookies()`), porque a consulta de cada tela já depende do
 *    ano; quem escreve é a folha do seletor.
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase` — é o que permite provar a grafia do cookie por teste.
 */

/** O nome do cookie. Um só, e é daqui que os dois lados o leem. */
export const COOKIE_DO_ANO = "ciaara-ano";

/**
 * A linha que a folha do seletor atribui a `document.cookie`: o ano, até `expira`; ou, com `null`, a ordem de apagar.
 *
 * ⚠️ **`path=/`**: sem ele o cookie nasceria no caminho da página que o gravou, e escolher o ano em `/turmas` não
 *    valeria em `/instrutores` — que é o ponto inteiro. ⚠️ **`samesite=lax` e `secure` só em `https:`**, pelas mesmas
 *    razões escritas em `lateral.ts` (no `http://localhost` o `secure` faria o cookie sumir em silêncio).
 */
export function cookieDoAno(ano: number | null, expira: Date, conexaoSegura: boolean): string {
  const partes =
    ano === null
      ? [`${COOKIE_DO_ANO}=`, "path=/", "max-age=0", "samesite=lax"]
      : [`${COOKIE_DO_ANO}=${ano}`, "path=/", `expires=${expira.toUTCString()}`, "samesite=lax"];
  return [...partes, ...(conexaoSegura ? ["secure"] : [])].join("; ");
}

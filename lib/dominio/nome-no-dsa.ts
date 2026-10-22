/**
 * O NOME DA DISCIPLINA NO CARTÃO DO DSA — Bloco 2, item 6 (spec 017, FR-007; R-8).
 *
 * > *"Nome longo de disciplina estoura o cartão do DSA (…): o tópico corta e o instrutor some. Campo «nome abreviado
 * > no DSA» no cadastro da disciplina, com abreviação automática de reserva quando vazio; vale só no DSA (tela,
 * > papel, planilha); o nome inteiro continua no quadro de CH."* — pedido de Bernardo Villas Boas, 19/10/2026
 *
 * ⚠️ **O LIMITE L É MEDIDA DE LAYOUT, NÃO NORMA** (R-8): o maior nome que cabe numa linha do título do cartão de 1 TA,
 *    no modo mais apertado do papel (seis dias, letra do compacto), com o código mais largo na frente — medido no
 *    `/print/dsa` por `tests/e2e/dsa-cartao-do-papel.spec.ts`. O banco guarda até 60 (teto de segurança); o Zod do
 *    cadastro aplica L.
 * ⚠️ **QUEM CABE FICA COMO ESTÁ** (C-25): nem espaço nem ponto mudam; a regra só mexe no que passa de L.
 * ⚠️ **REPRODUTÍVEL**: o mesmo nome dá o mesmo resultado nas três superfícies e a cada impressão — nada aqui depende
 *    de largura de fonte nem de semana.
 * ⚠️ **TypeScript puro** (Princípio II).
 */

/**
 * L — **19**, o MENOR de duas medidas de `tests/e2e/dsa-cartao-do-papel.spec.ts` no `/print/dsa` (19/10/2026): o título
 * do cartão de 1 TA no papel de SEIS dias (modo compacto, Barlow 6,8 pt, 9,07 px), com o código mais largo (*XXXVIII*)
 * na frente. Para cada um dos 172 nomes ativos (`tests/unidade/dados/disciplinas-ativas-2026-10-19.txt`) que não cabem
 * inteiros, o maior prefixo que cabe numa linha; L é o menor deles.
 *   - **Chromium no Windows** (o build local): **22**.
 *   - **Chromium no Linux** (o bloco `banco` do CI, run `39269921589`, três execuções): **19**.
 * ⚠️ **A FONTE É A MESMA** (a Barlow servida pelo próprio build, sem falha de download no log do CI): o que muda é o
 *    arredondamento da largura das letras em corpo pequeno, que no Linux alarga a linha. O papel tem de caber em
 *    qualquer um dos dois, então vale o menor. ⚠️ A medida é do papel, não da norma: se a folha mudar, a prova a refaz.
 */
export const LIMITE_DO_NOME_NO_DSA = 19;

/** As palavras de ligação que a abreviação tira (passo 4), menos quando são a primeira palavra. */
const LIGACAO = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "à",
  "ao",
  "aos",
  "o",
  "os",
  "as",
  "em",
  "no",
  "na",
  "nos",
  "nas",
  "para",
  "por",
  "com",
  "sobre",
]);

const LETRA = /\p{L}/u;

/** Quantas letras a palavra tem — o passo 5 abrevia só as de mais de 4. */
function letras(palavra: string): number {
  return [...palavra].filter((c) => LETRA.test(c)).length;
}

/** As 4 primeiras letras e o ponto (`NAVEGAÇÃO` → `NAVE.`); pontuação no fim sai junto. */
function abreviada(palavra: string): string {
  return `${[...palavra.replace(/[.,;:]+$/u, "")].slice(0, 4).join("")}.`;
}

/**
 * A abreviação automática de reserva (R-8), passo a passo:
 *   (1) cabe → fica como está; (2) espaços colapsados e ponto final tirado; (3) sem o sufixo depois de `" / "`;
 *   (4) sem as palavras de ligação, menos a primeira palavra; (5) palavras de mais de 4 letras abreviadas, da última
 *   para a primeira; (6) ainda não cabe → corta em L − 1 com "…".
 */
export function abreviarNomeNoDsa(nome: string, limite: number = LIMITE_DO_NOME_NO_DSA): string {
  const cabe = (s: string) => [...s].length <= limite;
  if (cabe(nome)) return nome;

  let atual = nome.replace(/\s+/g, " ").trim().replace(/\.+$/u, "");
  if (cabe(atual)) return atual;

  const barra = atual.indexOf(" / ");
  if (barra > 0) {
    atual = atual.slice(0, barra).trim();
    if (cabe(atual)) return atual;
  }

  const palavras = atual.split(" ");
  const semLigacao = palavras.filter(
    (p, i) => i === 0 || !LIGACAO.has(p.toLocaleLowerCase("pt-BR")),
  );
  atual = semLigacao.join(" ");
  if (cabe(atual)) return atual;

  const partes = [...semLigacao];
  for (let i = partes.length - 1; i >= 0; i -= 1) {
    const p = partes[i] as string;
    if (letras(p) <= 4) continue;
    partes[i] = abreviada(p);
    atual = partes.join(" ");
    if (cabe(atual)) return atual;
  }

  return `${[...atual].slice(0, limite - 1).join("")}…`;
}

/** O nome do cartão: o *Nome no DSA* cadastrado vence; sem ele, a abreviação de reserva do nome inteiro. */
export function nomeNoCartao(disciplina: {
  readonly nomeNoDsa: string | null | undefined;
  readonly nome: string;
}): string {
  const cadastrado = disciplina.nomeNoDsa?.trim() ?? "";
  return cadastrado !== "" ? cadastrado : abreviarNomeNoDsa(disciplina.nome);
}

/**
 * O nome da disciplina num GRÁFICO — spec 022 (Bloco 7), item 8.
 *
 * > *"Gráficos de disciplinas: legenda com o NOME da disciplina, não o código; nome longo usa o Nome no DSA (ou a
 * > abreviação automática do Bloco 2)."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **"LONGO" É O MESMO L DO CARTÃO** (`LIMITE_DO_NOME_NO_DSA`): uma régua só para "o nome cabe" no sistema. O nome que
 *    cabe vai **inteiro**, mesmo havendo *Nome no DSA* — este existe para o que não cabe, e o gráfico não é o cartão.
 */
export function nomeNoGrafico(disciplina: {
  readonly nomeNoDsa: string | null | undefined;
  readonly nome: string;
}): string {
  if ([...disciplina.nome.trim()].length <= LIMITE_DO_NOME_NO_DSA) return disciplina.nome.trim();
  return nomeNoCartao(disciplina);
}

/** A frase de recusa do cadastro acima de L — com o limite dito (FR-007.1). */
export function recusaDoNomeNoDsa(limite: number = LIMITE_DO_NOME_NO_DSA): string {
  return `O nome no DSA tem no máximo ${limite} caracteres — é o que cabe numa linha do cartão de 1 TA.`;
}

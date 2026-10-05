/**
 * **Todo utilitário de cor aponta para um token que EXISTE** — a invariante `I-4c`.
 *
 * ⚠️ **ESTA GUARDA NASCEU DE UM DEFEITO DE TELA QUE VIVEU MESES NA `main`, E A CAUSA NÃO ERA A QUE
 * TODO MUNDO SUPÔS.** O relato de Bernardo em 05/10/2026 era *"no tema escuro as listas de seleção
 * saem com fundo claro e texto claro, ilegíveis"*, e a suspeita natural era `color-scheme` — que
 * está **declarado e correto** nos dois temas desde a fatia (a) do Épico 4 (`app/globals.css:98` e
 * `:160`). ⚠️ **A causa medida eram CINCO NOMES DE TOKEN QUE NÃO EXISTEM**, com 36 usos em 20
 * arquivos: `superficie-1`, `superficie-elevada`, `erro`, `alerta` e `acento`. Nenhum deles é
 * declarado em `app/globals.css`, então `bg-superficie-1` **não compila para nada** — e o
 * `preflight` do Tailwind dá a todo `<select>` `background-color: transparent` com `color: inherit`.
 * Fundo transparente mais texto claro herdado é exatamente o relato.
 *
 * ⚠️ **E O MESMO DEFEITO APAGAVA A COR DE TODA MENSAGEM DE ERRO DO SISTEMA**, nos dois temas:
 * `text-erro` aparecia em 15 arquivos, em `role="alert"`, e saía na cor herdada. **Nada acusava.**
 *
 * ⚠️ **POR QUE AS GUARDAS QUE JÁ EXISTEM NÃO PEGARAM:** a invariante `I-4b`
 * (`tests/unidade/vocabulario.test.ts`) mede a direção certa e no lugar errado — ela lê **só**
 * `components/ui/`, sem recursão, e **só** nomes do vocabulário de terceiro; `app/` nunca é lido. E a
 * regra de cor do ESLint barra cor escrita à mão e utilitário da paleta padrão do Tailwind
 * (`slate-500`, `red-600`…) — `superficie-1` não é nenhuma das duas coisas. **Um nome com cara de
 * CIAARA que não existe passava pelos dois portões.**
 *
 * ⚠️ **O QUE ESTA GUARDA MEDE, e é uma pergunta só:** todo sufixo usado atrás de um prefixo de cor
 * ou está **declarado** como `--color-…` em `app/globals.css`, ou está na lista fechada do que **não
 * é cor** (tamanho, lado, estilo de borda, embrulho de texto). Sufixo fora das duas listas reprova —
 * e reprovar é o ponto: a terceira possibilidade é *"nome inventado"*.
 *
 * ⚠️ **A LISTA DO QUE NÃO É COR FOI MEDIDA, NÃO ESCRITA DE MEMÓRIA** (regra 9.2): ela é o resultado
 * da varredura de 05/10/2026 sobre `app/` e `components/`, com os cinco fantasmas retirados. Era
 * exatamente isso que sobrava — e é por isso que ela discrimina.
 *
 * ⚠️ **LÊ CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): este arquivo e `lib/design/vocabulario.ts` escrevem
 * `erro` e `alerta` em prosa, e vários cabeçalhos citam `bg-superficie-1` para explicar o defeito.
 * Varredura que contasse a documentação como violação ensinaria a apagar a documentação.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** Este arquivo sai da varredura: os cinco nomes inventados estão escritos nele. */
const ESTE_ARQUIVO = "token-de-cor-existe.test.ts";

const PASTAS = ["app", "components"] as const;
const EXTENSOES = /\.(ts|tsx)$/;

/**
 * Os prefixos de utilitário que pintam.
 *
 * ⚠️ `rounded-` e `shadow-` **não** entram: eles têm escala própria (`--radius-ciaara`,
 * `--shadow-ciaara-1`), e um sufixo inventado ali não produz cor nenhuma — produz canto quadrado,
 * que se vê. O custo de errar é de outra ordem.
 */
const PREFIXOS =
  "(?:bg|text|border|ring|fill|stroke|divide|outline|decoration|caret|accent|placeholder|from|via|to)";

/**
 * O sufixo que **não** é cor, medido em 05/10/2026 sobre `app/` e `components/`.
 *
 * ⚠️ **ELE É FECHADO DE PROPÓSITO.** Um utilitário novo cujo sufixo não seja cor — digamos
 * `text-7xl` — reprova aqui, e o conserto é **acrescentá-lo a esta lista**, com a leitura de quem
 * acrescentou. É barato, e é o que mantém a lista um inventário em vez de um filtro que engole
 * qualquer coisa.
 */
const NAO_E_COR: ReadonlySet<string> = new Set([
  // escala de tipografia e de tamanho
  "2xs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "kpi",
  // lado e espessura de borda, e o deslocamento do anel
  "t",
  "r",
  "b",
  "l",
  "b-0",
  "b-2",
  "l-2",
  "offset-2",
  // estilo de borda e de tabela
  "solid",
  "dashed",
  "dotted",
  "collapse",
  "separate",
  "hidden",
  "none",
  // alinhamento e embrulho de texto
  "left",
  "center",
  "right",
  "justify",
  "balance",
  "pretty",
  "nowrap",
  "wrap",
  // sombra do tema (escala própria, não cor)
  "ciaara-1",
  "ciaara-2",
  "ciaara-3",
  /*
   * ⚠️ PALAVRAS DE COR DO PRÓPRIO TAILWIND, e elas ficam aqui por um motivo: quem governa o uso
   *    delas é a regra de cor do ESLint, não esta varredura. `text-white` existe em dois
   *    primitivos (`button`, `badge`) sobre `--destructive`, e tirá-los é decisão de desenho.
   */
  "transparent",
  "current",
  "inherit",
  "white",
  "black",
]);

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function arquivosDe(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = resolve(caminho, nome);
    if (nome === "node_modules" || nome === ".next") return [];
    if (statSync(completo).isDirectory()) return arquivosDe(relative(RAIZ, completo));
    return EXTENSOES.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/** Os nomes de cor que o tema DECLARA — a única fonte de verdade. */
function coresDeclaradas(): ReadonlySet<string> {
  const css = readFileSync(resolve(RAIZ, "app/globals.css"), "utf8");
  return new Set([...css.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1] as string));
}

/**
 * Os usos de cor de um arquivo, já sem comentário.
 *
 * ⚠️ **O SUFIXO COMEÇA POR LETRA DE PROPÓSITO:** `text-2xs` e `border-2` casariam a forma geral e
 * não são cor. A consequência declarada é que um token inventado começando por dígito escaparia —
 * nenhum dos 89 declarados tem essa forma, e inventar um teria de passar primeiro pela `I-1b`.
 */
function usosDeCor(arquivo: string): readonly string[] {
  const codigo = semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8"));
  const padrao = new RegExp(`(?<![\\w-])${PREFIXOS}-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)`, "g");
  return [...codigo.matchAll(padrao)].map((m) => m[1] as string);
}

const TODOS = PASTAS.flatMap(arquivosDe).filter((a) => !a.endsWith(ESTE_ARQUIVO));
const DECLARADAS = coresDeclaradas();

describe("`I-4c` · a varredura enxerga o tema e o repositório", () => {
  it("⚠️ CONTROLE · o tema declara as cores, e a varredura acha os arquivos", () => {
    expect(
      DECLARADAS.size,
      "nenhuma cor declarada: ou o `@theme inline` saiu de `app/globals.css`, ou o padrão mudou",
    ).toBeGreaterThan(50);
    // Os três papéis que toda tela usa — se eles faltarem, a leitura do tema quebrou.
    for (const papel of ["fundo", "superficie", "texto", "borda", "marca"]) {
      expect(DECLARADAS.has(papel), `o papel \`${papel}\` deixou de ser declarado`).toBe(true);
    }
    expect(TODOS.length, "a varredura não achou arquivo nenhum: ela está cega").toBeGreaterThan(
      100,
    );
  });

  it("⚠️ CONTROLE POSITIVO · ela ENXERGA um uso de cor válido onde ele está", () => {
    /*
     * Sem este caso, uma varredura com o padrão quebrado passaria por não achar nada — a lição de
     * `vocabulario.test.ts` e de `sem-convite-nem-envio-de-email.test.ts`.
     */
    const usos = usosDeCor("components/ciaara/badge-status.tsx");
    expect(
      usos.length,
      "nenhum utilitário de cor achado num componente que é feito de cor",
    ).toBeGreaterThan(3);
    expect(usos.every((u) => DECLARADAS.has(u) || NAO_E_COR.has(u))).toBe(true);
  });
});

describe("`I-4c` · nenhum utilitário aponta para token que não existe", () => {
  it("⚠️ todo sufixo de cor está declarado no tema, ou é da lista do que não é cor", () => {
    const fantasmas = new Map<string, Set<string>>();

    for (const arquivo of TODOS) {
      for (const uso of usosDeCor(arquivo)) {
        if (DECLARADAS.has(uso) || NAO_E_COR.has(uso)) continue;
        const onde = fantasmas.get(uso) ?? new Set<string>();
        onde.add(arquivo);
        fantasmas.set(uso, onde);
      }
    }

    const relato = [...fantasmas.entries()]
      .map(([nome, onde]) => `${nome} (${onde.size} arquivo(s): ${[...onde].sort()[0]}…)`)
      .sort();

    expect(
      relato,
      `estes sufixos NÃO são cor declarada e NÃO estão na lista do que não é cor — ou seja, o ` +
        `utilitário não compila e não pinta nada: ${relato.join(" · ")}. ` +
        `Se é cor, declare o token nos DOIS temas (invariante I-1) e exponha em \`@theme inline\` ` +
        `(I-1b); se não é cor, acrescente o sufixo a \`NAO_E_COR\` neste arquivo. ` +
        `⚠️ O que NÃO resolve é inventar o nome: ele passa pelo \`tsc\`, pelo \`eslint\` e pela ` +
        `tela, e o defeito aparece só no tema em que o fundo da UA deixa de salvar.`,
    ).toEqual([]);
  });
});

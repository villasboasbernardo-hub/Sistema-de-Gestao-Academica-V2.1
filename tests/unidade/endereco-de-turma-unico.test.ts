/**
 * O endereço de turma é montado **num lugar só** (`FR-031.2`, `SC-002.1`, contrato §4.1).
 *
 * ⚠️ **A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO** — achado 5 da fatia (b) do Épico 4, promovido
 * a regra 9.1.1 do `CLAUDE.md`. Três verificações daquela fatia reprovaram lendo a própria
 * documentação como violação, e a lição é que um teste que confunde a frase que promete a
 * ausência com a violação **ensina a apagar a documentação para ficar verde**. Aqui é
 * literal: este arquivo e o módulo citam `/turmas/` e `?turma=` em prosa o tempo todo.
 *
 * ⚠️ **E HÁ CONTROLE POSITIVO.** Sem ele, uma varredura que não encontrasse nada por estar
 * procurando errado — caminho trocado, extensão errada, regex que nunca casa — passaria
 * exatamente como uma varredura que funciona.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const PASTAS = ["app", "components", "lib"];
const MODULO_AUTORIZADO = join("lib", "navegacao", "endereco-de-turma.ts");

/** O registro de rotas: ele DECLARA o caminho, e nenhuma tela monta endereço a partir dele. */
const CONTRATO_DE_ROTAS = join("lib", "navegacao", "contrato.ts");

/** Todo `.ts`/`.tsx` sob as pastas varridas. */
function arquivos(pasta: string): string[] {
  const achados: string[] = [];
  const caminhar = (atual: string) => {
    for (const entrada of readdirSync(atual)) {
      const completo = join(atual, entrada);
      if (statSync(completo).isDirectory()) {
        if (entrada === "node_modules" || entrada === ".next") continue;
        caminhar(completo);
      } else if (/\.tsx?$/.test(entrada)) {
        achados.push(completo);
      }
    }
  };
  caminhar(join(RAIZ, pasta));
  return achados;
}

/**
 * O conteúdo **sem comentário e sem texto literal de documentação**: tira `/* … *​/`, `//…`
 * e o corpo de `JSDoc`. Mantém o código executável, que é o que a regra governa.
 */
function codigoSemComentario(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Monta endereço de turma à mão? Procura o caminho e o parâmetro dentro de template ou string. */
const MONTA_CAMINHO = /["'`]\/turmas\//;
const MONTA_PARAMETRO = /[?&]turma=\$\{|[?&]turma=["'`]|["'`][?&]turma=/;

describe("`FR-031.2` · ninguém monta endereço de turma fora do módulo", () => {
  const varridos = PASTAS.flatMap(arquivos);

  it("a varredura de fato alcança o repositório — controle positivo", () => {
    /*
     * Três afirmações, e as três já falharam em varreduras anteriores deste projeto:
     * a lista não está vazia, ela inclui a página que HOJE é o único consumidor, e o
     * módulo autorizado está entre os arquivos lidos.
     */
    expect(varridos.length).toBeGreaterThan(50);
    const relativos = varridos.map((a) => relative(RAIZ, a));
    expect(relativos).toContain(join("app", "(app)", "inicio", "page.tsx"));
    expect(relativos).toContain(MODULO_AUTORIZADO);
  });

  it("o módulo autorizado É onde as raízes de rota são declaradas — controle positivo", () => {
    /*
     * ⚠️ PROCURA A CONSTANTE, NÃO O LITERAL COM BARRA. A primeira formulação exigia
     * `"/turmas/` no módulo e REPROVOU — porque ele declara `RAIZ_DE_TURMAS = "/turmas"`,
     * sem barra final, e a compõe depois. O controle positivo pegou a fraqueza da própria
     * varredura antes de ela virar falsa segurança: uma verificação que não encontra o
     * caso que deveria encontrar não distingue "ninguém viola" de "eu procuro errado".
     */
    const codigo = codigoSemComentario(readFileSync(join(RAIZ, MODULO_AUTORIZADO), "utf-8"));
    expect(codigo, "o módulo deixou de declarar a raiz de turmas").toMatch(/["'`]\/turmas["'`]/);
    expect(codigo, "o módulo deixou de codificar o código").toContain("encodeURIComponent");
  });

  it("nenhum OUTRO arquivo monta `/turmas/` nem `?turma=`", () => {
    const violacoes: string[] = [];
    for (const arquivo of varridos) {
      const rel = relative(RAIZ, arquivo);
      if (rel === MODULO_AUTORIZADO) continue;
      /*
       * ⚠️ O CONTRATO DE ROTAS DECLARA O CAMINHO; ele não MONTA endereço.
       *    `lib/navegacao/contrato.ts` registra a chave `/turmas/[turma]` — que é o lugar onde o
       *    caminho TEM de aparecer, e por onde `lerParametros` valida o que chega. Acusá-lo faria a
       *    guarda proibir a declaração da rota, e a saída seria não declará-la: o contrário do
       *    `FR-001`. Medido em 23/09/2026, quando a rota entrou.
       */
      if (rel === CONTRATO_DE_ROTAS) continue;
      const codigo = codigoSemComentario(readFileSync(arquivo, "utf-8"));
      if (MONTA_CAMINHO.test(codigo)) violacoes.push(`${rel} monta o caminho /turmas/`);
      if (MONTA_PARAMETRO.test(codigo)) violacoes.push(`${rel} monta o parâmetro ?turma=`);
    }
    expect(
      violacoes,
      `endereço de turma montado fora de ${MODULO_AUTORIZADO.split(sep).join("/")}:\n  ` +
        violacoes.join("\n  "),
    ).toEqual([]);
  });

  it("⚠️ e a varredura ignora comentário — prosa sobre o assunto não é violação", () => {
    const comProsa = `
      // este trecho fala de "/turmas/" e de "?turma=" sem montar nada
      /* e aqui também: '/turmas/' dentro de bloco */
      const nada = 1;
    `;
    const limpo = codigoSemComentario(comProsa);
    expect(MONTA_CAMINHO.test(limpo)).toBe(false);
    expect(MONTA_PARAMETRO.test(limpo)).toBe(false);
  });
});

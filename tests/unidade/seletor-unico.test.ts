/**
 * `SC-002` — existe **exatamente um** construtor de seletor de instrutor, e esse um **reordena**.
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção. **Risco: Alto** (é uma diretriz
 * > transversal a praticamente toda a interface; fácil de esquecer em uma tela nova)."*
 * > — documento 04, `RN-ANT-01`
 *
 * ⚠️ AS DUAS METADES SÃO NECESSÁRIAS, E A SEGUNDA É A QUE COSTUMA FALTAR. "Existe um só" garante
 * que ninguém construiu um concorrente. Não garante que o único ordene — e um ponto único que
 * apenas **exibe** aceita lista desordenada: o esquecimento não desaparece, só muda de lugar, sai
 * da tela e entra na consulta. É a decisão de 10/09/2026 no `FR-011.1`.
 *
 * ⚠️ A VARREDURA LÊ CÓDIGO, NÃO COMENTÁRIO. `seletor-turma.tsx` explica no cabeçalho por que **não**
 * é o seletor de instrutor; uma varredura ingênua leria a frase como violação e ensinaria a apagar
 * a documentação para ficar verde.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "components", "lib"];

/** O arquivo que TEM o direito de construir um seletor de instrutor. */
const CANONICO = "components/ciaara/seletor-instrutor.tsx";

/**
 * Sinais de que um arquivo **constrói** uma escolha — não de que a usa.
 *
 * ⚠️ USAR O SELETOR PRONTO NÃO É CONSTRUIR OUTRO. A vitrine consome o canônico e menciona
 * instrutor o tempo todo; ela não pode reprovar, ou o portão estaria medindo a coisa errada.
 */
const SINAIS_DE_CONSTRUCAO = [
  'role="combobox"',
  'role="listbox"',
  'papel="listbox"',
  "<select",
  "SelectTrigger",
  "SelectContent",
];

const SINAL_DE_INSTRUTOR = /instrutor/i;

function arquivosDeCodigo(): string[] {
  const achados: string[] = [];
  const percorrer = (dir: string) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada);
      if (statSync(caminho).isDirectory()) percorrer(caminho);
      else if (/\.tsx?$/.test(entrada)) achados.push(caminho);
    }
  };
  for (const d of DIRETORIOS) percorrer(resolve(RAIZ, d));
  return achados;
}

/** O código sem comentários — a varredura mede o que o arquivo FAZ, não o que ele diz. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function construtoresDeSeletorDeInstrutor(): string[] {
  return arquivosDeCodigo()
    .filter((caminho) => {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      return (
        SINAL_DE_INSTRUTOR.test(codigo) && SINAIS_DE_CONSTRUCAO.some((s) => codigo.includes(s))
      );
    })
    .map((caminho) => relative(RAIZ, caminho).replaceAll("\\", "/"));
}

describe("`SC-002` · exatamente um construtor de seletor de instrutor", () => {
  it("a contagem é um, e é o canônico", () => {
    const achados = construtoresDeSeletorDeInstrutor();
    expect(
      achados,
      `construtores de seletor de instrutor no repositório: ${achados.join(", ")}. ` +
        `A RN-ANT-01 é de Risco ALTO e vale por ponto único: um segundo construtor devolve o ` +
        `"esquecer numa tela nova" que ele existe para eliminar. Use ${CANONICO}.`,
    ).toEqual([CANONICO]);
  });

  it("controle positivo: a varredura enxerga arquivos de verdade", () => {
    // Sem isto, um caminho errado faria o caso acima reprovar por lista vazia — ou, pior, passar.
    expect(arquivosDeCodigo().length, "a varredura não achou código nenhum").toBeGreaterThan(20);
  });
});

describe("`FR-011.1` · o único construtor ORDENA o que recebe", () => {
  const codigo = semComentarios(readFileSync(resolve(RAIZ, CANONICO), "utf8"));

  it("ele importa a função pura de antiguidade", () => {
    expect(
      codigo,
      "o seletor não importa a ordenação de domínio: ele exibe a lista na ordem em que ela chegou",
    ).toContain("ordenarPorAntiguidade");
  });

  it("ele a aplica sobre a lista RECEBIDA, não sobre outra coisa", () => {
    // ⚠️ O detalhe que decide: aplicar sobre `instrutores` é ordenar o que chegou. Aplicar sobre
    // uma lista já filtrada ou já "ordenada por quem chama" devolveria a confiança a quem chama,
    // que é exatamente o que o FR-011.1 recusa.
    expect(codigo).toMatch(/ordenarPorAntiguidade\(\s*instrutores\s*,/);
  });

  it("a escala NÃO está escrita dentro do componente (`RN-ANT-02`, Princípio VII)", () => {
    // Uma tabela de doze postos aqui dentro passaria em todos os casos acima e violaria o
    // princípio em silêncio — e quebraria no dia em que a escala mudasse em config_listas.
    const postos = ["CMG", "CF", "CC", "1°Ten", "2°SG"];
    const escritos = postos.filter((p) => codigo.includes(p));
    expect(
      escritos,
      `a escala de antiguidade foi escrita dentro do componente: ${escritos.join(", ")}. ` +
        `Ela vive em config_listas e chega por propriedade.`,
    ).toEqual([]);
  });
});

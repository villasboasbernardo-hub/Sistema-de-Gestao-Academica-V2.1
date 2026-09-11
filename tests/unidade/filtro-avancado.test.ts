/**
 * A fronteira do filtro avançado (`FR-007`).
 *
 * ⚠️ O QUE ESTE TESTE PROVA É UMA AUSÊNCIA, e por isso ele é escrito em duas metades. A primeira
 * mede o comportamento observável: o componente exibe a contagem que RECEBEU, qualquer que ela
 * seja. A segunda varre o código-fonte atrás de sinais de recálculo e de vocabulário de domínio —
 * porque "ele não conhece instrutor" não é medível pela saída, só pelo que está escrito.
 *
 * ⚠️ A FILTRAGEM CRUZADA É DE QUEM CHAMA, e é isso que está em jogo: cada filtro opera sobre o
 * resultado do anterior, então a contagem de uma opção muda conforme as outras escolhas. Se o
 * componente recalculasse, ele precisaria do dado — e com o dado viria o domínio.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { rotuloComContagem, type OpcaoDeFiltro } from "@/components/ciaara/filtro-avancado";

const FONTE = readFileSync(resolve(process.cwd(), "components/ciaara/filtro-avancado.tsx"), "utf8");

/**
 * O código sem os comentários.
 *
 * ⚠️ ELA EXISTE PORQUE A PRIMEIRA VERSÃO DO TESTE REPROVOU, e reprovou pelo motivo errado: o
 * cabeçalho do componente escreve *"ele não conhece instrutor, turma, disciplina nem curso"*, e a
 * varredura leu a frase como violação. **Uma frase que promete a ausência é o contrário de uma
 * violação** — e um teste que a confunde com uma ensina a apagar a documentação para ficar verde.
 * A varredura lê o que o componente FAZ, não o que ele diz.
 */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

describe("a contagem é EXIBIDA, nunca recalculada (`FR-007`)", () => {
  it("mostra exatamente o número recebido, inclusive um que não bate com dado nenhum", () => {
    // ⚠️ 4.242 é escolhido justamente por ser impossível: se o componente estivesse contando
    // alguma coisa, ele jamais chegaria a este número, e o teste acusaria.
    const opcao: OpcaoDeFiltro = { valor: "x", rotulo: "Etiqueta X", contagem: 4242 };
    expect(rotuloComContagem(opcao)).toBe("Etiqueta X (4242)");
  });

  it("zero é uma contagem, e ela aparece — não é ausência", () => {
    // ⚠️ A DIFERENÇA IMPORTA: uma opção com zero restantes precisa continuar visível, dizendo
    // zero. Omiti-la faria a pessoa concluir que a opção não existe, quando o que aconteceu foi
    // o filtro anterior tê-la esvaziado. É a mesma distinção do `EstadoVazio`.
    expect(rotuloComContagem({ valor: "z", rotulo: "Etiqueta Z", contagem: 0 })).toBe(
      "Etiqueta Z (0)",
    );
  });

  it("sem contagem, o rótulo sai sozinho — sem parênteses vazios", () => {
    expect(rotuloComContagem({ valor: "s", rotulo: "Sem contagem" })).toBe("Sem contagem");
  });
});

describe("o componente não conhece domínio nenhum (`FR-007`)", () => {
  /**
   * ⚠️ ESTA É A LISTA QUE O CONTRATO NOMEIA. Se para atender a spec 006 for preciso escrever uma
   * destas palavras dentro do componente, o componente está errado — ele virou uma tela disfarçada
   * de vocabulário.
   */
  const PALAVRAS_DE_DOMINIO = [
    "instrutor",
    "turma",
    "disciplina",
    "curso",
    "antiguidade",
    "posto",
    "graduacao",
    "graduação",
  ];

  it("nenhuma palavra de domínio aparece no código do filtro", () => {
    const minuscula = CODIGO.toLowerCase();
    const achadas = PALAVRAS_DE_DOMINIO.filter((p) => minuscula.includes(p));
    expect(
      achadas,
      `o filtro avançado passou a conhecer domínio: ${achadas.join(", ")}. ` +
        `Ele é genérico por requisito — o de-para de valor para rótulo é de quem chama.`,
    ).toEqual([]);
  });

  it("nenhum sinal de agregação sobre a contagem — o número vem pronto", () => {
    // ⚠️ Varredura estrutural, e ela é grosseira de propósito: qualquer aritmética envolvendo
    // `contagem` é recálculo, e recálculo exige conhecer o dado.
    const agregacoes = [/contagem\s*[+\-*/]/, /[+\-*/]\s*\w*\.?contagem/, /reduce\(/];
    const achadas = agregacoes.filter((r) => r.test(CODIGO)).map((r) => r.source);
    expect(
      achadas,
      `o filtro parece calcular a contagem em vez de exibi-la: ${achadas.join(", ")}`,
    ).toEqual([]);
  });

  it("controle positivo: a varredura está lendo o arquivo certo", () => {
    // Sem este caso, um caminho errado faria os dois testes acima passarem sobre uma cadeia vazia.
    expect(CODIGO, "a varredura não achou o componente").toContain("FiltroAvancado");
    expect(CODIGO.length).toBeGreaterThan(1000);
    // ⚠️ E que a remoção de comentários não comeu o código junto: sobra corpo de verdade.
    expect(CODIGO, "o removedor de comentários apagou o código").toContain("CollapsibleContent");
  });
});

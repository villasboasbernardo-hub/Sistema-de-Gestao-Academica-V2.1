/**
 * O algoritmo de movimento do *roving tabindex* (`FR-023`, contrato de teclado).
 *
 * ⚠️ ISTO **NÃO SUBSTITUI** O TESTE DE PONTA A PONTA, e o contrato é explícito: *"não se prova por
 * asserção sobre atributo — um `tabindex` correto com um tratador de tecla que não dispara passa na
 * leitura de atributo e falha na mão de quem usa"*. O que se prova aqui é a **aritmética** dos
 * casos de fronteira, que num navegador sairia cara e lenta; que a tecla chega até ela é o
 * `tests/e2e/teclado.spec.ts` que mede.
 *
 * ⚠️ A FUNÇÃO É PURA DE PROPÓSITO. Ela vive dentro do componente porque é lógica de apresentação, e
 * não regra `RN-` — mas é pura pelo mesmo motivo que `lib/dominio/` é: para que os cinco casos de
 * fronteira do contrato tenham caso escrito, e não uma conferência à mão que ninguém repete.
 */
import { describe, expect, it } from "vitest";

import { proximaPosicao, SALTO_DE_PAGINA } from "@/components/ciaara/lista-navegavel";

const GRADE = { linhas: 45, colunas: 4 };
const em = (linha: number, coluna: number) => ({ linha, coluna });

describe("as seis teclas do documento 23 §8.3", () => {
  it("setas movem célula a célula, nas duas dimensões", () => {
    expect(proximaPosicao(em(5, 2), "ArrowDown", GRADE)).toEqual(em(6, 2));
    expect(proximaPosicao(em(5, 2), "ArrowUp", GRADE)).toEqual(em(4, 2));
    expect(proximaPosicao(em(5, 2), "ArrowRight", GRADE)).toEqual(em(5, 3));
    expect(proximaPosicao(em(5, 2), "ArrowLeft", GRADE)).toEqual(em(5, 1));
  });

  it("início e fim vão à primeira e à última COLUNA da linha — não à primeira linha", () => {
    expect(proximaPosicao(em(5, 2), "Home", GRADE)).toEqual(em(5, 0));
    expect(proximaPosicao(em(5, 2), "End", GRADE)).toEqual(em(5, 3));
  });

  it("página acima e abaixo saltam exatamente 20 linhas", () => {
    expect(proximaPosicao(em(22, 1), "PageDown", GRADE)).toEqual(em(42, 1));
    expect(proximaPosicao(em(22, 1), "PageUp", GRADE)).toEqual(em(2, 1));
    expect(SALTO_DE_PAGINA).toBe(20);
  });

  it("tecla que não é de navegação devolve null — o navegador segue o seu curso", () => {
    // ⚠️ `null` quer dizer "não interfira". Sem isso, digitar uma letra num campo dentro da grade
    // seria engolido pelo tratador.
    expect(proximaPosicao(em(0, 0), "a", GRADE)).toBeNull();
    expect(proximaPosicao(em(0, 0), "Tab", GRADE)).toBeNull();
  });
});

describe("os cinco casos de fronteira do contrato de teclado", () => {
  it("1 · grade SEM COLUNAS não quebra: nenhuma tecla move nada", () => {
    const vazia = { linhas: 10, colunas: 0 };
    for (const tecla of ["ArrowDown", "ArrowRight", "Home", "End", "PageDown"]) {
      expect(proximaPosicao(em(0, 0), tecla, vazia)).toBeNull();
    }
  });

  it("2 · grade de UMA COLUNA: setas horizontais não fazem nada", () => {
    // ⚠️ E "nada" aqui é `null`, não a mesma posição: quem digita no campo de busca de um seletor
    // precisa que a seta continue movendo o cursor do texto.
    const lista = { linhas: 10, colunas: 1 };
    expect(proximaPosicao(em(3, 0), "ArrowRight", lista)).toBeNull();
    expect(proximaPosicao(em(3, 0), "ArrowLeft", lista)).toBeNull();
    expect(proximaPosicao(em(3, 0), "ArrowDown", lista)).toEqual(em(4, 0));
  });

  it("3 · grade SEM LINHAS: nada a navegar, e nenhuma exceção", () => {
    const semLinhas = { linhas: 0, colunas: 4 };
    expect(() => proximaPosicao(em(0, 0), "ArrowDown", semLinhas)).not.toThrow();
    expect(proximaPosicao(em(0, 0), "ArrowDown", semLinhas)).toBeNull();
  });

  it("4 · página abaixo com menos de 20 linhas restantes vai à ÚLTIMA, não para fora", () => {
    expect(proximaPosicao(em(40, 0), "PageDown", GRADE)).toEqual(em(44, 0));
    expect(proximaPosicao(em(3, 0), "PageUp", GRADE)).toEqual(em(0, 0));
  });

  it("5 · na última célula, seta para baixo FICA — a grade não rola circularmente", () => {
    // ⚠️ É decisão, não limitação. Voltar ao topo ao passar do fim faz quem não vê a tela perder a
    // noção de onde está: o fim da lista precisa ser sentido como fim.
    expect(proximaPosicao(em(44, 3), "ArrowDown", GRADE)).toEqual(em(44, 3));
    expect(proximaPosicao(em(44, 3), "ArrowRight", GRADE)).toEqual(em(44, 3));
    expect(proximaPosicao(em(0, 0), "ArrowUp", GRADE)).toEqual(em(0, 0));
    expect(proximaPosicao(em(0, 0), "ArrowLeft", GRADE)).toEqual(em(0, 0));
  });

  it("no limite, a posição devolvida é a MESMA — e isso não é `null`", () => {
    // ⚠️ A diferença decide se a página rola por baixo da grade. Devolver posição faz quem chama
    // impedir o comportamento padrão; devolver `null` deixaria a página inteira rolar a cada seta
    // pressionada no fim da tabela.
    expect(proximaPosicao(em(44, 3), "ArrowDown", GRADE)).not.toBeNull();
  });
});

describe("a posição nunca sai da grade, em nenhuma combinação", () => {
  const teclas = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ];
  const grades = [
    { linhas: 1, colunas: 1 },
    { linhas: 3, colunas: 8 },
    { linhas: 45, colunas: 4 },
    { linhas: 300, colunas: 8 },
  ];

  it.each(grades)("grade de $linhas × $colunas", (grade) => {
    for (const tecla of teclas) {
      for (const linha of [0, Math.floor(grade.linhas / 2), grade.linhas - 1]) {
        for (const coluna of [0, grade.colunas - 1]) {
          const destino = proximaPosicao(em(linha, coluna), tecla, grade);
          if (!destino) continue;
          expect(destino.linha).toBeGreaterThanOrEqual(0);
          expect(destino.linha).toBeLessThan(grade.linhas);
          expect(destino.coluna).toBeGreaterThanOrEqual(0);
          expect(destino.coluna).toBeLessThan(grade.colunas);
        }
      }
    }
  });
});

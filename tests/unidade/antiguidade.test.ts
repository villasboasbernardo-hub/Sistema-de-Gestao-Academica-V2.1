/**
 * `RN-ANT-01` (**Risco: Alto**) e `RN-ANT-02` — ordenação por antiguidade.
 *
 * ⚠️ A ESCALA É INSUMO DO TESTE, NÃO CONSTANTE DO DOMÍNIO. Ela vive em `config_listas` e chega por
 * argumento (`RN-ANT-02`, Princípio VII). Escrevê-la dentro de `lib/dominio/antiguidade.ts` faria
 * todo caso abaixo passar enquanto o princípio é violado em silêncio — por isso ela está aqui, no
 * papel de dado que a Server Action carregaria.
 */
import { describe, expect, it } from "vitest";

import {
  ordenarPorAntiguidade,
  pesoAntiguidade,
  type EscalaDeAntiguidade,
  type Ordenavel,
} from "@/lib/dominio/antiguidade";

/** Os doze postos do `RN-ANT-02`, como `config_listas` os entrega. Peso menor = mais antigo. */
const ESCALA: EscalaDeAntiguidade = {
  CMG: 1,
  CF: 2,
  CC: 3,
  CT: 4,
  "1°Ten": 5,
  "2°Ten": 6,
  SO: 7,
  "1°SG": 8,
  "2°SG": 9,
  "3°SG": 10,
  CB: 11,
  MN: 12,
};

const pessoa = (pg: string, nomeCompleto: string): Ordenavel => ({ pg, nomeCompleto });

describe("`RN-ANT-02` · o peso vem do P/G, pela escala recebida", () => {
  it.each(Object.entries(ESCALA))("%s pesa %i", (pg, peso) => {
    expect(pesoAntiguidade(pg, ESCALA)).toBe(peso);
  });

  it("os doze postos estão cobertos — controle positivo da própria escala", () => {
    // Sem este caso, uma escala encolhida por engano faria o `it.each` acima rodar menos vezes e
    // continuar verde, que é cobertura fingida.
    expect(Object.keys(ESCALA)).toHaveLength(12);
  });

  it("posto desconhecido devolve null, NÃO zero", () => {
    // ⚠️ Zero seria o mais antigo de todos, e um dado que ninguém conferiu iria parar no topo da
    // lista — o pior lugar possível para ele.
    expect(pesoAntiguidade("Almirante", ESCALA)).toBeNull();
  });

  it("caixa e espaço em volta não impedem o casamento da chave", () => {
    expect(pesoAntiguidade("  cmg ", ESCALA)).toBe(1);
  });

  it("a função NÃO conhece a escala por dentro: escala vazia não reconhece ninguém", () => {
    // ⚠️ É ESTE CASO QUE PROVA O PRINCÍPIO VII. Se um dia alguém escrever a tabela dos doze postos
    // dentro do domínio, ele reprova — e é o único caso aqui que reprovaria.
    expect(pesoAntiguidade("CMG", {})).toBeNull();
  });
});

describe("`RN-ANT-01` · a lista sai em antiguidade crescente", () => {
  it("ordena do mais antigo ao mais moderno, ignorando a ordem de chegada", () => {
    const entrada = [
      pessoa("MN", "Zeferino"),
      pessoa("CMG", "Almeida"),
      pessoa("CT", "Barbosa"),
      pessoa("1°SG", "Carvalho"),
    ];
    const { ordenados } = ordenarPorAntiguidade(entrada, ESCALA);
    expect(ordenados.map((p) => p.nomeCompleto)).toEqual([
      "Almeida",
      "Barbosa",
      "Carvalho",
      "Zeferino",
    ]);
  });

  it("empate de posto resolve por nome, e o resultado é determinístico", () => {
    // ⚠️ Doze pesos para 177 instrutores significa empate em quase toda tela. Sem desempate, duas
    // telas com a mesma lista poderiam exibi-la em ordens diferentes e ninguém saberia qual está
    // certa.
    const { ordenados } = ordenarPorAntiguidade(
      [pessoa("CT", "Silva"), pessoa("CT", "Almeida"), pessoa("CT", "Ferreira")],
      ESCALA,
    );
    expect(ordenados.map((p) => p.nomeCompleto)).toEqual(["Almeida", "Ferreira", "Silva"]);
  });

  it("o desempate por nome respeita acento — é localeCompare, não código de caractere", () => {
    const { ordenados } = ordenarPorAntiguidade(
      [pessoa("CT", "Zacarias"), pessoa("CT", "Ávila"), pessoa("CT", "Bueno")],
      ESCALA,
    );
    expect(ordenados.map((p) => p.nomeCompleto)).toEqual(["Ávila", "Bueno", "Zacarias"]);
  });

  it("a entrada não é modificada — a função é pura", () => {
    const entrada = [pessoa("MN", "Zeferino"), pessoa("CMG", "Almeida")];
    const copia = entrada.map((p) => p.nomeCompleto);
    ordenarPorAntiguidade(entrada, ESCALA);
    expect(entrada.map((p) => p.nomeCompleto)).toEqual(copia);
  });

  it("lista vazia devolve lista vazia, sem aviso e sem exceção", () => {
    const { ordenados, avisos } = ordenarPorAntiguidade([], ESCALA);
    expect(ordenados).toEqual([]);
    expect(avisos).toEqual([]);
  });
});

describe("`RN-DEG-01` · posto desconhecido vai para o fim, com aviso, e NUNCA some", () => {
  const entrada = [
    pessoa("Almirante", "Desconhecido Um"),
    pessoa("CT", "Barbosa"),
    pessoa("CMG", "Almeida"),
    pessoa("Guarda-Marinha", "Desconhecido Dois"),
  ];

  it("todo mundo continua na lista — a contagem não muda", () => {
    // ⚠️ ESTE É O CASO QUE IMPORTA. Filtrar o que a escala não conhece seria a saída fácil e a
    // pior: o instrutor desapareceria, e quem o procurasse concluiria que não está cadastrado.
    const { ordenados } = ordenarPorAntiguidade(entrada, ESCALA);
    expect(ordenados).toHaveLength(entrada.length);
  });

  it("os conhecidos vêm primeiro, em ordem; os desconhecidos ficam no fim", () => {
    const { ordenados } = ordenarPorAntiguidade(entrada, ESCALA);
    expect(ordenados.slice(0, 2).map((p) => p.nomeCompleto)).toEqual(["Almeida", "Barbosa"]);
    expect(
      ordenados
        .slice(2)
        .map((p) => p.nomeCompleto)
        .sort(),
    ).toEqual(["Desconhecido Dois", "Desconhecido Um"]);
  });

  it("o aviso nomeia o P/G e conta quantos foram afetados", () => {
    const { avisos } = ordenarPorAntiguidade(entrada, ESCALA);
    expect(avisos.map((a) => a.pg).sort()).toEqual(["Almirante", "Guarda-Marinha"]);
    expect(avisos.every((a) => a.quantos === 1)).toBe(true);
    expect(avisos[0]?.mensagem).toContain("config_listas");
  });

  it("o mesmo P/G desconhecido repetido gera UM aviso, com a contagem certa", () => {
    const { avisos } = ordenarPorAntiguidade(
      [pessoa("Almirante", "A"), pessoa("Almirante", "B"), pessoa("Almirante", "C")],
      ESCALA,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.quantos).toBe(3);
  });

  it("escala inteira ausente: ninguém some, e o aviso sai para cada P/G", () => {
    // Degradação segura no limite: a dependência não veio, e a tela ainda tem o que mostrar.
    const { ordenados, avisos } = ordenarPorAntiguidade(entrada, {});
    expect(ordenados).toHaveLength(4);
    expect(avisos).toHaveLength(4);
  });
});

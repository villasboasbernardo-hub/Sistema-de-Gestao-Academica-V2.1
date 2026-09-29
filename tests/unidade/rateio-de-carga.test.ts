/**
 * `FR-041` a `FR-041.7` e `FR-042` — o rateio nos cinco casos (`RN-MAT-05`, decisão A-1).
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O 10 ENTRE 3, e o que ele discrimina é uma MUDANÇA DE REGRA, não um
 * defeito.** A v2.0 (spec 032, `FR-007`) punha o resto **no último da lista** — daria `3/3/4`. A
 * decisão A-1 (Bernardo Villas Boas, 25/09/2026) manda pôr **nos mais antigos** — `4/3/3`. Um teste
 * que só exigisse "a soma fecha em 10" daria o **mesmo veredito antes e depois** e não testaria nada
 * da mudança.
 *
 * ⚠️ **E HÁ UM SEGUNDO CASO QUE DISCRIMINA, do defeito que existia:** a view anterior fazia
 * `round(ch / n, 2)` e devolvia **3,33 três vezes, somando 9,99**. Por isso todo esperado aqui é
 * **inteiro**, e há uma asserção explícita de que nenhuma parcela é fracionária — uma regressão para
 * fração passaria em qualquer teste que só somasse.
 *
 * ⚠️ **A TABELA DE CASOS É COMPARTILHADA COM `tests/invariantes/rateio-da-view.test.ts`**, que semeia
 * o banco com os mesmos casos e cobra da view o mesmo número. É isso que faz do `FR-041.7` uma
 * afirmação verificável em vez de uma promessa.
 */
import { describe, expect, it } from "vitest";

import {
  CASOS_CANONICOS,
  explicacaoDoCaso,
  ratear,
  type CasoDoRateio,
} from "@/lib/dominio/rateio-de-carga";

const temposDe = (entrada: Parameters<typeof ratear>[0]) =>
  ratear(entrada).parcelas.map((p) => p.tempos);

describe("`FR-041` · a tabela de casos canônicos", () => {
  it("há caso canônico para testar — controle positivo", () => {
    expect(CASOS_CANONICOS.length, "a tabela de casos está vazia").toBeGreaterThan(9);
  });

  it("⚠️ os CINCO casos estão representados — nenhum ficou sem cobertura", () => {
    const cobertos = new Set(CASOS_CANONICOS.map((c) => c.caso));
    const esperados: CasoDoRateio[] = [
      "um_instrutor",
      "simultaneo",
      "divisao_igual",
      "por_tempos_digitados",
      "por_unidades",
    ];
    for (const caso of esperados) {
      expect(cobertos.has(caso), `nenhum caso canônico exercita \`${caso}\``).toBe(true);
    }
  });

  it.each(CASOS_CANONICOS.map((c) => [c.nome, c] as const))("%s", (_nome, caso) => {
    const resultado = ratear(caso.entrada);
    expect(resultado.parcelas.map((p) => p.tempos)).toEqual([...caso.esperado]);
    expect(resultado.caso).toBe(caso.caso);
  });

  it("⚠️ NENHUMA parcela é fracionária, em caso nenhum — era o defeito da view anterior", () => {
    for (const caso of CASOS_CANONICOS) {
      for (const parcela of ratear(caso.entrada).parcelas) {
        expect(
          Number.isInteger(parcela.tempos),
          `${caso.nome}: parcela ${parcela.tempos} não é inteira`,
        ).toBe(true);
      }
    }
  });
});

describe("⚠️ `FR-042` · O CASO QUE DISCRIMINA — o resto vai ao MAIS ANTIGO, não ao último", () => {
  it("10 TA entre 3 dá 4/3/3 — a v2.0 dava 3/3/4", () => {
    const tempos = temposDe({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [{ instrutorId: "antigo" }, { instrutorId: "meio" }, { instrutorId: "moderno" }],
    });
    expect(tempos).toEqual([4, 3, 3]);
    // Explícito: a formulação da v2.0 é o que este caso existe para reprovar.
    expect(tempos).not.toEqual([3, 3, 4]);
  });

  it("e a soma fecha EXATAMENTE com a CH — 3,33 três vezes somava 9,99", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [{ instrutorId: "a" }, { instrutorId: "b" }, { instrutorId: "c" }],
    });
    expect(resultado.soma).toBe(10);
    expect(resultado.fecha).toBe(true);
  });

  it("11 entre 3 dá 4/4/3 — o resto de 2 vai aos DOIS mais antigos", () => {
    expect(
      temposDe({
        cargaHorariaTempos: 11,
        modo: "dividido",
        instrutores: [{ instrutorId: "a" }, { instrutorId: "b" }, { instrutorId: "c" }],
      }),
    ).toEqual([4, 4, 3]);
  });

  it("⚠️ a função NÃO reordena a lista — quem ordena é a antiguidade, fora daqui", () => {
    // Trocando a ordem de entrada, o resto acompanha a POSIÇÃO. É o contrato do módulo: a lista
    // chega ordenada. Se ele reordenasse por conta própria, haveria uma terceira escala de
    // antiguidade no sistema — e o resto iria para as pessoas erradas sem nada acusar.
    const invertida = temposDe({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [{ instrutorId: "moderno" }, { instrutorId: "meio" }, { instrutorId: "antigo" }],
    });
    expect(invertida).toEqual([4, 3, 3]);
  });
});

describe("`FR-041.2` · simultâneo — a soma MAIOR que a CH é o certo", () => {
  it("cada instrutor recebe a CH integral", () => {
    const resultado = ratear({
      cargaHorariaTempos: 20,
      modo: "simultaneo",
      instrutores: [{ instrutorId: "a" }, { instrutorId: "b" }, { instrutorId: "c" }],
    });
    expect(resultado.parcelas.map((p) => p.tempos)).toEqual([20, 20, 20]);
    expect(resultado.soma).toBe(60);
  });

  it("⚠️ e `fecha` é VERDADEIRO apesar disso — tratar como erro negaria a `RN-MAT-05`", () => {
    // ⚠️ Este é o caso que distingue "a soma não bate" de "a regra manda não bater". Sem ele, um
    //    desenho que exigisse `soma === CH` sempre passaria nos outros quatro casos e acusaria erro
    //    justamente na disciplina prática de fim de curso, que é o motivo de a regra existir.
    const resultado = ratear({
      cargaHorariaTempos: 20,
      modo: "simultaneo",
      instrutores: [{ instrutorId: "a" }, { instrutorId: "b" }],
    });
    expect(resultado.fecha).toBe(true);
    expect(resultado.motivo).toBeNull();
  });
});

describe("`FR-041.4` · por TA digitados — a soma exata, e a recusa quando não fecha", () => {
  it("soma exata é aceita", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 7 },
        { instrutorId: "b", temposDigitados: 3 },
      ],
    });
    expect(resultado.fecha).toBe(true);
    expect(resultado.motivo).toBeNull();
  });

  it("⚠️ soma ERRADA é recusada, e o motivo traz OS DOIS números", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 7 },
        { instrutorId: "b", temposDigitados: 2 },
      ],
    });
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("9");
    expect(resultado.motivo).toContain("10");
  });

  it("⚠️ preencher SÓ PARTE é recusado — não se divide o resto por inferência (`Q-03`)", () => {
    // ⚠️ É o caso que discrimina o desenho: uma implementação que completasse os que faltam com a
    //    divisão igual gravaria escolha que ninguém fez, e passaria numa asserção que só olhasse a
    //    soma final.
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 7 },
        { instrutorId: "b", temposDigitados: null },
      ],
    });
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("branco");
  });

  it("parcela fracionária é recusada, com a frase certa", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 5.5 },
        { instrutorId: "b", temposDigitados: 4.5 },
      ],
    });
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("inteiros");
  });

  it("⚠️ o digitado VENCE o modo simultâneo — é a ordem de precedência da view", () => {
    // Se os ramos estivessem invertidos, a tela mostraria a CH integral e o banco o digitado.
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "simultaneo",
      instrutores: [
        { instrutorId: "a", temposDigitados: 6 },
        { instrutorId: "b", temposDigitados: 4 },
      ],
    });
    expect(resultado.caso).toBe("por_tempos_digitados");
    expect(resultado.parcelas.map((p) => p.tempos)).toEqual([6, 4]);
  });
});

describe("`FR-041.5` · por Unidade de Ensino", () => {
  it("a CH de cada um é a soma das unidades dele", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDasUnidades: 6 },
        { instrutorId: "b", temposDasUnidades: 4 },
      ],
    });
    expect(resultado.caso).toBe("por_unidades");
    expect(resultado.fecha).toBe(true);
  });

  it("⚠️ instrutor SEM nenhuma unidade é recusado, e a frase diz isso", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDasUnidades: 10 },
        { instrutorId: "b", temposDasUnidades: 0 },
      ],
    });
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("sem nenhuma unidade");
  });

  it("⚠️ unidade FALTANDO é recusada — a soma menor que a CH acusa", () => {
    const resultado = ratear({
      cargaHorariaTempos: 12,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDasUnidades: 6 },
        { instrutorId: "b", temposDasUnidades: 4 },
      ],
    });
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("12");
  });

  it("⚠️ a UE VENCE o digitado — os dois modos não coexistem, e o banco recusa a mistura", () => {
    const resultado = ratear({
      cargaHorariaTempos: 10,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDigitados: 9, temposDasUnidades: 6 },
        { instrutorId: "b", temposDigitados: 1, temposDasUnidades: 4 },
      ],
    });
    expect(resultado.caso).toBe("por_unidades");
    expect(resultado.parcelas.map((p) => p.tempos)).toEqual([6, 4]);
  });
});

describe("`RN-DEG-01` · sem instrutor, e a explicação do caso", () => {
  it("lista vazia não estoura — devolve vazio com motivo", () => {
    const resultado = ratear({ cargaHorariaTempos: 10, modo: "dividido", instrutores: [] });
    expect(resultado.parcelas).toEqual([]);
    expect(resultado.fecha).toBe(false);
    expect(resultado.motivo).toContain("Nenhum instrutor");
  });

  it("⚠️ todo caso tem explicação em português, e nenhuma é o nome do caso", () => {
    const casos: CasoDoRateio[] = [
      "um_instrutor",
      "simultaneo",
      "divisao_igual",
      "por_tempos_digitados",
      "por_unidades",
    ];
    for (const caso of casos) {
      const frase = explicacaoDoCaso(caso);
      expect(frase.length).toBeGreaterThan(20);
      expect(frase).not.toContain("_");
    }
  });
});

/**
 * `RN-DIST-01` e `RN-DIST-02` (*Risco: Alto*) — a função **única** de distribuição da CH pelas
 * semanas da janela da disciplina.
 *
 * ⚠️ **AS SEMANAS ESPERADAS NÃO FORAM INVENTADAS: FORAM MEDIDAS COM `semanaIsoDe` DO PRÓPRIO
 * REPOSITÓRIO** (`lib/dominio/carga-semanal.ts`), em 05/10/2026, antes de este arquivo existir
 * (regra 9.3). O que saiu: **02/03/2026 é segunda da semana 10 de 2026**; 09/03 abre a 11; 16/03 a
 * 12; 23/03 a 13; 30/03 a 14; **21/12/2026 é segunda da 52**, 28/12/2026 abre a **53 de 2026** (ela
 * termina em 03/01/2027) e **04/01/2027 abre a semana 1 de 2027**.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O 10 EM 3 SEMANAS, e ele vale por duas razões.** A primeira: `[3, 3, 4]`
 * reprova qualquer implementação que ponha o resto nas **primeiras** semanas — a `RN-DIST-02` diz, com
 * essas palavras, que *"a última semana da janela sempre recebe o resto"*, e o comentário de catálogo
 * de `disciplinas.ch_semanal` repete. A segunda: ele é o mesmo 10/3 que a `A-1` resolveu como `4/3/3`
 * **entre instrutores** (`rateio-de-carga.ts`), e as duas regras são **diferentes** — ter o número das
 * duas escrito, cada um no seu teste, é o que impede alguém de "uniformizar" as pontas.
 *
 * ⚠️ **A SOMA FECHAR É O INVARIANTE NOMEADO da `RN-DIST-02`**, e por isso ela é asserção de todo caso,
 * não de um só: o defeito que o repositório já pagou (3,33 três vezes somando 9,99 na
 * `vw_instrutor_carga_prevista`) passava justamente por não haver essa asserção em lugar nenhum.
 */

import { describe, expect, it } from "vitest";

import {
  distribuirPorSemana,
  previstoDaSemana,
  semanasDaJanela,
  type JanelaDaDisciplina,
} from "@/lib/dominio/distribuicao-semanal";

const janela = (inicio: string, termino: string, chTempos: number): JanelaDaDisciplina => ({
  inicio,
  termino,
  chTempos,
});

/** Os TA de cada semana, na ordem — a forma em que o esperado é legível de relance. */
const ta = (j: JanelaDaDisciplina): readonly number[] => distribuirPorSemana(j).map((p) => p.ta);

/** As semanas, como `ano/numero` — sem a segunda e o domingo, que o caso não mede. */
const identidades = (j: JanelaDaDisciplina): readonly string[] =>
  distribuirPorSemana(j).map((p) => `${p.ano}/${p.numero}`);

const soma = (numeros: readonly number[]): number => numeros.reduce((t, n) => t + n, 0);

/** Soma dias a uma data `aaaa-mm-dd`. Só o gerador da propriedade usa. */
function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia) + dias))
    .toISOString()
    .slice(0, 10);
}

describe("`RN-DIST-01` · as semanas da janela são as semanas ISO que ela cobre", () => {
  it("janela dentro de uma única semana: uma semana, e a CH inteira nela", () => {
    const j = janela("2026-03-02", "2026-03-06", 8);
    expect(identidades(j)).toEqual(["2026/10"]);
    expect(ta(j)).toEqual([8]);
    expect(soma(ta(j))).toBe(8);
  });

  it("a semana traz a segunda e o domingo, como `carga-semanal.ts` já os dá", () => {
    expect(semanasDaJanela({ inicio: "2026-03-02", termino: "2026-03-06" })).toEqual([
      { ano: 2026, numero: 10, segunda: "2026-03-02", domingo: "2026-03-08" },
    ]);
  });

  it("janela que ATRAVESSA A VIRADA DO ANO: 52 e 53 de 2026, depois a semana 1 de 2027", () => {
    const j = janela("2026-12-21", "2027-01-10", 10);
    expect(identidades(j)).toEqual(["2026/52", "2026/53", "2027/1"]);
    expect(ta(j)).toEqual([3, 3, 4]);
    expect(soma(ta(j))).toBe(10);
  });

  /*
   * ⚠️ ESTE CASO EXISTE PARA QUE A DIVERGÊNCIA SEJA ESPERADA, E NÃO DESCOBERTA COMO DEFEITO: sete
   *    dias de quarta a terça são UMA semana para `disciplinas.semanas` — `floor(6 / 7) + 1` — e DUAS
   *    semanas ISO aqui, porque a janela atravessa um domingo. O DSA é lançado por semana ISO, então
   *    é esta a contagem que pode ser comparada com o lançado.
   */
  it("sete dias de quarta a terça são DUAS semanas ISO, e a coluna gerada diria uma", () => {
    expect(identidades(janela("2026-03-04", "2026-03-10", 10))).toEqual(["2026/10", "2026/11"]);
  });
});

describe("`RN-DIST-02` · divisão inteira, soma fechada e o resto na ÚLTIMA semana", () => {
  it("CH 10 em 3 semanas dá [3, 3, 4] — o resto na última, nunca nas primeiras", () => {
    const j = janela("2026-03-02", "2026-03-20", 10);
    expect(identidades(j)).toEqual(["2026/10", "2026/11", "2026/12"]);
    expect(ta(j)).toEqual([3, 3, 4]);
    expect(soma(ta(j))).toBe(10);
    // 🛑 `[4, 3, 3]` é a `A-1`, que reparte entre INSTRUTORES. Entre SEMANAS vale a `RN-DIST-02`.
    expect(ta(j)).not.toEqual([4, 3, 3]);
  });

  it("CH 7 em 2 semanas dá [3, 4], e a soma fecha em 7", () => {
    const j = janela("2026-03-02", "2026-03-13", 7);
    expect(ta(j)).toEqual([3, 4]);
    expect(soma(ta(j))).toBe(7);
  });

  it("CH MENOR que o número de semanas: [0, 0, 0, 0, 2], soma 2 e nenhuma fração", () => {
    const j = janela("2026-03-02", "2026-04-03", 2);
    expect(identidades(j)).toEqual(["2026/10", "2026/11", "2026/12", "2026/13", "2026/14"]);
    expect(ta(j)).toEqual([0, 0, 0, 0, 2]);
    expect(soma(ta(j))).toBe(2);
    // ⚠️ O zero DENTRO da lista é previsto medido: a janela cobre a semana e a CH não a alcança.
    expect(ta(j).every(Number.isInteger)).toBe(true);
  });

  /*
   * O CONTROLE NEGATIVO: com resto zero, a última semana NÃO ganha nada a mais. Sem ele, uma
   * implementação que somasse sempre 1 na última passaria em todos os casos acima menos neste.
   */
  it("CH divisível pelo número de semanas: todas iguais, e a última sem bônus", () => {
    const j = janela("2026-03-02", "2026-03-20", 9);
    expect(ta(j)).toEqual([3, 3, 3]);
    expect(soma(ta(j))).toBe(9);
  });

  it("a soma fecha para 20 janelas sintéticas — o invariante nomeado da regra", () => {
    /*
     * ⚠️ AS 20 SÃO DETERMINÍSTICAS, NÃO ALEATÓRIAS. Um gerador aleatório faria este caso reprovar em
     *    uma execução a cada tantas, e teste que falha só às vezes se lê como azar — o modo de falha
     *    que a suíte de ponta a ponta desta base já pagou. A faixa é a que a `RN-DIST-02` manda
     *    exercitar: CH de 1 a 400, janelas de 1 a 52 semanas.
     */
    const partida = "2026-01-05"; // segunda-feira, medido com `semanaIsoDe`
    for (let i = 0; i < 20; i += 1) {
      const semanas = 1 + ((i * 7) % 52);
      const chTempos = 1 + ((i * 37) % 400);
      const j = janela(partida, somarDias(partida, semanas * 7 - 1), chTempos);
      const distribuicao = ta(j);

      expect(distribuicao, `janela ${i}: ${semanas} semanas`).toHaveLength(semanas);
      expect(soma(distribuicao), `janela ${i}: CH ${chTempos}`).toBe(chTempos);
      expect(distribuicao.every(Number.isInteger)).toBe(true);
      // O resto inteiro está na ÚLTIMA, e em nenhuma outra.
      const ultima = distribuicao[semanas - 1] ?? 0;
      const primeira = distribuicao[0] ?? 0;
      expect(ultima - primeira).toBe(chTempos % semanas);
    }
  });
});

describe("`RN-DEG-01` · ausência devolve lista vazia, nunca número inventado", () => {
  it("janela invertida (término antes do início) não é janela", () => {
    expect(distribuirPorSemana(janela("2026-03-20", "2026-03-02", 10))).toEqual([]);
    expect(semanasDaJanela({ inicio: "2026-03-20", termino: "2026-03-02" })).toEqual([]);
  });

  it("CH zero ou negativa não produz semana nenhuma — e não produz lista de zeros", () => {
    expect(distribuirPorSemana(janela("2026-03-02", "2026-03-20", 0))).toEqual([]);
    expect(distribuirPorSemana(janela("2026-03-02", "2026-03-20", -5))).toEqual([]);
  });

  it("data que NÃO EXISTE no calendário é recusada, em vez de rolar para o mês seguinte", () => {
    // ⚠️ `Date.UTC(2026, 1, 30)` rola para 02/03 sem erro: a janela passaria a valer por outra semana.
    expect(distribuirPorSemana(janela("2026-02-30", "2026-03-20", 10))).toEqual([]);
    expect(distribuirPorSemana(janela("2026-03-02", "2026-04-31", 10))).toEqual([]);
  });

  it("formato fora de `aaaa-mm-dd` é recusado", () => {
    expect(distribuirPorSemana(janela("02/03/2026", "2026-03-20", 10))).toEqual([]);
    expect(distribuirPorSemana(janela("2026-03-02", "", 10))).toEqual([]);
  });
});

describe("`RN-DIST-01` · o previsto de uma semana vem da mesma função, sem segunda conta", () => {
  const j = janela("2026-03-02", "2026-03-20", 10);

  it("semana dentro da janela devolve o TA dela — inclusive a última, com o resto", () => {
    expect(previstoDaSemana(j, { ano: 2026, numero: 10 })).toBe(3);
    expect(previstoDaSemana(j, { ano: 2026, numero: 11 })).toBe(3);
    expect(previstoDaSemana(j, { ano: 2026, numero: 12 })).toBe(4);
  });

  it("semana FORA da janela devolve 0 — o controle negativo", () => {
    expect(previstoDaSemana(j, { ano: 2026, numero: 9 })).toBe(0);
    expect(previstoDaSemana(j, { ano: 2026, numero: 13 })).toBe(0);
    expect(previstoDaSemana(j, { ano: 2027, numero: 1 })).toBe(0);
  });

  it("janela inválida devolve 0, e quem precisa distinguir pergunta à distribuição", () => {
    const invertida = janela("2026-03-20", "2026-03-02", 10);
    expect(previstoDaSemana(invertida, { ano: 2026, numero: 10 })).toBe(0);
    expect(distribuirPorSemana(invertida)).toHaveLength(0);
  });
});

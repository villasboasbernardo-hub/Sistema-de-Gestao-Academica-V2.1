/**
 * `FR-002` · os indicadores do catálogo — **lista fechada**, quatro coisas e nada mais.
 *
 * ⚠️ **O FECHAMENTO É METADE DO REQUISITO.** A decisão de 17/09/2026 (A-6) escolheu dois indicadores
 * e dois gráficos, e mandou a paridade com a v2.0 — total de cursos, turmas ativas, indicadores de
 * turma — para a `PEND-5a-2`. Um teste que só conferisse os quatro passaria também num painel com
 * oito, e a fatia entregaria mais do que foi decidido. Por isso há um caso sobre **as chaves**.
 *
 * ⚠️ **A MÉDIA É EM DIAS, E ISSO NÃO É DETALHE.** `duracao_dias` não tem nulo; `duracao_semanas` tem
 * **12** (medido em 16/09/2026). Uma média em semanas seria calculada sobre metade da base sem que
 * o número dissesse isso.
 *
 * Origem: `FR-002` da spec 009, `RF-CURSOS-02`, A-6.
 */
import { describe, expect, it } from "vitest";

import { CLASSIFICACOES_DE_CURSO } from "@/lib/dominio/classificacoes-de-curso";
import {
  indicadoresDoCatalogo,
  type CursoParaIndicador,
} from "@/lib/dominio/indicadores-do-catalogo";

const curso = (classificacao: string, duracaoDias: number | null): CursoParaIndicador => ({
  classificacao,
  duracaoDias,
});

/** Uma base pequena e conferível à mão — é o que permite apontar o número errado. */
const BASE: readonly CursoParaIndicador[] = [
  curso("regular", 120),
  curso("regular", 100),
  curso("regular", 80),
  curso("expedito", 10),
  curso("expedito", 20),
  curso("especial", 15),
  curso("aperfeicoamento_avancado", 200),
  curso("estagio_qualificacao", 30),
  curso("estagio_qualificacao", 40),
];

describe("`FR-002` · os dois indicadores", () => {
  it("conta os cursos regulares e os estágios de qualificação", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.cursosRegulares).toBe(3);
    expect(i.estagiosDeQualificacao).toBe(2);
  });

  it("base vazia devolve zero nos dois, e não estoura", () => {
    const i = indicadoresDoCatalogo([]);
    expect(i.cursosRegulares).toBe(0);
    expect(i.estagiosDeQualificacao).toBe(0);
  });
});

describe("`FR-002` · duração média em DIAS por classificação", () => {
  it("a média é a das durações informadas, arredondada", () => {
    const i = indicadoresDoCatalogo(BASE);
    const por = (c: string) => i.duracaoMediaPorClassificacao.find((d) => d.classificacao === c);
    expect(por("regular")?.dias).toBe(100); // (120 + 100 + 80) / 3
    expect(por("expedito")?.dias).toBe(15); // (10 + 20) / 2
    expect(por("aperfeicoamento_avancado")?.dias).toBe(200);
    expect(por("estagio_qualificacao")?.dias).toBe(35);
  });

  it("arredonda, e não trunca", () => {
    const i = indicadoresDoCatalogo([curso("regular", 10), curso("regular", 11)]);
    expect(i.duracaoMediaPorClassificacao.find((d) => d.classificacao === "regular")?.dias).toBe(
      11,
    );
  });

  it("⚠️ classificação sem curso dá `null`, NUNCA zero — zero seria 'a média é zero dias'", () => {
    const i = indicadoresDoCatalogo([curso("regular", 120)]);
    const expedito = i.duracaoMediaPorClassificacao.find((d) => d.classificacao === "expedito");
    expect(expedito?.dias).toBeNull();
  });

  it("⚠️ duração nula não entra na média nem a zera — ela sai da conta", () => {
    // Hoje `duracao_dias` não tem nulo no banco; se um dia tiver, a média não pode despencar.
    const i = indicadoresDoCatalogo([
      curso("regular", 100),
      curso("regular", null),
      curso("regular", 200),
    ]);
    const regular = i.duracaoMediaPorClassificacao.find((d) => d.classificacao === "regular");
    expect(regular?.dias).toBe(150);
    expect(regular?.base, "a média precisa dizer sobre quantos cursos foi feita").toBe(2);
  });

  it("⚠️ classificação em que TODOS têm duração nula dá `null`, e base 0", () => {
    const i = indicadoresDoCatalogo([curso("especial", null)]);
    const especial = i.duracaoMediaPorClassificacao.find((d) => d.classificacao === "especial");
    expect(especial?.dias).toBeNull();
    expect(especial?.base).toBe(0);
  });

  it("traz as cinco, na ordem do Glossário, com rótulo de tela", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.duracaoMediaPorClassificacao.map((d) => d.classificacao)).toEqual([
      ...CLASSIFICACOES_DE_CURSO,
    ]);
    expect(i.duracaoMediaPorClassificacao[0]?.rotulo).toBe("Curso Regular");
  });
});

describe("`FR-002` · cursos por classificação", () => {
  it("conta cada grupo, e zero é zero de verdade", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.cursosPorClassificacao).toEqual([
      { classificacao: "regular", rotulo: "Curso Regular", total: 3 },
      { classificacao: "expedito", rotulo: "Curso Expedito", total: 2 },
      { classificacao: "especial", rotulo: "Curso Especial", total: 1 },
      {
        classificacao: "aperfeicoamento_avancado",
        rotulo: "Curso de Aperfeiçoamento Avançado",
        total: 1,
      },
      { classificacao: "estagio_qualificacao", rotulo: "Estágio de Qualificação", total: 2 },
    ]);
  });

  it("⚠️ grupo vazio aparece com zero — o leitor vê o conjunto inteiro", () => {
    const i = indicadoresDoCatalogo([curso("regular", 10)]);
    expect(i.cursosPorClassificacao).toHaveLength(5);
    expect(i.cursosPorClassificacao.find((c) => c.classificacao === "especial")?.total).toBe(0);
  });

  it("a soma dos grupos é o total de cursos classificados", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.cursosPorClassificacao.reduce((s, c) => s + c.total, 0)).toBe(BASE.length);
  });
});

describe("⚠️ a metade que fecha a lista", () => {
  it("o resultado tem EXATAMENTE quatro chaves — nada da `PEND-5a-2` entrou", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect([...Object.keys(i)].sort()).toEqual(
      [
        "cursosRegulares",
        "estagiosDeQualificacao",
        "duracaoMediaPorClassificacao",
        "cursosPorClassificacao",
      ].sort(),
    );
  });

  it("⚠️ e nenhuma delas é 'total de cursos' nem 'turmas ativas' — são da PEND-5a-2", () => {
    const chaves = Object.keys(indicadoresDoCatalogo(BASE)).join(" ").toLowerCase();
    expect(chaves).not.toContain("total");
    expect(chaves).not.toContain("turma");
  });

  it("⚠️ classificação fora das cinco não aparece e não derruba — o banco já a recusa", () => {
    const i = indicadoresDoCatalogo([...BASE, curso("geral", 5), curso("ead_semipresencial", 5)]);
    expect(i.cursosPorClassificacao).toHaveLength(5);
    expect(i.cursosPorClassificacao.reduce((s, c) => s + c.total, 0)).toBe(BASE.length);
  });
});

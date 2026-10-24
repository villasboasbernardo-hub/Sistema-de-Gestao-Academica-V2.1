/**
 * `FR-002` · os indicadores do catálogo — **lista fechada**, quatro coisas e nada mais.
 *
 * ⚠️ **O FECHAMENTO É METADE DO REQUISITO.** A decisão de 17/09/2026 (A-6) escolheu dois indicadores
 * e dois gráficos, e mandou a paridade com a v2.0 — total de cursos, turmas ativas, indicadores de
 * turma — para a `PEND-5a-2`. Um teste que só conferisse os quatro passaria também num painel com
 * oito, e a fatia entregaria mais do que foi decidido. Por isso há um caso sobre **as chaves**.
 *
 * ⚠️ **SPEC 022 (Bloco 7), ITEM 10** — *"Cursos: estatísticas no mesmo componente/estilo das de Instrutores — cursos
 * por classificação e duração em semanas de cada curso/estágio; remova o de duração média por classificação."*
 * (Bernardo Villas Boas, 22/10/2026). O gráfico de duração média em dias SAIU; no lugar, a duração em SEMANAS de
 * cada curso, que não é média: o curso sem a duração em semanas não vira barra zero — ele é NOMEADO à parte.
 *
 * Origem: `FR-002` da spec 009, `RF-CURSOS-02`, A-6; spec 022, item 10.
 */
import { describe, expect, it } from "vitest";

import {
  indicadoresDoCatalogo,
  type CursoParaIndicador,
} from "@/lib/dominio/indicadores-do-catalogo";

let n = 0;
const curso = (
  classificacao: string,
  duracaoSemanas: number | null,
  codigo = `C-${(n += 1)}`,
): CursoParaIndicador => ({ codigo, classificacao, duracaoSemanas });

/** Uma base pequena e conferível à mão — é o que permite apontar o número errado. */
const BASE: readonly CursoParaIndicador[] = [
  curso("regular", 40, "C-Ap-HN"),
  curso("regular", 36, "C-Ap-FR"),
  curso("regular", null, "CAHO"),
  curso("expedito", 2, "C-Exp-TE"),
  curso("expedito", 4, "C-Exp-MetocOf"),
  curso("especial", 3, "C-Esp-ME"),
  curso("aperfeicoamento_avancado", 30, "C-ApA-PCN"),
  curso("estagio_qualificacao", 6, "EST-QF-APHID"),
  curso("estagio_qualificacao", null, "EST-QF-APOC"),
];

describe("spec 025 (item 6) · um cartão por classificação, os demais e o total", () => {
  it("conta cada uma das cinco classificações", () => {
    const i = indicadoresDoCatalogo(BASE);
    const total = (c: string) => i.cursosPorClassificacao.find((x) => x.classificacao === c)?.total;
    expect(total("regular")).toBe(3);
    expect(total("expedito")).toBe(2);
    expect(total("especial")).toBe(1);
    expect(total("estagio_qualificacao")).toBe(2);
    expect(total("aperfeicoamento_avancado")).toBe(1);
  });

  it("os seis cartões fecham com o total — inclusive os de fora das cinco (SC-006)", () => {
    const i = indicadoresDoCatalogo([...BASE, curso("geral", 5)]);
    expect(i.demais).toBe(1);
    expect(i.total).toBe(BASE.length + 1);
    expect(i.cursosPorClassificacao.reduce((s, c) => s + c.total, 0) + i.demais).toBe(i.total);
  });

  it("base vazia devolve zero em tudo, e não estoura", () => {
    const i = indicadoresDoCatalogo([]);
    expect(i.total).toBe(0);
    expect(i.demais).toBe(0);
    expect(i.cursosPorClassificacao.every((c) => c.total === 0)).toBe(true);
  });

  it("o rótulo de cada cartão é o plural do Glossário", () => {
    expect(indicadoresDoCatalogo(BASE).cursosPorClassificacao.map((c) => c.rotuloDoCartao)).toEqual(
      [
        "Cursos regulares",
        "Cursos expeditos",
        "Cursos especiais",
        "Estágios de qualificação",
        "Cursos de aperfeiçoamento avançado",
      ],
    );
  });
});

describe("spec 022 (item 10) · a duração em SEMANAS de cada curso e estágio", () => {
  it("uma barra por curso com a duração em semanas, na ordem única do sistema (classificação, depois sigla)", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.duracaoEmSemanas.porCurso).toEqual([
      { codigo: "C-Ap-FR", semanas: 36 },
      { codigo: "C-Ap-HN", semanas: 40 },
      { codigo: "C-Exp-MetocOf", semanas: 4 },
      { codigo: "C-Exp-TE", semanas: 2 },
      { codigo: "C-Esp-ME", semanas: 3 },
      { codigo: "EST-QF-APHID", semanas: 6 },
      { codigo: "C-ApA-PCN", semanas: 30 },
    ]);
  });

  it("⚠️ sem a duração em semanas, o curso NÃO vira barra zero — ele é nomeado à parte", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.duracaoEmSemanas.semInformacao).toEqual(["CAHO", "EST-QF-APOC"]);
    expect(i.duracaoEmSemanas.porCurso.some((d) => d.semanas === 0)).toBe(false);
  });

  it("⚠️ a média por classificação SAIU — nenhuma chave fala em média nem em dias", () => {
    const chaves = JSON.stringify(Object.keys(indicadoresDoCatalogo(BASE))).toLowerCase();
    expect(chaves).not.toContain("media");
    expect(chaves).not.toContain("dias");
  });
});

describe("`FR-002` · cursos por classificação", () => {
  it("conta cada grupo, e zero é zero de verdade", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect(i.cursosPorClassificacao.map(({ rotuloDoCartao: _, ...resto }) => resto)).toEqual([
      { classificacao: "regular", rotulo: "Curso Regular", total: 3 },
      { classificacao: "expedito", rotulo: "Curso Expedito", total: 2 },
      { classificacao: "especial", rotulo: "Curso Especial", total: 1 },
      // Spec 022 (A-4): Estágio de Qualificação antes de Aperfeiçoamento Avançado.
      { classificacao: "estagio_qualificacao", rotulo: "Estágio de Qualificação", total: 2 },
      {
        classificacao: "aperfeicoamento_avancado",
        rotulo: "Curso de Aperfeiçoamento Avançado",
        total: 1,
      },
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

describe("⚠️ a lista continua fechada (spec 025, A-8)", () => {
  it("o resultado tem EXATAMENTE quatro chaves: por classificação, os demais, o total e a duração", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect([...Object.keys(i)].sort()).toEqual(
      ["cursosPorClassificacao", "demais", "duracaoEmSemanas", "total"].sort(),
    );
  });

  it("⚠️ 'turmas ativas' continua fora — é a parte da PEND-5a-2 que o pedido não trouxe", () => {
    const chaves = Object.keys(indicadoresDoCatalogo(BASE)).join(" ").toLowerCase();
    expect(chaves).not.toContain("turma");
  });

  it("⚠️ classificação fora das cinco não vira grupo: cai em demais", () => {
    const i = indicadoresDoCatalogo([...BASE, curso("geral", 5), curso("ead_semipresencial", 5)]);
    expect(i.cursosPorClassificacao).toHaveLength(5);
    expect(i.cursosPorClassificacao.reduce((s, c) => s + c.total, 0)).toBe(BASE.length);
    expect(i.demais).toBe(2);
  });
});

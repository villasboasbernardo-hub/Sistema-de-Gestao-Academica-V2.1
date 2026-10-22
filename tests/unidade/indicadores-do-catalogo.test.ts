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
    expect(i.cursosPorClassificacao).toEqual([
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

describe("⚠️ a metade que fecha a lista", () => {
  it("o resultado tem EXATAMENTE quatro chaves — nada da `PEND-5a-2` entrou", () => {
    const i = indicadoresDoCatalogo(BASE);
    expect([...Object.keys(i)].sort()).toEqual(
      [
        "cursosRegulares",
        "estagiosDeQualificacao",
        "duracaoEmSemanas",
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

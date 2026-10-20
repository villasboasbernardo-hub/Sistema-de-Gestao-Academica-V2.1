/**
 * O submenu da lateral — spec 019 (Bloco 4), C-12 a C-15: a árvore de Cursos, a lista de Turmas e o ramo da página
 * atual.
 *
 * ⚠️ **AJUSTE A-5 DA CONFERÊNCIA DE 20/10/2026** (Bernardo Villas Boas): *"SUBMENU DE TURMAS na lateral: sem o nível do
 *    curso — lista direto as turmas do ANO VIGENTE (…), não arquivadas, em ordem natural (ex.: CAHO 2026, C-Ap-FR 2026,
 *    C-Ap-HN 2026 …)."*
 */
import { describe, expect, it } from "vitest";

import { arvoreDeCursos, arvoreDeTurmas, ramoDoCaminho } from "@/lib/dominio/submenu-da-lateral";
import { enderecoDaTurma, enderecoDoCurso } from "@/lib/navegacao/endereco-de-turma";

const cursos = [
  { id: "c2", codigo: "C-Ap-HN", nome: "Aperfeiçoamento HN", classificacao: "regular" },
  { id: "c1", codigo: "C-Ap-FR", nome: "Aperfeiçoamento FR", classificacao: "regular" },
  { id: "c3", codigo: "CAHO", nome: "CAHO", classificacao: "especial" },
];
const turmas = [
  { codigo: "C-Ap-FR 2025", ano: 2025, arquivada: false },
  { codigo: "C-Ap-HN 2026", ano: 2026, arquivada: false },
  { codigo: "C-Ap-FR T10 2026", ano: 2026, arquivada: false },
  { codigo: "C-Ap-FR T2 2026", ano: 2026, arquivada: false },
  { codigo: "CAHO 2026", ano: 2026, arquivada: false },
  { codigo: "C-Esp-ME 2026", ano: 2026, arquivada: true },
  { codigo: "C-Ap-HN 2027", ano: 2027, arquivada: false },
];

describe("C-14 · a árvore de Cursos", () => {
  it("por classificação, na ordem do catálogo, com o rótulo, os cursos pela sigla em ordem natural", () => {
    expect(arvoreDeCursos(cursos, enderecoDoCurso)).toEqual([
      {
        chave: "regular",
        rotulo: "Curso Regular",
        itens: [
          { rota: "/cursos/C-Ap-FR", rotulo: "C-Ap-FR", titulo: "Aperfeiçoamento FR" },
          { rota: "/cursos/C-Ap-HN", rotulo: "C-Ap-HN", titulo: "Aperfeiçoamento HN" },
        ],
      },
      {
        chave: "especial",
        rotulo: "Curso Especial",
        itens: [{ rota: "/cursos/CAHO", rotulo: "CAHO", titulo: "CAHO" }],
      },
    ]);
  });
});

describe("A-5 · a lista de Turmas, sem o nível do curso", () => {
  const lista = arvoreDeTurmas(turmas, 2026, enderecoDaTurma);

  it("só as turmas do ano, sem as arquivadas, cada uma pelo código", () => {
    expect(lista.map((i) => i.rotulo)).not.toContain("C-Ap-FR 2025");
    expect(lista.map((i) => i.rotulo)).not.toContain("C-Ap-HN 2027");
    expect(lista.map((i) => i.rotulo)).not.toContain("C-Esp-ME 2026");
    expect(lista[0]?.rota).toBe("/turmas/CAHO%202026");
  });

  it("em ordem natural lendo o código sem os hífens: CAHO antes de C-Ap-FR, e T2 antes de T10", () => {
    expect(lista.map((i) => i.rotulo)).toEqual([
      "CAHO 2026",
      "C-Ap-FR T2 2026",
      "C-Ap-FR T10 2026",
      "C-Ap-HN 2026",
    ]);
  });

  it("outro ano, outra lista", () => {
    expect(arvoreDeTurmas(turmas, 2027, enderecoDaTurma).map((i) => i.rotulo)).toEqual([
      "C-Ap-HN 2027",
    ]);
  });
});

describe("C-12 e C-15 · o ramo da página atual", () => {
  const arvores = {
    cursos: arvoreDeCursos(cursos, enderecoDoCurso),
    turmas: arvoreDeTurmas(turmas, 2026, enderecoDaTurma),
  };
  it("na página do curso, abre Cursos e a classificação, e marca o curso", () => {
    expect(ramoDoCaminho("/cursos/C-Ap-HN", arvores)).toEqual({
      abertos: ["cursos", "cursos:regular"],
      ativo: "/cursos/C-Ap-HN",
    });
  });
  it("abaixo do curso (editar), o curso continua ativo", () => {
    expect(ramoDoCaminho("/cursos/C-Ap-HN/editar", arvores).ativo).toBe("/cursos/C-Ap-HN");
  });
  it("no DSA da turma, abre Turmas (sem nível de curso) e marca a turma", () => {
    expect(ramoDoCaminho("/turmas/C-Ap-FR%20T2%202026/dsa", arvores)).toEqual({
      abertos: ["turmas"],
      ativo: "/turmas/C-Ap-FR%20T2%202026",
    });
  });
  it("na ficha de uma turma de outro ano, nada fica ativo (ela não está na lista)", () => {
    expect(ramoDoCaminho("/turmas/C-Ap-FR%202025", arvores)).toEqual({ abertos: [], ativo: null });
  });
  it("nas listas, nada abre nem fica ativo", () => {
    expect(ramoDoCaminho("/cursos", arvores)).toEqual({ abertos: [], ativo: null });
    expect(ramoDoCaminho("/turmas", arvores)).toEqual({ abertos: [], ativo: null });
  });
});

/**
 * O submenu da lateral — spec 019 (Bloco 4), C-12 a C-15: a árvore de Cursos e de Turmas e o ramo da página atual.
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
  { codigo: "C-Ap-FR 2025", rotulo: null, ano: 2025, cursoId: "c1", arquivada: false },
  { codigo: "C-Ap-FR T2 2026", rotulo: "T2", ano: 2026, cursoId: "c1", arquivada: false },
  { codigo: "C-Ap-FR T1 2026", rotulo: "T1", ano: 2026, cursoId: "c1", arquivada: false },
  { codigo: "CAHO 2026", rotulo: null, ano: 2026, cursoId: "c3", arquivada: true },
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

describe("C-14 · a árvore de Turmas", () => {
  it("por curso, sem as arquivadas, as mais novas primeiro, pelo rótulo e o ano", () => {
    const arvore = arvoreDeTurmas(turmas, cursos, enderecoDaTurma);
    expect(arvore).toHaveLength(1);
    expect(arvore[0]?.rotulo).toBe("C-Ap-FR");
    expect(arvore[0]?.itens.map((i) => i.rotulo)).toEqual(["T1 2026", "T2 2026", "2025"]);
    expect(arvore[0]?.itens[0]?.rota).toBe("/turmas/C-Ap-FR%20T1%202026");
  });
});

describe("C-12 e C-15 · o ramo da página atual", () => {
  const arvores = {
    cursos: arvoreDeCursos(cursos, enderecoDoCurso),
    turmas: arvoreDeTurmas(turmas, cursos, enderecoDaTurma),
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
  it("no DSA da turma, abre Turmas e o curso dela, e marca a turma", () => {
    expect(ramoDoCaminho("/turmas/C-Ap-FR%20T1%202026/dsa", arvores)).toEqual({
      abertos: ["turmas", "turmas:c1"],
      ativo: "/turmas/C-Ap-FR%20T1%202026",
    });
  });
  it("nas listas, nada abre nem fica ativo", () => {
    expect(ramoDoCaminho("/cursos", arvores)).toEqual({ abertos: [], ativo: null });
    expect(ramoDoCaminho("/turmas", arvores)).toEqual({ abertos: [], ativo: null });
  });
});

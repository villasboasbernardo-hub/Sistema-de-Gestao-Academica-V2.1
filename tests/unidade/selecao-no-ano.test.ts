/**
 * RT-6 — o selecionado tem ano, o habilitado não (Bloco 10, conferência do PR #90, 24/10/2026).
 */
import { describe, expect, it } from "vitest";

import {
  filtrarPorSelecao,
  noRecorteDeCurso,
  selecionadosNoAno,
} from "@/lib/dominio/selecao-no-ano";

const DESIGNACOES = [
  { instrutorId: "a", anoDaTurma: 2026 },
  { instrutorId: "b", anoDaTurma: 2026 },
  { instrutorId: "b", anoDaTurma: 2027 },
  { instrutorId: "c", anoDaTurma: null },
];

describe("selecionadosNoAno — designado em turma do ano escolhido", () => {
  it("em 2026, quem tem turma de 2026", () => {
    expect([...selecionadosNoAno(DESIGNACOES, 2026)].sort()).toEqual(["a", "b"]);
  });

  it("em 2027, só quem tem turma de 2027 — os de 2026 não contam", () => {
    expect([...selecionadosNoAno(DESIGNACOES, 2027)]).toEqual(["b"]);
  });

  it("num ano sem turma designada, ZERO (o defeito: mostrava os 34 de 2026)", () => {
    expect(selecionadosNoAno(DESIGNACOES, 2028).size).toBe(0);
  });

  it("a designação sem a turma lida não conta em ano nenhum", () => {
    expect(selecionadosNoAno(DESIGNACOES, 2026).has("c")).toBe(false);
  });
});

describe("filtrarPorSelecao — o filtro Selecionado segue o ano", () => {
  const LINHAS = [{ id: "a" }, { id: "b" }, { id: "x" }];
  const em2027 = selecionadosNoAno(DESIGNACOES, 2027);

  it("«sim» fica com os selecionados no ano", () => {
    expect(filtrarPorSelecao(LINHAS, em2027, "sim").map((l) => l.id)).toEqual(["b"]);
  });

  it("«não» fica com os demais", () => {
    expect(filtrarPorSelecao(LINHAS, em2027, "nao").map((l) => l.id)).toEqual(["a", "x"]);
  });

  it("vazio não filtra", () => {
    expect(filtrarPorSelecao(LINHAS, em2027, "")).toHaveLength(3);
  });
});

describe("noRecorteDeCurso — os filtros Curso e Classificação pelas designações do ano (D-39 invertida)", () => {
  /*
   * Conferência de 24/10/2026: «filtros Curso e Classificação de Instrutores só pelas designações do ano escolhido».
   * Antes casavam a habilitação OU a atribuição de qualquer ano (`cursos_vinculados` da view).
   */
  const COM_CURSO = [
    { instrutorId: "a", anoDaTurma: 2026, cursoCodigo: "CAHO", classificacao: "regular" },
    { instrutorId: "b", anoDaTurma: 2027, cursoCodigo: "CAHO", classificacao: "regular" },
    { instrutorId: "c", anoDaTurma: 2026, cursoCodigo: "C-Exp-X", classificacao: "expedito" },
  ];

  it("sem curso nem classificação, não recorta (null)", () => {
    expect(noRecorteDeCurso(COM_CURSO, 2026, { curso: "", classificacao: "" })).toBeNull();
  });

  it("o curso conta só quem foi designado em turma DO ANO", () => {
    expect([
      ...(noRecorteDeCurso(COM_CURSO, 2026, { curso: "CAHO", classificacao: "" }) ?? []),
    ]).toEqual(["a"]);
    expect([
      ...(noRecorteDeCurso(COM_CURSO, 2027, { curso: "CAHO", classificacao: "" }) ?? []),
    ]).toEqual(["b"]);
  });

  it("num ano sem designação no curso, ninguém", () => {
    expect(noRecorteDeCurso(COM_CURSO, 2028, { curso: "CAHO", classificacao: "" })?.size).toBe(0);
  });

  it("a classificação, idem; com os dois, vale o E lógico", () => {
    expect([
      ...(noRecorteDeCurso(COM_CURSO, 2026, { curso: "", classificacao: "expedito" }) ?? []),
    ]).toEqual(["c"]);
    expect(
      noRecorteDeCurso(COM_CURSO, 2026, { curso: "CAHO", classificacao: "expedito" })?.size,
    ).toBe(0);
  });
});

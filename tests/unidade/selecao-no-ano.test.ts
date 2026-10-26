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

describe("noRecorteDeCurso — Curso e Classificação: habilitado (sem ano) OU designado no ano (D-40 invertida)", () => {
  /*
   * Conferência final de 25/10/2026 (Bernardo Villas Boas): «o filtro Curso de Instrutores mostra habilitados (sem
   * ano) OU designados em turma do curso no ano escolhido; "Selecionado: Sim" continua pelo ano e, combinado, dá só os
   * designados».
   */
  const DESIGNADOS = [
    { instrutorId: "a", anoDaTurma: 2026, cursoCodigo: "CAHO", classificacao: "regular" },
    { instrutorId: "b", anoDaTurma: 2027, cursoCodigo: "CAHO", classificacao: "regular" },
    { instrutorId: "c", anoDaTurma: 2026, cursoCodigo: "C-Exp-X", classificacao: "expedito" },
  ];
  // O habilitado não tem ano: a disciplina marcada na ficha.
  const HABILITADOS = [{ instrutorId: "h", cursoCodigo: "CAHO", classificacao: "regular" }];
  const recorte = (ano: number, curso: string, classificacao = "") =>
    [...(noRecorteDeCurso(DESIGNADOS, HABILITADOS, ano, { curso, classificacao }) ?? [])].sort();

  it("sem curso nem classificação, não recorta (null)", () => {
    expect(
      noRecorteDeCurso(DESIGNADOS, HABILITADOS, 2026, { curso: "", classificacao: "" }),
    ).toBeNull();
  });

  it("o curso: o habilitado em qualquer ano, e o designado só no ano da turma", () => {
    expect(recorte(2026, "CAHO")).toEqual(["a", "h"]);
    expect(recorte(2027, "CAHO")).toEqual(["b", "h"]);
  });

  it("num ano sem designação no curso, só o habilitado", () => {
    expect(recorte(2028, "CAHO")).toEqual(["h"]);
  });

  it("combinado com «Selecionado: Sim» (pelo ano), só os designados", () => {
    const linhas = recorte(2026, "CAHO").map((id) => ({ id }));
    const selecionados = selecionadosNoAno(DESIGNADOS, 2026);
    expect(filtrarPorSelecao(linhas, selecionados, "sim").map((l) => l.id)).toEqual(["a"]);
  });

  it("a classificação, idem; com os dois, vale o E lógico", () => {
    expect(recorte(2026, "", "expedito")).toEqual(["c"]);
    expect(recorte(2026, "", "regular")).toEqual(["a", "h"]);
    expect(recorte(2026, "CAHO", "expedito")).toEqual([]);
  });
});

/**
 * RT-6 — o selecionado tem ano, o habilitado não (Bloco 10, conferência do PR #90, 24/10/2026).
 */
import { describe, expect, it } from "vitest";

import { filtrarPorSelecao, selecionadosNoAno } from "@/lib/dominio/selecao-no-ano";

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

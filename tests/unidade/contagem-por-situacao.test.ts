/**
 * RD-8 (Bloco 11, spec 026) — os cartões do Início contam as turmas do ano por situação.
 *
 * RT-8 (Bloco 14, spec 029, `FR-007`; emenda a D-26 e o FR-006.1 da spec 026):
 *
 * > *"Arquivar esconde a turma das listas do dia a dia — carrossel das turmas, submenu, listas de ativas e de escolha,
 * > avisos —, mas ela CONTINUA contando nas estatísticas e nos cartões do ano dela, com a situação que tinha."* —
 * > Bernardo Villas Boas, 28/10/2026
 *
 * ⚠️ **A MESMA POPULAÇÃO VAI ÀS DUAS FUNÇÕES** — o ano e o recorte, COM a arquivada, cada turma levando a marca
 *    `arquivada`. Quem a tira é o carrossel (`cartoesDoInicio`), nunca os números (`contagemPorSituacao`).
 */
import { describe, expect, it } from "vitest";

import { cartoesDoInicio, contagemPorSituacao } from "@/lib/dominio/cartoes-do-inicio";

describe("contagemPorSituacao", () => {
  it("as quatro situações, cada turma na sua", () => {
    const r = contagemPorSituacao([
      { status: "ativa" },
      { status: "ativa" },
      { status: "planejada" },
      { status: "concluida" },
      { status: "cancelada" },
      { status: "cancelada" },
    ]);
    expect(r).toEqual({ ativas: 2, planejadas: 1, concluidas: 1, canceladas: 2 });
  });

  it("sem turma, zeros — nunca vazio", () => {
    expect(contagemPorSituacao([])).toEqual({
      ativas: 0,
      planejadas: 0,
      concluidas: 0,
      canceladas: 0,
    });
  });
});

describe("RT-8 (spec 029, FR-007) · a arquivada CONTA nos cartões do ano e fica FORA do carrossel", () => {
  /* As turmas do ano e do recorte, como a página as monta: arquivadas inclusive, com a marca. */
  const doAno = [
    { codigo: "A", status: "ativa", arquivada: false },
    { codigo: "B", status: "ativa", arquivada: true },
    { codigo: "C", status: "concluida", arquivada: true },
    { codigo: "D", status: "cancelada", arquivada: true },
    { codigo: "E", status: "planejada", arquivada: false },
    { codigo: "F", status: "ativa", arquivada: false },
  ];

  it("os cartões do ano contam a arquivada pela situação que ela tinha (arquivar não é situação, D-COR-5)", () => {
    expect(contagemPorSituacao(doAno)).toEqual({
      ativas: 3,
      planejadas: 1,
      concluidas: 1,
      canceladas: 1,
    });
  });

  it("⚠️ o caso que discrimina: a ativa ARQUIVADA conta em «Turmas ativas» e NÃO ganha cartão no carrossel", () => {
    expect(cartoesDoInicio(doAno).map((t) => t.codigo)).toEqual(["A", "F"]);
  });

  it("a concluída arquivada conta em «Concluídas» e também não ganha cartão (o carrossel é só de ativas, A-2)", () => {
    const soAConcluida = [{ codigo: "C", status: "concluida", arquivada: true }];
    expect(contagemPorSituacao(soAConcluida).concluidas).toBe(1);
    expect(cartoesDoInicio(soAConcluida)).toEqual([]);
  });

  it("«Turmas ativas» = os cartões + as ativas arquivadas — a relação que o Início desenha", () => {
    const ativasArquivadas = doAno.filter((t) => t.status === "ativa" && t.arquivada).length;
    expect(contagemPorSituacao(doAno).ativas).toBe(
      cartoesDoInicio(doAno).length + ativasArquivadas,
    );
  });
});

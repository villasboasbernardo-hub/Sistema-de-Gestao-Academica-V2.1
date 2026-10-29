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

import {
  cartoesDoInicio,
  contagemPorSituacao,
  fraseDoCarrosselVazio,
} from "@/lib/dominio/cartoes-do-inicio";

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

describe("RT-8 · o vazio do carrossel não desmente «Turmas ativas» (revisão do Bloco 14, achados 1 e 13)", () => {
  /* O que a página entrega: «Turmas ativas» (com a arquivada) e quantos cartões o carrossel tem. */
  const fraseDe = (turmas: readonly { status: string; arquivada: boolean }[], temRecorte = false) =>
    fraseDoCarrosselVazio(
      contagemPorSituacao(turmas).ativas,
      cartoesDoInicio(turmas).length,
      2026,
      temRecorte,
    );

  it("com cartão no carrossel, nenhuma frase", () => {
    expect(fraseDe([{ status: "ativa", arquivada: false }])).toBeNull();
    expect(
      fraseDe([
        { status: "ativa", arquivada: false },
        { status: "ativa", arquivada: true },
      ]),
    ).toBeNull();
  });

  it("sem ativa nenhuma no ano, a frase do A-2 sem mudança (os e2e A-2 e T8 conferem o texto exato)", () => {
    expect(fraseDe([])).toBe("Nenhuma turma em andamento em 2026.");
    expect(fraseDe([{ status: "concluida", arquivada: true }], true)).toBe(
      "Nenhuma turma em andamento em 2026 neste recorte.",
    );
  });

  it("⚠️ o caso que discrimina: a ÚNICA ativa do ano está arquivada — «Turmas ativas: 1» e a frase diz onde ela está", () => {
    const soAArquivada = [{ status: "ativa", arquivada: true }];
    expect(contagemPorSituacao(soAArquivada).ativas).toBe(1);
    const frase = fraseDe(soAArquivada);
    expect(frase, "a frase do A-2 desmente o cartão «Turmas ativas: 1»").not.toBe(
      "Nenhuma turma em andamento em 2026.",
    );
    expect(frase).toBe(
      "Nenhuma turma em andamento no carrossel de 2026: 1 turma ativa está arquivada — contada em «Turmas ativas», fora do carrossel. Para vê-la, abra Turmas e, nos Filtros, em Arquivadas, escolha «Mostrar arquivadas».",
    );
  });

  it("no plural, e com o recorte", () => {
    expect(
      fraseDe(
        [
          { status: "ativa", arquivada: true },
          { status: "ativa", arquivada: true },
          { status: "planejada", arquivada: false },
        ],
        true,
      ),
    ).toBe(
      "Nenhuma turma em andamento no carrossel de 2026 neste recorte: 2 turmas ativas estão arquivadas — contadas em «Turmas ativas», fora do carrossel. Para vê-las, abra Turmas e, nos Filtros, em Arquivadas, escolha «Mostrar arquivadas».",
    );
  });
});

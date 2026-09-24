/**
 * `FR-021.8` · quais vigências perdem a proteção quando a janela ou o curso da turma muda.
 *
 * ⚠️ **A DECISÃO MORA AQUI PORQUE A JANELA NOVA SÓ EXISTE NO FORMULÁRIO.** O banco sabe o que trava
 * cada vigência **hoje**; esta função responde "e se". Os dois lados precisam ler a janela do mesmo
 * jeito — **ponta ausente é ponta aberta** —, senão o aviso discorda do que o banco fará.
 *
 * ⚠️ **AS DUAS EXCLUSÕES SÃO O CORAÇÃO DA REGRA**: travada por lançamento próprio nunca perde
 * proteção, e ainda alcançada por outra turma também não. Sem elas, a tela avisaria sobre o que não
 * vai acontecer — e aviso que erra treina a pessoa a ignorar o quadro.
 *
 * Origem: `FR-021.8` da spec 009, `SC-011.5`, contrato de escritas §3.
 */
import { describe, expect, it } from "vitest";

import {
  mensagemDaProtecaoPerdida,
  vigenciasQuePerdemProtecao,
  type JanelaDeTurma,
  type VigenciaProtegida,
} from "@/lib/dominio/protecao-de-vigencia";

const GLOBAL: VigenciaProtegida = {
  vigencia: "REG-000033",
  vigenteDe: "2020-01-01",
  travadaPorLancamentoProprio: false,
  atividade: "AEC do Comando",
  dataAtividade: "2026-05-10",
};

const janela = (
  codigo: string,
  dataInicio: string | null,
  dataTermino: string | null,
): JanelaDeTurma => ({ codigo, dataInicio, dataTermino });

describe("`FR-021.8` · encurtar a janela desprotege o que só ela alcançava", () => {
  it("a turma sai de cima da atividade, e a vigência perde a proteção", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      { codigo: "T1 2026", janelaNova: { dataInicio: "2026-02-02", dataTermino: "2026-04-30" } },
    );
    expect(perdidas.map((p) => p.vigencia)).toEqual(["REG-000033"]);
  });

  it("janela que continua cobrindo a atividade não desprotege nada", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      { codigo: "T1 2026", janelaNova: { dataInicio: "2026-01-02", dataTermino: "2026-12-30" } },
    );
    expect(perdidas).toEqual([]);
  });

  it("⚠️ travada por LANÇAMENTO PRÓPRIO nunca entra — encurtar não a solta", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [{ ...GLOBAL, travadaPorLancamentoProprio: true }],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      { codigo: "T1 2026", janelaNova: { dataInicio: "2026-02-02", dataTermino: "2026-04-30" } },
    );
    expect(perdidas).toEqual([]);
  });

  it("⚠️ ainda alcançada por OUTRA turma também não entra — a proteção é do conjunto", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [
        janela("T1 2026", "2026-02-02", "2026-06-30"),
        janela("T2 2026", "2026-05-01", "2026-12-01"),
      ],
      { codigo: "T1 2026", janelaNova: { dataInicio: "2026-02-02", dataTermino: "2026-04-30" } },
    );
    expect(perdidas).toEqual([]);
  });
});

describe("janela incompleta — ponta ausente é ponta aberta", () => {
  it("sem término, a turma que começou antes ainda alcança", () => {
    const perdidas = vigenciasQuePerdemProtecao([GLOBAL], [janela("T1 2026", "2026-02-02", null)], {
      codigo: "T1 2026",
      janelaNova: { dataInicio: "2026-02-02", dataTermino: null },
    });
    expect(perdidas).toEqual([]);
  });

  it("sem início, ela alcança enquanto o término não passou", () => {
    const perdidas = vigenciasQuePerdemProtecao([GLOBAL], [janela("T1 2026", null, "2026-12-01")], {
      codigo: "T1 2026",
      janelaNova: { dataInicio: null, dataTermino: "2026-12-01" },
    });
    expect(perdidas).toEqual([]);
  });

  it("⚠️ turma SEM JANELA NENHUMA não alcança nada — e a vigência perde a proteção", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      { codigo: "T1 2026", janelaNova: { dataInicio: null, dataTermino: null } },
    );
    expect(perdidas.map((p) => p.vigencia)).toEqual(["REG-000033"]);
  });
});

describe("⚠️ mudar o CURSO avalia o curso de origem", () => {
  it("a turma que sai leva a proteção junto", () => {
    // Ela não entra com a janela nova: ela some do conjunto que protegia o curso de origem.
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      {
        codigo: "T1 2026",
        janelaNova: { dataInicio: "2026-02-02", dataTermino: "2026-06-30" },
        saiDoCurso: true,
      },
    );
    expect(perdidas.map((p) => p.vigencia)).toEqual(["REG-000033"]);
  });

  it("e se outra turma do curso de origem cobre a data, nada se perde", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [
        janela("T1 2026", "2026-02-02", "2026-06-30"),
        janela("T2 2026", "2026-04-01", "2026-08-01"),
      ],
      {
        codigo: "T1 2026",
        janelaNova: { dataInicio: "2026-02-02", dataTermino: "2026-06-30" },
        saiDoCurso: true,
      },
    );
    expect(perdidas).toEqual([]);
  });
});

describe("turma NOVA entra por acréscimo", () => {
  it("criar turma nunca desprotege — ela só acrescenta cobertura", () => {
    const perdidas = vigenciasQuePerdemProtecao(
      [GLOBAL],
      [janela("T1 2026", "2026-02-02", "2026-06-30")],
      { codigo: "T2 2026", janelaNova: { dataInicio: "2027-01-01", dataTermino: "2027-06-01" } },
    );
    expect(perdidas).toEqual([]);
  });
});

describe("a mensagem do diálogo", () => {
  it("nenhuma perdida, nenhum aviso", () => {
    expect(mensagemDaProtecaoPerdida([])).toBeNull();
  });

  it("nomeia a vigência e a atividade que a travava", () => {
    const m = mensagemDaProtecaoPerdida([GLOBAL]);
    expect(m).toContain("REG-000033");
    expect(m).toContain("AEC do Comando");
    expect(m).toContain("2026-05-10");
    expect(m).toContain("poderão ser corrigidas");
  });

  it("⚠️ ela não diz que a gravação está proibida — o teto é alerta, nunca bloqueio", () => {
    const m = mensagemDaProtecaoPerdida([GLOBAL]) ?? "";
    expect(m.toLowerCase()).not.toContain("não é possível");
    expect(m.toLowerCase()).not.toContain("proibid");
  });

  it("uma linha por vigência", () => {
    const m = mensagemDaProtecaoPerdida([GLOBAL, { ...GLOBAL, vigencia: "REG-000034" }]) ?? "";
    expect(m).toContain("REG-000033");
    expect(m).toContain("REG-000034");
  });
});

/**
 * `FR-030` · o limite de turmas por ano letivo — **alerta, nunca bloqueio** (`RN-DEG-02`).
 *
 * ⚠️ **A ENUMERAÇÃO É POSITIVA, E O TESTE PROVA ISSO COM UM STATUS INVENTADO.** `STATUS_QUE_CONTAM`
 * lista `planejada`, `ativa` e `concluida`; escrever a regra como *"≠ cancelada"* daria o mesmo
 * resultado hoje e passaria a contar, sozinha, qualquer status novo do domínio. O quinto valor é o
 * que separa as duas implementações.
 *
 * ⚠️ **É POR ANO LETIVO, NUNCA TOTAL** (`FR-003.2`). Um curso regular pode ter uma turma em 2026 e
 * outra em 2027 sem passar de limite nenhum.
 *
 * Origem: `FR-030`, `FR-030.1` da spec 009, `SC-014.1`, contrato de escritas §3.
 */
import { describe, expect, it } from "vitest";

import {
  anosAcimaDoLimite,
  contarNoAno,
  mensagemDoDialogo,
  mensagemDoQuadro,
  passaDoLimite,
  STATUS_QUE_CONTAM,
  type TurmaParaLimite,
} from "@/lib/dominio/limite-de-turmas";

const t = (ano: number, status: string): TurmaParaLimite => ({ ano, status });

describe("`FR-030` · a contagem por ano", () => {
  it("conta os três status que contam", () => {
    const turmas = [t(2026, "planejada"), t(2026, "ativa"), t(2026, "concluida")];
    expect(contarNoAno(turmas, 2026)).toBe(3);
  });

  it("`cancelada` não conta", () => {
    expect(contarNoAno([t(2026, "cancelada"), t(2026, "ativa")], 2026)).toBe(1);
  });

  it("⚠️ o caso que discrimina: um status INVENTADO não conta", () => {
    // Uma implementação escrita como "≠ cancelada" contaria este, e daria 2. A enumeração positiva
    // dá 1 — e é ela que sobrevive ao domínio crescer.
    expect(contarNoAno([t(2026, "ativa"), t(2026, "arquivada")], 2026)).toBe(1);
  });

  it("⚠️ é por ANO: outro ano não entra na conta", () => {
    const turmas = [t(2026, "ativa"), t(2027, "ativa"), t(2027, "planejada")];
    expect(contarNoAno(turmas, 2026)).toBe(1);
    expect(contarNoAno(turmas, 2027)).toBe(2);
    expect(contarNoAno(turmas, 2028)).toBe(0);
  });

  it("a lista de status que contam é exatamente esta", () => {
    expect([...STATUS_QUE_CONTAM]).toEqual(["planejada", "ativa", "concluida"]);
  });
});

describe("`FR-030` · passar do limite ao gravar uma turma", () => {
  it("dentro do limite não avisa", () => {
    expect(passaDoLimite([t(2026, "ativa")], 2026, 2)).toBeNull();
  });

  it("⚠️ no limite AINDA não avisa — o aviso é sobre passar, e a turma nova é a que passa", () => {
    // Duas turmas e limite 2: a terceira é que estoura, e a contagem recebida é a de ANTES dela.
    expect(passaDoLimite([t(2026, "ativa"), t(2026, "planejada")], 2026, 3)).toBeNull();
  });

  it("acima do limite avisa, com ano, contagem e limite", () => {
    const aviso = passaDoLimite([t(2026, "ativa"), t(2026, "planejada")], 2026, 2);
    expect(aviso).toEqual({ ano: 2026, turmas: 2, limite: 2 });
  });

  it("⚠️ `C-ApA-OcOp-PR-SP` conta 0: as duas turmas dele estão canceladas", () => {
    const turmas = [t(2026, "cancelada"), t(2026, "cancelada")];
    expect(contarNoAno(turmas, 2026)).toBe(0);
    expect(passaDoLimite(turmas, 2026, 2)).toBeNull();
  });

  it("limite ausente não avisa nunca — curso sem limite informado não tem teto a estourar", () => {
    expect(passaDoLimite([t(2026, "ativa"), t(2026, "ativa")], 2026, null)).toBeNull();
  });
});

describe("`FR-030.1` · baixar o limite do curso avisa por ANO", () => {
  it("uma mensagem por ano afetado, e só pelos afetados", () => {
    const turmas = [
      t(2025, "ativa"),
      t(2026, "ativa"),
      t(2026, "planejada"),
      t(2026, "concluida"),
      t(2027, "ativa"),
      t(2027, "planejada"),
    ];
    expect(anosAcimaDoLimite(turmas, 1)).toEqual([
      { ano: 2026, turmas: 3, limite: 1 },
      { ano: 2027, turmas: 2, limite: 1 },
    ]);
  });

  it("⚠️ os anos saem em ordem crescente — o diálogo não pode mudar de ordem entre aberturas", () => {
    const turmas = [t(2028, "ativa"), t(2028, "ativa"), t(2026, "ativa"), t(2026, "ativa")];
    expect(anosAcimaDoLimite(turmas, 1).map((a) => a.ano)).toEqual([2026, 2028]);
  });

  it("limite que cabe em todos os anos não avisa", () => {
    expect(anosAcimaDoLimite([t(2026, "ativa"), t(2027, "ativa")], 2)).toEqual([]);
  });

  it("ano só com canceladas nunca aparece", () => {
    expect(anosAcimaDoLimite([t(2026, "cancelada"), t(2026, "cancelada")], 1)).toEqual([]);
  });

  it("limite ausente não avisa", () => {
    expect(anosAcimaDoLimite([t(2026, "ativa"), t(2026, "ativa")], null)).toEqual([]);
  });
});

describe("as duas mensagens do contrato §3", () => {
  const caso = { ano: 2026, turmas: 4, limite: 3 };

  it("a do diálogo pergunta, e a do quadro informa", () => {
    expect(mensagemDoDialogo(caso)).toBe(
      "Este curso já tem 4 turma(s) em 2026, e o limite é 3; confirmar mesmo assim?",
    );
    expect(mensagemDoQuadro(caso)).toBe("2026: 4 turmas, limite 3");
  });

  it("⚠️ nenhuma das duas diz que é proibido — o teto é alerta, nunca bloqueio", () => {
    for (const m of [mensagemDoDialogo(caso), mensagemDoQuadro(caso)]) {
      expect(m.toLowerCase()).not.toContain("não é possível");
      expect(m.toLowerCase()).not.toContain("proibido");
      expect(m.toLowerCase()).not.toContain("recusad");
    }
  });
});

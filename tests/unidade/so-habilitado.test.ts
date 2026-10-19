/**
 * A marca *"só habilitado — não gera CH prevista"* na ficha do instrutor — FR-013.4 da spec 016 (Q-7 e NQ-4).
 *
 * > *"Por disciplina: marca «só habilitado — não gera CH prevista» em cada habilitação sem atribuição no ano."*
 * > — NQ-4, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **HABILITAÇÃO NÃO É ATRIBUIÇÃO** (`RN-INST-04`): a habilitação diz que o instrutor PODE ministrar a disciplina;
 * só a atribuição na turma (Disciplinas da turma) gera CH prevista. A marca existe para que ninguém leia a lista de
 * habilitações como carga.
 */
import { describe, expect, it } from "vitest";

import { disciplinasSoHabilitadas } from "@/lib/dominio/so-habilitado";

const HABILITACOES = ["d-1", "d-2", "d-3"] as const;

describe("FR-013.4 · NQ-4 · a habilitação sem atribuição no ano é marcada, por disciplina", () => {
  it("habilitada e sem atribuição nenhuma → marcada", () => {
    expect(disciplinasSoHabilitadas(HABILITACOES, [], 2026)).toEqual(
      new Set(["d-1", "d-2", "d-3"]),
    );
  });

  it("⚠️ atribuída em OUTRO ano → marcada no ano mostrado", () => {
    const atribuicoes = [{ disciplinaId: "d-1", ano: 2025 }];
    expect(disciplinasSoHabilitadas(HABILITACOES, atribuicoes, 2026)).toEqual(
      new Set(["d-1", "d-2", "d-3"]),
    );
  });

  it("atribuída NO ano → não marcada; as outras continuam", () => {
    const atribuicoes = [
      { disciplinaId: "d-1", ano: 2026 },
      { disciplinaId: "d-3", ano: 2025 },
    ];
    expect(disciplinasSoHabilitadas(HABILITACOES, atribuicoes, 2026)).toEqual(
      new Set(["d-2", "d-3"]),
    );
  });

  it("atribuição sem ano (janela desconhecida) não conta no ano — a habilitação fica marcada", () => {
    const atribuicoes = [{ disciplinaId: "d-2", ano: null }];
    expect(disciplinasSoHabilitadas(HABILITACOES, atribuicoes, 2026).has("d-2")).toBe(true);
  });

  it("atribuição de disciplina sem habilitação não entra na lista (a lista é das habilitações)", () => {
    const atribuicoes = [{ disciplinaId: "d-9", ano: 2026 }];
    expect(disciplinasSoHabilitadas(HABILITACOES, atribuicoes, 2026).has("d-9")).toBe(false);
  });
});

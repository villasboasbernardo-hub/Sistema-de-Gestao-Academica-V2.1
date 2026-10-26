/**
 * RD-5 e RD-7 (Bloco 11, spec 026) — o selo da situação e a última versão publicada de cada turma.
 */
import { describe, expect, it } from "vitest";

import { seloDaSituacao, versaoVigentePorTurma } from "@/lib/dominio/dsa/publicacao";

describe("seloDaSituacao — ícone e palavra (RD-5)", () => {
  it("as quatro do pedido, e Em alteração durante a alteração (D-20)", () => {
    expect(seloDaSituacao("em_preenchimento", null).palavra).toBe("Em preenchimento");
    expect(seloDaSituacao("registrado", null).palavra).toBe("Registrado");
    expect(seloDaSituacao("publicado", 0).palavra).toBe("Publicado");
    expect(seloDaSituacao("publicado", 2).palavra).toBe("ALT 2");
    expect(seloDaSituacao("alteracao_em_andamento", 1).palavra).toBe("Em alteração");
  });

  it("cada selo tem ícone; o publicado e o ALT, o carimbo", () => {
    expect(seloDaSituacao("publicado", 0).icone).toBe("carimbo");
    expect(seloDaSituacao("publicado", 3).icone).toBe("carimbo");
    expect(seloDaSituacao("registrado", null).icone).toBe("salvo");
  });
});

describe("versaoVigentePorTurma — a última publicada, nunca rascunho nem salvo (RD-7)", () => {
  const ev = (turmaId: string, tipo: string, numero: number | null, ocorridoEm: string) => ({
    turmaId,
    tipo,
    numero,
    ocorridoEm,
    retrato: { de: `${turmaId}-${numero}` },
  });

  it("por turma, a ALT mais recente vence a original", () => {
    const r = versaoVigentePorTurma([
      ev("a", "publicado", 0, "2026-11-10T10:00:00Z"),
      ev("a", "alteracao_publicada", 1, "2026-11-11T10:00:00Z"),
      ev("b", "publicado", 0, "2026-11-10T11:00:00Z"),
    ]);
    expect(r.map((v) => [v.turmaId, v.numero])).toEqual([
      ["a", 1],
      ["b", 0],
    ]);
  });

  it("⚠️ só o salvo (sem publicação) não aparece", () => {
    expect(versaoVigentePorTurma([ev("c", "salvo", null, "2026-11-10T10:00:00Z")])).toEqual([]);
  });

  it("durante a alteração em andamento, a última PUBLICADA continua a valer", () => {
    const r = versaoVigentePorTurma([
      ev("a", "publicado", 0, "2026-11-10T10:00:00Z"),
      ev("a", "alteracao_iniciada", null, "2026-11-11T10:00:00Z"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]?.numero).toBe(0);
  });
});

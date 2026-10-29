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

  /*
   * Spec 029 (Bloco 14), item 3 — RP-9 e D-8: depois de *Salvar alteração*, sem rascunho novo, o selo diz que a alteração
   * está salva — com o MESMO ícone da alteração, porque ela continua por publicar.
   */
  it("RP-9: a alteração salva é «Em alteração · salva», com o ícone da alteração", () => {
    expect(seloDaSituacao("alteracao_em_andamento", 1, true)).toEqual({
      icone: "alteracao",
      palavra: "Em alteração · salva",
    });
    expect(seloDaSituacao("alteracao_em_andamento", 0, true).palavra).toBe("Em alteração · salva");
  });

  it("RP-9: sem o terceiro argumento (ou com falso), continua «Em alteração»", () => {
    expect(seloDaSituacao("alteracao_em_andamento", 1)).toEqual({
      icone: "alteracao",
      palavra: "Em alteração",
    });
    expect(seloDaSituacao("alteracao_em_andamento", 1, false).palavra).toBe("Em alteração");
  });

  it("RP-9: o «salva» só qualifica a alteração — os outros selos não mudam", () => {
    expect(seloDaSituacao("publicado", 0, true).palavra).toBe("Publicado");
    expect(seloDaSituacao("publicado", 2, true).palavra).toBe("ALT 2");
    expect(seloDaSituacao("registrado", null, true).palavra).toBe("Registrado");
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

  /*
   * Spec 029 (Bloco 14), item 3 — RP-9: *Salvar alteração* grava `salvo` na trilha (D-24), e o Início continua no papel
   * PUBLICADO até *Publicar alteração*. ⚠️ É GUARDA, não caso que discrimina: hoje ela já passa, e reprova se alguém
   * passar a contar o `salvo` da alteração como versão.
   */
  it("RP-9: depois de «Salvar alteração», a última PUBLICADA continua a valer, com o retrato dela", () => {
    const r = versaoVigentePorTurma([
      ev("a", "publicado", 0, "2026-11-10T10:00:00Z"),
      ev("a", "alteracao_iniciada", null, "2026-11-11T10:00:00Z"),
      ev("a", "salvo", null, "2026-11-11T11:00:00Z"),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]?.numero).toBe(0);
    expect(r[0]?.ocorridoEm).toBe("2026-11-10T10:00:00Z");
    expect(r[0]?.retrato).toEqual({ de: "a-0" });
  });
});

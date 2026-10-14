/**
 * `RN-INST-01` — habilitação para ministrar e ser responsável, **com a delimitação** (`FR-021`).
 */
import { describe, expect, it } from "vitest";

import {
  EXIGE_HABILITACAO,
  podeAtuar,
  type VinculoDeHabilitacao,
  avisoDeHabilitacao,
} from "@/lib/dominio/habilitacao";

const VINCULOS: readonly VinculoDeHabilitacao[] = [
  { instrutorId: "habilitado", disciplinaId: "D1", status: "ativo" },
  { instrutorId: "antigo", disciplinaId: "D1", status: "inativo" },
];

describe("`RN-INST-01` · ministrar e ser responsável exigem vínculo ativo", () => {
  it("com vínculo ativo, ministra e responde pela disciplina", () => {
    expect(podeAtuar("ministrar", "habilitado", "D1", VINCULOS)).toBe(true);
    expect(podeAtuar("responsavel", "habilitado", "D1", VINCULOS)).toBe(true);
  });

  it("sem vínculo, não ministra nem responde", () => {
    expect(podeAtuar("ministrar", "outro", "D1", VINCULOS)).toBe(false);
    expect(podeAtuar("responsavel", "outro", "D1", VINCULOS)).toBe(false);
  });

  it("vínculo com OUTRA disciplina não habilita nesta", () => {
    expect(podeAtuar("ministrar", "habilitado", "D2", VINCULOS)).toBe(false);
  });

  it("vínculo inativo é histórico, não habilitação", () => {
    expect(podeAtuar("ministrar", "antigo", "D1", VINCULOS)).toBe(false);
  });
});

describe("`FR-021` · a delimitação — avaliação e vista de prova NÃO exigem", () => {
  it("quem não tem vínculo nenhum atua em avaliação e vista de prova", () => {
    expect(podeAtuar("avaliacao", "outro", "D1", [])).toBe(true);
    expect(podeAtuar("vista_de_prova", "outro", "D1", [])).toBe(true);
  });

  it("as quatro atuações estão decididas, e só duas exigem", () => {
    expect(EXIGE_HABILITACAO).toEqual({
      ministrar: true,
      responsavel: true,
      avaliacao: false,
      vista_de_prova: false,
    });
  });
});

describe("D-AV-3 · o aplicador sem habilitação recebe AVISO, nunca recusa", () => {
  const V = [{ instrutorId: "x", disciplinaId: "d", status: "ativo" }];
  const N = { instrutor: "CT Fulano", disciplina: "D1 — Navegação" };
  it("avaliação: aviso para quem não está habilitado, nada para quem está", () => {
    expect(avisoDeHabilitacao("avaliacao", "y", "d", V, N)).toBe(
      "CT Fulano não está habilitado em D1 — Navegação",
    );
    expect(avisoDeHabilitacao("avaliacao", "x", "d", V, N)).toBeNull();
  });
  it("vista de prova e ministrar: nunca aviso (a recusa de ministrar continua em `podeAtuar`)", () => {
    expect(avisoDeHabilitacao("vista_de_prova", "y", "d", V, N)).toBeNull();
    expect(avisoDeHabilitacao("ministrar", "y", "d", V, N)).toBeNull();
    expect(podeAtuar("avaliacao", "y", "d", V)).toBe(true);
    expect(podeAtuar("ministrar", "y", "d", V)).toBe(false);
  });
});

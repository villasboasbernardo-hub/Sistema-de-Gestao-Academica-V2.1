/**
 * `lib/dominio/dsa/publicacao.ts` — a situação da semana do DSA e o que se pode fazer nela (spec 024, RP-0 a RP-4).
 */
import { describe, expect, it } from "vitest";

import {
  documentosIguais,
  rotuloDoAlt,
  situacaoDaSemana,
  type EventoDaSemana,
} from "@/lib/dominio/dsa/publicacao";

const ev = (
  tipo: EventoDaSemana["tipo"],
  ocorridoEm: string,
  numero: number | null = null,
): EventoDaSemana => ({
  tipo,
  ocorridoEm,
  numero,
  justificativa: tipo === "alteracao_publicada" ? "Troca de instrutor por missão" : null,
  autor: "Prova",
  hoje: "2026-10-20",
});

describe("situacaoDaSemana", () => {
  it("sem evento e sem rascunho: em preenchimento — salvar sim, prévia e publicar não", () => {
    const s = situacaoDaSemana([], 0, false);
    expect(s.situacao).toBe("em_preenchimento");
    expect(s.podeSalvar).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
    expect(s.podePublicar).toBe(false);
    expect(s.travada).toBe(false);
  });
  it("com rascunho: em preenchimento, e o descarte aparece", () => {
    const s = situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 2, false);
    expect(s.situacao).toBe("em_preenchimento");
    expect(s.rascunhos).toBe(2);
    expect(s.podeDescartar).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
  });
  it("salva e sem rascunho: registrado — prévia e publicar", () => {
    const s = situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 0, false);
    expect(s.situacao).toBe("registrado");
    expect(s.podeGerarPrevia).toBe(true);
    expect(s.podePublicar).toBe(true);
  });
  it("publicada: travada, só «Fazer alteração»; ALT da original em branco", () => {
    const s = situacaoDaSemana(
      [ev("salvo", "2026-10-20T10:00:00Z"), ev("publicado", "2026-10-20T11:00:00Z", 0)],
      0,
      false,
    );
    expect(s.situacao).toBe("publicado");
    expect(s.travada).toBe(true);
    expect(s.podeFazerAlteracao).toBe(true);
    expect(s.podeSalvar).toBe(false);
    expect(s.versaoVigente).toBe(0);
  });
  it("alteração iniciada: destrava, e publicar alteração (com justificativa) aparece", () => {
    const s = situacaoDaSemana(
      [
        ev("salvo", "2026-10-20T10:00:00Z"),
        ev("publicado", "2026-10-20T11:00:00Z", 0),
        ev("alteracao_iniciada", "2026-10-21T09:00:00Z"),
      ],
      1,
      false,
    );
    expect(s.situacao).toBe("alteracao_em_andamento");
    expect(s.travada).toBe(false);
    expect(s.podePublicarAlteracao).toBe(true);
    expect(s.podeGerarPrevia).toBe(false);
  });
  it("alteração publicada: ALT N, travada de novo, e o histórico em ordem", () => {
    const s = situacaoDaSemana(
      [
        ev("publicado", "2026-10-20T11:00:00Z", 0),
        ev("alteracao_iniciada", "2026-10-21T09:00:00Z"),
        ev("alteracao_publicada", "2026-10-21T10:00:00Z", 1),
      ],
      0,
      false,
    );
    expect(s.situacao).toBe("publicado");
    expect(s.versaoVigente).toBe(1);
    expect(s.historico.map((h) => h.numero)).toEqual([0, 1]);
  });
  it("RP-4: publicada e diferente do retrato — avisa, e só se publicada e travada", () => {
    expect(
      situacaoDaSemana([ev("publicado", "2026-10-20T11:00:00Z", 0)], 0, true)
        .alteradoDesdeAPublicacao,
    ).toBe(true);
    expect(
      situacaoDaSemana([ev("salvo", "2026-10-20T10:00:00Z")], 0, true).alteradoDesdeAPublicacao,
    ).toBe(false);
  });
});

describe("rotuloDoAlt", () => {
  it("a original e a semana sem publicação saem em branco; a alteração, ALT N", () => {
    expect(rotuloDoAlt(null)).toBe("ALT —");
    expect(rotuloDoAlt(0)).toBe("ALT —");
    expect(rotuloDoAlt(2)).toBe("ALT 2");
  });
});

describe("documentosIguais", () => {
  it("compara pelo conteúdo, sem a ordem das chaves", () => {
    expect(documentosIguais({ a: 1, b: [1, 2] }, { b: [1, 2], a: 1 })).toBe(true);
    expect(documentosIguais({ a: 1 }, { a: 2 })).toBe(false);
  });
});

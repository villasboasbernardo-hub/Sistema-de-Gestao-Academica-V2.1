/**
 * `D-DSA-2` — a etapa presencial da turma semipresencial (comando de correções do DSA, 08/10/2026).
 * Casos sintéticos; o que se prova é a regra, sem banco.
 */
import { describe, expect, it } from "vitest";

import {
  dataNaJanela,
  diasForaDaEtapa,
  etapaDaSemana,
  janelaDaEtapa,
  recusaForaDaEtapa,
  type TurmaParaEtapa,
} from "@/lib/dominio/dsa/etapa-presencial";

/* A semana de 13 a 17/04/2026 (segunda a sexta). */
const SEMANA = ["2026-04-13", "2026-04-14", "2026-04-15", "2026-04-16", "2026-04-17"];

const semi = (inicio: string | null, termino: string | null): TurmaParaEtapa => ({
  modalidade: "semipresencial",
  inicioEtapaPresencial: inicio,
  terminoEtapaPresencial: termino,
});

describe("etapaDaSemana", () => {
  it("presencial não tem etapa: o DSA segue em toda semana", () => {
    const turma = { ...semi("2026-05-04", "2026-05-29"), modalidade: "presencial" };
    expect(etapaDaSemana(turma, SEMANA)).toEqual({ tipo: "nao_se_aplica" });
    expect(recusaForaDaEtapa(turma, "2026-04-13")).toBeNull();
  });

  it("semipresencial SEM janela abre o DSA com aviso — e não recusa nada (RN-DEG-01)", () => {
    expect(etapaDaSemana(semi(null, null), SEMANA)).toEqual({ tipo: "sem_janela" });
    expect(recusaForaDaEtapa(semi(null, null), "2026-04-13")).toBeNull();
  });

  it("⚠️ a semana inteira fora da janela é «fora» — e o dia é recusado com o motivo", () => {
    const turma = semi("2026-05-04", "2026-05-29");
    expect(etapaDaSemana(turma, SEMANA).tipo).toBe("fora");
    expect(recusaForaDaEtapa(turma, "2026-04-15")).toBe(
      "Fora da etapa presencial (04/05/2026 a 29/05/2026): este dia é da etapa a distância e não tem DSA. Para lançar, ajuste a etapa presencial na ficha da turma.",
    );
  });

  it("a semana dentro da janela tem DSA, e nenhum dia é recusado", () => {
    const turma = semi("2026-04-01", "2026-04-30");
    expect(etapaDaSemana(turma, SEMANA).tipo).toBe("dentro");
    for (const d of SEMANA) expect(recusaForaDaEtapa(turma, d)).toBeNull();
    expect(diasForaDaEtapa(turma, SEMANA)).toEqual([]);
  });

  it("⚠️ a semana que a janela corta ao meio TEM DSA — e só os dias de fora são recusados", () => {
    const turma = semi("2026-04-15", "2026-06-30");
    expect(etapaDaSemana(turma, SEMANA).tipo).toBe("dentro");
    expect(diasForaDaEtapa(turma, SEMANA)).toEqual(["2026-04-13", "2026-04-14"]);
    expect(recusaForaDaEtapa(turma, "2026-04-14")).not.toBeNull();
    expect(recusaForaDaEtapa(turma, "2026-04-15")).toBeNull();
  });
});

describe("as pontas da janela", () => {
  it("o primeiro e o último dia são presenciais (inclusive nas duas pontas)", () => {
    const janela = { inicio: "2026-04-15", termino: "2026-04-17" };
    expect(dataNaJanela("2026-04-14", janela)).toBe(false);
    expect(dataNaJanela("2026-04-15", janela)).toBe(true);
    expect(dataNaJanela("2026-04-17", janela)).toBe(true);
    expect(dataNaJanela("2026-04-18", janela)).toBe(false);
  });

  it("o carimbo de hora da origem não impede de casar a data", () => {
    const turma = semi("2026-04-15 00:00:00", "2026-04-17 00:00:00");
    expect(janelaDaEtapa(turma)).toEqual({ inicio: "2026-04-15", termino: "2026-04-17" });
    expect(recusaForaDaEtapa(turma, "2026-04-16 00:00:00")).toBeNull();
  });

  it("janela pela metade é «sem janela» — o banco não a aceita, e a regra não a inventa", () => {
    expect(janelaDaEtapa(semi("2026-04-15", null))).toBeNull();
    expect(etapaDaSemana(semi("2026-04-15", null), SEMANA)).toEqual({ tipo: "sem_janela" });
  });
});

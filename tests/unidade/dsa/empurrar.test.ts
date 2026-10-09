/**
 * `lib/dominio/dsa/empurrar.ts` — a `D-DSA-3`: empurrar os seguintes em cascata, no mesmo dia.
 */
import { describe, expect, it } from "vitest";

import {
  avisoDoEmpurrao,
  empurrarEmCascata,
  LIMITE_DO_BANCO,
  ultimoTempoDoDia,
} from "@/lib/dominio/dsa/empurrar";

const DIA = "2026-04-10";
const A = { fatoId: "a", rotulo: "I — Aula A", taInicial: 1, tempos: 1 };
const B = { fatoId: "b", rotulo: "II — Aula B", taInicial: 2, tempos: 1 };
const C = { fatoId: "c", rotulo: "III — Aula C", taInicial: 3, tempos: 2 };

describe("`D-DSA-3` · o empurrão em cascata", () => {
  it("⚠️ o exemplo da decisão: A de 1 para 2 TA leva B do 2º para o 3º tempo", () => {
    const r = empurrarEmCascata({
      bloco: { fatoId: "a", taInicial: 1, tempos: 2 },
      doDia: [A, B],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r).toEqual({
      tipo: "ok",
      empurrados: [{ fatoId: "b", rotulo: "II — Aula B", deTa: 2, paraTa: 3, tempos: 1 }],
    });
  });

  it("a cascata mantém a ordem e a duração de cada um", () => {
    const r = empurrarEmCascata({
      bloco: { fatoId: "a", taInicial: 1, tempos: 3 },
      doDia: [A, B, C],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo === "ok" ? r.empurrados.map((e) => [e.fatoId, e.paraTa, e.tempos]) : r).toEqual([
      ["b", 4, 1],
      ["c", 5, 2],
    ]);
  });

  it("um vão no dia absorve a cascata: quem já começa depois não se mexe", () => {
    const D = { fatoId: "d", rotulo: "IV — Aula D", taInicial: 7, tempos: 1 };
    const r = empurrarEmCascata({
      bloco: { fatoId: "a", taInicial: 1, tempos: 2 },
      doDia: [A, B, D],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo === "ok" ? r.empurrados.map((e) => e.fatoId) : r).toEqual(["b"]);
  });

  it("sem sobreposição, ninguém é empurrado", () => {
    const r = empurrarEmCascata({
      bloco: { fatoId: "a", taInicial: 1, tempos: 1 },
      doDia: [A, B],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r).toEqual({ tipo: "ok", empurrados: [] });
  });

  it("o bloco NOVO (sem `fatoId`) empurra do mesmo jeito", () => {
    const r = empurrarEmCascata({
      bloco: { taInicial: 2, tempos: 2 },
      doDia: [A, B, C],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo === "ok" ? r.empurrados.map((e) => [e.fatoId, e.paraTa]) : r).toEqual([
      ["b", 4],
      ["c", 5],
    ]);
  });

  it("⚠️ não cabe até o último tempo: RECUSA, nomeando quem não cabe — nunca outro dia", () => {
    const r = empurrarEmCascata({
      /* A de 1 a 7: B vai para o 8º (cabe), C para o 9º e 10º (não cabe). */
      bloco: { fatoId: "a", taInicial: 1, tempos: 7 },
      doDia: [A, B, C],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo).toBe("recusa");
    expect(r.tipo === "recusa" ? r.mensagem : "").toContain("«III — Aula C»");
    expect(r.tipo === "recusa" ? r.mensagem : "").toContain("9º tempo");
    expect(r.tipo === "recusa" ? r.mensagem : "").toContain("Nada foi gravado");
    expect(r.tipo === "recusa" ? r.mensagem : "").not.toContain("«II — Aula B»");
  });

  it("o último tempo é limite inclusivo: terminar nele cabe", () => {
    const r = empurrarEmCascata({
      bloco: { fatoId: "a", taInicial: 1, tempos: 5 },
      doDia: [A, B, C],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo === "ok" ? r.empurrados.at(-1) : r).toMatchObject({ fatoId: "c", paraTa: 7 });
  });

  it("⚠️ o lançamento que começa ANTES e é atingido não é empurrado: recusa, sem inverter a ordem", () => {
    const longo = { fatoId: "x", rotulo: "V — Aula longa", taInicial: 1, tempos: 3 };
    const r = empurrarEmCascata({
      bloco: { taInicial: 2, tempos: 1 },
      doDia: [longo],
      ultimoTempo: 9,
      data: DIA,
    });
    expect(r.tipo).toBe("recusa");
    expect(r.tipo === "recusa" ? r.mensagem : "").toContain("«V — Aula longa», que começa no 1º");
  });

  it("o último tempo do dia é o regime mais o excepcional; sem regime, o limite do banco", () => {
    expect(ultimoTempoDoDia(8)).toBe(9);
    expect(ultimoTempoDoDia(null)).toBe(LIMITE_DO_BANCO);
    expect(ultimoTempoDoDia(0)).toBe(LIMITE_DO_BANCO);
  });

  it("o aviso diz quem foi e para onde; sem empurrão, não há aviso", () => {
    expect(
      avisoDoEmpurrao([{ fatoId: "b", rotulo: "II — Aula B", deTa: 2, paraTa: 3, tempos: 1 }], DIA),
    ).toBe("Em 10/04/2026, para abrir espaço, foi empurrado: «II — Aula B» do 2º para o 3º tempo.");
    expect(avisoDoEmpurrao([], DIA)).toBeNull();
  });
});

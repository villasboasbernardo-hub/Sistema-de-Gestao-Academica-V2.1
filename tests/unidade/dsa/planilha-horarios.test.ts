/**
 * A aba HORÁRIOS — `FR-009`, `RN-CONF-02` e `contracts/planilha.md` §5 da spec 015.
 */
import { describe, expect, it } from "vitest";

import { relogioDaSemana, relogioDoCatalogo } from "@/lib/dominio/dsa/horario-do-bloco";
import { abaDeHorarios, relogiosDaPasta, temposDaGrade } from "@/lib/dominio/dsa/planilha/horarios";
import { H, H_PRIMEIRA_LINHA, NOME } from "@/lib/dominio/dsa/planilha/layout";
import { celulaEm } from "@/lib/planilha/pasta";

import { RELOGIO_A, RELOGIO_B } from "./planilha/sintetico";

const seis = (segunda: string) => {
  const d = new Date(`${segunda}T12:00:00Z`);
  return Array.from({ length: 6 }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
};

/** A CFG-H do CAHO: 9 tempos no catálogo, o 9º excepcional (D1 da VIRADA-1). */
const CATALOGO = relogioDoCatalogo(
  Array.from({ length: 9 }, (_, i) => ({
    tempoNumero: i + 1,
    periodo: i < 4 ? ("manha" as const) : ("tarde" as const),
    tipoTempo: i === 8 ? ("excepcional" as const) : ("normal" as const),
    horaInicio: `${String(8 + i).padStart(2, "0")}:00`,
    horaFim: `${String(8 + i).padStart(2, "0")}:45`,
  })),
  8,
);

describe("`FR-009` · um bloco por relógio do período", () => {
  it("duas vigências viram dois relógios; a semana repetida aponta para o mesmo", () => {
    const { relogios, idDaSemana } = relogiosDaPasta([
      { seisDias: seis("2026-04-06"), relogio: RELOGIO_A },
      { seisDias: seis("2026-04-13"), relogio: RELOGIO_A },
      { seisDias: seis("2026-04-20"), relogio: RELOGIO_B },
      { seisDias: seis("2026-04-27"), relogio: null },
    ]);
    expect(relogios.map((r) => r.id)).toEqual(["R1", "R2"]);
    expect(idDaSemana).toEqual(["R1", "R1", "R2", null]);
    expect(relogios[0]).toMatchObject({ de: "2026-04-06", ate: "2026-04-18" });
  });

  it("o relógio é o do domínio, escrito sem recálculo: cada TA, o período, o excepcional e a chave", () => {
    const relogio = relogioDaSemana({
      regime: {
        regimeTempos: 8,
        taDuracaoMin: 45,
        intervaloManhaMin: 5,
        intervaloTardeMin: 5,
        horaInicioManha: "07:50",
        horaInicioTarde: "13:00",
        configuracaoHorarioId: "cfg",
      },
      catalogo: (CATALOGO?.tempos ?? []).map((t) => ({
        tempoNumero: t.numero,
        periodo: t.periodo,
        tipoTempo: t.tipo,
        horaInicio: t.inicio,
        horaFim: t.fim,
      })),
    });
    expect(relogio?.origem).toBe("catalogo");
    const { relogios } = relogiosDaPasta([{ seisDias: seis("2026-04-06"), relogio }]);
    const { aba, nomes } = abaDeHorarios(relogios);
    const l9 = H_PRIMEIRA_LINHA + 8;
    expect(celulaEm(aba, l9, H.chave)?.valor).toBe("R1|9");
    expect(celulaEm(aba, l9, H.horario)?.valor).toBe("16:00–16:45");
    expect(celulaEm(aba, l9, H.excepcional)?.valor).toBe("sim");
    expect(celulaEm(aba, H_PRIMEIRA_LINHA, H.periodo)?.valor).toBe("manhã");
    expect(celulaEm(aba, H_PRIMEIRA_LINHA + 4, H.periodo)?.valor).toBe("tarde");
    expect(celulaEm(aba, H_PRIMEIRA_LINHA, H.origem)?.valor).toBe("catálogo");
    expect(nomes.map((n) => n.nome)).toContain(NOME.hChave);
  });

  it("`RN-CONF-02` · nenhuma coluna «quantidade de TA → horário até o fim do dia»", () => {
    const { aba } = abaDeHorarios(
      relogiosDaPasta([{ seisDias: seis("2026-04-06"), relogio: RELOGIO_A }]).relogios,
    );
    const titulos = [...(aba.celulas.get(2)?.values() ?? [])].map((c) => String(c.valor ?? ""));
    expect(titulos.some((t) => /quantidade|até o fim|fim do dia/i.test(t))).toBe(false);
  });
});

describe("os TA por dia na entrada", () => {
  it("o regime + 1 corta o relógio derivado de 12 tempos (lugar do Estudo Individual)", () => {
    expect(RELOGIO_A.tempos.length).toBe(12);
    expect(temposDaGrade({ relogios: [RELOGIO_A], ultimoOcupado: 6 })).toBe(9);
  });
  it("o último TA já ocupado vale mais que o regime", () => {
    expect(temposDaGrade({ relogios: [RELOGIO_A], ultimoOcupado: 11 })).toBe(11);
  });
  it("o catálogo de 9 tempos não passa de 9", () => {
    expect(
      temposDaGrade({ relogios: [CATALOGO as NonNullable<typeof CATALOGO>], ultimoOcupado: 10 }),
    ).toBe(9);
  });
  it("sem relógio nenhum, o teto de TA", () => {
    expect(temposDaGrade({ relogios: [], ultimoOcupado: 3 })).toBe(12);
  });
});

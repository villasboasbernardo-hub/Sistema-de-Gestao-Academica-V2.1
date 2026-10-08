/**
 * `RN-EVT-04` — não se lança aula em dia de feriado de dia inteiro do calendário ativo
 * (`lib/dominio/dsa/dia-bloqueado.ts`, decisão de Bernardo Villas Boas de 07/10/2026).
 */
import { describe, expect, it } from "vitest";

import {
  mensagemDeDiaBloqueado,
  motivoDoBloqueio,
  recusaDeAulaNoDia,
  type FeriadoDoCalendario,
} from "@/lib/dominio/dsa/dia-bloqueado";
import { montarSemana } from "@/lib/dominio/dsa/grade";

const QUARTA = "2026-04-08";

function feriado(ajustes: Partial<FeriadoDoCalendario> = {}): FeriadoDoCalendario {
  return {
    data: QUARTA,
    descricao: "Data Magna",
    impacto: "dia_inteiro",
    status: "ativo",
    ...ajustes,
  };
}

describe("RN-EVT-04 · qual dia está bloqueado", () => {
  it("o feriado de DIA INTEIRO ativo bloqueia, e o motivo é a descrição dele", () => {
    expect(motivoDoBloqueio(QUARTA, [feriado()])).toBe("Data Magna");
  });

  it("⚠️ o caso que discrimina: mesma data, só o impacto muda — parcial e informativo NÃO bloqueiam", () => {
    expect(motivoDoBloqueio(QUARTA, [feriado({ impacto: "parcial" })])).toBeNull();
    expect(motivoDoBloqueio(QUARTA, [feriado({ impacto: "informativo" })])).toBeNull();
  });

  it("o feriado INATIVO não bloqueia (regra 4 — calendário ativo)", () => {
    expect(motivoDoBloqueio(QUARTA, [feriado({ status: "inativo" })])).toBeNull();
  });

  it("feriado de outro dia não bloqueia este", () => {
    expect(motivoDoBloqueio("2026-04-09", [feriado()])).toBeNull();
  });

  it("⚠️ a data com carimbo de hora (origem da v2.0) casa com o dia", () => {
    expect(motivoDoBloqueio(QUARTA, [feriado({ data: `${QUARTA} 00:00:00` })])).toBe("Data Magna");
  });

  it("dois feriados no mesmo dia: vale a descrição do primeiro de dia inteiro", () => {
    expect(
      motivoDoBloqueio(QUARTA, [
        feriado({ descricao: "Aviso", impacto: "informativo" }),
        feriado({ descricao: "Primeiro" }),
        feriado({ descricao: "Segundo" }),
      ]),
    ).toBe("Primeiro");
  });
});

describe("RN-EVT-04 · a frase da recusa", () => {
  it("diz o motivo e como resolver, com as palavras da decisão", () => {
    expect(mensagemDeDiaBloqueado("Data Magna")).toBe(
      "Dia bloqueado no calendário: Data Magna. Para lançar, ajuste o calendário.",
    );
  });

  it("o ponto final do motivo não vira ponto duplo", () => {
    expect(mensagemDeDiaBloqueado("Licença de pagamento.")).toBe(
      "Dia bloqueado no calendário: Licença de pagamento. Para lançar, ajuste o calendário.",
    );
  });
});

describe("RN-EVT-04 · lançar e mover uma aula", () => {
  it("lançar no dia bloqueado é recusado; em dia livre, não", () => {
    expect(recusaDeAulaNoDia({ data: QUARTA, feriados: [feriado()] })).toBe(
      "Dia bloqueado no calendário: Data Magna. Para lançar, ajuste o calendário.",
    );
    expect(recusaDeAulaNoDia({ data: "2026-04-07", feriados: [feriado()] })).toBeNull();
  });

  it("⚠️ mover PARA o dia bloqueado é recusado — sem isso bastaria lançar na véspera e arrastar", () => {
    expect(
      recusaDeAulaNoDia({ data: QUARTA, dataAtual: "2026-04-07", feriados: [feriado()] }),
    ).not.toBeNull();
  });

  it("reposicionar DENTRO do próprio dia bloqueado não é recusado — a aula já está lá", () => {
    expect(
      recusaDeAulaNoDia({ data: QUARTA, dataAtual: QUARTA, feriados: [feriado()] }),
    ).toBeNull();
  });
});

describe("RN-EVT-04 · a grade e a recusa dizem o mesmo dia", () => {
  it("o dia que a grade marca como bloqueado é o que a recusa recusa — e o inativo, nenhum dos dois", () => {
    const feriados = [
      feriado(),
      feriado({ data: "2026-04-09", descricao: "Inativado", status: "inativo" }),
    ];
    const semana = montarSemana({
      dias: ["2026-04-06", "2026-04-07", QUARTA, "2026-04-09", "2026-04-10"],
      relogio: null,
      temposDeclarados: 8,
      fatos: [],
      feriados,
      marcas: new Map(),
      hoje: "2026-04-01",
      sabadoAberto: false,
    });
    for (const dia of semana.dias) {
      const recusa = recusaDeAulaNoDia({ data: dia.data, feriados });
      expect(dia.bloqueio === null, `grade e recusa discordam sobre ${dia.data}`).toBe(
        recusa === null,
      );
    }
    expect(semana.dias.find((d) => d.data === QUARTA)?.bloqueio).toBe("Data Magna");
    expect(semana.dias.find((d) => d.data === "2026-04-09")?.bloqueio).toBeNull();
  });
});

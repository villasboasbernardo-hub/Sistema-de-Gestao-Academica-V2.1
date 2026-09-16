/**
 * Data de calendário na ficha — sem o dia a menos que `new Date` produziria em Brasília.
 */
import { describe, expect, it } from "vitest";

import { dataParaLeitura } from "@/lib/formato/data";

describe("`lib/formato/data` · data de calendário para leitura", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA sem mudar o dia", () => {
    expect(dataParaLeitura("2021-03-01")).toBe("01/03/2021");
  });

  it("controle: pelo caminho de `Date`, no fuso da CIAARA-11, o dia mudaria", () => {
    const pelaData = new Date("2021-03-01").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    expect(pelaData).toBe("28/02/2021");
  });

  it("vazio, nulo e fora do formato viram '—'", () => {
    expect(dataParaLeitura("")).toBe("—");
    expect(dataParaLeitura(null)).toBe("—");
    expect(dataParaLeitura("01/03/2021")).toBe("—");
  });
});

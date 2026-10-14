/** `RF-EXTRA-01` · `RN-EVT-01` · `FR-010` (spec 014) — a categoria vem do tipo. */
import { describe, expect, it } from "vitest";

import {
  categoriaPeloTipo,
  foraDaCht,
  tiposOferecidos,
  type TipoDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";

const tipo = (
  valor: string,
  metadados: TipoDeAtividade["metadados"],
  ativo = true,
): TipoDeAtividade => ({
  id: valor,
  valor,
  ativo,
  metadados,
});

describe("categoriaPeloTipo", () => {
  it("tipo com categoria → a categoria", () => {
    expect(categoriaPeloTipo(tipo("Palestra", { categoria: "AEC" }))).toBe("AEC");
    expect(categoriaPeloTipo(tipo("Monitoria", { categoria: "Apoio_Individualizado" }))).toBe(
      "Apoio_Individualizado",
    );
  });

  it("sem categoria, ou de uso aula, não é oferecido", () => {
    expect(categoriaPeloTipo(tipo("Aula", { uso: "aula" }))).toBeNull();
    expect(categoriaPeloTipo(tipo("Licença", {}))).toBeNull();
    expect(categoriaPeloTipo(tipo("X", null))).toBeNull();
    expect(categoriaPeloTipo(tipo("Y", { categoria: "CHD" }))).toBeNull();
  });

  it("trocar a categoria do tipo muda o resultado (o número não está no código)", () => {
    expect(categoriaPeloTipo(tipo("Recepção", { categoria: "TAD" }))).toBe("TAD");
    expect(categoriaPeloTipo(tipo("Recepção", { categoria: "AEC" }))).toBe("AEC");
  });

  it("a oferta tira os inativos e os sem categoria", () => {
    const lista = [
      tipo("Palestra", { categoria: "AEC" }),
      tipo("Aula", { uso: "aula" }),
      tipo("Licença de Pagamento", {}, false),
      tipo("Antigo", { categoria: "TAD" }, false),
    ];
    expect(tiposOferecidos(lista).map((t) => t.valor)).toEqual(["Palestra"]);
  });

  it("EI e Apoio ficam fora da CHT; AEC, TAD e TR dentro", () => {
    expect(foraDaCht("Estudo_Individual")).toBe(true);
    expect(foraDaCht("Apoio_Individualizado")).toBe(true);
    expect(["AEC", "TAD", "TR"].map((c) => foraDaCht(c as "AEC"))).toEqual([false, false, false]);
  });
});

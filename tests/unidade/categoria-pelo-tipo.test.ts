/** `RF-EXTRA-01` · `RN-EVT-01` · `FR-010` (spec 014) — a categoria vem do tipo. */
import { describe, expect, it } from "vitest";

import {
  recusaPelaCategoria,
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

describe("spec 014, FR-011 · as regras que dependem da categoria (`recusaPelaCategoria`)", () => {
  const base = { turmaId: "t", disciplinaId: null, quantidadeAlunos: null } as const;

  it("disciplina em TAD é recusada — só a AEC leva disciplina; na AEC passa", () => {
    expect(recusaPelaCategoria({ ...base, categoria: "TAD", disciplinaId: "d" })?.mensagem).toBe(
      "Só a AEC leva disciplina.",
    );
    expect(recusaPelaCategoria({ ...base, categoria: "AEC", disciplinaId: "d" })).toBeNull();
  });

  it("`V-5` · Estudo Individual GLOBAL é recusado; de turma, aceito", () => {
    expect(
      recusaPelaCategoria({ ...base, categoria: "Estudo_Individual", turmaId: null })?.mensagem,
    ).toContain("sempre de uma turma");
    expect(recusaPelaCategoria({ ...base, categoria: "Estudo_Individual" })).toBeNull();
  });

  it("FR-020 · quantidade de alunos só no Apoio", () => {
    expect(recusaPelaCategoria({ ...base, categoria: "TAD", quantidadeAlunos: 3 })?.campo).toBe(
      "quantidadeAlunos",
    );
    expect(
      recusaPelaCategoria({ ...base, categoria: "Apoio_Individualizado", quantidadeAlunos: 3 }),
    ).toBeNull();
  });
});

/**
 * RD-1 (Bloco 11, spec 026) — na aula, a lista de quem ministra traz só os habilitados na disciplina.
 */
import { describe, expect, it } from "vitest";

import {
  fraseDaListaDaAula,
  habilitadosNaDisciplina,
  instrutoresDaAula,
} from "@/lib/dominio/dsa/instrutores-da-aula";

const INSTRUTORES = [{ id: "ct" }, { id: "sem-vinculo" }, { id: "so-de-outra" }];
const HABILITACOES = [
  { instrutorId: "ct", disciplinaId: "nav" },
  { instrutorId: "so-de-outra", disciplinaId: "met" },
];

describe("instrutoresDaAula — só os habilitados na disciplina da aula", () => {
  it("o sem vínculo não aparece; o de outra disciplina também não", () => {
    expect(instrutoresDaAula(INSTRUTORES, HABILITACOES, "nav").map((i) => i.id)).toEqual(["ct"]);
  });

  it("a ordem é a recebida — a antiguidade é do seletor", () => {
    const dois = [{ id: "b" }, { id: "a" }];
    const hab = [
      { instrutorId: "a", disciplinaId: "nav" },
      { instrutorId: "b", disciplinaId: "nav" },
    ];
    expect(instrutoresDaAula(dois, hab, "nav").map((i) => i.id)).toEqual(["b", "a"]);
  });

  it("sem disciplina escolhida, lista vazia com a frase de escolher", () => {
    expect(instrutoresDaAula(INSTRUTORES, HABILITACOES, null)).toEqual([]);
    expect(fraseDaListaDaAula(null, [])).toBe("Escolha a disciplina.");
  });

  it("disciplina sem habilitado: lista vazia com a frase de habilitar", () => {
    const lista = instrutoresDaAula(INSTRUTORES, HABILITACOES, "sem-ninguem");
    expect(lista).toEqual([]);
    expect(fraseDaListaDaAula("sem-ninguem", lista)).toMatch(/Nenhum instrutor habilitado/);
  });

  it("com habilitado, sem frase", () => {
    expect(fraseDaListaDaAula("nav", [{ id: "ct" }])).toBeNull();
  });

  it("habilitadosNaDisciplina devolve o conjunto", () => {
    expect([...habilitadosNaDisciplina(HABILITACOES, "met")]).toEqual(["so-de-outra"]);
  });
});

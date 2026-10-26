/**
 * RD-1 (Bloco 11, spec 026) — na aula, a lista de quem ministra traz só os habilitados na disciplina.
 */
import { describe, expect, it } from "vitest";

import {
  fraseDaListaDaAula,
  habilitadosNaDisciplina,
  idsDaListaDaAula,
  instrutoresDaAula,
  parPendenteDaAula,
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

  it("D-5: o habilitado INATIVO não entra no que a sugestão pode pôr (o vínculo dele segue ativo)", () => {
    /* `INSTRUTORES` são os ativos; o inativo tem habilitação em "nav" e não está na lista. */
    const comInativo = [...HABILITACOES, { instrutorId: "inativo", disciplinaId: "nav" }];
    expect([...idsDaListaDaAula(INSTRUTORES, comInativo, "nav")]).toEqual(["ct"]);
  });
});

describe("parPendenteDaAula — o par que a RD-1 confere numa edição pelo id do SALVO", () => {
  const salvo = { instrutorId: "A", disciplinaId: null, unidadeEnsinoId: "ue-x" };

  it("⚠️ o caso que discrimina: com rascunho de edição, vale o par da SOMBRA (o instrutor trocado antes)", () => {
    const sombra = {
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-x",
      rascunhoExclui: false,
    };
    expect(parPendenteDaAula(salvo, sombra)).toEqual({
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-x",
    });
  });

  it("sem sombra, ou com a sombra de exclusão, vale o próprio salvo", () => {
    expect(parPendenteDaAula(salvo, null)).toEqual(salvo);
    const exclusao = {
      instrutorId: "B",
      disciplinaId: null,
      unidadeEnsinoId: "ue-y",
      rascunhoExclui: true,
    };
    expect(parPendenteDaAula(salvo, exclusao)).toEqual(salvo);
  });
});

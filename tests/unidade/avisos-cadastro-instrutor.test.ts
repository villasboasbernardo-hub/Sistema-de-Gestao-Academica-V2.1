/**
 * `FR-027` e `RF-INSTR-09` — o quadro de avisos, com a lista **aberta** decidida em 15/09/2026.
 */
import { describe, expect, it } from "vitest";

import {
  AVISOS_INICIAIS,
  avisosDoCadastro,
  type InstrutorParaAvisos,
  type RegraDeAviso,
} from "@/lib/dominio/avisos-cadastro-instrutor";

const completo: InstrutorParaAvisos = {
  id: "completo",
  nip: "12.3456.78",
  pg: "CT",
  especialidade: "-EF",
  nomeCompleto: "Fulano De Tal",
  categoria: "Militar da Ativa",
  om: "CHM",
};

describe("`RF-INSTR-09` · os dois avisos com que a lista começa", () => {
  it("a lista começa por 'sem NIP' e 'obrigatório pendente', nesta ordem", () => {
    expect(AVISOS_INICIAIS.map((r) => r.chave)).toEqual(["sem-nip", "obrigatorio-pendente"]);
  });

  it("NIP nulo, vazio ou só com espaços entra em 'sem NIP'; o completo não entra em nada", () => {
    const lista = [
      completo,
      { ...completo, id: "nulo", nip: null },
      { ...completo, id: "branco", nip: "   " },
    ];
    const [semNip, pendente] = avisosDoCadastro(lista, AVISOS_INICIAIS);
    expect(semNip?.instrutores.map((i) => i.id)).toEqual(["nulo", "branco"]);
    expect(pendente?.instrutores).toEqual([]);
  });

  it("qualquer um dos cinco obrigatórios em branco entra em 'obrigatório pendente'", () => {
    const lista = [
      { ...completo, id: "sem-om", om: " " },
      { ...completo, id: "sem-especialidade", especialidade: null },
    ];
    const pendente = avisosDoCadastro(lista, AVISOS_INICIAIS)[1];
    expect(pendente?.instrutores.map((i) => i.id)).toEqual(["sem-om", "sem-especialidade"]);
  });

  it("aviso que não encontra ninguém continua no resultado — não some do quadro", () => {
    expect(avisosDoCadastro([completo], AVISOS_INICIAIS)).toHaveLength(2);
  });
});

describe("`FR-027` · a lista é aberta — aviso novo entra sem mudar a função", () => {
  it("um terceiro aviso, acrescentado como dado, é avaliado pela mesma função", () => {
    type ComRegime = InstrutorParaAvisos & { readonly regime: string | null };
    const semRegime: RegraDeAviso<ComRegime> = {
      chave: "sem-regime",
      titulo: "Instrutor sem regime de trabalho",
      seAplica: (i) => i.regime === null,
    };
    const lista: ComRegime[] = [
      { ...completo, regime: "20h" },
      { ...completo, id: "sem", regime: null },
    ];
    const resultado = avisosDoCadastro(lista, [...AVISOS_INICIAIS, semRegime]);
    expect(resultado.map((a) => a.chave)).toEqual([
      "sem-nip",
      "obrigatorio-pendente",
      "sem-regime",
    ]);
    expect(resultado[2]?.instrutores.map((i) => i.id)).toEqual(["sem"]);
  });

  it("o resultado não tem campo que bloqueie — só título e quem aparece (`RN-DEG-02`)", () => {
    const [aviso] = avisosDoCadastro([completo], AVISOS_INICIAIS);
    expect(Object.keys(aviso ?? {}).sort()).toEqual(["chave", "instrutores", "titulo"]);
  });
});

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
  dataInicioDocenciaCiaara: "2020-01-01",
  capacitacaoDidatica: "C-Exp-TE",
  nip: "12.3456.78",
  pg: "CT",
  especialidade: "-EF",
  nomeCompleto: "Fulano De Tal",
  categoria: "Militar da Ativa",
  om: "CHM",
};

describe("`RF-INSTR-09` · os dois avisos com que a lista começa", () => {
  it("a lista começa por 'sem NIP' e 'obrigatório pendente', e ganhou a data de docência em 15/09/2026", () => {
    expect(AVISOS_INICIAIS.map((r) => r.chave)).toEqual([
      "sem-nip",
      "obrigatorio-pendente",
      "sem-data-docencia",
    ]);
  });

  it("data de docência vazia avisa só quem também não tem capacitação — no lugar do alerta do FR-017", () => {
    const lista = [
      {
        ...completo,
        id: "sem-data-sem-cap",
        dataInicioDocenciaCiaara: null,
        capacitacaoDidatica: null,
      },
      { ...completo, id: "sem-data-com-cap", dataInicioDocenciaCiaara: null },
      { ...completo, id: "com-data-sem-cap", capacitacaoDidatica: "" },
    ];
    const aviso = avisosDoCadastro(lista, AVISOS_INICIAIS).find(
      (a) => a.chave === "sem-data-docencia",
    );
    expect(aviso?.titulo).toBe("Data de início de docência não informada");
    expect(aviso?.instrutores.map((i) => i.id)).toEqual(["sem-data-sem-cap"]);
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

  it("especialidade vazia é pendência só de militar — civil (SC, SCNS) sem ela não entra (CHK008 e CHK012)", () => {
    const lista = [
      { ...completo, id: "militar-sem-esp", especialidade: null },
      { ...completo, id: "sc-sem-esp", pg: "SC", categoria: "SCNS", especialidade: null },
      { ...completo, id: "scns-sem-esp", pg: "SCNS", especialidade: "  " },
      { ...completo, id: "fora-da-escala-sem-esp", pg: "XYZ", especialidade: null },
      { ...completo, id: "civil-sem-om", pg: "SC", especialidade: null, om: null },
    ];
    const pendente = avisosDoCadastro(lista, AVISOS_INICIAIS)[1];
    expect(pendente?.instrutores.map((i) => i.id)).toEqual([
      "militar-sem-esp",
      "fora-da-escala-sem-esp",
      "civil-sem-om",
    ]);
  });

  it("aviso que não encontra ninguém continua no resultado — não some do quadro", () => {
    expect(avisosDoCadastro([completo], AVISOS_INICIAIS)).toHaveLength(3);
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
      "sem-data-docencia",
      "sem-regime",
    ]);
    expect(resultado[3]?.instrutores.map((i) => i.id)).toEqual(["sem"]);
  });

  it("o resultado não tem campo que bloqueie — só título e quem aparece (`RN-DEG-02`)", () => {
    const [aviso] = avisosDoCadastro([completo], AVISOS_INICIAIS);
    expect(Object.keys(aviso ?? {}).sort()).toEqual(["chave", "instrutores", "titulo"]);
  });
});

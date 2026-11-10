/**
 * RA-2 (Bloco 18, spec 033) — as AEC previstas como o currículo as cadastra: a linha do banco na forma da tela, a ordem,
 * o texto de cada campo e o que as escolhas de tipo e de disciplina oferecem.
 *
 * O caso que discrimina (DoD 8): o tipo e a disciplina DESATIVADOS saem da escolha — menos os que a linha já tem, senão
 * editar outro campo trocaria o tipo (ou tiraria a disciplina) por falta de opção, e a troca seria correção RC-6 que
 * ninguém pediu.
 */
import { describe, expect, it } from "vitest";

import {
  aecPrevistaDoBanco,
  emOrdemDoCurriculo,
  opcoesDeDisciplina,
  opcoesDeTipo,
  proximaOrdem,
  textoDaDisciplina,
  textoDaFonte,
  textoDosTaPrevistos,
  tiposDeAec,
  type AecPrevistaDoCurriculo,
  type LinhaDaAecPrevistaNoBanco,
} from "@/lib/dominio/atividades/aec-previstas-no-curriculo";

const LINHA: LinhaDaAecPrevistaNoBanco = {
  id: "p-1",
  codigo: "AEP-000001",
  nome: "AMAZÔNIA AZUL (AMAZUL)",
  tipo_atividade_id: "t-palestra",
  ta_previstos: 4,
  obrigatoria: true,
  ordem: 2,
  fonte_arquivo: "CAHO.pdf",
  fonte_pagina: "A-76 (Anexo C)",
  observacao: "  ",
  status: "ativo",
  tipo: { valor: "Palestra", rotulo_exibicao: "Palestra" },
  disciplina: null,
};

function prevista(campos: Partial<AecPrevistaDoCurriculo>): AecPrevistaDoCurriculo {
  return { ...aecPrevistaDoBanco(LINHA), ...campos };
}

describe("RA-2 — a linha do banco na forma da tela", () => {
  it("o rótulo do tipo, nunca o valor (FR-001.2)", () => {
    const p = aecPrevistaDoBanco({
      ...LINHA,
      tipo: { valor: "Atividade Extracurricular", rotulo_exibicao: "Atividade Extraclasse" },
    });
    expect(p.tipoRotulo).toBe("Atividade Extraclasse");
  });

  it("o texto em branco vira nulo, e a situação sai do status", () => {
    const p = aecPrevistaDoBanco({ ...LINHA, status: "inativo" });
    expect(p.observacao).toBeNull();
    expect(p.fontePagina).toBe("A-76 (Anexo C)");
    expect(p.ativa).toBe(false);
  });

  it("a disciplina embutida vira código e nome", () => {
    const p = aecPrevistaDoBanco({
      ...LINHA,
      disciplina: { id: "d-8", cod_disciplina: "VIII", nome_disciplina: "Auxílios à Navegação" },
    });
    expect(p.disciplina).toEqual({ id: "d-8", cod: "VIII", nome: "Auxílios à Navegação" });
    expect(textoDaDisciplina(p.disciplina!)).toBe("VIII — Auxílios à Navegação");
  });
});

describe("RA-2 — o texto de cada campo", () => {
  it("TA vazio é «não definido», nunca zero (RN-DEG-01)", () => {
    expect(textoDosTaPrevistos(null)).toBe("não definido");
    expect(textoDosTaPrevistos(4)).toBe("4 TA");
  });

  it("a fonte: arquivo e página, um dos dois, ou nada", () => {
    expect(textoDaFonte("CAHO.pdf", "A-74")).toBe("CAHO.pdf, p. A-74");
    expect(textoDaFonte("CAHO.pdf", null)).toBe("CAHO.pdf");
    expect(textoDaFonte(null, "A-74")).toBe("p. A-74");
    expect(textoDaFonte(null, null)).toBeNull();
  });
});

describe("RA-2 — a ordem da lista", () => {
  it("ativas primeiro; dentro, a ordem do currículo e, no empate, o nome", () => {
    const lista = emOrdemDoCurriculo([
      prevista({ id: "c", nome: "Visita", ordem: 1, ativa: false }),
      prevista({ id: "b", nome: "Palestra B", ordem: 2 }),
      prevista({ id: "a", nome: "Palestra A", ordem: 2 }),
      prevista({ id: "d", nome: "Zeta", ordem: 1 }),
    ]);
    expect(lista.map((p) => p.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("a próxima posição vem depois da última, inclusive das desativadas", () => {
    expect(proximaOrdem([])).toBe(1);
    expect(proximaOrdem([3, null, 7, 1])).toBe(8);
  });
});

describe("RA-2 — os tipos que a AEC prevista aceita", () => {
  const CATALOGO = [
    { id: "t-aula", valor: "Aula", ativo: true, metadados: { uso: "aula" } },
    { id: "t-palestra", valor: "Palestra", ativo: true, metadados: { categoria: "AEC" } },
    {
      id: "t-extra",
      valor: "Atividade Extracurricular",
      rotulo_exibicao: "Atividade Extraclasse",
      ativo: true,
      metadados: { categoria: "AEC" },
    },
    { id: "t-tr", valor: "Tempo Reserva", ativo: true, metadados: { categoria: "TR" } },
    {
      id: "t-mon",
      valor: "Monitoria",
      ativo: true,
      metadados: { categoria: "Apoio_Individualizado" },
    },
    { id: "t-velho", valor: "Visita antiga", ativo: false, metadados: { categoria: "AEC" } },
  ];

  it("só os de classificação AEC, pelo rótulo e na ordem do catálogo", () => {
    expect(tiposDeAec(CATALOGO)).toEqual([
      { id: "t-palestra", rotulo: "Palestra", ativo: true },
      { id: "t-extra", rotulo: "Atividade Extraclasse", ativo: true },
      { id: "t-velho", rotulo: "Visita antiga", ativo: false },
    ]);
  });

  it("⚠️ o caso que discrimina: o desativado sai da escolha, MENOS o que a linha já tem", () => {
    const aec = tiposDeAec(CATALOGO);
    expect(opcoesDeTipo(aec, null).map((t) => t.id)).toEqual(["t-palestra", "t-extra"]);
    expect(opcoesDeTipo(aec, "t-velho").map((t) => t.id)).toEqual([
      "t-palestra",
      "t-extra",
      "t-velho",
    ]);
  });
});

describe("RA-2 — as disciplinas que a AEC prevista aceita", () => {
  const DISCIPLINAS = [
    { id: "d-10", cod: "X", nome: "Marés" },
    { id: "d-2", cod: "II", nome: "Cartografia" },
    { id: "d-9", cod: "IX", nome: "Geodésia" },
  ];

  it("em ordem natural do código, romano pelo valor", () => {
    expect(opcoesDeDisciplina(DISCIPLINAS, null).map((d) => d.cod)).toEqual(["II", "IX", "X"]);
  });

  it("⚠️ o caso que discrimina: a disciplina inativa da linha continua na escolha", () => {
    const inativa = { id: "d-5", cod: "V", nome: "Meteorologia" };
    const opcoes = opcoesDeDisciplina(DISCIPLINAS, inativa);
    expect(opcoes.map((d) => d.cod)).toEqual(["II", "V", "IX", "X"]);
    expect(opcoes.find((d) => d.id === "d-5")?.ativa).toBe(false);
    expect(opcoesDeDisciplina(DISCIPLINAS, null).some((d) => d.id === "d-5")).toBe(false);
  });

  it("a desativada que não é a da linha fica fora", () => {
    const comInativa = [...DISCIPLINAS, { id: "d-1", cod: "I", nome: "Antiga", ativa: false }];
    expect(opcoesDeDisciplina(comInativa, null).map((d) => d.cod)).toEqual(["II", "IX", "X"]);
    expect(
      opcoesDeDisciplina(comInativa, { id: "d-1", cod: "I", nome: "Antiga" }).map((d) => d.cod),
    ).toEqual(["I", "II", "IX", "X"]);
  });
});

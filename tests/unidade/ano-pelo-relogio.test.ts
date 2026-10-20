/**
 * O ano padrão do Início, de Turmas e do submenu sai do RELÓGIO, em São Paulo — spec 019, ajustes A-1 e A-5 da
 * conferência de 20/10/2026.
 *
 * > *"Padrão: o ano da data de hoje em São Paulo (hojeNaCiaara), nunca um ano fixo no código — em 01/01/2027 a tela
 * > abre em 2027 sozinha. Teste de unidade com o relógio em 31/12/2026 e em 01/01/2027."* — Bernardo Villas Boas,
 * > 20/10/2026
 *
 * ⚠️ **A VIRADA É A DE SÃO PAULO, NÃO A DE UTC**: às 23:59 de 31/12/2026 em São Paulo já é 01/01/2027 em UTC (02:59Z),
 *    e o servidor da Vercel roda em UTC. O caso das 23:59 é o que discrimina o fuso.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cartoesDoInicio } from "@/lib/dominio/cartoes-do-inicio";
import { anoDoPainel } from "@/lib/dominio/painel-de-turmas";
import { arvoreDeTurmas } from "@/lib/dominio/submenu-da-lateral";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

const turmas = [
  { codigo: "CAHO 2026", ano: 2026, arquivada: false },
  { codigo: "CAHO 2027", ano: 2027, arquivada: false },
];

/** O que as três telas fazem com o relógio: o ano padrão, sem `?ano=`. */
const anoPadrao = () => anoDoPainel("", hojeNaCiaara());

describe("A-1 e A-5 · o ano padrão vira com o relógio de São Paulo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("31/12/2026 ao meio-dia: 2026", () => {
    vi.setSystemTime(new Date("2026-12-31T12:00:00-03:00"));
    expect(anoPadrao()).toBe(2026);
  });

  it("31/12/2026 às 23:59 em São Paulo (já 2027 em UTC): ainda 2026", () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:00-03:00"));
    expect(new Date().getUTCFullYear()).toBe(2027);
    expect(anoPadrao()).toBe(2026);
  });

  it("01/01/2027 à meia-noite em São Paulo: 2027, sem ninguém mexer no código", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00-03:00"));
    expect(anoPadrao()).toBe(2027);
  });

  it("o submenu de Turmas troca de lista na mesma virada", () => {
    vi.setSystemTime(new Date("2026-12-31T23:59:00-03:00"));
    expect(arvoreDeTurmas(turmas, anoPadrao(), enderecoDaTurma).map((i) => i.rotulo)).toEqual([
      "CAHO 2026",
    ]);
    vi.setSystemTime(new Date("2027-01-01T00:00:00-03:00"));
    expect(arvoreDeTurmas(turmas, anoPadrao(), enderecoDaTurma).map((i) => i.rotulo)).toEqual([
      "CAHO 2027",
    ]);
  });
});

describe("A-2 · os cartões do Início são só das turmas ativas", () => {
  it("planejada, concluída e cancelada ficam fora; a ordem de chegada se mantém", () => {
    const turmasDoAno = [
      { codigo: "A", status: "planejada" },
      { codigo: "B", status: "ativa" },
      { codigo: "C", status: "concluida" },
      { codigo: "D", status: "cancelada" },
      { codigo: "E", status: "ativa" },
    ];
    expect(cartoesDoInicio(turmasDoAno).map((t) => t.codigo)).toEqual(["B", "E"]);
  });

  it("sem turma ativa, a lista sai vazia (a tela desenha a frase, não um carrossel vazio)", () => {
    expect(cartoesDoInicio([{ codigo: "A", status: "planejada" }])).toEqual([]);
  });
});

/**
 * Quantos filtros estão FORA DO PADRÃO — FR-004.2 da spec 016 (item 1.4 do plano de correções).
 *
 * > *"Filtros recolhidos: começam fechados; o botão mostra quantos filtros estão ativos."*
 * > — Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA É `/cursos` LIMPO.** Até 17/10/2026 o selo do botão contava qualquer valor
 * não vazio, e `situacao` vale `ativo` por padrão: com a tela limpa, o selo dizia **1** e o *"Limpar
 * filtros"* não aparecia — os dois discordavam. A régua aqui é o `padrao` do contrato de parâmetros,
 * a mesma que decide o *"Limpar filtros"*.
 */
import { describe, expect, it } from "vitest";

import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";

describe("FR-004.2 da spec 016 · filtros fora do padrão, pelo contrato", () => {
  it("`/cursos` limpo conta ZERO — `situacao=ativo` é o padrão, não um filtro", () => {
    expect(
      filtrosForaDoPadrao("/cursos", { classificacao: "", modalidade: "", situacao: "ativo" }),
    ).toBe(0);
  });

  it("`/cursos` com situação inativa e uma modalidade conta 2", () => {
    expect(
      filtrosForaDoPadrao("/cursos", {
        classificacao: "",
        modalidade: "presencial",
        situacao: "inativo",
      }),
    ).toBe(2);
  });

  it("`/turmas`: situação vazia é o padrão; busca e curso preenchidos contam 2", () => {
    expect(filtrosForaDoPadrao("/turmas", { busca: "", curso: "", ano: "", situacao: "" })).toBe(0);
    expect(
      filtrosForaDoPadrao("/turmas", { busca: "2026", curso: "C-Ap-HN", ano: "", situacao: "" }),
    ).toBe(2);
  });

  it("só conta os parâmetros que a tela passou — navegação não é filtro", () => {
    // `/disciplinas` tem `curso` e `turma` no contrato, mas eles são a cascata, não filtro.
    expect(filtrosForaDoPadrao("/disciplinas", { busca: "", situacao: "ativo" })).toBe(0);
    expect(filtrosForaDoPadrao("/disciplinas", { busca: "FÍSICA", situacao: "ativo" })).toBe(1);
  });

  it("espaço em volta não faz um texto vazio virar filtro", () => {
    expect(filtrosForaDoPadrao("/turmas", { busca: "   ", curso: "", ano: "", situacao: "" })).toBe(
      0,
    );
  });
});

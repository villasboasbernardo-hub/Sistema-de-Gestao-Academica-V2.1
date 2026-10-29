/**
 * O rótulo acessível da célula na grade SEM RELÓGIO (`GradeNumerada`, `components/ciaara/grade-dsa.tsx`) — D-6 da spec
 * 029 *(decisão de Bernardo Villas Boas, 27/10/2026)*: o Estudo Individual sem «O que é» se nomeia pelo subtipo.
 *
 * ⚠️ **O CASO QUE DISCRIMINA** (achado 12 da revisão do Bloco 14): a célula mostra o subtipo (`TecnicaDoCartao`), mas o
 *    `aria-label` da `<td>` substitui o conteúdo para o leitor de tela, e ele juntava só disciplina e conteúdo — os dois
 *    vazios no EI sem descrição. O leitor anunciava *"atividade não letiva · 8 · …"*, sem dizer o que era.
 * ⚠️ **O CONTROLE É A AULA**: nome e código da disciplina e o tópico, uma vez cada — o recurso da D-6 não pode repetir o
 *    código nem trocar o tópico da aula pela técnica.
 * ⚠️ **QUANDO A GRADE NUMERADA DESENHA BLOCO** (medido nesta prova): com `relogio: null`, `montarSemana` marca TODA
 *    célula `sem_relogio`, e nenhum bloco é desenhado. A grade numerada só tem célula ocupada quando há relógio e o
 *    modelo do papel não monta (`gradeDoPapel` devolve `null` para relógio sem tempos) — é o caso montado aqui, pela
 *    mesma `montarSemana` da página.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GradeDsa } from "@/components/ciaara/grade-dsa";
import { montarSemana, type FatoDaSemana } from "@/lib/dominio/dsa/grade";

const DIAS = ["2026-04-06", "2026-04-07", "2026-04-08", "2026-04-09", "2026-04-10"];

const EI_SEM_DESCRICAO: FatoDaSemana = {
  fatoId: "ei-sem-descricao",
  origem: "atividade_nao_letiva",
  data: "2026-04-10",
  taInicial: 8,
  tempos: 1,
  herdado: false,
  disciplina: null,
  conteudo: null,
  tecnica: "Estudo Individual",
  instrutor: null,
  local: "Biblioteca",
};

const AULA: FatoDaSemana = {
  fatoId: "aula",
  origem: "aula",
  data: "2026-04-06",
  taInicial: 1,
  tempos: 1,
  herdado: false,
  disciplina: "NAV-I",
  conteudo: "Cartas náuticas",
  tecnica: "Expositiva",
  instrutor: null,
  local: null,
};

/** Os `aria-label` das células da grade, na ordem do HTML. */
function rotulosDasCelulas(fatos: readonly FatoDaSemana[]): string[] {
  const semana = montarSemana({
    dias: DIAS,
    /* Relógio sem tempos: o regime existe, o horário não — `gradeDoPapel` não monta, e `GradeDsa` cai na numerada. */
    relogio: { tempos: [], temposDoRegime: 8, origem: "regime" },
    temposDeclarados: 8,
    fatos,
    feriados: [],
    marcas: new Map(),
    hoje: "2026-04-01",
    sabadoAberto: false,
  });
  const html = renderToStaticMarkup(
    createElement(GradeDsa, {
      semana,
      grade: null,
      nomesDasDisciplinas: new Map([["NAV-I", "Navegação I"]]),
      salaDaTurma: null,
    }),
  );
  return [...html.matchAll(/<td[^>]*\saria-label="([^"]*)"/g)].map((m) => m[1] ?? "");
}

describe("spec 029, D-6 · o rótulo acessível da célula na grade sem relógio", () => {
  it("⚠️ o Estudo Individual sem «O que é» é anunciado pelo subtipo", () => {
    const rotulos = rotulosDasCelulas([EI_SEM_DESCRICAO]);
    expect(
      rotulos.filter((r) => r.startsWith("Estudo Individual · ")),
      `nenhuma célula anuncia o subtipo; rótulos: ${rotulos.filter((r) => r.includes("não letiv")).join(" | ")}`,
    ).toHaveLength(1);
  });

  it("controle: a aula sai com nome, código e tópico — uma vez cada", () => {
    const rotulos = rotulosDasCelulas([AULA]);
    expect(
      rotulos.filter((r) => r.startsWith("Navegação I — NAV-I — Cartas náuticas · ")),
    ).toHaveLength(1);
    expect(rotulos.some((r) => r.includes("Expositiva"))).toBe(false);
  });
});

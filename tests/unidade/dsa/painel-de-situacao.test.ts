/**
 * O painel de situação **desenhado** — `RF-DSA-05`, `FR-018`, `P-3` (item 3 do comando de correções
 * do DSA, decisão de Bernardo Villas Boas de 08/10/2026: a situação vai para baixo da grade, e cada
 * disciplina abre em cascata as suas UEs).
 *
 * ⚠️ **A LEITURA SE PROVA AQUI; O CLIQUE SE PROVA NO NAVEGADOR.** Esta suíte desenha o componente com
 * a renderização de servidor do próprio React — o mesmo recurso de `tabela-densa-controlada.test.ts`,
 * sem navegador e sem biblioteca nova — e confere o que saiu. Abrir a linha por clique e por `Enter`
 * é `tests/e2e/dsa-situacao.spec.ts`.
 *
 * ⚠️ **OS MARCADORES CONFERIDOS AQUI SÃO OS QUE O PERCURSO PROCURA** (`data-disciplina`,
 * `ues-da-disciplina`, `data-unidade` e os quatro números no atributo). Sem esta suíte, um marcador
 * renomeado só apareceria na ponta a ponta, como *"element(s) not found"* — que se lê como "a
 * cascata não abre" e seria "a cascata mudou de nome".
 *
 * ⚠️ **OS NÚMEROS SÃO SINTÉTICOS**, escolhidos para cair um em cada degrau da UE.
 */
import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PainelDeSituacao,
  UnidadesDaDisciplina,
  type QuadroParaExibir,
  type UnidadeNoQuadro,
} from "@/app/(app)/turmas/[turma]/dsa/PainelDeSituacao";

const QUADROS: readonly QuadroParaExibir[] = [
  {
    disciplinaId: "dis-1",
    codigo: "I",
    nome: "Navegação",
    situacao: "conflitou",
    chPrevista: 40,
    chAcumulada: 13,
    chRestante: 27,
    percentual: 33,
    taLancadoAFrente: 2,
  },
  {
    disciplinaId: "dis-2",
    codigo: "II",
    nome: "Meteorologia",
    situacao: "aguardando_inicio",
    chPrevista: 30,
    chAcumulada: 0,
    chRestante: 30,
    percentual: 0,
    taLancadoAFrente: 0,
  },
];

/** ⚠️ FORA DE ORDEM DE PROPÓSITO: a cascata tem de mostrar a UE 1 antes da 2. */
const UNIDADES: readonly UnidadeNoQuadro[] = [
  {
    id: "ue-3",
    disciplinaId: "dis-1",
    numero: 3,
    topico: "Balizamento",
    prevista: 10,
    lancada: 13,
  },
  {
    id: "ue-1",
    disciplinaId: "dis-1",
    numero: 1,
    topico: "Navegação costeira",
    prevista: 20,
    lancada: 11,
  },
  { id: "ue-2", disciplinaId: "dis-1", numero: 2, topico: "Cartas", prevista: 8, lancada: 8 },
];

function painel(quadros = QUADROS, unidades = UNIDADES): string {
  return renderToStaticMarkup(
    createElement(PainelDeSituacao, {
      quadros,
      unidades,
      rotuloDaSemana: "06/04/2026 a 11/04/2026",
    }),
  );
}

function cascata(codigo: string, unidades: readonly UnidadeNoQuadro[]): string {
  return renderToStaticMarkup(createElement(UnidadesDaDisciplina, { codigo, unidades }));
}

/** A abertura da linha de uma UE — onde os quatro números vão no atributo. */
function linhaDaUnidade(marcacao: string, numero: number): string {
  return marcacao.match(new RegExp(`<tr[^>]*data-unidade="${numero}"[^>]*>`))?.[0] ?? "";
}

describe("`RF-DSA-05` · a situação por disciplina é a tabela ÚNICA, com a cascata FECHADA", () => {
  it("uma linha por disciplina, dentro de `tabela-densa` — não numa segunda tabela", () => {
    const html = painel();

    expect(html).toContain('data-slot="painel-de-situacao"');
    expect(html).toContain('data-slot="quadro-por-disciplina"');
    // ⚠️ O marcador do componente único: uma tabela escrita à mão aqui não o teria.
    expect(html).toContain('data-slot="tabela-densa"');
    expect(html).toContain('data-disciplina="I"');
    expect(html).toContain('data-disciplina="II"');
  });

  it("as duas linhas nascem expansíveis e FECHADAS — o estado é anunciado, não só desenhado", () => {
    const html = painel();

    expect(html.match(/aria-expanded="false"/g) ?? []).toHaveLength(2);
    expect(html).not.toContain('aria-expanded="true"');
    expect(html).not.toContain('data-slot="ues-da-disciplina"');
  });

  it("⚠️ o quadro «Por unidade de ensino» SEPARADO deixou de existir", () => {
    const html = painel();

    // Fechada, nenhuma UE aparece no painel: elas vivem só dentro da cascata.
    expect(html).not.toContain("data-unidade=");
    expect(html).not.toContain("Por unidade de ensino");
    expect(html).not.toContain('data-slot="quadro-por-unidade"');
  });

  it("a linha da disciplina continua dizendo situação, os números e o lançado à frente", () => {
    const html = painel();

    expect(html).toContain("Conflitou");
    expect(html).toContain("Aguardando início");
    expect(html).toContain("33 %");
    // ⚠️ O número do «à frente» vai no ATRIBUTO (`RNF-USA-05`), e só aparece onde há.
    expect(html.match(/data-slot="lancado-a-frente"/g) ?? []).toHaveLength(1);
    expect(html).toContain('data-ta="2"');
    // ⚠️ O corte é DITO (`RN-CRONOS-03`).
    expect(html).toContain("Carga horária acumulada até a semana de 06/04/2026 a 11/04/2026");
  });

  it("turma sem disciplina: o vazio é dito, e não há tabela", () => {
    const html = painel([], []);

    expect(html).toContain('data-slot="sem-disciplinas"');
    expect(html).not.toContain('data-slot="tabela-densa"');
  });
});

describe("`FR-018` · `P-3` · a cascata traz as UEs com os quatro números e a situação", () => {
  const html = cascata("I", UNIDADES);

  it("as UEs saem na ordem do currículo, UE 1 antes da 2 e da 3", () => {
    const onde = [1, 2, 3].map((n) => html.indexOf(`data-unidade="${n}"`));

    expect(onde.every((i) => i >= 0)).toBe(true);
    expect(onde).toEqual([...onde].sort((a, b) => a - b));
  });

  it("cada UE leva prevista, lançada, restante e situação NO ATRIBUTO", () => {
    const ue1 = linhaDaUnidade(html, 1);

    expect(ue1).toContain('data-prevista="20"');
    expect(ue1).toContain('data-lancada="11"');
    expect(ue1).toContain('data-restante="9"');
    expect(ue1).toContain('data-situacao="em_andamento"');
    expect(html).toContain("Navegação costeira");
  });

  it("os degraus da planilha aparecem com a palavra da tela — e o PASSOU não deixa restante negativo", () => {
    expect(linhaDaUnidade(html, 2)).toContain('data-situacao="concluida"');

    const ue3 = linhaDaUnidade(html, 3);
    expect(ue3).toContain('data-situacao="passou"');
    // ⚠️ 10 − 13 seria −3; o restante da cascata é o da disciplina: nunca negativo.
    expect(ue3).toContain('data-restante="0"');

    expect(html).toContain("Em andamento");
    expect(html).toContain("Concluída");
    expect(html).toContain("Passou da prevista");
  });

  it("⚠️ a cascata DIZ que o corte da UE é o mesmo da disciplina, e o que não entra nela", () => {
    expect(html).toContain("acumuladas até a mesma semana");
    expect(html).toContain("Avaliação e aula sem unidade de ensino contam só na disciplina");
  });

  it("disciplina sem UE cadastrada: a cascata diz, em vez de abrir em branco", () => {
    const vazia = cascata("II", []);

    expect(vazia).toContain('data-slot="sem-unidades"');
    expect(vazia).toContain('data-unidades-de="II"');
    expect(vazia).not.toContain("data-unidade=");
  });
});

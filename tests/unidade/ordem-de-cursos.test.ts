/**
 * Spec 022 (Bloco 7), FR-003 — a ordem única de cursos e turmas.
 *
 * > *"Ordem por CLASSIFICAÇÃO em cursos e turmas (listas, cartões, submenu): Regulares → Expeditos → Especiais →
 * > Estágios de Qualificação → Aperfeiçoamento Avançado → as demais; dentro, pela sigla; turmas pela ordem do curso e
 * > depois o ano."* — Bernardo Villas Boas, 22/10/2026
 */
import { describe, expect, it } from "vitest";

import { CLASSIFICACOES_DE_CURSO } from "@/lib/dominio/classificacoes-de-curso";
import {
  compararCursos,
  compararTurmas,
  emOrdemDeCurso,
  emOrdemDeTurma,
  ORDEM_DAS_CLASSIFICACOES,
} from "@/lib/dominio/ordem-de-cursos";

const curso = (codigo: string, classificacao: string) => ({ codigo, classificacao });

describe("ordem das classificações (A-4)", () => {
  it("Regulares → Expeditos → Especiais → Estágios de Qualificação → Aperfeiçoamento Avançado → as demais", () => {
    expect(ORDEM_DAS_CLASSIFICACOES).toEqual([
      "regular",
      "expedito",
      "especial",
      "estagio_qualificacao",
      "aperfeicoamento_avancado",
      "geral",
      "ead_semipresencial",
    ]);
  });

  it("a lista dos grupos de tela segue a mesma ordem (as cinco que são curso)", () => {
    expect([...CLASSIFICACOES_DE_CURSO]).toEqual(ORDEM_DAS_CLASSIFICACOES.slice(0, 5));
  });
});

describe("compararCursos", () => {
  it("classificação primeiro, depois a sigla", () => {
    const cursos = [
      curso("C-ApA-PCN-PR-EAD", "aperfeicoamento_avancado"),
      curso("EST-QF-APHID", "estagio_qualificacao"),
      curso("C-Esp-ME", "especial"),
      curso("C-Exp-BATI", "expedito"),
      curso("C-Ap-FR", "regular"),
    ];
    expect(emOrdemDeCurso(cursos).map((c) => c.codigo)).toEqual([
      "C-Ap-FR",
      "C-Exp-BATI",
      "C-Esp-ME",
      "EST-QF-APHID",
      "C-ApA-PCN-PR-EAD",
    ]);
  });

  it("dentro da classificação, a sigla lida sem os hífens (D-6: CAHO antes de C-Ap-FR)", () => {
    const cursos = [
      curso("C-Espc-HN", "regular"),
      curso("C-Ap-HN", "regular"),
      curso("CAHO", "regular"),
      curso("C-Ap-FR", "regular"),
      curso("C-Espc-FR", "regular"),
    ];
    expect(emOrdemDeCurso(cursos).map((c) => c.codigo)).toEqual([
      "CAHO",
      "C-Ap-FR",
      "C-Ap-HN",
      "C-Espc-FR",
      "C-Espc-HN",
    ]);
  });

  it("classificação desconhecida vai para o fim, pela sigla", () => {
    expect(compararCursos(curso("A", "outra"), curso("Z", "regular"))).toBeGreaterThan(0);
    expect(compararCursos(curso("A", "outra"), curso("B", "outra"))).toBeLessThan(0);
  });

  it("não altera a lista recebida", () => {
    const cursos = [curso("B", "expedito"), curso("A", "regular")];
    emOrdemDeCurso(cursos);
    expect(cursos.map((c) => c.codigo)).toEqual(["B", "A"]);
  });
});

describe("compararTurmas", () => {
  const turma = (codigo: string, cursoCodigo: string, cursoClassificacao: string, ano: number) => ({
    codigo,
    cursoCodigo,
    cursoClassificacao,
    ano,
  });

  it("a ordem do curso, depois o ano mais recente, depois o código", () => {
    const turmas = [
      turma("C-Exp-BATI T1 2026", "C-Exp-BATI", "expedito", 2026),
      turma("C-Ap-FR 2025", "C-Ap-FR", "regular", 2025),
      turma("C-Ap-FR 2026", "C-Ap-FR", "regular", 2026),
      turma("CAHO 2026", "CAHO", "regular", 2026),
      turma("C-Exp-BATI T2 2026", "C-Exp-BATI", "expedito", 2026),
      turma("C-Exp-BATI T10 2026", "C-Exp-BATI", "expedito", 2026),
    ];
    expect(emOrdemDeTurma(turmas).map((t) => t.codigo)).toEqual([
      "CAHO 2026",
      "C-Ap-FR 2026",
      "C-Ap-FR 2025",
      "C-Exp-BATI T1 2026",
      "C-Exp-BATI T2 2026",
      "C-Exp-BATI T10 2026",
    ]);
  });

  it("o curso manda antes do ano: uma turma antiga de Regular vem antes de uma nova de Expedito", () => {
    expect(
      compararTurmas(
        turma("C-Ap-FR 2020", "C-Ap-FR", "regular", 2020),
        turma("C-Exp-BATI T1 2026", "C-Exp-BATI", "expedito", 2026),
      ),
    ).toBeLessThan(0);
  });
});

/**
 * `FR-034` / `FR-035` · o rótulo e a ordem do seletor de turma.
 *
 * ⚠️ **O RÓTULO É O CÓDIGO E O STATUS, e não a `vw_turmas_rotulo`** (A-13, 17/09/2026). Aquela view
 * produz `"C-Ap-FR T2/2026"` e **devolve `NULL` em 18 de 28** — um seletor com 18 opções em branco.
 * O código nunca é nulo (28 de 28) e é **o mesmo identificador da URL**, o que torna o que se lê
 * igual ao que se compartilha.
 *
 * ⚠️ **AS QUATRO SITUAÇÕES ENTRAM, SEM PRÉ-FILTRO** (A-14). A v2.0 pré-filtrava por "Ativa"; aqui o
 * status é manual e está **incoerente em 11 de 28**, e a pré-seleção já veta `concluida` e
 * `cancelada` (`FR-006.1`). Esconder turma por um campo incoerente esconderia turma de verdade.
 *
 * ⚠️ **QUEM ORDENA É QUEM CHAMA** (`FR-033`): o componente exibe. Esta função é a ordem, e ela vive
 * em `lib/dominio/` para poder ser exercitada sem tela.
 *
 * Origem: `FR-034`, `FR-035` da spec 009, `SC-004`.
 */
import { describe, expect, it } from "vitest";

import {
  ordenarTurmasParaSeletor,
  ROTULO_DO_STATUS_DE_TURMA,
  rotuloDaTurma,
  type TurmaNoSeletor,
} from "@/lib/dominio/seletor-de-turma";

const t = (
  codigo: string,
  ano: number,
  dataInicio: string | null,
  status = "planejada",
): TurmaNoSeletor => ({ codigo, ano, dataInicio, status });

describe("`FR-034` · o rótulo existe para toda turma", () => {
  it("é `código · Status`", () => {
    expect(rotuloDaTurma(t("C-ApA-PCN-PR-EAD T2 2026", 2026, "2026-08-03", "ativa"))).toBe(
      "C-ApA-PCN-PR-EAD T2 2026 · Ativa",
    );
  });

  it("⚠️ as turmas SEM rótulo `T1`/`T2` também têm rótulo — o código nunca é nulo", () => {
    // São 18 de 28 na base. É por elas que a `vw_turmas_rotulo` foi recusada (D-3).
    expect(rotuloDaTurma(t("C-Ap-HN 2026", 2026, "2026-04-06", "ativa"))).toBe(
      "C-Ap-HN 2026 · Ativa",
    );
  });

  it("as quatro situações têm nome de tela, e nenhuma sai em `snake_case`", () => {
    for (const status of ["planejada", "ativa", "concluida", "cancelada"]) {
      const rotulo = rotuloDaTurma(t("X 2026", 2026, null, status));
      expect(rotulo, status).not.toContain("_");
      expect(rotulo.endsWith(ROTULO_DO_STATUS_DE_TURMA[status] as string), status).toBe(true);
    }
  });

  it("⚠️ status desconhecido não apaga o rótulo — ele degrada para o valor bruto", () => {
    // Um domínio novo no banco não pode produzir opção em branco no seletor (`RN-DEG-01`).
    const rotulo = rotuloDaTurma(t("X 2026", 2026, null, "arquivada"));
    expect(rotulo).toContain("X 2026");
    expect(rotulo.length).toBeGreaterThan("X 2026".length);
  });

  it("⚠️ nenhum rótulo sai vazio, nem com código vazio", () => {
    expect(rotuloDaTurma(t("", 2026, null, "ativa")).trim().length).toBeGreaterThan(0);
  });
});

describe("`FR-035` · a ordem: ano ↓, início ↓, sem data por último, código", () => {
  it("ano letivo decrescente manda primeiro", () => {
    const ordenadas = ordenarTurmasParaSeletor([
      t("A 2025", 2025, "2025-02-02"),
      t("B 2027", 2027, "2027-02-02"),
      t("C 2026", 2026, "2026-02-02"),
    ]);
    expect(ordenadas.map((x) => x.codigo)).toEqual(["B 2027", "C 2026", "A 2025"]);
  });

  it("dentro do ano, início decrescente", () => {
    const ordenadas = ordenarTurmasParaSeletor([
      t("T1 2026", 2026, "2026-02-02"),
      t("T2 2026", 2026, "2026-08-03"),
    ]);
    expect(ordenadas.map((x) => x.codigo)).toEqual(["T2 2026", "T1 2026"]);
  });

  it("⚠️ sem data de início vai por ÚLTIMO dentro do ano — nunca primeiro", () => {
    // Tratar ausência como "menor que tudo" a jogaria para o topo numa ordem decrescente, e a
    // turma sem janela abriria a lista.
    const ordenadas = ordenarTurmasParaSeletor([
      t("SEM 2026", 2026, null),
      t("COM 2026", 2026, "2026-02-02"),
    ]);
    expect(ordenadas.map((x) => x.codigo)).toEqual(["COM 2026", "SEM 2026"]);
  });

  it("em empate de ano e início, o código desempata — a ordem é reprodutível", () => {
    const ordenadas = ordenarTurmasParaSeletor([
      t("Z 2026", 2026, "2026-02-02"),
      t("A 2026", 2026, "2026-02-02"),
    ]);
    expect(ordenadas.map((x) => x.codigo)).toEqual(["A 2026", "Z 2026"]);
  });

  it("⚠️ as QUATRO situações entram — nenhum pré-filtro por status", () => {
    const ordenadas = ordenarTurmasParaSeletor([
      t("P 2026", 2026, "2026-01-01", "planejada"),
      t("A 2026", 2026, "2026-02-01", "ativa"),
      t("C 2026", 2026, "2026-03-01", "concluida"),
      t("X 2026", 2026, "2026-04-01", "cancelada"),
    ]);
    expect(ordenadas).toHaveLength(4);
    expect(new Set(ordenadas.map((x) => x.status))).toEqual(
      new Set(["planejada", "ativa", "concluida", "cancelada"]),
    );
  });

  it("⚠️ ela não altera a lista recebida — ordenar não é efeito colateral", () => {
    const original = [t("A 2025", 2025, "2025-01-01"), t("B 2027", 2027, "2027-01-01")];
    const copia = [...original];
    ordenarTurmasParaSeletor(original);
    expect(original).toEqual(copia);
  });

  it("lista vazia devolve lista vazia, e não estoura", () => {
    expect(ordenarTurmasParaSeletor([])).toEqual([]);
  });
});

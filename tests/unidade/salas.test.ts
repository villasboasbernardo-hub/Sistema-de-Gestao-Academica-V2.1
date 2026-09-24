/**
 * `FR-029.1` / `FR-029.4` · a natureza da sala vem do metadado, nunca do nome.
 *
 * ⚠️ **COMPARAR COM `'Moodle'` FUNCIONA HOJE E QUEBRA NA SEGUNDA SALA VIRTUAL** — e quebra em
 * silêncio, porque a sala continua na lista e só a natureza sai errada. É o `SC-014.2`.
 *
 * Retrato da base, medido em 16/09/2026: `Sala 04` → **5** turmas, `Moodle` → **6**,
 * `Laboratório de Informática` → **9**.
 */
import { describe, expect, it } from "vitest";

import {
  naturezaDaSala,
  ROTULO_DA_NATUREZA,
  salasParaEscolher,
  turmasQueUsam,
  type Sala,
} from "@/lib/dominio/salas";

const sala = (valor: string, virtual: boolean, ativo = true): Sala => ({
  valor,
  ativo,
  metadados: { ambiente_virtual: virtual },
});

describe("`SC-014.2` · a natureza vem de `metadados.ambiente_virtual`", () => {
  it("virtual quando o metadado diz que sim", () => {
    expect(naturezaDaSala(sala("Moodle", true))).toBe("virtual");
  });

  it("física quando o metadado diz que não", () => {
    expect(naturezaDaSala(sala("Sala 04", false))).toBe("fisica");
  });

  it("⚠️ o NOME não decide: uma 'Sala 99' virtual é virtual, e um 'Moodle' físico é físico", () => {
    // É o caso que separa a leitura do metadado de um `includes("Moodle")`.
    expect(naturezaDaSala(sala("Sala 99", true))).toBe("virtual");
    expect(naturezaDaSala(sala("Moodle", false))).toBe("fisica");
  });

  it("metadado ausente ou malformado degrada para física, e não estoura", () => {
    expect(naturezaDaSala({ valor: "X", ativo: true, metadados: null })).toBe("fisica");
    expect(naturezaDaSala({ valor: "X", ativo: true, metadados: "texto" })).toBe("fisica");
    expect(naturezaDaSala({ valor: "X", ativo: true, metadados: {} })).toBe("fisica");
  });

  it("as duas naturezas têm rótulo de tela", () => {
    expect(ROTULO_DA_NATUREZA.fisica).toBe("Física");
    expect(ROTULO_DA_NATUREZA.virtual).toBe("Ambiente virtual");
  });
});

describe("`FR-029.4` · o que o formulário de turma oferece", () => {
  const LISTA = [
    sala("Sala 01", false),
    sala("Sala 04", false, false),
    sala("Moodle", true),
    sala("Auditório", false),
  ];

  it("só as ativas, em ordem de nome", () => {
    expect(salasParaEscolher(LISTA, null).map((s) => s.valor)).toEqual([
      "Auditório",
      "Moodle",
      "Sala 01",
    ]);
  });

  it("⚠️ a sala ATUAL da turma aparece mesmo desativada — senão a edição a apagaria", () => {
    expect(salasParaEscolher(LISTA, "Sala 04").map((s) => s.valor)).toContain("Sala 04");
  });

  it("a atual já ativa não aparece duas vezes", () => {
    const escolhiveis = salasParaEscolher(LISTA, "Sala 01").map((s) => s.valor);
    expect(escolhiveis.filter((v) => v === "Sala 01")).toHaveLength(1);
  });

  it("turma sem sala não puxa nenhuma desativada", () => {
    expect(salasParaEscolher(LISTA, null).map((s) => s.valor)).not.toContain("Sala 04");
  });
});

describe("`FR-029.4` · as turmas que usam uma sala", () => {
  const TURMAS = [
    { codigo: "A 2026", sala: "Sala 04" },
    { codigo: "B 2026", sala: "Sala 04" },
    { codigo: "C 2026", sala: "Moodle" },
    { codigo: "D 2026", sala: null },
  ];

  it("lista só as que a referenciam", () => {
    expect(turmasQueUsam(TURMAS, "Sala 04")).toEqual(["A 2026", "B 2026"]);
    expect(turmasQueUsam(TURMAS, "Moodle")).toEqual(["C 2026"]);
  });

  it("sala sem uso devolve lista vazia — e é o que faz o diálogo não abrir", () => {
    expect(turmasQueUsam(TURMAS, "Sala 09")).toEqual([]);
  });

  it("⚠️ turma sem sala não conta para sala nenhuma", () => {
    expect(turmasQueUsam(TURMAS, "")).toEqual([]);
  });
});

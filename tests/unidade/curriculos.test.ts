/**
 * RC-3 e RC-12 (Bernardo Villas Boas, 21/10/2026) — a vigência do currículo e o nome dele na tela.
 *
 * ⚠️ A regra é a MESMA de `app.curriculo_vigente` (migration `20261021030049`): entre os ativos e não arquivados, o de
 *    maior `vigente_de` ≤ a data; sem nenhum, o primeiro. Os casos abaixo são os do pgTAP `144`, lidos do lado da tela.
 */
import { describe, expect, it } from "vitest";

import {
  curriculoVigenteEm,
  rotuloDoCurriculo,
  situacaoDoCurriculo,
  type CurriculoParaVigencia,
} from "@/lib/dominio/curriculos";

const c = (versao: number, vigente_de: string, extra: Partial<CurriculoParaVigencia> = {}) => ({
  versao,
  vigente_de,
  status: "ativo",
  arquivado_em: null,
  ...extra,
});

const UM = c(1, "2026-01-01");
const DOIS = c(2, "2027-01-01");
const TRES = c(3, "2028-01-01");

describe("curriculoVigenteEm — o de maior início ≤ a data (RC-3)", () => {
  it("com um currículo, ele é o vigente em qualquer data — inclusive antes do início (é o padrão de turma)", () => {
    expect(curriculoVigenteEm([UM], "2026-10-21")).toBe(UM);
    expect(curriculoVigenteEm([UM], "2020-05-01")).toBe(UM);
  });

  it("o futuro não é o vigente antes de começar; no dia do início, é", () => {
    expect(curriculoVigenteEm([DOIS, UM], "2026-12-31")).toBe(UM);
    expect(curriculoVigenteEm([DOIS, UM], "2027-01-01")).toBe(DOIS);
  });

  it("a ordem de chegada não decide", () => {
    expect(curriculoVigenteEm([TRES, UM, DOIS], "2027-06-01")).toBe(DOIS);
  });

  it("o inativo (exclusão lógica) e o arquivado (RC-10) não contam", () => {
    const inativo = c(2, "2027-01-01", { status: "inativo" });
    expect(curriculoVigenteEm([UM, inativo], "2027-06-01")).toBe(UM);
    const umArquivado = c(1, "2026-01-01", { arquivado_em: "2027-02-01T00:00:00Z" });
    expect(curriculoVigenteEm([umArquivado, DOIS], "2026-06-01")).toBe(DOIS);
  });

  it("sem currículo candidato, nenhum", () => {
    expect(curriculoVigenteEm([], "2026-10-21")).toBeNull();
  });
});

describe("situacaoDoCurriculo — vigente, futuro ou passado, derivada da data (RC-3)", () => {
  const todos = [UM, DOIS, TRES];
  it("hoje em 2027: o 1 é passado, o 2 é vigente, o 3 é futuro", () => {
    expect(situacaoDoCurriculo(UM, todos, "2027-06-01")).toBe("passado");
    expect(situacaoDoCurriculo(DOIS, todos, "2027-06-01")).toBe("vigente");
    expect(situacaoDoCurriculo(TRES, todos, "2027-06-01")).toBe("futuro");
  });

  it("todos começando depois de hoje: nenhum é vigente — todos são futuros", () => {
    expect(situacaoDoCurriculo(DOIS, [DOIS, TRES], "2026-06-01")).toBe("futuro");
  });

  it("nada amarrado a ano: a mesma lista, outro hoje, outro veredito", () => {
    expect(situacaoDoCurriculo(TRES, todos, "2030-01-01")).toBe("vigente");
    expect(situacaoDoCurriculo(DOIS, todos, "2030-01-01")).toBe("passado");
  });
});

describe("rotuloDoCurriculo — «Currículo N (vigência AAAA)» (RC-12)", () => {
  it("o número e o ano de início, sem a palavra «versão»", () => {
    expect(rotuloDoCurriculo(UM)).toBe("Currículo 1 (vigência 2026)");
    expect(rotuloDoCurriculo(DOIS)).not.toMatch(/vers[ãa]o/i);
  });
});

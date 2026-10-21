/**
 * RC-3 e RC-12 (Bernardo Villas Boas, 21/10/2026) — a vigência do currículo e o nome dele na tela.
 *
 * ⚠️ A regra é a MESMA de `app.curriculo_vigente` (migration `20261021030049`): entre os ativos e não arquivados, o de
 *    maior `vigente_de` ≤ a data; sem nenhum, o primeiro. Os casos abaixo são os do pgTAP `144`, lidos do lado da tela.
 */
import { describe, expect, it } from "vitest";

import {
  curriculoDaPagina,
  curriculosParaTurma,
  curriculoVigenteEm,
  impedimentoDoArquivamento,
  impedimentoDoDescarte,
  opcoesDoSeletor,
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

describe("opcoesDoSeletor — vigente, futuro e passados; o arquivado só quando se pede (RC-8, RC-10)", () => {
  const arquivado = c(1, "2026-01-01", { arquivado_em: "2028-02-01T00:00:00Z" });
  it("do mais novo ao mais antigo, cada um com a situação", () => {
    expect(
      opcoesDoSeletor([UM, DOIS, TRES], "2027-06-01", false).map((o) => [
        o.curriculo.versao,
        o.situacao,
      ]),
    ).toEqual([
      [3, "futuro"],
      [2, "vigente"],
      [1, "passado"],
    ]);
  });
  it("o arquivado sai do seletor e volta com «mostrar arquivados»", () => {
    expect(
      opcoesDoSeletor([arquivado, DOIS], "2027-06-01", false).map((o) => o.curriculo.versao),
    ).toEqual([2]);
    expect(opcoesDoSeletor([arquivado, DOIS], "2027-06-01", true).map((o) => o.situacao)).toEqual([
      "vigente",
      "arquivado",
    ]);
  });
});

describe("curriculoDaPagina — o pedido da URL, ou o vigente (RC-8)", () => {
  it("vazio: o vigente hoje", () => {
    expect(curriculoDaPagina([UM, DOIS], "", "2027-06-01").curriculo).toBe(DOIS);
  });
  it("pelo número, inclusive um passado", () => {
    expect(curriculoDaPagina([UM, DOIS], "1", "2027-06-01")).toEqual({
      curriculo: UM,
      aviso: null,
    });
  });
  it("o número que não existe degrada para o vigente, COM aviso", () => {
    const r = curriculoDaPagina([UM, DOIS], "9", "2027-06-01");
    expect(r.curriculo).toBe(DOIS);
    expect(r.aviso).toContain("Currículo 9");
  });
});

describe("curriculosParaTurma — vigente ou futuro, e o padrão pela data de início (RC-4)", () => {
  it("o padrão é o vigente na data de início: a turma de 2027 nasce no 2", () => {
    const r = curriculosParaTurma([UM, DOIS], "2027-03-01", "2026-10-21");
    expect(r.padrao).toBe(DOIS);
    expect(r.opcoes.map((o) => o.curriculo.versao)).toEqual([2, 1]);
  });
  it("o passado não é oferecido — a não ser que seja o padrão pela data", () => {
    expect(
      curriculosParaTurma([UM, DOIS, TRES], "2028-03-01", "2027-06-01").opcoes.map(
        (o) => o.curriculo.versao,
      ),
    ).toEqual([3, 2]);
    const antiga = curriculosParaTurma([UM, DOIS], "2026-05-01", "2027-06-01");
    expect(antiga.padrao).toBe(UM);
    expect(antiga.opcoes.map((o) => o.curriculo.versao)).toEqual([2, 1]);
  });
});

describe("impedimentoDoArquivamento — só o passado com todas as turmas arquivadas (RC-10)", () => {
  it("o vigente e o futuro não se arquivam", () => {
    expect(impedimentoDoArquivamento(DOIS, [UM, DOIS, TRES], "2027-06-01", [])).toBe(
      "nao_e_passado",
    );
    expect(impedimentoDoArquivamento(TRES, [UM, DOIS, TRES], "2027-06-01", [])).toBe(
      "nao_e_passado",
    );
  });
  it("o passado com turma não arquivada também não; com todas arquivadas, sim", () => {
    expect(impedimentoDoArquivamento(UM, [UM, DOIS], "2027-06-01", [{ arquivada: false }])).toBe(
      "turma_nao_arquivada",
    );
    expect(
      impedimentoDoArquivamento(UM, [UM, DOIS], "2027-06-01", [{ arquivada: true }]),
    ).toBeNull();
  });
});

describe("impedimentoDoDescarte — o currículo criado por engano sai por exclusão lógica (D-19, D-36)", () => {
  it("o futuro que nenhuma turma segue se descarta", () => {
    expect(impedimentoDoDescarte(DOIS, [UM, DOIS], "2026-10-21", 0)).toBeNull();
  });
  it("o vigente não se descarta — o curso ficaria sem currículo para a turma nova", () => {
    expect(impedimentoDoDescarte(UM, [UM, DOIS], "2026-10-21", 0)).toBe("vigente");
  });
  it("o que uma turma segue não se descarta (o banco recusa: `versao_em_uso`)", () => {
    expect(impedimentoDoDescarte(DOIS, [UM, DOIS], "2026-10-21", 1)).toBe("com_turma");
  });
});

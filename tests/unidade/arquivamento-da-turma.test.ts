/** D-COR-5 — o estado do arquivamento, quem arquiva e desarquiva, o aviso e a frase (spec 017, FR-004). */
import { describe, expect, it } from "vitest";

import {
  AVISO_DE_NAO_CONCLUIDA,
  avisoAoArquivar,
  estadoDoArquivamento,
  fraseDaTurmaArquivada,
  idsArquivados,
  podeArquivar,
  podeDesarquivar,
  RECURSO_DO_ARQUIVAMENTO,
  semAsArquivadas,
} from "@/lib/dominio/arquivamento-da-turma";

describe("estadoDoArquivamento — o último evento manda", () => {
  it("sem evento, não arquivada", () => {
    expect(estadoDoArquivamento([])).toEqual({ arquivada: false });
  });
  it("arquivar → arquivada, com quando, quem e a observação", () => {
    expect(
      estadoDoArquivamento([
        {
          ordem: 1,
          acao: "arquivar",
          criadoEm: "2026-10-19T14:00:00Z",
          autor: "CT Fulano",
          observacao: "Encerrada",
        },
      ]),
    ).toEqual({
      arquivada: true,
      em: "2026-10-19T14:00:00Z",
      por: "CT Fulano",
      observacao: "Encerrada",
    });
  });
  it("arquivar e depois desarquivar → não arquivada, em qualquer ordem de chegada", () => {
    expect(
      estadoDoArquivamento([
        {
          ordem: 2,
          acao: "desarquivar",
          criadoEm: "2026-10-20T10:00:00Z",
          autor: null,
          observacao: null,
        },
        {
          ordem: 1,
          acao: "arquivar",
          criadoEm: "2026-10-19T14:00:00Z",
          autor: null,
          observacao: null,
        },
      ]).arquivada,
    ).toBe(false);
  });
});

describe("quem pode — o trio da Administração Acadêmica (ajuste de 19/10/2026; muda a C-3 e a C-4)", () => {
  it("o recurso da matriz é um só, para arquivar e para desarquivar", () => {
    expect(RECURSO_DO_ARQUIVAMENTO).toBe("arquivamento_de_turma");
  });
  it("arquiva quem tem o recurso, se a turma não está arquivada", () => {
    expect(podeArquivar({ podeArquivarTurmas: true, arquivada: false })).toBe(true);
    expect(podeArquivar({ podeArquivarTurmas: true, arquivada: true })).toBe(false);
  });
  it("⚠️ o caso que discrimina: quem edita a turma SEM o recurso (o Operador) não arquiva mais", () => {
    expect(podeArquivar({ podeArquivarTurmas: false, arquivada: false })).toBe(false);
  });
  it("⚠️ o caso que discrimina: desarquiva quem tem o recurso — não só o Admin —, e só a arquivada", () => {
    expect(podeDesarquivar({ podeArquivarTurmas: true, arquivada: true })).toBe(true);
    expect(podeDesarquivar({ podeArquivarTurmas: false, arquivada: true })).toBe(false);
    expect(podeDesarquivar({ podeArquivarTurmas: true, arquivada: false })).toBe(false);
  });
});

describe("o aviso e a frase", () => {
  it("⚠️ arquivar turma que não está concluída avisa antes (D-COR-5: qualquer estado, com aviso)", () => {
    expect(avisoAoArquivar("ativa")).toBe(AVISO_DE_NAO_CONCLUIDA);
    expect(avisoAoArquivar("cancelada")).toBe(AVISO_DE_NAO_CONCLUIDA);
    expect(avisoAoArquivar("concluida")).toBeNull();
  });
  it("a frase da ficha: data em DD/MM/AAAA, quem e o somente leitura", () => {
    expect(fraseDaTurmaArquivada({ em: "2026-10-19T14:00:00Z", por: "CT Fulano" })).toBe(
      "Turma arquivada em 19/10/2026 por CT Fulano — somente leitura. Desarquivam o Admin, o Encarregado e o Ajudante da Administração Acadêmica.",
    );
  });
  it("sem autor conhecido, não inventa nome", () => {
    expect(fraseDaTurmaArquivada({ em: "2026-10-19T14:00:00Z", por: null })).toBe(
      "Turma arquivada em 19/10/2026 — somente leitura. Desarquivam o Admin, o Encarregado e o Ajudante da Administração Acadêmica.",
    );
  });
});

describe("as listas escondem a arquivada (C-24)", () => {
  it("tira só a arquivada, e sem arquivada nenhuma devolve a lista inteira", () => {
    const turmas = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const arquivadas = idsArquivados([{ turma_id: "b" }, { turma_id: null }]);
    expect(semAsArquivadas(turmas, arquivadas, (t) => t.id).map((t) => t.id)).toEqual(["a", "c"]);
    expect(semAsArquivadas(turmas, idsArquivados(null), (t) => t.id)).toHaveLength(3);
  });
});

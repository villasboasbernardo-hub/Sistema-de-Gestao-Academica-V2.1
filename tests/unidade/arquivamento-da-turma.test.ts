/** D-COR-5 — o estado do arquivamento, quem arquiva e desarquiva, o aviso e a frase (spec 017, FR-004). */
import { describe, expect, it } from "vitest";

import {
  AVISO_DE_NAO_CONCLUIDA,
  avisoAoArquivar,
  estadoDoArquivamento,
  fraseDaTurmaArquivada,
  podeArquivar,
  podeDesarquivar,
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

describe("quem pode (D-COR-5)", () => {
  it("arquiva quem pode editar a turma, se ela não está arquivada", () => {
    expect(podeArquivar({ podeEditarTurma: true, arquivada: false })).toBe(true);
    expect(podeArquivar({ podeEditarTurma: false, arquivada: false })).toBe(false);
    expect(podeArquivar({ podeEditarTurma: true, arquivada: true })).toBe(false);
  });
  it("⚠️ desarquiva SÓ o Admin, e só a arquivada", () => {
    expect(podeDesarquivar({ perfil: "admin", arquivada: true })).toBe(true);
    expect(
      podeDesarquivar({ perfil: "encarregado_administracao_academica", arquivada: true }),
    ).toBe(false);
    expect(podeDesarquivar({ perfil: "admin", arquivada: false })).toBe(false);
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
      "Turma arquivada em 19/10/2026 por CT Fulano — somente leitura. Só o Administrador desarquiva.",
    );
  });
  it("sem autor conhecido, não inventa nome", () => {
    expect(fraseDaTurmaArquivada({ em: "2026-10-19T14:00:00Z", por: null })).toBe(
      "Turma arquivada em 19/10/2026 — somente leitura. Só o Administrador desarquiva.",
    );
  });
});

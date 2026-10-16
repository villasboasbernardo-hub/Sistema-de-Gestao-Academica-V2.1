/**
 * `RN-AV-12` — a SESSÃO DE APLICAÇÃO no DSA (spec 014, emenda de 15/10/2026; desenho aprovado por Bernardo Villas Boas
 * em 16/10/2026, opção A).
 *
 * > *"…qualquer prova com a MESMA descrição em dias consecutivos ou próximos (mesma disciplina, mesmo COD) é UMA
 * > prova com N sessões de aplicação, não N provas. O card "N de M" conta 1."*
 *
 * ⚠️ **OS CASOS QUE DISCRIMINAM** (DoD 8): o número mínimo é 2 (a 1ª sessão é a própria avaliação — com o molde da
 *    vista, `maior + 1` sobre uma lista vazia daria 1, e o `CHECK numero >= 2` recusaria); a prova aplicada DEPOIS do
 *    dia não é oferecida (a sessão não vem antes da 1ª aplicação); e a recusa do servidor separa turma, prova morta,
 *    prova sem aplicação e data anterior, cada uma com a sua frase.
 */
import { describe, expect, it } from "vitest";

import {
  numeroDaProximaSessao,
  provasParaSessaoNoDia,
  recusaDaSessaoDeAplicacao,
  rotuloDaSessaoDeAplicacao,
} from "@/lib/dominio/dsa/sessao-de-aplicacao";

describe("`RN-AV-12` · o número da sessão", () => {
  it("a primeira sessão da tabela é a 2 — a 1ª é a própria avaliação", () => {
    expect(numeroDaProximaSessao([])).toBe(2);
  });

  it("é a seguinte à maior ATIVA", () => {
    expect(numeroDaProximaSessao([2, 3])).toBe(4);
    expect(numeroDaProximaSessao([3])).toBe(4);
  });

  it("a sessão excluída libera o número (só as ativas chegam aqui, como na vista)", () => {
    expect(numeroDaProximaSessao([2])).toBe(3);
  });
});

describe("`RN-AV-12` · as provas oferecidas no dia", () => {
  const PROVAS = [
    { id: "p1", disciplinaId: "d1", aplicadaEm: "2026-04-07", sessoesDeAplicacao: [] },
    { id: "p2", disciplinaId: "d1", aplicadaEm: "2026-04-09", sessoesDeAplicacao: [2] },
    { id: "p3", disciplinaId: "d1", aplicadaEm: "2026-04-10", sessoesDeAplicacao: [] },
    { id: "p4", disciplinaId: "d2", aplicadaEm: "2026-04-06", sessoesDeAplicacao: [] },
    { id: "p5", disciplinaId: "d1", aplicadaEm: null, sessoesDeAplicacao: [] },
  ] as const;

  it("só as da disciplina, aplicadas no dia OU ANTES, com a sessão que abririam", () => {
    const oferecidas = provasParaSessaoNoDia(PROVAS, { disciplinaId: "d1", dia: "2026-04-09" });
    expect(oferecidas.map((p) => [p.id, p.proximaSessao])).toEqual([
      ["p1", 2],
      ["p2", 3],
    ]);
  });

  it("a prova aplicada DEPOIS do dia não é oferecida — a sessão nunca vem antes da 1ª aplicação", () => {
    const ids = provasParaSessaoNoDia(PROVAS, { disciplinaId: "d1", dia: "2026-04-08" }).map(
      (p) => p.id,
    );
    expect(ids).toEqual(["p1"]);
  });

  it("a prova sem data de aplicação fica fora (não há 1ª sessão de onde continuar)", () => {
    const ids = provasParaSessaoNoDia(PROVAS, { disciplinaId: "d1", dia: "2026-12-31" }).map(
      (p) => p.id,
    );
    expect(ids).not.toContain("p5");
  });
});

describe("`RN-AV-12` · a recusa do servidor", () => {
  const VIVA = { turmaId: "t1", status: "pendente", dataAvaliacao: "2026-04-07" };

  it("prova desta turma, viva, aplicada antes: grava", () => {
    expect(recusaDaSessaoDeAplicacao({ prova: VIVA, turmaId: "t1", dia: "2026-04-09" })).toBeNull();
  });

  it("no MESMO dia da 1ª aplicação também grava (o gatilho aceita `data >= data_avaliacao`)", () => {
    expect(recusaDaSessaoDeAplicacao({ prova: VIVA, turmaId: "t1", dia: "2026-04-07" })).toBeNull();
  });

  it("antes da 1ª aplicação: recusa, com a data da aplicação por extenso", () => {
    expect(recusaDaSessaoDeAplicacao({ prova: VIVA, turmaId: "t1", dia: "2026-04-06" })).toBe(
      "A sessão de aplicação não pode ser antes da 1ª aplicação da prova (07/04/2026).",
    );
  });

  it("prova de OUTRA turma: recusa — o endpoint não confia na tela", () => {
    expect(recusaDaSessaoDeAplicacao({ prova: VIVA, turmaId: "t2", dia: "2026-04-09" })).toBe(
      "Esta prova não é desta turma.",
    );
  });

  it("prova cancelada ou substituída: recusa", () => {
    for (const status of ["cancelada", "substituida_planilha"]) {
      expect(
        recusaDaSessaoDeAplicacao({ prova: { ...VIVA, status }, turmaId: "t1", dia: "2026-04-09" }),
        status,
      ).toMatch(/cancelada ou substituída/);
    }
  });

  it("toda situação VIVA aceita (a lista positiva de `STATUS_DE_AVALIACAO_VIVA`)", () => {
    for (const status of ["pendente", "em_andamento", "concluida", "atrasada"]) {
      expect(
        recusaDaSessaoDeAplicacao({ prova: { ...VIVA, status }, turmaId: "t1", dia: "2026-04-09" }),
        status,
      ).toBeNull();
    }
  });

  it("prova sem 1ª aplicação, ou que não se lê: recusa com a frase de cada caso", () => {
    expect(
      recusaDaSessaoDeAplicacao({
        prova: { ...VIVA, dataAvaliacao: null },
        turmaId: "t1",
        dia: "2026-04-09",
      }),
    ).toMatch(/ainda não tem a 1ª aplicação/);
    expect(recusaDaSessaoDeAplicacao({ prova: null, turmaId: "t1", dia: "2026-04-09" })).toMatch(
      /Não encontrei esta prova/,
    );
  });
});

describe("`RN-AV-12` · o rótulo da sessão na grade e no papel", () => {
  it("o da prova, com a marca da sessão — «PP 1 · sessão 2»", () => {
    expect(rotuloDaSessaoDeAplicacao({ prova: "PP 1", numero: 2 })).toBe("PP 1 · sessão 2");
  });

  it("ausência nunca vira texto: sem prova, «Sessão 2 da prova»; sem número, o rótulo da prova", () => {
    expect(rotuloDaSessaoDeAplicacao({ prova: "  ", numero: 2 })).toBe("Sessão 2 da prova");
    expect(rotuloDaSessaoDeAplicacao({ prova: null, numero: 3 })).toBe("Sessão 3 da prova");
    expect(rotuloDaSessaoDeAplicacao({ prova: "PE 1", numero: null })).toBe("PE 1");
    expect(rotuloDaSessaoDeAplicacao({ prova: undefined, numero: undefined })).toBe(
      "Sessão de aplicação",
    );
  });
});

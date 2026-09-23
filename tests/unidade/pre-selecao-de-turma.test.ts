/**
 * `FR-006.1` · qual turma a página do curso abre quando `?turma=` não veio.
 *
 * ⚠️ **A DECISÃO É PELA JANELA, NÃO PELO STATUS** (Q-28, 16/09/2026). O status é manual e livre, e
 * pode ficar desatualizado **por desenho**; a janela é fato. O status entra **só como veto**:
 * `concluida` e `cancelada` nunca são pré-selecionadas.
 *
 * ⚠️ **HOJE É ARGUMENTO, NUNCA RELÓGIO LIDO AQUI DENTRO** (`FR-043`). Uma função que lesse o relógio
 * mudaria de veredito à meia-noite, e o teste que passasse hoje reprovaria amanhã sem nenhuma
 * mudança de código.
 *
 * Origem: `FR-006.1` da spec 009, `SC-003.1`.
 */
import { describe, expect, it } from "vitest";

import { preSelecionarTurma, type TurmaParaSelecao } from "@/lib/dominio/pre-selecao-de-turma";

const HOJE = "2026-09-23";

const turma = (
  codigo: string,
  dataInicio: string | null,
  dataTermino: string | null,
  status: TurmaParaSelecao["status"] = "planejada",
): TurmaParaSelecao => ({ codigo, dataInicio, dataTermino, status });

describe("`FR-006.1` · a janela decide", () => {
  it("1. a turma cuja janela contém hoje ganha", () => {
    const escolhida = preSelecionarTurma(
      [
        turma("T1", "2026-02-02", "2026-06-30"),
        turma("T2", "2026-08-03", "2026-12-11", "ativa"),
        turma("T3", "2027-02-01", "2027-06-30"),
      ],
      HOJE,
    );
    expect(escolhida).toBe("T2");
  });

  it("2. sem janela que contenha hoje, ganha o início mais PRÓXIMO no futuro", () => {
    const escolhida = preSelecionarTurma(
      [
        turma("T1", "2027-06-01", "2027-12-01"),
        turma("T2", "2026-11-03", "2027-03-11"),
        turma("T3", "2028-01-01", "2028-06-01"),
      ],
      HOJE,
    );
    expect(escolhida).toBe("T2");
  });

  it("⚠️ passado que já terminou NÃO é escolhido — a regra olha para a frente", () => {
    const escolhida = preSelecionarTurma(
      [turma("T1", "2025-02-02", "2025-06-30"), turma("T2", "2024-02-02", "2024-06-30")],
      HOJE,
    );
    expect(escolhida).toBeNull();
  });

  it("3. em empate de janelas que contêm hoje, ganha o início mais RECENTE", () => {
    const escolhida = preSelecionarTurma(
      [
        turma("T1", "2026-01-05", "2026-12-20", "ativa"),
        turma("T2", "2026-08-03", "2026-12-11", "ativa"),
      ],
      HOJE,
    );
    expect(escolhida).toBe("T2");
  });

  it("4. `concluida` e `cancelada` nunca são pré-selecionadas, mesmo contendo hoje", () => {
    /*
     * ⚠️ O VETO SE MEDE COM MAIS DE UMA TURMA, e isso não é detalhe do teste: o próprio `FR-006.1`
     * diz que "curso com uma única turma abre nela, sem seletor — sem seletor não há outra escolha".
     * A regra da turma única **sobrepõe** o veto, de propósito. Medir o veto numa lista de um é
     * medir a exceção achando que se mede a regra.
     */
    for (const vetado of ["concluida", "cancelada"]) {
      const escolhida = preSelecionarTurma(
        [
          turma("T1", "2026-08-03", "2026-12-11", vetado),
          turma("T2", "2024-01-01", "2024-06-30", "concluida"),
        ],
        HOJE,
      );
      expect(escolhida, vetado).toBeNull();
    }
  });

  it("⚠️ e o veto não elimina o curso: sobrando outra, é ela que abre", () => {
    const escolhida = preSelecionarTurma(
      [
        turma("T1", "2026-08-03", "2026-12-11", "cancelada"),
        turma("T2", "2026-09-01", "2026-11-30", "ativa"),
      ],
      HOJE,
    );
    expect(escolhida).toBe("T2");
  });

  it("5. nenhuma sobrando, a página abre sem seleção", () => {
    expect(preSelecionarTurma([], HOJE)).toBeNull();
    expect(
      preSelecionarTurma(
        [turma("T1", null, null, "cancelada"), turma("T2", null, null, "cancelada")],
        HOJE,
      ),
    ).toBeNull();
  });
});

describe("⚠️ curso de UMA turma abre nela — sem seletor não há outra escolha", () => {
  it("abre nela mesmo concluída, e mesmo sem janela", () => {
    expect(preSelecionarTurma([turma("T1", "2020-01-01", "2020-06-01", "concluida")], HOJE)).toBe(
      "T1",
    );
    expect(preSelecionarTurma([turma("T1", null, null, "cancelada")], HOJE)).toBe("T1");
  });
});

describe("janela aberta numa ponta", () => {
  it("⚠️ sem término, a turma que já começou CONTÉM hoje", () => {
    // É a mesma leitura de `app.lancamentos_que_travam_vigencia()`, nesta fatia: janela sem término
    // é janela ainda aberta. Ler a ausência como "não contém" faria a página abrir sem turma num
    // curso em andamento.
    expect(preSelecionarTurma([turma("T1", "2026-02-02", null, "ativa")], HOJE)).toBe("T1");
  });

  it("sem início, ela contém hoje enquanto o término não passou", () => {
    expect(preSelecionarTurma([turma("T1", null, "2026-12-11", "ativa")], HOJE)).toBe("T1");
  });

  it("turma sem janela nenhuma não é escolhida quando há outra com janela", () => {
    const escolhida = preSelecionarTurma(
      [turma("T1", null, null, "planejada"), turma("T2", "2026-08-03", "2026-12-11", "ativa")],
      HOJE,
    );
    expect(escolhida).toBe("T2");
  });
});

describe("`SC-003.1` · o retrato dos 4 cursos com seletor, medido em 16/09/2026", () => {
  /*
   * ⚠️ A REGRA POR STATUS DA v2.0 PRÉ-SELECIONARIA **0 DE 4**; esta pré-seleciona **3**. É a
   * divergência D-15, e é o que estes casos guardam: uma implementação que voltasse a olhar o status
   * passaria em quase tudo acima e reprovaria aqui.
   */
  it("os três cursos de duas turmas abrem na `T2`", () => {
    for (const sigla of ["C-ApA-AuxNav-PR-SP", "C-ApA-PCN-PR-EAD", "C-ApA-PrevMe-PR-EAD"]) {
      const escolhida = preSelecionarTurma(
        [
          turma(`${sigla} T1 2026`, "2026-02-02", "2026-06-30", "concluida"),
          turma(`${sigla} T2 2026`, "2026-08-03", "2026-12-11", "planejada"),
        ],
        HOJE,
      );
      expect(escolhida, sigla).toBe(`${sigla} T2 2026`);
    }
  });

  it("`C-ApA-OcOp-PR-SP`, com as duas canceladas, abre sem seleção", () => {
    const escolhida = preSelecionarTurma(
      [
        turma("C-ApA-OcOp-PR-SP T1 2026", "2026-02-02", "2026-06-30", "cancelada"),
        turma("C-ApA-OcOp-PR-SP T2 2026", "2026-08-03", "2026-12-11", "cancelada"),
      ],
      HOJE,
    );
    expect(escolhida).toBeNull();
  });
});

describe("⚠️ hoje é argumento — o veredito muda com a data, e não com o relógio", () => {
  it("a mesma lista dá turmas diferentes em datas diferentes", () => {
    const lista = [
      turma("T1", "2026-02-02", "2026-06-30", "ativa"),
      turma("T2", "2026-08-03", "2026-12-11", "ativa"),
    ];
    expect(preSelecionarTurma(lista, "2026-03-15")).toBe("T1");
    expect(preSelecionarTurma(lista, "2026-09-23")).toBe("T2");
    expect(preSelecionarTurma(lista, "2027-01-01")).toBeNull();
  });
});

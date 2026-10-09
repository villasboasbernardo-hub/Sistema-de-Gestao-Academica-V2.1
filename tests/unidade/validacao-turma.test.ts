/**
 * `FR-025` / `FR-025.2` · a validação de entrada da turma.
 *
 * ⚠️ **NÃO HÁ CAMPO DE CÓDIGO** (`FR-025.1`): ele é gerado pelo gatilho, e o banco recusa valor
 * divergente. Um campo aqui convidaria alguém a digitá-lo — e o `SC-007` cobra a ausência.
 */
import { describe, expect, it } from "vitest";

import { esquemaDeTurma } from "@/lib/validacao/turma";

const TURMA = {
  ano_letivo: 2026,
  status: "planejada",
  modalidade: "presencial",
  turma: "T1",
  data_inicio: "2026-02-02",
  data_termino: "2026-06-30",
  sala_alocada: "Sala 01",
  alunos: 20,
};

const parse = (p: Record<string, unknown> = {}) => esquemaDeTurma.safeParse({ ...TURMA, ...p });
const erro = (r: ReturnType<typeof parse>) => (r.success ? "" : (r.error.issues[0]?.message ?? ""));

describe("`FR-015` · os obrigatórios da turma, sem padrão", () => {
  it("a completa passa", () => {
    expect(parse().success).toBe(true);
  });

  it("⚠️ ano, status e modalidade AUSENTES são recusados — nenhum vira padrão", () => {
    expect(parse({ ano_letivo: undefined }).success).toBe(false);
    expect(parse({ status: undefined }).success).toBe(false);
    expect(parse({ modalidade: undefined }).success).toBe(false);
    expect(erro(parse({ modalidade: undefined }))).toContain("Modalidade");
  });

  it("status aceita as quatro situações, e só elas", () => {
    for (const s of ["planejada", "ativa", "concluida", "cancelada"]) {
      expect(parse({ status: s }).success, s).toBe(true);
    }
    expect(parse({ status: "arquivada" }).success).toBe(false);
  });
});

describe("`FR-025.2` · o rótulo é vazio ou `T<n>`", () => {
  it("aceita `T1`, `T2` e `T10`", () => {
    for (const r of ["T1", "T2", "T10"]) expect(parse({ turma: r }).success, r).toBe(true);
  });

  it("⚠️ vazio é ausência legítima, e vira NULO — turma única não tem rótulo", () => {
    const r = parse({ turma: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.turma).toBeNull();
  });

  it("recusa forma fora do padrão, com a mensagem que ensina", () => {
    for (const r of ["1", "Turma 1", "T", "t1", "T1a"]) {
      expect(parse({ turma: r }).success, r).toBe(false);
    }
    expect(erro(parse({ turma: "Turma 1" }))).toContain("T seguido do número");
  });
});

describe("`FR-027` · a janela é opcional, e coerente quando vem inteira", () => {
  it("as duas pontas podem faltar", () => {
    const r = parse({ data_inicio: "", data_termino: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.data_inicio).toBeNull();
      expect(r.data.data_termino).toBeNull();
    }
  });

  it("término antes do início é recusado", () => {
    const r = parse({ data_inicio: "2026-06-30", data_termino: "2026-02-02" });
    expect(r.success).toBe(false);
    expect(erro(r)).toContain("anterior à data de início");
  });

  it("⚠️ mesma data nas duas pontas é aceita — turma de um dia existe", () => {
    expect(parse({ data_inicio: "2026-02-02", data_termino: "2026-02-02" }).success).toBe(true);
  });

  it("uma ponta só não dispara a incoerência", () => {
    expect(parse({ data_termino: "" }).success).toBe(true);
    expect(parse({ data_inicio: "" }).success).toBe(true);
  });
});

describe("os opcionais", () => {
  it("sala e efetivo podem faltar, e viram nulo", () => {
    const r = parse({ sala_alocada: "", alunos: undefined });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sala_alocada).toBeNull();
      expect(r.data.alunos).toBeNull();
    }
  });

  it("⚠️ efetivo ZERO é valor informado, não ausência", () => {
    const r = parse({ alunos: 0 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.alunos).toBe(0);
  });

  it("efetivo negativo é recusado", () => {
    expect(parse({ alunos: -1 }).success).toBe(false);
  });
});

describe("⚠️ `SC-007` · não há campo de código, e ele não entra nem se vier no corpo", () => {
  it("o esquema descarta `codigo`", () => {
    const r = parse({ codigo: "C-Ap-FR T9 2026" });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).not.toContain("codigo");
  });

  it("e descarta carga horária, como todo esquema desta fatia (`FR-045`)", () => {
    const r = parse({ carga_horaria_total: 999 });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).not.toContain("carga_horaria_total");
  });
});

/*
 * ⚠️ **`D-DSA-2` · A ETAPA PRESENCIAL DA TURMA SEMIPRESENCIAL** (item 6 das correções de 08/10/2026,
 * decisão de Bernardo Villas Boas). As três frases são as do `CHECK turmas_etapa_presencial_coerente`
 * repetidas no esquema, para a recusa chegar em português e não como `23514`; o irmão está no `121`.
 */
describe("`D-DSA-2` · a etapa presencial: as duas pontas ou nenhuma, dentro do período", () => {
  const SEMI = {
    modalidade: "semipresencial",
    data_inicio: "2026-03-02",
    data_termino: "2026-11-30",
  };

  it("semipresencial com a etapa inteira e dentro do período passa, e grava as duas", () => {
    const r = parse({
      ...SEMI,
      inicio_etapa_presencial: "2026-05-04",
      termino_etapa_presencial: "2026-05-29",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.inicio_etapa_presencial).toBe("2026-05-04");
      expect(r.data.termino_etapa_presencial).toBe("2026-05-29");
    }
  });

  it("sem etapa passa — é o estado «não cadastrada», que o DSA avisa sem bloquear", () => {
    expect(parse(SEMI).success).toBe(true);
  });

  it("uma ponta só é recusada", () => {
    expect(erro(parse({ ...SEMI, inicio_etapa_presencial: "2026-05-04" }))).toBe(
      "Informe o início e o término da etapa presencial, ou deixe os dois vazios.",
    );
  });

  it("término antes do início é recusado", () => {
    expect(
      erro(
        parse({
          ...SEMI,
          inicio_etapa_presencial: "2026-05-29",
          termino_etapa_presencial: "2026-05-04",
        }),
      ),
    ).toBe("O término da etapa presencial não pode ser anterior ao início.");
  });

  it("etapa fora do período da turma é recusada", () => {
    expect(
      erro(
        parse({
          ...SEMI,
          inicio_etapa_presencial: "2026-02-01",
          termino_etapa_presencial: "2026-05-29",
        }),
      ),
    ).toBe("A etapa presencial precisa caber dentro do período da turma.");
  });

  it("⚠️ fora de semipresencial a etapa é DESCARTADA — dado sem efeito escondido seria segunda verdade", () => {
    const r = parse({
      modalidade: "presencial",
      inicio_etapa_presencial: "2026-05-04",
      termino_etapa_presencial: "2026-05-29",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.inicio_etapa_presencial).toBeNull();
      expect(r.data.termino_etapa_presencial).toBeNull();
    }
  });
});

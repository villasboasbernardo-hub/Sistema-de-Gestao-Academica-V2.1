/**
 * `FR-025` / `FR-025.2` · a validação de entrada da turma.
 *
 * ⚠️ **NÃO HÁ CAMPO DE CÓDIGO** (`FR-025.1`): ele é gerado pelo gatilho, e o banco recusa valor
 * divergente. Um campo aqui convidaria alguém a digitá-lo — e o `SC-007` cobra a ausência.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaSituacaoNaEdicao,
  esquemaDaTrocaDeSituacao,
  esquemaDeEdicaoDaTurma,
  esquemaDeTurma,
  esquemaDoArquivamento,
  esquemaDoDesarquivamento,
} from "@/lib/validacao/turma";

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

/*
 * ⚠️ **A SITUAÇÃO SE TROCA POR UM CAMINHO SÓ desde 17/10/2026** (spec 016, FR-015.4; NQ-2, Bernardo
 *    Villas Boas): na **criação** o campo continua; na **edição** ele sai, e quem troca é o botão
 *    *"Trocar situação"*, com a ação e o esquema próprios. É o diálogo que o Bloco 2 vai estender com a
 *    observação (D-COR-4).
 */
describe("`FR-015.4` da spec 016 · a situação tem um caminho só", () => {
  const SEM_STATUS = Object.fromEntries(
    Object.entries(TURMA).filter(([campo]) => campo !== "status"),
  );

  it("a CRIAÇÃO continua exigindo a situação", () => {
    expect(esquemaDeTurma.safeParse(SEM_STATUS).success).toBe(false);
    expect(esquemaDeTurma.safeParse(TURMA).success).toBe(true);
  });

  it("a EDIÇÃO passa sem a situação, e não a deixa entrar nem se vier no corpo", () => {
    const sem = esquemaDeEdicaoDaTurma.safeParse(SEM_STATUS);
    expect(sem.success).toBe(true);
    const com = esquemaDeEdicaoDaTurma.safeParse({ ...TURMA, status: "cancelada" });
    expect(com.success).toBe(true);
    if (com.success) expect("status" in com.data, "a edição deixou a situação entrar").toBe(false);
  });

  it("a EDIÇÃO mantém as regras da janela e da etapa presencial", () => {
    expect(
      esquemaDeEdicaoDaTurma.safeParse({
        ...SEM_STATUS,
        data_inicio: "2026-06-30",
        data_termino: "2026-02-02",
      }).success,
    ).toBe(false);
    expect(
      esquemaDeEdicaoDaTurma.safeParse({
        ...SEM_STATUS,
        modalidade: "semipresencial",
        inicio_etapa_presencial: "2026-03-01",
      }).success,
    ).toBe(false);
  });

  it("D-COR-4 · a troca leva a observação: opcional, em branco vira nula, até 500", () => {
    const com = esquemaDaTrocaDeSituacao.safeParse({
      codigo: "C-Ap-FR 2026",
      status: "cancelada",
      observacao: "  Turma sem alunos  ",
    });
    expect(com.success && com.data.observacao).toBe("Turma sem alunos");
    const sem = esquemaDaTrocaDeSituacao.safeParse({
      codigo: "C-Ap-FR 2026",
      status: "ativa",
      observacao: "   ",
    });
    expect(sem.success && sem.data.observacao).toBeNull();
    expect(
      esquemaDaTrocaDeSituacao.safeParse({
        codigo: "C-Ap-FR 2026",
        status: "ativa",
        observacao: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("D-COR-5 · arquivar leva o código e a observação opcional; desarquivar, só o código", () => {
    const r = esquemaDoArquivamento.safeParse({ codigo: "C-Ap-FR 2026", observacao: "" });
    expect(r.success && r.data.observacao).toBeNull();
    expect(esquemaDoArquivamento.safeParse({ codigo: " ", observacao: null }).success).toBe(false);
    expect(esquemaDoDesarquivamento.safeParse({ codigo: "C-Ap-FR 2026" }).success).toBe(true);
  });

  it("a TROCA aceita o código e uma das quatro situações — e só isso entra", () => {
    for (const s of ["planejada", "ativa", "concluida", "cancelada"]) {
      expect(
        esquemaDaTrocaDeSituacao.safeParse({ codigo: "C-Ap-FR 2026", status: s }).success,
        s,
      ).toBe(true);
    }
    expect(
      esquemaDaTrocaDeSituacao.safeParse({ codigo: "C-Ap-FR 2026", status: "arquivada" }).success,
    ).toBe(false);
    expect(esquemaDaTrocaDeSituacao.safeParse({ codigo: "  ", status: "ativa" }).success).toBe(
      false,
    );
    const r = esquemaDaTrocaDeSituacao.safeParse({
      codigo: "C-Ap-FR 2026",
      status: "ativa",
      alunos: 99,
      data_termino: "2026-01-01",
    });
    expect(r.success).toBe(true);
    // REGRA DOS VALORES ESPERADOS: (a), spec 017 (D-COR-4, 19/10/2026) — a observação da troca entra; o resto não.
    if (r.success) expect(Object.keys(r.data).sort()).toEqual(["codigo", "observacao", "status"]);
  });
});

/*
 * ⚠️ **SPEC 025 (Bloco 10, D-2): A SITUAÇÃO VOLTOU A *EDITAR TURMA*, À PARTE DOS CAMPOS** (RT-3: *"um único Editar edita
 *    tudo"*). O esquema dos campos continua descartando `status` (acima); quem lê a situação e a observação da troca é
 *    `esquemaDaSituacaoNaEdicao`, e a ação a grava pela função do banco que anota o histórico.
 */
describe("D-2 da spec 025 · a situação dentro de Editar turma", () => {
  it("lê a situação e a observação, que é opcional e em branco vira nula", () => {
    const r = esquemaDaSituacaoNaEdicao.safeParse({
      ...TURMA,
      status: "cancelada",
      observacao_da_situacao: "  sem alunos  ",
    });
    expect(r.success && r.data).toEqual({
      status: "cancelada",
      observacao_da_situacao: "sem alunos",
    });
    const branco = esquemaDaSituacaoNaEdicao.safeParse({
      status: "ativa",
      observacao_da_situacao: " ",
    });
    expect(branco.success && branco.data.observacao_da_situacao).toBeNull();
  });

  it("sem a situação no corpo, não há troca", () => {
    const r = esquemaDaSituacaoNaEdicao.safeParse({ ...TURMA, status: undefined });
    expect(r.success && r.data.status).toBeUndefined();
  });

  it("situação fora do domínio e observação longa demais são recusadas", () => {
    expect(esquemaDaSituacaoNaEdicao.safeParse({ status: "arquivada" }).success).toBe(false);
    expect(
      esquemaDaSituacaoNaEdicao.safeParse({
        status: "ativa",
        observacao_da_situacao: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

/**
 * Bloco 18 (spec 033, RA-5 e RA-6; FR-004.1 e FR-005.2) — o Zod da marcação à mão e da APOINST planejada: as mesmas
 * réguas do banco (`marcacoes_de_atividade`, `apoinst_planejadas`), com as frases da tela.
 *
 * Os casos que discriminam (DoD 8): o alvo é UM só (nem os dois, nem nenhum — `marcacoes_de_atividade_um_alvo`); a data
 * da marcação nunca no futuro, pelo «hoje» de São Paulo; o *Desfazer* não leva data; o fim da APOINST não antes do início;
 * e a edição NÃO leva turma (o banco recusa trocar, `apoinst_de_outra_turma`).
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaEdicaoDaApoinst,
  esquemaDaNovaApoinst,
  esquemaDaSituacaoDaApoinst,
} from "@/lib/validacao/apoinst";
import { esquemaDaMarcacao } from "@/lib/validacao/marcacao-de-atividade";

const HOJE = "2048-06-15";
const TURMA = "13700000-0000-4000-8000-000000000001";
const PREVISTA = "13700000-0000-4000-8000-000000000002";
const APOINST = "13700000-0000-4000-8000-000000000003";
const DISCIPLINA = "13700000-0000-4000-8000-000000000004";
const INSTRUTOR = "13700000-0000-4000-8000-000000000005";

const JUSTIFICATIVA = "Cumprida fora do DSA, conferida na pasta do curso.";

const marcacao = {
  turmaId: TURMA,
  atividadePrevistaId: PREVISTA,
  apoinstId: null,
  situacao: "cumprida",
  dataRealizada: "2048-06-10",
  justificativa: JUSTIFICATIVA,
};

type Resultado = { success: true } | { success: false; error: { issues: { message: string }[] } };
const mensagem = (r: Resultado) => (r.success ? null : (r.error.issues[0]?.message ?? null));

describe("esquemaDaMarcacao (RA-5, FR-005.2)", () => {
  it("aceita registrar o cumprimento da AEC prevista, com a data e a justificativa aparada", () => {
    const r = esquemaDaMarcacao(HOJE).safeParse({
      ...marcacao,
      justificativa: `  ${JUSTIFICATIVA}  `,
    });
    expect(r.success && r.data).toEqual({
      turmaId: TURMA,
      atividadePrevistaId: PREVISTA,
      apoinstId: null,
      situacao: "cumprida",
      dataRealizada: "2048-06-10",
      justificativa: JUSTIFICATIVA,
    });
  });

  it("aceita a APOINST como alvo (a «Concluída à mão» da RA-6) e a data vazia vira nula", () => {
    const r = esquemaDaMarcacao(HOJE).safeParse({
      ...marcacao,
      atividadePrevistaId: "",
      apoinstId: APOINST,
      dataRealizada: "",
    });
    expect(r.success && r.data).toMatchObject({
      atividadePrevistaId: null,
      apoinstId: APOINST,
      dataRealizada: null,
    });
  });

  it.each([
    ["os dois", { atividadePrevistaId: PREVISTA, apoinstId: APOINST }],
    ["nenhum", { atividadePrevistaId: null, apoinstId: undefined }],
  ])("⚠️ recusa o alvo com %s (um alvo só, como o CHECK do banco)", (_, alvo) => {
    expect(mensagem(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, ...alvo }))).toMatch(
      /AEC prevista ou uma APOINST/,
    );
  });

  it("⚠️ recusa a data de amanhã — o que se marca já aconteceu — e aceita a de hoje", () => {
    expect(
      mensagem(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, dataRealizada: "2048-06-16" })),
    ).toMatch(/futuro/);
    expect(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, dataRealizada: HOJE }).success).toBe(
      true,
    );
  });

  it("⚠️ o «Desfazer» (a_cumprir) não leva data, mesmo que venha uma", () => {
    const r = esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, situacao: "a_cumprir" });
    expect(r.success && r.data.dataRealizada).toBeNull();
  });

  it.each([
    ["9 caracteres", "123456789", /ao menos 10/],
    ["só espaços", "             ", /ao menos 10/],
    ["1.001 caracteres", "x".repeat(1001), /1\.000/],
  ])("recusa a justificativa com %s (a régua do banco: 10 a 1.000)", (_, justificativa, frase) => {
    expect(mensagem(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, justificativa }))).toMatch(
      frase,
    );
  });

  it("aceita a justificativa de exatamente 10 e de 1.000 caracteres", () => {
    for (const justificativa of ["1234567890", "x".repeat(1000)]) {
      expect(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, justificativa }).success).toBe(true);
    }
  });

  it("recusa situação fora das duas e turma que não é uuid", () => {
    expect(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, situacao: "concluida" }).success).toBe(
      false,
    );
    expect(
      mensagem(esquemaDaMarcacao(HOJE).safeParse({ ...marcacao, turmaId: "C-Ap-FR 2048" })),
    ).toMatch(/turma/);
  });
});

const nova = {
  turmaId: TURMA,
  nome: "  Prática de sondagem  ",
  disciplinaId: DISCIPLINA,
  instrutorId: INSTRUTOR,
  inicioPrevisto: "2048-03-02",
  fimPrevisto: "2048-03-20",
  taPrevistos: "12",
  observacao: "  ",
};

describe("esquemaDaNovaApoinst (RA-6, FR-004.1)", () => {
  it("aceita a APOINST válida: nome aparado, TA do campo de texto viram número, observação em branco vira nula", () => {
    const r = esquemaDaNovaApoinst.safeParse(nova);
    expect(r.success && r.data).toEqual({
      turmaId: TURMA,
      nome: "Prática de sondagem",
      disciplinaId: DISCIPLINA,
      instrutorId: INSTRUTOR,
      inicioPrevisto: "2048-03-02",
      fimPrevisto: "2048-03-20",
      taPrevistos: 12,
      observacao: null,
    });
  });

  it("aceita o período de um dia só (fim = início)", () => {
    expect(
      esquemaDaNovaApoinst.safeParse({ ...nova, fimPrevisto: nova.inicioPrevisto }).success,
    ).toBe(true);
  });

  it("⚠️ recusa o fim antes do início (o CHECK apoinst_periodo_valido), com a frase no campo do fim", () => {
    const r = esquemaDaNovaApoinst.safeParse({ ...nova, fimPrevisto: "2048-03-01" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["fimPrevisto"]);
      expect(r.error.issues[0]?.message).toMatch(/fim previsto/);
    }
  });

  it.each(["0", "-1", "1.5", "1000", ""])(
    "recusa TA previstos = %s (inteiro de 1 a 999)",
    (taPrevistos) => {
      expect(esquemaDaNovaApoinst.safeParse({ ...nova, taPrevistos }).success).toBe(false);
    },
  );

  it.each([
    ["sem nome", { nome: "   " }, /nome/],
    ["sem disciplina", { disciplinaId: "" }, /disciplina/],
    ["sem instrutor", { instrutorId: "" }, /instrutor/],
    ["sem turma", { turmaId: "" }, /turma/],
    ["sem início", { inicioPrevisto: "" }, /início/],
    ["nome com 201 caracteres", { nome: "x".repeat(201) }, /200/],
    ["observação com 1.001 caracteres", { observacao: "x".repeat(1001) }, /1000/],
  ])("recusa %s, com a frase da tela", (_, campo, frase) => {
    expect(mensagem(esquemaDaNovaApoinst.safeParse({ ...nova, ...campo }))).toMatch(frase);
  });
});

describe("esquemaDaEdicaoDaApoinst e esquemaDaSituacaoDaApoinst", () => {
  const semTurma = {
    nome: nova.nome,
    disciplinaId: nova.disciplinaId,
    instrutorId: nova.instrutorId,
    inicioPrevisto: nova.inicioPrevisto,
    fimPrevisto: nova.fimPrevisto,
    taPrevistos: nova.taPrevistos,
    observacao: nova.observacao,
  };

  it("⚠️ a edição não leva turma: o que chega como turma é descartado, e o id da APOINST é obrigatório", () => {
    const r = esquemaDaEdicaoDaApoinst.safeParse({ ...semTurma, id: APOINST, turmaId: TURMA });
    expect(r.success).toBe(true);
    expect(r.success && "turmaId" in r.data).toBe(false);
    expect(esquemaDaEdicaoDaApoinst.safeParse(semTurma).success).toBe(false);
  });

  it("a edição confere o período como a criação", () => {
    expect(
      esquemaDaEdicaoDaApoinst.safeParse({ ...semTurma, id: APOINST, fimPrevisto: "2048-01-01" })
        .success,
    ).toBe(false);
  });

  it("desativar e reativar: só o id da APOINST", () => {
    expect(esquemaDaSituacaoDaApoinst.safeParse({ id: APOINST }).success).toBe(true);
    expect(esquemaDaSituacaoDaApoinst.safeParse({ id: "APO-000001" }).success).toBe(false);
  });
});

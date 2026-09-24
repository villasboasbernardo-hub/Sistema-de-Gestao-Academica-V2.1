/**
 * `FR-013` / `FR-015` / `FR-015.1` · a validação de entrada do cadastro de curso.
 *
 * ⚠️ **BRANCO É AUSÊNCIA.** `trim` antes de `min(1)`: um nome com três espaços parece preenchido em
 * toda listagem e não diz nada a ninguém.
 *
 * ⚠️ **NENHUM VALOR-PADRÃO SILENCIOSO** (`FR-015.1`): *"valor gravado que ninguém escolheu é
 * indistinguível de escolha real — é pior que nulo"*. O nulo o quadro de avisos detecta; o padrão
 * silencioso some para sempre. Um curso EAD que virasse `presencial` por padrão **jamais** apareceria
 * num aviso. É por isso que **modalidade não tem padrão** no esquema.
 *
 * ⚠️ **O REGIME `padrao` É OBRIGATÓRIO NA CRIAÇÃO** (`FR-019.5`): curso e vigência só existem juntos, e
 * o banco recusa no `COMMIT` quem tentar separá-los. O esquema recusa antes, e diz o que falta.
 *
 * Origem: `FR-013`, `FR-015`, `FR-015.1`, `FR-019.5` da spec 009, `SC-001.4`.
 */
import { describe, expect, it } from "vitest";

import { esquemaDeCriacaoDeCurso, esquemaDeEdicaoDeCurso } from "@/lib/validacao/curso";

const REGIME = {
  regime_tempos: 8,
  ta_duracao_min: 45,
  intervalo_manha_min: 10,
  intervalo_tarde_min: 10,
  hora_inicio_manha: "07:30",
  hora_inicio_tarde: "13:30",
  vigente_de: "2026-01-01",
};

const CURSO = {
  codigo: "C-Ap-XX",
  nome_curso: "Curso de Aperfeiçoamento Experimental",
  classificacao: "regular",
  modalidade: "presencial",
  duracao_dias: 120,
};

const criar = (p: Record<string, unknown> = {}) =>
  esquemaDeCriacaoDeCurso.safeParse({ ...CURSO, regime: REGIME, ...p });

const editar = (p: Record<string, unknown> = {}) =>
  esquemaDeEdicaoDeCurso.safeParse({ ...CURSO, ...p });

const erro = (r: ReturnType<typeof criar>) => (r.success ? "" : (r.error.issues[0]?.message ?? ""));

describe("`FR-015` · os obrigatórios do curso", () => {
  it("o completo passa", () => {
    expect(criar().success).toBe(true);
  });

  it.each([
    ["codigo", "Sigla"],
    ["nome_curso", "Nome"],
    ["classificacao", "Classificação"],
    ["modalidade", "Modalidade"],
  ])("`%s` vazio é recusado, e a mensagem diz qual campo falta", (campo, palavra) => {
    const r = criar({ [campo]: "" });
    expect(r.success).toBe(false);
    expect(erro(r)).toContain(palavra);
  });

  it("⚠️ só espaços é recusado igual ao vazio — branco é ausência", () => {
    expect(criar({ codigo: "   " }).success).toBe(false);
    expect(criar({ nome_curso: "  " }).success).toBe(false);
  });

  it("duração em dias é obrigatória e positiva", () => {
    expect(criar({ duracao_dias: undefined }).success).toBe(false);
    expect(criar({ duracao_dias: 0 }).success).toBe(false);
    expect(criar({ duracao_dias: -1 }).success).toBe(false);
    expect(criar({ duracao_dias: 1 }).success).toBe(true);
  });

  it("classificação só aceita as cinco do Glossário", () => {
    for (const c of [
      "regular",
      "expedito",
      "especial",
      "aperfeicoamento_avancado",
      "estagio_qualificacao",
    ]) {
      expect(criar({ classificacao: c }).success, c).toBe(true);
    }
    expect(criar({ classificacao: "geral" }).success).toBe(false);
    expect(criar({ classificacao: "ead_semipresencial" }).success).toBe(false);
  });

  it("modalidade só aceita as três do banco", () => {
    for (const m of ["presencial", "ead", "semipresencial"]) {
      expect(criar({ modalidade: m }).success, m).toBe(true);
    }
    expect(criar({ modalidade: "hibrido" }).success).toBe(false);
  });
});

describe("`FR-015.1` · nenhum padrão silencioso", () => {
  it("⚠️ modalidade AUSENTE é recusada — não vira `presencial`", () => {
    const r = criar({ modalidade: undefined });
    expect(r.success).toBe(false);
    expect(erro(r)).toContain("Modalidade");
  });

  it("⚠️ classificação AUSENTE é recusada — não vira `regular`", () => {
    expect(criar({ classificacao: undefined }).success).toBe(false);
  });

  it("⚠️ o LIMITE é a exceção declarada: ausente vira NULO, e o banco aplica a regra", () => {
    // Ele não é padrão silencioso — é regra declarada (`FR-003.2`), aplicada pela classificação, à
    // vista e editável. Mandar um número inventado daqui é que seria o defeito.
    const r = criar({ limite_turmas_ano: undefined });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limite_turmas_ano).toBeNull();
  });

  it("limite informado é aceito, e precisa ser positivo", () => {
    const r = criar({ limite_turmas_ano: 3 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.limite_turmas_ano).toBe(3);
    expect(criar({ limite_turmas_ano: 0 }).success).toBe(false);
  });
});

describe("os opcionais continuam opcionais — é para isso que o aviso existe", () => {
  it("duração em semanas e propósito podem faltar", () => {
    const r = criar({ duracao_semanas: undefined, proposito: undefined });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duracao_semanas).toBeNull();
      expect(r.data.proposito).toBeNull();
    }
  });

  it("⚠️ propósito só com espaços vira NULO, e não texto em branco gravado", () => {
    const r = criar({ proposito: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.proposito).toBeNull();
  });
});

describe("`FR-019.5` · o regime `padrao` é obrigatório na CRIAÇÃO", () => {
  it("sem regime, a criação é recusada", () => {
    const r = esquemaDeCriacaoDeCurso.safeParse({ ...CURSO });
    expect(r.success).toBe(false);
    expect(erro(r).toLowerCase()).toContain("regime");
  });

  it("os parâmetros do regime são conferidos", () => {
    expect(criar({ regime: { ...REGIME, regime_tempos: 0 } }).success).toBe(false);
    expect(criar({ regime: { ...REGIME, regime_tempos: 13 } }).success).toBe(false);
    expect(criar({ regime: { ...REGIME, ta_duracao_min: 40 } }).success).toBe(false);
    expect(criar({ regime: { ...REGIME, vigente_de: "" } }).success).toBe(false);
  });

  it("⚠️ a EDIÇÃO não leva regime — vigência se registra noutro lugar (`FR-013.1`)", () => {
    expect(editar().success).toBe(true);
    const r = esquemaDeEdicaoDeCurso.safeParse({ ...CURSO, regime: REGIME });
    expect(r.success, "o esquema de edição aceitou regime").toBe(true);
    if (r.success) {
      expect(Object.keys(r.data), "o regime passou pela edição e chegaria ao banco").not.toContain(
        "regime",
      );
    }
  });

  it("⚠️ a edição NUNCA manda `status` — situação tem ação própria (`FR-017`)", () => {
    const r = esquemaDeEdicaoDeCurso.safeParse({ ...CURSO, status: "inativo" });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).not.toContain("status");
  });
});

describe("⚠️ nenhum campo de carga horária entra por aqui (`FR-045`)", () => {
  it("chave desconhecida é descartada, e não chega à escrita", () => {
    const r = criar({ carga_horaria_total: 999, cht: 100 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(Object.keys(r.data)).not.toContain("carga_horaria_total");
      expect(Object.keys(r.data)).not.toContain("cht");
    }
  });
});

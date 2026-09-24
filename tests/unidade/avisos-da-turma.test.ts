/**
 * `FR-028.1` / `FR-028.4` · os avisos da turma — **lista aberta**, nenhum bloqueia gravação.
 *
 * ⚠️ **AS DUAS INCOERÊNCIAS SÃO ESTRITAS: O DIA DE HOJE NÃO CONTA.** Uma turma que termina hoje não
 * está atrasada, e uma que começa hoje não está pendente. Usar `<=` avisaria o dia inteiro da data
 * marcada, e o aviso que aparece no dia certo é o aviso que ninguém leva a sério.
 *
 * ⚠️ **DATA VAZIA NÃO DISPARA INCOERÊNCIA.** Ausência de janela já tem aviso próprio
 * (`sem_janela`); fazê-la disparar também "término passado" contaria a mesma falha duas vezes e
 * mandaria corrigir a coisa errada.
 *
 * Retrato da base, medido em 16/09/2026: **11** incoerências (1 `ativa_com_termino_passado` + 10
 * `planejada_com_inicio_passado`), `sem_janela` **1**, `sem_sala` **2**,
 * `sem_efetivo_fora_de_planejada` **0**, `sem_disciplina` **0**.
 *
 * Origem: `FR-028.1`, `FR-028.4` da spec 009, `SC-013`, `SC-014`, contrato de escritas §3.
 */
import { describe, expect, it } from "vitest";

import { avisosDaTurma, type TurmaParaAvisos } from "@/lib/dominio/avisos-da-turma";

const HOJE = "2026-09-23";

const turma = (p: Partial<TurmaParaAvisos> = {}): TurmaParaAvisos => ({
  status: "ativa",
  dataInicio: "2026-02-02",
  dataTermino: "2026-12-11",
  sala: "Sala 01",
  alunos: 20,
  disciplinasAtivas: 6,
  ...p,
});

const chaves = (t: TurmaParaAvisos) => avisosDaTurma(t, HOJE).map((a) => a.chave);

describe("turma completa e coerente não gera aviso", () => {
  it("nada a avisar", () => {
    expect(avisosDaTurma(turma(), HOJE)).toEqual([]);
  });
});

describe("`ativa_com_termino_passado`", () => {
  it("dispara com término anterior a hoje", () => {
    expect(chaves(turma({ status: "ativa", dataTermino: "2026-06-30" }))).toContain(
      "ativa_com_termino_passado",
    );
  });

  it("⚠️ é ESTRITO: terminar hoje não é atraso", () => {
    expect(chaves(turma({ status: "ativa", dataTermino: HOJE }))).not.toContain(
      "ativa_com_termino_passado",
    );
  });

  it("só para `ativa` — uma concluída com término passado é o esperado", () => {
    expect(chaves(turma({ status: "concluida", dataTermino: "2026-06-30" }))).not.toContain(
      "ativa_com_termino_passado",
    );
  });

  it("⚠️ término vazio não dispara incoerência — a ausência tem aviso próprio", () => {
    const c = chaves(turma({ status: "ativa", dataTermino: null }));
    expect(c).not.toContain("ativa_com_termino_passado");
    expect(c).toContain("sem_janela");
  });
});

describe("`planejada_com_inicio_passado`", () => {
  it("dispara com início anterior a hoje", () => {
    expect(chaves(turma({ status: "planejada", dataInicio: "2026-06-30" }))).toContain(
      "planejada_com_inicio_passado",
    );
  });

  it("⚠️ é ESTRITO: começar hoje não é pendência", () => {
    expect(chaves(turma({ status: "planejada", dataInicio: HOJE }))).not.toContain(
      "planejada_com_inicio_passado",
    );
  });

  it("só para `planejada`", () => {
    expect(chaves(turma({ status: "ativa", dataInicio: "2026-06-30" }))).not.toContain(
      "planejada_com_inicio_passado",
    );
  });

  it("início vazio não dispara incoerência", () => {
    expect(chaves(turma({ status: "planejada", dataInicio: null }))).not.toContain(
      "planejada_com_inicio_passado",
    );
  });
});

describe("`sem_janela`", () => {
  it("dispara com qualquer uma das duas pontas vazia", () => {
    expect(chaves(turma({ dataInicio: null }))).toContain("sem_janela");
    expect(chaves(turma({ dataTermino: null }))).toContain("sem_janela");
    expect(chaves(turma({ dataInicio: null, dataTermino: null }))).toContain("sem_janela");
  });

  it("⚠️ e é UM aviso, não dois, quando faltam as duas pontas", () => {
    const avisos = avisosDaTurma(turma({ dataInicio: null, dataTermino: null }), HOJE);
    expect(avisos.filter((a) => a.chave === "sem_janela")).toHaveLength(1);
  });
});

describe("`sem_sala`", () => {
  it("dispara com sala vazia ou só espaços", () => {
    expect(chaves(turma({ sala: null }))).toContain("sem_sala");
    expect(chaves(turma({ sala: "  " }))).toContain("sem_sala");
  });
});

describe("`sem_efetivo_fora_de_planejada`", () => {
  it("dispara com efetivo vazio fora de `planejada`", () => {
    expect(chaves(turma({ status: "ativa", alunos: null }))).toContain(
      "sem_efetivo_fora_de_planejada",
    );
  });

  it("⚠️ NUNCA é só 'sem efetivo': turma planejada sem efetivo é o normal", () => {
    // Uma turma ainda não aberta não tem efetivo, e avisar sobre isso treinaria a pessoa a ignorar
    // o quadro — que é o custo que o `RN-DEG-02` cobra de aviso mal calibrado.
    expect(
      chaves(turma({ status: "planejada", alunos: null, dataInicio: "2027-02-01" })),
    ).not.toContain("sem_efetivo_fora_de_planejada");
  });

  it("efetivo zero é valor informado, não ausência", () => {
    expect(chaves(turma({ status: "ativa", alunos: 0 }))).not.toContain(
      "sem_efetivo_fora_de_planejada",
    );
  });
});

describe("`sem_disciplina`", () => {
  it("dispara sem nenhuma disciplina ativa", () => {
    expect(chaves(turma({ disciplinasAtivas: 0 }))).toContain("sem_disciplina");
  });

  it("não dispara com pelo menos uma", () => {
    expect(chaves(turma({ disciplinasAtivas: 1 }))).not.toContain("sem_disciplina");
  });
});

describe("⚠️ hoje é argumento, e a lista sai na ordem do contrato", () => {
  it("o mesmo dado dá vereditos diferentes em datas diferentes", () => {
    const t = turma({ status: "ativa", dataTermino: "2026-10-01" });
    expect(avisosDaTurma(t, "2026-09-23").map((a) => a.chave)).not.toContain(
      "ativa_com_termino_passado",
    );
    expect(avisosDaTurma(t, "2026-10-02").map((a) => a.chave)).toContain(
      "ativa_com_termino_passado",
    );
  });

  it("os seis tipos saem na ordem do contrato §3", () => {
    const todos = avisosDaTurma(
      {
        status: "ativa",
        dataInicio: null,
        dataTermino: "2026-06-30",
        sala: null,
        alunos: null,
        disciplinasAtivas: 0,
      },
      HOJE,
    );
    expect(todos.map((a) => a.chave)).toEqual([
      "ativa_com_termino_passado",
      "sem_janela",
      "sem_sala",
      "sem_efetivo_fora_de_planejada",
      "sem_disciplina",
    ]);
  });

  it("todo aviso tem título legível", () => {
    for (const a of avisosDaTurma(turma({ sala: null, disciplinasAtivas: 0 }), HOJE)) {
      expect(a.titulo.length).toBeGreaterThan(5);
      expect(a.titulo).not.toContain("_");
    }
  });
});

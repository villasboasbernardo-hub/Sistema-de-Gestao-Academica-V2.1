/** O painel de turmas (spec 017, FR-005; Bloco 2, item 4): cinco indicadores e três avisos, do recorte. */
import { describe, expect, it } from "vitest";

import {
  anoDoPainel,
  anosDoSeletor,
  painelDeTurmas,
  semanaDoPainel,
  type OcupacaoDoPainel,
  type TurmaDoPainel,
} from "@/lib/dominio/painel-de-turmas";

const HOJE = "2026-10-19";
const turma = (codigo: string, extra: Partial<TurmaDoPainel> = {}): TurmaDoPainel => ({
  id: codigo,
  codigo,
  ano: 2026,
  status: "ativa",
  dataInicio: "2026-03-02",
  dataTermino: "2026-12-11",
  arquivada: false,
  ...extra,
});
const aula = (
  turmaId: string | null,
  chave: string,
  extra: Partial<OcupacaoDoPainel> = {},
): OcupacaoDoPainel => ({
  turmaId,
  chave,
  data: "2026-10-20",
  taInicial: 1,
  taFinal: 2,
  instrutorId: "ins-1",
  fiscalId: null,
  local: "Sala 1",
  ...extra,
});
const base = {
  ano: 2026,
  mostrarArquivadas: false,
  hoje: HOJE,
  diasDeAviso: 30,
  linhas: [] as { turmaId: string; temInstrutor: boolean }[],
  ocupacao: [] as OcupacaoDoPainel[],
};

describe("os cinco indicadores", () => {
  it("total, em andamento (= ativa), concluídas, canceladas e iniciando em [hoje, hoje + N] não cancelada", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [
        turma("A"),
        turma("B", { status: "concluida" }),
        turma("C", { status: "cancelada", dataInicio: "2026-10-25" }),
        turma("D", { status: "planejada", dataInicio: "2026-11-18" }),
        turma("E", { status: "planejada", dataInicio: "2026-11-19" }),
        turma("F", { status: "planejada", dataInicio: HOJE }),
      ],
    });
    expect(p.indicadores).toEqual({
      total: 6,
      planejadas: 3,
      emAndamento: 1,
      concluidas: 1,
      canceladas: 1,
      iniciando: 2,
    });
  });

  it("⚠️ a arquivada fica fora dos indicadores e dos avisos sem o filtro (FR-005.3), e volta com ele", () => {
    const turmas = [turma("A"), turma("Z", { arquivada: true, dataInicio: null })];
    expect(painelDeTurmas({ ...base, turmas }).indicadores.total).toBe(1);
    expect(painelDeTurmas({ ...base, turmas }).avisos).toEqual([]);
    const com = painelDeTurmas({ ...base, turmas, mostrarArquivadas: true });
    expect(com.indicadores.total).toBe(2);
    expect(com.avisos.map((a) => a.tipo)).toEqual(["sem_janela"]);
  });
});

describe("ajuste de 19/10/2026 · o card Planejadas e o painel de UM ano só", () => {
  it("⚠️ o card Planejadas conta a situação planejada", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [
        turma("A"),
        turma("P1", { status: "planejada" }),
        turma("P2", { status: "planejada" }),
      ],
    });
    expect(p.indicadores.planejadas).toBe(2);
  });

  it("⚠️ o caso que discrimina: a planejada do ano SEGUINTE não entra nos números nem nos avisos do ano vigente", () => {
    const turmas = [
      turma("A"),
      turma("SEGUINTE", {
        ano: 2027,
        status: "planejada",
        dataInicio: "2026-11-02",
        dataTermino: null,
      }),
    ];
    const vigente = painelDeTurmas({ ...base, turmas });
    expect(vigente.indicadores).toEqual({
      total: 1,
      planejadas: 0,
      emAndamento: 1,
      concluidas: 0,
      canceladas: 0,
      iniciando: 0,
    });
    expect(vigente.avisos).toEqual([]);
    const seguinte = painelDeTurmas({ ...base, turmas, ano: 2027 });
    expect(seguinte.indicadores.total).toBe(1);
    expect(seguinte.indicadores.planejadas).toBe(1);
    expect(seguinte.indicadores.iniciando).toBe(1);
    expect(seguinte.avisos.map((a) => a.turmaCodigo)).toEqual(["SEGUINTE"]);
  });

  it("o ano do painel: o da URL quando válido; senão o ano letivo vigente (o de hoje em São Paulo)", () => {
    expect(anoDoPainel("", HOJE)).toBe(2026);
    expect(anoDoPainel("2025", HOJE)).toBe(2025);
    expect(anoDoPainel("abc", HOJE)).toBe(2026);
    expect(anoDoPainel("1999x", HOJE)).toBe(2026);
  });

  it("o seletor oferece os anos das turmas e o vigente, do mais novo ao mais velho, sem repetir", () => {
    expect(anosDoSeletor([2025, 2027, 2025], 2026)).toEqual([2027, 2026, 2025]);
    expect(anosDoSeletor([], 2026)).toEqual([2026]);
  });
});

describe("os avisos", () => {
  it("sem janela de datas: só planejada ou ativa (C-27)", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [
        turma("A", { dataTermino: null }),
        turma("B", { status: "concluida", dataInicio: null }),
        turma("C", { status: "planejada", dataInicio: null }),
      ],
    });
    expect(p.avisos.filter((a) => a.tipo === "sem_janela").map((a) => a.turmaCodigo)).toEqual([
      "A",
      "C",
    ]);
  });

  it("disciplina sem instrutor: quantas, só planejada ou ativa", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [turma("A"), turma("B", { status: "concluida" })],
      linhas: [
        { turmaId: "A", temInstrutor: false },
        { turmaId: "A", temInstrutor: false },
        { turmaId: "A", temInstrutor: true },
        { turmaId: "B", temInstrutor: false },
      ],
    });
    expect(p.avisos).toEqual([
      { tipo: "sem_instrutor", turmaCodigo: "A", detalhe: "2 disciplinas" },
    ]);
  });

  it("⚠️ conflito de PESSOA: com outra turma visível, com uma anônima e dentro da própria turma (C-23)", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [turma("A"), turma("B"), turma("C")],
      ocupacao: [
        aula("A", "a1"),
        aula("B", "b1"),
        aula(null, "x1", { data: "2026-10-21", instrutorId: "ins-2" }),
        aula("C", "c1", { data: "2026-10-21", instrutorId: "ins-2" }),
        aula("C", "c2", { data: "2026-10-22", instrutorId: "ins-3" }),
        aula("C", "c3", { data: "2026-10-22", instrutorId: "ins-3", taInicial: 2, taFinal: 3 }),
      ],
    });
    const conflitos = p.avisos.filter((a) => a.tipo === "conflito");
    expect(conflitos).toEqual([
      { tipo: "conflito", turmaCodigo: "A", detalhe: "com B" },
      { tipo: "conflito", turmaCodigo: "B", detalhe: "com A" },
      { tipo: "conflito", turmaCodigo: "C", detalhe: "com outra turma · dentro da própria turma" },
    ]);
  });

  it("⚠️ a mesma SALA em turmas diferentes NÃO vira aviso (o alerta de sala fica fora, C-23)", () => {
    const p = painelDeTurmas({
      ...base,
      turmas: [turma("A"), turma("B")],
      ocupacao: [
        aula("A", "a1", { instrutorId: "ins-1" }),
        aula("B", "b1", { instrutorId: "ins-9" }),
      ],
    });
    expect(p.avisos).toEqual([]);
  });

  it("⚠️ leitura que falhou é «não pude ler», nunca zero avisos (gotcha 4)", () => {
    const p = painelDeTurmas({ ...base, turmas: [turma("A")], linhas: null, ocupacao: null });
    expect(p.naoLidos).toEqual(["sem_instrutor", "conflito"]);
    expect(p.avisos).toEqual([]);
  });
});

describe("o parâmetro do «iniciando»", () => {
  it("sem o parâmetro lido, o indicador sai nulo — nunca de uma constante (regra 8)", () => {
    expect(
      painelDeTurmas({ ...base, diasDeAviso: null, turmas: [turma("A")] }).indicadores.iniciando,
    ).toBeNull();
  });
});

describe("a semana do aviso de conflito", () => {
  it("é a corrente, de segunda a sábado, pelo dia de São Paulo", () => {
    expect(semanaDoPainel("2026-10-19")).toEqual({ de: "2026-10-19", ate: "2026-10-24" });
    expect(semanaDoPainel("2026-10-25")).toEqual({ de: "2026-10-19", ate: "2026-10-24" });
  });
});

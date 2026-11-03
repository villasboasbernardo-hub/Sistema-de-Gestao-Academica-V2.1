/**
 * RA-1 a RA-9 (Bloco 18, spec 033) — as regras puras do módulo de Atividades: o «Conta como», o grupo do tipo, a AEC
 * prevista cumprida, a situação da APOINST, as estatísticas e os avisos. Cada bloco traz o caso que discrimina (DoD 8):
 * o veredito que vira com a regra nova.
 */
import { describe, expect, it } from "vitest";

import {
  aceitaContaComo,
  categoriaEfetiva,
  comoConta,
  recusaPelaCategoria,
  rotuloDeComoConta,
} from "@/lib/dominio/categoria-pelo-tipo";
import {
  apoinstSeAplica,
  quadroDaApoinst,
  situacaoDaApoinst,
  type ApoinstPlanejada,
} from "@/lib/dominio/atividades/apoinst";
import { avisosDeAtividades, dentroDoPrazoDeAviso } from "@/lib/dominio/atividades/avisos";
import { estatisticasDeAtividades, type AtividadeParaEstatistica } from "@/lib/dominio/atividades/estatisticas";
import { grupoNaEstatistica, rotuloDoTipo } from "@/lib/dominio/atividades/grupos";
import type { MarcacaoDeAtividade } from "@/lib/dominio/atividades/marcacoes";
import { quadroDasPrevistas, situacaoDaPrevista, type AecPrevista } from "@/lib/dominio/atividades/previstas";

describe("RA-1/RA-4 — o «Conta como» (espelho do gatilho app.categoria_pelo_tipo)", () => {
  it("AEC/TAD/TR escolhidos viram a categoria; CHD e nulo ficam com a do tipo", () => {
    expect(categoriaEfetiva("AEC", "TAD")).toBe("TAD"); // o caso que discrimina: Palestra contando como TAD
    expect(categoriaEfetiva("AEC", null)).toBe("AEC");
    expect(categoriaEfetiva("TR", "CHD")).toBe("TR");
    expect(comoConta("TR", "CHD")).toBe("CHD");
    expect(comoConta("AEC", null)).toBe("AEC");
    expect(rotuloDeComoConta("CHD")).toBe("TA da disciplina");
  });

  it("tipo de Estudo Individual ou de Apoio Individualizado não troca (decisão 2: Monitoria)", () => {
    expect(aceitaContaComo("Apoio_Individualizado")).toBe(false);
    expect(aceitaContaComo("Estudo_Individual")).toBe(false);
    expect(categoriaEfetiva("Apoio_Individualizado", "AEC")).toBe("Apoio_Individualizado");
    expect(
      recusaPelaCategoria({
        categoria: "Apoio_Individualizado",
        turmaId: "t",
        disciplinaId: null,
        quantidadeAlunos: 2,
        descricao: "Monitoria",
        contaComo: "AEC",
      })?.campo,
    ).toBe("contaComo");
  });

  it("«TA da disciplina» exige a disciplina e a aceita em tipo de TR (Reforço)", () => {
    const base = { categoria: "TR" as const, turmaId: "t", quantidadeAlunos: null, descricao: "Reforço" };
    expect(recusaPelaCategoria({ ...base, disciplinaId: null, contaComo: "CHD" })?.campo).toBe("disciplinaId");
    expect(recusaPelaCategoria({ ...base, disciplinaId: "d", contaComo: "CHD" })).toBeNull();
    // Sem a escolha, a regra de antes: só a AEC leva disciplina, com a mesma frase.
    expect(recusaPelaCategoria({ ...base, disciplinaId: "d" })?.mensagem).toBe("Só a AEC leva disciplina.");
    // A AEC que passa a contar como TAD perde o direito à disciplina.
    expect(
      recusaPelaCategoria({ ...base, categoria: "AEC", disciplinaId: "d", contaComo: "TAD" })?.campo,
    ).toBe("disciplinaId");
  });
});

describe("RA-1/RA-9 — o rótulo e o grupo do tipo", () => {
  it("o rótulo vence o valor (decisão 4) e os três agrupam (decisão 3)", () => {
    expect(rotuloDoTipo({ valor: "Atividade Extracurricular", rotulo: "Atividade Extraclasse" })).toBe(
      "Atividade Extraclasse",
    );
    expect(grupoNaEstatistica({ valor: "Visita Técnica" })).toBe("Visita");
    expect(grupoNaEstatistica({ valor: "Apoio à Instrução" })).toBe("APOINST/Prática");
    expect(grupoNaEstatistica({ valor: "Evento/Cerimônia" })).toBe("Cerimônia");
    expect(grupoNaEstatistica({ valor: "Outra", rotulo: "Outra" })).toBe("Outra");
    expect(grupoNaEstatistica({ valor: "Desportiva" })).toBe("Desportiva");
  });
});

const prevista = (id: string, taPrevistos: number | null, obrigatoria = true, ordem = 0): AecPrevista => ({
  id,
  codigo: `AEP-${id}`,
  nome: `Palestra ${id}`,
  tipoValor: "Palestra",
  tipoRotulo: "Palestra",
  taPrevistos,
  disciplina: null,
  obrigatoria,
  ordem,
});

const marcacao = (alvo: { prevista?: string; apoinst?: string }, situacao: "cumprida" | "a_cumprir", em: string) =>
  ({
    turmaId: "t",
    atividadePrevistaId: alvo.prevista ?? null,
    apoinstId: alvo.apoinst ?? null,
    situacao,
    dataRealizada: null,
    justificativa: "Realizada fora do DSA, conferida.",
    autor: "Ajudante",
    em,
  }) satisfies MarcacaoDeAtividade;

describe("RA-2/RA-3/RA-5 — a AEC prevista na turma", () => {
  it("a cumprir → em andamento (parte dos TA) → cumprida (soma os previstos)", () => {
    expect(situacaoDaPrevista({ taPrevistos: 8, taLancados: 0, lancamentos: 0, marcacao: null })).toBe("a_cumprir");
    expect(situacaoDaPrevista({ taPrevistos: 8, taLancados: 4, lancamentos: 1, marcacao: null })).toBe(
      "em_andamento",
    );
    expect(situacaoDaPrevista({ taPrevistos: 8, taLancados: 8, lancamentos: 2, marcacao: null })).toBe("cumprida");
    // Sem TA previsto («não definido»): ao primeiro lançamento.
    expect(situacaoDaPrevista({ taPrevistos: null, taLancados: 2, lancamentos: 1, marcacao: null })).toBe("cumprida");
  });

  it("a marcação à mão mais recente vale; «a_cumprir» a desfaz", () => {
    const q = quadroDasPrevistas({
      previstas: [prevista("a", 2), prevista("b", 4, false, 1)],
      lancamentos: [{ codigo: "L1", alvoId: "b", data: "2027-03-02", ta: 4, responsavel: "Cap X (DHN)", local: "Auditório" }],
      marcacoes: [
        marcacao({ prevista: "a" }, "cumprida", "2027-03-01T10:00:00Z"),
        marcacao({ prevista: "a" }, "a_cumprir", "2027-03-05T10:00:00Z"),
      ],
    });
    expect(q.linhas.map((l) => l.situacao)).toEqual(["a_cumprir", "cumprida"]);
    expect(q.linhas[0]?.historico).toHaveLength(2);
    expect(q.cumpridas).toBe(1);
    expect(q.obrigatoriasPendentes.map((l) => l.id)).toEqual(["a"]);
    expect(q.linhas[1]?.responsaveis).toEqual(["Cap X (DHN)"]);
  });

  it("os sem TA previsto são nomeados, nunca somados como zero (RN-DEG-01)", () => {
    const q = quadroDasPrevistas({ previstas: [prevista("a", null), prevista("b", 3)], lancamentos: [], marcacoes: [] });
    expect(q.taPrevistos).toBe(3);
    expect(q.semTaPrevisto).toEqual(["Palestra a"]);
  });
});

const apoinst = (id: string, fim: string, ta = 10, ativa = true): ApoinstPlanejada => ({
  id,
  codigo: `APO-${id}`,
  turmaId: "t",
  turmaCodigo: "CAHO 2027",
  nome: `Prática ${id}`,
  disciplina: { id: "d", codigo: "DIS-1", nome: "Topografia" },
  instrutor: null,
  inicioPrevisto: "2027-04-01",
  fimPrevisto: fim,
  taPrevistos: ta,
  ativa,
});

describe("RA-6 — a APOINST planejada", () => {
  it("as quatro situações, com Concluída antes de Atrasada", () => {
    const hoje = "2027-05-10";
    const s = (taLancados: number, lancamentos: number, fim: string) =>
      situacaoDaApoinst({ taPrevistos: 10, taLancados, lancamentos, fimPrevisto: fim, marcacao: null }, hoje);
    expect(s(0, 0, "2027-06-01")).toBe("planejada");
    expect(s(4, 1, "2027-06-01")).toBe("em_andamento");
    expect(s(4, 1, "2027-05-09")).toBe("atrasada"); // passou o fim sem concluir
    expect(s(10, 2, "2027-05-09")).toBe("concluida"); // concluída depois do fim não é atrasada
    expect(s(10, 2, "2027-05-10")).toBe("concluida");
    expect(s(0, 0, "2027-05-10")).toBe("planejada"); // o próprio dia do fim ainda não atrasa
  });

  it("concluída à mão vale e a desativada não conta na situação", () => {
    const q = quadroDaApoinst({
      planejadas: [apoinst("a", "2027-05-01"), apoinst("b", "2027-05-01", 10, false)],
      lancamentos: [{ codigo: "L", apoinstId: "a", data: "2027-04-20", ta: 3 }],
      marcacoes: [marcacao({ apoinst: "a" }, "cumprida", "2027-05-02T12:00:00Z")],
      hoje: "2027-05-10",
    });
    expect(q.linhas.find((l) => l.id === "a")?.situacao).toBe("concluida");
    expect(q.linhas.find((l) => l.id === "a")?.diferencaDeTa).toBe(-7);
    expect(q.porSituacao).toEqual({ planejada: 0, em_andamento: 0, concluida: 1, atrasada: 0 });
  });

  it("só turmas do ano inicial em diante; sem o parâmetro, não restringe", () => {
    expect(apoinstSeAplica(2026, 2027)).toBe(false);
    expect(apoinstSeAplica(2027, 2027)).toBe(true);
    expect(apoinstSeAplica(2026, null)).toBe(true);
  });
});

const atividade = (p: Partial<AtividadeParaEstatistica>): AtividadeParaEstatistica => ({
  codigo: "A",
  data: "2027-03-01",
  turmaCodigo: "CAHO 2027",
  cursoCodigo: "CAHO",
  tipoValor: "Palestra",
  tipoRotulo: "Palestra",
  categoria: "AEC",
  contaComo: null,
  ta: 2,
  local: null,
  ...p,
});

describe("RA-9 — as estatísticas", () => {
  it("o «TA da disciplina» sai da AEC; os grupos e as visitas com local", () => {
    const e = estatisticasDeAtividades({
      atividades: [
        atividade({ ta: 2 }),
        atividade({ ta: 3, contaComo: "CHD" }),
        atividade({ ta: 4, tipoValor: "Visita Técnica", tipoRotulo: "Visita Técnica", local: "CHM" }),
        atividade({ ta: 1, categoria: "TR", tipoValor: "Reforço", tipoRotulo: "Reforço", turmaCodigo: "C-Ap-FR 2027", cursoCodigo: "C-Ap-FR" }),
      ],
      palestras: { cumpridas: 1, previstas: 4 },
    });
    expect(e.totalAtividades).toBe(4);
    expect(e.totalTa).toBe(10);
    expect(e.taPorComoConta).toEqual([
      { nome: "AEC", valor: 6 },
      { nome: "TR", valor: 1 },
      { nome: "TA da disciplina", valor: 3 },
    ]);
    expect(e.visitas).toBe(1);
    expect(e.visitasComLocal[0]?.local).toBe("CHM");
    expect(e.porTipo.map((f) => f.nome)).toEqual(["Palestra", "Visita", "Reforço"]);
    expect(e.porCurso).toEqual([
      { nome: "CAHO", valor: 9 },
      { nome: "C-Ap-FR", valor: 1 },
    ]);
    expect(e.apoinstPorSituacao).toEqual({ planejada: 0, em_andamento: 0, concluida: 0, atrasada: 0 });
  });
});

describe("RA-8 — os avisos", () => {
  const turma = { id: "t", codigo: "CAHO 2027", termino: "2027-06-30", ativa: true, arquivada: false, eadPura: false };
  const pendentes = new Map([["t", [{ codigo: "AEP-000001", nome: "Amazônia Azul" }]]]);
  it("a AEC obrigatória pendente entra a partir de 4 semanas do término (inclusive)", () => {
    expect(dentroDoPrazoDeAviso("2027-06-30", "2027-06-02", 4)).toBe(true); // 28 dias
    expect(dentroDoPrazoDeAviso("2027-06-30", "2027-06-01", 4)).toBe(false); // 29 dias
    expect(dentroDoPrazoDeAviso("2027-06-30", "2027-06-02", null)).toBe(false);
    const a = avisosDeAtividades({
      turmas: [turma],
      obrigatoriasPendentes: pendentes,
      apoinstAtrasadas: new Map(),
      hoje: "2027-06-10",
      semanasDeAviso: 4,
    });
    expect(a.aecPendentes.map((p) => p.codigo)).toEqual(["AEP-000001"]);
  });
  it("sem a turma arquivada nem a EAD pura", () => {
    const a = avisosDeAtividades({
      turmas: [{ ...turma, arquivada: true }, { ...turma, id: "u", eadPura: true }],
      obrigatoriasPendentes: new Map([...pendentes, ["u", [{ codigo: "AEP-2", nome: "X" }]]]),
      apoinstAtrasadas: new Map([["t", [{ codigo: "APO-1", nome: "P", fimPrevisto: "2027-05-01" }]]]),
      hoje: "2027-06-10",
      semanasDeAviso: 4,
    });
    expect(a.aecPendentes).toEqual([]);
    expect(a.apoinstAtrasadas).toEqual([]);
  });
});

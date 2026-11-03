/**
 * RA-5, RA-6, RA-7 e RA-9 (Bloco 18, spec 033) — as linhas, os filtros e os números das abas Palestras e APOINST
 * (`lib/dominio/atividades/palestras-e-apoinst-na-tela.ts`). A situação vem pronta dos quadros (`quadroDasPrevistas`,
 * `quadroDaApoinst`) — aqui se prova o que este módulo faz: juntar as turmas, filtrar e contar.
 *
 * Os casos que discriminam (DoD 8): a turma ARQUIVADA conta nos números e some só das opções do filtro (RT-8); a
 * AVULSA sai com o filtro de situação e com o vínculo «do currículo»; a APOINST DESATIVADA aparece e não conta.
 */
import { describe, expect, it } from "vitest";

import { quadroDaApoinst, type ApoinstPlanejada } from "@/lib/dominio/atividades/apoinst";
import type { MarcacaoDeAtividade } from "@/lib/dominio/atividades/marcacoes";
import {
  avulsasDaAba,
  filtrarApoinst,
  filtrarPalestras,
  linhasDeApoinst,
  linhasDePalestras,
  numerosDaApoinst,
  numerosDasPalestras,
  opcoesDeCurso,
  opcoesDeTurma,
  situacaoDeApoinstValida,
  situacaoDePalestraValida,
  situacaoNoFiltroDePalestras,
  type AvulsaNaTela,
  type TurmaDaAba,
} from "@/lib/dominio/atividades/palestras-e-apoinst-na-tela";
import { quadroDasPrevistas, type AecPrevista } from "@/lib/dominio/atividades/previstas";

const HOJE = "2048-06-15";

const TURMA_A: TurmaDaAba = {
  id: "ta",
  codigo: "CUR-X 2048",
  cursoCodigo: "CUR-X",
  arquivada: false,
};
const TURMA_B: TurmaDaAba = {
  id: "tb",
  codigo: "CUR-Y 2048",
  cursoCodigo: "CUR-Y",
  arquivada: true,
};
const TURMAS = [TURMA_A, TURMA_B] as const;

const prevista = (
  id: string,
  taPrevistos: number | null,
  obrigatoria: boolean,
  ordem: number,
): AecPrevista => ({
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

const marcacao = (
  turmaId: string,
  alvo: { previsa?: string; apoinst?: string },
  em: string,
): MarcacaoDeAtividade => ({
  turmaId,
  atividadePrevistaId: alvo.previsa ?? null,
  apoinstId: alvo.apoinst ?? null,
  situacao: "cumprida",
  dataRealizada: null,
  justificativa: "Cumprida fora do DSA, conferida na pasta do curso.",
  autor: "Encarregado de teste",
  em,
});

/** Turma A: p1 cumprida pelo DSA, p2 em andamento, p3 a cumprir (obrigatória). Turma B (arquivada): p1 à mão. */
function quadros() {
  const previstas = [
    prevista("p1", 2, true, 1),
    prevista("p2", 4, false, 2),
    prevista("p3", null, true, 3),
  ];
  return new Map([
    [
      TURMA_A.id,
      quadroDasPrevistas({
        previstas,
        lancamentos: [
          {
            codigo: "L1",
            alvoId: "p1",
            data: "2048-03-02",
            ta: 2,
            responsavel: "CT -EF Fulano",
            local: "Auditório",
          },
          { codigo: "L2", alvoId: "p2", data: "2048-03-09", ta: 1, responsavel: null, local: null },
        ],
        marcacoes: [],
      }),
    ],
    [
      TURMA_B.id,
      quadroDasPrevistas({
        previstas,
        lancamentos: [],
        marcacoes: [marcacao(TURMA_B.id, { previsa: "p1" }, "2048-04-01T12:00:00Z")],
      }),
    ],
  ]);
}

const AVULSAS: readonly AvulsaNaTela[] = [
  {
    codigo: "AV-2",
    turmaId: TURMA_B.id,
    turmaCodigo: TURMA_B.codigo,
    data: "2048-05-10",
    ta: 3,
    responsavel: "Palestrante (OM externa)",
    local: null,
    descricao: "Palestra avulsa da B",
  },
  {
    codigo: "AV-1",
    turmaId: TURMA_A.id,
    turmaCodigo: TURMA_A.codigo,
    data: "2048-05-02",
    ta: 2,
    responsavel: null,
    local: "Sala 1",
    descricao: "Palestra avulsa da A",
  },
  {
    codigo: "AV-9",
    turmaId: "outra-turma",
    turmaCodigo: "CUR-Z 2048",
    data: "2048-05-01",
    ta: 9,
    responsavel: null,
    local: null,
    descricao: "De turma fora do recorte",
  },
];

describe("RA-3/RA-5 — as linhas das palestras de várias turmas", () => {
  it("uma linha por prevista POR TURMA, na ordem das turmas, com a chave turma:prevista e a marca de arquivada", () => {
    const linhas = linhasDePalestras(TURMAS, quadros());
    expect(linhas.map((l) => l.chave)).toEqual([
      "ta:p1",
      "ta:p2",
      "ta:p3",
      "tb:p1",
      "tb:p2",
      "tb:p3",
    ]);
    expect(linhas.map((l) => l.situacao)).toEqual([
      "cumprida",
      "em_andamento",
      "a_cumprir",
      "cumprida_a_mao",
      "a_cumprir",
      "a_cumprir",
    ]);
    expect(linhas.filter((l) => l.turmaArquivada).map((l) => l.turmaCodigo)).toEqual([
      TURMA_B.codigo,
      TURMA_B.codigo,
      TURMA_B.codigo,
    ]);
    expect(linhas[0]?.cursoCodigo).toBe("CUR-X");
  });

  it("a turma sem quadro (leitura sem previsto) não inventa linha", () => {
    expect(linhasDePalestras([TURMA_A], new Map())).toEqual([]);
  });

  it("as avulsas: só as das turmas recebidas, na ordem delas e depois pela data, com o curso", () => {
    const avulsas = avulsasDaAba(TURMAS, AVULSAS);
    expect(avulsas.map((a) => a.codigo)).toEqual(["AV-1", "AV-2"]);
    expect(avulsas.map((a) => a.cursoCodigo)).toEqual(["CUR-X", "CUR-Y"]);
  });
});

describe("FR-006.2 — os filtros da aba Palestras", () => {
  const todas = () => ({
    linhas: linhasDePalestras(TURMAS, quadros()),
    avulsas: avulsasDaAba(TURMAS, AVULSAS),
  });
  const sem = { turma: "", curso: "", situacao: "", vinculo: "" };

  it("«Cumprida» junta a cumprida pelo DSA e a à mão", () => {
    expect(situacaoNoFiltroDePalestras("cumprida")).toBe("cumprida");
    expect(situacaoNoFiltroDePalestras("cumprida_a_mao")).toBe("cumprida");
    expect(situacaoNoFiltroDePalestras("em_andamento")).toBe("em_andamento");
    expect(situacaoNoFiltroDePalestras("a_cumprir")).toBe("a_cumprir");
    const r = filtrarPalestras(todas(), { ...sem, situacao: "cumprida" });
    expect(r.linhas.map((l) => l.chave)).toEqual(["ta:p1", "tb:p1"]);
  });

  it("⚠️ a avulsa não tem situação: com o filtro de situação ela sai (o caso que discrimina)", () => {
    expect(filtrarPalestras(todas(), sem).avulsas).toHaveLength(2);
    expect(filtrarPalestras(todas(), { ...sem, situacao: "a_cumprir" }).avulsas).toEqual([]);
  });

  it("o vínculo: «do currículo» tira as avulsas; «avulsa» tira as previstas", () => {
    const doCurriculo = filtrarPalestras(todas(), { ...sem, vinculo: "do_curriculo" });
    expect(doCurriculo.avulsas).toEqual([]);
    expect(doCurriculo.linhas).toHaveLength(6);
    const avulsa = filtrarPalestras(todas(), { ...sem, vinculo: "avulsa" });
    expect(avulsa.linhas).toEqual([]);
    expect(avulsa.avulsas.map((a) => a.codigo)).toEqual(["AV-1", "AV-2"]);
  });

  it("turma e curso recortam as duas listas", () => {
    const r = filtrarPalestras(todas(), { ...sem, turma: TURMA_A.codigo });
    expect(new Set(r.linhas.map((l) => l.turmaId))).toEqual(new Set(["ta"]));
    expect(r.avulsas.map((a) => a.codigo)).toEqual(["AV-1"]);
    const c = filtrarPalestras(todas(), { ...sem, curso: "CUR-Y" });
    expect(new Set(c.linhas.map((l) => l.turmaId))).toEqual(new Set(["tb"]));
    expect(c.avulsas.map((a) => a.codigo)).toEqual(["AV-2"]);
  });

  it("⚠️ uma situação da OUTRA aba (o `situacao` é um parâmetro só) não filtra", () => {
    expect(situacaoDePalestraValida("atrasada")).toBe(false);
    expect(situacaoDePalestraValida("cumprida")).toBe(true);
    const r = filtrarPalestras(todas(), { ...sem, situacao: "atrasada" });
    expect(r.linhas).toHaveLength(6);
    expect(r.avulsas).toHaveLength(2);
  });
});

describe("RA-9 — os números das palestras", () => {
  it("N de M, à mão, em andamento, a cumprir, obrigatórias pendentes e as avulsas com os TA", () => {
    const linhas = linhasDePalestras(TURMAS, quadros());
    const n = numerosDasPalestras(linhas, avulsasDaAba(TURMAS, AVULSAS));
    expect(n).toMatchObject({
      previstas: 6,
      cumpridas: 2,
      cumpridasAMao: 1,
      emAndamento: 1,
      aCumprir: 3,
      // p3 (obrigatória) a cumprir nas duas turmas; p1 obrigatória cumprida nas duas.
      obrigatoriasPendentes: 2,
      avulsas: 2,
      taDasAvulsas: 5,
    });
  });

  it("⚠️ a turma ARQUIVADA conta (RT-8): tirá-la mudaria o N de M", () => {
    const comArquivada = numerosDasPalestras(linhasDePalestras(TURMAS, quadros()), []);
    const semArquivada = numerosDasPalestras(linhasDePalestras([TURMA_A], quadros()), []);
    expect(comArquivada.previstas).toBe(6);
    expect(semArquivada.previstas).toBe(3);
    expect(comArquivada.cumpridas).toBe(2);
    expect(semArquivada.cumpridas).toBe(1);
  });

  it("a pizza só com as fatias que têm valor, na ordem da situação, pelo rótulo", () => {
    const n = numerosDasPalestras(linhasDePalestras([TURMA_A], quadros()), []);
    expect(n.porSituacao).toEqual([
      { nome: "A cumprir", valor: 1 },
      { nome: "Em andamento", valor: 1 },
      { nome: "Cumprida", valor: 1 },
    ]);
    expect(numerosDasPalestras([], []).porSituacao).toEqual([]);
  });
});

const apoinst = (
  id: string,
  turma: TurmaDaAba,
  extra: Partial<ApoinstPlanejada> = {},
): ApoinstPlanejada => ({
  id,
  codigo: `APO-${id}`,
  turmaId: turma.id,
  turmaCodigo: turma.codigo,
  nome: `APOINST ${id}`,
  disciplina: { id: "d1", codigo: "I", nome: "Disciplina I" },
  instrutor: { id: "i1", nome: "CT -EF Fulano" },
  inicioPrevisto: "2048-03-01",
  fimPrevisto: "2048-07-31",
  taPrevistos: 10,
  ativa: true,
  ...extra,
});

/** a1 concluída (TA), a2 em andamento, a3 atrasada, a4 planejada, a5 desativada (atrasada se contasse), a6 da B. */
function linhasDaApoinst() {
  const q = quadroDaApoinst({
    planejadas: [
      apoinst("a1", TURMA_A),
      apoinst("a2", TURMA_A, { inicioPrevisto: "2048-03-02" }),
      apoinst("a3", TURMA_A, { inicioPrevisto: "2048-03-03", fimPrevisto: "2048-05-31" }),
      apoinst("a4", TURMA_A, { inicioPrevisto: "2048-08-01", fimPrevisto: "2048-09-30" }),
      apoinst("a5", TURMA_A, {
        inicioPrevisto: "2048-03-04",
        fimPrevisto: "2048-04-30",
        ativa: false,
      }),
      apoinst("a6", TURMA_B, { inicioPrevisto: "2048-03-05" }),
    ],
    lancamentos: [
      { codigo: "L1", apoinstId: "a1", data: "2048-03-10", ta: 6 },
      { codigo: "L2", apoinstId: "a1", data: "2048-04-10", ta: 4 },
      { codigo: "L3", apoinstId: "a2", data: "2048-04-11", ta: 3 },
    ],
    marcacoes: [marcacao(TURMA_B.id, { apoinst: "a6" }, "2048-06-01T12:00:00Z")],
    hoje: HOJE,
  });
  return linhasDeApoinst(TURMAS, q.linhas);
}

describe("RA-6 — as linhas e os filtros da APOINST", () => {
  it("as linhas levam o curso e a marca de arquivada; a de turma fora do recorte sai", () => {
    const linhas = linhasDaApoinst();
    expect(linhas.map((l) => l.id)).toEqual(["a1", "a2", "a3", "a5", "a6", "a4"]);
    expect(linhas.find((l) => l.id === "a6")).toMatchObject({
      turmaArquivada: true,
      cursoCodigo: "CUR-Y",
    });
    expect(linhasDeApoinst([TURMA_A], linhasDaApoinst()).map((l) => l.id)).not.toContain("a6");
  });

  it("⚠️ com filtro de situação, a desativada sai — ela não tem situação que conte (o caso que discrimina)", () => {
    const todas = linhasDaApoinst();
    const atrasadas = filtrarApoinst(todas, { turma: "", curso: "", situacao: "atrasada" });
    // a5 é desativada e teria passado do fim: não entra.
    expect(atrasadas.map((l) => l.id)).toEqual(["a3"]);
    expect(filtrarApoinst(todas, { turma: "", curso: "", situacao: "" })).toHaveLength(6);
  });

  it("turma e curso recortam; situação de Palestras não filtra a APOINST", () => {
    const todas = linhasDaApoinst();
    expect(
      filtrarApoinst(todas, { turma: TURMA_B.codigo, curso: "", situacao: "" }).map((l) => l.id),
    ).toEqual(["a6"]);
    expect(filtrarApoinst(todas, { turma: "", curso: "CUR-X", situacao: "" })).toHaveLength(5);
    expect(situacaoDeApoinstValida("a_cumprir")).toBe(false);
    expect(filtrarApoinst(todas, { turma: "", curso: "", situacao: "a_cumprir" })).toHaveLength(6);
  });
});

describe("RA-9 — os números da APOINST", () => {
  it("por situação só das ATIVAS, com a desativada contada à parte, e os TA previstos × lançados", () => {
    const n = numerosDaApoinst(linhasDaApoinst());
    expect(n.ativas).toBe(5);
    expect(n.desativadas).toBe(1);
    // a6 (da arquivada) foi concluída à mão e CONTA (RT-8).
    expect(n.porSituacao).toEqual({ planejada: 1, em_andamento: 1, concluida: 2, atrasada: 1 });
    expect(n.taPrevistos).toBe(50);
    expect(n.taLancados).toBe(13);
    expect(n.fatias).toEqual([
      { nome: "Planejada", valor: 1 },
      { nome: "Em andamento", valor: 1 },
      { nome: "Concluída", valor: 2 },
      { nome: "Atrasada", valor: 1 },
    ]);
  });

  it("sem linha, nenhuma fatia (a pizza vazia não desenha área)", () => {
    expect(numerosDaApoinst([]).fatias).toEqual([]);
  });
});

describe("RT-8 — as opções dos filtros", () => {
  it("⚠️ a turma arquivada some das opções de turma (o caso que discrimina), com a contagem de quem chama", () => {
    const opcoes = opcoesDeTurma(TURMAS, (codigo) => (codigo === TURMA_A.codigo ? 7 : 0));
    expect(opcoes).toEqual([{ valor: TURMA_A.codigo, rotulo: TURMA_A.codigo, contagem: 7 }]);
  });

  it("o curso aparece uma vez, na ordem das turmas — e o da arquivada fica (ela conta)", () => {
    const outraDoX: TurmaDaAba = {
      id: "tc",
      codigo: "CUR-X T2 2048",
      cursoCodigo: "CUR-X",
      arquivada: false,
    };
    const semCurso: TurmaDaAba = { id: "td", codigo: "?? 2048", cursoCodigo: "", arquivada: false };
    const opcoes = opcoesDeCurso([TURMA_A, TURMA_B, outraDoX, semCurso], () => 1);
    expect(opcoes.map((o) => o.valor)).toEqual(["CUR-X", "CUR-Y"]);
  });
});

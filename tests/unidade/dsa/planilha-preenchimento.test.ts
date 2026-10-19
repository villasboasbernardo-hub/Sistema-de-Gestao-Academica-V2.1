/**
 * A entrada (PREENCHIMENTO) da planilha de contingência — o retrato (`FR-005`, `FR-011`, `FR-013`,
 * `FR-015`, `data-model.md` §2.7) e as fórmulas (`FR-016` a `FR-019`, `DP-1`, I-P4, I-P11).
 */
import { describe, expect, it } from "vitest";

import { montarPlanilhaComGeometria } from "@/lib/dominio/dsa/planilha-de-contingencia";
import {
  ABA,
  B,
  B_PRIMEIRA_LINHA,
  P,
  PC,
  TEXTO_CHAVE_SEM_PAR,
} from "@/lib/dominio/dsa/planilha/layout";
import {
  TEXTO_DO_TOPO,
  linhaDoCabecalho,
  linhaDoTa,
  linhaSemPosicao,
} from "@/lib/dominio/dsa/planilha/preenchimento";
import { itensDoCatalogo } from "@/lib/dominio/dsa/planilha/catalogo";
import { avaliador, celulaEm, chaveDaCelula, serieDaData, type Pasta } from "@/lib/planilha/pasta";
import type { Valor } from "@/lib/planilha/formula";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";

import { MOTIVO_NO_MESMO_TA } from "@/lib/dominio/dsa/grade";
import { rotuloDaSemanaDoCurso, semanaDoCurso } from "@/lib/dominio/dsa/semana-do-curso";

import {
  DATA_INICIO,
  DATA_TERMINO,
  DURACAO_DO_CURSO,
  insumoSintetico,
  RELOGIO_B,
  rotuloDaSemanaDoCursoSintetica,
  SEMANAS,
} from "./planilha/sintetico";

const insumo = insumoSintetico();
const { pasta, entrada: g } = montarPlanilhaComGeometria(insumo);
const aba = pasta.abas[0] as Pasta["abas"][number];
const SEMANA = { s15: 0, s16: 1, s17: 2 } as const;

const avaliarCom = (
  trocas: readonly [number, number, Valor][] = [],
  aba_: string = ABA.preenchimento,
) => {
  const { valorDe } = avaliador(
    pasta,
    new Map(trocas.map(([l, c, v]) => [chaveDaCelula(aba_, l, c), v])),
  );
  return (l: number, c: number) => valorDe(ABA.preenchimento, l, c);
};
const valor = avaliarCom();

describe("`FR-005` · o topo diz quando, por quem e que é contingência", () => {
  it("o título, a geração e o aviso", () => {
    expect(celulaEm(aba, 1, 1)?.valor).toBe("PLANILHA DE CONTINGÊNCIA DO DSA — C-TESTE 2026");
    const quando = instanteComHoraParaLeitura(insumo.geradaEm);
    expect(quando).toBe("08/04/2026, 12:30");
    expect(celulaEm(aba, 2, 1)?.valor).toBe(
      `Gerada em ${quando} por Operador de Teste · lançamentos do sistema até ${quando}`,
    );
    expect(TEXTO_DO_TOPO.aviso).toContain("o sistema continua sendo a fonte");
    expect(TEXTO_DO_TOPO.aviso).toContain("Baixe de novo no início de cada semana");
    expect(celulaEm(aba, 3, 1)?.valor).toBe(TEXTO_DO_TOPO.aviso);
  });
  it("`FR-018` · a área de conferência conta as chaves sem par", () => {
    expect(valor(6, 1)).toMatch(/^Conferência: 0 linha\(s\)/);
  });
});

describe("o bloco de cada semana", () => {
  it("todos com a MESMA altura, e o cabeçalho no lugar calculado", () => {
    insumo.semanas.forEach((s, k) => {
      expect(celulaEm(aba, linhaDoCabecalho(g, k), PC.rotulo)?.valor).toBe(s.rotulo);
    });
  });
  it("spec 016, FR-009.5 · a «Semana N de T» de cada semana é a de `semanaDoCurso` (fórmula, `DP-1`)", () => {
    insumo.semanas.forEach((s, k) => {
      expect(valor(linhaDoCabecalho(g, k), PC.semanaDoCurso)).toBe(
        rotuloDaSemanaDoCursoSintetica(s.semana.numero),
      );
      expect(s.rotulo.startsWith(`${s.rotuloDaSemanaDoCurso} — `)).toBe(true);
    });
    expect(valor(linhaDoCabecalho(g, SEMANA.s15), PC.semanaDoCurso)).toBe("Semana 1 de 35");
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA** (DoD 8): a fórmula lê o catálogo, então corrigir o início, o término ou
   * a duração ali tem de renumerar a semana do mesmo jeito que `semanaDoCurso` renumeraria. Cada troca
   * abaixo dá um veredito diferente do da semente — antes do início, depois do término, a turma mais
   * longa que o curso, sem duração e sem término —, e a contagem CRONOS de antes errava todas.
   */
  it.each([
    ["início uma semana antes — a 15 vira a 2", "2026-03-30", DATA_TERMINO, DURACAO_DO_CURSO],
    ["início depois — a 15 sai «—»", "2026-04-13", DATA_TERMINO, DURACAO_DO_CURSO],
    ["término antes — a 17 sai «—»", DATA_INICIO, "2026-04-17", DURACAO_DO_CURSO],
    ["curso de 2 semanas, turma de 3 — T = 3", DATA_INICIO, DATA_TERMINO, 2],
    ["sem duração — T = semanas da turma", DATA_INICIO, DATA_TERMINO, null],
    ["sem duração e sem término — «Semana N»", DATA_INICIO, null, null],
    ["sem término, curso de 2 — a 17 passa da duração", DATA_INICIO, null, 2],
    ["sem início — tudo «—»", null, DATA_TERMINO, DURACAO_DO_CURSO],
  ] as const)("fórmula = função quando o catálogo muda: %s", (_, inicio, termino, duracao) => {
    const valorDe = avaliarCom(
      [
        [B_PRIMEIRA_LINHA, B.dataInicio, inicio === null ? "" : serieDaData(inicio)],
        [B_PRIMEIRA_LINHA, B.dataTermino, termino === null ? "" : serieDaData(termino)],
        [B_PRIMEIRA_LINHA, B.duracaoDoCurso, duracao ?? ""],
      ],
      ABA.catalogo,
    );
    insumo.semanas.forEach((s, k) => {
      const esperado = rotuloDaSemanaDoCurso(
        semanaDoCurso({
          dataInicio: inicio,
          dataTermino: termino,
          duracaoSemanasDoCurso: duracao,
          semana: s.semana,
        }),
      );
      expect(valorDe(linhaDoCabecalho(g, k), PC.semanaDoCurso), `semana ${k}`).toBe(esperado);
    });
  });
  it("alunos, ALT vazio, relógio e as duas assinaturas pela vigência da semana", () => {
    const h = linhaDoCabecalho(g, SEMANA.s15);
    expect(celulaEm(aba, h, PC.alunos)?.valor).toBe(12);
    expect(celulaEm(aba, h, PC.alt)?.valor).toBeUndefined();
    expect(celulaEm(aba, h, PC.relogio)?.valor).toBe("R1");
    expect(celulaEm(aba, linhaDoCabecalho(g, SEMANA.s17), PC.relogio)?.valor).toBe("R2");
    expect(celulaEm(aba, h + 1, PC.nome)?.valor).toBe("Encarregado de Teste");
    expect(celulaEm(aba, h + 1, PC.posto)?.valor).toBe("Capitão-Tenente (T)");
    expect(celulaEm(aba, h + 2, PC.funcao)?.valor).toBe("Chefe");
  });
  it("seis dias × os TA da grade, sábado incluído, com a data como número de série", () => {
    const sabado = linhaDoTa(g, SEMANA.s15, 5, g.tempos);
    expect(celulaEm(aba, sabado, P.dia)?.valor).toBe("SÁB");
    expect(celulaEm(aba, sabado, P.data)?.data).toBe("2026-04-11");
    expect(valor(sabado, P.data)).toBe(serieDaData("2026-04-11"));
  });
});

describe("`FR-011` · o lançamento do sistema entra com os valores DA LINHA e o código", () => {
  const segunda4 = linhaDoTa(g, SEMANA.s15, 0, 4);
  it("COD, ITEM e o código do lançamento", () => {
    expect(celulaEm(aba, segunda4, P.cod)?.valor).toBe("I");
    expect(celulaEm(aba, segunda4, P.item)?.valor).toBe(1);
    expect(celulaEm(aba, segunda4, P.codigo)?.valor).toBe("COD-a1");
  });
  it("§2.7 · igual ao catálogo nasce SUGERIDO (a fórmula, com o valor em cache)", () => {
    expect(celulaEm(aba, segunda4, P.conteudo)?.formula).toBeDefined();
    expect(valor(segunda4, P.conteudo)).toBe("Tópico I-1");
    expect(celulaEm(aba, segunda4, P.instrutor)?.formula).toBeDefined();
  });
  it("§2.7 · diferente do catálogo nasce ESCRITO (a constante)", () => {
    const sexta1 = linhaDoTa(g, SEMANA.s15, 4, 1);
    expect(celulaEm(aba, sexta1, P.conteudo)?.valor).toBe("Aula sem UE");
    expect(celulaEm(aba, sexta1, P.conteudo)?.formula).toBeUndefined();
    const prova = linhaDoTa(g, SEMANA.s15, 2, 1);
    expect(celulaEm(aba, prova, P.te)?.valor).toBe("PM");
  });
  it("`FR-013` · o lançamento sem TA vai para a lista sem posição da semana", () => {
    const l = linhaSemPosicao(g, SEMANA.s17, 0);
    expect(celulaEm(aba, l, P.codigo)?.valor).toBe("COD-a9");
    expect(celulaEm(aba, l, P.tempos)?.valor).toBe(2);
    expect(valor(l, P.spTexto)).toContain("Tópico II-1");
  });
  it("o dia bloqueado traz a descrição, e a entrada NÃO é recusada", () => {
    const quarta = linhaDoTa(g, SEMANA.s16, 2, 1);
    expect(celulaEm(aba, quarta, P.aviso)?.valor).toBe("FERIADO — Feriado de teste");
    const com = avaliarCom([
      [quarta, P.cod, "I"],
      [quarta, P.item, 1],
    ]);
    expect(com(quarta, P.chave)).toBe("I|1");
    expect(com(quarta, P.conteudo)).toBe("Tópico I-1");
    expect(com(quarta, P.conferencia)).toBe("");
  });
});

describe("`FR-016` a `FR-019` · as fórmulas da entrada", () => {
  const vazia = linhaDoTa(g, SEMANA.s16, 1, 3);
  it("o horário e o período saem da HORÁRIOS pelo relógio da semana", () => {
    expect(valor(vazia, P.horario)).toBe("09:30–10:15");
    expect(valor(linhaDoTa(g, SEMANA.s17, 1, 1), P.horario)).toBe("08:10–09:00");
    expect(valor(linhaDoTa(g, SEMANA.s16, 1, 6), P.periodo)).toBe("tarde");
  });
  it("duas escolhas — COD e ITEM — trazem tópico, local, técnica e instrutor", () => {
    const com = avaliarCom([
      [vazia, P.cod, "IX"],
      [vazia, P.item, 1],
    ]);
    expect([P.conteudo, P.local, P.te, P.instrutor].map((c) => com(vazia, c))).toEqual([
      "Tópico IX-1",
      "Sala 1",
      "AE",
      "",
    ]);
  });
  it("chave que o catálogo não tem vira aviso na linha e na área de conferência, nunca erro", () => {
    const com = avaliarCom([
      [vazia, P.cod, "I"],
      [vazia, P.item, 9],
    ]);
    expect(com(vazia, P.conferencia)).toBe(TEXTO_CHAVE_SEM_PAR);
    expect(com(vazia, P.conteudo)).toBe("");
    expect(com(6, 1)).toMatch(/^Conferência: 1 linha\(s\)/);
  });
  it("SEM UE abre com o tópico vazio, para digitar", () => {
    const com = avaliarCom([
      [vazia, P.cod, "I"],
      [vazia, P.item, "SEM UE"],
    ]);
    expect(com(vazia, P.conteudo)).toBe("");
    expect(com(vazia, P.conferencia)).toBe("");
  });
  it("instrutor em texto livre é aceito e vai para o pé do cartão", () => {
    const com = avaliarCom([
      [vazia, P.cod, "I"],
      [vazia, P.item, 1],
      [vazia, P.instrutor, "Professor convidado"],
    ]);
    expect(com(vazia, P.pe)).toBe("Professor convidado · 1 TA · Sala 1 · AE");
  });
  it("`FR-019` · as listas de escolha vêm dos nomes definidos e só avisam", () => {
    expect(aba.validacoes.map((v) => v.fonte)).toEqual([
      { tipo: "nome", nome: "LISTA_COD" },
      { tipo: "nome", nome: "LISTA_ITEM" },
      { tipo: "nome", nome: "LISTA_INSTRUTORES" },
    ]);
  });
});

describe("I-P11 · mudar o catálogo muda as linhas SUGERIDAS e nenhuma ESCRITA (`SC-006`, `D-4`)", () => {
  it("o tópico do item I|1 trocado no catálogo", () => {
    const { itens } = itensDoCatalogo(insumo);
    const linhaDoItem = B_PRIMEIRA_LINHA + itens.findIndex((i) => i.chave === "I|1");
    const com = avaliarCom([[linhaDoItem, B.conteudo, "Tópico trocado"]], ABA.catalogo);
    const sugerida = linhaDoTa(g, SEMANA.s15, 0, 4);
    const escrita = linhaDoTa(g, SEMANA.s15, 4, 1);
    expect(com(sugerida, P.conteudo)).toBe("Tópico trocado");
    expect(com(escrita, P.conteudo)).toBe("Aula sem UE");
  });
});

/*
 * ⚠️ **FR-011.1 da spec 016 · O CASO DE REGRESSÃO DO DIA DE 7 TA** (Q-8, Bernardo Villas Boas,
 * 17/10/2026: *"o caso de regressão entra assim mesmo"*). A forma medida: regime de 7, quatro TA de
 * manhã (o relógio B, de 50 min a partir das 08:10), e um bloco de 1 a 7 — o que atravessa o almoço. Ele
 * passa de primeira, porque não há defeito a corrigir (FR-011.2); o que guarda é que os sete tempos
 * continuem na entrada quando a grade mudar.
 */
describe("FR-011.1 · o dia de 7 TA, com o bloco que atravessa o almoço, entra inteiro", () => {
  const terca = 1;
  const semanas = SEMANAS.map((s) =>
    s.numero === 17
      ? {
          ...s,
          lancamentos: [
            ...s.lancamentos,
            {
              id: "b7",
              dia: terca,
              ta: 1,
              tempos: 7,
              origem: "aula" as const,
              disciplina: "I",
              ue: 1,
              conteudo: "Tópico I-1",
              tecnica: "Aula expositiva",
              instrutor: "CT Instrutor Alfa",
              local: "Sala 1",
            },
          ],
        }
      : s,
  );
  const comSete = insumoSintetico({ semanas });
  const { pasta: pastaSete, entrada: gSete } = montarPlanilhaComGeometria(comSete);
  const abaSete = pastaSete.abas[0] as Pasta["abas"][number];

  it("controle: o relógio B tem 7 tempos e 4 de manhã", () => {
    expect(RELOGIO_B.temposDoRegime).toBe(7);
    expect(RELOGIO_B.tempos.filter((t) => t.periodo === "manha")).toHaveLength(4);
  });

  it("as 7 linhas do dia trazem o lançamento — as 4 da manhã e as 3 da tarde", () => {
    for (let t = 1; t <= 7; t += 1) {
      const l = linhaDoTa(gSete, SEMANA.s17, terca, t);
      expect(celulaEm(abaSete, l, P.codigo)?.valor, `TA ${t}`).toBe("COD-b7");
      expect(celulaEm(abaSete, l, P.cod)?.valor, `TA ${t}`).toBe("I");
    }
    expect(linhaSemPosicao(gSete, SEMANA.s17, 1)).toBeGreaterThan(0);
    expect(
      [0, 1, 2]
        .map((i) => celulaEm(abaSete, linhaSemPosicao(gSete, SEMANA.s17, i), P.codigo)?.valor)
        .filter((c) => c === "COD-b7"),
      "o bloco de 7 TA caiu na lista sem posição",
    ).toEqual([]);
  });
});

/*
 * ⚠️ **FR-012.3 da spec 016 · O SEGUNDO NO MESMO TA, NA PLANILHA.** A grade o desvia para a faixa; a
 * planilha o recebe na lista sem posição da semana, com o motivo — e a linha do TA fica com o primeiro.
 */
describe("FR-012.3 · dois lançamentos no mesmo TA, na planilha", () => {
  const sexta = 4;
  const doisNoMesmoTa = SEMANAS.map((s) =>
    s.numero === 17
      ? {
          ...s,
          lancamentos: [
            ...s.lancamentos,
            {
              id: "m1",
              dia: sexta,
              ta: 1,
              tempos: 2,
              origem: "aula" as const,
              disciplina: "I",
              ue: 1,
              conteudo: "Tópico I-1",
              tecnica: "Aula expositiva",
              instrutor: "CT Instrutor Alfa",
              local: "Sala 1",
            },
            {
              id: "m2",
              dia: sexta,
              ta: 1,
              tempos: 2,
              origem: "aula" as const,
              disciplina: "I",
              ue: 2,
              conteudo: "Tópico I-2",
              tecnica: "Aula expositiva",
              instrutor: "CT Instrutor Alfa",
              local: "Sala 1",
            },
          ],
        }
      : s,
  );
  const comDois = insumoSintetico({ semanas: doisNoMesmoTa });
  const { pasta: pastaDois, entrada: gDois } = montarPlanilhaComGeometria(comDois);
  const abaDois = pastaDois.abas[0] as Pasta["abas"][number];

  it("a linha do TA fica com o primeiro, e o segundo vai para a lista sem posição com o motivo", () => {
    expect(celulaEm(abaDois, linhaDoTa(gDois, SEMANA.s17, sexta, 1), P.codigo)?.valor).toBe(
      "COD-m1",
    );
    const semPosicao = Array.from({ length: gDois.linhasSemPosicao }, (_, i) =>
      linhaSemPosicao(gDois, SEMANA.s17, i),
    ).map((l) => [celulaEm(abaDois, l, P.codigo)?.valor, celulaEm(abaDois, l, P.aviso)?.valor]);
    expect(semPosicao).toContainEqual(["COD-m2", MOTIVO_NO_MESMO_TA]);
  });
});

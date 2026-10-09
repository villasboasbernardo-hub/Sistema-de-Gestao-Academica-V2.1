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

import { insumoSintetico, numeroDaSemana } from "./planilha/sintetico";

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
  it("`FR-007` · o nº do DSA de cada semana é o de `numeroDoDsa` (fórmula, `DP-1`)", () => {
    insumo.semanas.forEach((s, k) => {
      expect(valor(linhaDoCabecalho(g, k), PC.numero)).toBe(numeroDaSemana(s.semana.numero) ?? "—");
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

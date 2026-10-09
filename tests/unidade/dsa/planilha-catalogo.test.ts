/**
 * O catálogo da turma (BD DISCIPLINAS) — `FR-008`, `FR-016`, `FR-019`, `FR-021`, `FR-029`, R-9, I-P6
 * e I-P9 da spec 015.
 */
import { describe, expect, it } from "vitest";

import { preencherLancamento } from "@/lib/dominio/dsa/pre-preenchimento";
import { siglaOuExtenso } from "@/lib/dominio/dsa/impressao";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";
import {
  abaDoCatalogo,
  chaveDoLancamento,
  itensDoCatalogo,
  listasDoCatalogo,
} from "@/lib/dominio/dsa/planilha/catalogo";
import { CATEGORIAS, NOME } from "@/lib/dominio/dsa/planilha/layout";

import {
  DISCIPLINAS,
  INSTRUTORES,
  TECNICAS,
  UNIDADES,
  insumoSintetico,
} from "./planilha/sintetico";

const insumo = insumoSintetico();
const { itens } = itensDoCatalogo(insumo);
const porChave = new Map(itens.map((i) => [i.chave, i]));

describe("`FR-008` · os itens de cada disciplina e as categorias", () => {
  it("disciplinas na ordem natural (romano pelo valor): I, II, IV, IX", () => {
    const cods = [...new Set(itens.filter((i) => i.disciplina !== "").map((i) => i.cod))];
    expect(cods).toEqual(emOrdemNaturalDoCodigo(DISCIPLINAS, (d) => d.codigo).map((d) => d.codigo));
    expect(cods).toEqual(["I", "II", "IV", "IX"]);
  });

  it("em cada disciplina: UEs pelo número, SEM UE, avaliações, VISTA e AEC", () => {
    expect(itens.filter((i) => i.cod === "I").map((i) => String(i.item))).toEqual([
      "1",
      "2",
      "SEM UE",
      "Prova",
      "Trabalho",
      "VISTA",
      "AEC",
    ]);
  });

  it("`FR-021` · as categorias no vocabulário do sistema — `EI` é só a sigla impressa", () => {
    const categorias = itens.filter((i) => i.disciplina === "").map((i) => i.cod);
    expect(categorias).toEqual(CATEGORIAS);
    expect(categorias).not.toContain("EI");
    expect(porChave.get("Estudo Individual|—")?.te).toBe("EI");
  });

  it("I-P6 · chaves únicas e sem curinga", () => {
    const chaves = itens.map((i) => i.chave.toUpperCase());
    expect(new Set(chaves).size).toBe(chaves.length);
    expect(chaves.some((c) => /[*?~]/.test(c))).toBe(false);
  });
});

describe("R-9 · cada sugestão é a de `preencherLancamento`", () => {
  it.each(UNIDADES.map((u) => [u.id, u] as const))("UE %s", (_, ue) => {
    const d = DISCIPLINAS.find((x) => x.id === ue.disciplinaId);
    const p = preencherLancamento({
      disciplinaId: ue.disciplinaId,
      unidadeEnsinoId: ue.id,
      porUnidade: insumo.atribuicoesPorUe,
      porDisciplina: insumo.atribuicoesPorDisciplina,
      tecnicaSugerida: ue.tecnicaSugerida,
      topico: ue.topico,
      salaDaTurma: insumo.turma.salaAlocada,
    });
    const item = porChave.get(`${d?.codigo}|${ue.numero}`);
    expect(item).toMatchObject({
      conteudo: p.conteudo ?? "",
      local: p.local ?? "",
      te: siglaOuExtenso(p.tecnica, TECNICAS),
      instrutor: INSTRUTORES.find((i) => i.id === p.instrutorId)?.nomeNoDsa ?? "",
      chPrevista: ue.chPrevista,
    });
  });

  it("a cascata do instrutor: a atribuição POR UE vence a da disciplina", () => {
    expect(porChave.get("II|1")?.instrutor).toBe("CC Instrutor Bravo");
    expect(porChave.get("II|SEM UE")?.instrutor).toBe("CT Instrutor Alfa");
  });

  it("sem atribuição nenhuma, o instrutor fica VAZIO — nunca um nome plausível", () => {
    expect(porChave.get("IV|SEM UE")?.instrutor).toBe("");
  });

  it("SEM UE sai sem tópico, para digitar (`D-DSA-1`)", () => {
    expect(porChave.get("I|SEM UE")?.conteudo).toBe("");
  });

  it("técnica sem sigla vai por extenso (`siglaOuExtenso`)", () => {
    expect(porChave.get("II|1")?.te).toBe("Estudo dirigido");
  });
});

describe("R-6 · o que conta no nº do DSA e na CH vem do gerador, pela origem do sistema", () => {
  it("aula e avaliação contam no nº; vista, AEC e as categorias não", () => {
    const conta = (k: string) => porChave.get(k)?.contaNoNumero;
    expect([conta("I|1"), conta("I|SEM UE"), conta("I|Prova")]).toEqual([true, true, true]);
    expect([
      conta("I|VISTA"),
      conta("I|AEC"),
      conta("TAD|—"),
      conta("Estudo Individual|—"),
    ]).toEqual([false, false, false, false]);
  });
  it("a CH: todo item com disciplina na ocupação — a AEC não (ela só se exibe)", () => {
    expect(porChave.get("I|VISTA")?.disciplinaDaCh).toBe("I");
    expect(porChave.get("I|AEC")?.disciplinaDaCh).toBe("");
    expect(porChave.get("I|AEC")?.disciplina).toBe("I");
  });
});

describe("a chave de um lançamento do sistema", () => {
  it("cada origem no seu item", () => {
    const base = { codigo: null, unidadeNumero: null, tipoAvaliacao: null, categoria: null };
    expect(
      chaveDoLancamento({ ...base, origem: "aula", disciplinaCodigo: "I", unidadeNumero: 2 }),
    ).toEqual({ cod: "I", item: 2 });
    expect(chaveDoLancamento({ ...base, origem: "aula", disciplinaCodigo: "I" })).toEqual({
      cod: "I",
      item: "SEM UE",
    });
    expect(chaveDoLancamento({ ...base, origem: "vista_prova", disciplinaCodigo: "I" })).toEqual({
      cod: "I",
      item: "VISTA",
    });
    expect(
      chaveDoLancamento({
        ...base,
        origem: "atividade_nao_letiva",
        disciplinaCodigo: "II",
        categoria: "AEC",
      }),
    ).toEqual({
      cod: "II",
      item: "AEC",
    });
    expect(
      chaveDoLancamento({
        ...base,
        origem: "atividade_nao_letiva",
        disciplinaCodigo: null,
        categoria: "Estudo_Individual",
      }),
    ).toEqual({
      cod: "Estudo Individual",
      item: "—",
    });
  });
});

describe("`FR-019`, `FR-029` · as listas de escolha", () => {
  const { nomes } = abaDoCatalogo({
    insumo,
    itens,
    rotulosDasSemanas: ["Semana 15"],
    chaveDaSemanaDoInicio: 202615,
  });

  it("COD e ITEM saem do catálogo", () => {
    const listas = listasDoCatalogo(itens);
    expect(listas.cods).toEqual(["I", "II", "IV", "IX", ...CATEGORIAS]);
    expect(listas.itens.slice(0, 2)).toEqual([1, 2]);
  });

  it("I-P9 · a lista de instrutores é só a da turma, na ordem recebida (antiguidade)", () => {
    const lista = nomes.find((n) => n.nome === NOME.listaInstrutores);
    expect(lista ? lista.ate.linha - lista.de.linha + 1 : 0).toBe(INSTRUTORES.length);
  });
});

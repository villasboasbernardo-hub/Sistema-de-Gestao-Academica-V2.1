/**
 * O quadro de avaliações de uma turma: por disciplina, o previsto (aula + avaliação = CH), a projeção, os itens
 * do currículo com a situação de cada um, as avaliações lançadas sem item ligado — e, para o card, o «N de M».
 *
 * ⚠️ **NÃO HÁ REGRA NOVA AQUI.** Este módulo só COMPÕE as funções puras que decidem: `previstoDaDisciplina`
 *    (FR-031.10), `projecaoDaDisciplina` (FR-031.11), `situacaoDaAvaliacao` (FR-050, o ponto único da situação,
 *    R-8) e `contagemDeAvaliacoes` (FR-056). Uma segunda conta em qualquer tela divergiria desta.
 * ⚠️ **A AVALIAÇÃO SE LIGA AO ITEM PELO VÍNCULO EXPLÍCITO** (`avaliacao_curriculo_id`, FR-039). A que não tem
 *    vínculo (o histórico, e o que o DSA lançou antes do PR 5.1) aparece à parte, como «lançada sem item do
 *    currículo», com a situação dela — nunca casada por ordem nem por nome (FR-039.1 só vale para o histórico
 *    da v2.0, em `historico.ts`).
 * ⚠️ TypeScript puro (Princípio II): tudo chega por parâmetro, `hoje` inclusive.
 */

import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

import { contagemDeAvaliacoes, type ContagemDeAvaliacoes } from "./contagem";
import { previstoDaDisciplina, type ItemDoCurriculo, type PrevistoDaDisciplina } from "./previsto";
import { projecaoDaDisciplina, type ProjecaoDaDisciplina } from "./projecao";
import {
  situacaoDaAvaliacao,
  type NaturezaDaAvaliacao,
  type SituacaoDaAvaliacao,
} from "./situacao";

export type DisciplinaDoQuadro = {
  id: string;
  cod: string;
  nome: string;
  ch: number;
  /** TA executados na turma (aula + aplicação + vista), de `vw_disciplinas_execucao`. */
  cumprido: number;
  /** A disciplina já teve lançamento na turma / está concluída (critério do painel da disciplina). */
  iniciada: boolean;
  concluida: boolean;
  unidades: { id: string; rotulo: string; ch: number }[];
};

export type ItemDoQuadro = ItemDoCurriculo & { id: string; disciplinaId: string; ordem: number };

export type AvaliacaoDoQuadro = {
  id: string;
  disciplinaId: string;
  itemId: string | null;
  tipo: string;
  natureza: NaturezaDaAvaliacao;
  aplicacao: string | null;
  estadoDoRegistro: string;
  sessoesDeVista: string[];
};

export type LinhaDeItem = {
  rotulo: string;
  natureza: NaturezaDaAvaliacao;
  tempo: number | null;
  marca: string;
  origemDaUe: string | null;
  situacao: SituacaoDaAvaliacao | null;
  aplicacao: string | null;
};

export type DisciplinaNoQuadro = {
  disciplina: DisciplinaDoQuadro;
  previsto: PrevistoDaDisciplina;
  projecao: ProjecaoDaDisciplina;
  itens: LinhaDeItem[];
  semItem: { tipo: string; aplicacao: string | null; situacao: SituacaoDaAvaliacao | null }[];
  aplicadas: number;
  previstas: number;
};

export type QuadroDeAvaliacoes = {
  disciplinas: DisciplinaNoQuadro[];
  contagem: ContagemDeAvaliacoes;
};

const APLICADA = new Set<SituacaoDaAvaliacao>(["concluida", "em_andamento", "atrasada"]);

export function quadroDeAvaliacoesDaTurma(entrada: {
  disciplinas: readonly DisciplinaDoQuadro[];
  itens: readonly ItemDoQuadro[];
  avaliacoes: readonly AvaliacaoDoQuadro[];
  prazoDias: number;
  hoje: string;
  terminoDaTurma: string | null;
}): QuadroDeAvaliacoes {
  const situacaoDe = (a: AvaliacaoDoQuadro, temItemDeVista: boolean) =>
    situacaoDaAvaliacao({
      natureza: a.natureza,
      estadoDoRegistro: a.estadoDoRegistro,
      aplicacao: a.aplicacao,
      sessoesDeVista: a.sessoesDeVista,
      temItemDeVista,
      prazoDias: entrada.prazoDias,
      hoje: entrada.hoje,
      terminoDaTurma: entrada.terminoDaTurma,
    });

  const disciplinas: DisciplinaNoQuadro[] = [];
  const paraContagem: {
    disciplinaId: string;
    natureza: NaturezaDaAvaliacao;
    situacao: SituacaoDaAvaliacao | null;
  }[] = [];
  const porDisciplina: Parameters<typeof contagemDeAvaliacoes>[0]["disciplinas"][number][] = [];

  for (const d of emOrdemNaturalDoCodigo(entrada.disciplinas, (x) => x.cod)) {
    const itens = entrada.itens
      .filter((i) => i.disciplinaId === d.id)
      .sort((a, b) => a.ordem - b.ordem);
    const avaliacoes = entrada.avaliacoes.filter((a) => a.disciplinaId === d.id);
    const previsto = previstoDaDisciplina({ ch: d.ch, unidades: d.unidades, itens });

    const linhas: LinhaDeItem[] = itens.map((item, n) => {
      const prevista = previsto.itens[n]!;
      const ligada = avaliacoes.find((a) => a.itemId === item.id && situacaoDe(a, true) !== null);
      const situacao =
        item.natureza === "od"
          ? situacaoDaAvaliacao({
              natureza: "od",
              aplicacao: null,
              sessoesDeVista: [],
              temItemDeVista: false,
              prazoDias: entrada.prazoDias,
              hoje: entrada.hoje,
              terminoDaTurma: entrada.terminoDaTurma,
              disciplinaIniciada: d.iniciada,
              disciplinaConcluida: d.concluida,
            })
          : ligada
            ? situacaoDe(ligada, (prevista.taVista ?? 0) > 0)
            : situacaoDaAvaliacao({
                natureza: item.natureza,
                aplicacao: null,
                sessoesDeVista: [],
                temItemDeVista: (prevista.taVista ?? 0) > 0,
                prazoDias: entrada.prazoDias,
                hoje: entrada.hoje,
                terminoDaTurma: entrada.terminoDaTurma,
              });
      return {
        rotulo: prevista.rotulo,
        natureza: prevista.natureza,
        tempo: prevista.tempo,
        marca: prevista.marca,
        origemDaUe: prevista.origemDaUe,
        situacao,
        aplicacao: ligada?.aplicacao ?? null,
      };
    });

    const semItem = avaliacoes
      .filter((a) => a.itemId === null || !itens.some((i) => i.id === a.itemId))
      .map((a) => ({ tipo: a.tipo, aplicacao: a.aplicacao, situacao: situacaoDe(a, true) }))
      .filter((a) => a.situacao !== null);

    // ⚠️ A avaliação APLICADA sem item ligado (o DSA antes do PR 5.1, a carga antes do PR 6) consome um item
    //    pendente na projeção — sem isso, a disciplina com a prova feita acusaria estouro falso. O item NÃO é
    //    marcado como aplicado: o vínculo é explícito (FR-039), e a lista o mostra pendente até ele existir.
    const aplicadasSemItem = semItem.filter((a) => a.situacao && APLICADA.has(a.situacao)).length;
    const pendentes = linhas.filter(
      (l) => l.natureza !== "od" && !(l.situacao && APLICADA.has(l.situacao)),
    );
    const aindaNao = pendentes.slice(0, Math.max(0, pendentes.length - aplicadasSemItem));
    const projecao = projecaoDaDisciplina({
      ch: d.ch,
      cumprido: d.cumprido,
      faltam: aindaNao.map((l) => ({ rotulo: l.rotulo, tempo: l.tempo })),
    });

    const provasETrabalhos = itens.filter((i) => i.natureza !== "od");
    const arbitrada = provasETrabalhos.some(
      (i) => i.origemTaAplicacao === "arbitrado" || i.origemTaAplicacao === "sugestao_planilha",
    );
    porDisciplina.push({
      id: d.id,
      quantidadeCurriculo:
        provasETrabalhos.length > 0 && !arbitrada ? provasETrabalhos.length : null,
      quantidadeArbitrada:
        provasETrabalhos.length > 0 && arbitrada ? provasETrabalhos.length : null,
      quantidadeOd: itens.filter((i) => i.natureza === "od").length,
      vistasPrevistas: previsto.itens.filter((i) => (i.taVista ?? 0) > 0).length,
      vistasRealizadas: avaliacoes.filter(
        (a) => a.sessoesDeVista.length > 0 && situacaoDe(a, true) !== null,
      ).length,
    });
    for (const a of avaliacoes)
      paraContagem.push({
        disciplinaId: d.id,
        natureza: a.natureza,
        situacao: situacaoDe(a, true),
      });

    const aplicadas = avaliacoes.filter(
      (a) => a.natureza !== "od" && APLICADA.has(situacaoDe(a, true) ?? "pendente"),
    ).length;
    disciplinas.push({
      disciplina: d,
      previsto,
      projecao,
      itens: linhas,
      semItem,
      aplicadas,
      previstas: provasETrabalhos.length,
    });
  }

  return {
    disciplinas,
    contagem: contagemDeAvaliacoes({ disciplinas: porDisciplina, avaliacoes: paraContagem }),
  };
}

/** A natureza de uma avaliação SEM item ligado, pelo tipo lançado (o histórico da v2.0 e o DSA de hoje). */
export function naturezaPeloTipo(tipo: string): NaturezaDaAvaliacao {
  const t = tipo.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (
    t.includes("trabalho") ||
    t.includes("projeto") ||
    t.includes("monografia") ||
    t.includes("estudo de caso")
  )
    return "trabalho";
  if (t.includes("observacao de desempenho")) return "od";
  return "prova";
}

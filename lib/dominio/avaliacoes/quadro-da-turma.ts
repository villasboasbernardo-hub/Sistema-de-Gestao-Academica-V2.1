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
 * ⚠️ **A VISTA É OBRIGATÓRIA PELO INSTRUMENTO, NÃO PELO TEMPO DE VISTA** (`RN-AV-13`, emenda de 15/10/2026; PE em
 *    16/10/2026): quem decide é `exigeVista` (`vista-obrigatoria.ts`), sobre a marca do banco — o instrumento do item
 *    ou, sem item, o da própria avaliação (`avaliacoes.instrumento_id`). Sem nenhum dos dois, exige, como antes.
 * ⚠️ **A PROVA EM N SESSÕES É UMA AVALIAÇÃO** (`RN-AV-12`): as sessões 2..N chegam em `sessoesDeAplicacao` e nunca
 *    contam como outra prova — no «N de M», no «X de Y» e no `alemDoPrevisto` (`RN-AV-14`).
 * ⚠️ **AS CANDIDATAS A «JUNTAR COMO SESSÃO»** saem daqui (`juntarEm`), não da tela: a mesma disciplina, viva, aplicada
 *    no mesmo dia ou antes, e sem sessões próprias. O banco confere de novo (`public.juntar_como_sessao`).
 * ⚠️ TypeScript puro (Princípio II): tudo chega por parâmetro, `hoje` inclusive.
 */

import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";

import { alemDoPrevisto, type AlemDoPrevisto } from "./alem-do-previsto";
import { contagemDeAvaliacoes, type ContagemDeAvaliacoes } from "./contagem";
import { previstoDaDisciplina, type ItemDoCurriculo, type PrevistoDaDisciplina } from "./previsto";
import { projecaoDaDisciplina, type ProjecaoDaDisciplina } from "./projecao";
import {
  situacaoDaAvaliacao,
  type NaturezaDaAvaliacao,
  type SituacaoDaAvaliacao,
} from "./situacao";
import { exigeVista, type InstrumentoDaVista } from "./vista-obrigatoria";

export type DisciplinaDoQuadro = {
  id: string;
  cod: string;
  nome: string;
  ch: number;
  /** TA executados na turma (aula + aplicação + vista) até hoje, de `execucao_por_disciplina_ate` (spec 016). */
  cumprido: number;
  /** A disciplina já teve lançamento na turma / está concluída (critério do painel da disciplina). */
  iniciada: boolean;
  concluida: boolean;
  unidades: { id: string; rotulo: string; ch: number }[];
};

export type ItemDoQuadro = ItemDoCurriculo & {
  id: string;
  disciplinaId: string;
  ordem: number;
  /** O instrumento do item (`PM`, `PP`, `TG`…), com a marca do banco — é ele que diz se a vista é obrigatória. */
  instrumento: InstrumentoDaVista | null;
};

export type AvaliacaoDoQuadro = {
  id: string;
  disciplinaId: string;
  itemId: string | null;
  tipo: string;
  natureza: NaturezaDaAvaliacao;
  aplicacao: string | null;
  estadoDoRegistro: string;
  sessoesDeVista: string[];
  /** As sessões de aplicação 2..N ativas (`sessoes_de_aplicacao`, RN-AV-12), por data. */
  sessoesDeAplicacao?: string[];
  /** O instrumento da própria avaliação (`avaliacoes.instrumento_id`) — só vale sem item ligado. */
  instrumento?: InstrumentoDaVista | null;
};

/** Uma prova da disciplina em que esta avaliação pode ser juntada como sessão (decisão de 16/10/2026). */
export type ProvaParaJuntar = {
  readonly id: string;
  readonly rotulo: string;
  readonly aplicacao: string;
};

export type LinhaDeItem = {
  itemId: string;
  /** O tempo é do currículo (sem ajuste): no curso não se arbitra, só na turma. */
  tempoDeCurriculo: boolean;
  /** Sem UE: o currículo não diz de qual UE a avaliação sai (FR-031.3). */
  semUe: boolean;
  rotulo: string;
  natureza: NaturezaDaAvaliacao;
  tempo: number | null;
  marca: string;
  origemDaUe: string | null;
  situacao: SituacaoDaAvaliacao | null;
  aplicacao: string | null;
  /** A avaliação ligada ao item (para «juntar como sessão»), e quantas sessões de aplicação ela tem (1 = só a 1ª). */
  avaliacaoId: string | null;
  sessoes: number;
  juntarEm: ProvaParaJuntar[];
};

export type AvaliacaoSemItem = {
  id: string;
  tipo: string;
  instrumento: string | null;
  aplicacao: string | null;
  situacao: SituacaoDaAvaliacao | null;
  sessoes: number;
  juntarEm: ProvaParaJuntar[];
};

export type DisciplinaNoQuadro = {
  disciplina: DisciplinaDoQuadro;
  previsto: PrevistoDaDisciplina;
  projecao: ProjecaoDaDisciplina;
  itens: LinhaDeItem[];
  semItem: AvaliacaoSemItem[];
  aplicadas: number;
  previstas: number;
  /** `RN-AV-14`: os instrumentos aplicados além do que o currículo prevê — informação, nunca erro. */
  alemDoPrevisto: AlemDoPrevisto[];
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
  /*
   * ⚠️ RN-AV-13: a avaliação ligada a item exige vista pelo instrumento do item; sem item ligado (ou item de outra
   *    disciplina), o instrumento é desconhecido e ela exige, como antes da emenda.
   */
  const instrumentoDoItem = new Map(entrada.itens.map((i) => [i.id, i.instrumento] as const));
  /* O instrumento da avaliação: o do item ligado; sem item (ou item de fora da lista), o da própria avaliação. */
  const instrumentoDa = (a: AvaliacaoDoQuadro): InstrumentoDaVista | null =>
    (a.itemId !== null ? instrumentoDoItem.get(a.itemId) : undefined) ?? a.instrumento ?? null;
  const exigeVistaDa = (a: AvaliacaoDoQuadro): boolean =>
    exigeVista({ instrumento: instrumentoDa(a) });
  const situacaoDe = (a: AvaliacaoDoQuadro, temItemDeVista: boolean = exigeVistaDa(a)) =>
    situacaoDaAvaliacao({
      natureza: a.natureza,
      estadoDoRegistro: a.estadoDoRegistro,
      aplicacao: a.aplicacao,
      sessoesDeVista: a.sessoesDeVista,
      sessoesDeAplicacao: a.sessoesDeAplicacao ?? [],
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
    const rotuloDoItem = new Map(itens.map((i, n) => [i.id, previsto.itens[n]!.rotulo] as const));
    /*
     * As provas da disciplina em que outra pode ser juntada (decisão de 16/10/2026): vivas, aplicadas, de prova ou
     * trabalho. A candidata de cada avaliação é a aplicada no MESMO DIA OU ANTES, que não é ela.
     */
    const provasVivas = avaliacoes.filter(
      (a) => a.natureza !== "od" && a.aplicacao !== null && situacaoDe(a) !== null,
    );
    const rotuloDaProva = (a: AvaliacaoDoQuadro): string =>
      (a.itemId && rotuloDoItem.get(a.itemId)) || instrumentoDa(a)?.valor || a.tipo;
    const juntarEm = (a: AvaliacaoDoQuadro): ProvaParaJuntar[] =>
      a.natureza === "od" || a.aplicacao === null || (a.sessoesDeAplicacao ?? []).length > 0
        ? []
        : provasVivas
            .filter((p) => p.id !== a.id && p.aplicacao! <= a.aplicacao!)
            .sort((x, y) =>
              x.aplicacao! < y.aplicacao! ? -1 : x.aplicacao! > y.aplicacao! ? 1 : 0,
            )
            .map((p) => ({ id: p.id, rotulo: rotuloDaProva(p), aplicacao: p.aplicacao! }));

    const linhas: LinhaDeItem[] = itens.map((item, n) => {
      const prevista = previsto.itens[n]!;
      const ligada = avaliacoes.find((a) => a.itemId === item.id && situacaoDe(a) !== null);
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
            ? situacaoDe(ligada, exigeVista({ instrumento: item.instrumento }))
            : situacaoDaAvaliacao({
                natureza: item.natureza,
                aplicacao: null,
                sessoesDeVista: [],
                temItemDeVista: exigeVista({ instrumento: item.instrumento }),
                prazoDias: entrada.prazoDias,
                hoje: entrada.hoje,
                terminoDaTurma: entrada.terminoDaTurma,
              });
      return {
        itemId: item.id,
        tempoDeCurriculo: item.origemTaAplicacao === "curriculo" && !item.ajusteDaTurma,
        semUe: item.unidadeEnsinoId === null,
        rotulo: prevista.rotulo,
        natureza: prevista.natureza,
        tempo: prevista.tempo,
        marca: prevista.marca,
        origemDaUe: prevista.origemDaUe,
        situacao,
        aplicacao: ligada?.aplicacao ?? null,
        avaliacaoId: ligada?.id ?? null,
        sessoes: ligada ? 1 + (ligada.sessoesDeAplicacao ?? []).length : 0,
        juntarEm: ligada ? juntarEm(ligada) : [],
      };
    });

    const semItem: AvaliacaoSemItem[] = avaliacoes
      .filter((a) => a.itemId === null || !itens.some((i) => i.id === a.itemId))
      .map((a) => ({
        id: a.id,
        tipo: a.tipo,
        instrumento: instrumentoDa(a)?.valor ?? null,
        aplicacao: a.aplicacao,
        situacao: situacaoDe(a),
        sessoes: 1 + (a.sessoesDeAplicacao ?? []).length,
        juntarEm: juntarEm(a),
      }))
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
      /*
       * ⚠️ O «B» do card «vistas realizadas A de B» é o TEMPO de vista PREVISTO no currículo (FR-056), não a
       *    obrigação da `RN-AV-13`: um PP com tempo de vista conta em B, e um PM sem tempo, não. Não muda aqui.
       */
      vistasPrevistas: previsto.itens.filter((i) => (i.taVista ?? 0) > 0).length,
      vistasRealizadas: avaliacoes.filter(
        (a) => a.sessoesDeVista.length > 0 && situacaoDe(a) !== null,
      ).length,
    });
    for (const a of avaliacoes)
      paraContagem.push({
        disciplinaId: d.id,
        natureza: a.natureza,
        situacao: situacaoDe(a),
      });

    const aplicadas = avaliacoes.filter(
      (a) => a.natureza !== "od" && APLICADA.has(situacaoDe(a) ?? "pendente"),
    ).length;
    disciplinas.push({
      disciplina: d,
      previsto,
      projecao,
      itens: linhas,
      semItem,
      aplicadas,
      previstas: provasETrabalhos.length,
      alemDoPrevisto: alemDoPrevisto({
        itens: itens.map((i) => ({
          instrumento: i.instrumento?.valor ?? null,
          natureza: i.natureza,
        })),
        avaliacoes: avaliacoes
          .map((a) => ({ a, situacao: situacaoDe(a) }))
          .filter(({ situacao }) => situacao !== null)
          .map(({ a, situacao }) => ({
            instrumento: instrumentoDa(a)?.valor ?? null,
            natureza: a.natureza,
            aplicada: APLICADA.has(situacao!),
          })),
      }),
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

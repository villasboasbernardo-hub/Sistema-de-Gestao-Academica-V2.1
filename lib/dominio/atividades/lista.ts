/**
 * RA-3, RA-4 e RA-7 (Bloco 18, spec 033, `FR-006.2` e `FR-006.4`) — a LISTA de atividades do módulo e da turma: o
 * recorte dos filtros e o endereço do *Editar*.
 *
 * > *"Lançamento de atividade no DSA ganha: tipo (RA-1), 'Conta como' (TA da disciplina escolhida / AEC / TAD / TR),
 * > vínculo opcional com uma AEC prevista ou uma APOINST planejada (…). 'Conta como TA da disciplina' soma na CH da
 * > disciplina e do instrutor, como aula."* (RA-4)
 * > *"Palestra fora do currículo entra sem vínculo e CONTA no limite de AEC do currículo."* (RA-3)
 * > *"Tudo que é ligado a turma segue o ano da turma (RT-6); o seletor do cabeçalho filtra."* (RA-7)
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **A CLASSIFICAÇÃO DO FILTRO É COMO A LINHA CONTA** (`comoConta`), não só a categoria gravada: o «TA da disciplina»
 *    (`conta_como = 'CHD'`) mantém a categoria do tipo em `categoria_normativa` e SAI da AEC/TAD/TR — então filtrar por
 *    AEC é `categoria = AEC` **e** `conta_como` diferente de `CHD`, e filtrar por «TA da disciplina» é `conta_como = CHD`.
 *    Contar o «TA da disciplina» na AEC seria o defeito que a `RN-EVT-01` proíbe (*"AEC não conta para a CHD"*).
 * ⚠️ **O VÍNCULO É UM SÓ, E PODE SER DE DOIS LUGARES**: a AEC prevista do currículo **ou** a APOINST planejada. «Do
 *    currículo» é qualquer um dos dois; «avulsa» é nenhum (RA-3).
 * ⚠️ **O RECORTE É DE MEMÓRIA, SOBRE AS LINHAS DO ANO** já lidas (RT-6, pelo ano da turma): a lista e as estatísticas
 *    contam AS MESMAS linhas, e a regra de cada filtro mora aqui, testada, em vez de espalhada em predicados do banco.
 * ⚠️ **O RESPONSÁVEL É TEXTO CONTIDO NO NOME QUE A TELA MOSTRA** — o do instrutor do cadastro ou o «Nome (OM)» do
 *    externo —, sem maiúsculas nem acentos.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import {
  comoConta,
  type CategoriaDeAtividade,
  type ComoConta,
  type ContaComo,
} from "@/lib/dominio/categoria-pelo-tipo";
import { compararCodigoNatural } from "@/lib/dominio/ordem-natural";
import type { TetosDaTurma } from "@/lib/dominio/tetos-da-turma";

import type { AtividadeParaEstatistica } from "./estatisticas";

/** Uma atividade da lista, já com o tipo pelo rótulo, a turma, o curso e o responsável resolvidos. */
export type AtividadeDaLista = {
  readonly id: string;
  readonly codigo: string;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly categoria: CategoriaDeAtividade;
  readonly contaComo: ContaComo | null;
  /** O VALOR do tipo (a chave do catálogo); na linha histórica sem tipo, o `subtipo`. */
  readonly tipoValor: string | null;
  /** O RÓTULO do tipo (decisão 4: «Atividade Extraclasse»); nulo, a tela mostra o valor. */
  readonly tipoRotulo: string | null;
  /** Nulo na atividade de todas as turmas. */
  readonly turmaId: string | null;
  readonly turmaCodigo: string | null;
  readonly cursoCodigo: string | null;
  readonly descricao: string | null;
  readonly alunos: number | null;
  /** O nome que a tela mostra: o do instrutor do cadastro, ou «Nome (OM)» do externo. */
  readonly responsavel: string | null;
  readonly local: string | null;
  /** `disciplinas.codigo` (único) — é o valor do filtro. */
  readonly disciplinaCodigo: string | null;
  /** `disciplinas.cod_disciplina` («IX») — a ordem das opções do filtro (ordem natural, romano pelo valor). */
  readonly disciplinaCod: string | null;
  /** `«I — Navegação»` — o que a tela mostra. */
  readonly disciplinaRotulo: string | null;
  readonly atividadePrevistaId: string | null;
  readonly apoinstId: string | null;
  /** O nome da AEC prevista ou da APOINST que a linha cumpre (quando a leitura alcançou). */
  readonly vinculoNome: string | null;
};

export const VALORES_DO_VINCULO = ["do_curriculo", "avulsa"] as const;
export type Vinculo = (typeof VALORES_DO_VINCULO)[number];

export const ROTULO_DO_VINCULO: Readonly<Record<Vinculo, string>> = {
  do_curriculo: "Do currículo",
  avulsa: "Avulsa",
};

/** O que a URL pede. Vazio = sem o filtro. As datas chegam já conferidas como ISO. */
export type FiltroDaLista = {
  readonly turma: string;
  readonly curso: string;
  /** Uma categoria da lista (AEC, TAD, TR, Apoio_Individualizado) ou `CHD` («TA da disciplina»). */
  readonly categoria: string;
  /** O VALOR do tipo no catálogo. */
  readonly tipo: string;
  readonly de: string;
  readonly ate: string;
  /** `disciplinas.codigo`. */
  readonly disciplina: string;
  readonly vinculo: string;
  readonly responsavel: string;
};

export const FILTRO_VAZIO: FiltroDaLista = {
  turma: "",
  curso: "",
  categoria: "",
  tipo: "",
  de: "",
  ate: "",
  disciplina: "",
  vinculo: "",
  responsavel: "",
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function texto(valor: unknown): string {
  return valor === null || valor === undefined ? "" : String(valor).trim();
}

/**
 * O filtro a partir dos valores da URL (já validados pelo contrato). A data fora de ISO cai para vazia — o campo é
 * `type="date"`, e um valor estranho na URL não pode virar predicado.
 */
export function filtroDaUrl(valores: Readonly<Record<string, unknown>>): FiltroDaLista {
  const data = (v: unknown) => (DATA_ISO.test(texto(v)) ? texto(v) : "");
  return {
    turma: texto(valores.turma),
    curso: texto(valores.curso),
    categoria: texto(valores.categoria),
    tipo: texto(valores.tipo),
    de: data(valores.de),
    ate: data(valores.ate),
    disciplina: texto(valores.disciplina),
    vinculo: texto(valores.vinculo),
    responsavel: texto(valores.responsavel),
  };
}

/** Há algum filtro? (o estado vazio diz «neste recorte»). */
export function haFiltro(filtro: FiltroDaLista): boolean {
  return Object.values(filtro).some((v) => v !== "");
}

/** Como a linha conta — a classificação da coluna, do filtro e das estatísticas. */
export function classificacaoDaLinha(
  linha: Pick<AtividadeDaLista, "categoria" | "contaComo">,
): ComoConta {
  return comoConta(linha.categoria, linha.contaComo);
}

/** A linha cumpre algo planejado (a AEC prevista ou a APOINST)? */
export function vinculoDaLinha(
  linha: Pick<AtividadeDaLista, "atividadePrevistaId" | "apoinstId">,
): Vinculo {
  return linha.atividadePrevistaId !== null || linha.apoinstId !== null ? "do_curriculo" : "avulsa";
}

/** Para comparar texto: sem maiúsculas, sem acento, sem espaço sobrando. */
export function paraBusca(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** O filtro de classificação: AEC/TAD/TR/Apoio pela categoria SEM o «TA da disciplina»; «CHD», só ele. */
export function passaNaClassificacao(
  linha: Pick<AtividadeDaLista, "categoria" | "contaComo">,
  categoria: string,
): boolean {
  if (categoria === "") return true;
  return classificacaoDaLinha(linha) === categoria;
}

/** A linha passa em todos os filtros? */
export function passaNoFiltro(linha: AtividadeDaLista, filtro: FiltroDaLista): boolean {
  if (filtro.turma !== "" && linha.turmaCodigo !== filtro.turma) return false;
  if (filtro.curso !== "" && linha.cursoCodigo !== filtro.curso) return false;
  if (!passaNaClassificacao(linha, filtro.categoria)) return false;
  if (filtro.tipo !== "" && linha.tipoValor !== filtro.tipo) return false;
  if (filtro.de !== "" && linha.data < filtro.de) return false;
  if (filtro.ate !== "" && linha.data > filtro.ate) return false;
  if (filtro.disciplina !== "" && linha.disciplinaCodigo !== filtro.disciplina) return false;
  if (filtro.vinculo !== "" && vinculoDaLinha(linha) !== filtro.vinculo) return false;
  if (filtro.responsavel !== "") {
    const termo = paraBusca(filtro.responsavel);
    if (termo !== "" && !paraBusca(linha.responsavel ?? "").includes(termo)) return false;
  }
  return true;
}

export function filtrarAtividades(
  linhas: readonly AtividadeDaLista[],
  filtro: FiltroDaLista,
): AtividadeDaLista[] {
  return linhas.filter((l) => passaNoFiltro(l, filtro));
}

/**
 * As opções de disciplina do filtro: as que aparecem nas linhas, sem repetir — pelo curso e, dentro dele, pelo código
 * da disciplina em ordem natural, com o romano pelo valor (*"nos seletores de disciplina (…) sempre por ordem
 * alfabética do código, em ordem natural"* — Bernardo Villas Boas, 08/10/2026, `ordem-natural.ts`).
 */
export function disciplinasDasLinhas(
  linhas: readonly AtividadeDaLista[],
  comCurso: boolean,
): { readonly valor: string; readonly rotulo: string }[] {
  const vistas = new Map<string, { rotulo: string; curso: string; cod: string }>();
  for (const l of linhas) {
    if (l.disciplinaCodigo === null || vistas.has(l.disciplinaCodigo)) continue;
    const rotulo = l.disciplinaRotulo ?? l.disciplinaCodigo;
    vistas.set(l.disciplinaCodigo, {
      rotulo: comCurso && l.cursoCodigo ? `${l.cursoCodigo} · ${rotulo}` : rotulo,
      curso: comCurso ? (l.cursoCodigo ?? "") : "",
      cod: l.disciplinaCod ?? l.disciplinaCodigo,
    });
  }
  return [...vistas.entries()]
    .sort(
      ([, a], [, b]) =>
        a.curso.localeCompare(b.curso, "pt-BR", { numeric: true }) ||
        compararCodigoNatural(a.cod, b.cod),
    )
    .map(([valor, v]) => ({ valor, rotulo: v.rotulo }));
}

/**
 * A semana do DSA em que a atividade foi lançada — o *Editar* da lista abre o DSA nela (`FR-006.4`: *"a edição é do
 * DSA, RP-0/RP-9"*). O sábado vai junto quando o lançamento é de sábado, para a coluna aparecer aberta.
 */
export function semanaParaEditar(
  data: string,
): { readonly semana: number; readonly ano: number; readonly sabado: boolean } | null {
  const semana = semanaIsoDe(data);
  if (semana === null) return null;
  const sabado = datasDaSemanaIso(semana.ano, semana.numero)[5] === data;
  return { semana: semana.numero, ano: semana.ano, sabado };
}

/**
 * As turmas ACIMA DO MÁXIMO de AEC, TAD ou TR — lidas do veredito de `tetosDaTurma` (SC-003 da spec 014), nunca de uma
 * comparação feita aqui. É o texto que acompanha as barras do uso do limite.
 */
export function acimaDoMaximo(
  tetos: ReadonlyArray<{ readonly turmaCodigo: string; readonly tetos: TetosDaTurma }>,
): {
  readonly turmaCodigo: string;
  readonly categoria: "aec" | "tad" | "tr";
  readonly cumprido: number;
  readonly maximo: number;
}[] {
  const saida: {
    turmaCodigo: string;
    categoria: "aec" | "tad" | "tr";
    cumprido: number;
    maximo: number;
  }[] = [];
  for (const { turmaCodigo, tetos: t } of tetos) {
    if (t.ead) continue;
    for (const categoria of ["aec", "tad", "tr"] as const) {
      const card = t.cards[categoria];
      if (!card.alertas.includes("acima_do_maximo") || typeof card.maximo !== "object") continue;
      saida.push({ turmaCodigo, categoria, cumprido: card.cumprido, maximo: card.maximo.valor });
    }
  }
  return saida;
}

/** A linha da lista na forma das estatísticas (`estatisticasDeAtividades`): o tipo sem valor vira «Sem tipo informado». */
export function paraEstatistica(l: AtividadeDaLista): AtividadeParaEstatistica {
  return {
    codigo: l.codigo,
    data: l.data,
    turmaCodigo: l.turmaCodigo,
    cursoCodigo: l.cursoCodigo,
    tipoValor: l.tipoValor ?? "Sem tipo informado",
    tipoRotulo: l.tipoRotulo,
    categoria: l.categoria,
    contaComo: l.contaComo,
    ta: l.tempos ?? 0,
    local: l.local,
  };
}

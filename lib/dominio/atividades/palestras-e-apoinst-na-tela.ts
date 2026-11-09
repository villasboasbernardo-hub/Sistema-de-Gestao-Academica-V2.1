/**
 * RA-5, RA-6, RA-7 e RA-9 (Bloco 18, spec 033) — as LINHAS das abas Palestras e APOINST (turma, DSA e módulo), os
 * filtros delas e os números das estatísticas.
 *
 * > *"RA-5 Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (data, palestrante, local vêm do lançamento)
 * > OU marcada à mão pelo trio (…). RA-6 (…) Situação: Planejada · Em andamento (tem lançamento) · Concluída (TA lançados
 * > ≥ previstos ou marcada à mão com justificativa) · Atrasada (passou o fim previsto sem concluir). Comparar previsto ×
 * > realizado (datas e TA). RA-7 Tudo que é ligado a turma segue o ano da turma (RT-6). RA-9 (…) palestras previstas
 * > cumpridas N de M, com data, palestrante e local; (…) APOINST por situação."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **AQUI NÃO SE DECIDE SITUAÇÃO**: ela já chega pronta de `quadroDasPrevistas` e `quadroDaApoinst` (o veredito único).
 *    Este módulo só junta as turmas, filtra e conta — a tela não faz conta nenhuma.
 * ⚠️ **A TURMA ARQUIVADA CONTA** (RT-8): ela fica nas linhas e nos números; quem a tira é só a lista de OPÇÕES do filtro
 *    de turma (`opcoesDeTurma`), e quem desliga as ações dela é a tela.
 * ⚠️ **A AVULSA NÃO TEM SITUAÇÃO** (RA-3): é palestra dada fora do currículo — com o filtro de situação, ela sai; com o
 *    de vínculo «do currículo», também. Ela conta no limite de AEC pela categoria, não aqui.
 * ⚠️ **AVULSA É A PALESTRA SEM VÍNCULO NENHUM** — nem AEC prevista, nem APOINST (achado da revisão do Bloco 18; a mesma
 *    regra de `vinculoDaLinha` da lista de Atividades). E o lançamento vinculado a uma AEC prevista que SAIU do quadro
 *    (desativada, ou de outro currículo) entra aqui também, com a marca `vinculo` — sem isso ele sumia da aba, embora
 *    continue contando no limite e na lista de Atividades.
 * ⚠️ **SÓ A QUE CONTA COMO AEC ENTRA NO LIMITE DE AEC** (`comoConta`, o mesmo predicado da view: categoria AEC e «Conta
 *    como» diferente de «TA da disciplina»): a palestra que o operador fez contar como TAD, TR ou TA da disciplina é
 *    mostrada com o como conta, e fica fora de `taDasAvulsasNaAec`.
 * ⚠️ **A APOINST DESATIVADA APARECE, MAS NÃO CONTA** (o `porSituacao` de `quadroDaApoinst` já é só das ativas); com
 *    filtro de situação, ela sai.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  CATEGORIAS_DE_ATIVIDADE,
  comoConta,
  contaComoDoBanco,
  type CategoriaDeAtividade,
  type ComoConta,
} from "@/lib/dominio/categoria-pelo-tipo";

import {
  ROTULO_DA_SITUACAO_DA_APOINST,
  SITUACOES_DA_APOINST,
  type LinhaDaApoinst,
  type SituacaoDaApoinst,
} from "./apoinst";
import {
  ROTULO_DA_SITUACAO_DA_PREVISTA,
  ehCumprida,
  type LinhaDaPrevista,
  type QuadroDasPrevistas,
  type SituacaoDaPrevista,
} from "./previstas";

/** A turma, como as abas a conhecem. */
export type TurmaDaAba = {
  readonly id: string;
  readonly codigo: string;
  /** A sigla do curso (o filtro «Curso» e a coluna do módulo). */
  readonly cursoCodigo: string;
  readonly arquivada: boolean;
};

/** Uma AEC prevista NUMA turma (a mesma prevista aparece em toda turma do mesmo currículo). */
export type LinhaDePalestra = LinhaDaPrevista & {
  /** `turmaId:previstaId` — a chave da linha na tabela. */
  readonly chave: string;
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly cursoCodigo: string;
  readonly turmaArquivada: boolean;
};

/**
 * Por que a linha está FORA do quadro das previstas: sem vínculo nenhum (a avulsa de verdade), ou vinculada a uma AEC
 * prevista que não está no quadro da turma — desativada, ou de outro currículo (a turma trocou de currículo).
 */
export type VinculoDaAvulsa = "nenhum" | "prevista_desativada" | "prevista_de_outro_curriculo";

/** A marca que a tela mostra ao lado da avulsa vinculada; `null` na avulsa sem vínculo. */
export const MARCA_DO_VINCULO_DA_AVULSA: Readonly<Record<VinculoDaAvulsa, string | null>> = {
  nenhum: null,
  prevista_desativada: "vinculada a AEC prevista desativada",
  prevista_de_outro_curriculo: "vinculada a AEC prevista de outro currículo",
};

/** A palestra lançada sem vínculo (fora do currículo) — o formato do leitor compartilhado. */
export type AvulsaNaTela = {
  readonly codigo: string;
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly data: string;
  readonly ta: number;
  readonly responsavel: string | null;
  readonly local: string | null;
  readonly descricao: string | null;
  /** Como a linha conta (AEC, TAD, TR, TA da disciplina); `null` quando a categoria gravada não é de atividade. */
  readonly comoConta: ComoConta | null;
  /** Sem vínculo, ou vinculada a AEC prevista fora do quadro (`MARCA_DO_VINCULO_DA_AVULSA`). */
  readonly vinculo: VinculoDaAvulsa;
};

/** Como a linha conta, a partir do que o banco gravou (`categoria_normativa`, `conta_como`). */
export function comoContaDaLinha(
  categoria: string | null | undefined,
  contaComo: string | null | undefined,
): ComoConta | null {
  if (!(CATEGORIAS_DE_ATIVIDADE as readonly string[]).includes(categoria ?? "")) return null;
  return comoConta(categoria as CategoriaDeAtividade, contaComoDoBanco(contaComo ?? null));
}

/**
 * O lançamento vinculado a uma AEC prevista: `null` quando ela está no quadro da turma (as ATIVAS do currículo dela);
 * senão, por que está fora — e ele vai para as avulsas com a marca, em vez de sumir.
 */
export function vinculoForaDoQuadro(
  previstaId: string,
  ativasDaTurma: ReadonlySet<string>,
  desativadas: ReadonlySet<string>,
): Exclude<VinculoDaAvulsa, "nenhum"> | null {
  if (ativasDaTurma.has(previstaId)) return null;
  return desativadas.has(previstaId) ? "prevista_desativada" : "prevista_de_outro_curriculo";
}

export type AvulsaDaAba = AvulsaNaTela & { readonly cursoCodigo: string };

export type LinhaDeApoinst = LinhaDaApoinst & {
  readonly cursoCodigo: string;
  readonly turmaArquivada: boolean;
};

/** As situações que o filtro da aba Palestras oferece («Cumprida» junta a cumprida pelo DSA e a à mão). */
export const SITUACOES_DO_FILTRO_DE_PALESTRAS = ["a_cumprir", "em_andamento", "cumprida"] as const;
export type SituacaoNoFiltroDePalestras = (typeof SITUACOES_DO_FILTRO_DE_PALESTRAS)[number];

export const ROTULO_DA_SITUACAO_NO_FILTRO_DE_PALESTRAS: Readonly<
  Record<SituacaoNoFiltroDePalestras, string>
> = {
  a_cumprir: "A cumprir",
  em_andamento: "Em andamento",
  cumprida: "Cumprida",
};

export function situacaoNoFiltroDePalestras(s: SituacaoDaPrevista): SituacaoNoFiltroDePalestras {
  return ehCumprida(s) ? "cumprida" : s === "em_andamento" ? "em_andamento" : "a_cumprir";
}

/** O valor da URL é uma situação DESTA aba? (o parâmetro `situacao` é um só para Palestras e APOINST). */
export function situacaoDePalestraValida(valor: string): valor is SituacaoNoFiltroDePalestras {
  return (SITUACOES_DO_FILTRO_DE_PALESTRAS as readonly string[]).includes(valor);
}

export function situacaoDeApoinstValida(valor: string): valor is SituacaoDaApoinst {
  return (SITUACOES_DA_APOINST as readonly string[]).includes(valor);
}

/** As linhas de todas as turmas, na ordem das turmas recebida, e dentro dela a do currículo. */
export function linhasDePalestras(
  turmas: readonly TurmaDaAba[],
  quadros: ReadonlyMap<string, QuadroDasPrevistas>,
): LinhaDePalestra[] {
  return turmas.flatMap((t) =>
    (quadros.get(t.id)?.linhas ?? []).map((l) => ({
      ...l,
      chave: `${t.id}:${l.id}`,
      turmaId: t.id,
      turmaCodigo: t.codigo,
      cursoCodigo: t.cursoCodigo,
      turmaArquivada: t.arquivada,
    })),
  );
}

/** As avulsas com o curso da turma — só as das turmas recebidas, pela ordem delas e depois pela data. */
export function avulsasDaAba(
  turmas: readonly TurmaDaAba[],
  avulsas: readonly AvulsaNaTela[],
): AvulsaDaAba[] {
  const posicao = new Map(turmas.map((t, i) => [t.id, i]));
  const curso = new Map(turmas.map((t) => [t.id, t.cursoCodigo]));
  return avulsas
    .filter((a) => posicao.has(a.turmaId))
    .map((a) => ({ ...a, cursoCodigo: curso.get(a.turmaId) ?? "" }))
    .sort(
      (a, b) =>
        (posicao.get(a.turmaId) ?? 0) - (posicao.get(b.turmaId) ?? 0) ||
        a.data.localeCompare(b.data) ||
        a.codigo.localeCompare(b.codigo),
    );
}

/** As APOINST com o curso e a marca de turma arquivada; a ordem é a do quadro (início previsto). */
export function linhasDeApoinst(
  turmas: readonly TurmaDaAba[],
  linhas: readonly LinhaDaApoinst[],
): LinhaDeApoinst[] {
  const porId = new Map(turmas.map((t) => [t.id, t]));
  return linhas
    .filter((l) => porId.has(l.turmaId))
    .map((l) => ({
      ...l,
      cursoCodigo: porId.get(l.turmaId)?.cursoCodigo ?? "",
      turmaArquivada: porId.get(l.turmaId)?.arquivada ?? false,
    }));
}

export type FiltroDePalestras = {
  readonly turma: string;
  readonly curso: string;
  readonly situacao: string;
  readonly vinculo: string;
};

export function filtrarPalestras(
  entrada: {
    readonly linhas: readonly LinhaDePalestra[];
    readonly avulsas: readonly AvulsaDaAba[];
  },
  filtro: FiltroDePalestras,
): { readonly linhas: LinhaDePalestra[]; readonly avulsas: AvulsaDaAba[] } {
  const situacao = situacaoDePalestraValida(filtro.situacao) ? filtro.situacao : "";
  const daTurma = <T extends { readonly turmaCodigo: string; readonly cursoCodigo: string }>(
    x: T,
  ) =>
    (filtro.turma === "" || x.turmaCodigo === filtro.turma) &&
    (filtro.curso === "" || x.cursoCodigo === filtro.curso);
  const linhas =
    filtro.vinculo === "avulsa"
      ? []
      : entrada.linhas.filter(
          (l) =>
            daTurma(l) && (situacao === "" || situacaoNoFiltroDePalestras(l.situacao) === situacao),
        );
  const avulsas =
    filtro.vinculo === "do_curriculo" || situacao !== "" ? [] : entrada.avulsas.filter(daTurma);
  return { linhas, avulsas };
}

export type FiltroDaApoinst = {
  readonly turma: string;
  readonly curso: string;
  readonly situacao: string;
};

export function filtrarApoinst(
  linhas: readonly LinhaDeApoinst[],
  filtro: FiltroDaApoinst,
): LinhaDeApoinst[] {
  const situacao = situacaoDeApoinstValida(filtro.situacao) ? filtro.situacao : "";
  return linhas.filter(
    (l) =>
      (filtro.turma === "" || l.turmaCodigo === filtro.turma) &&
      (filtro.curso === "" || l.cursoCodigo === filtro.curso) &&
      (situacao === "" || (l.ativa && l.situacao === situacao)),
  );
}

export type Fatia = { readonly nome: string; readonly valor: number };

export type NumerosDasPalestras = {
  /** As previstas (do currículo de cada turma) — o M do «N de M». */
  readonly previstas: number;
  /** Cumpridas pelo DSA ou à mão — o N do «N de M». */
  readonly cumpridas: number;
  readonly cumpridasAMao: number;
  readonly emAndamento: number;
  readonly aCumprir: number;
  readonly obrigatoriasPendentes: number;
  readonly avulsas: number;
  /** Os TA de TODAS as avulsas, como quer que contem. */
  readonly taDasAvulsas: number;
  /** Só os das que contam como AEC — os que entram no limite de AEC do currículo. */
  readonly taDasAvulsasNaAec: number;
  /** A pizza por situação: só as fatias com valor (a de zero não tem área), na ordem da situação. */
  readonly porSituacao: readonly Fatia[];
};

export function numerosDasPalestras(
  linhas: readonly LinhaDePalestra[],
  avulsas: readonly AvulsaDaAba[],
): NumerosDasPalestras {
  const conta = (s: SituacaoDaPrevista) => linhas.filter((l) => l.situacao === s).length;
  const porSituacao = (["a_cumprir", "em_andamento", "cumprida", "cumprida_a_mao"] as const)
    .map((s) => ({ nome: ROTULO_DA_SITUACAO_DA_PREVISTA[s], valor: conta(s) }))
    .filter((f) => f.valor > 0);
  return {
    previstas: linhas.length,
    cumpridas: linhas.filter((l) => ehCumprida(l.situacao)).length,
    cumpridasAMao: conta("cumprida_a_mao"),
    emAndamento: conta("em_andamento"),
    aCumprir: conta("a_cumprir"),
    obrigatoriasPendentes: linhas.filter((l) => l.obrigatoria && !ehCumprida(l.situacao)).length,
    avulsas: avulsas.length,
    taDasAvulsas: avulsas.reduce((s, a) => s + a.ta, 0),
    taDasAvulsasNaAec: avulsas.reduce((s, a) => s + (a.comoConta === "AEC" ? a.ta : 0), 0),
    porSituacao,
  };
}

/**
 * O detalhe do cartão «Fora do currículo»: os TA que contam no limite de AEC — e, quando há, os das que contam de outro
 * jeito (o «Conta como» do lançamento), para o cartão não prometer ao limite o que a view soma em TAD, TR ou CHD.
 */
export function fraseDosTaDasAvulsas(numeros: {
  readonly taDasAvulsas: number;
  readonly taDasAvulsasNaAec: number;
}): string {
  const outros = numeros.taDasAvulsas - numeros.taDasAvulsasNaAec;
  if (outros <= 0) return `${numeros.taDasAvulsasNaAec} TA — contam no limite de AEC`;
  return (
    `${numeros.taDasAvulsasNaAec} TA contam no limite de AEC · ${outros} TA contam como TAD, TR ou TA da ` +
    `disciplina`
  );
}

export type NumerosDaApoinst = {
  /** Só das ATIVAS (a desativada aparece, mas não conta). */
  readonly ativas: number;
  readonly desativadas: number;
  readonly porSituacao: Readonly<Record<SituacaoDaApoinst, number>>;
  readonly taPrevistos: number;
  readonly taLancados: number;
  readonly fatias: readonly Fatia[];
};

export function numerosDaApoinst(linhas: readonly LinhaDeApoinst[]): NumerosDaApoinst {
  const ativas = linhas.filter((l) => l.ativa);
  const porSituacao = Object.fromEntries(
    SITUACOES_DA_APOINST.map((s) => [s, ativas.filter((l) => l.situacao === s).length]),
  ) as Record<SituacaoDaApoinst, number>;
  return {
    ativas: ativas.length,
    desativadas: linhas.length - ativas.length,
    porSituacao,
    taPrevistos: ativas.reduce((s, l) => s + l.taPrevistos, 0),
    taLancados: ativas.reduce((s, l) => s + l.taLancados, 0),
    fatias: SITUACOES_DA_APOINST.map((s) => ({
      nome: ROTULO_DA_SITUACAO_DA_APOINST[s],
      valor: porSituacao[s],
    })).filter((f) => f.valor > 0),
  };
}

/**
 * As opções do filtro de TURMA: sem a arquivada (RT-8: ela some das listas de escolha), com a contagem de linhas
 * (já com os outros filtros — quem chama passa as linhas do recorte sem o filtro de turma).
 */
export function opcoesDeTurma(
  turmas: readonly TurmaDaAba[],
  contagem: (turmaCodigo: string) => number,
): ReadonlyArray<{ readonly valor: string; readonly rotulo: string; readonly contagem: number }> {
  return turmas
    .filter((t) => !t.arquivada)
    .map((t) => ({ valor: t.codigo, rotulo: t.codigo, contagem: contagem(t.codigo) }));
}

/** As opções do filtro de CURSO: os cursos das turmas do ano, sem repetir, na ordem das turmas. */
export function opcoesDeCurso(
  turmas: readonly TurmaDaAba[],
  contagem: (cursoCodigo: string) => number,
): ReadonlyArray<{ readonly valor: string; readonly rotulo: string; readonly contagem: number }> {
  const vistos = new Set<string>();
  const saida: { valor: string; rotulo: string; contagem: number }[] = [];
  for (const t of turmas) {
    if (t.cursoCodigo === "" || vistos.has(t.cursoCodigo)) continue;
    vistos.add(t.cursoCodigo);
    saida.push({ valor: t.cursoCodigo, rotulo: t.cursoCodigo, contagem: contagem(t.cursoCodigo) });
  }
  return saida;
}

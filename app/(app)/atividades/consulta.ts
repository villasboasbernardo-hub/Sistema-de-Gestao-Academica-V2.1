/**
 * A leitura de `/atividades` (spec 014, PR 2, `FR-063`).
 *
 * ⚠️ **UMA CONSULTA, COM A TURMA PELO `join`**, e o filtro de turma pelo código dela. A atividade
 *    global não tem turma: o filtro de turma a deixa de fora, e sem filtro ela aparece como *"Todas as
 *    turmas com DSA"* (FR-013).
 * ⚠️ **O TETO DE LINHAS É DECLARADO, NÃO SILENCIOSO**: 500 por página de consulta, com a frase na tela
 *    quando a lista bate nele.
 */
export const LIMITE_DE_ATIVIDADES = 500;

export const COLUNAS_DAS_ATIVIDADES =
  "codigo, data, ta_inicial, tempos_consumidos, categoria_normativa, subtipo, escopo, descricao, quantidade_alunos, turmas(codigo)";

export const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  AEC: "AEC",
  TAD: "TAD",
  TR: "TR",
  Estudo_Individual: "Estudo Individual",
  Apoio_Individualizado: "Apoio Individualizado",
};

export type LinhaDaAtividade = {
  readonly codigo: string;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  readonly categoria: string;
  readonly tipo: string | null;
  readonly turma: string | null;
  /** Nula só no Estudo Individual sem «O que é» (spec 029, FR-002, D-5); a tela mostra «—». */
  readonly descricao: string | null;
  readonly alunos: number | null;
};

type Bruta = {
  codigo: string;
  data: string;
  ta_inicial: number | null;
  tempos_consumidos: number | null;
  categoria_normativa: string;
  subtipo: string | null;
  escopo: string;
  descricao: string | null;
  quantidade_alunos: number | null;
  turmas: { codigo: string } | null;
};

export function paraLinhas(brutas: readonly Bruta[]): LinhaDaAtividade[] {
  return brutas.map((b) => ({
    codigo: b.codigo,
    data: b.data,
    taInicial: b.ta_inicial,
    tempos: b.tempos_consumidos,
    categoria: b.categoria_normativa,
    tipo: b.subtipo,
    turma: b.escopo === "global" ? null : (b.turmas?.codigo ?? null),
    descricao: b.descricao,
    alunos: b.quantidade_alunos,
  }));
}

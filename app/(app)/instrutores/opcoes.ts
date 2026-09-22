/**
 * As opções dos filtros da listagem — **módulo comum, sem marcador de cliente** (`FR-025`).
 *
 * ⚠️ O DOMÍNIO DESTES QUATRO FILTROS É O DADO, e não uma lista escrita. As OMs cadastradas, as
 * categorias, as escolaridades e as qualificações de capacitação saem do cadastro inteiro — é a
 * correção de tipo registrada no contrato de parâmetros em 15/09/2026. Uma lista fixa esconderia a
 * OM nova que alguém acabou de cadastrar.
 *
 * ⚠️ AS OPÇÕES VÊM DO CADASTRO INTEIRO, E NÃO DO RECORTE. Refinar por OM não pode fazer sumir das
 * opções de categoria as que existem em outra OM: a pessoa perderia o caminho de volta sem limpar
 * tudo. Quem opera sobre o resultado do filtro anterior é a consulta, em E lógico.
 */
import { pesoAntiguidade, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { qualificacoesDe } from "@/lib/dominio/graficos-instrutor";

/** Uma opção cujo rótulo pode diferir do valor guardado na URL. */
export type OpcaoDeCurso = {
  readonly valor: string;
  readonly rotulo: string;
};

export type LinhaDasOpcoes = {
  readonly om: string | null;
  readonly categoria: string | null;
  readonly capacitacao_didatica: string | null;
  readonly nivel_escolaridade: string | null;
  readonly posto_graduacao: string | null;
};

export type OpcoesDosFiltros = {
  readonly om: readonly string[];
  readonly categoria: readonly string[];
  readonly capacitacao: readonly string[];
  readonly escolaridade: readonly string[];
  /** Os postos presentes no cadastro, em antiguidade (spec 015 da v2.0, `FR-008`). */
  readonly posto: readonly string[];
  /**
   * As siglas dos cursos cadastrados (spec 015, `FR-005`; spec 021, siglas).
   *
   * ⚠️ **AQUI O RÓTULO NÃO É O VALOR**, e é a única opção de filtro em que isso acontece: curso
   * inativo entra na lista — filtrar instrutor por curso arquivado é consulta sobre HISTÓRICO, e
   * escondê-lo tornaria o passado inalcançável (`FR-017.10` da spec 009) —, mas entra **depois dos
   * ativos** e **marcado**, para que ninguém escolha um curso fora de oferta achando que está em
   * oferta.
   */
  readonly curso: readonly OpcaoDeCurso[];
};

/** Valores distintos, sem vazio, em ordem alfabética — são nomes de OM e de nível, não pessoas. */
function distintos(valores: readonly (string | null)[]): string[] {
  const conjunto = new Set<string>();
  for (const v of valores) {
    const limpo = v?.trim() ?? "";
    if (limpo !== "") conjunto.add(limpo);
  }
  return [...conjunto].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * Os postos presentes, **em antiguidade** — nunca em ordem alfabética (`RN-ANT-01`: todo filtro de
 * instrutor segue a antiguidade). Posto que a escala não conhece vai para o fim.
 */
function postosEmAntiguidade(
  valores: readonly (string | null)[],
  escala: EscalaDeAntiguidade,
): string[] {
  const peso = (pg: string) => pesoAntiguidade(pg, escala) ?? Number.POSITIVE_INFINITY;
  return distintos(valores).sort((a, b) => peso(a) - peso(b) || a.localeCompare(b, "pt-BR"));
}

/**
 * Os cursos, **ativos primeiro e inativos depois**, cada grupo em ordem de sigla, com os inativos
 * marcados no rótulo (`FR-017.10` da spec 009).
 *
 * ⚠️ **A ORDENAÇÃO DO BANCO NÃO BASTA**: `order("codigo")` devolve tudo misturado, e um curso
 * arquivado apareceria no meio dos ativos, indistinguível. Até a migration 7 da spec 009 o problema
 * não existia porque o ALCANCE escondia curso inativo — a lista chegava aqui já sem eles.
 */
function cursosComInativosNoFim(
  cursos: readonly { readonly codigo: string; readonly status?: string | null }[],
): OpcaoDeCurso[] {
  const ordemDeSigla = (a: { codigo: string }, b: { codigo: string }) =>
    a.codigo.localeCompare(b.codigo, "pt-BR");
  const inativo = (c: { readonly status?: string | null }) => c.status === "inativo";

  return [
    ...cursos
      .filter((c) => !inativo(c))
      .sort(ordemDeSigla)
      .map((c) => ({
        valor: c.codigo,
        rotulo: c.codigo,
      })),
    ...cursos
      .filter(inativo)
      .sort(ordemDeSigla)
      .map((c) => ({
        valor: c.codigo,
        rotulo: `${c.codigo} — inativo`,
      })),
  ];
}

export function opcoesDosFiltros(
  linhas: readonly LinhaDasOpcoes[],
  cursos: readonly { readonly codigo: string; readonly status?: string | null }[],
  escala: EscalaDeAntiguidade,
): OpcoesDosFiltros {
  return {
    om: distintos(linhas.map((l) => l.om)),
    categoria: distintos(linhas.map((l) => l.categoria)),
    capacitacao: distintos(linhas.flatMap((l) => qualificacoesDe(l.capacitacao_didatica))),
    escolaridade: distintos(linhas.map((l) => l.nivel_escolaridade)),
    posto: postosEmAntiguidade(
      linhas.map((l) => l.posto_graduacao),
      escala,
    ),
    curso: cursosComInativosNoFim(cursos),
  };
}

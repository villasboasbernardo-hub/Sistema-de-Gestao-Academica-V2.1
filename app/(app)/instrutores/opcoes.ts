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
import { qualificacoesDe } from "@/lib/dominio/graficos-instrutor";

export type LinhaDasOpcoes = {
  readonly om: string | null;
  readonly categoria: string | null;
  readonly capacitacao_didatica: string | null;
  readonly nivel_escolaridade: string | null;
};

export type OpcoesDosFiltros = {
  readonly om: readonly string[];
  readonly categoria: readonly string[];
  readonly capacitacao: readonly string[];
  readonly escolaridade: readonly string[];
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

export function opcoesDosFiltros(linhas: readonly LinhaDasOpcoes[]): OpcoesDosFiltros {
  return {
    om: distintos(linhas.map((l) => l.om)),
    categoria: distintos(linhas.map((l) => l.categoria)),
    capacitacao: distintos(linhas.flatMap((l) => qualificacoesDe(l.capacitacao_didatica))),
    escolaridade: distintos(linhas.map((l) => l.nivel_escolaridade)),
  };
}

/**
 * A rubrica do DSA **como sai no papel** — a resolvida pela vigência e, por cima dela, o que foi
 * **editado na tela antes de imprimir** (`FR-036`, `RF-DSA-06` · spec 013).
 *
 * > *"Assinaturas editáveis na tela: os campos das duas assinaturas (nome, posto/graduação por
 * > extenso e função — do Auxiliar e do Encarregado) vêm preenchidos com o resolvido hoje e podem
 * > ser EDITADOS antes de imprimir (alguém assina no lugar de outro, ou a pessoa não está
 * > cadastrada). O que foi editado vai para a IMPRESSÃO. NÃO grava no cadastro nem no banco
 * > («imprimiu, imprimiu»)."*
 * > — conferência do PR #40, item 4, decisão de Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **NENHUMA REGRA DE RESOLUÇÃO MUDA.** Quem decide quem assina pela data da semana continua sendo
 * `assinaturasDoDsa` (`FR-036`, `FR-036.1`); este módulo só escreve a rubrica resolvida em texto —
 * a MESMA escrita para a tela e para o papel, que até aqui estava repetida nos dois componentes — e
 * aplica a edição por cima. A edição é **do documento impresso**, nunca de `responsaveis_curso`.
 *
 * ⚠️ **TEXTO LIVRE, COM LIMITE.** O valor editado chega pela URL da impressão, então o servidor o
 * trata como entrada não confiável: corta os espaços das pontas e o tamanho em `LIMITE_DO_CAMPO`.
 * Escapar é do React — nada aqui monta HTML.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II).
 */
import type { Assinatura } from "@/lib/dominio/dsa/assinaturas";

/** Um lado do rodapé: o Auxiliar à esquerda, o Encarregado à direita. */
export type LadoDaAssinatura = "esquerda" | "direita";

/** Os três campos de uma rubrica. */
export type CampoDaRubrica = "nome" | "posto" | "funcao";

/** A rubrica como sai escrita — três textos, `""` onde não há. */
export type RubricaDoDsa = {
  readonly nome: string;
  readonly posto: string;
  readonly funcao: string;
};

/** O que foi editado, por lado e por campo. Campo AUSENTE = vale o resolvido; `""` = sai vazio. */
export type EdicaoDasAssinaturas = {
  readonly [L in LadoDaAssinatura]?: { readonly [C in CampoDaRubrica]?: string };
};

export const LADOS_DA_ASSINATURA: readonly LadoDaAssinatura[] = ["esquerda", "direita"];
export const CAMPOS_DA_RUBRICA: readonly CampoDaRubrica[] = ["nome", "posto", "funcao"];

/**
 * O tamanho máximo de um campo editado. ⚠️ É **limite de entrada**, não regra de negócio: o nome
 * completo mais longo cabe com folga, e um valor maior só chega por endereço montado à mão.
 */
export const LIMITE_DO_CAMPO = 120;

/**
 * A rubrica resolvida, em texto — `null` quando não há responsável vigente (a linha sai em branco).
 *
 * ⚠️ Mesma leitura que os dois componentes faziam: no modo dinâmico assina **quem imprime**, sem
 * posto (`Q-14`); no fixo, o nome completo e o posto **por extenso** (item 7 de 08/10/2026).
 */
export function rubricaResolvida(
  assinatura: Assinatura | null,
  nomeDeQuemImprime: string | null,
): RubricaDoDsa | null {
  if (assinatura === null) return null;
  const dinamico = assinatura.resolvePeloUsuarioLogado;
  return {
    nome: dinamico ? (nomeDeQuemImprime ?? "") : (assinatura.nomeCompleto ?? ""),
    posto: dinamico ? "" : assinatura.postoPorExtenso,
    funcao: assinatura.funcaoDescricao,
  };
}

/** Um valor editado, limpo: pontas sem espaço e no máximo `LIMITE_DO_CAMPO` caracteres. */
export function limparCampo(valor: string): string {
  return valor.trim().slice(0, LIMITE_DO_CAMPO);
}

/**
 * A rubrica que vai para o papel: a resolvida, com os campos editados por cima.
 *
 * ⚠️ **SEM EDIÇÃO, É A RESOLVIDA — inclusive `null`.** Com edição sobre um lado sem responsável
 * vigente, os campos não editados saem vazios: é o caso de *"a pessoa não está cadastrada"*. Se
 * tudo ficar vazio, a linha volta a sair em branco (`null`), como sem responsável.
 */
export function rubricaComEdicao(
  resolvida: RubricaDoDsa | null,
  edicao: EdicaoDasAssinaturas[LadoDaAssinatura],
): RubricaDoDsa | null {
  if (edicao === undefined || CAMPOS_DA_RUBRICA.every((c) => edicao[c] === undefined)) {
    return resolvida;
  }
  const base = resolvida ?? { nome: "", posto: "", funcao: "" };
  const final: RubricaDoDsa = {
    nome: edicao.nome === undefined ? base.nome : limparCampo(edicao.nome),
    posto: edicao.posto === undefined ? base.posto : limparCampo(edicao.posto),
    funcao: edicao.funcao === undefined ? base.funcao : limparCampo(edicao.funcao),
  };
  return final.nome === "" && final.posto === "" && final.funcao === "" ? null : final;
}

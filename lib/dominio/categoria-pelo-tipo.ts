/**
 * A categoria de uma atividade vem do TIPO — `RF-EXTRA-01`, `RN-EVT-01` e `FR-010` da spec 014 (D-AA-3).
 *
 * > *"Fórmula normativa: **CHT = CHD + AEC + TAD + TR** (Estudo Individual não integra esta soma; é
 * > controlado à parte)."* — `RN-EVT-01`, documento 04 da Fase 1 (com a emenda E-9 de 14/10/2026: o
 * > Apoio Individualizado também fica fora)
 *
 * > *"Toda atividade não letiva tem um tipo da lista administrável, e o tipo decide a categoria
 * > normativa."* — `RF-EXTRA-01` (spec 014, FR-010)
 *
 * ⚠️ **O BANCO DECIDE DE NOVO NA GRAVAÇÃO** (`app.categoria_pelo_tipo`, E-1): esta função é a mesma regra
 *    do lado da tela — o que o formulário OFERECE e a categoria que ele MOSTRA antes de gravar. Tipo sem
 *    categoria ou de uso `aula` não é oferecido, e o banco o recusa se chegar.
 * ⚠️ TypeScript puro (regra 9).
 */
export const CATEGORIAS_DE_ATIVIDADE = [
  "AEC",
  "TAD",
  "TR",
  "Estudo_Individual",
  "Apoio_Individualizado",
] as const;
export type CategoriaDeAtividade = (typeof CATEGORIAS_DE_ATIVIDADE)[number];

export type TipoDeAtividade = {
  readonly id: string;
  readonly valor: string;
  readonly ativo: boolean;
  readonly metadados: { readonly categoria?: string | null; readonly uso?: string | null } | null;
};

/** A categoria do tipo, ou `null` quando o tipo não é de atividade (sem categoria, ou de aula). */
export function categoriaPeloTipo(tipo: TipoDeAtividade): CategoriaDeAtividade | null {
  if (tipo.metadados?.uso === "aula") return null;
  const c = tipo.metadados?.categoria ?? null;
  return c !== null && (CATEGORIAS_DE_ATIVIDADE as readonly string[]).includes(c)
    ? (c as CategoriaDeAtividade)
    : null;
}

/** Os tipos que o formulário oferece: ativos e com categoria de atividade. */
export function tiposOferecidos(tipos: readonly TipoDeAtividade[]): TipoDeAtividade[] {
  return tipos.filter((t) => t.ativo && categoriaPeloTipo(t) !== null);
}

/** Estudo Individual e Apoio Individualizado ficam fora da CHT. */
export function foraDaCht(categoria: CategoriaDeAtividade): boolean {
  return categoria === "Estudo_Individual" || categoria === "Apoio_Individualizado";
}

/** O rótulo que a tela mostra. */
export const ROTULO_DA_CATEGORIA_DE_ATIVIDADE: Readonly<Record<CategoriaDeAtividade, string>> = {
  AEC: "AEC",
  TAD: "TAD",
  TR: "TR",
  Estudo_Individual: "Estudo Individual",
  Apoio_Individualizado: "Apoio Individualizado",
};

/** A frase da descrição que falta — a mesma do esquema de antes da spec 029, da ação e do `CHECK` traduzido. */
export const FRASE_DA_DESCRICAO_OBRIGATORIA = "Escreva o que é a atividade.";

/**
 * O «O que é» é obrigatório na categoria? **Só o Estudo Individual o dispensa** — spec 029, FR-002 *(decisão de
 * Bernardo Villas Boas, 27/10/2026; D-5 a D-7)*: *"Ao lançar ou editar um Estudo Individual, «O que é» é opcional — na
 * tela, na Server Action e no banco. Nas demais categorias (AEC, TAD, TR, Apoio Individualizado) continua obrigatório,
 * nas mesmas três camadas."*
 *
 * ⚠️ **É O PONTO ÚNICO DA REGRA NO TYPESCRIPT**: o `required` do formulário, a recusa do lançar
 *    (`recusaPelaCategoria`) e a da edição (`aplicarAtualizacao`) leem daqui. O banco tem o irmão,
 *    `ativ_descricao_fora_do_estudo_individual` (`20261028182926`, pgTAP `153`).
 */
export function descricaoObrigatoria(categoria: CategoriaDeAtividade): boolean {
  return categoria !== "Estudo_Individual";
}

/**
 * As regras da atividade que dependem da CATEGORIA — que agora sai do tipo, e por isso não cabem no
 * Zod (spec 014, FR-011). A ação as confere depois de ler o tipo; o banco tem os `CHECK` irmãos.
 *
 * - o «O que é» só falta no Estudo Individual (spec 029, FR-002; `ativ_descricao_fora_do_estudo_individual`). ⚠️ Até
 *   ali quem recusava a descrição vazia era o Zod, para TODA categoria — e o EI sem descrição nunca chegava à ação;
 * - só a AEC leva disciplina (`ativ_disciplina_so_aec_da_turma`, item 1b de 08/10/2026);
 * - o Estudo Individual é sempre de uma turma (`V-5`, `ativ_estudo_individual_de_turma`);
 * - a quantidade de alunos é só do Apoio Individualizado (FR-020).
 *
 * ⚠️ A descrição vem primeiro porque era o Zod — que roda antes de tudo — quem a recusava: a frase que a pessoa vê
 *    primeiro continua a mesma de antes da spec 029.
 */
export function recusaPelaCategoria(entrada: {
  readonly categoria: CategoriaDeAtividade;
  readonly turmaId: string | null;
  readonly disciplinaId: string | null;
  readonly quantidadeAlunos: number | null;
  /** Já aparada pelo esquema: vazia chega `null` (`textoOuNulo`). */
  readonly descricao: string | null;
}): { readonly campo: string; readonly mensagem: string } | null {
  if (
    descricaoObrigatoria(entrada.categoria) &&
    (entrada.descricao === null || entrada.descricao.trim() === "")
  ) {
    return { campo: "descricao", mensagem: FRASE_DA_DESCRICAO_OBRIGATORIA };
  }
  if (entrada.disciplinaId !== null && entrada.categoria !== "AEC") {
    return { campo: "disciplinaId", mensagem: "Só a AEC leva disciplina." };
  }
  if (entrada.categoria === "Estudo_Individual" && entrada.turmaId === null) {
    return { campo: "turmaId", mensagem: "Estudo Individual é sempre de uma turma." };
  }
  if (entrada.quantidadeAlunos !== null && entrada.categoria !== "Apoio_Individualizado") {
    return {
      campo: "quantidadeAlunos",
      mensagem: "A quantidade de alunos é só do Apoio Individualizado.",
    };
  }
  return null;
}

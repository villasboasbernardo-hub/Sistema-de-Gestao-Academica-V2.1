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

/**
 * As regras da atividade que dependem da CATEGORIA — que agora sai do tipo, e por isso não cabem no
 * Zod (spec 014, FR-011). A ação as confere depois de ler o tipo; o banco tem os `CHECK` irmãos.
 *
 * - só a AEC leva disciplina (`ativ_disciplina_so_aec_da_turma`, item 1b de 08/10/2026);
 * - o Estudo Individual é sempre de uma turma (`V-5`, `ativ_estudo_individual_de_turma`);
 * - a quantidade de alunos é só do Apoio Individualizado (FR-020).
 */
export function recusaPelaCategoria(entrada: {
  readonly categoria: CategoriaDeAtividade;
  readonly turmaId: string | null;
  readonly disciplinaId: string | null;
  readonly quantidadeAlunos: number | null;
}): { readonly campo: string; readonly mensagem: string } | null {
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

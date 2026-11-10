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

/**
 * RA-1 e RA-4 (Bloco 18, spec 033) — o «Conta como» que o operador escolhe no lançamento.
 *
 * > *"Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador pode trocar no lançamento."* (RA-1)
 * > *"'Conta como' (TA da disciplina escolhida / AEC / TAD / TR) (…) 'Conta como TA da disciplina' soma na CH da
 * > disciplina e do instrutor, como aula."* (RA-4) — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **É O ESPELHO DO GATILHO** `app.categoria_pelo_tipo` (M2, `20261103140512`): AEC/TAD/TR escolhidos viram a
 *    categoria da linha; **CHD** («TA da disciplina») e nulo ficam com a do tipo — o CHD sai da AEC/TAD/TR e entra na CHD
 *    pelas views, pela coluna `conta_como`. Tipo de Estudo Individual ou de Apoio Individualizado não troca (decisão 2:
 *    Monitoria continua Apoio Individualizado).
 */
export const CONTA_COMO = ["CHD", "AEC", "TAD", "TR"] as const;
export type ContaComo = (typeof CONTA_COMO)[number];

export const ROTULO_DO_CONTA_COMO: Readonly<Record<ContaComo, string>> = {
  CHD: "TA da disciplina",
  AEC: "AEC",
  TAD: "TAD",
  TR: "TR",
};

/** A classificação do tipo aceita o «Conta como»? Só os componentes da CHT (AEC, TAD, TR). */
export function aceitaContaComo(categoriaDoTipo: CategoriaDeAtividade | null): boolean {
  return categoriaDoTipo === "AEC" || categoriaDoTipo === "TAD" || categoriaDoTipo === "TR";
}

/** O que fica gravado em `categoria_normativa` — a mesma decisão do gatilho. */
export function categoriaEfetiva(
  categoriaDoTipo: CategoriaDeAtividade,
  contaComo: ContaComo | null,
): CategoriaDeAtividade {
  if (contaComo !== null && contaComo !== "CHD" && aceitaContaComo(categoriaDoTipo))
    return contaComo;
  return categoriaDoTipo;
}

/** Como a linha CONTA nas somas: o «TA da disciplina» é CHD; o resto, a categoria gravada. */
export type ComoConta = ContaComo | "Estudo_Individual" | "Apoio_Individualizado";

export function comoConta(categoria: CategoriaDeAtividade, contaComo: ContaComo | null): ComoConta {
  return contaComo === "CHD" ? "CHD" : categoria;
}

/** O rótulo de como a linha conta («TA da disciplina», «AEC», …, «Estudo Individual»). */
export function rotuloDeComoConta(como: ComoConta): string {
  return como === "Estudo_Individual" || como === "Apoio_Individualizado"
    ? ROTULO_DA_CATEGORIA_DE_ATIVIDADE[como]
    : ROTULO_DO_CONTA_COMO[como];
}

/** O valor lido do banco, ou `null` quando não é um «Conta como» conhecido. */
export function contaComoDoBanco(valor: string | null | undefined): ContaComo | null {
  return (CONTA_COMO as readonly string[]).includes(valor ?? "") ? (valor as ContaComo) : null;
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
 *    (`recusaPelaCategoria`) e a da edição (`recusaDaDescricaoNaEdicao`, chamada por `aplicarAtualizacao`) leem daqui.
 *    O banco tem o irmão, `ativ_descricao_fora_do_estudo_individual` (`20261028182926`, pgTAP `153`).
 */
export function descricaoObrigatoria(categoria: CategoriaDeAtividade): boolean {
  return categoria !== "Estudo_Individual";
}

/**
 * A recusa da EDIÇÃO que apaga o «O que é» — spec 029, FR-002.1: *"Ao lançar **ou editar** um Estudo Individual, «O que
 * é» é opcional (…). Nas demais categorias (…) continua obrigatório"*.
 *
 * ⚠️ **`undefined` É «NÃO MANDOU», `null` É «APAGUE»** (a regra do esquema da edição): só o apagar passa por aqui — a
 *    edição de outro campo não manda o «O que é» e nunca tropeça nesta regra. O texto só de espaços conta como apagado,
 *    como no lançar (o esquema já o apara para `null`; a conferência aqui não depende disso).
 * ⚠️ **A CATEGORIA É A DA LINHA GRAVADA**, e `null` quando o fato não é atividade (aula, avaliação): ali o campo é o
 *    tópico, com as regras dele, e esta função não se aplica.
 * ⚠️ **A FRASE É A MESMA DO LANÇAR** (`FRASE_DA_DESCRICAO_OBRIGATORIA`): sem esta recusa, a AEC apagada chegaria ao
 *    banco e voltaria com a frase do `CHECK` traduzido — outra, e depois de ler o teto e a cascata (achado 11 da revisão
 *    do Bloco 14).
 */
export function recusaDaDescricaoNaEdicao(entrada: {
  readonly categoria: CategoriaDeAtividade | null;
  /** O que a edição manda no «O que é»: `undefined` (não mandou), `null` (apague) ou o texto novo. */
  readonly conteudo: string | null | undefined;
}): { readonly campo: "conteudo"; readonly mensagem: string } | null {
  if (entrada.categoria === null || entrada.conteudo === undefined) return null;
  const apagado = entrada.conteudo === null || entrada.conteudo.trim() === "";
  return apagado && descricaoObrigatoria(entrada.categoria)
    ? { campo: "conteudo", mensagem: FRASE_DA_DESCRICAO_OBRIGATORIA }
    : null;
}

/**
 * As regras da atividade que dependem da CATEGORIA — que agora sai do tipo, e por isso não cabem no
 * Zod (spec 014, FR-011). A ação as confere depois de ler o tipo; o banco tem os `CHECK` irmãos.
 *
 * - o «O que é» só falta no Estudo Individual (spec 029, FR-002; `ativ_descricao_fora_do_estudo_individual`). ⚠️ Até
 *   ali quem recusava a descrição vazia era o Zod, para TODA categoria — e o EI sem descrição nunca chegava à ação;
 * - só a AEC leva disciplina (`ativ_disciplina_so_aec_da_turma`, item 1b de 08/10/2026) — e, desde o Bloco 18, o
 *   «TA da disciplina» (RA-4), que a EXIGE;
 * - o «Conta como» só nos tipos de AEC, TAD ou TR (RA-1; o gatilho recusa com `conta_como_fora_da_cht`);
 * - o Estudo Individual é sempre de uma turma (`V-5`, `ativ_estudo_individual_de_turma`);
 * - a quantidade de alunos é só do Apoio Individualizado (FR-020).
 *
 * ⚠️ A descrição vem primeiro porque era o Zod — que roda antes de tudo — quem a recusava: a frase que a pessoa vê
 *    primeiro continua a mesma de antes da spec 029.
 */
export function recusaPelaCategoria(entrada: {
  /** A categoria do TIPO (a classificação padrão), antes do «Conta como». */
  readonly categoria: CategoriaDeAtividade;
  readonly turmaId: string | null;
  readonly disciplinaId: string | null;
  readonly quantidadeAlunos: number | null;
  /** Já aparada pelo esquema: vazia chega `null` (`textoOuNulo`). */
  readonly descricao: string | null;
  /** RA-4 (Bloco 18): a classificação escolhida pelo operador; ausente = a do tipo. */
  readonly contaComo?: ContaComo | null;
}): { readonly campo: string; readonly mensagem: string } | null {
  const contaComo = entrada.contaComo ?? null;
  if (contaComo !== null && !aceitaContaComo(entrada.categoria)) {
    return {
      campo: "contaComo",
      mensagem:
        "Este tipo não conta como AEC, TAD, TR nem como TA da disciplina: a classificação dele não se troca.",
    };
  }
  const efetiva = categoriaEfetiva(entrada.categoria, contaComo);
  if (
    descricaoObrigatoria(efetiva) &&
    (entrada.descricao === null || entrada.descricao.trim() === "")
  ) {
    return { campo: "descricao", mensagem: FRASE_DA_DESCRICAO_OBRIGATORIA };
  }
  if (contaComo === "CHD" && (entrada.disciplinaId === null || entrada.turmaId === null)) {
    return { campo: "disciplinaId", mensagem: "«TA da disciplina» exige a disciplina da turma." };
  }
  if (entrada.disciplinaId !== null && efetiva !== "AEC" && contaComo !== "CHD") {
    return {
      campo: "disciplinaId",
      mensagem:
        contaComo === null
          ? "Só a AEC leva disciplina."
          : "Só a AEC e o «TA da disciplina» levam disciplina.",
    };
  }
  const categoria = efetiva;
  if (categoria === "Estudo_Individual" && entrada.turmaId === null) {
    return { campo: "turmaId", mensagem: "Estudo Individual é sempre de uma turma." };
  }
  if (entrada.quantidadeAlunos !== null && categoria !== "Apoio_Individualizado") {
    return {
      campo: "quantidadeAlunos",
      mensagem: "A quantidade de alunos é só do Apoio Individualizado.",
    };
  }
  return null;
}

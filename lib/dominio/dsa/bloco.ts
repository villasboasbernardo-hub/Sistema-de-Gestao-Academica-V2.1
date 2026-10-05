/**
 * O **bloco** — a unidade de lançamento do DSA, e o contrato do Épico 12 (`FR-040`).
 *
 * > *"A spec DEVE descrever o lançamento como um dado («bloco»: turma, data, TA inicial, tempos,
 * > tipo, disciplina/UE, instrutor, técnica, local, conteúdo) que uma função pura consegue produzir
 * > e que a mesma Server Action do lançamento manual consegue gravar."*
 * > — pedido de **Bernardo Villas Boas**, 05/10/2026, spec 013
 *
 * ⚠️ **ESTE TIPO É A FRONTEIRA ENTRE DUAS FATIAS, e é por isso que ele mora aqui e não no Zod.** O
 * formulário do PR 2 produz um `Bloco`; o motor de sugestão do **Épico 12** vai produzir uma lista
 * deles; e **a mesma** Server Action grava os dois. `lib/validacao/dsa.ts` é este tipo em Zod — a
 * validação escrita uma vez, aplicada nos dois lados. Se o motor precisasse de um tipo próprio,
 * haveria dois caminhos de gravação, e o segundo divergiria.
 *
 * ⚠️ **O QUE ESTE MÓDULO VALIDA É SÓ O QUE NÃO DEPENDE DO BANCO.** Habilitação (`RN-INST-01`),
 * alcance, curso em oferta e a isenção de UE por curso **são do servidor** — e a recusa deles chega
 * traduzida (`contracts/lancamento.md`). Aqui ficam as regras que uma função pura consegue decidir
 * com o que recebe: faixa de TA, formato de data, UE **ou** disciplina, fiscal interno **ou**
 * externo, e o tópico obrigatório da aula sem UE.
 *
 * ⚠️ **AS OPCIONAIS SÃO `?: T | undefined`, E ISSO NÃO É REDUNDANTE AQUI.** O projeto roda com
 * `exactOptionalPropertyTypes` **ligado**, onde `?: T` significa *"a chave pode faltar"* e **recusa**
 * `undefined` escrito à mão. Mas o formulário e o motor do Épico 12 montam o bloco por espalhamento,
 * e espalhar um campo vazio produz `undefined` explícito. ⚠️ **O modo de falha é o do gotcha 1: o
 * Vitest passa e o `next build` reprova** — foi exatamente o que aconteceu ao escrever o teste deste
 * módulo em 05/10/2026. Declarar `| undefined` aceita as duas formas, que é o que o chamador precisa.
 *
 * ⚠️ **`data` é `string` `aaaa-mm-dd`, nunca `Date`** — a convenção da pasta inteira. `new
 * Date("2026-03-01")` é meia-noite **em UTC**, e em `America/Sao_Paulo` isso é 28/02: a grade
 * mostraria o dia anterior ao gravado, sem erro (ver `lib/formato/data.ts`).
 */

/**
 * As sete formas que um lançamento pode ter.
 *
 * ⚠️ **ELAS NÃO SÃO UMA LISTA LIVRE: são as cinco categorias da `RN-EVT-01` abertas em sete.** A CHD
 * se parte em `aula`, `avaliacao` e `vista_prova` porque as três gravam em lugares diferentes
 * (`registros_aula` e `avaliacoes`), e `estudo_individual` fica **fora** da fórmula
 * `CHT = CHD + AEC + TAD + TR` — o que o banco já garante por coluna gerada (`compoe_cht`).
 */
export type TipoDeBloco =
  "aula" | "avaliacao" | "vista_prova" | "aec" | "tad" | "tr" | "estudo_individual";

/** As que gravam em `avaliacoes`. */
const TIPOS_DE_AVALIACAO: readonly TipoDeBloco[] = ["avaliacao", "vista_prova"];

/** As que gravam em `atividades_nao_letivas` — as quatro da `categoria_normativa`. */
const TIPOS_NAO_LETIVOS: readonly TipoDeBloco[] = ["aec", "tad", "tr", "estudo_individual"];

/**
 * O fiscal de uma avaliação: **cadastrado ou de fora**, nunca os dois.
 *
 * ⚠️ **A FORMA DO TIPO É O QUE IMPEDE O DEFEITO QUE O `RF-AVAL-06` ADVERTE.** O requisito diz, com
 * essas palavras, que *"este é o requisito mais fácil de quebrar por acidente ao modelar em
 * PostgreSQL — a tentação de tornar o fiscal uma FK obrigatória para `instrutores` é forte e
 * **contraria a norma**"*. Uma união de dois objetos faz o "ou" ser decidido pelo compilador, e o
 * banco já tem o `CHECK aval_fiscal_exclusivo` para o mesmo fim (medido em 05/10/2026).
 */
export type Fiscal =
  | { readonly instrutorId: string; readonly nomeExterno?: never }
  | { readonly nomeExterno: string; readonly instrutorId?: never };

export type Bloco = {
  readonly turmaId: string;
  /** `aaaa-mm-dd`. Texto, nunca `Date`. */
  readonly data: string;
  /** 1 a 12 — a faixa do `CHECK reg_aula_ta_valido`, medida no banco. */
  readonly taInicial: number;
  /** 1 a 12. O fim do bloco é derivado (`horario-do-bloco.ts`), nunca escrito. */
  readonly tempos: number;
  readonly tipo: TipoDeBloco;
  /** Obrigatória em `aula`, `avaliacao` e `vista_prova`. */
  readonly disciplinaId?: string | undefined;
  /** Em `aula`: obrigatória, **salvo** disciplina isenta (`Q-1`) — e aí o `conteudo` é obrigatório. */
  readonly unidadeEnsinoId?: string | undefined;
  /** Em `aula`: obrigatório (`CHECK reg_aula_instrutor_obrigatorio`). Em avaliação: o responsável. */
  readonly instrutorId?: string | undefined;
  readonly fiscal?: Fiscal | undefined;
  /** Valor da lista `metodologias` — a que já existe (`H1` do analyze de 05/10/2026). */
  readonly tecnica?: string | undefined;
  readonly local?: string | undefined;
  /** Nasce do tópico da UE e é editável. **Obrigatório** quando a aula não tem UE. */
  readonly conteudo?: string | undefined;
  /** Valor da lista `tipos_atividade`, filtrado pela categoria (`H2`). Só nos tipos não letivos. */
  readonly subtipo?: string | undefined;
  /** Palestrante ou entidade de fora do cadastro (`Q-8`). Exclusivo com `instrutorId`. */
  readonly responsavelExterno?: string | undefined;
};

/**
 * O que o servidor sabe e o bloco não.
 *
 * ⚠️ **`disciplinaIsentaDeUe` CHEGA POR PARÂMETRO, e isso é o ponto.** Quem decide a isenção é o
 * banco, em `app.disciplina_sem_ue()` — curso por competências **ou** disciplina marcada sem UE
 * (`Q-1`). Um módulo puro não consulta banco (Princípio II), então ele **recebe** a resposta. Pôr a
 * regra aqui criaria um segundo lugar onde a isenção vive, e os dois divergiriam no dia em que um
 * curso mudasse de modelo.
 */
export type ContextoDoBloco = {
  readonly disciplinaIsentaDeUe: boolean;
};

export const TA_MINIMO = 1;
/** O teto do `CHECK reg_aula_ta_valido`/`ativ_ta_valido`/`aval_ta_valido`, medido no banco. */
export const TA_MAXIMO = 12;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export type BlocoConferido =
  { readonly ok: true } | { readonly ok: false; readonly motivos: readonly string[] };

/**
 * Confere o que não depende do banco. Devolve **todos** os motivos, não o primeiro.
 *
 * ⚠️ **TODOS, de propósito:** quem lança uma semana inteira corrige de uma vez; devolver o primeiro
 * motivo faz a pessoa gravar sete vezes para descobrir sete coisas. É a mesma escolha do
 * `avisosDaTurma` e do `avisosDoCurso`.
 */
export function blocoValido(bloco: Bloco, contexto: ContextoDoBloco): BlocoConferido {
  const motivos: string[] = [];

  if (!DATA_ISO.test(bloco.data)) {
    motivos.push("A data precisa estar no formato aaaa-mm-dd.");
  }
  if (
    !Number.isInteger(bloco.taInicial) ||
    bloco.taInicial < TA_MINIMO ||
    bloco.taInicial > TA_MAXIMO
  ) {
    motivos.push(`O tempo inicial precisa estar entre ${TA_MINIMO} e ${TA_MAXIMO}.`);
  }
  if (!Number.isInteger(bloco.tempos) || bloco.tempos < TA_MINIMO || bloco.tempos > TA_MAXIMO) {
    motivos.push(`A quantidade de tempos precisa estar entre ${TA_MINIMO} e ${TA_MAXIMO}.`);
  }
  if (
    Number.isInteger(bloco.taInicial) &&
    Number.isInteger(bloco.tempos) &&
    bloco.taInicial + bloco.tempos - 1 > TA_MAXIMO
  ) {
    motivos.push(`O bloco passa do ${TA_MAXIMO}º tempo.`);
  }

  /*
   * ⚠️ A AULA NÃO ENTRA AQUI, e isso é o ponto: quando ela tem UE, **a UE é a fonte da
   * disciplina** (`unidades_ensino.disciplina_id`), e cobrar `disciplinaId` recusaria toda aula
   * normal do sistema. A exigência da aula é condicional e mora em `motivosDaAula`. A avaliação e
   * a vista, ao contrário, têm `disciplina_id` **próprio e `NOT NULL`** em `avaliacoes` (medido).
   */
  if (TIPOS_DE_AVALIACAO.includes(bloco.tipo) && !bloco.disciplinaId) {
    motivos.push("Escolha a disciplina.");
  }

  if (bloco.tipo === "aula") {
    motivos.push(...motivosDaAula(bloco, contexto));
  }

  if (TIPOS_DE_AVALIACAO.includes(bloco.tipo)) {
    if (!bloco.instrutorId) motivos.push("Escolha o instrutor responsável pela avaliação.");
    if (bloco.fiscal && bloco.fiscal.instrutorId && bloco.fiscal.nomeExterno) {
      motivos.push("O fiscal é alguém do cadastro ou um nome de fora, nunca os dois.");
    }
  }

  if (TIPOS_NAO_LETIVOS.includes(bloco.tipo)) {
    motivos.push(...motivosDaAtividade(bloco));
  } else if (bloco.subtipo !== undefined) {
    motivos.push("Subtipo só existe em AEC, TAD, TR e Estudo Individual.");
  }

  return motivos.length === 0 ? { ok: true } : { ok: false, motivos };
}

/**
 * As regras da aula — e a da `Q-1`, que é a mais fácil de escrever ao contrário.
 *
 * ⚠️ **A UE E A DISCIPLINA SÃO EXCLUSIVAS, NÃO ALTERNATIVAS LIVRES.** Quando há UE, ela **é** a
 * fonte da disciplina (`unidades_ensino.disciplina_id`), e gravar as duas abriria a porta para uma
 * aula cuja UE pertence a uma disciplina e cuja coluna aponta para outra. O banco recusa isso com
 * `reg_aula_ue_xor_disciplina`; aqui a recusa chega antes, com frase.
 */
function motivosDaAula(bloco: Bloco, contexto: ContextoDoBloco): readonly string[] {
  const motivos: string[] = [];

  if (!bloco.instrutorId) {
    motivos.push("Aula precisa de instrutor.");
  }
  if (bloco.unidadeEnsinoId && bloco.disciplinaId) {
    motivos.push("Informe a unidade de ensino ou a disciplina, não as duas.");
    return motivos;
  }
  if (bloco.unidadeEnsinoId) return motivos;

  if (!bloco.disciplinaId) {
    motivos.push("Escolha a unidade de ensino ou a disciplina.");
    return motivos;
  }
  if (!contexto.disciplinaIsentaDeUe) {
    motivos.push("Esta disciplina tem unidades de ensino: escolha uma.");
    return motivos;
  }
  if (!bloco.conteudo || bloco.conteudo.trim() === "") {
    motivos.push("Aula sem unidade de ensino precisa do tópico escrito.");
  }
  return motivos;
}

function motivosDaAtividade(bloco: Bloco): readonly string[] {
  const motivos: string[] = [];

  if (bloco.disciplinaId) {
    motivos.push("Atividade não letiva não se vincula a disciplina.");
  }
  if (bloco.unidadeEnsinoId) {
    motivos.push("Atividade não letiva não se vincula a unidade de ensino.");
  }
  if (bloco.responsavelExterno && bloco.instrutorId) {
    motivos.push("O responsável é alguém do cadastro ou um nome de fora, nunca os dois.");
  }
  return motivos;
}

/**
 * O que a planilha de contingência recebe e o que ela guarda — `data-model.md` da spec 015.
 *
 * > *"baixar UMA PLANILHA DA TURMA (.xlsx) e fazer o DSA manualmente, com total liberdade de edição,
 * > imprimir e publicar, até o defeito ser corrigido. É contingência, não um segundo sistema."*
 * > — pedido de Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **TUDO AQUI JÁ CHEGA CALCULADO PELO DOMÍNIO DO DSA.** O papel de cada semana (`documento`) é o
 * mesmo que o `/print/dsa` monta — `montarSemanaDoDsa` + `montarDocumentoDoDsa` —, e a planilha só o
 * dispõe em células. Nenhum tipo daqui recalcula horário, grade, número ou situação.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (regra 9). Quem lê o banco é a rota.
 */
import type { Assinatura } from "../assinaturas";
import type { Relogio } from "../horario-do-bloco";
import type { DiaImpresso, TecnicaDoCatalogo } from "../impressao";

export type IdentidadeDaSemana = { readonly ano: number; readonly numero: number };

export type OrigemDoFato = "aula" | "avaliacao" | "vista_prova" | "atividade_nao_letiva";
export type CategoriaNormativa = "AEC" | "TAD" | "TR" | "Estudo_Individual";

/**
 * Um lançamento do sistema, com o que a planilha precisa para escrever o COD e o ITEM dele e o
 * código que o identifica (`FR-011`, `Q-1`).
 */
export type FatoDoInsumo = {
  readonly origem: OrigemDoFato;
  /** O `codigo` da linha no sistema (`REG-…`, `AVA-…`, `ATV-…`). */
  readonly codigo: string | null;
  /** O `cod_disciplina` da disciplina do lançamento, quando há. */
  readonly disciplinaCodigo: string | null;
  /** O número da UE, na aula com UE. */
  readonly unidadeNumero: number | null;
  readonly tipoAvaliacao: string | null;
  readonly categoria: CategoriaNormativa | null;
};

/**
 * A chave do mapa de fatos. ⚠️ **O `fatoId` SOZINHO NÃO BASTA:** a avaliação e a vista dela têm o
 * mesmo id em `vw_ocupacao_ta`, e as duas podem cair na mesma semana — o dia e o TA separam.
 */
export const chaveDoFato = (fatoId: string, data: string, taInicial: number | null) =>
  `${fatoId}|${data}|${taInicial ?? "-"}`;

/** Um lançamento da semana sem lugar na grade (`FR-013`) — sem TA, ou fora do relógio. */
export type LancamentoSemPosicao = {
  readonly fatoId: string;
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  /** O que o papel imprimiria, já limpo (`textoDoPapel`). */
  readonly disciplina: string;
  readonly conteudo: string;
  readonly local: string;
  readonly te: string;
  readonly instrutor: string;
  readonly motivo: string;
};

/** Uma semana da pasta — o papel dela, como o `/print/dsa` o monta, com os seis dias. */
export type SemanaDoInsumo = {
  readonly semana: IdentidadeDaSemana;
  /** `Semana 15 — 06/04 a 11/04/2026`. */
  readonly rotulo: string;
  /** Segunda a sábado, `aaaa-mm-dd`. */
  readonly seisDias: readonly string[];
  readonly relogio: Relogio | null;
  /** Os seis dias, como `documentoImpresso` os devolve (o sábado sempre, `DP-3`). */
  readonly dias: readonly DiaImpresso[];
  /** Os avisos de cada dia (feriado parcial, informativo), na ordem de `seisDias`. */
  readonly avisosDosDias: readonly (readonly string[])[];
  readonly semPosicao: readonly LancamentoSemPosicao[];
  /** O nº do DSA da semana, por `numeroDoDsa` — vai como cache da fórmula. */
  readonly numero: number | null;
  readonly alunos: number | null;
  /** Resolvidas pela vigência na data da semana (`FR-010`), como o papel as imprime. */
  readonly assinaturas: {
    readonly esquerda: RubricaDaSemana | null;
    readonly direita: RubricaDaSemana | null;
  };
};

/** Uma rubrica pronta — nome, posto por extenso e função, como `rubricaResolvida` a devolve. */
export type RubricaDaSemana = {
  readonly nome: string;
  readonly posto: string;
  readonly funcao: string;
};

export type DisciplinaDoInsumo = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  /** A CH prevista que o rodapé do papel imprime (`vw_disciplinas_execucao`). */
  readonly chPrevista: number;
};

export type UnidadeDoInsumo = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly numero: number;
  readonly topico: string;
  readonly chPrevista: number;
  /** O NOME da técnica sugerida (`unidades_ensino.tecnica_ensino_sugerida`), ou nulo. */
  readonly tecnicaSugerida: string | null;
};

export type InstrutorDoInsumo = {
  readonly id: string;
  /** O nome como o DSA imprime — `nomeParaDsa`, função única. */
  readonly nomeNoDsa: string;
};

/** Um lançamento posicionado da turma cuja data não cai em semana nenhuma da pasta. */
export type LancamentoForaDaPasta = {
  readonly data: string;
  /** A disciplina cuja CH ele consome, ou nulo. */
  readonly disciplinaCodigo: string | null;
  readonly tempos: number;
  /** Aula ou avaliação — as duas origens do nº do DSA. */
  readonly contaNoNumero: boolean;
};

export type InsumoDaPlanilha = {
  readonly turma: {
    readonly codigo: string;
    /** A sigla do curso, como o papel a imprime no título. */
    readonly curso: string;
    readonly dataInicio: string | null;
    readonly salaAlocada: string | null;
  };
  /** Instante ISO da geração (`FR-005`). */
  readonly geradaEm: string;
  /** Quem gerou — o mesmo nome que o `/print/dsa` imprime. */
  readonly geradaPor: string;
  readonly semanas: readonly SemanaDoInsumo[];
  /** A semana que a IMPRESSÃO abre selecionada (`FR-022`), como índice em `semanas`. */
  readonly semanaInicial: number;
  /** A turma tem lançamento em sábado em alguma semana do ano (`DP-3`). */
  readonly temSabado: boolean;
  readonly fatos: ReadonlyMap<string, FatoDoInsumo>;
  readonly disciplinas: readonly DisciplinaDoInsumo[];
  readonly unidades: readonly UnidadeDoInsumo[];
  readonly atribuicoesPorUe: readonly {
    readonly unidadeEnsinoId: string;
    readonly instrutorId: string;
  }[];
  readonly atribuicoesPorDisciplina: readonly {
    readonly disciplinaId: string;
    readonly instrutorId: string;
  }[];
  /** Os instrutores da turma, JÁ em antiguidade (`RN-ANT-01`). */
  readonly instrutores: readonly InstrutorDoInsumo[];
  readonly tecnicas: readonly TecnicaDoCatalogo[];
  readonly tiposDeAvaliacao: readonly string[];
  /** O NOME da técnica da vista de prova, ou nulo. */
  readonly tecnicaDaVista: string | null;
  readonly foraDaPasta: readonly LancamentoForaDaPasta[];
  /** Degradações a dizer no topo (`RN-DEG-01`). */
  readonly avisos: readonly string[];
};

/* ------------------------------------------------------------------ o que a pasta guarda */

export type TipoDeItem =
  "aula" | "aula_sem_ue" | "avaliacao" | "vista_prova" | "aec" | "tad" | "tr" | "estudo_individual";

/** Uma linha da BD DISCIPLINAS (`data-model.md` §2.5). */
export type ItemDoCatalogo = {
  /** `COD|ITEM` — única na pasta, sem curinga (`FR-008`, I-P6). */
  readonly chave: string;
  readonly cod: string;
  /** O número da UE, ou o texto do item (`SEM UE`, o tipo da avaliação, `VISTA`, `AEC`, `—`). */
  readonly item: string | number;
  readonly tipo: TipoDeItem;
  /** O código que o papel imprime na coluna da disciplina — vazio nas categorias. */
  readonly disciplina: string;
  readonly nome: string;
  readonly conteudo: string;
  readonly chPrevista: number | null;
  readonly local: string;
  readonly te: string;
  readonly instrutor: string;
  /** A disciplina cuja CH o item consome (R-6), ou vazio. */
  readonly disciplinaDaCh: string;
  /** Conta no nº do DSA — aula e avaliação, as duas consultas de `lerExtrasDaImpressao` (R-6). */
  readonly contaNoNumero: boolean;
};

/** Um bloco da HORÁRIOS (`data-model.md` §2.6) — o `Relogio` do domínio, nunca recalculado. */
export type RelogioDaPlanilha = {
  readonly id: string;
  readonly relogio: Relogio;
  /** A primeira e a última data das semanas que usam este relógio. */
  readonly de: string;
  readonly ate: string;
};

/** Uma célula de valor da entrada (`data-model.md` §2.7). */
export type EstadoDaCelulaDeValor = "sugerido" | "escrito";

/** Um TA de um lançamento do sistema, na entrada. */
export type LinhaDeTa = {
  readonly cod: string;
  readonly item: string | number;
  readonly conteudo: string;
  readonly local: string;
  readonly te: string;
  readonly instrutor: string;
  readonly codigo: string | null;
};

/** A rubrica que vai para o cabeçalho de cada semana. */
export type { Assinatura };

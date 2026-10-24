/**
 * Validação de entrada das Server Actions de turma (`FR-025`, `FR-025.2`, `FR-015`, `FR-027`).
 *
 * ⚠️ **NÃO HÁ CAMPO DE CÓDIGO, E ISSO É A REGRA** (`FR-025.1`). O código da turma é
 * `sigla [rótulo] ano`, **gerado pelo gatilho** `app.gerar_codigo_da_turma()`, e o banco recusa valor
 * divergente com `codigo_de_turma_divergente`. Um campo aqui convidaria alguém a digitá-lo.
 *
 * ⚠️ **ANO, STATUS E MODALIDADE SEM PADRÃO** (`FR-015`, `FR-015.1`): valor que ninguém escolheu é
 * indistinguível de escolha real.
 *
 * ⚠️ **O RÓTULO É VAZIO OU `T<n>`** (`FR-025.2`). Vazio é ausência legítima — turma única não tem
 * rótulo —, e o `CHECK` `turmas_rotulo_forma` é quem garante por qualquer caminho.
 *
 * ⚠️ **A JANELA É OPCIONAL, mas coerente quando vem inteira** (`FR-027`): término antes do início é
 * recusado aqui e pelo `CHECK` `turmas_periodo_coerente`.
 *
 * ⚠️ **TRÊS ESQUEMAS DESDE 17/10/2026** (spec 016, FR-015.4; NQ-2, Bernardo Villas Boas): a
 * **criação** (`esquemaDeTurma`) exige a situação; a **edição** (`esquemaDeEdicaoDaTurma`) não a tem —
 * ela se troca **só** pelo botão *"Trocar situação"*, com `esquemaDaTrocaDeSituacao`. Um caminho só,
 * para que a observação por troca de status do Bloco 2 (D-COR-4) nasça num lugar. As regras da janela
 * e da etapa presencial são as **mesmas** nas duas primeiras, escritas uma vez.
 */
import { z } from "zod";

import { Constants } from "@/lib/tipos/database";

const MODALIDADES = Constants.public.Enums.modalidade_ensino;
const STATUS = Constants.public.Enums.status_turma;

const dataOpcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullish()
  .transform((v) => v ?? null);

const situacao = z.enum(STATUS, { error: "Situação é obrigatória." });

/** Os campos da turma **sem a situação**, que na edição tem caminho próprio (FR-015.4 da spec 016). */
const camposDaTurma = z.object({
  ano_letivo: z.coerce
    .number({ error: "Ano letivo é obrigatório." })
    .int("O ano letivo é um número inteiro.")
    .min(2000, "O ano letivo informado não é aceito.")
    .max(2100, "O ano letivo informado não é aceito."),
  modalidade: z.enum(MODALIDADES, { error: "Modalidade é obrigatória." }),
  /* ⚠️ Vazio vira NULO: turma única não tem rótulo, e gravar texto em branco seria outra coisa. */
  turma: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null)
    .refine(
      (v) => v === null || /^T\d+$/.test(v),
      "O rótulo da turma é T seguido do número — T1, T2.",
    ),
  data_inicio: dataOpcional,
  data_termino: dataOpcional,
  sala_alocada: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .transform((v) => v ?? null),
  alunos: z.coerce
    .number()
    .int("O efetivo é um número inteiro.")
    .min(0, "O efetivo não pode ser negativo.")
    .nullish()
    .transform((v) => v ?? null),
  /*
   * ⚠️ **A JANELA DA ETAPA PRESENCIAL** (`D-DSA-2`, decisão de Bernardo Villas Boas, 08/10/2026):
   * só vale para turma semipresencial, e é ela que decide em que semanas há DSA. O `CHECK`
   * `turmas_etapa_presencial_coerente` impõe as mesmas três condições que o esquema repete abaixo.
   */
  inicio_etapa_presencial: dataOpcional,
  termino_etapa_presencial: dataOpcional,
  /*
   * ⚠️ **O REGIME DE HORÁRIO NOMEADO** (spec 018, Bloco 3): vazio = o regime vigente do curso (nulo); AUSENTE = não
   *    mexer — o formulário só o manda quando o campo existe na tela, e um `update` com `null` por omissão trocaria
   *    o regime de quem não pediu (e o banco recusaria na turma com lançamento).
   */
  regime_de_horario_id: z
    .union([z.literal(""), z.uuid({ error: "Regime de horário inválido." })])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "" ? null : v)),
  /*
   * Spec 021 (Bloco 6, RC-4): o currículo que a turma segue. ⚠️ VAZIO É "O PADRÃO" e NÃO vai ao banco: quem escolhe o
   *    vigente na data de início é o gatilho (`app.curriculo_padrao_da_turma`). Mandar nulo gravaria turma sem
   *    currículo — que o banco recusa. A troca na turma com lançamento é recusada pelo banco (RF-HOR-05, D-3).
   */
  curriculo_id: z
    .union([z.literal(""), z.uuid({ error: "Currículo inválido." })])
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

type CamposDaTurma = z.infer<typeof camposDaTurma>;

function terminoNaoAntesDoInicio(t: CamposDaTurma): boolean {
  return t.data_inicio === null || t.data_termino === null || t.data_termino >= t.data_inicio;
}

const MENSAGEM_DO_TERMINO = {
  message: "A data de término não pode ser anterior à data de início.",
  path: ["data_termino"],
};

/*
 * ⚠️ **FORA DE SEMIPRESENCIAL A JANELA É GRAVADA VAZIA**, e isso é escolha, não descuido: o
 * formulário só a oferece nessa modalidade, e um par de datas que nenhuma regra lê seria dado sem
 * sentido esperando a próxima troca de modalidade para voltar a valer de surpresa.
 */
function etapaSoEmSemipresencial<T extends CamposDaTurma>(t: T): T {
  return t.modalidade === "semipresencial"
    ? t
    : { ...t, inicio_etapa_presencial: null, termino_etapa_presencial: null };
}

/*
 * ⚠️ **NA TURMA EAD O REGIME NÃO É TOCADO** (C-15 da spec 018): ela não tem tempos presenciais, e a capacidade é a do
 *    limite EAD (`RN-MAT-04`). Ausente também sai do que se grava: a coluna fica como está.
 */
function regimeSoForaDeEad<T extends CamposDaTurma>(t: T): T {
  if (t.regime_de_horario_id !== undefined && t.modalidade !== "ead") return t;
  const resto: Partial<T> = { ...t };
  delete resto.regime_de_horario_id;
  return resto as T;
}

function conferirEtapaPresencial(t: CamposDaTurma, ctx: z.RefinementCtx): void {
  const inicio = t.inicio_etapa_presencial;
  const termino = t.termino_etapa_presencial;
  if ((inicio === null) !== (termino === null)) {
    ctx.addIssue({
      code: "custom",
      path: [inicio === null ? "inicio_etapa_presencial" : "termino_etapa_presencial"],
      message: "Informe o início e o término da etapa presencial, ou deixe os dois vazios.",
    });
    return;
  }
  if (inicio === null || termino === null) return;
  if (termino < inicio) {
    ctx.addIssue({
      code: "custom",
      path: ["termino_etapa_presencial"],
      message: "O término da etapa presencial não pode ser anterior ao início.",
    });
    return;
  }
  if (
    (t.data_inicio !== null && inicio < t.data_inicio) ||
    (t.data_termino !== null && termino > t.data_termino)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["inicio_etapa_presencial"],
      message: "A etapa presencial precisa caber dentro do período da turma.",
    });
  }
}

/** A **criação** da turma: todos os campos, com a situação obrigatória (NQ-2 da spec 016). */
export const esquemaDeTurma = camposDaTurma
  .extend({ status: situacao })
  .refine(terminoNaoAntesDoInicio, MENSAGEM_DO_TERMINO)
  .transform(etapaSoEmSemipresencial)
  .transform(regimeSoForaDeEad)
  .superRefine(conferirEtapaPresencial);

/**
 * A **edição** da turma: os mesmos campos e regras, **sem a situação** (FR-015.4 da spec 016). Uma
 * `status` que venha no corpo é descartada, como o código (`SC-007`): a ação de gravar a turma não a
 * manda ao banco.
 */
export const esquemaDeEdicaoDaTurma = camposDaTurma
  .refine(terminoNaoAntesDoInicio, MENSAGEM_DO_TERMINO)
  .transform(etapaSoEmSemipresencial)
  .transform(regimeSoForaDeEad)
  .superRefine(conferirEtapaPresencial);

/** A observação de uma troca de situação ou de um arquivamento: opcional; em branco vira nula (D-COR-4). */
export const LIMITE_DA_OBSERVACAO_DA_TURMA = 500;
const observacaoDaTurma = z
  .string()
  .nullish()
  .transform((v) => (v ?? "").trim())
  .pipe(
    z
      .string()
      .max(
        LIMITE_DA_OBSERVACAO_DA_TURMA,
        `A observação tem no máximo ${LIMITE_DA_OBSERVACAO_DA_TURMA} caracteres.`,
      ),
  )
  .transform((v) => (v === "" ? null : v));

/**
 * A troca de situação **dentro de Editar turma** (spec 025, Bloco 10, D-2): a situação e a observação vêm no mesmo
 * corpo do formulário, e a ação as lê à parte dos campos (`esquemaDeEdicaoDaTurma` continua descartando a situação).
 */
export const esquemaDaSituacaoNaEdicao = z.object({
  status: situacao.optional(),
  observacao_da_situacao: observacaoDaTurma,
});

/**
 * A **troca de situação** pelo botão da ficha: o código da turma, a situação e a observação — D-COR-4: *"status da
 * turma com observação em toda troca"*. Nada mais entra.
 */
export const esquemaDaTrocaDeSituacao = z.object({
  codigo: z.string().trim().min(1, "A turma não foi informada."),
  status: situacao,
  observacao: observacaoDaTurma,
});

/** D-COR-5: arquivar a turma em qualquer situação, com observação opcional. */
export const esquemaDoArquivamento = z.object({
  codigo: z.string().trim().min(1, "A turma não foi informada."),
  observacao: observacaoDaTurma,
});

/** D-COR-5: desarquivar — só o Admin, e o banco confere. */
export const esquemaDoDesarquivamento = z.object({
  codigo: z.string().trim().min(1, "A turma não foi informada."),
});

export type TurmaParaGravar = z.infer<typeof esquemaDeTurma>;
export type EdicaoDaTurmaParaGravar = z.infer<typeof esquemaDeEdicaoDaTurma>;
export type TrocaDeSituacao = z.infer<typeof esquemaDaTrocaDeSituacao>;

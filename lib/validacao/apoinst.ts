/**
 * A APOINST PLANEJADA da turma (Bloco 18, spec 033, RA-6; FR-004.1) — os esquemas das Server Actions de criar, editar,
 * desativar e reativar. As mesmas regras do banco (`apoinst_planejadas`), com as frases para a tela.
 *
 * > *"APOINST: planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado
 * > da disciplina), período previsto, TA previstos."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **O QUE O BANCO CONFERE, O BANCO CONFERE**: a disciplina é da turma (`apoinst_disciplina_da_turma`), o instrutor é
 *    designado nela (`apoinst_instrutor_nao_designado`) e a turma é do ano inicial em diante (`apoinst.ano_inicial`, um
 *    PARÂMETRO, regra 8 — nunca um ano escrito aqui). Este esquema só dá a frase antes de ir ao banco no que não
 *    depende de dado: os campos obrigatórios, o período e os TA.
 * ⚠️ **A TURMA NÃO MUDA NA EDIÇÃO** (o banco recusa, `apoinst_de_outra_turma`): editar não leva turma.
 */
import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const MAXIMO_DO_NOME_DA_APOINST = 200;
export const MAXIMO_DA_OBSERVACAO_DA_APOINST = 1000;
export const MAXIMO_DE_TA_DA_APOINST = 999;

const campos = {
  nome: z
    .string({ message: "Informe o nome da APOINST." })
    .trim()
    .min(1, "Informe o nome da APOINST.")
    .max(
      MAXIMO_DO_NOME_DA_APOINST,
      `O nome tem no máximo ${MAXIMO_DO_NOME_DA_APOINST} caracteres.`,
    ),
  disciplinaId: z.string({ message: "Escolha a disciplina." }).uuid("Escolha a disciplina."),
  instrutorId: z
    .string({ message: "Escolha o instrutor responsável." })
    .uuid("Escolha o instrutor responsável."),
  inicioPrevisto: z
    .string({ message: "Informe o início previsto." })
    .regex(DATA_ISO, "Informe o início previsto."),
  fimPrevisto: z
    .string({ message: "Informe o fim previsto." })
    .regex(DATA_ISO, "Informe o fim previsto."),
  taPrevistos: z.coerce
    .number({ message: "Informe os TA previstos." })
    .int("Os TA previstos são um número inteiro.")
    .min(1, "Os TA previstos são pelo menos 1.")
    .max(MAXIMO_DE_TA_DA_APOINST, `Os TA previstos são no máximo ${MAXIMO_DE_TA_DA_APOINST}.`),
  observacao: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v === undefined || v === null ? "" : v.trim()))
    .pipe(
      z
        .string()
        .max(
          MAXIMO_DA_OBSERVACAO_DA_APOINST,
          `A observação tem no máximo ${MAXIMO_DA_OBSERVACAO_DA_APOINST} caracteres.`,
        ),
    )
    .transform((v) => (v === "" ? null : v)),
};

function periodoValido(
  v: { readonly inicioPrevisto: string; readonly fimPrevisto: string },
  ctx: z.RefinementCtx,
): void {
  if (v.fimPrevisto < v.inicioPrevisto) {
    ctx.addIssue({
      code: "custom",
      message: "O fim previsto tem de ser no início previsto ou depois.",
      path: ["fimPrevisto"],
    });
  }
}

export const esquemaDaNovaApoinst = z
  .object({
    turmaId: z.string({ message: "Escolha a turma." }).uuid("Escolha a turma."),
    ...campos,
  })
  .superRefine(periodoValido);

export const esquemaDaEdicaoDaApoinst = z
  .object({ id: z.string().uuid("APOINST inválida."), ...campos })
  .superRefine(periodoValido);

/** Desativar e reativar: só a APOINST. Nada mais muda (exclusão lógica, regra 4). */
export const esquemaDaSituacaoDaApoinst = z.object({ id: z.string().uuid("APOINST inválida.") });

export type NovaApoinst = z.infer<typeof esquemaDaNovaApoinst>;
export type EdicaoDaApoinst = z.infer<typeof esquemaDaEdicaoDaApoinst>;

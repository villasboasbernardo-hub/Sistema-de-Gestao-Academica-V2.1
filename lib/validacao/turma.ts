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

export const esquemaDeTurma = z
  .object({
    ano_letivo: z.coerce
      .number({ error: "Ano letivo é obrigatório." })
      .int("O ano letivo é um número inteiro.")
      .min(2000, "O ano letivo informado não é aceito.")
      .max(2100, "O ano letivo informado não é aceito."),
    status: z.enum(STATUS, { error: "Situação é obrigatória." }),
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
  })
  .refine(
    (t) => t.data_inicio === null || t.data_termino === null || t.data_termino >= t.data_inicio,
    {
      message: "A data de término não pode ser anterior à data de início.",
      path: ["data_termino"],
    },
  );

export type TurmaParaGravar = z.infer<typeof esquemaDeTurma>;

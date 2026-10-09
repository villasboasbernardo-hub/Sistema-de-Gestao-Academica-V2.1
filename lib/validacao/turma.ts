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
    /*
     * ⚠️ **A JANELA DA ETAPA PRESENCIAL** (`D-DSA-2`, decisão de Bernardo Villas Boas, 08/10/2026):
     * só vale para turma semipresencial, e é ela que decide em que semanas há DSA. O `CHECK`
     * `turmas_etapa_presencial_coerente` impõe as mesmas três condições que o esquema repete abaixo.
     */
    inicio_etapa_presencial: dataOpcional,
    termino_etapa_presencial: dataOpcional,
  })
  .refine(
    (t) => t.data_inicio === null || t.data_termino === null || t.data_termino >= t.data_inicio,
    {
      message: "A data de término não pode ser anterior à data de início.",
      path: ["data_termino"],
    },
  )
  /*
   * ⚠️ **FORA DE SEMIPRESENCIAL A JANELA É GRAVADA VAZIA**, e isso é escolha, não descuido: o
   * formulário só a oferece nessa modalidade, e um par de datas que nenhuma regra lê seria dado sem
   * sentido esperando a próxima troca de modalidade para voltar a valer de surpresa.
   */
  .transform((t) =>
    t.modalidade === "semipresencial"
      ? t
      : { ...t, inicio_etapa_presencial: null, termino_etapa_presencial: null },
  )
  .superRefine((t, ctx) => {
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
  });

export type TurmaParaGravar = z.infer<typeof esquemaDeTurma>;

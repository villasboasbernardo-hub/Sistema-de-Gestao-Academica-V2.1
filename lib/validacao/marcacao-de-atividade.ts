/**
 * A marcação À MÃO da AEC prevista cumprida e da APOINST concluída (Bloco 18, spec 033, RA-5 e RA-6; FR-005.2) — o
 * esquema da Server Action. As mesmas regras do banco (`marcacoes_de_atividade`), com as frases para a tela.
 *
 * > *"Palestra prevista fica CUMPRIDA por lançamento vinculado no DSA (…) OU marcada à mão pelo trio
 * > (Admin/Encarregado/Ajudante) com justificativa obrigatória e trilha, como os ajustes de avaliação do Bloco 16."*
 * > — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **UM ALVO SÓ** (`marcacoes_de_atividade_um_alvo`): a AEC prevista OU a APOINST — nunca as duas, nunca nenhuma.
 * ⚠️ **A JUSTIFICATIVA É A MESMA RÉGUA DO AJUSTE DE AVALIAÇÃO** (10 a 1.000 caracteres, o `CHECK` do banco).
 * ⚠️ **A DATA É OPCIONAL E NUNCA NO FUTURO**: o que se marca já aconteceu. O banco não tem esse `CHECK` (exigiria o
 *    relógio do servidor, D20), por isso o esquema é uma FÁBRICA que recebe `hoje` (`hojeNaCiaara()`), como o do TA fora
 *    do DSA. *Desfazer* (`a_cumprir`) não leva data.
 */
import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const SITUACOES_DA_MARCACAO = ["cumprida", "a_cumprir"] as const;
export const MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO = 10;
export const MAXIMO_DA_JUSTIFICATIVA_DA_MARCACAO = 1000;

const idOuNulo = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === undefined || v === null || v.trim() === "" ? null : v.trim()))
  .pipe(z.string().uuid("Alvo inválido.").nullable());

export function esquemaDaMarcacao(hoje: string) {
  return z
    .object({
      turmaId: z.string().uuid("A turma não foi informada."),
      atividadePrevistaId: idOuNulo,
      apoinstId: idOuNulo,
      situacao: z.enum(SITUACOES_DA_MARCACAO, { message: "Escolha se registra ou desfaz." }),
      dataRealizada: z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => (v === undefined || v === null || v.trim() === "" ? null : v.trim()))
        .pipe(
          z
            .string()
            .regex(DATA_ISO, "Data inválida.")
            .refine((d) => d <= hoje, "A data não pode estar no futuro: o que se marca já aconteceu.")
            .nullable(),
        ),
      justificativa: z
        .string()
        .trim()
        .min(
          MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO,
          `Escreva a justificativa (ao menos ${MINIMO_DA_JUSTIFICATIVA_DA_MARCACAO} caracteres).`,
        )
        .max(MAXIMO_DA_JUSTIFICATIVA_DA_MARCACAO, "A justificativa passa de 1.000 caracteres."),
    })
    .superRefine((v, ctx) => {
      if ((v.atividadePrevistaId === null) === (v.apoinstId === null)) {
        ctx.addIssue({
          code: "custom",
          message: "Escolha uma AEC prevista ou uma APOINST para marcar.",
          path: ["atividadePrevistaId"],
        });
      }
    })
    .transform((v) => ({
      ...v,
      // Desfazer volta a linha ao que os lançamentos dizem: a data não se aplica.
      dataRealizada: v.situacao === "a_cumprir" ? null : v.dataRealizada,
    }));
}

export type MarcacaoParaGravar = z.infer<ReturnType<typeof esquemaDaMarcacao>>;

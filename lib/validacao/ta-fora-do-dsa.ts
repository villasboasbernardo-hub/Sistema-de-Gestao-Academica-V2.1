/**
 * Validação das Server Actions do TA fora do DSA (D-COR-3; spec 017, FR-001.1 e FR-001.3).
 *
 * ⚠️ **A DATA FUTURA É RECUSADA AQUI, com o dia de São Paulo** — o banco não tem esse `CHECK` porque ele exigiria o
 *    relógio do servidor (D20). Por isso o esquema é uma FÁBRICA que recebe `hoje`: a ação manda `hojeNaCiaara()`, o
 *    teste manda o dia que quiser.
 * ⚠️ **QUANTIDADE INTEIRA E POSITIVA** (*"sem ajuste negativo"*) e **observação obrigatória** — as duas também são
 *    `CHECK` do banco, então valem por qualquer caminho; aqui elas ganham a frase em português antes de ir ao banco.
 */
import { z } from "zod";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export const LIMITE_DA_OBSERVACAO_FORA_DO_DSA = 1000;

export function esquemaDoTaForaDoDsa(hoje: string) {
  return z.object({
    turmaCodigo: z.string().trim().min(1, "A turma não foi informada."),
    turmaDisciplinaId: z.string().uuid("A disciplina da turma não foi informada."),
    data: z
      .string()
      .regex(DATA_ISO, "Informe a data.")
      .refine((d) => d <= hoje, "A data não pode estar no futuro: o que é executado já aconteceu."),
    tempos: z.coerce
      .number({ message: "Informe a quantidade de TA." })
      .int("A quantidade de TA é um número inteiro.")
      .min(1, "A quantidade de TA é pelo menos 1 — não há ajuste negativo."),
    instrutorId: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.string().uuid("Instrutor inválido.").nullable()),
    observacao: z
      .string()
      .trim()
      .min(3, "A observação é obrigatória: diga o que foi feito e por que ficou fora do DSA.")
      .max(
        LIMITE_DA_OBSERVACAO_FORA_DO_DSA,
        `A observação tem no máximo ${LIMITE_DA_OBSERVACAO_FORA_DO_DSA} caracteres.`,
      ),
  });
}

/** Desfazer um registro: o código dele e o da turma (para voltar à ficha). Nada mais muda. */
export const esquemaDeDesfazerTaForaDoDsa = z.object({
  turmaCodigo: z.string().trim().min(1, "A turma não foi informada."),
  codigo: z
    .string()
    .trim()
    .regex(/^TFD-\d{6}$/, "Registro inválido."),
});

export type TaForaDoDsaParaGravar = z.infer<ReturnType<typeof esquemaDoTaForaDoDsa>>;

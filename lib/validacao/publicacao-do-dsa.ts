/**
 * Validação das ações da publicação do DSA (spec 024, Bloco 9: FR-006 a FR-013). Só a FORMA; a situação da semana, a
 * trava e a permissão são do banco.
 */
import { z } from "zod";

export const esquemaDaSemanaDoDsa = z.object({
  turmaId: z.string().uuid("Identificador inválido."),
  ano: z.coerce.number().int().min(2020).max(2099),
  semana: z.coerce.number().int().min(1).max(53),
});

/** D-7: a justificativa da alteração tem ao menos 10 caracteres (o banco confere o mesmo). */
export const MINIMO_DA_JUSTIFICATIVA = 10;

export const esquemaDaPublicacao = esquemaDaSemanaDoDsa.extend({
  /** Ausente: a publicação ORIGINAL. Presente: a alteração (RP-1). */
  justificativa: z
    .string()
    .trim()
    .min(
      MINIMO_DA_JUSTIFICATIVA,
      `Escreva a justificativa da alteração (ao menos ${MINIMO_DA_JUSTIFICATIVA} caracteres).`,
    )
    .max(500, "A justificativa tem no máximo 500 caracteres.")
    .optional(),
});

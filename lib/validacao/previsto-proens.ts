/**
 * Validação de entrada de `gravarPrevistoProens` (`FR-008.1` da spec 014).
 *
 * O previsto é por turma e categoria, em TA inteiros e não negativos. A permissão e o alcance são do
 * banco (`previsto_proens.editar` e `alcanca_turma`); aqui só a forma.
 */
import { z } from "zod";

export const CATEGORIAS_DO_PREVISTO = ["AEC", "TAD", "TR"] as const;

export const esquemaDoPrevistoProens = z.object({
  turmaId: z.uuid({ error: "Turma inválida." }),
  categoria: z.enum(CATEGORIAS_DO_PREVISTO, { error: "A categoria é AEC, TAD ou TR." }),
  tempos: z.coerce
    .number({ error: "Informe os tempos previstos." })
    .int("Os tempos previstos são um número inteiro.")
    .min(0, "Os tempos previstos não podem ser negativos."),
  origemProens: z
    .string()
    .trim()
    .max(200, "A origem tem no máximo 200 caracteres.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type PrevistoParaGravar = z.infer<typeof esquemaDoPrevistoProens>;

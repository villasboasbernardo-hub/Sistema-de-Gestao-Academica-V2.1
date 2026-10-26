/**
 * A exclusão permanente do Bloco 10 — identificador **e** código digitado (spec 025, D-12).
 *
 * ⚠️ O código também vai ao banco, que o confere de novo e recusa com `codigo_nao_confere` (`22023`): conferir só aqui
 *    deixaria a ação alcançável por chamada direta sem o segundo passo.
 */
import { z } from "zod";

export const esquemaDaExclusaoPermanente = z.object({
  id: z.uuid({ error: "Registro inválido." }),
  codigoConfirmacao: z
    .string({ error: "Digite o código para confirmar." })
    .trim()
    .min(1, { error: "Digite o código para confirmar." })
    .max(200, { error: "O código para confirmar é longo demais." }),
});

export type ExclusaoPermanente = z.infer<typeof esquemaDaExclusaoPermanente>;

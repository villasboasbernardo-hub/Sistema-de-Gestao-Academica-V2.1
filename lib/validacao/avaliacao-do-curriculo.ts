/**
 * Validação de entrada das ações sobre o item de avaliação do currículo (spec 014, FR-031.3, FR-031.4, FR-031.7).
 *
 * Só a FORMA. A permissão (`avaliacoes_curriculo_arbitrado.editar`, Admin e Encarregado) e o alcance são do banco
 * — policy e o gatilho `app.proteger_arbitrado()`.
 */
import { z } from "zod";

const tempo = z.coerce
  .number({ error: "Informe o tempo em TA." })
  .int("O tempo é um número inteiro de TA.")
  .min(0, "O tempo não pode ser negativo.");

/** Definir o tempo arbitrado de um item — no curso (o item) ou só na turma (o ajuste). */
export const esquemaDoTempoArbitrado = z
  .object({
    itemId: z.uuid({ error: "Avaliação do currículo inválida." }),
    alcance: z.enum(["curso", "turma"], {
      error: "Escolha se vale para o curso ou só para a turma.",
    }),
    turmaId: z.uuid({ error: "Turma inválida." }).optional(),
    taAplicacao: tempo,
    taVista: tempo.optional(),
  })
  .refine((v) => v.alcance === "curso" || v.turmaId !== undefined, {
    message: "O ajuste só da turma precisa da turma.",
    path: ["turmaId"],
  });

/** Confirmar a sugestão da planilha de um ajuste por turma (vira arbitrado confirmado). */
export const esquemaDaConfirmacao = z.object({
  itemId: z.uuid({ error: "Avaliação do currículo inválida." }),
  turmaId: z.uuid({ error: "Turma inválida." }),
});

/** Arbitrar a quantidade: cria um item de origem arbitrada na disciplina. */
export const esquemaDoItemArbitrado = z.object({
  disciplinaId: z.uuid({ error: "Disciplina inválida." }),
  instrumento: z.string().trim().min(2, "Escolha o instrumento.").max(3),
  taAplicacao: tempo.optional(),
  taVista: tempo.optional(),
});

/** Nomear a UE de uma avaliação que o currículo deixou no nível da disciplina. */
export const esquemaDaUeDecidida = z.object({
  itemId: z.uuid({ error: "Avaliação do currículo inválida." }),
  unidadeEnsinoId: z.uuid({ error: "Escolha a unidade de ensino." }),
});

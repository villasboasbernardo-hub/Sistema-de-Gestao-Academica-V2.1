/**
 * Validação de `pararDia` e `desfazerParada` (`FR-023` a `FR-028.1` da spec 014; contrato `dia-parado.md`).
 *
 * ⚠️ Só a FORMA. O destino (feriado, dia parado ou TR bloqueante), a permissão e as recusas que dependem
 *    do tipo de parada são da Server Action e do banco.
 */
import { z } from "zod";

const uuid = z.string().uuid("Identificador inválido.");
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data precisa estar no formato AAAA-MM-DD.");
const tempo = z.coerce
  .number()
  .int()
  .min(1, "O tempo vai de 1 a 12.")
  .max(12, "O tempo vai de 1 a 12.");

export const esquemaDePararDia = z
  .object({
    /* Spec 023 (D-8): o «Parar dia» do Calendário é de todas as turmas e não tem turma. */
    turmaId: uuid.nullable().default(null),
    alcance: z.enum(["turma", "todas"], { error: "Escolha se a parada é da turma ou de todas." }),
    data,
    diaInteiro: z.boolean(),
    taInicial: tempo.nullable().default(null),
    tempos: tempo.nullable().default(null),
    tipoParadaId: uuid,
    motivo: z
      .string()
      .trim()
      .min(3, "Escreva o motivo da parada (ao menos três letras).")
      .max(200, "O motivo tem no máximo 200 caracteres."),
    prevista: z.boolean().default(true),
    consomeTempoReserva: z.boolean().default(false),
    confirmado: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.turmaId === null && (v.alcance === "turma" || v.consomeTempoReserva)) {
      ctx.addIssue({ code: "custom", path: ["turmaId"], message: "Escolha a turma da parada." });
    }
    if (!v.diaInteiro && (v.taInicial === null || v.tempos === null)) {
      ctx.addIssue({
        code: "custom",
        path: ["taInicial"],
        message: "Informe o primeiro tempo e quantos tempos param.",
      });
    }
    if (v.taInicial !== null && v.tempos !== null && v.taInicial + v.tempos - 1 > 12) {
      ctx.addIssue({ code: "custom", path: ["tempos"], message: "A parada passa do 12º tempo." });
    }
    if (v.consomeTempoReserva && v.prevista) {
      ctx.addIssue({
        code: "custom",
        path: ["consomeTempoReserva"],
        message: "Só a parada NÃO prevista consome Tempo Reserva.",
      });
    }
  });

export type ParadaParaGravar = z.infer<typeof esquemaDePararDia>;

export const esquemaDeDesfazerParada = z.object({
  /* Spec 023: o desfazer do Calendário não tem turma. */
  turmaId: uuid.nullable().default(null),
  destino: z.enum(["feriado", "dia_parado", "atividade"]),
  codigo: z.string().trim().min(1),
});

/**
 * Validação das ações da aba Calendário (spec 023, Bloco 8: FR-009 a FR-011).
 *
 * ⚠️ Só a FORMA. O tipo ser da lista com alcance global, a permissão e a abrangência valerem são da Server Action e do
 *    banco.
 */
import { z } from "zod";

const uuid = z.string().uuid("Identificador inválido.");
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A data precisa estar no formato AAAA-MM-DD.");

export const IMPACTOS_DO_CALENDARIO = ["dia_inteiro", "parcial", "informativo"] as const;

export const esquemaDaLinhaDoCalendario = z
  .object({
    /** Nulo: cadastrar; com valor: editar. */
    id: uuid.nullable().default(null),
    data,
    descricao: z
      .string()
      .trim()
      .min(3, "Escreva o nome (ao menos três letras).")
      .max(200, "O nome tem no máximo 200 caracteres."),
    tipoParadaId: uuid,
    impacto: z.enum(IMPACTOS_DO_CALENDARIO, { error: "Escolha o impacto." }),
    abrangencia: z.enum(["todas", "turmas"], { error: "Escolha a abrangência." }),
    turmas: z.array(uuid).default([]),
  })
  .superRefine((v, ctx) => {
    if (v.abrangencia === "turmas" && v.turmas.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["turmas"],
        message: "Marque ao menos uma turma, ou escolha «Todas as turmas».",
      });
    }
  });

export type LinhaParaGravar = z.infer<typeof esquemaDaLinhaDoCalendario>;

export const esquemaDaSituacaoDaLinha = z.object({
  id: uuid,
  situacao: z.enum(["ativo", "inativo"]),
});

/** Excluir uma linha do calendário e ler o impacto antes — D-COR-7 (spec 027): só o `id`, sem código digitado (D-12). */
export const esquemaDaLinhaParaExcluir = z.object({ id: uuid });

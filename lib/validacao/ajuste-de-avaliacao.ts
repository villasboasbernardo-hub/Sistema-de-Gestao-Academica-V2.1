/**
 * O ajuste manual da situação e das datas de uma avaliação (Bloco 16, spec 031, ajuste D de 31/10/2026) — o esquema da
 * Server Action. As mesmas regras do banco (`ajustes_de_avaliacao`), com as frases para a tela.
 */
import { z } from "zod";

const data = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .nullable();

export const SITUACOES_DO_AJUSTE = [
  "pendente",
  "em_andamento",
  "concluida",
  "cancelada",
  "atrasada",
  "sem_correspondencia",
] as const;

export const esquemaDoAjusteDeAvaliacao = z
  .object({
    turmaId: z.string().uuid(),
    avaliacaoCurriculoId: z.string().uuid().nullable(),
    avaliacaoId: z.string().uuid().nullable(),
    situacao: z.enum(SITUACOES_DO_AJUSTE, { message: "Escolha a situação." }),
    dataAplicacao: data,
    dataVista: data,
    justificativa: z
      .string()
      .trim()
      .min(10, "Escreva a justificativa (ao menos 10 caracteres).")
      .max(1000, "A justificativa passa de 1.000 caracteres."),
  })
  .superRefine((v, ctx) => {
    if ((v.avaliacaoCurriculoId === null) === (v.avaliacaoId === null)) {
      ctx.addIssue({
        code: "custom",
        message: "Escolha uma avaliação para ajustar.",
        path: ["avaliacaoId"],
      });
    }
    if (v.dataAplicacao !== null && v.dataVista !== null && v.dataVista < v.dataAplicacao) {
      ctx.addIssue({
        code: "custom",
        message: "A data da vista não pode ser antes da data de aplicação.",
        path: ["dataVista"],
      });
    }
  });

/**
 * Validação de entrada das Server Actions dos regimes de horário nomeados — spec 018 (Bloco 3).
 *
 * ⚠️ **ESPELHA O QUE O BANCO JÁ IMPÕE** (`regimes_de_horario`, `20261020025815`): 1 a 12 TA por dia, TA de 45 ou 50
 *    minutos, intervalos de 0 a 120, a tarde depois da manhã, nome de 1 a 60. Antecipar é cortesia; a garantia é do
 *    banco.
 * ⚠️ **A EDIÇÃO NÃO TEM QUANTIDADE NEM DURAÇÃO** (`RF-HOR-02`: imutáveis pelo usuário). Mandá-las no corpo não muda
 *    nada: o esquema as descarta, e o gatilho recusaria de qualquer forma.
 * ⚠️ **SEM PADRÃO SILENCIOSO** (`FR-015.1` da spec 009): campo em branco é ausência, nunca zero.
 */
import { z } from "zod";

import { campoDeJustificativa } from "@/lib/validacao/justificativa";

const inteiro = (erro: string) => z.coerce.number({ error: erro }).int(erro);
const hora = (erro: string) =>
  z
    .string({ error: erro })
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, erro);

/** Vazio = sem relógio do catálogo. */
const configuracao = z
  .union([z.literal(""), z.uuid({ error: "Relógio do catálogo inválido." })])
  .nullish()
  .transform((v) => (v === "" || v === undefined ? null : v));

const observacao = z
  .string()
  .nullish()
  .transform((v) => (v ?? "").trim())
  .pipe(z.string().max(500, "A observação tem no máximo 500 caracteres."))
  .transform((v) => (v === "" ? null : v));

const relogio = {
  intervalo_manha_min: inteiro("Informe o intervalo da manhã.")
    .min(0, "O intervalo não pode ser negativo.")
    .max(120, "O intervalo vai até 120 minutos."),
  intervalo_tarde_min: inteiro("Informe o intervalo da tarde.")
    .min(0, "O intervalo não pode ser negativo.")
    .max(120, "O intervalo vai até 120 minutos."),
  hora_inicio_manha: hora("Informe o início da manhã no formato hh:mm."),
  hora_inicio_tarde: hora("Informe o início da tarde no formato hh:mm."),
  configuracao_horario_id: configuracao,
};

const nome = z
  .string({ error: "O nome do regime é obrigatório." })
  .trim()
  .min(1, "O nome do regime é obrigatório.")
  .max(60, "O nome do regime tem no máximo 60 caracteres.");

const TARDE_DEPOIS = {
  message: "O início da tarde tem de ser depois do início da manhã.",
  path: ["hora_inicio_tarde"],
};
const tardeDepois = (r: { hora_inicio_manha: string; hora_inicio_tarde: string }) =>
  r.hora_inicio_tarde > r.hora_inicio_manha;

/**
 * Criar regime nomeado. Spec 021 (Bloco 6, emenda à RC-1 de 21/10/2026): os horários são do CURRÍCULO — `curriculo_id`
 * diz em qual; sem ele, o banco usa o único currículo ativo do curso.
 */
export const esquemaDoRegime = z
  .object({
    curso_id: z.uuid({ error: "O curso não foi informado." }),
    curriculo_id: z.uuid({ error: "Currículo inválido." }).optional(),
    justificativa: campoDeJustificativa,
    nome,
    regime_tempos: inteiro("Informe quantos TA por dia.")
      .min(1, "TA por dia vai de 1 a 12.")
      .max(12, "TA por dia vai de 1 a 12."),
    ta_duracao_min: inteiro("Informe a duração do TA.").refine(
      (n) => n === 45 || n === 50,
      "A duração do TA é 45 ou 50 minutos.",
    ),
    ...relogio,
    observacao,
  })
  .refine(tardeDepois, TARDE_DEPOIS);

/** Editar regime nomeado: o nome, o relógio e a observação — nunca a quantidade nem a duração (`RF-HOR-02`). */
export const esquemaDaEdicaoDoRegime = z
  .object({
    id: z.uuid({ error: "O regime não foi informado." }),
    justificativa: campoDeJustificativa,
    nome,
    ...relogio,
    observacao,
  })
  .refine(tardeDepois, TARDE_DEPOIS);

/** Inativar ou reativar (C-11): só o regime — a ação diz qual das duas; o banco confere `horarios.desativar`. */
export const esquemaDaSituacaoDoRegime = z.object({
  id: z.uuid({ error: "O regime não foi informado." }),
  justificativa: campoDeJustificativa,
});

export type RegimeParaGravar = z.infer<typeof esquemaDoRegime>;
export type EdicaoDoRegimeParaGravar = z.infer<typeof esquemaDaEdicaoDoRegime>;

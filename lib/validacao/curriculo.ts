/**
 * Validação de entrada das ações do currículo (spec 021, Bloco 6; RC-1 a RC-12, Bernardo Villas Boas, 21/10/2026).
 *
 * Só a FORMA. Quem cria e edita (`cursos.editar`), quem arquiva (o trio), a vigência (RC-2: depois do mais novo, um
 * futuro só) e a correção do currículo em uso (RC-6) são do BANCO — policy, funções com porteiro e o gatilho.
 */
import { z } from "zod";

import { campoDeJustificativa } from "@/lib/validacao/justificativa";

const sigla = z.string({ error: "Sigla é obrigatória." }).trim().min(1, "Sigla é obrigatória.");

const versao = z.coerce
  .number({ error: "Currículo inválido." })
  .int("Currículo inválido.")
  .positive("Currículo inválido.");

const data = (campo: string) =>
  z
    .string({ error: `${campo} é obrigatória.` })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${campo} precisa estar no formato AAAA-MM-DD.`);

/** Texto opcional: vazio e só-espaços viram **nulo**, nunca texto em branco gravado. */
const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullish()
  .transform((v) => v ?? null);

/** RC-7 — o currículo novo: a partir de quando vale e o que muda (a cópia do vigente é do banco). */
export const esquemaDeNovoCurriculo = z.object({
  sigla,
  vigenteDe: data("A data de início da vigência"),
  descricao: opcional.pipe(z.string().max(500, "A descrição passou de 500 caracteres.").nullable()),
});

/** RC-5 — editar o currículo escolhido: vigência, descrição, propósito e duração (RC-1). */
export const esquemaDeEdicaoDoCurriculo = z.object({
  sigla,
  versao,
  vigenteDe: data("A data de início da vigência"),
  descricao: opcional.pipe(z.string().max(500, "A descrição passou de 500 caracteres.").nullable()),
  proposito: opcional,
  duracaoDias: z.coerce
    .number({ error: "Duração em dias é obrigatória." })
    .int("Duração em dias tem de ser um número inteiro.")
    .positive("Duração em dias tem de ser maior que zero."),
  duracaoSemanas: z.coerce
    .number()
    .int("Duração em semanas tem de ser um número inteiro.")
    .positive("Duração em semanas tem de ser maior que zero.")
    .nullish()
    .transform((v) => v ?? null),
  justificativa: campoDeJustificativa,
});

/** RC-10 — arquivar e desarquivar levam só o currículo. */
export const esquemaDoArquivamentoDoCurriculo = z.object({ sigla, versao });

/** RC-11 — registrar o PDF que o navegador acabou de carregar para o currículo. */
export const esquemaDoPdfDoCurriculo = z.object({
  sigla,
  versao,
  caminho: z
    .string()
    .regex(
      /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9]+\.pdf$/,
      "O caminho do PDF não é o de um currículo.",
    ),
  justificativa: campoDeJustificativa,
});

/**
 * Ajuste 3 da conferência do PR #82 (21/10/2026): o LIMITE de AEC, TAD ou TR que o quadro final do currículo declara, em
 * TA, com o arquivo e a página (spec 014, FR-001.1). Só informativo (regra 6): nunca vira CHECK de lançamento.
 */
export const CATEGORIAS_DE_LIMITE = ["AEC", "TAD", "TR"] as const;
export const esquemaDoLimiteDoCurriculo = z.object({
  sigla,
  versao,
  categoria: z.enum(CATEGORIAS_DE_LIMITE, { error: "A categoria é AEC, TAD ou TR." }),
  tempos: z.coerce
    .number({ error: "Informe o limite em TA." })
    .int("O limite é um número inteiro de TA.")
    .min(0, "O limite não é negativo."),
  fonteArquivo: z
    .string({ error: "Informe o arquivo do currículo." })
    .trim()
    .min(1, "Informe o arquivo do currículo.")
    .max(200, "O nome do arquivo passou de 200 caracteres."),
  fontePagina: z.coerce
    .number({ error: "Informe a página." })
    .int("A página é um número inteiro.")
    .positive("A página começa em 1."),
  justificativa: campoDeJustificativa,
});

/** Retirar o limite declarado: a categoria volta ao percentual da norma (exclusão lógica). */
export const esquemaDaRetiradaDoLimite = z.object({
  sigla,
  versao,
  categoria: z.enum(CATEGORIAS_DE_LIMITE, { error: "A categoria é AEC, TAD ou TR." }),
  justificativa: campoDeJustificativa,
});

export type NovoCurriculo = z.infer<typeof esquemaDeNovoCurriculo>;
export type CurriculoParaEditar = z.infer<typeof esquemaDeEdicaoDoCurriculo>;

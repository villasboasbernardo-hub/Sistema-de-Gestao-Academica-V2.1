/**
 * Validação de entrada das ações das AEC PREVISTAS do currículo — Bloco 18 (spec 033), RA-2 e FR-002 (Bernardo Villas
 * Boas, 03/11/2026: *"AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional,
 * obrigatória sim/não. (…) Correção em currículo em uso segue RC-6."*).
 *
 * Só a FORMA. Quem grava (`cursos.editar`, alcance e curso em oferta), o tipo de classificação AEC, a disciplina do mesmo
 * currículo e a correção do currículo em uso (RC-6: o trio, com justificativa e trilha) são do BANCO — policy, o guarda
 * `app.guardar_aec_prevista` e o gatilho `app.guardar_curriculo_em_uso`.
 *
 * ⚠️ **O TA VAZIO É «NÃO DEFINIDO»** (item 6 da conferência do passo 0): vazio chega `null`, nunca zero; o banco aceita de
 *    1 a 999.
 * ⚠️ **A PÁGINA É TEXTO** (`A-74 (Anexo B)`), como o PDF a escreve — não é número.
 */
import { z } from "zod";

import { esquemaDoArquivamentoDoCurriculo } from "@/lib/validacao/curriculo";
import { campoDeJustificativa } from "@/lib/validacao/justificativa";

/* A sigla do curso e o número do currículo: os mesmos campos de toda ação do currículo, num lugar só. */
const { sigla, versao } = esquemaDoArquivamentoDoCurriculo.shape;

/** Texto opcional: vazio e só-espaços viram **nulo**, nunca texto em branco gravado. */
const opcional = (maximo: number, campo: string) =>
  z
    .string()
    .trim()
    .max(maximo, `${campo} passou de ${maximo} caracteres.`)
    .nullish()
    .transform((v) => (v === undefined || v === null || v === "" ? null : v));

const vazioViraNulo = (v: unknown) =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v;

export const MAXIMO_DE_TA_PREVISTOS = 999;

export const esquemaDaAecPrevista = z.object({
  sigla,
  versao,
  /** Com `id`, edita; sem, inclui. */
  id: z.uuid({ error: "AEC prevista inválida." }).optional(),
  nome: z
    .string({ error: "Informe o nome da AEC prevista." })
    .trim()
    .min(1, "Informe o nome da AEC prevista.")
    .max(200, "O nome passou de 200 caracteres."),
  tipoAtividadeId: z.uuid({ error: "Escolha o tipo da atividade." }),
  taPrevistos: z.preprocess(
    vazioViraNulo,
    z.coerce
      .number({ error: "Os TA previstos são um número inteiro." })
      .int("Os TA previstos são um número inteiro.")
      .min(1, "Os TA previstos começam em 1 — deixe vazio quando o currículo não diz.")
      .max(MAXIMO_DE_TA_PREVISTOS, `Os TA previstos passaram de ${MAXIMO_DE_TA_PREVISTOS}.`)
      .nullable(),
  ),
  disciplinaId: z.preprocess(vazioViraNulo, z.uuid({ error: "Disciplina inválida." }).nullable()),
  obrigatoria: z.boolean({ error: "Diga se a AEC prevista é obrigatória." }),
  fonteArquivo: opcional(200, "O nome do arquivo"),
  fontePagina: opcional(100, "A página"),
  observacao: opcional(1000, "A observação"),
  justificativa: campoDeJustificativa,
});

/** Desativar e reativar levam só a AEC prevista (e a justificativa, no currículo em uso). */
export const esquemaDaSituacaoDaAecPrevista = z.object({
  sigla,
  versao,
  id: z.uuid({ error: "AEC prevista inválida." }),
  justificativa: campoDeJustificativa,
});

export type AecPrevistaParaGravar = z.infer<typeof esquemaDaAecPrevista>;

/**
 * Validação de entrada das Server Actions de **disciplina** (`FR-010`, `FR-011`, `FR-013`).
 *
 * ⚠️ **O MODO OFERECE DOIS VALORES, NUNCA TRÊS** (`N-2`, 24/09/2026). O enum do banco tem `herdar`,
 * e o `CHECK` `disciplinas_modo_padrao_concreto` **o proíbe** nesta coluna: `herdar` significa *"usar
 * o modo padrão da disciplina"*, e a disciplina não pode herdar de si mesma. Oferecê-lo na tela
 * produziria uma recusa do banco para uma escolha que a própria tela apresentou.
 *
 * ⚠️ **A UNICIDADE DO CÓDIGO NÃO É CONFERIDA AQUI**, e a ausência é decisão. Quem decide é o índice
 * parcial `uq_disciplinas_curso_cod_ativo` — `where status = 'ativo'` —, e é ele que faz a `Q-04`
 * valer: desativar uma disciplina **libera** o código. Uma conferência nesta camada daria a resposta
 * certa quase sempre e erraria exatamente no caso interessante, que é a corrida entre duas gravações.
 */
import { z } from "zod";

/** ⚠️ Os dois modos CONCRETOS. `herdar` fica fora — ver o cabeçalho. */
export const MODOS_DE_ATRIBUICAO = ["dividido", "simultaneo"] as const;

export const ROTULO_DO_MODO: Readonly<Record<(typeof MODOS_DE_ATRIBUICAO)[number], string>> = {
  dividido: "Dividido entre os instrutores",
  simultaneo: "Simultâneo — cada um recebe a carga integral",
};

const textoObrigatorio = (oQue: string, maximo = 200) =>
  z
    .string({ error: `Informe ${oQue}.` })
    .trim()
    .min(1, `Informe ${oQue}.`)
    .max(maximo, `${oQue} passou de ${maximo} caracteres.`);

const dataOpcional = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "A data precisa estar no formato AAAA-MM-DD.")
  .nullish()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const esquemaDeDisciplina = z.object({
  cursoId: z.uuid({ error: "Curso inválido." }),
  codDisciplina: textoObrigatorio("o código da disciplina", 40),
  nomeDisciplina: textoObrigatorio("o nome da disciplina"),
  cargaHorariaTempos: z
    .number({ error: "Informe a carga horária em tempos." })
    .int("A carga horária é em tempos inteiros.")
    .positive("A carga horária tem de ser maior que zero."),
  /** ⚠️ Opcional: o currículo é construído ao longo do ano, e ordem vazia é estado normal. */
  ordemSugerida: z.number().int().positive().nullish(),
  modoAtribuicaoPadrao: z.enum(MODOS_DE_ATRIBUICAO, {
    error: "Escolha se a disciplina é dividida ou simultânea.",
  }),
  tecnicaEnsinoSugerida: z.string().trim().max(120).nullish(),
  localPadrao: z.string().trim().max(120).nullish(),
});

/** A edição manda o `id` junto; o curso **não** muda — mover disciplina de curso não é desta fatia. */
export const esquemaDeEdicaoDeDisciplina = esquemaDeDisciplina
  .omit({ cursoId: true })
  .extend({ disciplinaId: z.uuid({ error: "Disciplina inválida." }) });

/** Desativar e reativar mandam **só** o identificador (`FR-013`). */
export const esquemaDeSituacaoDaDisciplina = z.object({
  disciplinaId: z.uuid({ error: "Disciplina inválida." }),
});

/**
 * A exclusão permanente — identificador **e** código digitado (`FR-021`).
 *
 * ⚠️ O código também vai ao banco, que o confere de novo e recusa com `codigo_nao_confere`. Conferir
 * só aqui deixaria a ação alcançável por chamada direta sem o segundo passo.
 */
export const esquemaDeExclusaoDeDisciplina = z.object({
  disciplinaId: z.uuid({ error: "Disciplina inválida." }),
  codigoConfirmacao: textoObrigatorio("o código para confirmar", 60),
});

/** O período previsto **daquela turma** (`FR-030`). */
export const esquemaDePeriodoDaTurma = z.object({
  turmaDisciplinaId: z.uuid({ error: "Grade da turma inválida." }),
  previsaoInicio: dataOpcional,
  previsaoTermino: dataOpcional,
});

export type DisciplinaParaGravar = z.infer<typeof esquemaDeDisciplina>;

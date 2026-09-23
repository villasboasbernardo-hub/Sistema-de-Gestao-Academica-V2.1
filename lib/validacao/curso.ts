/**
 * Validação de entrada das Server Actions de curso (`FR-013`, `FR-015`, `FR-015.1`, `FR-019.5`).
 *
 * ⚠️ **ESTE ESQUEMA NÃO É A GARANTIA.** O `CHECK` e o gatilho do banco são: a recusa tem de valer por
 * qualquer caminho, e uma Server Action é só um deles. O esquema recusa cedo, na primeira linha, e diz
 * **qual** campo falta — o que o erro do banco não diz a quem está na tela.
 *
 * ⚠️ **BRANCO É AUSÊNCIA.** `trim` antes de `min(1)`: texto só com espaços é recusado igual ao vazio.
 *
 * ⚠️ **NENHUM VALOR-PADRÃO SILENCIOSO** (`FR-015.1`) — *"valor gravado que ninguém escolheu é
 * indistinguível de escolha real; é pior que nulo"*. **Modalidade não tem padrão aqui.** O nulo o
 * quadro de avisos detecta e sinaliza; o padrão silencioso some para sempre, e um curso EAD que
 * virasse `presencial` jamais apareceria num aviso.
 *
 * ⚠️ **O LIMITE É A EXCEÇÃO DECLARADA, e não um padrão silencioso.** Ausente, vai **nulo** ao banco, e
 * a classificação o preenche por gatilho (`FR-003.2`) — regra declarada, à vista e editável. Inventar
 * um número aqui é que seria o defeito.
 *
 * ⚠️ **OS LIMITES DO REGIME SÃO OS DO BANCO**, conferidos em `pg_constraint` em 23/09/2026:
 * `regime_tempos` de 1 a 12, `ta_duracao_min` em {45, 50}, intervalos de 0 a 120, tarde depois da
 * manhã. Repeti-los aqui é recusar cedo com mensagem legível, nunca substituir o `CHECK`.
 *
 * ⚠️ **A EDIÇÃO NÃO LEVA REGIME NEM `status`.** Vigência se registra em `/cursos/[curso]/editar`, por
 * ação própria (`FR-013.1`); situação tem `desativarCurso`/`reativarCurso` (`FR-017`). `z.object`
 * descarta chave desconhecida, então nenhum dos dois chega à escrita mesmo que venha no corpo.
 */
import { z } from "zod";

import { CLASSIFICACOES_DE_CURSO } from "@/lib/dominio/classificacoes-de-curso";
import { Constants } from "@/lib/tipos/database";

const MODALIDADES = Constants.public.Enums.modalidade_ensino;

/** Texto obrigatório: `trim` antes de medir, e a mensagem nomeia o campo. */
const obrigatorio = (campo: string) =>
  z
    .string({ error: `${campo} é obrigatório.` })
    .trim()
    .min(1, `${campo} é obrigatório.`);

/** Texto opcional: vazio e só-espaços viram **nulo**, nunca texto em branco gravado. */
const opcional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullish()
  .transform((v) => v ?? null);

const inteiroPositivo = (campo: string) =>
  z.coerce
    .number({ error: `${campo} é obrigatório.` })
    .int(`${campo} tem de ser um número inteiro.`)
    .positive(`${campo} tem de ser maior que zero.`);

const inteiroPositivoOpcional = (campo: string) =>
  z.coerce
    .number()
    .int(`${campo} tem de ser um número inteiro.`)
    .positive(`${campo} tem de ser maior que zero.`)
    .nullish()
    .transform((v) => v ?? null);

/**
 * O regime `padrao` que nasce com o curso (`FR-019.5`).
 *
 * ⚠️ **ELE É OBRIGATÓRIO NA CRIAÇÃO, e isso é regra do banco, não zelo da tela**: o gatilho adiado
 * `trg_regime_curso_continua_com_regime` recusa no `COMMIT` um curso sem vigência `padrao`, com a
 * chave `curso_sem_regime`. Recusar aqui dá a mensagem de qual parâmetro falta.
 */
export const esquemaDeRegimePadrao = z.object({
  regime_tempos: z.coerce
    .number({ error: "Informe quantos tempos de aula o dia tem." })
    .int()
    .min(1, "O regime é de 1 a 12 tempos de aula por dia.")
    .max(12, "O regime é de 1 a 12 tempos de aula por dia."),
  ta_duracao_min: z.coerce
    .number({ error: "Informe a duração do tempo de aula." })
    .refine((v) => v === 45 || v === 50, "A duração do TA é de 45 ou 50 minutos."),
  intervalo_manha_min: z.coerce.number().int().min(0).max(120),
  intervalo_tarde_min: z.coerce.number().int().min(0).max(120),
  hora_inicio_manha: obrigatorio("Hora de início da manhã"),
  hora_inicio_tarde: obrigatorio("Hora de início da tarde"),
  vigente_de: obrigatorio("Data a partir da qual vale"),
  fundamento_curricular: opcional,
  motivo: opcional,
});

/** Os campos do curso, iguais na criação e na edição. */
const camposDoCurso = {
  codigo: obrigatorio("Sigla"),
  nome_curso: obrigatorio("Nome do curso"),
  classificacao: z.enum(CLASSIFICACOES_DE_CURSO, {
    error: "Classificação é obrigatória.",
  }),
  modalidade: z.enum(MODALIDADES, { error: "Modalidade é obrigatória." }),
  duracao_dias: inteiroPositivo("Duração em dias"),
  duracao_semanas: inteiroPositivoOpcional("Duração em semanas"),
  limite_turmas_ano: inteiroPositivoOpcional("Limite de turmas por ano"),
  proposito: opcional,
};

export const esquemaDeCriacaoDeCurso = z.object({
  ...camposDoCurso,
  // A mensagem nomeia o que falta: sem ela, o Zod diria "expected object, received undefined",
  // que não diz a ninguém que o curso precisa nascer com um regime de horário.
  regime: z.object(esquemaDeRegimePadrao.shape, {
    error: "Todo curso nasce com um regime de horário padrão. Informe o regime.",
  }),
});

export const esquemaDeEdicaoDeCurso = z.object(camposDoCurso);

export type CursoParaCriar = z.infer<typeof esquemaDeCriacaoDeCurso>;
export type CursoParaEditar = z.infer<typeof esquemaDeEdicaoDeCurso>;

/** `{ sigla }` — o que as ações de situação precisam, e nada mais (`FR-017`). */
export const esquemaDeSituacaoDoCurso = z.object({
  sigla: obrigatorio("Sigla"),
});

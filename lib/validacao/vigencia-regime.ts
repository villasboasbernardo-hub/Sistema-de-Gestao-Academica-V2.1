/**
 * Validação de entrada das Server Actions de vigência de regime (`FR-019`, `FR-022`).
 *
 * ⚠️ **ELA NÃO INVENTA REGRA: ESPELHA A QUE O BANCO JÁ IMPÕE** (`FR-022`, B-16 de 17/09/2026). Os
 * pares autorizados por currículo que o `RF-HOR-03` pede **não existem como dado** e não entram nesta
 * fatia; o que se valida aqui é o que os `CHECK` de `curso_regime_historico` recusariam — TA de **45
 * ou 50** minutos, **1 a 12** TA por dia, intervalos de **0 a 120**, tarde depois da manhã, limite
 * diário EAD positivo. Antecipar aqui é cortesia; a garantia continua sendo do banco.
 *
 * ⚠️ **O REGIME PURAMENTE EAD É A EXCEÇÃO ESCRITA NO PRÓPRIO `CHECK`**: `regime_tempos = 0` e
 * `ta_duracao_min = 0` são aceitos **quando há** limite diário em horas. Recusá-los aqui faria a tela
 * ser mais estrita que a regra, e um curso EAD legítimo deixaria de ser cadastrável.
 *
 * ⚠️ **SEM PADRÃO SILENCIOSO** (`FR-015.1`): tipo e `vigente_de` são obrigatórios, e campo em branco é
 * **ausência**, nunca zero.
 */
import { z } from "zod";

import { TIPOS_DE_REGIME } from "@/lib/dominio/vigencia-de-regime";

/** Texto em branco é ausência — nunca `0`, nunca `""` gravado. */
const opcional = <T extends z.ZodTypeAny>(esquema: T) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    esquema.optional(),
  );

const inteiro = (erro: string) => z.coerce.number({ error: erro }).int(erro);

export const esquemaDeVigencia = z
  .object({
    tipo_regime: z.enum(TIPOS_DE_REGIME, { error: "Escolha o tipo de regime." }),

    /*
     * ⚠️ **VAZIO E MAL FORMADO SÃO DUAS RECUSAS DIFERENTES.** Quem não preencheu precisa ler
     *    *"obrigatória"*; quem escreveu `01/01/2026` precisa ler o formato. Uma mensagem só para os
     *    dois manda a primeira pessoa procurar erro de digitação num campo que ela deixou em branco.
     */
    vigente_de: z
      .string({ error: "A data a partir da qual a vigência vale é obrigatória." })
      .trim()
      .min(1, "A data a partir da qual a vigência vale é obrigatória.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data no formato aaaa-mm-dd."),

    regime_tempos: inteiro("Informe quantos TA por dia.")
      .min(0, "TA por dia vai de 1 a 12 — ou 0, no regime só de EAD.")
      .max(12, "O limite é 12 TA por dia."),

    ta_duracao_min: inteiro("Informe a duração do TA.").refine(
      (n) => n === 45 || n === 50 || n === 0,
      "A duração do TA é 45 ou 50 minutos — ou 0, no regime só de EAD.",
    ),

    intervalo_manha_min: inteiro("Informe o intervalo da manhã.")
      .min(0, "O intervalo não pode ser negativo.")
      .max(120, "O intervalo vai até 120 minutos."),

    intervalo_tarde_min: inteiro("Informe o intervalo da tarde.")
      .min(0, "O intervalo não pode ser negativo.")
      .max(120, "O intervalo vai até 120 minutos."),

    hora_inicio_manha: opcional(z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida.")),
    hora_inicio_tarde: opcional(z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida.")),

    limite_diario_ead_horas: opcional(
      z.coerce
        .number({ error: "Limite diário EAD inválido." })
        .positive("O limite diário de EAD, quando informado, é maior que zero."),
    ),

    fundamento_curricular: opcional(z.string().trim().min(1)),
    motivo: opcional(z.string().trim().min(1)),
  })
  /*
   * ⚠️ **AS DUAS TRAVESSIAS DO `CHECK` QUE UM CAMPO SOZINHO NÃO VÊ.** Elas existem aqui para que a
   *    recusa nomeie o campo; o banco continua sendo quem garante.
   */
  .refine(
    (v) =>
      v.hora_inicio_manha === undefined ||
      v.hora_inicio_tarde === undefined ||
      v.hora_inicio_tarde > v.hora_inicio_manha,
    { error: "O início da tarde é depois do início da manhã.", path: ["hora_inicio_tarde"] },
  )
  .refine(
    (v) => (v.regime_tempos > 0 && v.ta_duracao_min > 0) || v.limite_diario_ead_horas !== undefined,
    {
      error:
        "Regime sem TA por dia ou sem duração de TA só existe com limite diário de EAD informado.",
      path: ["limite_diario_ead_horas"],
    },
  );

export type VigenciaParaGravar = z.infer<typeof esquemaDeVigencia>;

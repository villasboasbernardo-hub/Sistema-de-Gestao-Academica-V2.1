/**
 * Validação da **atribuição de instrutores** a uma turma-disciplina (`FR-031`, `FR-041`, `FR-043`).
 *
 * ⚠️ **A SOMA EXATA NÃO É CONFERIDA AQUI, E A AUSÊNCIA É DELIBERADA** (`FR-043`). Quem confere é o
 * **gatilho adiado** do banco, em `turma_disciplina_instrutor` e em `turma_disciplina_unidade`: ele
 * roda no fim da transação e recusa com `rateio_nao_fecha`, `rateio_incompleto`, `ue_sem_instrutor` e
 * `rateio_por_ue_com_ta`. Repetir a conta neste esquema criaria uma **segunda fonte de verdade** para
 * a mesma regra — e a da tela divergiria da do banco no dia em que uma das duas mudasse.
 *
 * ⚠️ **O QUE A TELA FAZ É ANTECIPAR, e isso é outra coisa.** `lib/dominio/rateio-de-carga.ts` calcula
 * o mesmo número que o banco e mostra a soma **antes** de gravar, para a pessoa corrigir sem esperar
 * a recusa. A antecipação é conveniência; a garantia é o gatilho.
 *
 * ⚠️ **PARCELA FRACIONÁRIA É RECUSADA JÁ AQUI**, e essa é a exceção: um `0,5` não é um erro de conta,
 * é um erro de digitação, e mandá-lo ao banco para ouvir `23514` é pior do que dizer na hora.
 */
import { z } from "zod";

const instrutorNaAtribuicao = z.object({
  instrutorId: z.uuid({ error: "Instrutor inválido." }),
  /**
   * Caso 4 do `FR-041` — TA digitados. `null` = não digitado.
   *
   * ⚠️ **`null` E `0` SÃO COISAS DIFERENTES.** `null` significa *"divida igualmente"* (caso 3); `0`
   * significa *"esta pessoa recebe zero tempos"*, que é uma escolha, e o gatilho a recusará se a soma
   * não fechar. Tratar os dois como o mesmo faria a divisão igual virar zero para todo mundo.
   */
  chPrevistaTempos: z
    .number({ error: "Os tempos precisam ser um número." })
    .int("Os tempos precisam ser inteiros.")
    .min(0, "Os tempos não podem ser negativos.")
    .nullish(),
});

const unidadeNaAtribuicao = z.object({
  unidadeEnsinoId: z.uuid({ error: "Unidade de ensino inválida." }),
  instrutorId: z.uuid({ error: "Instrutor inválido." }),
});

export const esquemaDeAtribuicao = z
  .object({
    turmaDisciplinaId: z.uuid({ error: "Grade da turma inválida." }),
    instrutores: z.array(instrutorNaAtribuicao),
    /**
     * Caso 5 do `FR-041` — a atribuição por UE. `null` = não é este o modo.
     *
     * ⚠️ **`null` E `[]` SÃO COISAS DIFERENTES, e a RPC lê essa diferença.** `null` deixa as
     * atribuições por UE **como estão**; `[]` as **apaga todas**. Mandar `[]` sem querer tiraria o
     * rateio por unidade de uma turma inteira em silêncio.
     */
    unidades: z.array(unidadeNaAtribuicao).nullish(),
  })
  .refine(
    (v) =>
      !(v.unidades && v.unidades.length > 0) ||
      v.instrutores.every((i) => i.chPrevistaTempos === null || i.chPrevistaTempos === undefined),
    {
      // ⚠️ Esta é a única regra de rateio conferida aqui, e ela existe porque o formulário **pode**
      //    produzir o estado misto: a pessoa digita tempos, troca para o modo por UE e envia. O banco
      //    recusa com `rateio_por_ue_com_ta`; dizer antes evita a ida e volta.
      error:
        "Escolha um modo só: por unidade de ensino OU por tempos digitados. No rateio por unidade a carga de cada um é a soma das unidades dele.",
      path: ["unidades"],
    },
  );

/** Um instrutor só, para remover da atribuição sem reenviar a lista inteira. */
export const esquemaDeRemocaoDeInstrutor = z.object({
  turmaDisciplinaId: z.uuid({ error: "Grade da turma inválida." }),
  instrutorId: z.uuid({ error: "Instrutor inválido." }),
});

export type AtribuicaoParaGravar = z.infer<typeof esquemaDeAtribuicao>;

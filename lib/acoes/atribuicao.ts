"use server";

/**
 * Server Actions da **atribuição de instrutores** a uma turma-disciplina (`FR-031`, `FR-041`).
 *
 * ⚠️ **TUDO POR UMA RPC SÓ, e a razão é a soma exata.** `definir_instrutores_da_turma` desativa quem
 * saiu, insere ou reativa quem ficou e regrava as unidades — **na mesma transação**. O gatilho do
 * `FR-043` é **adiado**: ele confere a soma no fim da transação. Fazer isso em três chamadas faria o
 * gatilho disparar com a soma **parcial** — medido na própria suíte desta fatia: *"as parcelas somam
 * 7.00 tempos; a disciplina tem 10"* depois do primeiro de dois instrutores.
 *
 * ⚠️ **A LISTA É O ESTADO FINAL, não um delta.** Quem não está nela sai. Um "adicionar" e um
 * "remover" separados exigiriam que a tela soubesse o estado do banco no instante da gravação — e
 * duas abas abertas produziriam o resultado de quem clicou por último, sem ninguém notar.
 *
 * ⚠️ **`null` E `[]` EM `unidades` SÃO COISAS DIFERENTES**, e a RPC lê a diferença: `null` deixa as
 * atribuições por UE como estão; `[]` apaga todas. É por isso que o esquema as distingue em vez de
 * normalizar.
 */
import { revalidatePath } from "next/cache";

import { traduzirRecusa, type ErroDoBanco } from "@/lib/acoes/traducao-de-recusas";
import { ROTA_DA_FICHA_DA_TURMA } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { esquemaDeAtribuicao, esquemaDeRemocaoDeInstrutor } from "@/lib/validacao/atribuicao";

export type ResultadoDaAtribuicao =
  | { readonly ok: true; readonly instrutores: number }
  | { readonly ok: false; readonly erro: string };

const falha = (erro: string): ResultadoDaAtribuicao => ({ ok: false, erro });

function primeiraMensagem(issues: readonly { message: string }[]): string {
  return issues[0]?.message ?? "Dados inválidos.";
}

/** Define quem são os instrutores daquela turma-disciplina, e quanto cada um recebe. */
export async function definirInstrutoresDaTurma(entrada: unknown): Promise<ResultadoDaAtribuicao> {
  const conferido = esquemaDeAtribuicao.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const a = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { data, error } = await supabase.rpc("definir_instrutores_da_turma", {
    p_turma_disciplina_id: a.turmaDisciplinaId,
    p_instrutores: a.instrutores.map((i) => ({
      instrutor_id: i.instrutorId,
      // ⚠️ `undefined` vira `null` explicitamente: o corpo da RPC faz `(x ->> 'ch_prevista_tempos')`,
      //    e uma chave AUSENTE e uma chave NULA dão o mesmo resultado lá — mas mandar a chave torna a
      //    intenção legível no log da requisição, que é onde alguém vai olhar quando algo der errado.
      ch_prevista_tempos: i.chPrevistaTempos ?? null,
    })),
    p_unidades:
      a.unidades === null || a.unidades === undefined
        ? null
        : a.unidades.map((u) => ({
            unidade_ensino_id: u.unidadeEnsinoId,
            instrutor_id: u.instrutorId,
          })),
  });

  if (error) return falha(traduzirRecusa(error as ErroDoBanco));

  revalidatePath("/disciplinas");
  revalidatePath("/instrutores");
  /*
   * ⚠️ **A FICHA DA TURMA ENTROU NA REVALIDAÇÃO EM 04/10/2026, E A FALTA DELA SERIA SILENCIOSA.**
   *    O período e os instrutores passaram a ser editados na seção de disciplinas da ficha
   *    (`FR-018` da spec 012); sem esta linha, gravar ali deixaria a tela mostrando o valor
   *    **velho**, sem erro nenhum — o gotcha 4 na forma de cache.
   * ⚠️ **É O PADRÃO DE ROTA, NÃO UM ENDEREÇO**, e sai do módulo único: a ação conhece o
   *    `turmaDisciplinaId`, não o código da turma, e descobri-lo custaria uma consulta a mais
   *    só para revalidar uma tela (decisão **D12**).
   */
  revalidatePath(ROTA_DA_FICHA_DA_TURMA, "page");
  return { ok: true, instrutores: Array.isArray(data) ? data.length : a.instrutores.length };
}

/**
 * Tira um instrutor da atribuição, **remontando a lista sem ele**.
 *
 * ⚠️ **ELA LÊ O ESTADO ATUAL E REENVIA A LISTA INTEIRA**, em vez de desativar a linha dele. Desativar
 * sozinho deixaria as parcelas dos que ficaram somando **menos** que a CH, e o gatilho adiado
 * recusaria com `rateio_nao_fecha` — uma recusa correta, sobre uma ação que a pessoa não fez. Ao
 * remontar, as parcelas digitadas de quem sai são descartadas e o rateio volta ao caso 3, que fecha.
 */
export async function removerInstrutorDaTurma(entrada: unknown): Promise<ResultadoDaAtribuicao> {
  const conferido = esquemaDeRemocaoDeInstrutor.safeParse(entrada);
  if (!conferido.success) return falha(primeiraMensagem(conferido.error.issues));

  const { turmaDisciplinaId, instrutorId } = conferido.data;
  const supabase = await criarClienteDeServidor();

  const { data: atuais, error: erroLeitura } = await supabase
    .from("turma_disciplina_instrutor")
    .select("instrutor_id")
    .eq("turma_disciplina_id", turmaDisciplinaId)
    .eq("status", "ativo");

  if (erroLeitura) return falha(traduzirRecusa(erroLeitura as ErroDoBanco));

  const restantes = (atuais ?? [])
    .map((l) => (l as { instrutor_id: string }).instrutor_id)
    .filter((id) => id !== instrutorId);

  // ⚠️ Sem parcela digitada: quem fica volta à divisão igual, que sempre fecha (`FR-041.3`).
  return definirInstrutoresDaTurma({
    turmaDisciplinaId,
    instrutores: restantes.map((id) => ({ instrutorId: id, chPrevistaTempos: null })),
    unidades: null,
  });
}

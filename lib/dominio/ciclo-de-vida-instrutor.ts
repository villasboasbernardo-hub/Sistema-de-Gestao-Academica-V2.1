/**
 * `RN-INST-02` — a exclusão de instrutor é lógica, e o inativo sai só do que é **futuro**. **Risco: Alto.**
 *
 * > *"A exclusão de um instrutor é sempre lógica (soft delete), nunca física: o registro passa a ter
 * > status inativo, e o instrutor é removido apenas de atribuições **futuras** (a matéria deixa de
 * > listá-lo entre os instrutores designados). Um instrutor inativo deve: (i) desaparecer das opções
 * > para **novos** lançamentos de aula e **novas** atribuições de matéria; (ii) continuar aparecendo,
 * > com nome e posto corretos, em qualquer histórico já existente (relatórios, Cronos, Diagrama de
 * > Alocação, registros de aula); (iii) continuar visível na própria tela de cadastro de instrutores,
 * > com indicação de que está inativo; (iv) poder ser reativado, retornando ao mesmo estado de
 * > disponibilidade para novas atribuições. **Risco: Alto**"* — documento 04, `RN-INST-02`
 *
 * ⚠️ ESTA FUNÇÃO É O ITEM (i), E SÓ ELE. Nenhuma tela desta fatia tem lista de nova atribuição
 * (anotação de 15/09/2026 no `FR-009` da spec 006): ela existe agora, testada, para que a fatia que
 * construir essa lista não reescreva a regra. Os itens (ii) e (iii) são o contrário de filtrar — o
 * histórico e o cadastro **não** passam por aqui.
 *
 * ⚠️ O STATUS É EXPLÍCITO (`RN-INST-05`). Quem não traz `ativo` não é elegível: um `status` ausente
 * não é lido como "ativo por padrão", que é exatamente a inferência que a regra proíbe.
 *
 * ⚠️ A ORDEM DE ENTRADA É PRESERVADA, E A LISTA RECEBIDA NÃO É ALTERADA. Quem ordena por antiguidade é
 * `antiguidade.ts`, e o seletor único a aplica; filtrar aqui não pode desfazer nem refazer aquela
 * ordem, nem mexer no vetor de quem chamou.
 */

/** O mínimo que a regra precisa saber de alguém. */
export type ComSituacao = { readonly status: string | null | undefined };

/** Os instrutores que podem receber **nova** atribuição ou **novo** lançamento: só os ativos. */
export function elegiveisParaNovaAtribuicao<T extends ComSituacao>(instrutores: readonly T[]): T[] {
  return instrutores.filter((i) => i.status === "ativo");
}

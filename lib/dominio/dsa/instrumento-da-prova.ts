/**
 * O **instrumento da prova sem item do currículo** — `avaliacoes.instrumento_id` (A2 do desenho de 15/10/2026,
 * opção A aprovada por Bernardo Villas Boas em 16/10/2026; `RN-AV-13` e `RN-AV-14` da spec 014).
 *
 * > *"vista é obrigatória só para PM e PO…"* — `RN-AV-13`, emendada em 16/10/2026: **PM, PO e PE**.
 * > *"prova a mais que o currículo prevê NÃO é erro de planilha; vira alerta informativo na aba Avaliações da
 * > turma ("currículo prevê 1 PP; aplicadas 2")."* — `RN-AV-14`
 *
 * ⚠️ **COM ITEM LIGADO, A COLUNA VAI NULA, e quem lê usa o instrumento DO ITEM** — a coluna nunca é segunda fonte de
 *    verdade (o gatilho `instrumento_diferente_do_item` recusa um valor diferente do do item). Sem item, o
 *    instrumento é OPCIONAL: ausente, a obrigação de vista cai no "instrumento desconhecido" de `fn_status_vista`.
 * ⚠️ **A OBSERVAÇÃO DE DESEMPENHO (OD) NÃO É OFERECIDA** — ela não é prova lançada no DSA (instrução de 16/10/2026
 *    para o DSA: *"os valores ativos de `instrumentos_avaliacao`, menos `OD`"*). A Server Action recusa por esta
 *    MESMA função, porque a regra não pode viver só na tela.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */

/** O instrumento que fica FORA da escolha da prova no DSA. */
export const INSTRUMENTO_FORA_DO_DSA = "OD";

/** Uma linha de `config_listas` da lista `instrumentos_avaliacao`, no mínimo que a escolha precisa. */
export type InstrumentoDaLista = {
  readonly id: string;
  readonly valor: string;
  readonly rotulo: string | null;
  readonly ativo: boolean;
};

export type InstrumentoOferecido = {
  readonly id: string;
  readonly valor: string;
  /** `PE — Prova Escrita`, ou só a sigla quando a lista não traz o nome. */
  readonly rotulo: string;
};

/** Os instrumentos que o formulário oferece: os ATIVOS, menos a OD, na ordem recebida (a `ordem` da lista). */
export function instrumentosOferecidos(
  lista: readonly InstrumentoDaLista[],
): readonly InstrumentoOferecido[] {
  return lista
    .filter((i) => i.ativo && i.valor.trim().toUpperCase() !== INSTRUMENTO_FORA_DO_DSA)
    .map((i) => {
      const nome = (i.rotulo ?? "").trim();
      return { id: i.id, valor: i.valor, rotulo: nome === "" ? i.valor : `${i.valor} — ${nome}` };
    });
}

export type InstrumentoNaGravacao =
  | { readonly ok: true; readonly instrumentoId: string | null }
  | { readonly ok: false; readonly mensagem: string };

/**
 * O `instrumento_id` que a gravação escreve.
 *
 * ⚠️ **COM ITEM DO CURRÍCULO, SEMPRE NULO** — mesmo que um valor tenha vindo: o instrumento é o do item.
 * ⚠️ **SEM ITEM, SÓ UM DOS OFERECIDOS** (ativo, da lista, e não a OD); nulo é aceito (o campo é opcional).
 */
export function instrumentoNaGravacao(entrada: {
  readonly avaliacaoCurriculoId: string | null;
  readonly instrumentoId: string | null;
  readonly oferecidos: readonly InstrumentoOferecido[];
}): InstrumentoNaGravacao {
  if (entrada.avaliacaoCurriculoId !== null) return { ok: true, instrumentoId: null };
  if (entrada.instrumentoId === null) return { ok: true, instrumentoId: null };
  if (!entrada.oferecidos.some((o) => o.id === entrada.instrumentoId)) {
    return {
      ok: false,
      mensagem:
        "Escolha um instrumento da lista (a Observação de Desempenho não é lançada como prova no DSA).",
    };
  }
  return { ok: true, instrumentoId: entrada.instrumentoId };
}

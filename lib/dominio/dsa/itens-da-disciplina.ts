/**
 * A oferta do formulário do DSA para uma disciplina: as **unidades de ensino** (conteúdo) e as **avaliações do
 * currículo** (prova e trabalho), com a vista como a próxima sessão da prova aplicada (spec 014, FR-032, FR-033,
 * FR-040).
 *
 * > *"Toda avaliação lançada no Detalhe Semanal de Aula (…) aponta explicitamente a avaliação do currículo que
 * > cumpre, quando a disciplina tiver avaliação transcrita."* — `RN-AVAL-01` (emendada, spec 014 §12)
 *
 * > *"Avaliação e vista de prova consomem TA de Aula, com a mesma mecânica de uma aula comum"* — `RN-EVT-03`
 *
 * ⚠️ **A AVALIAÇÃO JÁ APLICADA CONTINUA NA OFERTA, MARCADA** — e lançá-la de novo é **alerta, nunca bloqueio**
 *    (edge case da spec, `RN-DEG-02`): a segunda chamada de uma prova existe, e a tela não pode impedi-la.
 * ⚠️ **A OD NÃO SE OFERECE**: ela é contínua, sem TA próprio de aplicação (Q-17).
 * ⚠️ **A VISTA É A PRÓXIMA SESSÃO** da prova aplicada (FR-040): sessão 1, depois 2… — o número é o seguinte ao
 *    maior das sessões ativas.
 * ⚠️ TypeScript puro: sem `next`, sem `react`, sem `supabase` (Princípio II).
 */
import type { NaturezaDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";

export type ItemParaOferta = {
  readonly id: string;
  /** `PM 1`, `TG 2`… */
  readonly rotulo: string;
  readonly natureza: NaturezaDaAvaliacao;
  /** O número da UE em que o currículo computa o item; `null` = no nível da disciplina. */
  readonly ueNumero: number | null;
  readonly taAplicacao: number | null;
  readonly taVista: number | null;
};

export type AvaliacaoLancadaParaOferta = {
  readonly id: string;
  readonly itemId: string | null;
  readonly tipo: string;
  /** A data ISO da aplicação. */
  readonly aplicacao: string;
  /** Os números das sessões de vista ATIVAS. */
  readonly sessoes: readonly number[];
};

export type ItemOferecido = {
  readonly itemId: string;
  /** `PM 1 (UE 7)` — a UE entre parênteses quando o currículo a nomeia. */
  readonly rotulo: string;
  readonly tempo: number | null;
  /** Já há avaliação viva ligada ao item. */
  readonly aplicada: boolean;
};

export type VistaOferecida = {
  readonly avaliacaoId: string;
  readonly rotulo: string;
  /** O número da sessão que este lançamento abre. */
  readonly proximaSessao: number;
  /** O tempo de vista previsto no currículo, quando há. */
  readonly tempo: number | null;
};

export type OfertaDaDisciplina = {
  readonly avaliacoes: readonly ItemOferecido[];
  readonly vistas: readonly VistaOferecida[];
};

export function rotuloDoItem(item: Pick<ItemParaOferta, "rotulo" | "ueNumero">): string {
  return item.ueNumero === null ? item.rotulo : `${item.rotulo} (UE ${item.ueNumero})`;
}

export function ofertaDaDisciplina(entrada: {
  readonly itens: readonly ItemParaOferta[];
  readonly avaliacoes: readonly AvaliacaoLancadaParaOferta[];
}): OfertaDaDisciplina {
  const aplicados = new Set(
    entrada.avaliacoes.map((a) => a.itemId).filter((i): i is string => i !== null),
  );
  const itemPorId = new Map(entrada.itens.map((i) => [i.id, i] as const));

  const avaliacoes = entrada.itens
    .filter((i) => i.natureza !== "od")
    .map((i) => ({
      itemId: i.id,
      rotulo: rotuloDoItem(i),
      tempo: i.taAplicacao,
      aplicada: aplicados.has(i.id),
    }))
    // As não aplicadas primeiro; dentro de cada grupo, a ordem do currículo.
    .sort((a, b) => Number(a.aplicada) - Number(b.aplicada));

  const vistas: VistaOferecida[] = [];
  for (const a of entrada.avaliacoes) {
    const item = a.itemId === null ? undefined : itemPorId.get(a.itemId);
    // Item com vista nula ou zero não prevê vista; sem item (histórico), a vista continua possível.
    if (item && (item.natureza === "od" || !item.taVista)) continue;
    const proxima = a.sessoes.reduce((m, n) => Math.max(m, n), 0) + 1;
    const nome = item ? rotuloDoItem(item) : a.tipo;
    vistas.push({
      avaliacaoId: a.id,
      rotulo: `Vista da ${nome}, aplicada em ${a.aplicacao} — sessão ${proxima}`,
      proximaSessao: proxima,
      tempo: item?.taVista ?? null,
    });
  }
  return { avaliacoes, vistas };
}

/**
 * O alerta de lançar uma avaliação cujo item JÁ está aplicado (edge case, `RN-DEG-02`): avisa, nunca recusa.
 */
export function alertaDeItemJaAplicado(
  oferta: OfertaDaDisciplina,
  itemId: string | null,
): string | null {
  if (itemId === null) return null;
  const item = oferta.avaliacoes.find((a) => a.itemId === itemId);
  return item?.aplicada
    ? `${item.rotulo} já tem avaliação lançada: este lançamento passa do previsto do currículo.`
    : null;
}

/**
 * O *"X de Y avaliações do currículo aplicadas"* de uma disciplina, ACUMULADO ATÉ A SEMANA (FR-057), e quantas
 * avaliações foram lançadas SEM item do currículo até ali.
 *
 * ⚠️ **A PROVA SEM ITEM NÃO SOME DA CONTA** *(decisão de Bernardo Villas Boas, 14/10/2026)*: ela não cumpre item
 *    nenhum — o vínculo é explícito (FR-039), nunca inferido —, então fica fora do X e aparece ao lado, contada.
 *    Vale também para a disciplina cujo currículo carregado não tem avaliação (Y = 0).
 * ⚠️ A OD é contínua (Q-17): não entra em X, Y nem nas sem item.
 */
export function avaliacoesAteASemana(entrada: {
  readonly oferta: OfertaDaDisciplina;
  readonly avaliacoes: readonly {
    readonly itemId: string | null;
    readonly natureza: NaturezaDaAvaliacao;
    readonly aplicacao: string | null;
  }[];
  /** A data ISO do último dia da semana mostrada. */
  readonly ate: string;
}): { aplicadas: number; previstas: number; semItem: number } {
  const doCurriculo = new Set(entrada.oferta.avaliacoes.map((a) => a.itemId));
  const ateASemana = entrada.avaliacoes.filter(
    (a) => a.natureza !== "od" && a.aplicacao !== null && a.aplicacao <= entrada.ate,
  );
  const ligados = new Set(
    ateASemana.map((a) => a.itemId).filter((i): i is string => i !== null && doCurriculo.has(i)),
  );
  return {
    aplicadas: ligados.size,
    previstas: entrada.oferta.avaliacoes.length,
    semItem: ateASemana.filter((a) => a.itemId === null || !doCurriculo.has(a.itemId)).length,
  };
}

/**
 * A capacitação didática do instrutor em lista fechada — spec 020 (Bloco 5), C-9 a C-12.
 *
 * > *"CAPACITAÇÃO DIDÁTICA DO INSTRUTOR: múltipla escolha de lista fechada (C-Esp-DID, C-Exp-TE, Licenciatura). Hoje é
 * > texto livre: a CONVERSÃO do texto para a lista está AUTORIZADA (…); valor que não casar com a lista NÃO se perde —
 * > fica guardado e aparece como aviso na ficha para correção à mão."* — Bernardo Villas Boas, 20/10/2026
 *
 * > **`RN-DEG-02`** — *"Regras derivadas de norma externa cujo descumprimento não é hoje verificável com certeza
 * > absoluta a partir dos dados do sistema (…, capacitação didática pendente) devem ser implementadas como alerta (…),
 * > nunca como bloqueio automático da ação."* (documento 04)
 *
 * ⚠️ **A LISTA É ESCRITA AQUI E É O TIPO DO BANCO** (`tipo_capacitacao_didatica`): o teste compara as duas, nas duas
 *    direções. A ordem é a do pedido, e é nela que a tela mostra.
 * ⚠️ **A CONVERSÃO QUE VALE É A DO BANCO** (`app.converter_capacitacoes_didaticas()`, migration M2); esta é o espelho,
 *    e o pgTAP `143_bloco_5.sql` cobra do banco os mesmos casos do teste daqui.
 * ⚠️ **"TEM CAPACITAÇÃO" É A LISTA OU O TEXTO A CORRIGIR** (C-12): o texto que não casou era capacitação declarada antes
 *    da conversão, e o alerta de docência sem capacitação não pode mudar de veredito por causa dela.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** As três, na ordem do pedido de Bernardo. */
export const CAPACITACOES_DIDATICAS = ["C-Esp-DID", "C-Exp-TE", "Licenciatura"] as const;

export type CapacitacaoDidatica = (typeof CAPACITACOES_DIDATICAS)[number];

export type CapacitacaoDoInstrutor = {
  readonly lista: readonly CapacitacaoDidatica[];
  /** O pedaço do texto antigo que não casou com a lista, como foi escrito — ou `null`. */
  readonly aCorrigir: string | null;
};

/** A forma de comparar: sem maiúscula, espaço nem hífen (`c esp did` = `C-Esp-DID`). A M2 faz a mesma. */
const chave = (texto: string) => texto.toLowerCase().replace(/[\s-]/g, "");

const PELA_CHAVE = new Map(CAPACITACOES_DIDATICAS.map((c) => [chave(c), c] as const));

export function ehCapacitacaoDidatica(valor: string): valor is CapacitacaoDidatica {
  return (CAPACITACOES_DIDATICAS as readonly string[]).includes(valor);
}

/** As capacitações em ordem da lista, sem repetição. */
export function emOrdemDaLista(lista: readonly string[]): CapacitacaoDidatica[] {
  return CAPACITACOES_DIDATICAS.filter((c) => lista.includes(c));
}

/**
 * O texto livre de hoje, convertido (C-10): separado por vírgula, ponto e vírgula ou barra; cada parte casada com a
 * lista; o que não casar, junto e como foi escrito, vai para o texto a corrigir.
 */
export function converterCapacitacao(texto: string | null | undefined): CapacitacaoDoInstrutor {
  const partes = (texto ?? "")
    .split(/[,;/]/)
    .map((p) => p.trim())
    .filter((p) => p !== "");
  const casadas: CapacitacaoDidatica[] = [];
  const soltas: string[] = [];
  for (const parte of partes) {
    const casada = PELA_CHAVE.get(chave(parte));
    if (casada) casadas.push(casada);
    else soltas.push(parte);
  }
  // Texto feito só de separadores: não há parte, e ele não pode sumir — vai inteiro para corrigir.
  const inteiro = (texto ?? "").trim();
  if (partes.length === 0 && inteiro !== "") soltas.push(inteiro);
  return {
    lista: emOrdemDaLista(casadas),
    aCorrigir: soltas.length > 0 ? soltas.join(", ") : null,
  };
}

/** C-12: tem capacitação quem tem a lista não vazia ou um texto a corrigir. */
/**
 * A capacitação como o banco a devolve — `capacitacoes_didaticas` e `capacitacao_didatica_a_corrigir`.
 *
 * ⚠️ O tipo do banco já recusa valor fora da lista; o que vier assim mesmo (um cliente sem tipo, um dado antigo) NUNCA
 *    some: vai para o texto a corrigir, como na conversão.
 */
export function capacitacaoDoCadastro(
  lista: readonly string[] | null | undefined,
  aCorrigir: string | null | undefined,
): CapacitacaoDoInstrutor {
  const soltas = (lista ?? []).filter((c) => !ehCapacitacaoDidatica(c));
  const texto = [(aCorrigir ?? "").trim(), ...soltas].filter((t) => t !== "").join(", ");
  return { lista: emOrdemDaLista(lista ?? []), aCorrigir: texto === "" ? null : texto };
}

export function temCapacitacao(capacitacao: CapacitacaoDoInstrutor): boolean {
  return capacitacao.lista.length > 0 || (capacitacao.aCorrigir ?? "").trim() !== "";
}

/** As marcadas, separadas por vírgula, na ordem da lista — ou «Nenhuma». */
export function rotuloDasCapacitacoes(lista: readonly string[]): string {
  const ordenadas = emOrdemDaLista(lista);
  return ordenadas.length > 0 ? ordenadas.join(", ") : "Nenhuma";
}

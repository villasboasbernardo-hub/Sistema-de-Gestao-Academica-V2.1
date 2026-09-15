/**
 * O círculo hierárquico — Oficiais ou Praças —, derivado do posto (`FR-025` e `FR-026.2` emendados em
 * 15/09/2026; spec 015 da v2.0).
 *
 * > *"O filtro Círculo Hierárquico DEVE oferecer exatamente 2 opções — "Oficiais" (postos `CMG, CF,
 * > CC, CT, 1ºTen, 2ºTen`) e "Praças" (postos `SO, 1ºSG, 2ºSG, 3ºSG`) — derivadas do mesmo mapeamento
 * > de `Posto_Graduacao` já existente (achado 4); instrutores com `Posto_Graduacao='SC'` não pertencem
 * > a nenhuma das 2 opções (Edge Case)."* — spec 015 da v2.0, `FR-009`
 *
 * ⚠️ O MAPA É O DA v2.0, E SÓ ELE (research §4 da spec 015). A escala de `config_listas` tem também `CB`
 * e `MN`, que o mapa da v2.0 não traz porque não havia dado real; eles ficam, como o `SC`, fora dos dois
 * círculos. Acrescentá-los seria regra nova, não porte.
 *
 * ⚠️ É FATO DE DOMÍNIO MILITAR ESTÁVEL, NÃO PARÂMETRO NORMATIVO — o mesmo tratamento que a v2.0 deu à
 * escala de postos (research §4). Não vive em `config_parametros`.
 */

export type CirculoHierarquico = "oficiais" | "pracas";

export const POSTOS_POR_CIRCULO: Readonly<Record<CirculoHierarquico, readonly string[]>> = {
  oficiais: ["CMG", "CF", "CC", "CT", "1ºTen", "2ºTen"],
  pracas: ["SO", "1ºSG", "2ºSG", "3ºSG"],
};

export const ROTULO_DO_CIRCULO: Readonly<Record<CirculoHierarquico, string>> = {
  oficiais: "Oficiais",
  pracas: "Praças",
};

/** O círculo de um posto, ou `null` quando o posto não está no mapa (SC, CB, MN, desconhecido). */
export function circuloDoPosto(pg: string | null): CirculoHierarquico | null {
  const procurado = (pg ?? "").trim().toLocaleLowerCase("pt-BR");
  for (const circulo of ["oficiais", "pracas"] as const) {
    if (POSTOS_POR_CIRCULO[circulo].some((p) => p.toLocaleLowerCase("pt-BR") === procurado)) {
      return circulo;
    }
  }
  return null;
}

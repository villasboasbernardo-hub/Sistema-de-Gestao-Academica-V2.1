/**
 * RA-1 e RA-9 (Bloco 18, spec 033) — o rótulo do tipo na tela e o GRUPO dele nas estatísticas.
 *
 * > *"Catálogo: acrescentar Desportiva (AEC), DeCAT (TR), Reforço (TR) e Outra (AEC). NÃO renomear os tipos existentes:
 * > Visita Técnica, Apoio à Instrução e Evento/Cerimônia só se AGRUPAM nas estatísticas como Visita, APOINST/Prática e
 * > Cerimônia. (…) A aba e a sigla na tela são 'APOINST'; o tipo segue 'Apoio à Instrução'."*
 * > — Bernardo Villas Boas, 03/11/2026 (conferência do passo 0, decisão 3)
 *
 * ⚠️ **O RÓTULO, NUNCA O VALOR, NA TELA** (decisão 4): «Atividade Extracurricular» é o VALOR (a chave que o gatilho, a
 *    sincronização e o ETL casam); a tela mostra o rótulo, «Atividade Extraclasse».
 * ⚠️ **O GRUPO É POR VALOR, NUM MAPA FECHADO**: os demais tipos (inclusive os que o Admin criar) aparecem pelo próprio
 *    rótulo — nunca agregados em «Outros» (pizza com todas as fatias, documento 23 §7). O tipo «Outra» é categoria
 *    legítima do catálogo, não agregação.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O valor dos tipos que as telas do Bloco 18 reconhecem pelo nome. */
export const VALOR_DO_TIPO_PALESTRA = "Palestra";
export const VALOR_DO_TIPO_VISITA = "Visita Técnica";
export const VALOR_DO_TIPO_APOINST = "Apoio à Instrução";

/** A sigla da aba e da tela (o tipo continua «Apoio à Instrução»). */
export const SIGLA_APOINST = "APOINST";

/** Decisão 3: só estes três se agrupam com outro nome. */
export const GRUPO_DO_TIPO: Readonly<Record<string, string>> = {
  [VALOR_DO_TIPO_VISITA]: "Visita",
  [VALOR_DO_TIPO_APOINST]: "APOINST/Prática",
  "Evento/Cerimônia": "Cerimônia",
};

export type TipoComRotulo = { readonly valor: string; readonly rotulo?: string | null };

/** O nome do tipo na tela: o rótulo do catálogo, senão o valor. */
export function rotuloDoTipo(tipo: TipoComRotulo): string {
  const rotulo = tipo.rotulo?.trim();
  return rotulo ? rotulo : tipo.valor;
}

/** O grupo do tipo nas estatísticas (pizza por tipo, cartões). */
export function grupoNaEstatistica(tipo: TipoComRotulo): string {
  return GRUPO_DO_TIPO[tipo.valor] ?? rotuloDoTipo(tipo);
}

/** O lançamento é visita (para o cartão e a lista de visitas com local)? */
export function ehVisita(tipo: TipoComRotulo): boolean {
  return grupoNaEstatistica(tipo) === "Visita";
}

/** O lançamento é palestra (para a aba Palestras)? */
export function ehPalestra(tipo: TipoComRotulo): boolean {
  return tipo.valor === VALOR_DO_TIPO_PALESTRA;
}

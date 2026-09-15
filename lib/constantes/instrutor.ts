/**
 * Rótulos de exibição do cadastro de instrutor — **mapas de ENUM**, documento 24 §`lib/constantes/`.
 *
 * ⚠️ AS CHAVES VÊM DO BANCO, E O TIPO OBRIGA A COBRI-LAS TODAS. `Record<Regime, string>` sobre o enum
 * gerado faz um regime novo no banco virar erro de compilação aqui, e não uma célula vazia na tela.
 *
 * ⚠️ É RÓTULO, NÃO REGRA. As faixas de carga horária por regime vivem em `config_parametros`
 * (`RNF-NORM-08`) — nunca neste arquivo.
 */
import type { Database } from "@/lib/tipos/database";

export type RegimeDocente = Database["public"]["Enums"]["regime_trabalho_docente"];

export const ROTULO_DO_REGIME: Readonly<Record<RegimeDocente, string>> = {
  "20h": "20h",
  "40h": "40h",
  dedicacao_exclusiva: "Dedicação Exclusiva",
};

/** O rótulo de um regime que pode não ter sido informado. */
export function rotuloDoRegime(regime: string | null): string {
  if (regime === null || regime === "") return "—";
  return ROTULO_DO_REGIME[regime as RegimeDocente] ?? regime;
}

/**
 * As 27 unidades da Federação, para o campo Estado do endereço (spec 025 da v2.0, US4).
 *
 * ⚠️ É LISTA NACIONAL FECHADA, NÃO PARÂMETRO NORMATIVO. Não vive em `config_parametros` porque não é
 * regra da MB nem da CIAARA-11; muda por emenda constitucional, não por portaria.
 */
export const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
] as const;

/**
 * As classificações de curso que a barra de filtros oferece, com o nome do glossário.
 *
 * > *"Classificação (do curso). Categoria administrativa do curso: Curso Regular, Curso Expedito,
 * > Curso Especial, Curso de Aperfeiçoamento Avançado, ou Estágio de Qualificação."* — documento 07
 *
 * ⚠️ SÃO CINCO, E O ENUM TEM SETE. `geral` e `ead_semipresencial` existem em `escopo_curso` para o RBAC,
 * mas não são classificação de curso no glossário nem na spec 015 da v2.0 (achado 8); a URL continua
 * aceitando os sete, pelo contrato, e a barra oferece os cinco com o nome que a Divisão usa.
 */
export const CLASSIFICACOES_DE_CURSO_NA_BARRA = [
  { valor: "regular", rotulo: "Curso Regular" },
  { valor: "expedito", rotulo: "Curso Expedito" },
  { valor: "especial", rotulo: "Curso Especial" },
  { valor: "aperfeicoamento_avancado", rotulo: "Curso de Aperfeiçoamento Avançado" },
  { valor: "estagio_qualificacao", rotulo: "Estágio de Qualificação" },
] as const;

/**
 * O rótulo de exibição da classificação do instrutor no gráfico (`FR-026.2` emendado em 15/09/2026).
 *
 * > `{ 'Militar da Ativa': 'Militares da Ativa', 'TTC': 'TTC', 'SCNS': 'Civis', 'MMN': 'Magistério
 * > Militar Naval' }` — spec 014 da v2.0, `data-model.md`
 *
 * ⚠️ `categoria` NÃO É ENUM: é texto do cadastro, e os quatro valores são os da base real. Valor fora do
 * mapa aparece como está, em vez de sumir ou virar "Outros" — um rótulo inventado esconderia o dado.
 */
export const ROTULO_DA_CATEGORIA: Readonly<Record<string, string>> = {
  "Militar da Ativa": "Militares da Ativa",
  TTC: "TTC",
  SCNS: "Civis",
  MMN: "Magistério Militar Naval",
};

export function rotuloDaCategoria(categoria: string): string {
  return ROTULO_DA_CATEGORIA[categoria.trim()] ?? categoria;
}

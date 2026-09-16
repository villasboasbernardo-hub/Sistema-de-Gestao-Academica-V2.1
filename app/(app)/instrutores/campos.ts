/**
 * Os campos do formulário de instrutor — **módulo comum, sem marcador de cliente**.
 *
 * ⚠️ ELES VIVEM FORA DE `FormularioDeInstrutor.tsx` DE PROPÓSITO. Tudo o que um arquivo com
 * `"use client"` exporta vira referência de cliente, e a página de servidor que importasse esta lista
 * de lá receberia um marcador, e não a lista. As páginas e a folha leem daqui.
 *
 * ⚠️ NENHUM CAMPO DE CARGA HORÁRIA (`FR-015`), e o dado pessoal em lista separada (`FR-032`).
 */

export const CAMPOS_FUNCIONAIS = [
  "posto_graduacao",
  "esp_hab_obs",
  "nome_completo",
  "categoria",
  "om",
  "nome_guerra",
  "nip",
  "data_nascimento",
  "dep_divisao",
  "data_assuncao_setor",
  "email",
  "regime_trabalho",
  "nivel_escolaridade",
  "formacao_principal_secundaria",
  "capacitacao_didatica",
  "data_inicio_docencia_mb",
  "data_inicio_docencia_ciaara",
  "ultima_avaliacao_desempenho",
  "data_avaliacao_desempenho",
  "preferencia",
  "antiguidade_declarada",
  "area_conhecimento",
] as const;

export const CAMPOS_PESSOAIS = [
  "cpf",
  "rg",
  "orgao_emissor",
  "telefone",
  "retelma",
  "endereco_logradouro",
  "endereco_numero",
  "endereco_complemento",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_estado",
  "endereco_cep",
] as const;

export type CampoFuncional = (typeof CAMPOS_FUNCIONAIS)[number];
export type CampoPessoal = (typeof CAMPOS_PESSOAIS)[number];
export type ValoresFuncionais = Readonly<Record<CampoFuncional, string>>;
export type ValoresPessoais = Readonly<Record<CampoPessoal, string>>;

/** O que a lista de colunas da ficha pede ao banco, sem PII. */
export const COLUNAS_FUNCIONAIS = CAMPOS_FUNCIONAIS.join(", ");

/** O que a ficha pede à visão com porteiro — só as 12, mais o `id`. */
export const COLUNAS_PESSOAIS = ["id", ...CAMPOS_PESSOAIS].join(", ");

/** Converte uma linha do banco em valores de formulário: `null` vira texto vazio, nunca "null". */
function paraTexto<C extends string>(
  campos: readonly C[],
  linha: Readonly<Record<string, unknown>> | null,
): Readonly<Record<C, string>> {
  return Object.fromEntries(
    campos.map((c) => {
      const bruto = linha?.[c];
      return [c, bruto === null || bruto === undefined ? "" : String(bruto)];
    }),
  ) as Readonly<Record<C, string>>;
}

export const valoresFuncionaisDe = (linha: Readonly<Record<string, unknown>> | null) =>
  paraTexto(CAMPOS_FUNCIONAIS, linha);

export const valoresPessoaisDe = (linha: Readonly<Record<string, unknown>> | null) =>
  paraTexto(CAMPOS_PESSOAIS, linha);

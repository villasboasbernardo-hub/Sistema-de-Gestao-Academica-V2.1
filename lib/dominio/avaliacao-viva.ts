/**
 * Quais status de avaliação estão VIVOS — `FR-048` da spec 014 (a leitura por lista positiva).
 *
 * > *"A avaliação substituída pela planilha ou cancelada não aparece na grade, na planilha nem na CH;
 * > a leitura MUST nomear os status vivos, e não excluir um morto."* — `FR-048` da spec 014
 *
 * ⚠️ **LISTA POSITIVA, NUNCA `neq('cancelada')`**: a migration E-4 (PR 4) cria um status novo de avaliação
 *    morta (`substituida_pela_planilha`). Com o filtro antigo, ela apareceria viva em toda tela no dia em
 *    que a E-4 chegasse ao remoto. Esta lista vale antes e depois da E-4, e por isso tem de estar em
 *    Production ANTES do `db push` do PR 4.
 * ⚠️ TypeScript puro (regra 9).
 */
export const STATUS_DE_AVALIACAO_VIVA = [
  "pendente",
  "em_andamento",
  "concluida",
  "atrasada",
] as const;

export type StatusDeAvaliacaoViva = (typeof STATUS_DE_AVALIACAO_VIVA)[number];

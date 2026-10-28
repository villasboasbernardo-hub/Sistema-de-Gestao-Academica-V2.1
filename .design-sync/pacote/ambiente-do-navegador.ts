/*
 * O ambiente que o next/link espera e o navegador do Claude Design nao tem. NAO e codigo do sistema: e
 * parte da entrada do design-sync (index.ts o importa primeiro).
 *
 * O next/link, que o BotaoDeIcone usa, le process.env.__NEXT_ROUTER_BASEPATH e companhia ao carregar; no
 * navegador nao existe `process`, e a leitura derruba o bundle inteiro. Um env vazio deixa essas leituras
 * undefined, que e o valor que elas tem num app sem basePath. Medido em 27/10/2026.
 */
const ambiente = globalThis as { process?: { env: Record<string, string | undefined> } };
ambiente.process ??= { env: {} };

export {};

/**
 * Os nomes de tela dos domínios de curso e turma que o banco guarda em `snake_case`.
 *
 * ⚠️ **ELE NASCEU DA TERCEIRA CÓPIA.** `ROTULO_DA_MODALIDADE` existia **duas vezes** —
 * `app/(app)/cursos/CatalogoDeCursos.tsx` e `app/(app)/cursos/FiltrosDoCatalogo.tsx` —, e a ficha da
 * turma precisava da terceira em 04/10/2026. Duas cópias já são padrão; a terceira é a que divergiria
 * em silêncio, com o catálogo dizendo *"EAD"* e a ficha dizendo *"Ead"* para a mesma turma. É o mesmo
 * caminho do botão de limpar filtros, que nasceu solto numa tela e só virou componente na segunda que
 * precisou dele.
 *
 * ⚠️ **AQUI NÃO HÁ REGRA, SÓ TRADUÇÃO** — e é por isso que o módulo mora em `lib/constantes/` e não
 * em `lib/dominio/`: não há comportamento a provar, há um nome a escrever uma vez.
 *
 * ⚠️ **VALOR DESCONHECIDO DEGRADA PARA O BRUTO**, e quem chama usa `?? valor`: um domínio novo no
 * banco não pode produzir célula vazia (`RN-DEG-01`).
 */

/** `modalidade_ensino` do banco → o nome que aparece na tela. */
export const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

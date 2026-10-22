/**
 * Os endereços da central de avisos (spec 022, Bloco 7, FR-004): a página e o resumo que o sininho pede.
 *
 * ⚠️ **O CAMINHO ATÉ A PÁGINA É O SININHO**, no cabeçalho de toda tela — ela não tem entrada no menu (plano da spec,
 *    §4). E o resumo é pedido pelo sininho, nunca digitado.
 */
const RAIZ_DOS_AVISOS = "/avisos";

export function enderecoDosAvisos(): string {
  return `${RAIZ_DOS_AVISOS}`;
}

export function enderecoDoResumoDosAvisos(): string {
  return `${RAIZ_DOS_AVISOS}/resumo`;
}

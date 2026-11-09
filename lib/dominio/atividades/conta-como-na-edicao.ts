/**
 * RA-4 (Bloco 18, spec 033) — o «Conta como» que a EDIÇÃO do cartão do DSA manda ao servidor.
 *
 * > *"Cada tipo tem classificação PADRÃO (AEC/TAD/TR), que o operador pode trocar no lançamento."*
 * > — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * ⚠️ **SÓ VAI O QUE A PESSOA MEXEU** (achado da revisão do Bloco 18): a escolha gravada que ficou IGUAL ao padrão do tipo
 *    — porque o Admin trocou depois a classificação padrão dele no catálogo — daria `contaComoParaGravar(…) = null`, e
 *    comparar só com o gravado mandaria esse nulo em toda gravação do cartão, mesmo de outro campo: a escolha explícita
 *    viraria «padrão do tipo» em silêncio, e a próxima troca do catálogo a recategorizaria contra a escolha do operador
 *    (a RA-1, decisão 1, manda preservá-la). E o envio fantasma ainda criaria rascunho — ou a recusa da semana publicada —
 *    numa gravação sem mudança. Por isso o campo vai só quando ele MUDOU em relação ao valor com que abriu E o
 *    resultado difere do gravado.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  contaComoDoBanco,
  type CategoriaDeAtividade,
  type ContaComo,
} from "@/lib/dominio/categoria-pelo-tipo";

import { contaComoParaGravar } from "./lancamento-de-atividade";

/** O valor com que o campo abre: a escolha gravada, ou vazio (o padrão do tipo). */
export function contaComoInicialDoCampo(gravada: string | null | undefined): string {
  return contaComoDoBanco(gravada ?? null) ?? "";
}

/**
 * `{ mandar: true, valor }` quando o «Conta como» entra nas mudanças da edição; `{ mandar: false }` quando não. `campo`
 * é o valor do campo na tela (o que `contaComoInicialDoCampo` deu, se ninguém mexeu).
 */
export function contaComoNaEdicao(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade | null;
  readonly gravada: string | null | undefined;
  readonly campo: string;
}): { readonly mandar: false } | { readonly mandar: true; readonly valor: ContaComo | null } {
  if (entrada.categoriaDoTipo === null) return { mandar: false };
  const gravada = contaComoDoBanco(entrada.gravada ?? null);
  if (entrada.campo === contaComoInicialDoCampo(entrada.gravada)) return { mandar: false };
  const valor = contaComoParaGravar(entrada.categoriaDoTipo, contaComoDoBanco(entrada.campo));
  return valor === gravada ? { mandar: false } : { mandar: true, valor };
}

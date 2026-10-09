/**
 * Quem pode baixar a planilha de contingência — `FR-001`, `FR-002` da spec 015.
 *
 * > *"Um botão «Baixar planilha de contingência» na tela do DSA e na ficha da turma, para quem pode
 * > lançar. Turma EAD não tem."* — pedido de Bernardo Villas Boas, 08/10/2026
 *
 * ⚠️ **UMA CONDIÇÃO SÓ, PARA A ROTA E PARA OS DOIS BOTÕES.** O botão que aparece para quem a rota
 * recusaria é o botão que leva a um 404; a rota que aceita quem não vê o botão é endpoint sem tela.
 * Os três chamam esta função.
 */
import { pode, type Permissoes } from "@/lib/autorizacao/matriz";
import { ehEadPuro } from "@/lib/dominio/dsa/ead-puro";

/** Quem lança no DSA — a mesma permissão do formulário de lançamento. */
export function podeLancarNoDsa(permissoes: Permissoes): boolean {
  return pode(permissoes, "registros_aula", "criar");
}

export function podeBaixarPlanilhaDeContingencia(
  permissoes: Permissoes,
  modalidade: string | null | undefined,
): boolean {
  return podeLancarNoDsa(permissoes) && !ehEadPuro(modalidade);
}

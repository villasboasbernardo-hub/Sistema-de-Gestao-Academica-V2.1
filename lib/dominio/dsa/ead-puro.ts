/**
 * `Q-13` — a turma de **EAD puro** não tem DSA, e o lugar da frase que diz isso.
 *
 * > *"DSA não se aplica a EAD puro."*
 * > — decisão de **Bernardo Villas Boas**, 05/10/2026 (`Q-13`, spec 013)
 *
 * > *"TURMA 100% EAD SEM BOTÃO DE DSA: não aparece «Abrir o DSA» na ficha da turma, a ação «DSA» na
 * > lista de turmas, nem o link de DSA no /inicio. No lugar, um aviso curto: «Turma EAD: o andamento
 * > é controlado pela Divisão de Ensino a Distância, em sistema próprio.» O endereço direto do DSA
 * > continua mostrando o MESMO aviso. Semipresencial MANTÉM o botão."*
 * > — conferência do PR #40, Bernardo Villas Boas, 08/10/2026 (item 9)
 *
 * ⚠️ **QUATRO TELAS, UMA REGRA E UMA FRASE.** A ficha da turma, a lista `/turmas`, o `/inicio` e a
 * própria rota do DSA perguntam aqui se a turma é EAD puro e leem daqui o aviso. Escrita em quatro
 * lugares, a frase divergiria na primeira revisão de texto — e a pessoa leria duas explicações
 * diferentes para o mesmo fato, conforme a tela por onde entrou.
 *
 * ⚠️ **SEMIPRESENCIAL NÃO É EAD PURO**: tem DSA na etapa presencial (`D-DSA-2`, `etapa-presencial.ts`).
 * A comparação é com o valor `ead` do domínio de modalidade, e nada mais — `semipresencial` não casa.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

/**
 * A turma é de **EAD puro**? Quem decide é a modalidade **da turma**, nunca a do curso (`RN-MAT-04`):
 * curso semipresencial tem turma EAD.
 */
export function ehEadPuro(modalidade: string | null | undefined): boolean {
  return modalidade === "ead";
}

/** O aviso que toma o lugar do DSA em toda tela — o texto de Bernardo, literal. */
export const AVISO_DE_TURMA_EAD =
  "Turma EAD: o andamento é controlado pela Divisão de Ensino a Distância, em sistema próprio.";

/**
 * O rótulo curto da LISTA de turmas (dúvida 7 do PR #40, Bernardo Villas Boas, 08/10/2026): *"célula
 * curta «EAD — sem DSA», com a frase completa ao passar o mouse/foco"*. Na ficha e no endereço
 * direto vale a frase completa.
 */
export const ROTULO_CURTO_DE_TURMA_EAD = "EAD — sem DSA";

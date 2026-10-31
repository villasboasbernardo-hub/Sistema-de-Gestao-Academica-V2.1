/**
 * O **arranjo do cartão** do DSA — grade da tela e papel (Bloco 16, spec 031, ajuste C da conferência de 31/10/2026).
 *
 * > *"Layout novo do cartão: disciplina + código no topo; TODOS os instrutores em NEGRITO, empilhados um por linha se
 * > houver altura, lado a lado com ' / ' se não houver; quantidade de TA; local na última linha (se houver altura) ou na
 * > linha dos instrutores. O conteúdo se distribui pelo espaço do cartão (sem espaço branco grande no meio) e cabe no
 * > cartão de 1 tempo."* — Bernardo Villas Boas, 31/10/2026
 *
 * ⚠️ **A ALTURA É CONTADA EM TEMPOS** (a faixa do cartão), não em pixels: a mesma decisão na tela e no papel, e testável
 *    sem navegador. Cada tempo comporta duas linhas curtas; o título, o tópico e a linha do TA ocupam duas delas.
 *    · 1 tempo: tudo numa linha só depois do título — os nomes com « / », o TA e o local.
 *    · 2 tempos ou mais: os nomes empilham enquanto couberem (`2 × tempos − 2`); senão, lado a lado. O local vai para a
 *      última linha.
 * ⚠️ **OS NOMES SÃO OS DA LINHA DO PAPEL** (`consulta.ts`, quem ministra / adicionais / o texto livre antigo), separados
 *    por « / » — o retrato publicado antes do Bloco 16 guarda a mesma forma, e o arranjo vale para ele também.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O separador dos nomes na linha do papel — o mesmo de `consulta.ts`. */
export const SEPARADOR_DE_INSTRUTORES = " / ";

/** Os nomes do cartão, um por item, na ordem gravada. */
export function instrutoresDoCartao(linhaDoInstrutor: string): string[] {
  return linhaDoInstrutor
    .split(SEPARADOR_DE_INSTRUTORES)
    .map((n) => n.trim())
    .filter((n) => n !== "");
}

export type ArranjoDoCartao = {
  /** Um nome por linha (`true`) ou todos numa linha com « / » (`false`). */
  readonly emPilha: boolean;
  /** O local na linha dos instrutores (`true`, o cartão de 1 tempo) ou na última linha (`false`). */
  readonly localNaLinhaDosInstrutores: boolean;
};

/** O arranjo do cartão de `tempos` tempos com `instrutores` nomes. */
export function arranjoDoCartao(tempos: number, instrutores: number): ArranjoDoCartao {
  if (tempos <= 1) return { emPilha: false, localNaLinhaDosInstrutores: true };
  return { emPilha: instrutores <= 2 * tempos - 2, localNaLinhaDosInstrutores: false };
}

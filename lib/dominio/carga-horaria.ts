/**
 * `RN-2027-06` — a faixa de horas de aula do regime de trabalho. **Risco: Alto.**
 *
 * > *"A escolha do instrutor de cada bloco simulado prioriza, entre os habilitados/atribuídos à
 * > disciplina, o de menor carga já alocada na semana, respeitando o **teto de horas de aula do seu
 * > regime de trabalho** — **20h → 8 a 12 h de aula; 40h → 16 a 24 h; Dedicação Exclusiva → 16 a 30 h**
 * > (DGPM-103), e não o número do regime em si; […] A equivalência "1 TA ≈ 1 hora" permanece
 * > válida. **Risco: Alto.**"* — documento 04, `RN-2027-06`
 *
 * > *"(d) os limites da faixa do regime são inclusivos — exatamente 8h ou 12h está dentro e não gera
 * > alerta; menos de 8 ou mais de 12 gera."* — T011, decisão de Bernardo Villas Boas, 15/09/2026
 *
 * ⚠️ O TETO É A FAIXA, JAMAIS O NÚMERO DO REGIME. Um instrutor de 40h com 20 horas previstas está
 * **dentro** de 16–24. Comparar contra 40 não alertaria nada; comparar contra 24 como se fosse o
 * regime alertaria um caso saudável. Os dois erros são silenciosos.
 *
 * ⚠️ A FAIXA CHEGA POR ARGUMENTO. Ela vive em `config_parametros` (`RNF-NORM-08`) e a view de carga a
 * entrega em `faixa_semanal_min` e `faixa_semanal_max`; nenhum número de regime está escrito aqui.
 *
 * ⚠️ A SEMANAL CHEGA PRONTA. Como compor a semanal de um instrutor com várias disciplinas no ano é
 * pendência registrada em 15/09/2026 no contrato de carga horária; esta função só situa um número
 * numa faixa, e não decide de onde ele veio.
 *
 * ⚠️ O RESULTADO É SITUAÇÃO, NÃO BLOQUEIO (`RN-DEG-02`). Não há valor de retorno que uma tela possa
 * usar para impedir gravação.
 */

export type FaixaDoRegime = { readonly minimo: number; readonly maximo: number };

export type SituacaoNaFaixa = "abaixo" | "dentro" | "acima";

/** Situa a carga semanal na faixa, com os dois limites **inclusivos**. */
export function situarNaFaixa(semanal: number, faixa: FaixaDoRegime): SituacaoNaFaixa {
  if (semanal < faixa.minimo) return "abaixo";
  if (semanal > faixa.maximo) return "acima";
  return "dentro";
}

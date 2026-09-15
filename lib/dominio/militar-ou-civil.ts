/**
 * `RN-INST-03` e `FR-002` da spec 006 — quem é militar e quem é civil, para a especialidade/habilitação.
 *
 * > *"Um cadastro de instrutor só pode ser salvo (criado ou editado) se posto/graduação,
 * > especialidade/habilitação, nome completo, categoria e organização militar estiverem preenchidos."*
 * > — documento 04, `RN-INST-03`
 *
 * > *"O RN-INST-03 mantém os CINCO campos obrigatórios, com delimitação registrada:
 * > especialidade/habilitação se aplica a instrutor MILITAR."* — decisão de Bernardo Villas Boas,
 * > 15/09/2026 (CHK008 e CHK012). A recusa ao salvar vale para **cadastro novo**; ficha já existente sem
 * > especialidade continua salvando e fica no quadro de avisos — decisão de Bernardo Villas Boas,
 * > 15/09/2026.
 *
 * > *"As categorias civis `SC` e `SCNS` MUST receber o peso 13."* — `FR-002` da spec 006
 *
 * ⚠️ CIVIL É PELO POSTO, E NÃO PELA COLUNA `categoria`. O `FR-002` define os civis por `SC` e `SCNS`, e é
 * o que a escala de antiguidade usa. Medido em 15/09/2026 na base real: os 6 de posto `SC` são os 6 de
 * categoria `SCNS`, e nenhum outro — as duas leituras coincidem hoje, e a escrita é a do `FR-002`.
 *
 * ⚠️ POSTO FORA DA ESCALA NÃO É CIVIL. Só `SC` e `SCNS` são; qualquer outro valor preenchido é militar
 * para esta regra. Posto vazio não decide nada — ele próprio é recusado antes.
 *
 * ⚠️ O BANCO REPETE A LISTA, de propósito: o gatilho de `20260915140000` recusa militar novo sem
 * especialidade por qualquer caminho (`FR-006`). Uma lista muda nos dois lugares.
 */

export const POSTOS_CIVIS = ["SC", "SCNS"] as const;

/** Verdadeiro para posto preenchido que não é `SC` nem `SCNS`. */
export function ehMilitar(posto: string | null | undefined): boolean {
  const valor = (posto ?? "").trim();
  if (valor === "") return false;
  return !(POSTOS_CIVIS as readonly string[]).includes(valor);
}

/**
 * Máscaras de entrada do cadastro de instrutor (`FR-024` da spec 006; `FR-013` da spec 016 e `FR-007`
 * da spec 025 da v2.0).
 *
 * > *"CPF `000.000.000-00`; CEP `00000-000`; Telefone `(00) 00000-0000` (11 dígitos) ou
 * > `(00) 0000-0000` (10 dígitos); RETELMA `(00) 0000-0000` (10 dígitos — prefixo de 2 dígitos +
 * > número em 4+4) ou `0000-0000` (8 dígitos, sem o prefixo)."* — spec 025 da v2.0, `FR-007`
 *
 * > *"O campo NIP DEVE aplicar máscara estrita no formato `00.0000.00` (8 dígitos) enquanto o
 * > usuário digita"* — spec 016 da v2.0, `FR-013`
 *
 * ⚠️ UMA FUNÇÃO PURA POR CAMPO, como na v2.0 (`mascaraNip_`), e uma de limpeza. Elas formatam
 * **enquanto se digita**: com dígitos a menos, formatam o que há até ali, sem inventar zero.
 *
 * ⚠️ QUEM VALIDA É O ZOD, SOBRE OS DÍGITOS (documento 25): a máscara ajuda a digitar, não decide se
 * o valor é aceitável. Dígito além do tamanho do campo é descartado aqui, que é o "impedir entrada fora
 * do padrão" da spec 016.
 *
 * ⚠️ A MÁSCARA NÃO REFORMATA DADO ANTIGO EM LOTE (spec 025 da v2.0, casos de fronteira). Ela age no que
 * é digitado; o valor salvo só muda quando alguém edita e grava.
 */

/** Só os dígitos. */
export function limparMascara(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Aplica um molde de `0` sobre os dígitos, parando onde os dígitos acabam. */
function aplicarMolde(digitos: string, molde: string): string {
  let saida = "";
  let d = 0;
  for (const caractere of molde) {
    if (d >= digitos.length) break;
    if (caractere === "0") {
      saida += digitos[d];
      d += 1;
    } else {
      saida += caractere;
    }
  }
  return saida;
}

export function mascararNip(valor: string): string {
  return aplicarMolde(limparMascara(valor).slice(0, 8), "00.0000.00");
}

export function mascararCpf(valor: string): string {
  return aplicarMolde(limparMascara(valor).slice(0, 11), "000.000.000-00");
}

export function mascararCep(valor: string): string {
  return aplicarMolde(limparMascara(valor).slice(0, 8), "00000-000");
}

/** Telefone: com 11 dígitos, `(00) 00000-0000`; até 10, `(00) 0000-0000`. */
export function mascararTelefone(valor: string): string {
  const digitos = limparMascara(valor).slice(0, 11);
  return aplicarMolde(digitos, digitos.length === 11 ? "(00) 00000-0000" : "(00) 0000-0000");
}

/** RETELMA: com 10 dígitos, `(00) 0000-0000`; até 8, `0000-0000`, sem o prefixo. */
export function mascararRetelma(valor: string): string {
  const digitos = limparMascara(valor).slice(0, 10);
  return aplicarMolde(digitos, digitos.length > 8 ? "(00) 0000-0000" : "0000-0000");
}

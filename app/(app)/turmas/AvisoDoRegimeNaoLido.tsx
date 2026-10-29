/**
 * A linha de «não li» do regime das semanas (spec 029, `FR-005`; `RN-DEG-01`) — uma por tela, nas três que desenham o
 * saldo e o «em atraso»: o Início, `/turmas` e a ficha da turma. Avisos diz a mesma falha por `naoLidos`.
 *
 * ⚠️ **ELA EXISTE PORQUE O MAPA VAZIO NÃO DIZ QUE HOUVE FALHA** (revisão do Bloco 14, achado 7): sem
 *    `dsa_regime_da_semana` ou `turma_regime_vigencia`, `lerRegimesDasSemanas` devolve `lido: false` e o saldo volta à
 *    conta de antes do Bloco 14 — um número que já valeu, mas que numa turma com «desde» ou semana gravada não é o do
 *    DSA. A tela diz qual conta está fazendo, em vez de mostrar o número como se fosse o de sempre (gotcha 4).
 * ⚠️ **UM TEXTO SÓ, NAS TRÊS TELAS** — por isso é componente, e não três parágrafos: a frase que diverge entre telas é
 *    a segunda fonte de verdade sobre o que a conta faz. No padrão das outras faixas de «não li» (os DSA publicados do
 *    Início, os habilitados da ficha): `role="status"`, na tinta de atraso.
 * ⚠️ **NÃO É `components/ciaara/`, de propósito**, como o `Rotulo` da ficha: é a frase de uma leitura destas telas, não
 *    vocabulário visual do sistema.
 */
export function AvisoDoRegimeNaoLido() {
  return (
    <p
      role="status"
      className="text-atrasado-tinta text-sm"
      data-slot="regime-das-semanas-nao-lido"
    >
      Não foi possível ler o regime das semanas do DSA. O saldo e o «em atraso» usam o TA/dia de
      Editar turma (ou o do curso) em todos os dias até a leitura voltar — recarregue a página; se
      continuar, avise o suporte.
    </p>
  );
}

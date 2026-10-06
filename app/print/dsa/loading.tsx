/**
 * O estado de carregamento da impressão (`RN-DEG-01`, DoD 7).
 *
 * ⚠️ **ELE É DELIBERADAMENTE MÍNIMO.** O contrato da impressão diz *"a rota é só o documento"* —
 * um esqueleto de tabela aqui competiria com o papel na hora em que alguém manda imprimir. Uma
 * frase basta, e ela desaparece antes de a caixa de impressão abrir, porque quem chama
 * `window.print()` é a pessoa, não a tela.
 */
export default function CarregandoAImpressao() {
  return (
    <p role="status" data-slot="carregando-impressao">
      Montando o Detalhe Semanal de Aula…
    </p>
  );
}

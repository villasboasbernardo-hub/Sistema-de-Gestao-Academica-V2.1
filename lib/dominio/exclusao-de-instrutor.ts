/**
 * A exclusão permanente de instrutor sem histórico — a exceção única à regra 4 do projeto.
 *
 * > *"Autorização de Bernardo Villas Boas, 15/09/2026: fica autorizada a exclusão permanente de
 * > instrutor, delimitada a registro SEM HISTÓRICO NENHUM. A regra 4 do CLAUDE.md ('nada é apagado')
 * > passa a ter essa exceção única, delimitada e registrada. Motivo: a regra existe para proteger
 * > histórico, e um cadastro criado por engano não tem histórico a proteger. Instrutor com qualquer
 * > aula lançada, atribuição, vínculo de habilitação ou conta de acesso ligada continua não podendo
 * > ser excluído — só desativado."*
 *
 * > *"Um instrutor pode ser desativado sem que seu histórico de lançamentos seja apagado."* — o
 * > `RN-INST-02`, que continua sendo o único caminho para quem tem histórico
 *
 * ⚠️ QUEM DECIDE É O BANCO. `app.impedimentos_de_exclusao_do_instrutor` diz o que prende o instrutor, e
 * `app.excluir_instrutor` recusa com `23503` — migration `20260915140100`. Aqui só se escreve o motivo
 * para a tela e se lê a recusa; nenhuma regra de "pode ou não pode" vive só neste arquivo.
 *
 * ⚠️ A LISTA DE CHAVES É A DA FUNÇÃO DO BANCO, lida no schema em 15/09/2026: além das quatro da
 * autorização, avaliação e responsável de curso também referenciam o instrutor, e entram por "sem
 * histórico nenhum". Chave desconhecida aparece como está — nunca some em silêncio (`RN-DEG-01`).
 */

export const ROTULO_DO_IMPEDIMENTO: Readonly<Record<string, string>> = {
  aula_lancada: "aula lançada",
  atribuicao: "atribuição",
  vinculo_de_habilitacao: "vínculo de habilitação",
  conta_de_acesso: "conta de acesso ligada",
  avaliacao: "avaliação",
  responsavel_de_curso: "responsabilidade de curso",
};

const rotulo = (chave: string): string => ROTULO_DO_IMPEDIMENTO[chave] ?? chave;

function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** O motivo escrito ao lado do botão desabilitado, ou `null` quando nada impede. */
export function motivoDoImpedimento(chaves: readonly string[]): string | null {
  if (chaves.length === 0) return null;
  return `Não pode ser excluído: tem ${juntar(chaves.map(rotulo))}. Instrutor com histórico só pode ser desativado.`;
}

/** As chaves da recusa `instrutor_com_historico: a, b` que o banco devolve com `23503`. */
export function chavesDaRecusa(mensagem: string): readonly string[] {
  const prefixo = "instrutor_com_historico:";
  const inicio = mensagem.indexOf(prefixo);
  if (inicio < 0) return [];
  return mensagem
    .slice(inicio + prefixo.length)
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c !== "");
}

/** O código digitado libera a confirmação só quando é exatamente o do instrutor, sem espaço à volta. */
export function codigoConfere(digitado: string, codigo: string): boolean {
  return digitado.trim() !== "" && digitado.trim() === codigo;
}

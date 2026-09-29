/**
 * A exclusão permanente de **disciplina e de Unidade de Ensino** — a emenda de 24/09/2026 à exceção
 * única da regra 4.
 *
 * > *"A exceção passa a cobrir TRÊS tabelas — `instrutores`, `disciplinas` e `unidades_ensino` —,
 * > sempre delimitada a registro **SEM HISTÓRICO NENHUM** (disciplina sem linha de turma, vínculo,
 * > avaliação, planejamento, UE nem aula, inclusive a alcançada por
 * > `disciplina_codigo_legado_v1`; UE sem aula), **sempre por RPC com porteiro** que confere os
 * > impedimentos no banco e recusa com `23503`, com **confirmação pelo código**, e — novo em relação
 * > à de instrutor — com **rastro de quem, o quê e quando** numa tabela só de acréscimo. Continua sem
 * > policy e sem privilégio de DELETE; nenhuma outra tabela ganha exceção."*
 * > — regra 4 do `CLAUDE.md`, decisão **D-B1** de Bernardo Villas Boas, 24/09/2026
 *
 * ⚠️ **QUEM DECIDE É O BANCO, e este arquivo não tem opinião sobre "pode ou não pode".**
 * `app.impedimentos_de_exclusao_da_disciplina` diz o que prende o registro e `public.excluir_disciplina`
 * recusa com `23503`. Aqui se escreve o **motivo em português** e se lê a recusa — nada mais. Uma
 * cópia da regra aqui seria regra de negócio implementada na UI, que o BRIEF §2 proíbe.
 *
 * ⚠️ **MEDIDO EM 24/09/2026: das 175 disciplinas reais, ZERO são excluíveis** — toda uma tem ao menos
 * linha de `turma_disciplina`. A exceção existe para o cadastro **criado por engano**, que ainda não
 * tem histórico a proteger; ela não abre porta nenhuma na base viva.
 *
 * ⚠️ **CHAVE DESCONHECIDA APARECE COMO ESTÁ** (`RN-DEG-01`). Se o banco ganhar um impedimento novo e
 * este arquivo não souber traduzi-lo, a pessoa lê a chave crua — feia, e correta. Sumir em silêncio
 * faria a recusa dizer *"tem histórico"* sem dizer **qual**, que é a única informação útil ali.
 */

/**
 * Os seis impedimentos da **disciplina** e o da **UE**, lidos das funções do banco em 29/09/2026.
 *
 * ⚠️ São **sete chaves para duas entidades**: a disciplina tem seis e a UE tem uma só
 * (`aula_lancada`). Um mapa por entidade seria duas listas para manter; a chave é única no banco, e
 * uma tabela só basta.
 */
export const ROTULO_DO_IMPEDIMENTO: Readonly<Record<string, string>> = {
  linha_de_turma: "linha de turma",
  vinculo_de_habilitacao: "vínculo de habilitação",
  avaliacao: "avaliação",
  planejamento: "planejamento",
  unidade_de_ensino: "unidade de ensino",
  aula_lancada: "aula lançada",
};

const rotulo = (chave: string): string => ROTULO_DO_IMPEDIMENTO[chave] ?? chave;

function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

export type TipoExcluivel = "disciplina" | "unidade_de_ensino";

const NOME_DO_TIPO: Readonly<Record<TipoExcluivel, string>> = {
  disciplina: "Disciplina",
  unidade_de_ensino: "Unidade de ensino",
};

/**
 * O motivo escrito na tela, ou `null` quando nada impede.
 *
 * ⚠️ **ELE OFERECE A SAÍDA, e isso é requisito** (`FR-022`). *"Não pode ser excluído"* sozinho deixa a
 * pessoa sem próximo passo; a desativação é o caminho que preserva o histórico, e é ela que a frase
 * nomeia.
 */
export function motivoDoImpedimento(
  chaves: readonly string[],
  tipo: TipoExcluivel = "disciplina",
): string | null {
  if (chaves.length === 0) return null;
  return (
    `${NOME_DO_TIPO[tipo]} com histórico não pode ser excluída: tem ${juntar(chaves.map(rotulo))}. ` +
    `Desative em vez de excluir — o histórico fica de pé e a desativação é reversível.`
  );
}

/**
 * As chaves da recusa que o banco devolve com `23503`.
 *
 * ⚠️ **SÃO DOIS PREFIXOS, e ler só um faria a UE recusar sem dizer por quê.** A RPC da disciplina
 * levanta `disciplina_com_historico: …` e a da UE `unidade_com_historico: …` — medido nas migrations
 * em 29/09/2026. O `hint` é o mesmo nos dois (`registro_com_historico`), e é ele que a tradução de
 * recusas usa; as chaves vêm da mensagem.
 */
export function chavesDaRecusa(mensagem: string): readonly string[] {
  for (const prefixo of ["disciplina_com_historico:", "unidade_com_historico:"]) {
    const inicio = mensagem.indexOf(prefixo);
    if (inicio < 0) continue;
    return mensagem
      .slice(inicio + prefixo.length)
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c !== "");
  }
  return [];
}

/**
 * O código digitado libera a confirmação **só** quando é exatamente o do registro.
 *
 * ⚠️ **SEM NORMALIZAR CAIXA, e isso é decisão.** O código é gerado pelo sistema (`DIS-000123`) e
 * aceitar `dis-000123` treinaria a digitar de memória — que é exatamente o que a confirmação por
 * código existe para impedir. O espaço à volta é aparado porque colar do banco costuma trazê-lo, e
 * isso não é digitar de memória.
 */
export function codigoConfere(digitado: string, codigo: string): boolean {
  return digitado.trim() !== "" && digitado.trim() === codigo;
}

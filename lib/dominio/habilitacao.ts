/**
 * `RN-INST-01` — habilitação para ministrar e ser responsável. **Risco: Alto.**
 *
 * > *"Um instrutor só pode ser escolhido para **ministrar** ou ser **responsável** por uma matéria se
 * > existir um vínculo de habilitação explícito entre ele e aquela matéria; tentar registrar uma aula
 * > com um instrutor não habilitado deve ser bloqueado com uma mensagem de erro específica. **Esta
 * > validação não se aplica ao papel de fiscal de avaliação**, que pode ser exercido por qualquer
 * > pessoa, inclusive alguém não cadastrado como instrutor — o Oficial Fiscal é designado pela OM e
 * > não precisa ser docente nem habilitado na disciplina. **Risco: Alto**"* — documento 04, `RN-INST-01`
 *
 * > *"⚠️ A regra é delimitada: avaliação e vista de prova não exigem habilitação."* — `FR-021` da
 * > spec 006
 *
 * ⚠️ A DELIMITAÇÃO É A PARTE QUE SE PERDE. Uma reescrita que exija vínculo "de todo mundo que aparece
 * numa disciplina" impede a OM de designar o fiscal, que é quem a norma manda designar. Por isso as
 * quatro atuações estão escritas, e não só as duas que exigem.
 *
 * ⚠️ NENHUMA TELA DESTA FATIA ESCOLHE INSTRUTOR PARA MINISTRAR (anotação de 15/09/2026 no `FR-021`).
 * A função existe testada para que a fatia que construir o lançamento não reescreva a regra.
 *
 * ⚠️ HABILITAÇÃO É VÍNCULO ATIVO. Um vínculo inativo em `instrutor_disciplina` é histórico, não
 * habilitação: ele não autoriza atuação nova (`RN-INST-05`, exclusão lógica).
 */

/** As atuações de um instrutor numa disciplina. */
export type Atuacao = "ministrar" | "responsavel" | "avaliacao" | "vista_de_prova";

/** Quais atuações exigem habilitação. `Record` sobre a união: atuação nova sem decisão não compila. */
export const EXIGE_HABILITACAO: Readonly<Record<Atuacao, boolean>> = {
  ministrar: true,
  responsavel: true,
  avaliacao: false,
  vista_de_prova: false,
};

export type VinculoDeHabilitacao = {
  readonly instrutorId: string;
  readonly disciplinaId: string;
  readonly status: string;
};

/** O instrutor tem vínculo **ativo** com a disciplina? */
export function estaHabilitado(
  instrutorId: string,
  disciplinaId: string,
  vinculos: readonly VinculoDeHabilitacao[],
): boolean {
  return vinculos.some(
    (v) => v.instrutorId === instrutorId && v.disciplinaId === disciplinaId && v.status === "ativo",
  );
}

/** Pode atuar assim nesta disciplina? Só consulta vínculo quando a atuação o exige. */
export function podeAtuar(
  atuacao: Atuacao,
  instrutorId: string,
  disciplinaId: string,
  vinculos: readonly VinculoDeHabilitacao[],
): boolean {
  if (!EXIGE_HABILITACAO[atuacao]) return true;
  return estaHabilitado(instrutorId, disciplinaId, vinculos);
}

/**
 * O **aviso** de habilitação do aplicador da avaliação (spec 014, D-AV-3 de 13/10/2026, FR-043).
 *
 * > *"Regra normativa vira alerta, nunca bloqueio."* — `RN-DEG-02`
 *
 * ⚠️ **A `RN-INST-01` NÃO MUDA**: ela exige habilitação para **ministrar** (e para ser responsável), e
 *    `EXIGE_HABILITACAO` continua dizendo `avaliacao: false`. O que a D-AV-3 acrescenta é só o AVISO: quem aplica
 *    a prova sem estar habilitado na disciplina é registrado, e a tela diz. Para `vista_de_prova` (quem conduz) e
 *    para o fiscal, nem aviso.
 */
export function avisoDeHabilitacao(
  atuacao: Atuacao,
  instrutorId: string,
  disciplinaId: string,
  vinculos: readonly VinculoDeHabilitacao[],
  nomes: { readonly instrutor: string; readonly disciplina: string },
): string | null {
  if (atuacao !== "avaliacao") return null;
  if (estaHabilitado(instrutorId, disciplinaId, vinculos)) return null;
  return `${nomes.instrutor} não está habilitado em ${nomes.disciplina}`;
}

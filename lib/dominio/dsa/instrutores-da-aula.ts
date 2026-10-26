/**
 * RD-1 — **na aula, só o habilitado** (Bloco 11, spec 026). Continua a `RN-INST-01`. **Risco: Alto.**
 *
 * > *"Na aula, a lista de instrutores traz só os HABILITADOS na disciplina; padrão é o designado para a turma; não
 * > habilitado não aparece nem é aceito pela Server Action."* — Bernardo Villas Boas, 26/10/2026
 * > (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-1)
 *
 * > *"Um instrutor só pode ser escolhido para **ministrar** ou ser **responsável** por uma matéria se existir um vínculo
 * > de habilitação explícito entre ele e aquela matéria (…)"* — documento 04, `RN-INST-01`
 *
 * ⚠️ **SÓ FILTRA, NUNCA ORDENA.** A ordem da lista é a antiguidade (`RN-ANT-01`, Risco Alto), e ela tem dono único: o
 *    `SeletorInstrutor`. Reordenar aqui seria o segundo lugar onde a regra vive.
 * ⚠️ **HABILITAÇÃO É VÍNCULO ATIVO, DE INSTRUTOR ATIVO.** O vínculo inativo é histórico (`RN-INST-05`), e o instrutor
 *    inativo não atua — a leitura do DSA o tirava da lista por um filtro que não funcionava (o `status` não vinha na
 *    consulta; achado do Bloco 11).
 * ⚠️ **SÓ A AULA** (D-1): o aplicador da prova, o fiscal, a vista e a atividade seguem com a lista inteira — a `RN-INST-01`
 *    delimita o fiscal, e o aplicador sem habilitação só recebe aviso (D-AV-3).
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Uma linha ativa de `instrutor_disciplina` — a habilitação. */
export type HabilitacaoAtiva = {
  readonly instrutorId: string;
  readonly disciplinaId: string;
};

/** Os instrutores habilitados (vínculo ativo) na disciplina. */
export function habilitadosNaDisciplina(
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): ReadonlySet<string> {
  if (disciplinaId === null || disciplinaId === "") return new Set();
  return new Set(
    habilitacoes.filter((h) => h.disciplinaId === disciplinaId).map((h) => h.instrutorId),
  );
}

/**
 * A lista de *quem ministra* a aula: os instrutores recebidos (já os ativos) que são habilitados na disciplina. Sem
 * disciplina escolhida, vazia — a frase diz o que falta (`fraseDaListaDaAula`).
 */
export function instrutoresDaAula<T extends { readonly id: string }>(
  instrutores: readonly T[],
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): readonly T[] {
  const habilitados = habilitadosNaDisciplina(habilitacoes, disciplinaId);
  return instrutores.filter((i) => habilitados.has(i.id));
}

/**
 * Quem a **sugestão** pode pôr na aula (D-3, D-5): os ids da lista da aula — ativo **e** habilitado. ⚠️ A habilitação
 * sozinha não basta: desativar o instrutor não toca o vínculo (`instrutor_disciplina` segue ativo), e o designado
 * inativo saía sugerido fora da lista, com o seletor sem valor válido e a recusa só no *Lançar*.
 */
export function idsDaListaDaAula(
  instrutores: readonly { readonly id: string }[],
  habilitacoes: readonly HabilitacaoAtiva[],
  disciplinaId: string | null,
): ReadonlySet<string> {
  return new Set(instrutoresDaAula(instrutores, habilitacoes, disciplinaId).map((i) => i.id));
}

/**
 * A frase da lista vazia (`RN-DEG-01`: nunca campo mudo) — uma só, com dono único. O caminho clicável até *Instrutores*
 * é da tela; o texto mora aqui.
 */
export function fraseDaListaDaAula(
  disciplinaId: string | null,
  lista: readonly unknown[],
): string | null {
  if (disciplinaId === null || disciplinaId === "") return "Escolha a disciplina.";
  if (lista.length === 0) {
    return "Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor.";
  }
  return null;
}

/** Quem ministra e o que se ministra numa aula: o par que a RD-1 confere. */
export type ParDaAula = {
  readonly instrutorId: string | null;
  readonly disciplinaId: string | null;
  readonly unidadeEnsinoId: string | null;
};

/**
 * O par que vale **depois** de uma edição pelo id de um SALVO (RD-1, D-4; revisão do Bloco 11): com rascunho de edição
 * por cima, `gravar_rascunho_do_dsa` grava **na sombra**, então o par pendente é o dela. A sombra de **exclusão** não
 * conta (a linha sai), e sem sombra vale o próprio salvo. Conferir pelo salvo deixava duas edições seguidas — o instrutor
 * numa, a UE na outra — gravarem um par não habilitado sem recusa.
 */
export function parPendenteDaAula(
  salvo: ParDaAula,
  sombra: (ParDaAula & { readonly rascunhoExclui: boolean }) | null,
): ParDaAula {
  if (sombra === null || sombra.rascunhoExclui) return salvo;
  return {
    instrutorId: sombra.instrutorId,
    disciplinaId: sombra.disciplinaId,
    unidadeEnsinoId: sombra.unidadeEnsinoId,
  };
}

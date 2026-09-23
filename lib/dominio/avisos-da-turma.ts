/**
 * `FR-028.1` / `FR-028.4` — os avisos da turma.
 *
 * > *"Cada tipo é **função pura** com teste Vitest […]. **Nenhum** bloqueia gravação (`RN-DEG-02`).
 * > Tipo com contagem zero não aparece; sem aviso nenhum, o quadro diz isso."*
 * > — contrato de escritas §3, spec 009
 *
 * ⚠️ **AS DUAS INCOERÊNCIAS SÃO ESTRITAS: O DIA DE HOJE NÃO CONTA.** O contrato escreve
 * *"estritamente anterior a hoje"* nas duas. Uma turma que termina hoje não está atrasada, e uma que
 * começa hoje não está pendente — e o aviso que aparece no dia certo é o aviso que ninguém leva a
 * sério depois.
 *
 * ⚠️ **DATA VAZIA NÃO DISPARA INCOERÊNCIA.** Ausência de janela já tem aviso próprio
 * (`sem_janela`); fazê-la disparar também *"término passado"* contaria a mesma falha duas vezes e
 * mandaria a pessoa corrigir a coisa errada.
 *
 * ⚠️ **`sem_efetivo_fora_de_planejada` NUNCA É SÓ "SEM EFETIVO".** Turma ainda não aberta não tem
 * efetivo, e isso é o normal — avisar sobre ela treinaria a pessoa a ignorar o quadro.
 *
 * ⚠️ **HOJE É ARGUMENTO** (`FR-043`), e não o relógio lido aqui dentro.
 *
 * Retrato da base, medido em 16/09/2026: **11** incoerências (1 + 10), `sem_janela` **1**,
 * `sem_sala` **2**, `sem_efetivo_fora_de_planejada` **0**, `sem_disciplina` **0**.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O que a turma precisa trazer para a leitura. */
export type TurmaParaAvisos = {
  readonly status: string;
  /** `yyyy-mm-dd`, ou nulo. */
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
  readonly sala: string | null;
  readonly alunos: number | null;
  /** Quantas linhas ativas de `turma_disciplina` a turma tem. */
  readonly disciplinasAtivas: number;
};

export type AvisoDaTurma = {
  readonly chave: string;
  readonly titulo: string;
};

const vazio = (texto: string | null): boolean => texto === null || texto.trim() === "";

/** Os avisos que **de fato ocorrem** nesta turma, na ordem do contrato §3. */
export function avisosDaTurma(turma: TurmaParaAvisos, hoje: string): readonly AvisoDaTurma[] {
  const avisos: AvisoDaTurma[] = [];

  // ⚠️ `<` e não `<=`, nas duas: é o "estritamente anterior" do contrato.
  if (turma.status === "ativa" && turma.dataTermino !== null && turma.dataTermino < hoje) {
    avisos.push({
      chave: "ativa_com_termino_passado",
      titulo: "Turma ativa com término já passado",
    });
  }

  if (turma.status === "planejada" && turma.dataInicio !== null && turma.dataInicio < hoje) {
    avisos.push({
      chave: "planejada_com_inicio_passado",
      titulo: "Turma planejada com início já passado",
    });
  }

  // Uma ponta ou as duas: é UM aviso, porque a falha é uma só — a janela está incompleta.
  if (turma.dataInicio === null || turma.dataTermino === null) {
    avisos.push({ chave: "sem_janela", titulo: "Janela de datas incompleta" });
  }

  if (vazio(turma.sala)) {
    avisos.push({ chave: "sem_sala", titulo: "Sala não alocada" });
  }

  /*
   * ⚠️ `alunos` ZERO É VALOR INFORMADO, não ausência — a mesma distinção que o BRIEF cobra de
   * `status` nunca ser inferido de `NULL`.
   */
  if (turma.alunos === null && turma.status !== "planejada") {
    avisos.push({
      chave: "sem_efetivo_fora_de_planejada",
      titulo: "Efetivo não informado em turma que já saiu do planejamento",
    });
  }

  if (turma.disciplinasAtivas === 0) {
    avisos.push({ chave: "sem_disciplina", titulo: "Turma sem disciplina na grade" });
  }

  return avisos;
}

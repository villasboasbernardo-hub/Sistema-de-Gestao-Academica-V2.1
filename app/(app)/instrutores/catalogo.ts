/**
 * O catálogo de disciplinas do painel e da ficha — **módulo comum, sem marcador de cliente** (`FR-022`).
 *
 * ⚠️ DUAS LEITURAS SIMPLES E UM CASAMENTO EM MEMÓRIA, E NÃO JUNÇÃO DA INTERFACE DE DADOS. `disciplinas`
 * e `cursos` se relacionam com várias views, e o tipo gerado da junção não decide entre elas (o mesmo
 * achado da tela de usuários). São 175 disciplinas e 24 cursos: casar aqui é claro e bem tipado.
 *
 * ⚠️ A SIGLA É O `codigo` DO CURSO (spec 021 da v2.0). Curso que não veio na leitura degrada para "—",
 * em vez de derrubar o painel (`RN-DEG-01`).
 */
import type { DisciplinaDoPainel } from "./PainelDeDisciplinas";

export type LinhaDeDisciplina = {
  readonly id: string;
  readonly nome_disciplina: string;
  readonly curso_id: string;
  readonly status: string;
};

export type LinhaDeCurso = { readonly id: string; readonly codigo: string };

/** Todas as disciplinas com a sigla do curso, na ordem em que chegaram. */
export function comSigla(
  disciplinas: readonly LinhaDeDisciplina[],
  cursos: readonly LinhaDeCurso[],
): (DisciplinaDoPainel & { readonly ativa: boolean })[] {
  const sigla = new Map(cursos.map((c) => [c.id, c.codigo]));
  return disciplinas.map((d) => ({
    id: d.id,
    nome: d.nome_disciplina,
    sigla: sigla.get(d.curso_id) ?? "—",
    ativa: d.status === "ativo",
  }));
}

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
import { rotuloDoCurriculo } from "@/lib/dominio/curriculos";

import type { DisciplinaDoPainel } from "./PainelDeDisciplinas";

export type LinhaDeDisciplina = {
  readonly id: string;
  readonly nome_disciplina: string;
  readonly curso_id: string;
  /** Spec 021 (Bloco 6): o currículo da disciplina — para o rótulo, quando o curso tem mais de um. */
  readonly curriculo_id?: string | null;
  readonly status: string;
};

/** Spec 021 (RC-12): o currículo, para dizer "Currículo N (vigência AAAA)" quando o curso tem mais de um. */
export type LinhaDeCurriculo = {
  readonly id: string;
  readonly curso_id: string;
  readonly versao: number;
  readonly vigente_de: string;
};

export type LinhaDeCurso = {
  readonly id: string;
  readonly codigo: string;
  /**
   * ⚠️ **A SITUAÇÃO DO CURSO ENTRA AQUI, e é opcional de propósito** (`FR-017.6` da spec 009). Quem
   * não a informa continua com o comportamento de antes — disciplina ativa é oferecível —, que é o
   * que as telas que não lidam com habilitação precisam.
   */
  readonly status?: string | null;
};

/**
 * Todas as disciplinas com a sigla do curso, na ordem em que chegaram.
 *
 * ⚠️ **`ativa` PASSOU A SIGNIFICAR "OFERECÍVEL", E NÃO SÓ "`disciplinas.status = ativo`"**
 * (`FR-017.6` da spec 009, 18/09/2026). Desativar um curso **não** muda a situação das disciplinas
 * dele: elas seguem `ativo`. Até a migration 7 isso não aparecia, porque o ALCANCE escondia o curso
 * inativo e as disciplinas dele nunca chegavam aqui. Agora chegam, e sem esta conta o painel
 * ofereceria uma disciplina que o banco vai **recusar** na gravação (`instrutor_disciplina` com
 * `disciplina_em_oferta`) — a pessoa marcaria, confirmaria, e receberia um erro no fim.
 *
 * ⚠️ **E QUEM JÁ ESTÁ HABILITADO CONTINUA NO CATÁLOGO**, com `ativa: false`: a ficha lê daqui para
 * EXIBIR a habilitação existente em curso inativo, só leitura (`FR-017.6`). Tirar a linha do
 * catálogo apagaria o histórico da tela, que é o oposto do requisito.
 */
export function comSigla(
  disciplinas: readonly LinhaDeDisciplina[],
  cursos: readonly LinhaDeCurso[],
  /**
   * ⚠️ SPEC 021 (RC-12): COM DOIS CURRÍCULOS, A MESMA DISCIPLINA APARECE DUAS VEZES — uma por currículo — e o rótulo diz
   *    de qual é. Com um currículo só (ou sem a lista), a sigla é a do curso, como sempre.
   */
  curriculos: readonly LinhaDeCurriculo[] = [],
): (DisciplinaDoPainel & { readonly ativa: boolean })[] {
  const sigla = new Map(cursos.map((c) => [c.id, c.codigo]));
  const cursoInativo = new Map(cursos.map((c) => [c.id, c.status === "inativo"]));
  const porCurso = new Map<string, number>();
  for (const c of curriculos) porCurso.set(c.curso_id, (porCurso.get(c.curso_id) ?? 0) + 1);
  const curriculo = new Map(curriculos.map((c) => [c.id, c]));
  return disciplinas.map((d) => {
    const doCurso = sigla.get(d.curso_id) ?? "—";
    const seu = d.curriculo_id ? curriculo.get(d.curriculo_id) : undefined;
    return {
      id: d.id,
      nome: d.nome_disciplina,
      sigla:
        seu && (porCurso.get(d.curso_id) ?? 0) > 1
          ? `${doCurso} · ${rotuloDoCurriculo(seu)}`
          : doCurso,
      ativa: d.status === "ativo" && cursoInativo.get(d.curso_id) !== true,
    };
  });
}

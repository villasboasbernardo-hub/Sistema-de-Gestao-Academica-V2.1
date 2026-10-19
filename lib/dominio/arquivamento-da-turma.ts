/**
 * D-COR-5 — ARQUIVAR A TURMA em qualquer estado.
 *
 * > *"Arquivar turma em QUALQUER estado, com aviso quando a turma não estiver concluída. Arquivar não é um quinto
 * > status: são colunas próprias (`arquivada_em`, `arquivada_por`, observação), o status fica como está. A turma
 * > arquivada some das listas (filtro "mostrar arquivadas"), trava DSA, instrutor e edição; o Admin pode
 * > desarquivar."* — decisão D-COR-5 de Bernardo Villas Boas, 16/10/2026 (reabre nominalmente a TURMA-1)
 *
 * ⚠️ **O ESTADO É O ÚLTIMO EVENTO** (`turma_arquivamentos`, só de acréscimo; spec 017, C-5): o banco já o entrega
 *    pronto em `vw_turmas_arquivadas`; este módulo o decide igual para a ficha, que mostra o histórico.
 * ⚠️ **QUEM DECIDE A PERMISSÃO É O BANCO** (a policy de `turma_arquivamentos`): `podeArquivar`/`podeDesarquivar` só
 *    decidem se o botão aparece, e seguem a mesma regra.
 * ⚠️ **TypeScript puro** (Princípio II).
 */
import { instanteParaLeitura } from "@/lib/formato/data";

export type EventoDeArquivamento = {
  /** A ordem do banco (identidade): o último é o de maior ordem. */
  readonly ordem: number;
  readonly acao: "arquivar" | "desarquivar";
  readonly criadoEm: string;
  /** O nome de quem fez, já resolvido; nulo = sem sessão ou conta que não existe mais. */
  readonly autor: string | null;
  readonly observacao: string | null;
};

export type EstadoDoArquivamento =
  | { readonly arquivada: false }
  | {
      readonly arquivada: true;
      readonly em: string;
      readonly por: string | null;
      readonly observacao: string | null;
    };

export function estadoDoArquivamento(
  eventos: readonly EventoDeArquivamento[],
): EstadoDoArquivamento {
  const ultimo = [...eventos].sort((a, b) => b.ordem - a.ordem)[0];
  if (!ultimo || ultimo.acao !== "arquivar") return { arquivada: false };
  return { arquivada: true, em: ultimo.criadoEm, por: ultimo.autor, observacao: ultimo.observacao };
}

/** Arquiva quem pode editar a turma (`turmas.editar`), e só a que não está arquivada (C-3). */
export function podeArquivar(e: {
  readonly podeEditarTurma: boolean;
  readonly arquivada: boolean;
}): boolean {
  return e.podeEditarTurma && !e.arquivada;
}

/** Desarquiva SÓ o Admin, e só a arquivada (D-COR-5). */
export function podeDesarquivar(e: {
  readonly perfil: string | null;
  readonly arquivada: boolean;
}): boolean {
  return e.perfil === "admin" && e.arquivada;
}

export const AVISO_DE_NAO_CONCLUIDA =
  "A turma não está concluída. Arquivada, ela sai das listas e ninguém grava nela até o Administrador desarquivar.";

/** O aviso antes de arquivar: só quando a situação não é *Concluída* (D-COR-5: qualquer estado, com aviso). */
export function avisoAoArquivar(situacao: string): string | null {
  return situacao === "concluida" ? null : AVISO_DE_NAO_CONCLUIDA;
}

/** *"Turma arquivada em DD/MM/AAAA por X — somente leitura. Só o Administrador desarquiva."* */
export function fraseDaTurmaArquivada(e: {
  readonly em: string;
  readonly por: string | null;
}): string {
  const quem = e.por ? ` por ${e.por}` : "";
  return `Turma arquivada em ${instanteParaLeitura(e.em)}${quem} — somente leitura. Só o Administrador desarquiva.`;
}

/** A recusa do servidor para toda gravação em turma arquivada (FR-004.4). */
export const RECUSA_DA_TURMA_ARQUIVADA =
  "A turma está arquivada: somente leitura. Para gravar, o Administrador precisa desarquivá-la.";

/**
 * As listas de turma escondem a arquivada (C-24): `/inicio`, a aba *Grade* do curso e a pré-seleção, *"Turmas com
 * teto excedido"*, o filtro de `/atividades` e a cascata de `/disciplinas`. Em `/turmas`, ela volta com *Mostrar
 * arquivadas*. A ficha do instrutor, `/admin/salas` e as contas de limite continuam com ela, por histórico (C-7).
 */
export function semAsArquivadas<T>(
  turmas: readonly T[],
  arquivadas: ReadonlySet<string>,
  idDe: (t: T) => string,
): T[] {
  return arquivadas.size === 0 ? [...turmas] : turmas.filter((t) => !arquivadas.has(idDe(t)));
}

/** O conjunto dos ids arquivados, a partir das linhas de `vw_turmas_arquivadas`. */
export function idsArquivados(
  linhas: readonly { readonly turma_id: string | null }[] | null,
): Set<string> {
  return new Set((linhas ?? []).map((l) => l.turma_id).filter((x): x is string => x !== null));
}

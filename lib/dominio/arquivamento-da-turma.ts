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
 * ⚠️ **ARQUIVAM E DESARQUIVAM O ADMIN, O ENCARREGADO E O AJUDANTE DA ADMINISTRAÇÃO ACADÊMICA — E SÓ ELES**
 *    *(decisão de Bernardo Villas Boas, 19/10/2026, na conferência do PR #73; muda a C-3 e a C-4 da spec 017)*: o
 *    Operador, que edita turma, deixa de arquivar, e o desarquivar deixa de ser só do Admin. A arquivada continua sem
 *    edição para ninguém. A regra é o recurso `arquivamento_de_turma`/`editar` da matriz, o mesmo que a policy lê.
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

/** O recurso da matriz que decide quem arquiva E desarquiva — o mesmo que a policy de `turma_arquivamentos` lê. */
export const RECURSO_DO_ARQUIVAMENTO = "arquivamento_de_turma";

/** Arquiva quem tem o recurso, e só a turma que não está arquivada. */
export function podeArquivar(e: {
  readonly podeArquivarTurmas: boolean;
  readonly arquivada: boolean;
}): boolean {
  return e.podeArquivarTurmas && !e.arquivada;
}

/** Desarquiva quem tem o MESMO recurso, e só a arquivada. */
export function podeDesarquivar(e: {
  readonly podeArquivarTurmas: boolean;
  readonly arquivada: boolean;
}): boolean {
  return e.podeArquivarTurmas && e.arquivada;
}

/** Quem arquiva e desarquiva, por extenso: a mesma frase no aviso, na ficha, no DSA e nas recusas. */
export const QUEM_DESARQUIVA = "o Admin, o Encarregado e o Ajudante da Administração Acadêmica";

export const AVISO_DE_NAO_CONCLUIDA = `A turma não está concluída. Arquivada, ela sai das listas e ninguém grava nela até ser desarquivada (desarquivam ${QUEM_DESARQUIVA}).`;

/** O aviso antes de arquivar: só quando a situação não é *Concluída* (D-COR-5: qualquer estado, com aviso). */
export function avisoAoArquivar(situacao: string): string | null {
  return situacao === "concluida" ? null : AVISO_DE_NAO_CONCLUIDA;
}

/** *"Turma arquivada em DD/MM/AAAA por X — somente leitura. Desarquivam o Admin, o Encarregado e o Ajudante (…)."* */
export function fraseDaTurmaArquivada(e: {
  readonly em: string;
  readonly por: string | null;
}): string {
  const quem = e.por ? ` por ${e.por}` : "";
  return `Turma arquivada em ${instanteParaLeitura(e.em)}${quem} — somente leitura. Desarquivam ${QUEM_DESARQUIVA}.`;
}

/** A recusa do servidor para toda gravação em turma arquivada (FR-004.4). */
export const RECUSA_DA_TURMA_ARQUIVADA = `A turma está arquivada: somente leitura. Para gravar, ela precisa ser desarquivada (desarquivam ${QUEM_DESARQUIVA}).`;

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

/**
 * Bloco 18 (spec 033) — o contexto que a ficha da turma (e o DSA) passa às abas Atividades, Palestras e APOINST.
 *
 * ⚠️ **SÓ A ABA ABERTA É LIDA** (como as Avaliações do DSA, PEND-022-2): a página monta este contexto uma vez e
 *    desenha só o componente da aba aberta, que lê o que precisa.
 * ⚠️ Sem marcador de cliente: é tipo, e quem o usa são componentes de servidor.
 */
import type { Permissoes } from "@/lib/autorizacao/matriz";

export type ContextoDaTurmaNasAbas = {
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly cursoId: string;
  /** O currículo DA TURMA (RC-4): é dele que vêm as AEC previstas (RA-3). */
  readonly curriculoId: string | null;
  /** O ano da turma (RT-6, RA-7). */
  readonly anoLetivo: number;
  readonly dataTermino: string | null;
  /** «Hoje» em São Paulo — no DSA, o último dia da semana mostrada (o corte do acompanhamento). */
  readonly hoje: string;
  readonly arquivada: boolean;
  readonly ead: boolean;
  readonly permissoes: Permissoes;
  /** Sem ação nenhuma (o acompanhamento do DSA, FR-008.1). */
  readonly somenteLeitura: boolean;
  /** Os parâmetros da URL da ficha (os filtros da aba Atividades e a confirmação `gravada`). */
  readonly valores: Readonly<Record<string, string | number | readonly string[]>>;
};

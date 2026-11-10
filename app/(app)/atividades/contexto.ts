/**
 * Bloco 18 (spec 033) — o contexto que `/atividades` passa às abas Atividades, Palestras e APOINST.
 *
 * ⚠️ **TODAS AS TURMAS DO ANO ESCOLHIDO NO CABEÇALHO** (RA-7, RT-6), com a arquivada contando nas estatísticas (RT-8).
 * ⚠️ Sem marcador de cliente: é tipo.
 */
import type { Permissoes } from "@/lib/autorizacao/matriz";

export type ContextoDoModulo = {
  readonly ano: number;
  readonly hoje: string;
  readonly permissoes: Permissoes;
  /**
   * O alcance do perfil (`alcanceDoPerfil`): com «recortado», a lista vazia de turmas é «você não vê», não «não há»
   * (gotcha 4; achado da revisão do Bloco 18 nas abas Palestras e APOINST).
   */
  readonly alcance: "todos" | "recortado";
  /** A aba Calendário existe para quem tem `calendario.*` (spec 023, D-6). */
  readonly temCalendario: boolean;
  readonly valores: Readonly<Record<string, string | number | readonly string[]>>;
};

/**
 * Rótulos de exibição do cadastro de instrutor — **mapas de ENUM**, documento 24 §`lib/constantes/`.
 *
 * ⚠️ AS CHAVES VÊM DO BANCO, E O TIPO OBRIGA A COBRI-LAS TODAS. `Record<Regime, string>` sobre o enum
 * gerado faz um regime novo no banco virar erro de compilação aqui, e não uma célula vazia na tela.
 *
 * ⚠️ É RÓTULO, NÃO REGRA. As faixas de carga horária por regime vivem em `config_parametros`
 * (`RNF-NORM-08`) — nunca neste arquivo.
 */
import type { Database } from "@/lib/tipos/database";

export type RegimeDocente = Database["public"]["Enums"]["regime_trabalho_docente"];

export const ROTULO_DO_REGIME: Readonly<Record<RegimeDocente, string>> = {
  "20h": "20h",
  "40h": "40h",
  dedicacao_exclusiva: "Dedicação Exclusiva",
};

/** O rótulo de um regime que pode não ter sido informado. */
export function rotuloDoRegime(regime: string | null): string {
  if (regime === null || regime === "") return "—";
  return ROTULO_DO_REGIME[regime as RegimeDocente] ?? regime;
}

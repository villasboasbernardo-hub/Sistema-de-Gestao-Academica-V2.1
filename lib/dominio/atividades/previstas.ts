/**
 * RA-2, RA-3 e RA-5 (Bloco 18, spec 033) — as AEC PREVISTAS do currículo, na turma: a cumprir, em andamento, cumprida.
 *
 * > *"RA-2 AEC previstas pertencem ao CURRÍCULO (RC-1): nome, tipo, TA previstos, disciplina opcional, obrigatória
 * > sim/não. RA-3 A turma herda as AEC previstas do seu currículo como 'a cumprir'. Palestra fora do currículo entra sem
 * > vínculo e CONTA no limite de AEC do currículo (limite é de tempo, não de conteúdo). RA-5 Palestra prevista fica
 * > CUMPRIDA por lançamento vinculado no DSA (data, palestrante, local vêm do lançamento) OU marcada à mão pelo trio
 * > (…) com justificativa obrigatória e trilha."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **CUMPRIDA PELOS TA** (D-7 da spec 033): os lançamentos vinculados (salvos e ativos — quem chama só passa esses,
 *    RP-8) somam os TA previstos; com parte, **em andamento**; sem TA previsto («não definido», nunca zero), ao primeiro
 *    lançamento. A marcação à mão mais recente («cumprida») vence; «a_cumprir» a desfaz.
 * ⚠️ **NADA SE COPIA PARA A TURMA**: a lista é a do currículo da turma, lida na hora (RA-3).
 * ⚠️ **A AVULSA NÃO ENTRA AQUI**: a palestra sem vínculo é listada por quem chama e já conta no limite pela categoria
 *    (a view soma por `categoria_normativa`) — contá-la de novo seria a dupla contagem que a RA-3 proíbe.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { historicoPorAlvo, marcadaAMao, type MarcacaoDeAtividade, type MarcacaoNoHistorico } from "./marcacoes";

export type AecPrevista = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly tipoValor: string;
  readonly tipoRotulo: string;
  /** Nulo = o currículo não diz («não definido»). */
  readonly taPrevistos: number | null;
  readonly disciplina: { readonly id: string; readonly codigo: string; readonly nome: string } | null;
  readonly obrigatoria: boolean;
  readonly ordem: number;
};

/** Um lançamento SALVO e ATIVO vinculado a uma AEC prevista. */
export type LancamentoVinculado = {
  readonly codigo: string;
  readonly alvoId: string;
  readonly data: string;
  readonly ta: number;
  /** «Nome (OM)», o instrutor, ou nulo. */
  readonly responsavel: string | null;
  readonly local: string | null;
};

export type SituacaoDaPrevista = "a_cumprir" | "em_andamento" | "cumprida" | "cumprida_a_mao";

export const ROTULO_DA_SITUACAO_DA_PREVISTA: Readonly<Record<SituacaoDaPrevista, string>> = {
  a_cumprir: "A cumprir",
  em_andamento: "Em andamento",
  cumprida: "Cumprida",
  cumprida_a_mao: "Cumprida (à mão)",
};

export function ehCumprida(situacao: SituacaoDaPrevista): boolean {
  return situacao === "cumprida" || situacao === "cumprida_a_mao";
}

/** A situação de UMA AEC prevista. */
export function situacaoDaPrevista(entrada: {
  readonly taPrevistos: number | null;
  readonly taLancados: number;
  readonly lancamentos: number;
  readonly marcacao: MarcacaoNoHistorico | null;
}): SituacaoDaPrevista {
  if (entrada.marcacao !== null) return "cumprida_a_mao";
  if (entrada.lancamentos === 0) return "a_cumprir";
  if (entrada.taPrevistos === null) return "cumprida";
  return entrada.taLancados >= entrada.taPrevistos ? "cumprida" : "em_andamento";
}

export type LinhaDaPrevista = AecPrevista & {
  readonly situacao: SituacaoDaPrevista;
  readonly taLancados: number;
  readonly lancamentos: readonly LancamentoVinculado[];
  readonly primeiraData: string | null;
  readonly ultimaData: string | null;
  readonly responsaveis: readonly string[];
  readonly locais: readonly string[];
  readonly historico: readonly MarcacaoNoHistorico[];
  /** A marcação à mão que vale, com a data informada (quando houver). */
  readonly marcacao: MarcacaoNoHistorico | null;
};

export type QuadroDasPrevistas = {
  readonly linhas: readonly LinhaDaPrevista[];
  readonly total: number;
  readonly cumpridas: number;
  /** As obrigatórias ainda não cumpridas (RA-8). */
  readonly obrigatoriasPendentes: readonly LinhaDaPrevista[];
  /** Σ TA previstos das que têm número; as sem número são nomeadas à parte (RN-DEG-01). */
  readonly taPrevistos: number;
  readonly semTaPrevisto: readonly string[];
};

function unicos(valores: readonly (string | null)[]): string[] {
  return [...new Set(valores.filter((v): v is string => v !== null && v.trim() !== ""))];
}

/** O quadro das AEC previstas de UMA turma, na ordem do currículo. */
export function quadroDasPrevistas(entrada: {
  readonly previstas: readonly AecPrevista[];
  readonly lancamentos: readonly LancamentoVinculado[];
  readonly marcacoes: readonly MarcacaoDeAtividade[];
}): QuadroDasPrevistas {
  const historicos = historicoPorAlvo(entrada.marcacoes, (m) => m.atividadePrevistaId);
  const porAlvo = new Map<string, LancamentoVinculado[]>();
  for (const l of entrada.lancamentos) {
    const lista = porAlvo.get(l.alvoId) ?? [];
    lista.push(l);
    porAlvo.set(l.alvoId, lista);
  }
  const linhas = [...entrada.previstas]
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"))
    .map((p): LinhaDaPrevista => {
      const lancamentos = [...(porAlvo.get(p.id) ?? [])].sort((a, b) => a.data.localeCompare(b.data));
      const taLancados = lancamentos.reduce((s, l) => s + l.ta, 0);
      const historico = historicos.get(p.id) ?? [];
      const marcacao = marcadaAMao(historico);
      return {
        ...p,
        situacao: situacaoDaPrevista({ taPrevistos: p.taPrevistos, taLancados, lancamentos: lancamentos.length, marcacao }),
        taLancados,
        lancamentos,
        primeiraData: lancamentos[0]?.data ?? marcacao?.dataRealizada ?? null,
        ultimaData: lancamentos.at(-1)?.data ?? marcacao?.dataRealizada ?? null,
        responsaveis: unicos(lancamentos.map((l) => l.responsavel)),
        locais: unicos(lancamentos.map((l) => l.local)),
        historico,
        marcacao,
      };
    });
  return {
    linhas,
    total: linhas.length,
    cumpridas: linhas.filter((l) => ehCumprida(l.situacao)).length,
    obrigatoriasPendentes: linhas.filter((l) => l.obrigatoria && !ehCumprida(l.situacao)),
    taPrevistos: linhas.reduce((s, l) => s + (l.taPrevistos ?? 0), 0),
    semTaPrevisto: linhas.filter((l) => l.taPrevistos === null).map((l) => l.nome),
  };
}

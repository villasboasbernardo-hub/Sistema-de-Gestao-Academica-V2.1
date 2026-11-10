/**
 * RA-6 (Bloco 18, spec 033) — a APOINST planejada da turma: a situação e o previsto × realizado.
 *
 * > *"APOINST: planejada no módulo Atividades pelo trio, por turma: nome, disciplina, instrutor responsável (designado
 * > da disciplina), período previsto, TA previstos. Execução = lançamentos do DSA vinculados (Operador lança). Situação:
 * > Planejada · Em andamento (tem lançamento) · Concluída (TA lançados ≥ previstos ou marcada à mão com justificativa) ·
 * > Atrasada (passou o fim previsto sem concluir). Comparar previsto × realizado (datas e TA). Só turmas de 2027 em
 * > diante; as de 2026 ficam como estão, sem retroajuste."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **A SITUAÇÃO É DERIVADA, NUNCA GRAVADA** (como a da disciplina, `indicadores-da-grade.ts`): Concluída vem antes de
 *    Atrasada (a APOINST concluída depois do fim não é atrasada), e o «hoje» vem de quem chama (`hojeNaCiaara()`) — nada
 *    aqui lê relógio.
 * ⚠️ **O ANO INICIAL É PARÂMETRO** (`apoinst.ano_inicial`, regra 8), lido por quem chama; ausente, não restringe
 *    (RN-DEG-01). O banco recusa a APOINST de turma anterior (`apoinst_antes_do_ano_inicial`).
 * ⚠️ **OS TA LANÇADOS SÃO OS SALVOS** (RP-8): quem chama só passa lançamento salvo e ativo.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { diasAte } from "@/lib/dominio/sinalizacao-de-disciplina";

import {
  historicoPorAlvo,
  marcadaAMao,
  type MarcacaoDeAtividade,
  type MarcacaoNoHistorico,
} from "./marcacoes";

export const SITUACOES_DA_APOINST = ["planejada", "em_andamento", "concluida", "atrasada"] as const;
export type SituacaoDaApoinst = (typeof SITUACOES_DA_APOINST)[number];

export const ROTULO_DA_SITUACAO_DA_APOINST: Readonly<Record<SituacaoDaApoinst, string>> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  atrasada: "Atrasada",
};

/** A turma tem APOINST planejada? Só do ano inicial em diante; sem o parâmetro, sempre. */
export function apoinstSeAplica(anoDaTurma: number, anoInicial: number | null): boolean {
  return anoInicial === null || anoDaTurma >= anoInicial;
}

/** A situação de UMA APOINST. */
export function situacaoDaApoinst(
  entrada: {
    readonly taPrevistos: number;
    readonly taLancados: number;
    readonly lancamentos: number;
    readonly fimPrevisto: string;
    readonly marcacao: MarcacaoNoHistorico | null;
  },
  hoje: string,
): SituacaoDaApoinst {
  if (entrada.marcacao !== null || entrada.taLancados >= entrada.taPrevistos) return "concluida";
  if (diasAte(entrada.fimPrevisto, hoje) < 0) return "atrasada";
  return entrada.lancamentos > 0 ? "em_andamento" : "planejada";
}

export type ApoinstPlanejada = {
  readonly id: string;
  readonly codigo: string;
  readonly turmaId: string;
  readonly turmaCodigo: string;
  readonly nome: string;
  readonly disciplina: { readonly id: string; readonly codigo: string; readonly nome: string };
  readonly instrutor: { readonly id: string; readonly nome: string } | null;
  readonly inicioPrevisto: string;
  readonly fimPrevisto: string;
  readonly taPrevistos: number;
  readonly ativa: boolean;
};

/** Um lançamento SALVO e ATIVO vinculado a uma APOINST. */
export type LancamentoDaApoinst = {
  readonly codigo: string;
  readonly apoinstId: string;
  readonly data: string;
  readonly ta: number;
};

export type LinhaDaApoinst = ApoinstPlanejada & {
  readonly situacao: SituacaoDaApoinst;
  readonly taLancados: number;
  readonly lancamentos: number;
  readonly primeiroLancamento: string | null;
  readonly ultimoLancamento: string | null;
  /** TA lançados − previstos (negativo = falta). */
  readonly diferencaDeTa: number;
  readonly historico: readonly MarcacaoNoHistorico[];
  readonly marcacao: MarcacaoNoHistorico | null;
};

export type QuadroDaApoinst = {
  readonly linhas: readonly LinhaDaApoinst[];
  /** Só das ATIVAS — a desativada aparece na lista, mas não conta. */
  readonly porSituacao: Readonly<Record<SituacaoDaApoinst, number>>;
};

/** O quadro das APOINST (de uma turma ou de várias), pelo início previsto. */
export function quadroDaApoinst(entrada: {
  readonly planejadas: readonly ApoinstPlanejada[];
  readonly lancamentos: readonly LancamentoDaApoinst[];
  readonly marcacoes: readonly MarcacaoDeAtividade[];
  readonly hoje: string;
}): QuadroDaApoinst {
  const historicos = historicoPorAlvo(entrada.marcacoes, (m) => m.apoinstId);
  const porApoinst = new Map<string, LancamentoDaApoinst[]>();
  for (const l of entrada.lancamentos) {
    const lista = porApoinst.get(l.apoinstId) ?? [];
    lista.push(l);
    porApoinst.set(l.apoinstId, lista);
  }
  const porSituacao: Record<SituacaoDaApoinst, number> = {
    planejada: 0,
    em_andamento: 0,
    concluida: 0,
    atrasada: 0,
  };
  const linhas = [...entrada.planejadas]
    .sort(
      (a, b) =>
        a.inicioPrevisto.localeCompare(b.inicioPrevisto) ||
        a.turmaCodigo.localeCompare(b.turmaCodigo, "pt-BR") ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    )
    .map((a): LinhaDaApoinst => {
      const lancs = [...(porApoinst.get(a.id) ?? [])].sort((x, y) => x.data.localeCompare(y.data));
      const taLancados = lancs.reduce((s, l) => s + l.ta, 0);
      const historico = historicos.get(a.id) ?? [];
      const marcacao = marcadaAMao(historico);
      const situacao = situacaoDaApoinst(
        {
          taPrevistos: a.taPrevistos,
          taLancados,
          lancamentos: lancs.length,
          fimPrevisto: a.fimPrevisto,
          marcacao,
        },
        entrada.hoje,
      );
      if (a.ativa) porSituacao[situacao] += 1;
      return {
        ...a,
        situacao,
        taLancados,
        lancamentos: lancs.length,
        primeiroLancamento: lancs[0]?.data ?? null,
        ultimoLancamento: lancs.at(-1)?.data ?? null,
        diferencaDeTa: taLancados - a.taPrevistos,
        historico,
        marcacao,
      };
    });
  return { linhas, porSituacao };
}

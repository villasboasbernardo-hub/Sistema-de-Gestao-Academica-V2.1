/**
 * RA-9 (Bloco 18, spec 033) — as ESTATÍSTICAS das atividades, para a DEnsM e a auditoria interna.
 *
 * > *"Estatísticas pensadas para a DEnsM e a auditoria interna: por turma, TA de AEC/TAD/TR usados × limite do
 * > currículo; palestras previstas cumpridas N de M, com data, palestrante e local; visitas com local; APOINST por
 * > situação. Calculadas em lib/dominio (TS puro) e reaproveitáveis pelo Épico 10."* — Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **O USO DO LIMITE SAI DE `tetosDaTurma`**, o decisor único do teto (SC-003 da spec 014): aqui só se arruma o que ele
 *    devolve em barras (usado × limite). Comparar `cumprido > limite` por conta própria seria o segundo veredito.
 * ⚠️ **A TURMA ARQUIVADA CONTA** (RT-8): quem chama não tira a arquivada antes de contar.
 * ⚠️ **COMO CONTA, NÃO SÓ A CATEGORIA**: o «TA da disciplina» (RA-4) é CHD — sai da AEC/TAD/TR também aqui.
 * ⚠️ **TA, NÃO QUANTIDADE, NOS GRÁFICOS** (o limite é de tempo, RA-3); os cartões trazem as duas.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  comoConta,
  rotuloDeComoConta,
  type CategoriaDeAtividade,
  type ComoConta,
  type ContaComo,
} from "@/lib/dominio/categoria-pelo-tipo";
import type { Categoria, TetosDaTurma } from "@/lib/dominio/tetos-da-turma";

import { SITUACOES_DA_APOINST, type SituacaoDaApoinst } from "./apoinst";
import { ehVisita, grupoNaEstatistica } from "./grupos";

export type AtividadeParaEstatistica = {
  readonly codigo: string;
  readonly data: string;
  /** Nulo na atividade de todas as turmas. */
  readonly turmaCodigo: string | null;
  readonly cursoCodigo: string | null;
  readonly tipoValor: string;
  readonly tipoRotulo: string | null;
  readonly categoria: CategoriaDeAtividade;
  readonly contaComo: ContaComo | null;
  readonly ta: number;
  readonly local: string | null;
};

export type Fatia = { readonly nome: string; readonly valor: number };

export type UsoDoLimite = {
  readonly turmaCodigo: string;
  readonly categoria: Categoria;
  readonly usado: number;
  /** Nulo = o limite não é calculável (sem CH curricular ou sem parâmetro) — «não definido», nunca zero. */
  readonly limite: number | null;
  readonly origem: "curriculo" | "norma" | null;
};

export type EstatisticasDeAtividades = {
  readonly totalAtividades: number;
  readonly totalTa: number;
  readonly taPorComoConta: readonly Fatia[];
  readonly palestras: { readonly cumpridas: number; readonly previstas: number };
  readonly apoinstPorSituacao: Readonly<Record<SituacaoDaApoinst, number>>;
  readonly visitas: number;
  readonly visitasComLocal: ReadonlyArray<{
    readonly data: string;
    readonly turmaCodigo: string | null;
    readonly local: string | null;
  }>;
  readonly porTipo: readonly Fatia[];
  readonly porCurso: readonly Fatia[];
  readonly porTurma: readonly Fatia[];
  readonly usoDoLimite: readonly UsoDoLimite[];
};

const ORDEM_DE_COMO_CONTA: readonly ComoConta[] = ["AEC", "TAD", "TR", "CHD", "Apoio_Individualizado", "Estudo_Individual"];

function somarPor<T>(itens: readonly T[], chave: (i: T) => string | null, valor: (i: T) => number): Fatia[] {
  const soma = new Map<string, number>();
  for (const i of itens) {
    const k = chave(i);
    if (k === null) continue;
    soma.set(k, (soma.get(k) ?? 0) + valor(i));
  }
  return [...soma.entries()].map(([nome, v]) => ({ nome, valor: v }));
}

/** As barras do uso do limite, a partir do veredito de `tetosDaTurma` de cada turma. */
export function usoDoLimitePorTurma(
  tetos: ReadonlyArray<{ readonly turmaCodigo: string; readonly tetos: TetosDaTurma }>,
): UsoDoLimite[] {
  const saida: UsoDoLimite[] = [];
  for (const { turmaCodigo, tetos: t } of tetos) {
    if (t.ead) continue;
    for (const categoria of ["aec", "tad", "tr"] as const) {
      const card = t.cards[categoria];
      const maximo = card.maximo;
      saida.push({
        turmaCodigo,
        categoria,
        usado: card.cumprido,
        limite: typeof maximo === "object" ? maximo.valor : null,
        origem: typeof maximo === "object" ? maximo.origem : null,
      });
    }
  }
  return saida;
}

export function estatisticasDeAtividades(entrada: {
  readonly atividades: readonly AtividadeParaEstatistica[];
  readonly palestras: { readonly cumpridas: number; readonly previstas: number };
  readonly apoinstPorSituacao?: Partial<Readonly<Record<SituacaoDaApoinst, number>>>;
  readonly tetos?: ReadonlyArray<{ readonly turmaCodigo: string; readonly tetos: TetosDaTurma }>;
}): EstatisticasDeAtividades {
  const atividades = entrada.atividades;
  const porComo = somarPor(
    atividades,
    (a) => comoConta(a.categoria, a.contaComo),
    (a) => a.ta,
  );
  const taPorComoConta = ORDEM_DE_COMO_CONTA.flatMap((c) => {
    const f = porComo.find((x) => x.nome === c);
    return f === undefined ? [] : [{ nome: rotuloDeComoConta(c), valor: f.valor }];
  });
  const visitas = atividades.filter((a) => ehVisita({ valor: a.tipoValor, rotulo: a.tipoRotulo }));
  const apoinstPorSituacao = Object.fromEntries(
    SITUACOES_DA_APOINST.map((s) => [s, entrada.apoinstPorSituacao?.[s] ?? 0]),
  ) as Record<SituacaoDaApoinst, number>;
  const decrescente = (f: Fatia[]) => f.sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, "pt-BR"));
  return {
    totalAtividades: atividades.length,
    totalTa: atividades.reduce((s, a) => s + a.ta, 0),
    taPorComoConta,
    palestras: entrada.palestras,
    apoinstPorSituacao,
    visitas: visitas.length,
    visitasComLocal: [...visitas]
      .sort((a, b) => a.data.localeCompare(b.data))
      .map((a) => ({ data: a.data, turmaCodigo: a.turmaCodigo, local: a.local })),
    porTipo: decrescente(
      somarPor(atividades, (a) => grupoNaEstatistica({ valor: a.tipoValor, rotulo: a.tipoRotulo }), (a) => a.ta),
    ),
    porCurso: decrescente(somarPor(atividades, (a) => a.cursoCodigo ?? "Todas as turmas", (a) => a.ta)),
    porTurma: decrescente(somarPor(atividades, (a) => a.turmaCodigo ?? "Todas as turmas", (a) => a.ta)),
    usoDoLimite: usoDoLimitePorTurma(entrada.tetos ?? []),
  };
}

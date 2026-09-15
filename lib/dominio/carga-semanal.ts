/**
 * `RN-2027-06` e `FR-016` da spec 006 — a carga semanal **do instrutor**, semana a semana.
 *
 * > *"A escolha do instrutor de cada bloco simulado prioriza, entre os habilitados/atribuídos à
 * > disciplina, o de menor carga já alocada **na semana**, respeitando o teto de horas de aula do seu
 * > regime de trabalho — 20h → 8 a 12 h de aula; 40h → 16 a 24 h; Dedicação Exclusiva → 16 a 30 h"*
 * > — documento 04, `RN-2027-06`
 *
 * > *"A carga semanal do instrutor numa semana é a SOMA das médias semanais das atribuições ativas cuja
 * > janela prevista (início e término previstos da disciplina) cobre aquela semana; semana sem
 * > atribuição nenhuma não entra no cálculo nem gera alerta; o alerta do FR-016 dispara quando ALGUMA
 * > semana coberta sai da faixa do regime — limites inclusivos — e a mensagem nomeia a semana; somar as
 * > médias do ano inteiro está explicitamente PROIBIDO."* — decisão de Bernardo Villas Boas, 15/09/2026
 *
 * 🛑 SOMAR AS MÉDIAS DO ANO INTEIRO É PROIBIDO. Um instrutor com duas disciplinas de 10 h por semana, uma
 * em março e outra em agosto, nunca passou de 10 h em semana nenhuma; somar o ano daria 20 h e um
 * alerta falso. Esta função só soma o que cobre **a mesma** semana.
 *
 * ⚠️ SEMANA É ISO 8601, DE SEGUNDA A DOMINGO. A herança não define outro início, e o próprio projeto já
 * usa semana ISO (documento 20, consolidação do DSA; documento 25, `?semana=`). Uma janela cobre a
 * semana quando tem ao menos um dia dentro dela.
 *
 * ⚠️ A MÉDIA DE CADA ATRIBUIÇÃO CHEGA PRONTA, de `vw_instrutor_carga_prevista.media_semanal` — tempos
 * rateados pelo `RN-MAT-05` ÷ `disciplinas.semanas` (T011, 15/09/2026). Esta função não recalcula a média
 * nem conhece rateio; ela só distribui a média pelas semanas ISO que a janela toca.
 *
 * > *"O alerta de faixa avalia TODAS as semanas ISO que caem no ano corrente e estão cobertas por
 * > atribuição ativa, inclusive semanas já passadas, e inclusive a parte que cai no ano corrente de uma
 * > janela que começou no ano anterior."* — decisão de Bernardo Villas Boas, 15/09/2026 (CHK005)
 *
 * ⚠️ "SEMANA DO ANO" É A DO ANO ISO, que é o ano da quinta-feira da semana (ISO 8601). A semana 1 de 2026
 * começa em 29/12/2025, e a de 28/12/2026 a 03/01/2027 é a 53 de 2026. `limitesDoAnoIso` dá a primeira
 * segunda e o último domingo do ano, e `semanasDoAno` recorta as semanas por ele. Não há recorte por
 * "hoje": semana que já passou conta igual.
 *
 * ⚠️ ATRIBUIÇÃO SEM JANELA OU SEM MÉDIA NÃO ENTRA EM SEMANA NENHUMA. Sem data não há semana a cobrir; a
 * ficha já mostra essa atribuição com a janela em branco.
 *
 * ⚠️ DATAS DE CALENDÁRIO NÃO PASSAM POR FUSO. `AAAA-MM-DD` é convertido para dia em UTC só para contar
 * dias; nenhuma hora local entra na conta, e o dia não muda na virada de fuso.
 */

import { situarNaFaixa, type FaixaDoRegime } from "./carga-horaria";

export type AtribuicaoComJanela = {
  readonly inicio: string | null;
  readonly termino: string | null;
  readonly mediaSemanal: number | null;
};

export type SemanaIso = {
  readonly ano: number;
  readonly numero: number;
  /** A segunda-feira, `AAAA-MM-DD`. */
  readonly segunda: string;
  /** O domingo, `AAAA-MM-DD`. */
  readonly domingo: string;
};

export type CargaDaSemana = {
  readonly semana: SemanaIso;
  /** Soma das médias das atribuições que cobrem a semana, em horas (1 TA ≈ 1 h, T011 a). */
  readonly carga: number;
  readonly atribuicoes: number;
};

export type SemanaForaDaFaixa = CargaDaSemana & { readonly situacao: "abaixo" | "acima" };

const DIA_MS = 86_400_000;
const FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

function paraDia(data: string): number | null {
  const m = FORMATO.exec(data.trim());
  if (!m) return null;
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DIA_MS);
}

function paraData(dia: number): string {
  return new Date(dia * DIA_MS).toISOString().slice(0, 10);
}

/** O dia da semana ISO: 1 = segunda, 7 = domingo. */
function diaDaSemanaIso(dia: number): number {
  // 01/01/1970 foi uma quinta-feira (ISO 4).
  return ((((dia + 3) % 7) + 7) % 7) + 1;
}

function segundaDe(dia: number): number {
  return dia - (diaDaSemanaIso(dia) - 1);
}

/** A semana ISO que contém o dia: número e ano pela quinta-feira da semana (ISO 8601). */
function semanaDoDia(dia: number): SemanaIso {
  const segunda = segundaDe(dia);
  const quinta = segunda + 3;
  const ano = new Date(quinta * DIA_MS).getUTCFullYear();
  const primeiroDeJaneiro = Math.floor(Date.UTC(ano, 0, 1) / DIA_MS);
  const numero = Math.floor((quinta - primeiroDeJaneiro) / 7) + 1;
  return { ano, numero, segunda: paraData(segunda), domingo: paraData(segunda + 6) };
}

/** A semana ISO de uma data `AAAA-MM-DD`, ou `null` fora do formato. */
export function semanaIsoDe(data: string): SemanaIso | null {
  const dia = paraDia(data);
  return dia === null ? null : semanaDoDia(dia);
}

/**
 * A primeira segunda-feira e o último domingo do ano ISO, `AAAA-MM-DD`.
 *
 * A semana 1 é a que contém 04/01; a última é a que contém 28/12. É o intervalo que uma janela precisa
 * tocar para ter semana no ano — inclusive vinda do ano anterior.
 */
export function limitesDoAnoIso(ano: number): { readonly inicio: string; readonly fim: string } {
  const quatroDeJaneiro = Math.floor(Date.UTC(ano, 0, 4) / DIA_MS);
  const vinteEOitoDeDezembro = Math.floor(Date.UTC(ano, 11, 28) / DIA_MS);
  return {
    inicio: paraData(segundaDe(quatroDeJaneiro)),
    fim: paraData(segundaDe(vinteEOitoDeDezembro) + 6),
  };
}

/** Arredonda a centésimos: a soma de médias em ponto flutuante não pode errar o limite exato. */
const centesimos = (n: number) => Math.round(n * 100) / 100;

/**
 * A carga de cada semana ISO coberta por alguma atribuição, em ordem cronológica.
 *
 * Semana que nenhuma janela toca **não aparece** — não é zero, é ausência de semana a avaliar.
 */
export function cargaPorSemana(
  atribuicoes: readonly AtribuicaoComJanela[],
): readonly CargaDaSemana[] {
  const porSegunda = new Map<number, { carga: number; atribuicoes: number }>();

  for (const a of atribuicoes) {
    if (a.inicio === null || a.termino === null || a.mediaSemanal === null) continue;
    const inicio = paraDia(a.inicio);
    const termino = paraDia(a.termino);
    if (inicio === null || termino === null || termino < inicio) continue;

    for (let segunda = segundaDe(inicio); segunda <= termino; segunda += 7) {
      const atual = porSegunda.get(segunda) ?? { carga: 0, atribuicoes: 0 };
      porSegunda.set(segunda, {
        carga: atual.carga + a.mediaSemanal,
        atribuicoes: atual.atribuicoes + 1,
      });
    }
  }

  return [...porSegunda.entries()]
    .sort(([a], [b]) => a - b)
    .map(([segunda, v]) => ({
      semana: semanaDoDia(segunda),
      carga: centesimos(v.carga),
      atribuicoes: v.atribuicoes,
    }));
}

/**
 * As semanas do ano ISO informado, inclusive as já passadas e as de janela vinda do ano anterior
 * (decisão de 15/09/2026, CHK005). Semana de outro ano ISO sai.
 */
export function semanasDoAno(
  cargas: readonly CargaDaSemana[],
  ano: number,
): readonly CargaDaSemana[] {
  return cargas.filter((c) => c.semana.ano === ano);
}

/**
 * As semanas cobertas cuja carga sai da faixa do regime — **limites inclusivos** (T011 d).
 *
 * ⚠️ A FAIXA CHEGA POR ARGUMENTO, de `config_parametros`. Sem faixa (regime não informado), não há o que
 * comparar, e a lista é vazia.
 */
export function semanasForaDaFaixa(
  cargas: readonly CargaDaSemana[],
  faixa: FaixaDoRegime | null,
): readonly SemanaForaDaFaixa[] {
  if (faixa === null) return [];
  return cargas.flatMap((c) => {
    const situacao = situarNaFaixa(c.carga, faixa);
    return situacao === "dentro" ? [] : [{ ...c, situacao }];
  });
}

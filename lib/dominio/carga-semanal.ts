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
 * ⚠️ **NOTA DE EMENDA — A JANELA DA CARGA** (spec 029, Bloco 14, item 4: `FR-004`, D-9 a D-11, adotadas por padrão em
 *    28/10/2026, a conferir por Bernardo no fim do `/corrigir`; regra proposta por ele em 25/10/2026, `PEND-025-5`).
 *    A citação acima fica como foi dita. A "janela prevista" que a soma percorre passou a ser a **janela da carga**
 *    (`janelaDaCarga`, no fim deste módulo): a previsão da view (linha da turma → disciplina → turma) **recortada
 *    pelo período da turma**, e o período inteiro da turma quando a previsão não o toca — *"a janela da carga de uma
 *    atribuição nunca sai do período da própria turma"* (`FR-004.1`). Sem isso, a `CAHO 2027` (previsão da
 *    disciplina de 11/05 a 16/10/2026, turma de 05/01 a 17/12/2027) não tinha semana nenhuma no alerta de 2027. A
 *    view continua devolvendo a previsão (D-11), e a média segue a mesma (D-10): muda só QUAIS semanas a média cobre.
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
 * ficha já mostra essa atribuição com a janela em branco. A janela que chega a `cargaPorSemana` é a da
 * carga, já recortada por quem chama (`janelaDaCarga`): esta função não conhece turma nem período.
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

/** Uma semana cuja carga passou do máximo da faixa do regime (spec 022, item 11: só acima avisa). */
export type SemanaAcimaDaFaixa = CargaDaSemana;

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

/**
 * As datas de uma semana ISO, de **segunda a sábado**, `AAAA-MM-DD` (`RF-DSA-01`, spec 013).
 *
 * ⚠️ **ELA MORA AQUI, E NÃO EM `lib/dominio/dsa/`, DE PROPÓSITO.** Este módulo já é o **único**
 * dono da aritmética de semana ISO — `semanaIsoDe` e `limitesDoAnoIso` são dele —, e a volta
 * (semana → datas) escrita em outro arquivo faria **duas** contas de calendário ISO no
 * repositório, que divergiriam na virada do ano antes de qualquer outra coisa.
 *
 * ⚠️ **A SEGUNDA DA SEMANA 1 VEM DE `limitesDoAnoIso`, não de 1º de janeiro.** A semana ISO 1 é a
 * que contém 04/01, e pode começar em dezembro do ano anterior: `2026-W01` começa em
 * **29/12/2025**. Contar a partir de 1º de janeiro erraria o ano inteiro por alguns dias, e o erro
 * apareceria como *"a semana 1 mostra os lançamentos da semana 2"* — sem erro nenhum na tela.
 *
 * ⚠️ **DEVOLVE SEIS DATAS, SEMPRE.** Quem decide se o sábado entra é a tela (`Q-4`), e ela corta a
 * lista; devolver cinco aqui obrigaria um segundo cálculo para achar o sábado.
 */
export function datasDaSemanaIso(ano: number, numero: number): readonly string[] {
  const segundaDaSemanaUm = paraDia(limitesDoAnoIso(ano).inicio);
  if (segundaDaSemanaUm === null) return [];
  const inicio = segundaDaSemanaUm + (numero - 1) * 7;
  return [0, 1, 2, 3, 4, 5].map((d) => paraData(inicio + d));
}

/**
 * Quantas semanas ISO o ano tem — **52 ou 53**, nunca um número escrito à mão.
 *
 * ⚠️ É o que impede a navegação de passar da última semana para uma que não existe: 2026 tem 53,
 * e um `52` fixo esconderia a última semana do ano inteiro.
 */
export function semanasDoAnoIso(ano: number): number {
  const { inicio, fim } = limitesDoAnoIso(ano);
  const de = paraDia(inicio);
  const ate = paraDia(fim);
  if (de === null || ate === null) return 52;
  return Math.round((ate + 1 - de) / 7);
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
 * As semanas cobertas cuja carga passa do **máximo** da faixa do regime — **limites inclusivos** (T011 d).
 *
 * > *"Instrutores: aviso de carga horária SÓ quando a carga semanal está ACIMA da faixa (abaixo da faixa deixa de
 * > avisar)."* — Bernardo Villas Boas, 22/10/2026 (spec 022, Bloco 7, item 11 — mudança de regra autorizada
 * > nominalmente)
 *
 * ⚠️ **EMENDA AO `FR-016` DA SPEC 006 E À T011 (d)** (15/09/2026), que avisavam também ABAIXO da faixa ("menos de 8
 *    ou mais de 12 gera"). A faixa do `RN-2027-06` (documento 04) **não muda**: 8–12 h, 16–24 h, 16–30 h; o que muda é
 *    que só o lado de cima vira aviso. `situarNaFaixa` continua dizendo "abaixo" — quem decide o aviso é esta função.
 * ⚠️ A FAIXA CHEGA POR ARGUMENTO, de `config_parametros`. Sem faixa (regime não informado), não há o que
 *    comparar, e a lista é vazia.
 */
export function semanasAcimaDaFaixa(
  cargas: readonly CargaDaSemana[],
  faixa: FaixaDoRegime | null,
): readonly SemanaAcimaDaFaixa[] {
  if (faixa === null) return [];
  return cargas.filter((c) => situarNaFaixa(c.carga, faixa) === "acima");
}

/** Um intervalo de datas `AAAA-MM-DD`, com limites inclusivos; cada ponta pode faltar. */
export type IntervaloDeDatas = {
  readonly inicio: string | null;
  readonly termino: string | null;
};

/**
 * A **janela da carga** de uma atribuição — o ponto único dela (spec 029, Bloco 14, item 4; `FR-004`, D-9 a D-11).
 *
 * > *"A janela da carga de uma atribuição nunca sai do período da própria turma: é a previsão (linha da turma →
 * > disciplina → turma) recortada pelo período da turma; se a previsão não toca o período, a janela é o período da
 * > turma."* — `FR-004.1` da spec 029 (D-9, recorte; regra proposta por Bernardo Villas Boas em 25/10/2026,
 * > `PEND-025-5`)
 *
 * - **Previsão dentro do período**: ela mesma. É o caso de 110 das 115 atribuições ativas do remoto (medido na cópia
 *   `remoto-20261028-133702.sql`, spec 029 §3).
 * - **Previsão que transborda**: recortada, ponta a ponta, com limites inclusivos — um dia em comum é a janela desse
 *   dia, não o período inteiro. São as 4 da `C-Exp-MetocOf 2026`, uma semana além do término (mesma medição).
 * - **Previsão disjunta**: o período inteiro da turma. É a `CAHO 2027` (previsão da disciplina de 11/05 a 16/10/2026,
 *   turma de 05/01 a 17/12/2027): sem o recurso, o alerta de 2027 cortava todas as semanas dela (`semanasDoAno`).
 * - **Turma sem período completo**: a previsão como veio (`FR-004.3`) — sem período não há o que recortar, e o
 *   alerta fica como hoje.
 * - **Previsão sem as duas datas**: como veio. Não há janela a recortar, e o recorte não inventa uma: a view só devolve
 *   previsão incompleta quando nenhuma fonte, nem a turma, tem as duas datas — e então a turma também não tem período.
 *   Previsão ou período INVERTIDO (término antes do início) também volta como veio, pelo mesmo motivo.
 *
 * ⚠️ **A VIEW NÃO MUDA (D-11).** `vw_instrutor_carga_prevista.previsao_*` continua sendo a PREVISÃO, que é o que o nome
 *    diz; o recorte mora aqui e é aplicado pelos dois leitores da janela — a ficha do instrutor e Avisos (que serve
 *    também o sininho). Recriar a view seria portão (regra 9.4); a alternativa ficou registrada na D-11.
 * ⚠️ **A MÉDIA NÃO MUDA (D-10).** A cadastrada (tempos ÷ `disciplinas.semanas`) continua vencendo
 *    (`mediaSemanalDaAtribuicao`), inclusive quando a janela vira o período da turma por recurso; o que muda é QUAIS
 *    semanas ela cobre. A de reserva (CH ÷ semanas da janela) passa a dividir pelas semanas da janela da carga.
 * ⚠️ **AS SEMANAS DE OUTRO ANO ISO CONTINUAM DE FORA** (D-41 da spec 025): a janela da `CAHO 2027` que comece em
 *    dezembro de 2026 só mostra, no alerta de 2027, as semanas de 2027. O recorte não reabre essa decisão.
 * ⚠️ **DEVOLVE AS STRINGS RECEBIDAS**, nunca datas reformatadas: cada ponta é a da previsão ou a da turma, e a
 *    comparação é pelo dia (`paraDia`), sem fuso.
 */
export function janelaDaCarga(
  previsao: IntervaloDeDatas,
  periodoDaTurma: IntervaloDeDatas,
): IntervaloDeDatas {
  const comoVeio: IntervaloDeDatas = { inicio: previsao.inicio, termino: previsao.termino };
  const deP = previsao.inicio === null ? null : paraDia(previsao.inicio);
  const ateP = previsao.termino === null ? null : paraDia(previsao.termino);
  const deT = periodoDaTurma.inicio === null ? null : paraDia(periodoDaTurma.inicio);
  const ateT = periodoDaTurma.termino === null ? null : paraDia(periodoDaTurma.termino);
  if (deP === null || ateP === null || deT === null || ateT === null) return comoVeio;
  if (ateP < deP || ateT < deT) return comoVeio;

  // Disjunta: a previsão não toca o período (D-9) — vale o período inteiro da turma.
  if (ateP < deT || deP > ateT) {
    return { inicio: periodoDaTurma.inicio, termino: periodoDaTurma.termino };
  }
  // O recorte, ponta a ponta (limites inclusivos).
  return {
    inicio: deP >= deT ? previsao.inicio : periodoDaTurma.inicio,
    termino: ateP <= ateT ? previsao.termino : periodoDaTurma.termino,
  };
}

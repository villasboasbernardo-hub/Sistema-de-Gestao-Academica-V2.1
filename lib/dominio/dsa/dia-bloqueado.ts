/**
 * `RN-EVT-04` — o dia bloqueado no calendário, e a recusa de lançar aula nele.
 *
 * > **RN-EVT-04. [NOVA — v2.1, 07/10/2026]** Não se lança aula em dia de feriado de dia inteiro do
 * > calendário ativo. A recusa vale para toda gravação que ponha uma aula nesse dia — lançar, ou
 * > mover de outro dia para ele — e diz o motivo com estas palavras: *"Dia bloqueado no calendário:
 * > <motivo>. Para lançar, ajuste o calendário."* O que já estiver gravado no dia continua visível e
 * > contando. **Risco: Médio.**
 * > — `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md` *(decisão de Bernardo Villas Boas, 07/10/2026)*
 *
 * ⚠️ **UM LUGAR SÓ DIZ QUAL DIA ESTÁ BLOQUEADO.** `motivoDoBloqueio` é chamada pela grade do DSA
 * (`montarSemana`, que pinta a coluna), pelo *EI da semana em um clique* (que pula o dia) e pelas
 * Server Actions `lancar` e `mover` (que recusam). Três regras escritas à parte discordariam no dia em
 * que uma delas esquecesse o `status` — foi exatamente o que aconteceu em 06/10/2026, quando um dia
 * inativado no calendário continuava bloqueando a grade porque a leitura não olhava o `status`.
 *
 * ⚠️ **SÓ O IMPACTO `dia_inteiro` BLOQUEIA** (`RN-EVT-02`): `parcial` e `informativo` são aviso, e
 * continuam sendo. **E SÓ O FERIADO ATIVO** (regra 4: exclusão é lógica): o inativado não bloqueia.
 *
 * ⚠️ **A DATA É COMPARADA PELOS 10 PRIMEIROS CARACTERES**, como em `capacidade.ts`: a origem da v2.0
 * guarda `2026-02-16 00:00:00`, e comparar o texto inteiro faria o carimbo de hora nunca casar com o
 * dia — a recusa sumiria em silêncio.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** Os feriados chegam por parâmetro.
 *
 * ⚠️ **EMENDA D-AA-13 (spec 014, PR 2.1): A RECUSA PASSA A TER TRÊS ORIGENS** — o feriado de dia
 *    inteiro do calendário, o **dia parado** (`dias_parados`: da turma ou global de parte do dia) e o
 *    **TR global bloqueante** (`atividades_nao_letivas.bloqueia_aula`). A parada de PARTE do dia cobre
 *    só os tempos dela. **Só AULA é recusada**: avaliação e atividade continuam aceitas (`RN-EVT-04`).
 */
import type { FeriadoDaSemana } from "./capacidade";

/** Uma linha de `feriados`; o `status`, quando vem, decide se ela vale (regra 4). */
export type FeriadoDoCalendario = FeriadoDaSemana & { readonly status?: string };

const soData = (valor: string): string => valor.slice(0, 10);

/**
 * O motivo do bloqueio do dia — a descrição do **primeiro** feriado de dia inteiro e ativo daquela
 * data, na ordem em que chegaram —, ou `null` se o dia não está bloqueado.
 *
 * ⚠️ **A PRIMEIRA DESCRIÇÃO, NÃO TODAS** — é o que a grade sempre mostrou no cabeçalho do dia
 * (`montarSemana`) e o que `capacidadeDaSemana` guarda: o dia sai **uma** vez, com **um** motivo.
 */
export function motivoDoBloqueio(
  data: string,
  feriados: readonly FeriadoDoCalendario[],
): string | null {
  const dia = soData(data);
  for (const feriado of feriados) {
    if (feriado.status !== undefined && feriado.status !== "ativo") continue;
    if (feriado.impacto !== "dia_inteiro") continue;
    if (soData(feriado.data) === dia) return feriado.descricao;
  }
  return null;
}

/**
 * A frase da recusa — **com as palavras da decisão** (`RN-EVT-04`).
 *
 * ⚠️ O ponto final do motivo sai antes de entrar na frase: *"Licença de pagamento."* daria
 * *"…pagamento.. Para lançar"*.
 */
export function mensagemDeDiaBloqueado(motivo: string): string {
  const limpo = motivo.trim().replace(/[.\s]+$/u, "");
  return `Dia bloqueado no calendário: ${limpo}. Para lançar, ajuste o calendário.`;
}

/**
 * A recusa de pôr uma **aula** em `data` — ou `null`, quando pode.
 *
 * ⚠️ **`dataAtual` É A DA AULA QUE SE ESTÁ MOVENDO.** Mover **para** o dia bloqueado é recusado (sem
 * isso bastaria lançar na véspera e arrastar); **reposicionar dentro do próprio dia**, não — a aula
 * já está lá, e recusar impediria corrigir o tempo de um lançamento que existe. Lançar não tem
 * `dataAtual`.
 */
export function recusaDeAulaNoDia(entrada: {
  readonly data: string;
  readonly feriados: readonly FeriadoDoCalendario[];
  readonly dataAtual?: string | null;
}): string | null {
  const { data, feriados, dataAtual } = entrada;
  if (dataAtual != null && soData(dataAtual) === soData(data)) return null;
  const motivo = motivoDoBloqueio(data, feriados);
  return motivo === null ? null : mensagemDeDiaBloqueado(motivo);
}

/**
 * Uma parada que bloqueia aula: uma linha de `dias_parados` ou um TR com `bloqueia_aula` (spec 014).
 * `turmaId` nulo = de todas as turmas; `taInicial` nulo = o dia inteiro.
 */
export type ParadaDoDia = {
  readonly data: string;
  readonly turmaId: string | null;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  /** A sigla do tipo de parada (FR, LA, LP, NT, RC, PF) — ou `TR` no TR bloqueante. */
  readonly tipo: string;
  readonly motivo: string;
  readonly status?: string;
  /** Para «Desfazer»: onde a parada mora e o código dela. */
  readonly destino?: "feriado" | "dia_parado" | "atividade";
  readonly codigo?: string;
};

/** A parada que cobre o dia (e, se informados, os tempos) desta turma — ou `null`. */
export function paradaQueCobre(
  paradas: readonly ParadaDoDia[],
  alvo: {
    readonly data: string;
    readonly turmaId: string;
    readonly taInicial?: number | null;
    readonly tempos?: number | null;
  },
): ParadaDoDia | null {
  const dia = soData(alvo.data);
  for (const p of paradas) {
    if (p.status !== undefined && p.status !== "ativo") continue;
    if (soData(p.data) !== dia) continue;
    if (p.turmaId !== null && p.turmaId !== alvo.turmaId) continue;
    if (p.taInicial === null || p.tempos === null) return p;
    if (alvo.taInicial === null || alvo.taInicial === undefined) return p;
    const fimParada = p.taInicial + p.tempos - 1;
    const fimAlvo = alvo.taInicial + (alvo.tempos ?? 1) - 1;
    if (alvo.taInicial <= fimParada && fimAlvo >= p.taInicial) return p;
  }
  return null;
}

/** A frase da recusa de aula em tempo parado, com o tipo e o motivo (`RN-EVT-04`, emenda D-AA-13). */
export function mensagemDeTempoParado(p: ParadaDoDia): string {
  // A frase da emenda E-8 da `RN-EVT-04` (spec 014 §13), literal.
  const limpo = p.motivo.trim().replace(/[.\s]+$/u, "");
  return `Dia bloqueado: ${p.tipo} — ${limpo}. Para lançar, desfaça a parada ou ajuste o calendário.`;
}

/**
 * A recusa de AULA considerando as três origens. Com `paradas` vazio, é exatamente `recusaDeAulaNoDia`.
 */
export function recusaDeAulaNoTempo(entrada: {
  readonly data: string;
  readonly feriados: readonly FeriadoDoCalendario[];
  readonly paradas: readonly ParadaDoDia[];
  readonly turmaId: string;
  readonly taInicial?: number | null;
  readonly tempos?: number | null;
  readonly dataAtual?: string | null;
}): string | null {
  const doCalendario = recusaDeAulaNoDia(entrada);
  if (doCalendario !== null) return doCalendario;
  const parada = paradaQueCobre(entrada.paradas, entrada);
  return parada === null ? null : mensagemDeTempoParado(parada);
}

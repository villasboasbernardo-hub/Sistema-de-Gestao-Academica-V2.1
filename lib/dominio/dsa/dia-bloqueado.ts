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

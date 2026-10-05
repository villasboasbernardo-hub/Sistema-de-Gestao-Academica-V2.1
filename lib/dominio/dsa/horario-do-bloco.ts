/**
 * O relógio de um Tempo de Aula e o horário de um bloco — `RF-HOR-04`, `RF-HOR-06`, `RN-CONF-02`.
 *
 * > *"O Detalhe Semanal de Aula deve exibir, para cada tempo de aula, o **horário de início e de
 * > término**, além de indicação visual dos intervalos e da janela de almoço."*
 * > — `RF-HOR-06`, documento 02 da Fase 1
 *
 * > *"O sistema deve reservar, em todos os cursos, a **janela de almoço entre 12h00 e 13h00**,
 * > organizando os tempos de aula de modo que a turma possa se ausentar nesse intervalo. É aceitável
 * > que o último tempo da manhã termine poucos minutos após as 12h00."*
 * > — `RF-HOR-04`, documento 02 da Fase 1
 *
 * > *"O catálogo de horários por tempo de aula (configurações A a E) é ancorado no **início** do dia
 * > (hora de início fixa, hora de término variável conforme quantos tempos são usados) — este é o
 * > modelo do banco atual e é deliberadamente **diferente** do modelo das planilhas legadas por curso
 * > (que ancoravam no fim do dia). Uma reescrita não deve «corrigir» isso portando o modelo antigo."*
 * > — `RN-CONF-02`, documento 04 da Fase 1
 *
 * ## Há DUAS fontes de relógio, e a precedência é declarada
 *
 * Medido em 05/10/2026: o relógio existe **no regime do curso** (`curso_regime_historico`:
 * `hora_inicio_manha`, `hora_inicio_tarde`, `ta_duracao_min`, os dois intervalos) **e no catálogo**
 * (`horarios_tempos_aula`, com `hora_inicio` e `hora_fim` **armazenadas**). As duas podem divergir.
 *
 * **A precedência: manda o CATÁLOGO quando a vigência o aponta; manda o REGIME quando não aponta.**
 * É o que `relogioDaSemana` faz. ⚠️ **E ela não é arbitrária: é o que torna a correção do relógio
 * (`Q-6`) possível sem código.** Medido: `esquemaDeVigencia` **não tem** `configuracao_horario_id`,
 * então toda vigência registrada **pela tela** nasce com o catálogo **nulo** — e aí o regime vence.
 * As 11 linhas de vigência ativas de hoje **apontam** CFG-A..E, e é exatamente por isso que o 08:00
 * do catálogo ganha hoje, enquanto o relógio real começa 07:50 ou 08:10.
 *
 * ## A quantidade de TA da manhã é DERIVADA, e o limite é 12:00 em ponto
 *
 * Um TA cabe na manhã enquanto o **fim** dele é `<= 12:00`. Medido contra as duas grades reais da
 * operação: a **G45** (07:50, 45 min, intervalo 5) dá **cinco** — a 5ª encerra 11:55 —, e a **G50**
 * (08:10, 50 min, intervalo 10) dá **quatro** — a 4ª encerra 12:00 em ponto. O que não cabe vai para
 * a tarde, a partir de `hora_inicio_tarde`. **Nenhum TA se perde: ele muda de período.**
 *
 * ⚠️ **A TOLERÂNCIA DA `RF-HOR-04` («poucos minutos após as 12h00») NÃO ENTRA NA DERIVAÇÃO, e há um
 * caso medido que explica por quê.** A **CFG-E** armazena **cinco** TA de manhã, e o quinto encerra
 * **12:05** — e ela é justamente uma das duas configurações que a própria `RF-HOR-04` nomeia como
 * fora da janela (*"Duas configurações de horário, usadas por `C-Esp-ALH` e `C-ApA-OcOp-PR-SP`, não
 * respeitam esta janela"*; medido: as duas usam CFG-E). Derivar com tolerância reproduziria a CFG-E
 * e, com ela, a violação: a turma ficaria com **55 minutos** de almoço em vez de uma hora. Derivar
 * com o limite em **12:00** preserva a janela, e **nunca prejudica a CFG-E**, porque ela é lida do
 * catálogo — que a precedência faz vencer sempre que a vigência o aponta.
 *
 * ## O bloco que atravessa o almoço sai em DOIS trechos
 *
 * É o defeito **D-3** da planilha, medido: *"bloco que atravessa o almoço sai como UM horário
 * contínuo («09:30 as 13:50» para 4 TA) — 64 ocorrências no CAHO e 50 no C-Espc-FR"*.
 * `trechosDoBloco` agrupa os TA consecutivos **por período**, então um bloco que começa de manhã e
 * termina à tarde devolve dois trechos. Um lançamento, dois horários (`SC-011`).
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** O regime, o catálogo e os limites
 * chegam **por parâmetro**. E o horário é texto `HH:MM` com aritmética em **minutos inteiros** — sem
 * `Date` e sem ponto flutuante, porque a `R-2` do pedido proíbe arredondamento de minuto.
 */

/** Manhã ou tarde — o `periodo_dia` do banco. */
export type Periodo = "manha" | "tarde";

/** `normal` ou `excepcional` — o `tipo_tempo` do banco; o 9º TA da `RF-HOR-03.1` é o excepcional. */
export type TipoDeTempo = "normal" | "excepcional";

export type TempoDeAula = {
  /** 1 a `TA_MAXIMO`. */
  readonly numero: number;
  readonly periodo: Periodo;
  readonly tipo: TipoDeTempo;
  /** `HH:MM`. */
  readonly inicio: string;
  /** `HH:MM`. Derivado da duração; no catálogo, lido da coluna. */
  readonly fim: string;
};

export type Relogio = {
  readonly tempos: readonly TempoDeAula[];
  /** Quantos TA o regime declara. Acima disso o TA existe mas é **além do regime** (alerta). */
  readonly temposDoRegime: number;
  readonly origem: "regime" | "catalogo";
};

/** Um pedaço contínuo de horário de um bloco. Um bloco tem **um ou dois**. */
export type Trecho = {
  readonly inicio: string;
  readonly fim: string;
  readonly periodo: Periodo;
};

/** O regime vigente, como `curso_regime_historico` o entrega (via `app.fn_regime_vigente`). */
export type RegimeParaRelogio = {
  readonly regimeTempos: number;
  readonly taDuracaoMin: number;
  readonly intervaloManhaMin: number;
  readonly intervaloTardeMin: number;
  /** `HH:MM` ou `HH:MM:SS`. Nulo em regime EAD, e aí não há relógio. */
  readonly horaInicioManha: string | null;
  readonly horaInicioTarde: string | null;
  /** Aponta uma configuração do catálogo? Se aponta, o catálogo vence. */
  readonly configuracaoHorarioId: string | null;
};

/** Uma linha de `horarios_tempos_aula`. */
export type TempoDoCatalogo = {
  readonly tempoNumero: number;
  readonly periodo: Periodo;
  readonly tipoTempo: TipoDeTempo;
  /** `HH:MM` ou `HH:MM:SS` — **armazenada**, não derivada. */
  readonly horaInicio: string;
  readonly horaFim: string;
};

/** O teto do `CHECK` de TA, medido no banco em 05/10/2026. */
export const TA_MAXIMO = 12;

/**
 * O fim da manhã, em minutos. **12:00 em ponto** — ver a nota do cabeçalho sobre a CFG-E.
 *
 * ⚠️ **NÃO É PARÂMETRO ADMINISTRÁVEL de propósito:** a janela 12h00–13h00 é **normativa**
 * (`RF-HOR-04`), não operacional, e o Princípio VII manda parametrizar teto e faixa que a DGPM
 * revisa — não a hora do almoço, que o requisito escreve com número.
 */
const FIM_DA_MANHA_MIN = 12 * 60;

/** `HH:MM` ou `HH:MM:SS` → minutos desde a meia-noite, ou `null` se não for hora. */
function emMinutos(hora: string): number | null {
  const casamento = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(hora.trim());
  if (!casamento) return null;
  const h = Number.parseInt(casamento[1] ?? "", 10);
  const m = Number.parseInt(casamento[2] ?? "", 10);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Minutos → `HH:MM`, com zero à esquerda. */
function emHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * O relógio derivado do regime.
 *
 * Devolve `null` quando o regime não tem relógio — regime EAD (`regimeTempos = 0`) ou hora de início
 * nula. ⚠️ **`null` é estado de tela, nunca zero** (`RN-DEG-01`): a grade abre com os TA numerados e
 * sem horário, e diz onde se cadastra a vigência.
 */
export function relogioDoRegime(regime: RegimeParaRelogio): Relogio | null {
  const inicioManha = regime.horaInicioManha === null ? null : emMinutos(regime.horaInicioManha);
  const inicioTarde = regime.horaInicioTarde === null ? null : emMinutos(regime.horaInicioTarde);
  if (inicioManha === null || inicioTarde === null) return null;
  if (!Number.isInteger(regime.taDuracaoMin) || regime.taDuracaoMin <= 0) return null;
  if (!Number.isInteger(regime.regimeTempos) || regime.regimeTempos <= 0) return null;

  const tempos: TempoDeAula[] = [];

  // A manhã: cabe TA enquanto o FIM dele é <= 12:00.
  let cursor = inicioManha;
  while (tempos.length < TA_MAXIMO) {
    const fim = cursor + regime.taDuracaoMin;
    if (fim > FIM_DA_MANHA_MIN) break;
    tempos.push(montar(tempos.length + 1, "manha", cursor, fim, regime.regimeTempos));
    cursor = fim + regime.intervaloManhaMin;
  }

  // A tarde: do início da tarde até o teto de TA. O que não cabia na manhã vem para cá.
  cursor = inicioTarde;
  while (tempos.length < TA_MAXIMO) {
    const fim = cursor + regime.taDuracaoMin;
    tempos.push(montar(tempos.length + 1, "tarde", cursor, fim, regime.regimeTempos));
    cursor = fim + regime.intervaloTardeMin;
  }

  return { tempos, temposDoRegime: regime.regimeTempos, origem: "regime" };
}

function montar(
  numero: number,
  periodo: Periodo,
  inicio: number,
  fim: number,
  temposDoRegime: number,
): TempoDeAula {
  return {
    numero,
    periodo,
    tipo: numero > temposDoRegime ? "excepcional" : "normal",
    inicio: emHora(inicio),
    fim: emHora(fim),
  };
}

/**
 * O relógio lido do catálogo — `hora_inicio` e `hora_fim` **como estão armazenadas**.
 *
 * ⚠️ **NADA É RECALCULADO AQUI**, e é isso que a `R-2` do pedido quer dizer com *"a hora de término é
 * derivada"*: derivado é o fim do **bloco** (o fim do último TA dele), não o fim do TA. Recalcular o
 * fim a partir da duração reintroduziria o arredondamento que a restrição proíbe — a CFG-E tem
 * intervalo de 5 min e a CFG-A de 10, e a CFG-E encerra a manhã às 12:05.
 */
export function relogioDoCatalogo(
  linhas: readonly TempoDoCatalogo[],
  temposDoRegime: number,
): Relogio | null {
  if (linhas.length === 0) return null;
  const tempos = [...linhas]
    .sort((a, b) => a.tempoNumero - b.tempoNumero)
    .flatMap((linha): readonly TempoDeAula[] => {
      const inicio = emMinutos(linha.horaInicio);
      const fim = emMinutos(linha.horaFim);
      if (inicio === null || fim === null) return [];
      return [
        {
          numero: linha.tempoNumero,
          periodo: linha.periodo,
          tipo: linha.tipoTempo,
          inicio: emHora(inicio),
          fim: emHora(fim),
        },
      ];
    });
  return tempos.length === 0 ? null : { tempos, temposDoRegime, origem: "catalogo" };
}

/**
 * A precedência entre as duas fontes — ver o cabeçalho.
 *
 * O catálogo vence **quando a vigência o aponta** (`configuracaoHorarioId` não nulo **e** as linhas
 * chegaram). Sem isso, o regime deriva. Nenhum dos dois: `null`, e a grade degrada.
 */
export function relogioDaSemana(entrada: {
  readonly regime: RegimeParaRelogio | null;
  readonly catalogo: readonly TempoDoCatalogo[];
}): Relogio | null {
  const { regime, catalogo } = entrada;
  if (regime === null) return null;
  if (regime.configuracaoHorarioId !== null && catalogo.length > 0) {
    return relogioDoCatalogo(catalogo, regime.regimeTempos) ?? relogioDoRegime(regime);
  }
  return relogioDoRegime(regime);
}

/** O TA de número `numero`, ou `undefined` se o relógio não o tem. */
export function tempoDeAula(relogio: Relogio, numero: number): TempoDeAula | undefined {
  return relogio.tempos.find((t) => t.numero === numero);
}

/**
 * Os trechos de horário de um bloco — **um**, ou **dois** quando ele atravessa o almoço.
 *
 * Devolve lista **vazia** quando algum TA do bloco não existe no relógio: é o caso do bloco que
 * passa do último TA, e a tela mostra o bloco sem horário em vez de inventar um (`RN-DEG-01`).
 *
 * ⚠️ **O AGRUPAMENTO É POR PERÍODO, não por continuidade de minuto.** Dois TA seguidos da manhã têm
 * um intervalo entre eles (5 ou 10 min) e **continuam no mesmo trecho** — o documento oficial
 * imprime `07:50 às 09:25` para dois TA, não dois horários. O que quebra o trecho é a **janela de
 * almoço**, que é a única descontinuidade que o papel mostra (`SC-011`, corrige o `D-3`).
 */
export function trechosDoBloco(
  relogio: Relogio,
  taInicial: number,
  tempos: number,
): readonly Trecho[] {
  if (!Number.isInteger(taInicial) || !Number.isInteger(tempos) || tempos < 1) return [];

  const doBloco: TempoDeAula[] = [];
  for (let numero = taInicial; numero < taInicial + tempos; numero += 1) {
    const ta = tempoDeAula(relogio, numero);
    if (ta === undefined) return [];
    doBloco.push(ta);
  }

  const trechos: Trecho[] = [];
  for (const ta of doBloco) {
    const ultimo = trechos[trechos.length - 1];
    if (ultimo !== undefined && ultimo.periodo === ta.periodo) {
      trechos[trechos.length - 1] = { inicio: ultimo.inicio, fim: ta.fim, periodo: ultimo.periodo };
    } else {
      trechos.push({ inicio: ta.inicio, fim: ta.fim, periodo: ta.periodo });
    }
  }
  return trechos;
}

/**
 * O slot do **Estudo Individual** de um dia: o seguinte ao último TA lançado (`D-4`).
 *
 * *(decisão de **Bernardo Villas Boas**, 05/10/2026, contra a recomendação de usar o slot fixo
 * `regimeTempos + 1`.)*
 *
 * ⚠️ **O LUGAR ACOMPANHA O DIA, e é por isso que o slot fixo foi recusado:** o C-Ap-HN tem *"9 TA em
 * parte dos dias e 8 em outros"* (medido na planilha vigente), e um slot fixo poria o Estudo
 * Individual **em cima** do 9º TA nos dias cheios.
 *
 * ⚠️ **A REGRA REPRODUZ O C-Espc-HN EXATAMENTE NOS DOIS CASOS MEDIDOS** — 7 TA lançados → EI no 8º,
 * `15:50–16:40`; 8 TA → EI no 9º, `16:45–17:35` — e **diverge em dois cursos**, o que está
 * registrado em `plan.md` §7.3 e **não** foi corrigido (regra 1): no CAHO a planilha traz
 * `15:40–16:25` onde a regra dá `15:35–16:20` (5 min), e no C-Ap-HN com 9 TA a planilha traz
 * `16:25–17:20` onde a regra dá `16:25–17:10` — o início bate, e o fim difere 10 min porque o TA de
 * 45 minutos não produz um bloco de 55. **A `D-11` decidiu: o EI dura um TA, derivado, sem parâmetro
 * novo.**
 */
export function slotDoEstudoIndividual(ultimoTaLancado: number | null): number | null {
  if (ultimoTaLancado === null) return 1;
  if (!Number.isInteger(ultimoTaLancado) || ultimoTaLancado < 1) return null;
  const slot = ultimoTaLancado + 1;
  return slot > TA_MAXIMO ? null : slot;
}

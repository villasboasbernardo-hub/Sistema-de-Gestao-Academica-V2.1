/**
 * O andamento de uma turma — `RF-INI-01`.
 *
 * > *"Por turma: CH prevista, CH executada e CH restante. Turma **em atraso** é a que está **em
 * > andamento** com **saldo de capacidade negativo**."*
 * > — `RF-INI-01`, documento 02 da Fase 1
 *
 * As fórmulas são as da **v1.0** (`Código.gs`: `getDashboardGeral`, `temposDiaDaTurma_` e
 * `diasUteis_`), transcritas por **Bernardo Villas Boas** em 03 e 04/10/2026 e **conferidas por ele
 * no arquivo** em 04/10/2026. ⚠️ **O `Código.gs` NÃO está neste repositório** — varrido em `docs/` e
 * `scripts/`, zero ocorrências de `getDashboardGeral`. A citação é, portanto, **testemunho datado do
 * responsável com a função de origem nomeada**, e não uma medição que outra pessoa possa reexecutar
 * aqui. Está escrito assim de propósito (regra 9.2).
 *
 * Regras que este módulo aplica, e de onde cada uma vem:
 *
 * - **`RN-CRONOS-01`** — *o executado é a soma dos registros de aula lançados, nunca o planejamento.*
 *   ⚠️ Ela é honrada **antes** deste módulo: a `executada` chega do banco — `chd_da_turma_ate(hoje)`, a CHD
 *   lançada **até hoje, inclusive** (M1 da spec 016) —, e este módulo **não** reimplementa a soma —
 *   reimplementá-la seria o segundo lugar onde a regra vive.
 * - **D-COR-2** — *"o saldo de capacidade conta só até hoje"* (Bernardo Villas Boas, 16/10/2026; FR-014.1 e
 *   FR-014.2 da spec 016). A executada é a de até hoje, e por isso os dias úteis à frente contam de
 *   **amanhã** (`diaSeguinte(hoje)`): o dia de hoje já está do lado do executado, e contá-lo também como
 *   capacidade era um dia a mais. "Hoje" é o dia de São Paulo (`hojeNaCiaara()`), passado por quem chama.
 * - **`RN-EVT-02`** — *feriado só desconta capacidade se o impacto for dia inteiro.* Honrada por quem
 *   monta a lista de datas: aqui chegam **só** as de impacto dia inteiro, e o módulo não conhece o
 *   enum de impacto.
 * - **`RN-MAT-04`** — *a capacidade diária é a da modalidade real da turma.* Esta é aplicada aqui,
 *   em `capacidadeDiaria`.
 * - **`RN-DEG-02`** — *regra normativa vira alerta, nunca bloqueio.* `emAtraso` é alerta; nada neste
 *   módulo impede ação nenhuma.
 * - **RD-3 no saldo** (spec 029, Bloco 14, item 5, `FR-005`; fecha a `PEND-026-1` e supera a D-15 da spec 026) —
 *   > *"regra: o saldo e a capacidade seguem o regime «desde» (Desta semana em diante, no DSA), e não só o de Editar
 *   > turma."* — Bernardo Villas Boas, 26/10/2026 (`docs/correcoes/plano-de-correcoes-em-blocos.md`, `PEND-026-1`)
 *
 *   A capacidade soma, **dia útil a dia útil**, o TA/dia do regime **da semana** de cada dia, pela mesma
 *   `regimeDaSemana` do DSA (gravado ou *só esta semana* > *desde* > *Editar turma* > curso; D-14 da spec 026) — a
 *   ordem **não** é copiada aqui, e a guarda de `andamento-da-turma.test.ts` confere que este módulo a chama. O «do
 *   curso» do saldo continua sendo o **padrão vigente hoje** (D-12 da spec 029), e não o do DSA (exceção > padrão na
 *   data da semana): é o que faz só as turmas com «desde» ou *só esta semana* mudarem.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** `hoje`, os feriados e o regime
 * chegam **por parâmetro**, como em todo módulo desta pasta — é o que permite provar as contas com
 * casos sintéticos, sem subir banco. E `hoje` é `string` `yyyy-mm-dd`, nunca `Date`: a convenção da
 * pasta inteira, porque comparação lexicográfica de data ISO é exata e não tem fuso.
 */
import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { regimeDaSemana } from "@/lib/dominio/dsa/regime-da-semana";

/** O regime vigente do curso, como `vw_cursos_regime_vigente` o entrega. */
export type RegimeDoCurso = {
  /** TA por dia do regime padrão. `0` em regime EAD, por `CHECK` desde 08/09/2026. */
  readonly regimePadraoTempos: number | null;
  /** Horas por dia do regime EAD. `numeric(4,2)` no banco. */
  readonly limiteDiarioEadHoras: number | null;
};

export type TurmaParaAndamento = {
  /** `planejada` | `ativa` | `concluida` | `cancelada`. Só `ativa` pode estar em atraso. */
  readonly status: string;
  /** `presencial` | `ead` | `semipresencial` — **da turma**, não do curso (`RN-MAT-04`). */
  readonly modalidade: string;
  readonly dataTermino: string | null;
  /** CH curricular do curso, em TA. */
  readonly prevista: number;
  /** CHD executada, em TA — de lançamento, nunca de planejamento. */
  readonly executada: number;
  /**
   * Spec 024 (D-9): o primeiro dia da capacidade, quando ela não começa amanhã — o início da etapa presencial da turma
   * semipresencial que ainda não chegou (`contagemDaTurma`). Ausente: amanhã.
   */
  readonly inicioDaCapacidade?: string | null;
};

/**
 * Por que o saldo pode não existir.
 *
 * ⚠️ **AS DUAS AUSÊNCIAS SÃO ESTADOS DA TELA, NUNCA ZERO** (`RN-DEG-01`). Um zero inventado se leria
 * como *"não cabe"*, que é uma afirmação sobre a turma — e não se mediu nada.
 */
export type SituacaoDaCapacidade =
  | "calculada"
  | "sem_termino"
  | "sem_regime"
  /** Spec 024 (FR-018): turma EAD — o andamento é controlado pela Divisão de Ensino a Distância; nada se conta. */
  | "controle_da_dead";

export type Andamento = {
  readonly prevista: number;
  readonly executada: number;
  /** `max(prevista − executada, 0)`. Nunca negativa: excesso não é "restante negativo". */
  readonly restante: number;
  /** `round(100 · executada / prevista)`; `null` quando a prevista é zero. */
  readonly percentual: number | null;
  /** `true` quando nada foi lançado — a tela diz "ainda sem lançamentos", e não `0%`. */
  readonly semLancamentos: boolean;
  /**
   * O TA/dia — com a capacidade calculada, o do **primeiro dia útil** da janela (D-13 da spec 029): é o regime em
   * vigor, e é por ele que `saldoEmDias` divide. Sem dia útil na janela, o do regime da turma.
   */
  readonly capacidadeDiaria: number | null;
  /**
   * Spec 029 (D-13): a faixa do TA/dia na janela **quando ele varia** de uma semana para outra — a ficha escreve
   * *"8 a 9 TA/dia"*. `null` quando é um só, e sempre que a capacidade não foi calculada.
   */
  readonly faixaDiaria: { readonly minima: number; readonly maxima: number } | null;
  readonly diasUteis: number | null;
  readonly capacidade: number | null;
  /** **O "Saldo de capacidade (TA)"** (`D-NAV-4`): `capacidade − restante`. */
  readonly saldo: number | null;
  readonly saldoEmDias: number | null;
  readonly situacaoDaCapacidade: SituacaoDaCapacidade;
  /** `status === "ativa" && saldo < 0` — só com capacidade calculada (`RF-INI-01`). */
  readonly emAtraso: boolean;
};

/**
 * O regime **das semanas** da turma — o que o DSA guarda além do regime de *Editar turma* (spec 029, `FR-005`; RD-3).
 *
 * ⚠️ **`tempos` NULO É «O DO CURSO»**, nas duas listas — é o que a linha sem regime nomeado significa no banco
 *    (`dsa_regime_da_semana` sem retrato; `turma_regime_vigencia` sem regime).
 * ⚠️ **`temposDoCurso` VEM À PARTE, E É O PADRÃO VIGENTE HOJE** (D-12 da spec 029): o `regime` de `andamentoDaTurma`
 *    chega já fundido por `regimeEfetivo` (*Editar turma* > curso), e o «desde» de regime nulo volta ao **curso**
 *    mesmo quando há regime em *Editar turma* — sem este campo, não haveria como chegar a ele.
 */
export type RegimesDasSemanas = {
  /** O regime gravado com a semana ao salvar, ou o «só esta semana» — uma linha ativa por semana ISO. */
  readonly registros: readonly {
    readonly ano: number;
    readonly semana: number;
    readonly origem: "gravado" | "so_esta_semana";
    readonly tempos: number | null;
  }[];
  /** As vigências «desta semana em diante»: `vigenteDe` é sempre uma segunda-feira, `aaaa-mm-dd`. */
  readonly vigencias: readonly { readonly vigenteDe: string; readonly tempos: number | null }[];
  readonly temposDoCurso: number | null;
};

/** As exceções do regime de UMA turma como a leitura as entrega — sem o «do curso», que cada leitor já lê. */
export type ExcecoesDoRegime = Omit<RegimesDasSemanas, "temposDoCurso">;

/**
 * O 5º parâmetro de `andamentoDaTurma` a partir das exceções lidas e do regime vigente do curso.
 *
 * ⚠️ **A D-12 DA SPEC 029 MORA AQUI, E NÃO NOS QUATRO LEITORES**: o «do curso» do saldo é o **padrão vigente hoje**
 *    (`vw_cursos_regime_vigente.regime_padrao_tempos`), o mesmo número que o saldo já usava — a exceção do curso e o
 *    padrão de outra data não entram. Escrito uma vez, os quatro leitores (Início, Avisos, `/turmas`, ficha) não podem
 *    discordar sobre ele.
 * ⚠️ **SEM EXCEÇÕES LIDAS, `undefined`** — e `andamentoDaTurma` faz a conta de antes do Bloco 14 (FR-005.3).
 */
export function regimesDasSemanas(
  excecoes: ExcecoesDoRegime | undefined,
  doCurso: RegimeDoCurso,
): RegimesDasSemanas | undefined {
  if (excecoes === undefined) return undefined;
  return {
    registros: excecoes.registros,
    vigencias: excecoes.vigencias,
    temposDoCurso: doCurso.regimePadraoTempos,
  };
}

/** Meia-noite UTC de uma data ISO, ou `null` se o texto não for uma data. */
function meiaNoiteUtc(iso: string): number | null {
  const partes = iso.split("-");
  if (partes.length !== 3) return null;
  const [ano, mes, dia] = partes.map((p) => Number.parseInt(p, 10));
  if (ano === undefined || mes === undefined || dia === undefined) return null;
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  const t = Date.UTC(ano, mes - 1, dia);
  return Number.isNaN(t) ? null : t;
}

const UM_DIA = 86_400_000;

/**
 * O dia seguinte a `iso` (`aaaa-mm-dd`), por aritmética de calendário — vira o mês, o ano e o 29 de fevereiro.
 * Data inválida devolve a própria entrada, e quem a usa (`diasUteisEntre`) já a trata como ausência.
 */
export function diaSeguinte(iso: string): string {
  const t = meiaNoiteUtc(iso);
  if (t === null) return iso;
  return new Date(t + UM_DIA).toISOString().slice(0, 10);
}

/**
 * Dias úteis de `hoje` até `termino`, **ambos inclusive**, descontando feriados de dia inteiro.
 *
 * ⚠️ **INCLUSIVO NAS DUAS PONTAS, e isso foi CONFERIDO no `diasUteis_` da v1.0** (Bernardo,
 * 04/10/2026): o laço de lá é `while (d <= ate)`. Hoje é dia em que ainda se pode dar aula, e o
 * término também. ⚠️ **Um erro de uma ponta não dá exceção nenhuma** — ele dá um dia a mais ou a
 * menos de capacidade, que vira saldo errado e alerta errado. Por isso o caso que mede as pontas
 * está no teste de unidade.
 *
 * ⚠️ **SÓ SEGUNDA A SEXTA.** Sábado, domingo e recesso não são tratados como exceção nesta fatia.
 *
 * ⚠️ **FERIADO CONTA UMA VEZ, POR DATA DISTINTA — e isso não é zelo abstrato:** a origem da v2.0 tem
 * **data repetida** (16/02 aparece em `FER-000003` e em `FER-000022`), e contar por linha descontaria
 * o mesmo dia duas vezes. ⚠️ **E feriado em fim de semana não desconta nada**, porque aquele dia já
 * não era capacidade de ninguém.
 *
 * ⚠️ **`termino` ANTES DE `hoje` DÁ ZERO, e não número negativo.** Turma com término passado não tem
 * capacidade à frente; um negativo aqui viraria capacidade negativa e saldo inflado.
 */
export function diasUteisEntre(
  hoje: string,
  termino: string,
  feriadosDiaInteiro: readonly string[],
): number {
  return datasUteisEntre(hoje, termino, feriadosDiaInteiro).length;
}

/**
 * As **datas** dos dias úteis que `diasUteisEntre` conta, em ordem — a mesma regra, devolvendo cada dia.
 *
 * ⚠️ **É UMA REGRA SÓ, COM DUAS SAÍDAS** (spec 029, `FR-005`): a capacidade passou a somar o TA/dia **de cada dia**
 *    (o da semana dele), e para isso precisa saber **quais** dias contam, não só quantos. Uma segunda varredura de
 *    calendário escrita para a soma seria o lugar onde as pontas, o fim de semana ou o feriado repetido divergiriam
 *    da contagem — e `diasUteis` e `capacidade` deixariam de falar dos mesmos dias sem erro nenhum.
 */
function datasUteisEntre(
  hoje: string,
  termino: string,
  feriadosDiaInteiro: readonly string[],
): readonly string[] {
  const de = meiaNoiteUtc(hoje);
  const ate = meiaNoiteUtc(termino);
  if (de === null || ate === null || ate < de) return [];

  const feriados = new Set(feriadosDiaInteiro);
  const uteis: string[] = [];

  for (let t = de; t <= ate; t += UM_DIA) {
    const data = new Date(t);
    const semana = data.getUTCDay();
    if (semana === 0 || semana === 6) continue;

    // `toISOString` de meia-noite UTC devolve `yyyy-mm-ddT00:00:00.000Z`: o prefixo é a data.
    const iso = data.toISOString().slice(0, 10);
    if (feriados.has(iso)) continue;

    uteis.push(iso);
  }

  return uteis;
}

/**
 * Os TA que a turma consegue consumir por dia útil — **pela modalidade DELA** (`RN-MAT-04`).
 *
 * ⚠️ **A MODALIDADE É DA TURMA E O REGIME É DO CURSO, e a escolha segue a turma.** É a regra da v1.0
 * (`temposDiaDaTurma_`), confirmada por Bernardo em 04/10/2026.
 *
 * ⚠️ **1 TA = 1 h AO LER O LIMITE EAD.** A coluna é em **horas** (`numeric(4,2)`) e esta conta é em
 * **TA**; a equivalência é a já fixada na spec 006 (T011: *"1 TA ≈ 1 h"*) e a que a v1.0 usava. **É
 * premissa herdada, não regra nova** — e se um dia o regime EAD ganhar duração de TA própria, é aqui
 * que a conta muda.
 *
 * ⚠️ **SEM FALLBACK ENTRE AS DUAS COLUNAS, e é a decisão mais consequente deste módulo (`D8`).** O
 * `CHECK` do banco garante que um regime EAD tenha `regime_tempos = 0` **e** o limite preenchido, mas
 * **nada amarra o regime à modalidade do curso, nem a do curso à da turma** — a própria amostra de
 * teste já tinha um curso `ead` com `regime_tempos: 8` e limite nulo. Cair na outra coluna daria
 * **8 TA/dia a uma turma EAD**, e o atraso falso que apareceria em toda turma EAD é exatamente o que
 * esta decisão existe para evitar. Sem o campo da modalidade, a resposta é *"sem dado"*.
 *
 * ⚠️ **ZERO E NEGATIVO VALEM "SEM DADO".** Zero é o valor que o regime EAD carrega em
 * `regime_tempos` por construção; aceitá-lo daria capacidade zero e atraso em toda turma presencial
 * de curso EAD.
 */
export function capacidadeDiaria(modalidade: string, regime: RegimeDoCurso): number | null {
  const bruto = modalidade === "ead" ? regime.limiteDiarioEadHoras : regime.regimePadraoTempos;
  if (bruto === null || !Number.isFinite(bruto) || bruto <= 0) return null;
  return bruto;
}

/**
 * O andamento inteiro.
 *
 * ⚠️ **A PRECEDÊNCIA DAS DUAS AUSÊNCIAS É DELIBERADA: falta de TÉRMINO vem primeiro.** As duas podem
 * faltar ao mesmo tempo, e a tela mostra uma frase só — então vale a que aponta para o campo **mais
 * perto de quem está olhando**: a data de término é da própria turma, editável na ficha em que a
 * pessoa já está; o regime é do curso, noutra tela. Quem corrigir a data e ainda não tiver regime vê
 * a segunda frase em seguida, e isso é melhor que mandar a pessoa a outra tela primeiro.
 *
 * ⚠️ **`emAtraso` SÓ EXISTE COM CAPACIDADE CALCULADA.** Sem saldo não há como afirmar atraso, e
 * afirmar sem medir é o modo de falha que o indicador antigo de `/inicio` tinha.
 */
/**
 * O percentual executado — `round(100 · executada / prevista)`, ou `null` sem denominador.
 *
 * ⚠️ **ELA É EXPORTADA PORQUE A MESMA CONTA APARECE EM TRÊS GRÃOS: a turma, cada disciplina da grade
 * e o painel do `/inicio`.** A fórmula é uma linha, e é justamente por isso que três cópias dela
 * passariam sem ninguém notar — até o dia em que uma arredondasse para baixo. `prevista = 0` devolve
 * `null`, e **não** `0`: currículo por competências não tem CH em disciplina (são dois cursos na base
 * real), e `0 %` ali seria afirmação sobre execução em vez de ausência de denominador.
 */
export function percentualExecutado(prevista: number, executada: number): number | null {
  const prev = Number(prevista) || 0;
  if (prev <= 0) return null;
  return Math.round(((Number(executada) || 0) / prev) * 100);
}

/**
 * O TA/dia de um dia útil — **o da semana dele** (spec 029, `FR-005.1`), ou o do regime da turma quando não há
 * semanas.
 *
 * ⚠️ **A ORDEM É A DE `regimeDaSemana`, CHAMADA, NUNCA COPIADA** (D-14 da spec 026): gravado ou *só esta semana* >
 *    *desde* (o de maior segunda-feira ≤ a da semana) > *Editar turma* > curso. Uma segunda cópia dela aqui faria a
 *    ficha e a grade do DSA discordarem da mesma semana em silêncio no dia em que uma das duas mudasse.
 * ⚠️ **O «EDITAR TURMA» É O `regime` JÁ FUNDIDO** por `regimeEfetivo`: sem regime nomeado na turma, ele é o padrão do
 *    curso, e o passo «turma» dá o mesmo número que o passo «curso» daria — a fonte muda, o TA/dia não.
 * ⚠️ **O NULO DO REGISTRO E DO «DESDE» É O DO CURSO DE HOJE** (D-12 da spec 029): `temposDoCurso`, nunca o de
 *    *Editar turma*. Sem ele também (curso sem padrão vigente), o dia fica **sem TA/dia** — e a capacidade inteira,
 *    sem regime (D-14 da spec 029), o que `andamentoDaTurma` decide.
 * ⚠️ **SÓ OS TA PRESENCIAIS VARIAM POR SEMANA**, como em `regimeEfetivo`: o TA/dia sai de `capacidadeDiaria`, que
 *    continua escolhendo pela modalidade da turma (`RN-MAT-04`) e chamando zero e negativo de "sem dado". A EAD nem
 *    chega aqui: ela sai antes, em `andamentoDaTurma`.
 * ⚠️ **UMA RESOLUÇÃO POR SEMANA**: os dias da mesma semana ISO têm o mesmo regime, e a resposta fica guardada pela
 *    segunda-feira.
 */
function temposDoDiaPelaSemana(
  modalidade: string,
  regime: RegimeDoCurso,
  semanas: RegimesDasSemanas | undefined,
): (data: string) => number | null {
  const doRegime = capacidadeDiaria(modalidade, regime);
  /* Sem as semanas, o TA/dia é um só para a janela inteira — a conta de antes do Bloco 14 (FR-005.3). */
  if (semanas === undefined) return () => doRegime;

  const registroDaSemana = new Map(
    semanas.registros.map((r) => [`${r.ano}-${r.semana}`, r] as const),
  );
  const vigenciasDaTurma = semanas.vigencias.map((v) => ({
    vigenteDe: v.vigenteDe,
    regime: v.tempos,
  }));
  const porSegunda = new Map<string, number | null>();

  return (data) => {
    const semana = semanaIsoDe(data);
    /* Data fora do formato não acontece (as datas saem de `datasUteisEntre`); se acontecer, é dia sem TA/dia. */
    if (semana === null) return null;
    if (porSegunda.has(semana.segunda)) return porSegunda.get(semana.segunda) ?? null;
    const registro = registroDaSemana.get(`${semana.ano}-${semana.numero}`);
    const { regime: tempos } = regimeDaSemana<number | null>({
      segunda: semana.segunda,
      registro:
        registro === undefined
          ? null
          : { regime: registro.tempos ?? semanas.temposDoCurso, origem: registro.origem },
      vigenciasDaTurma,
      daTurma: regime.regimePadraoTempos,
      doCurso: semanas.temposDoCurso,
    });
    const ta = capacidadeDiaria(modalidade, { ...regime, regimePadraoTempos: tempos });
    porSegunda.set(semana.segunda, ta);
    return ta;
  };
}

/**
 * O andamento da turma — o único lugar que decide `emAtraso` (`SC-006`).
 *
 * `semanas` (spec 029, `FR-005`) é o regime das semanas que o DSA guarda; ausente, a conta é a de antes do Bloco 14,
 * com um TA/dia só para a janela inteira. Sem nenhum registro de semana dentro da janela e sem «desde» com início até o
 * término, o resultado é **idêntico** ao de antes, campo a campo (FR-005.3) — a não regressão está no teste de unidade.
 * ⚠️ **O «DESDE» ANTERIOR À JANELA VALE NELA INTEIRA** (o de maior segunda-feira ≤ a da semana, `regimeDaSemana`): o de
 *    meses atrás muda o TA/dia de todos os dias dela — o caso S5 prova (81, e não 72). E o registro **gravado** dentro
 *    da janela conta mesmo sem «desde» nem «só esta semana»: a semana salva com o regime do curso numa turma que depois
 *    ganhou regime em *Editar turma* soma o TA/dia do curso, e não o da turma (o caso do limite do «idêntico», no teste).
 */
export function andamentoDaTurma(
  turma: TurmaParaAndamento,
  regime: RegimeDoCurso,
  feriadosDiaInteiro: readonly string[],
  hoje: string,
  semanas?: RegimesDasSemanas,
): Andamento {
  /*
   * ⚠️ **SPEC 024 (FR-018): A EAD NÃO CONTA TA EM LUGAR NENHUM** — o andamento dela é da Divisão de Ensino a Distância
   *    (`AVISO_DE_TURMA_EAD`). Nada de progresso, saldo nem «em atraso»: toda tela mostra o aviso no lugar.
   */
  if (turma.modalidade === "ead") {
    return {
      prevista: 0,
      executada: 0,
      restante: 0,
      percentual: null,
      semLancamentos: true,
      capacidadeDiaria: null,
      faixaDiaria: null,
      diasUteis: null,
      capacidade: null,
      saldo: null,
      saldoEmDias: null,
      situacaoDaCapacidade: "controle_da_dead",
      emAtraso: false,
    };
  }
  const prevista = Number(turma.prevista) || 0;
  const executada = Number(turma.executada) || 0;

  /*
   * ⚠️ **`max(…, 0)` É A FÓRMULA DA v1.0, E É O QUE DISTINGUE EXCESSO DE ATRASO.** Sem ele, uma turma
   *    que executou mais do que o previsto teria "restante negativo" — e o indicador antigo de
   *    `/inicio` chamava exatamente isso de *"em atraso"*, acusando quem está adiantado e nunca quem
   *    está atrasado.
   */
  const restante = Math.max(prevista - executada, 0);
  const percentual = percentualExecutado(prevista, executada);

  const capDiaria = capacidadeDiaria(turma.modalidade, regime);
  const semLancamentos = executada === 0;

  const base = {
    prevista,
    executada,
    restante,
    percentual,
    semLancamentos,
    capacidadeDiaria: capDiaria,
    faixaDiaria: null,
  };

  if (turma.dataTermino === null || turma.dataTermino === "") {
    return {
      ...base,
      diasUteis: null,
      capacidade: null,
      saldo: null,
      saldoEmDias: null,
      situacaoDaCapacidade: "sem_termino",
      emAtraso: false,
    };
  }

  /*
   * ⚠️ **DE AMANHÃ, E NÃO DE HOJE** (D-COR-2, FR-014.2): a executada já conta o lançado até hoje, inclusive.
   *    Num sábado ou domingo nada muda — os dias úteis começam na segunda dos dois jeitos.
   */
  const amanha = diaSeguinte(hoje);
  /* Spec 024 (D-9): a etapa presencial que ainda não começou conta do início dela. */
  const inicio =
    turma.inicioDaCapacidade && turma.inicioDaCapacidade > amanha
      ? turma.inicioDaCapacidade
      : amanha;
  /*
   * ⚠️ **SPEC 029 (`FR-005`): O TA/DIA DE CADA DIA ÚTIL É O DA SEMANA DELE**, e a capacidade é a soma, dia útil a dia
   *    útil. Antes do Bloco 14 ela era `dias úteis × um TA/dia` (Editar turma > curso, D-15 da spec 026) — e o regime
   *    trocado no relógio do DSA valia para a grade e não para o saldo. Os dias são os mesmos que `diasUteisEntre`
   *    conta: `diasUteis` continua sendo a contagem de sempre.
   */
  const temposDoDia = temposDoDiaPelaSemana(turma.modalidade, regime, semanas);
  const datas = datasUteisEntre(inicio, turma.dataTermino, feriadosDiaInteiro);
  const tempos = datas.map(temposDoDia);
  /* D-13: o TA/dia do primeiro dia útil; sem dia útil na janela, o do regime da turma, como antes. */
  const taDoPrimeiroDia = datas.length > 0 ? (tempos[0] ?? null) : capDiaria;

  /*
   * ⚠️ **D-14 DA SPEC 029: UM DIA ÚTIL SEM TA/DIA DEIXA A CAPACIDADE INTEIRA SEM REGIME** — sem saldo e sem veredito,
   *    o lado seguro da `RN-DEG-01`. Somar só os dias com regime subestimaria a capacidade e inventaria um «em atraso».
   *    Sem as semanas, é a condição de antes (o regime da turma sem TA/dia), na mesma ordem: depois do término.
   */
  if (taDoPrimeiroDia === null || tempos.some((t) => t === null)) {
    return {
      ...base,
      capacidadeDiaria: null,
      diasUteis: null,
      capacidade: null,
      saldo: null,
      saldoEmDias: null,
      situacaoDaCapacidade: "sem_regime",
      emAtraso: false,
    };
  }

  const diasUteis = datas.length;
  const validos = tempos.filter((t): t is number => t !== null);
  const minima = Math.min(taDoPrimeiroDia, ...validos);
  const maxima = Math.max(taDoPrimeiroDia, ...validos);
  /*
   * ⚠️ **COM UM TA/DIA SÓ, A CONTA É A MULTIPLICAÇÃO DE ANTES**, e não a soma — o mesmo número por construção
   *    (FR-005.3), sem depender de a soma repetida dar exatamente o produto.
   */
  const capacidade =
    minima === maxima ? diasUteis * taDoPrimeiroDia : validos.reduce((soma, t) => soma + t, 0);
  const saldo = capacidade - restante;

  return {
    ...base,
    capacidadeDiaria: taDoPrimeiroDia,
    faixaDiaria: minima === maxima ? null : { minima, maxima },
    diasUteis,
    capacidade,
    saldo,
    /*
     * ⚠️ **`floor` ARREDONDA PARA BAIXO TAMBÉM NO NEGATIVO, e é o que se quer:** −20 TA sobre 8 TA/dia
     *    dá −3, não −2. Faltam três dias de capacidade, e o conservador é o número que não subestima
     *    o que falta.
     * ⚠️ **D-13 DA SPEC 029: DIVIDE PELO TA/DIA DO PRIMEIRO DIA ÚTIL** da janela — o regime em vigor —, e não pela
     *    média: com o TA/dia variando, a média seria um número que nenhum dia tem.
     */
    saldoEmDias: Math.floor(saldo / taDoPrimeiroDia),
    situacaoDaCapacidade: "calculada",
    emAtraso: turma.status === "ativa" && saldo < 0,
  };
}

/**
 * Os insumos da etapa presencial de uma turma semipresencial (spec 024, FR-019/FR-020): as disciplinas marcadas
 * *presencial* do currículo dela (`vw_carga_presencial_turma`), a CHD lançada na etapa (`chd_da_turma_na_etapa_ate`) e as
 * datas da etapa.
 */
export type ContagemPresencial = {
  readonly disciplinasMarcadas: number;
  readonly chPresencial: number;
  readonly executadaNaEtapa: number;
  readonly inicioEtapa: string | null;
  readonly terminoEtapa: string | null;
};

/**
 * O que entra na conta do andamento — spec 024 (Bloco 9, item 2).
 *
 * > *"SEMIPRESENCIAL conta só a etapa presencial: marca «presencial» por disciplina no currículo; CH prevista soma só as
 * > marcadas e a executada só o lançado na etapa presencial; sem marca, aviso e conta tudo, como hoje."*
 * > — Bernardo Villas Boas, 23/10/2026
 *
 * ⚠️ **SEM MARCA, OU SEM ETAPA CADASTRADA, CONTA TUDO** (D-10), com o aviso que diz o que falta — o lado seguro de errar
 *    é o número de antes, não um número de uma etapa que não se sabe onde está.
 * ⚠️ Presencial e EAD passam como vieram (a EAD sai da conta em `andamentoDaTurma`).
 */
export function contagemDaTurma(
  turma: {
    readonly modalidade: string;
    readonly prevista: number;
    readonly executada: number;
    readonly dataTermino: string | null;
  },
  presencial: ContagemPresencial | null,
): {
  readonly prevista: number;
  readonly executada: number;
  readonly dataTermino: string | null;
  readonly inicioDaCapacidade: string | null;
  readonly aviso: "sem_marca" | "sem_etapa" | null;
} {
  const comoVeio = {
    prevista: turma.prevista,
    executada: turma.executada,
    dataTermino: turma.dataTermino,
    inicioDaCapacidade: null,
  };
  if (turma.modalidade !== "semipresencial") return { ...comoVeio, aviso: null };
  if (presencial === null || presencial.disciplinasMarcadas === 0)
    return { ...comoVeio, aviso: "sem_marca" };
  if (!presencial.inicioEtapa || !presencial.terminoEtapa)
    return { ...comoVeio, aviso: "sem_etapa" };
  return {
    prevista: presencial.chPresencial,
    executada: presencial.executadaNaEtapa,
    dataTermino: presencial.terminoEtapa,
    inicioDaCapacidade: presencial.inicioEtapa,
    aviso: null,
  };
}

/** As frases dos avisos da contagem semipresencial (FR-020). */
export const AVISO_DA_CONTAGEM_PRESENCIAL = {
  sem_marca: "Marque as disciplinas presenciais do currículo para contar só a etapa presencial.",
  sem_etapa: "Cadastre a etapa presencial da turma para contar só ela.",
} as const;

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
 *   ⚠️ Ela é honrada **antes** deste módulo: a `executada` chega de `vw_carga_horaria_turma`, que soma
 *   `registros_aula.tempos_consumidos` com `status = 'ativo'`. Este módulo **não** reimplementa a
 *   soma — reimplementá-la seria o segundo lugar onde a regra vive.
 * - **`RN-EVT-02`** — *feriado só desconta capacidade se o impacto for dia inteiro.* Honrada por quem
 *   monta a lista de datas: aqui chegam **só** as de impacto dia inteiro, e o módulo não conhece o
 *   enum de impacto.
 * - **`RN-MAT-04`** — *a capacidade diária é a da modalidade real da turma.* Esta é aplicada aqui,
 *   em `capacidadeDiaria`.
 * - **`RN-DEG-02`** — *regra normativa vira alerta, nunca bloqueio.* `emAtraso` é alerta; nada neste
 *   módulo impede ação nenhuma.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** `hoje`, os feriados e o regime
 * chegam **por parâmetro**, como em todo módulo desta pasta — é o que permite provar as contas com
 * casos sintéticos, sem subir banco. E `hoje` é `string` `yyyy-mm-dd`, nunca `Date`: a convenção da
 * pasta inteira, porque comparação lexicográfica de data ISO é exata e não tem fuso.
 */

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
};

/**
 * Por que o saldo pode não existir.
 *
 * ⚠️ **AS DUAS AUSÊNCIAS SÃO ESTADOS DA TELA, NUNCA ZERO** (`RN-DEG-01`). Um zero inventado se leria
 * como *"não cabe"*, que é uma afirmação sobre a turma — e não se mediu nada.
 */
export type SituacaoDaCapacidade = "calculada" | "sem_termino" | "sem_regime";

export type Andamento = {
  readonly prevista: number;
  readonly executada: number;
  /** `max(prevista − executada, 0)`. Nunca negativa: excesso não é "restante negativo". */
  readonly restante: number;
  /** `round(100 · executada / prevista)`; `null` quando a prevista é zero. */
  readonly percentual: number | null;
  /** `true` quando nada foi lançado — a tela diz "ainda sem lançamentos", e não `0%`. */
  readonly semLancamentos: boolean;
  readonly capacidadeDiaria: number | null;
  readonly diasUteis: number | null;
  readonly capacidade: number | null;
  /** **O "Saldo de capacidade (TA)"** (`D-NAV-4`): `capacidade − restante`. */
  readonly saldo: number | null;
  readonly saldoEmDias: number | null;
  readonly situacaoDaCapacidade: SituacaoDaCapacidade;
  /** `status === "ativa" && saldo < 0` — só com capacidade calculada (`RF-INI-01`). */
  readonly emAtraso: boolean;
};

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
  const de = meiaNoiteUtc(hoje);
  const ate = meiaNoiteUtc(termino);
  if (de === null || ate === null || ate < de) return 0;

  const feriados = new Set(feriadosDiaInteiro);
  let uteis = 0;

  for (let t = de; t <= ate; t += UM_DIA) {
    const data = new Date(t);
    const semana = data.getUTCDay();
    if (semana === 0 || semana === 6) continue;

    // `toISOString` de meia-noite UTC devolve `yyyy-mm-ddT00:00:00.000Z`: o prefixo é a data.
    const iso = data.toISOString().slice(0, 10);
    if (feriados.has(iso)) continue;

    uteis += 1;
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

export function andamentoDaTurma(
  turma: TurmaParaAndamento,
  regime: RegimeDoCurso,
  feriadosDiaInteiro: readonly string[],
  hoje: string,
): Andamento {
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

  if (capDiaria === null) {
    return {
      ...base,
      diasUteis: null,
      capacidade: null,
      saldo: null,
      saldoEmDias: null,
      situacaoDaCapacidade: "sem_regime",
      emAtraso: false,
    };
  }

  const diasUteis = diasUteisEntre(hoje, turma.dataTermino, feriadosDiaInteiro);
  const capacidade = diasUteis * capDiaria;
  const saldo = capacidade - restante;

  return {
    ...base,
    diasUteis,
    capacidade,
    saldo,
    /*
     * ⚠️ **`floor` ARREDONDA PARA BAIXO TAMBÉM NO NEGATIVO, e é o que se quer:** −20 TA sobre 8 TA/dia
     *    dá −3, não −2. Faltam três dias de capacidade, e o conservador é o número que não subestima
     *    o que falta.
     */
    saldoEmDias: Math.floor(saldo / capDiaria),
    situacaoDaCapacidade: "calculada",
    emAtraso: turma.status === "ativa" && saldo < 0,
  };
}

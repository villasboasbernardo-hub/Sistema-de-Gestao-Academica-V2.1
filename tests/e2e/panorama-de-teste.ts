/**
 * O dado mínimo para o panorama ter o que mostrar — **semeado por processo de trabalho**.
 *
 * ⚠️ **A BASE LOCAL ESTÁ VAZIA, E ISSO É ESTADO SUPORTADO.** As migrações do Épico 1 criam o schema;
 * a carga do Épico 2 é passo à parte, e as asserções de banco já rodam verdes com a base povoada
 * **e** vazia. Semear aqui é o que permite provar recorte e progresso sem depender de a carga ter
 * sido feita nesta máquina.
 *
 * ⚠️ **CÓDIGOS ÚNICOS POR PROCESSO, pelo mesmo motivo de sempre:** o preparo roda uma vez por
 * processo de trabalho, e dois processos semeando o mesmo `codigo` colidem na restrição de unicidade
 * — falha que parece defeito do schema e é corrida do teste.
 *
 * ⚠️ **A LEITURA DO AMBIENTE É A MESMA DE `conta-de-teste.ts`, e não uma cópia.** A cópia existiu por
 * meia hora e reintroduziu a falha que aquele arquivo tinha acabado de corrigir: dois leitores
 * chamando `supabase status` ao mesmo tempo derrubam a CLI, e o caso que reprova é sempre outro.
 *
 * ⚠️ **OS NÚMEROS SÃO ESCOLHIDOS PARA PRODUZIR OS DOIS LADOS DO `RF-INI-01`:** uma turma com saldo
 * **negativo** de capacidade, que é a definição de atraso, e uma com saldo positivo. Uma amostra em
 * que tudo vai bem não distingue a implementação certa da que nunca alerta.
 *
 * ⚠️ **ESTA SEMENTE FOI REFEITA EM 04/10/2026, E A REFAÇÃO É O CASO QUE DISCRIMINA (DoD 8).** Até
 * aqui ela plantava *"12 executados contra 10 previstos"* e chamava aquilo de turma atrasada — e o
 * `/inicio` concordava, porque media `previstos − executados < 0`. **Era o indicador invertido**:
 * disparava no EXCESSO e nunca no atraso de verdade, que é *"a capacidade restante até o término não
 * cobre a carga que falta"* (`RF-INI-01`). As três turmas abaixo fazem **dois vereditos virarem**:
 *
 * | Turma | Prevista | Executada | Término | TA/dia | Veredito antigo | Veredito novo |
 * |---|---|---|---|---|---|---|
 * | `turmaEmExcesso` (era `turmaAtrasada`) | 10 | 12 | +30 dias úteis | 8 | **em atraso** | **não** |
 * | `turmaEmDia` | 50 | 10 | +30 dias úteis | 4 h (EAD) | não | não |
 * | `turmaSemCapacidade` (**nova**) | 100 | 10 | +2 dias úteis | 8 | **não** | **em atraso** |
 *
 * ⚠️ **OS TÉRMINOS SÃO RELATIVOS A HOJE, E TÊM DE SER.** O veredito depende de quantos dias úteis
 * faltam: uma data fixa no arquivo passaria a reprovar sozinha no dia em que ela ficasse no passado
 * — teste que estraga com o calendário é pior que teste que não existe, porque reprova sem causa.
 *
 * ⚠️ **E OS NÚMEROS TÊM FOLGA DE PROPÓSITO, porque o banco local PODE TER FERIADOS.** `diasUteis`
 * desconta feriado de dia inteiro (`RN-EVT-02`), e a base carregada pelo ETL tem o calendário do
 * PROENS. Com 30 dias úteis a turma EAD precisaria de 10 para não acusar atraso, e a turma em excesso
 * não acusa com nenhum número — o `restante` dela é **zero**. A apertada tem capacidade máxima de 16
 * TA contra 90 de restante: feriado nenhum muda esses vereditos.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { hojeNaCiaara } from "@/lib/formato/ano-corrente";

import { chaveLocal } from "./conta-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export type PanoramaSemeado = {
  readonly cursoRegular: string;
  readonly cursoExpedito: string;
  /** O curso da turma que **não tem capacidade** de terminar — `regular`, presencial, 8 TA/dia. */
  readonly cursoSemCapacidade: string;
  /** Executou MAIS do que o previsto. O antigo `turmaAtrasada`, que nunca estava atrasada. */
  readonly turmaEmExcesso: string;
  readonly turmaEmDia: string;
  /** Falta muito e sobra pouco prazo: **esta** é a que o `RF-INI-01` manda sinalizar. */
  readonly turmaSemCapacidade: string;
  /** O término folgado, em `YYYY-MM-DD` — 30 dias úteis contados de hoje, inclusive. */
  readonly terminoFolgado: string;
  /** O término apertado — 2 dias úteis contados de hoje, inclusive. */
  readonly terminoApertado: string;
};

/**
 * A data do enésimo dia útil contado de **hoje, inclusive**.
 *
 * ⚠️ **"INCLUSIVE" É A REGRA DA v1.0** (`diasUteis_`, `while d <= ate`, confirmada por Bernardo em
 * 04/10/2026): pedir 2 numa terça devolve quarta, e `diasUteisEntre` conta as duas pontas. Contar de
 * amanhã faria a semente e o domínio discordarem em um dia, e o caso reprovaria por aritmética.
 *
 * ⚠️ **O "HOJE" VEM DE `hojeNaCiaara()`, A MESMA FUNÇÃO QUE A TELA USA.** Um `new Date()` cru aqui
 * leria o fuso da máquina e divergiria da aplicação entre 21h e a meia-noite — a terceira fórmula de
 * "hoje" que esta fatia acabou de eliminar do código.
 *
 * ⚠️ **ELE NÃO DESCONTA FERIADO**, e não precisa: ver a folga declarada no cabeçalho.
 */
function diaUtilApartirDeHoje(diasUteis: number): string {
  const dia = new Date(`${hojeNaCiaara()}T12:00:00`);
  let contados = 0;
  for (;;) {
    const semana = dia.getDay();
    if (semana !== 0 && semana !== 6) contados += 1;
    if (contados >= diasUteis) break;
    dia.setDate(dia.getDate() + 1);
  }
  const mes = String(dia.getMonth() + 1).padStart(2, "0");
  const data = String(dia.getDate()).padStart(2, "0");
  return `${dia.getFullYear()}-${mes}-${data}`;
}

/** Três cursos de classificações e modalidades diferentes, com uma turma cada. */
export async function semearPanorama(processo: number): Promise<PanoramaSemeado> {
  const s = `E2E${processo}`;
  const semeado: PanoramaSemeado = {
    cursoRegular: `CUR-${s}-REG`,
    /*
     * ⚠️ **A SIGLA DO CURSO EAD MUDOU DE `-EXP` PARA `-EAD` EM 04/10/2026, E ISSO NÃO É ENFEITE.** O
     *    regime dele passou a declarar `limite_diario_ead_horas`, e **curso não é apagável** (regra
     *    9.1): a semente é idempotente e REAPROVEITA o curso que já existe, então uma máquina que já
     *    rodou a versão antiga ficaria com o regime velho — sem limite EAD — e o caso da capacidade
     *    reprovaria **só no local**, passando no CI, que sempre nasce de um `db reset`. É o modo de
     *    falha do gotcha 8, e trocar a sigla é o conserto honesto: o curso novo nasce com o regime
     *    certo nos dois ambientes.
     */
    cursoExpedito: `CUR-${s}-EAD`,
    cursoSemCapacidade: `CUR-${s}-CAP`,
    // ⚠️ O código da turma é `sigla [rótulo] ano` (`FR-025.1` da spec 009) — aqui sem rótulo, que é
    // ausência legítima em turma única. A partir da migration 3 daquela fatia o banco o GERA, e
    // recusa qualquer valor divergente; a amostra passa a escrever o mesmo que o banco escreveria.
    turmaEmExcesso: `CUR-${s}-REG 2026`,
    turmaEmDia: `CUR-${s}-EAD 2026`,
    turmaSemCapacidade: `CUR-${s}-CAP 2026`,
    terminoFolgado: diaUtilApartirDeHoje(30),
    terminoApertado: diaUtilApartirDeHoje(2),
  };

  await limparPanorama(semeado);

  /*
   * ⚠️ CURSO NASCE PELA RPC, E NÃO SE APAGA MAIS (spec 009, migration 6). Duas consequências, as duas
   * medidas em 18/09/2026:
   *
   *   1. `criar_curso_com_regime` é o único caminho: um `insert into cursos` solto é recusado no
   *      COMMIT pelo gatilho adiado, com a chave `curso_sem_regime` (`FR-019.5`). E cada requisição
   *      do PostgREST é uma transação, então a recusa chega na hora.
   *   2. `curso_regime_historico` é append-only — `DELETE` e `TRUNCATE` recusados por gatilho de
   *      statement, **inclusive para a `service_role`** (`FR-020`). Como a FK do curso é `restrict`,
   *      **o curso também deixou de ser apagável**. A limpeza apaga tudo o que pende dele e o DEIXA
   *      de pé; a amostra passou a ser IDEMPOTENTE, reaproveitando o curso que já existe.
   */
  for (const linha of [
    {
      codigo: semeado.cursoRegular,
      nome_curso: `Curso regular de percurso ${processo}`,
      classificacao: "regular",
      modalidade: "presencial",
      duracao_dias: 30,
    },
    {
      codigo: semeado.cursoExpedito,
      nome_curso: `Curso expedito de percurso ${processo}`,
      classificacao: "expedito",
      modalidade: "ead",
      duracao_dias: 10,
    },
    {
      codigo: semeado.cursoSemCapacidade,
      nome_curso: `Curso sem capacidade de percurso ${processo}`,
      classificacao: "regular",
      modalidade: "presencial",
      duracao_dias: 60,
    },
  ]) {
    const { data: existe } = await admin()
      .from("cursos")
      .select("id")
      .eq("codigo", linha.codigo)
      .maybeSingle();
    if (existe) continue;
    /*
     * ⚠️ **O REGIME EAD É OUTRO, E O BANCO O EXIGE ASSIM** (`CHECK` de `20260908085000`): curso a
     *    distância não tem tempo de aula presencial, então `regime_tempos = 0` e `ta_duracao_min = 0`
     *    **só** passam com `limite_diario_ead_horas` preenchido. É esse campo que vira a capacidade
     *    diária da turma EAD (`RN-MAT-04`) — e é por ele que o `turmaEmDia` deixa de depender do
     *    regime presencial que ela nunca usou.
     */
    const ead = linha.modalidade === "ead";
    const { error: erroCurso } = await admin().rpc("criar_curso_com_regime", {
      p_curso: linha,
      p_regime: {
        regime_tempos: ead ? 0 : 8,
        ta_duracao_min: ead ? 0 : 45,
        limite_diario_ead_horas: ead ? 4 : null,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 10,
        hora_inicio_manha: "07:30",
        hora_inicio_tarde: "13:30",
        vigente_de: "2020-01-01",
      },
    });
    if (erroCurso) throw new Error(`falha ao semear curso ${linha.codigo}: ${erroCurso.message}`);
  }

  const { data: cursos } = await admin()
    .from("cursos")
    .select("id, codigo")
    .in("codigo", [semeado.cursoRegular, semeado.cursoExpedito, semeado.cursoSemCapacidade]);

  const id = (codigo: string) => cursos?.find((c) => c.codigo === codigo)?.id as string;

  const { error: erroDisciplinas } = await admin()
    .from("disciplinas")
    .insert([
      {
        codigo: `DIS-${s}-REG`,
        curso_id: id(semeado.cursoRegular),
        cod_disciplina: "PERC-01",
        nome_disciplina: "Disciplina de percurso (regular)",
        carga_horaria_tempos: 10,
      },
      {
        codigo: `DIS-${s}-EXP`,
        curso_id: id(semeado.cursoExpedito),
        cod_disciplina: "PERC-02",
        nome_disciplina: "Disciplina de percurso (expedito)",
        carga_horaria_tempos: 50,
      },
      /*
       * ⚠️ **100 TA PREVISTOS CONTRA 10 EXECUTADOS É O QUE FAZ A TERCEIRA TURMA ACUSAR ATRASO.** O
       *    restante fica em 90, e a capacidade até o término apertado é de 16 TA (2 dias × 8).
       *    Nenhuma dessas duas grandezas existia na semente antiga — o indicador velho olhava só
       *    `previstos − executados`, e 90 positivos **não** o faziam disparar.
       */
      {
        codigo: `DIS-${s}-CAP`,
        curso_id: id(semeado.cursoSemCapacidade),
        cod_disciplina: "PERC-03",
        nome_disciplina: "Disciplina de percurso (sem capacidade)",
        carga_horaria_tempos: 100,
      },
    ])
    .select("id, codigo");
  if (erroDisciplinas) throw new Error(`falha ao semear disciplinas: ${erroDisciplinas.message}`);

  const { data: disciplinas } = await admin()
    .from("disciplinas")
    .select("id, codigo, curso_id")
    .in("codigo", [`DIS-${s}-REG`, `DIS-${s}-EXP`, `DIS-${s}-CAP`]);

  /*
   * ⚠️ TRÊS CATRACAS DO ÉPICO 2 MORDEM AQUI, e nenhuma delas é lacuna:
   *
   * | Catraca | O que exige de linha NOVA |
   * |---|---|
   * | `reg_aula_instrutor_obrigatorio` | aula precisa de instrutor |
   * | `reg_aula_ue_so_nula_no_historico` | aula precisa de Unidade de Ensino |
   * | `reg_aula_tempos_positivos` | **1 a 12 tempos por lançamento** |
   *
   * As duas primeiras aceitam nulo apenas em linha migrada e nunca editada — para dado novo elas são
   * **mais fortes** que o `NOT NULL` original. A terceira é a que muda o desenho desta amostra: não
   * existe lançamento de 120 tempos, e sim vários lançamentos de um dia de aula.
   */
  const { data: instrutor, error: erroInstrutor } = await admin()
    .from("instrutores")
    .insert({
      codigo: `INS-${s}`,
      posto_graduacao: "CT",
      // ⚠️ Militar novo precisa de especialidade desde 15/09/2026 (`RN-INST-03` delimitado, gatilho de
      // `20260915140000`). Sem ela a amostra nem nasce, e a tela Início reprova por motivo alheio.
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor De Percurso ${processo}`,
      categoria: "organica",
      om: "CIAARA",
    })
    .select("id")
    .single();
  if (erroInstrutor) throw new Error(`falha ao semear instrutor: ${erroInstrutor.message}`);

  const disciplina = (codigo: string) => disciplinas?.find((d) => d.codigo === codigo);

  const { data: unidades, error: erroUnidades } = await admin()
    .from("unidades_ensino")
    .insert([
      {
        codigo: `UE-${s}-REG`,
        disciplina_id: disciplina(`DIS-${s}-REG`)?.id,
        curso_id: id(semeado.cursoRegular),
        numero_ue: 1,
        topico: "Unidade de percurso (regular)",
        ch_prevista_tempos: 10,
      },
      {
        codigo: `UE-${s}-EXP`,
        disciplina_id: disciplina(`DIS-${s}-EXP`)?.id,
        curso_id: id(semeado.cursoExpedito),
        numero_ue: 1,
        topico: "Unidade de percurso (expedito)",
        ch_prevista_tempos: 50,
      },
      {
        codigo: `UE-${s}-CAP`,
        disciplina_id: disciplina(`DIS-${s}-CAP`)?.id,
        curso_id: id(semeado.cursoSemCapacidade),
        numero_ue: 1,
        topico: "Unidade de percurso (sem capacidade)",
        ch_prevista_tempos: 100,
      },
    ])
    .select("id, codigo");
  if (erroUnidades) throw new Error(`falha ao semear unidades: ${erroUnidades.message}`);

  const unidade = (codigo: string) => unidades?.find((u) => u.codigo === codigo)?.id;

  const { data: turmas, error: erroTurmas } = await admin()
    .from("turmas")
    .insert([
      /*
       * ⚠️ **A DATA DE TÉRMINO PASSOU A SER OBRIGATÓRIA NESTA SEMENTE, porque é dela que sai a
       *    CAPACIDADE.** Turma sem término não tem intervalo, e o andamento sai `sem_termino` — sem
       *    veredito de atraso nenhum (`FR-026.1`). Antes de 04/10/2026 as duas turmas nasciam sem
       *    término e o painel ainda dizia *"em atraso"*: é a prova de que ele não lia a data.
       */
      {
        codigo: semeado.turmaEmExcesso,
        curso_id: id(semeado.cursoRegular),
        ano_letivo: 2026,
        status: "ativa",
        modalidade: "presencial",
        data_inicio: "2026-03-02",
        data_termino: semeado.terminoFolgado,
      },
      {
        codigo: semeado.turmaEmDia,
        curso_id: id(semeado.cursoExpedito),
        ano_letivo: 2026,
        status: "ativa",
        modalidade: "ead",
        data_inicio: "2026-03-02",
        data_termino: semeado.terminoFolgado,
      },
      {
        codigo: semeado.turmaSemCapacidade,
        curso_id: id(semeado.cursoSemCapacidade),
        ano_letivo: 2026,
        status: "ativa",
        modalidade: "presencial",
        data_inicio: "2026-03-02",
        data_termino: semeado.terminoApertado,
      },
    ])
    .select("id, codigo, curso_id");
  if (erroTurmas) throw new Error(`falha ao semear turmas: ${erroTurmas.message}`);

  const turma = (codigo: string) => turmas?.find((t) => t.codigo === codigo);

  /*
   * ⚠️ **12 EXECUTADOS CONTRA 10 PREVISTOS É EXCESSO, E NÃO ATRASO** — ver a tabela do cabeçalho. Os
   *    três lançamentos abaixo produzem as três execuções: 12 TA na turma em excesso, 10 na EAD (de
   *    50 previstos) e 10 na apertada (de 100 previstos).
   * ⚠️ **NENHUM LANÇAMENTO PASSA DE 12 TEMPOS**, pela catraca `reg_aula_tempos_positivos`: não existe
   *    lançamento de 120 tempos, e sim vários dias de aula.
   */
  const { error: erroRegistros } = await admin()
    .from("registros_aula")
    .insert([
      {
        codigo: `REG-${s}-01`,
        data: "2026-03-02",
        turma_id: turma(semeado.turmaEmExcesso)?.id,
        curso_id: turma(semeado.turmaEmExcesso)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-REG`),
        tempos_consumidos: 6,
      },
      {
        codigo: `REG-${s}-02`,
        data: "2026-03-03",
        turma_id: turma(semeado.turmaEmExcesso)?.id,
        curso_id: turma(semeado.turmaEmExcesso)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-REG`),
        tempos_consumidos: 6,
      },
      {
        codigo: `REG-${s}-03`,
        data: "2026-03-03",
        turma_id: turma(semeado.turmaEmDia)?.id,
        curso_id: turma(semeado.turmaEmDia)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-EXP`),
        tempos_consumidos: 10,
      },
      {
        codigo: `REG-${s}-04`,
        data: "2026-03-04",
        turma_id: turma(semeado.turmaSemCapacidade)?.id,
        curso_id: turma(semeado.turmaSemCapacidade)?.curso_id,
        instrutor_id: instrutor.id,
        unidade_ensino_id: unidade(`UE-${s}-CAP`),
        tempos_consumidos: 10,
      },
    ]);
  if (erroRegistros) throw new Error(`falha ao semear registros: ${erroRegistros.message}`);

  return semeado;
}

/**
 * Remove o que foi semeado.
 *
 * ⚠️ **ELE APAGA DE VERDADE, E ISSO NÃO CONTRARIA A REGRA 4 DO BRIEF.** "Nada é apagado" é regra de
 * **negócio**, sobre dado do sistema; isto é dado de teste, criado e destruído pela `service_role`
 * no stack local. Deixá-lo para trás contaminaria a próxima execução.
 */
export async function limparPanorama(semeado: PanoramaSemeado | undefined): Promise<void> {
  if (!semeado) return;
  /*
   * ⚠️ **A SIGLA ANTIGA ENTRA NA LIMPEZA, E NÃO NA SEMEADURA.** `CUR-…-EXP` foi o código do curso EAD
   *    até 04/10/2026; numa máquina que rodou a versão anterior há turma, disciplina e lançamento
   *    pendurados nele, e a turma velha apareceria no panorama ao lado das três novas. O curso em si
   *    **fica** — ele não é apagável (regra 9.1) —, e vazio ele é inerte.
   */
  const codigos = [
    semeado.cursoRegular,
    semeado.cursoExpedito,
    semeado.cursoSemCapacidade,
    semeado.cursoExpedito.replace("-EAD", "-EXP"),
  ];
  const { data: cursos } = await admin().from("cursos").select("id").in("codigo", codigos);
  const ids = (cursos ?? []).map((c) => c.id);

  if (ids.length > 0) {
    await admin().from("registros_aula").delete().in("curso_id", ids);
    /*
     * ⚠️ `turma_disciplina` SAI ANTES DE `turmas` (spec 009, T017 / A-2). A partir da migration 4
     * daquela fatia toda turma nasce com uma linha por disciplina ativa do curso, e a FK
     * `turma_disciplina.turma_id` é `on delete restrict`: apagar a turma primeiro passaria a falhar
     * — em silêncio, porque esta limpeza não confere erro —, e a execução seguinte encontraria a
     * amostra anterior de pé.
     */
    const { data: turmasDoCurso } = await admin().from("turmas").select("id").in("curso_id", ids);
    const idsDeTurma = (turmasDoCurso ?? []).map((t) => t.id);
    if (idsDeTurma.length > 0) {
      await admin().from("turma_disciplina").delete().in("turma_id", idsDeTurma);
    }
    await admin().from("turmas").delete().in("curso_id", ids);
    await admin().from("unidades_ensino").delete().in("curso_id", ids);
    await admin().from("disciplinas").delete().in("curso_id", ids);
    // ⚠️ O CURSO FICA — ver a nota da semeadura: a vigência não é apagável, e a FK é `restrict`.
    // (antes: `await admin().from("cursos").delete().in("id", ids);`)
  }

  const sufixo = semeado.cursoRegular.replace("CUR-", "").replace("-REG", "");
  await admin().from("instrutores").delete().eq("codigo", `INS-${sufixo}`);
}

/**
 * O dado mínimo para a semana do DSA ter o que mostrar — **semeado por processo de trabalho**.
 *
 * ⚠️ **CADA TURMA DAQUI EXISTE PARA UM CASO DA TELA, e nenhuma é "mais uma".** Uma amostra em que
 * tudo dá certo não distingue a implementação certa da que nunca degrada:
 *
 * | Turma | Para quê |
 * |---|---|
 * | `turmaComRelogio` | a grade normal, com a **G45 real** (TA de 45 min às 07:50, 5 de manhã) |
 * | `turmaComVigenciaNova` | duas vigências: a semana de **maio** usa o relógio de maio e a de
 *   **julho** usa o novo — é a `RN-2027-09` observável nos dois sentidos (critério 4) |
 * | `turmaSemRelogio` | curso **sem vigência** que cubra a semana: a grade sai com TA numerados |
 * | `turmaEad` | EAD puro — a tela diz que o DSA não se aplica (`Q-13`) |
 *
 * ⚠️ **E OS LANÇAMENTOS COBREM OS TRÊS ESTADOS QUE A FAIXA «SEM POSIÇÃO» EXISTE PARA MOSTRAR:** um
 * bloco que **atravessa o almoço** (4 TA a partir do 3º, `SC-011`), uma aula **sem TA** como as
 * 1.566 do ETL, e uma **avaliação herdada no TA 1** — a sentinela da carga, que a `Q-12` manda
 * tratar como *sem posição* enquanto a avaliação **nova** no TA 1 fica na grade (`SC-017`).
 *
 * ⚠️ **OS FERIADOS SÃO OS TRÊS IMPACTOS, na mesma semana**: `dia_inteiro` bloqueia a quarta,
 * `parcial` e `informativo` só avisam (`RN-EVT-02`) — e é a `parcial` que pega a implementação que
 * desconta o que não deve, porque o comentário do catálogo dizia que ela reduzia.
 *
 * ⚠️ **AS DATAS SÃO FIXAS EM 2026, e aqui isso é CERTO, ao contrário da semente do panorama.** O
 * veredito desta tela não depende de quantos dias faltam: ela mostra **a semana que a URL pede**.
 * Datas relativas a hoje fariam a semana do caso mudar a cada execução, e o `?semana=` do percurso
 * teria de ser calculado — trocando um número conferível por uma conta.
 *
 * ⚠️ **IDEMPOTENTE, e provada rodando DUAS VEZES SEGUIDAS** (regra 9.1): curso não é apagável, a
 * semente o reaproveita, e os identificadores de lançamento carregam o número do processo.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { chaveLocal } from "./conta-de-teste";
import { sessaoDe } from "./curso-de-teste";

let cliente: SupabaseClient | undefined;
const admin = (): SupabaseClient =>
  (cliente ??= createClient(chaveLocal("API_URL"), chaveLocal("SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

/**
 * A semana ISO de referência: **2026-W15**, de 06/04 a 12/04 de 2026.
 *
 * ⚠️ Escolhida por ser uma segunda-feira limpa no calendário de 2026 e por estar **longe** da
 * virada do ano, que tem percurso próprio.
 */
export const SEMANA = 15;
export const ANO = 2026;
export const SEGUNDA = "2026-04-06";
export const TERCA = "2026-04-07";
export const QUARTA = "2026-04-08";
export const QUINTA = "2026-04-09";
export const SABADO = "2026-04-11";

/** A semana de maio e a de julho, para ver as duas vigências (`RN-2027-09`). */
/** O tipo de avaliação da amostra, e a marca que distingue a linha da suíte da do ETL. */
export const TIPO_DE_AVALIACAO = "Prova Escrita";
const MARCA_DA_SEMENTE = "semeado pela suite do DSA";

/**
 * Os nomes de guerra das duas vigências de assinatura — é por eles que o critério 3 se observa.
 *
 * ⚠️ **ELES SÃO «ABRIL» E «JULHO» DE PROPÓSITO:** a semana `SEMANA` (15) cai em abril e resolve
 * pela primeira vigência; a `SEMANA_DE_JULHO` (28) resolve pela segunda. Um nome genérico faria o
 * caso passar sem que se pudesse ler, na saída, **qual** vigência venceu.
 */
export const ASSINANTE_DE_ABRIL = "ABRIL";
export const ASSINANTE_DE_JULHO = "JULHO";
export const ASSINANTE_ENCARREGADO = "ENCARREGADO";

export const SEMANA_DE_MAIO = 20;
export const SEMANA_DE_JULHO = 28;

export type DsaSemeado = {
  readonly cursoComRelogio: string;
  readonly cursoComVigenciaNova: string;
  readonly cursoSemRelogio: string;
  readonly cursoEad: string;
  readonly turmaComRelogio: string;
  readonly turmaComVigenciaNova: string;
  readonly turmaSemRelogio: string;
  readonly turmaEad: string;
  readonly sala: string;
  /** A disciplina comum, com unidade — o caminho normal do lançamento. */
  readonly codDisciplina: string;
  /** ⚠️ A disciplina **sem unidades**: é ela que faz o modo da `Q-1` aparecer. */
  readonly codDisciplinaIsenta: string;
  /** ⚠️ A de **TFM**: o único teto RÍGIDO do épico (`RN-DIST-03` (a)). */
  readonly codDisciplinaTfm: string;
  /** Quem TEM vínculo em `instrutor_disciplina` — o controle positivo da habilitação. */
  readonly nomeHabilitado: string;
  /** ⚠️ Quem **NÃO** tem vínculo: o negativo da `RN-INST-01`, que só a Server Action barra. */
  readonly nomeSemHabilitacao: string;
};

export async function semearDsa(processo: number, emailOperador: string): Promise<DsaSemeado> {
  const s = `E2D${processo}`;
  const semeado: DsaSemeado = {
    cursoComRelogio: `CUR-${s}-REL`,
    cursoComVigenciaNova: `CUR-${s}-VIG`,
    cursoSemRelogio: `CUR-${s}-SEM`,
    cursoEad: `CUR-${s}-EAD`,
    turmaComRelogio: `CUR-${s}-REL 2026`,
    turmaComVigenciaNova: `CUR-${s}-VIG 2026`,
    turmaSemRelogio: `CUR-${s}-SEM 2026`,
    turmaEad: `CUR-${s}-EAD 2026`,
    /*
     * ⚠️ **A SALA SAI DA LISTA QUE O SCHEMA SEMEIA, e não é um nome inventado.** `turmas.sala_alocada`
     * tem gatilho que a valida contra `config_listas.salas` — um `"SALA 3"` escrito à mão é recusado
     * com *"o valor não pertence à lista"* (medido). As oito salas reais são semeadas por migration,
     * então existem na base recriada **e** na carregada.
     */
    sala: "Sala 03",
    codDisciplina: `D${processo}`,
    codDisciplinaIsenta: `I${processo}`,
    codDisciplinaTfm: `T${processo}`,
    nomeHabilitado: "Silva Do Percurso Do Dsa",
    nomeSemHabilitacao: "Sem Vinculo Do Percurso",
  };

  await limparDsa(semeado);

  /*
   * ⚠️ **O VOCABULÁRIO DE AVALIAÇÃO É SEMEADO, e isso foi descoberto por um erro que a semente
   * engolia.** `avaliacoes.tipo_avaliacao` tem gatilho que a valida contra
   * `config_listas.tipos_avaliacao`, e essa lista nasce **VAZIA** na base recriada — quem a povoa é
   * o ETL. Sem esta linha o `upsert` falha com *"o valor não pertence à lista"*, e enquanto a
   * semente descartava o erro o percurso acusava **a regra da `Q-12`** em vez da linha que faltava.
   * ⚠️ A marca em `observacao` é o que permite a limpeza distinguir esta linha da do ETL: o valor
   * `Prova Escrita` é REAL (67 usos medidos na origem), e apagá-lo por valor removeria dado.
   */
  const { error: erroLista } = await admin().from("config_listas").upsert(
    {
      lista: "tipos_avaliacao",
      valor: TIPO_DE_AVALIACAO,
      rotulo_exibicao: TIPO_DE_AVALIACAO,
      ordem: 910,
      ativo: true,
      observacao: MARCA_DA_SEMENTE,
    },
    { onConflict: "lista,valor", ignoreDuplicates: true },
  );
  if (erroLista) throw new Error(`falha ao semear tipos_avaliacao: ${erroLista.message}`);

  /*
   * ⚠️ **CURSO NASCE PELA RPC, SEMPRE** (spec 009): um `insert into cursos` solto é recusado no
   * COMMIT pelo gatilho adiado, com a chave `curso_sem_regime`. E curso **não se apaga** (regra
   * 9.1), então a semente reaproveita o que existe — é o que a torna idempotente.
   */
  const cursos = [
    {
      codigo: semeado.cursoComRelogio,
      nome: `Curso com relógio ${processo}`,
      modalidade: "presencial",
      /* A G45 REAL: 45 min, intervalo de 5, começando às 07:50 — cinco TA de manhã. */
      regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 5,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "07:50",
        hora_inicio_tarde: "13:05",
        vigente_de: "2020-01-01",
      },
    },
    {
      codigo: semeado.cursoComVigenciaNova,
      nome: `Curso com vigência nova ${processo}`,
      modalidade: "presencial",
      /* A vigência ANTIGA, que vale até 31/05 — ver a segunda, acrescentada abaixo. */
      regime: {
        regime_tempos: 8,
        ta_duracao_min: 50,
        intervalo_manha_min: 10,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "08:10",
        hora_inicio_tarde: "13:05",
        vigente_de: "2020-01-01",
      },
    },
    {
      codigo: semeado.cursoEad,
      nome: `Curso EAD ${processo}`,
      modalidade: "ead",
      regime: {
        regime_tempos: 0,
        ta_duracao_min: 0,
        intervalo_manha_min: 0,
        intervalo_tarde_min: 0,
        hora_inicio_manha: null,
        hora_inicio_tarde: null,
        limite_diario_ead_horas: 4,
        vigente_de: "2020-01-01",
      },
    },
    {
      codigo: semeado.cursoSemRelogio,
      nome: `Curso sem relógio na semana ${processo}`,
      modalidade: "presencial",
      /*
       * ⚠️ **A VIGÊNCIA COMEÇA EM 2027, e é isso que produz o caso.** O banco EXIGE que todo curso
       * tenha regime (`curso_sem_regime`), então "curso sem regime" não é um estado alcançável —
       * o estado alcançável, e real, é **nenhuma vigência cobrir a semana pedida**. A grade então
       * sai com os TA numerados, sem horário, que é a degradação da `RN-DEG-01`.
       */
      regime: {
        regime_tempos: 8,
        ta_duracao_min: 45,
        intervalo_manha_min: 5,
        intervalo_tarde_min: 5,
        hora_inicio_manha: "07:50",
        hora_inicio_tarde: "13:05",
        vigente_de: "2027-01-01",
      },
    },
  ];

  for (const c of cursos) {
    const { data: existe } = await admin()
      .from("cursos")
      .select("id")
      .eq("codigo", c.codigo)
      .maybeSingle();
    if (existe) continue;
    const { error } = await admin().rpc("criar_curso_com_regime", {
      p_curso: {
        codigo: c.codigo,
        nome_curso: c.nome,
        classificacao: "regular",
        modalidade: c.modalidade,
        duracao_dias: 60,
      },
      p_regime: c.regime,
    });
    if (error) throw new Error(`falha ao criar o curso ${c.codigo}: ${error.message}`);
  }

  const idDoCurso = new Map<string, string>();
  for (const c of cursos) {
    const { data } = await admin().from("cursos").select("id").eq("codigo", c.codigo).maybeSingle();
    if (!data) throw new Error(`curso ${c.codigo} não nasceu`);
    idDoCurso.set(c.codigo, (data as { id: string }).id);
  }

  /*
   * A SEGUNDA vigência do curso de vigência nova: a partir de 01/06/2026, com relógio DIFERENTE.
   *
   * ⚠️ **É ela que torna a `RN-2027-09` observável.** A semana de maio tem de sair com 08:10 e a de
   * julho com 07:30 — medir só uma das duas não distingue "resolve pela data" de "pega a última".
   * ⚠️ `registrar_vigencia_regime` é o caminho: `curso_regime_historico` é append-only e tem
   * `EXCLUDE` de sobreposição, e a RPC fecha a anterior em vez de colidir com ela.
   */
  const cursoVigId = idDoCurso.get(semeado.cursoComVigenciaNova);
  if (cursoVigId) {
    const { data: ativas } = await admin()
      .from("curso_regime_historico")
      .select("id")
      .eq("curso_id", cursoVigId)
      .eq("tipo_regime", "padrao")
      .eq("status", "ativo");
    if ((ativas ?? []).length < 2) {
      /*
       * ⚠️ **A SUCESSORA ENTRA PELA RPC, COM SESSÃO AUTENTICADA — e as duas tentativas anteriores
       * falharam por motivos diferentes, os dois medidos em 05/10/2026.**
       *
       * 1. **Pela chave de serviço, a RPC falha**: `public.registrar_vigencia_regime` é
       *    `SECURITY INVOKER` e chama `app.travar_curso_para_correcao`, e a `service_role` **não tem
       *    `usage` no schema `app`** → `permission denied for schema app`. Não é defeito da RPC: ela
       *    é feita para a sessão da tela.
       * 2. **`UPDATE` + `INSERT` soltos também falham**, e a mensagem explica por quê:
       *    *"Vigencia encerrada sem sucessora: o curso ficaria sem regime a partir de 2026-06-01"*.
       *    O gatilho de encadeamento é **DEFERRABLE INITIALLY DEFERRED**, e **cada requisição do
       *    PostgREST é uma transação própria** — fechar a anterior commita sozinho, sem a sucessora.
       *    As duas escritas têm de ser **uma** transação, que é exatamente o que a RPC faz.
       *
       * ⚠️ **E O PERFIL CERTO É O OPERADOR**: a escrita de vigência pede `horarios.criar`, e ele é o
       * único perfil que a tem **sem** ter `cursos.editar` — é o caso que discrimina registrado no
       * DoD 8 do `CLAUDE.md`. Semear pelo mesmo caminho da tela é o que torna a amostra fiel.
       */
      const sessao = await sessaoDe(emailOperador);
      const { error } = await sessao.rpc("registrar_vigencia_regime", {
        p_curso_id: cursoVigId,
        p_vigencia: {
          tipo_regime: "padrao",
          regime_tempos: 8,
          ta_duracao_min: 45,
          intervalo_manha_min: 5,
          intervalo_tarde_min: 5,
          hora_inicio_manha: "07:30",
          hora_inicio_tarde: "13:00",
          vigente_de: "2026-06-01",
          motivo: "Semente do percurso do DSA: a vigência nova de junho",
        },
      });
      if (error) throw new Error(`falha ao registrar a vigência nova: ${error.message}`);
    }
  }

  /* As quatro turmas. */
  const turmas: readonly {
    readonly codigo: string;
    readonly curso: string;
    readonly modalidade: string;
  }[] = [
    { codigo: semeado.turmaComRelogio, curso: semeado.cursoComRelogio, modalidade: "presencial" },
    {
      codigo: semeado.turmaComVigenciaNova,
      curso: semeado.cursoComVigenciaNova,
      modalidade: "presencial",
    },
    { codigo: semeado.turmaSemRelogio, curso: semeado.cursoSemRelogio, modalidade: "presencial" },
    { codigo: semeado.turmaEad, curso: semeado.cursoEad, modalidade: "ead" },
  ];
  const idDaTurma = new Map<string, string>();
  for (const t of turmas) {
    const cursoId = idDoCurso.get(t.curso);
    if (!cursoId) continue;
    const { data: existe } = await admin()
      .from("turmas")
      .select("id")
      .eq("codigo", t.codigo)
      .maybeSingle();
    if (existe) {
      idDaTurma.set(t.codigo, (existe as { id: string }).id);
      continue;
    }
    const { data, error } = await admin()
      .from("turmas")
      .insert({
        curso_id: cursoId,
        ano_letivo: 2026,
        status: "ativa",
        modalidade: t.modalidade,
        data_inicio: "2026-01-05",
        data_termino: "2026-12-18",
        sala_alocada: semeado.sala,
        alunos: 12,
      })
      .select("id")
      .single();
    if (error) throw new Error(`falha ao criar a turma ${t.codigo}: ${error.message}`);
    idDaTurma.set(t.codigo, (data as { id: string }).id);
  }

  const turmaId = idDaTurma.get(semeado.turmaComRelogio);
  const cursoId = idDoCurso.get(semeado.cursoComRelogio);
  if (!turmaId || !cursoId) throw new Error("a turma com relógio não nasceu");

  /* Uma disciplina com UE, para os lançamentos terem de onde sair. */
  const codDisciplina = semeado.codDisciplina;
  let disciplinaId = "";
  let ueId = "";
  {
    const { data: existe } = await admin()
      .from("disciplinas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("cod_disciplina", codDisciplina)
      .maybeSingle();
    if (existe) {
      disciplinaId = (existe as { id: string }).id;
    } else {
      const { data, error } = await admin()
        .from("disciplinas")
        .insert({
          codigo: `DSA-${s}-DIS`,
          curso_id: cursoId,
          cod_disciplina: codDisciplina,
          nome_disciplina: "Disciplina do percurso do DSA",
          carga_horaria_tempos: 40,
        })
        .select("id")
        .single();
      if (error) throw new Error(`falha ao criar a disciplina: ${error.message}`);
      disciplinaId = (data as { id: string }).id;
    }
    const { data: ue } = await admin()
      .from("unidades_ensino")
      .select("id")
      .eq("disciplina_id", disciplinaId)
      .eq("numero_ue", 1)
      .maybeSingle();
    if (ue) {
      ueId = (ue as { id: string }).id;
    } else {
      const { data, error } = await admin()
        .from("unidades_ensino")
        .insert({
          /*
           * ⚠️ O `codigo` VAI EXPLÍCITO: o `DEFAULT` da coluna chama `app.proximo_codigo_ue()`, e a
           * `service_role` **não tem `usage` no schema `app`** (medido) — o `DEFAULT` é avaliado com
           * os direitos de quem insere, mesmo sendo a função `SECURITY DEFINER` (gotcha 5.1).
           */
          codigo: `DSA-${s}-UE1`,
          disciplina_id: disciplinaId,
          curso_id: cursoId,
          numero_ue: 1,
          topico: "Navegação costeira",
          ch_prevista_tempos: 20,
        })
        .select("id")
        .single();
      if (error) throw new Error(`falha ao criar a UE: ${error.message}`);
      ueId = (data as { id: string }).id;
    }
  }

  let instrutorId = "";
  {
    const { data: existe } = await admin()
      .from("instrutores")
      .select("id")
      .eq("codigo", `DSA-${s}-INS`)
      .maybeSingle();
    if (existe) {
      instrutorId = (existe as { id: string }).id;
    } else {
      const { data, error } = await admin()
        .from("instrutores")
        .insert({
          codigo: `DSA-${s}-INS`,
          posto_graduacao: "1ºTEN",
          esp_hab_obs: "-EF",
          nome_completo: "Silva Do Percurso Do Dsa",
          categoria: "Militar",
          om: "CIAARA",
        })
        .select("id")
        .single();
      if (error) throw new Error(`falha ao criar o instrutor: ${error.message}`);
      instrutorId = (data as { id: string }).id;
    }
  }

  /*
   * ⚠️ **O SEGUNDO INSTRUTOR EXISTE PARA O NEGATIVO DA `RN-INST-01`**: ele é ativo, aparece no
   * seletor, e **não tem linha em `instrutor_disciplina`**. Medido em 05/10/2026: o banco **não
   * recusa** um instrutor não habilitado — não há FK nem gatilho —, então a Server Action é a
   * ÚNICA defesa, e sem este instrutor não há como provar que ela defende.
   */
  let semVinculoId = "";
  {
    const { data: existe } = await admin()
      .from("instrutores")
      .select("id")
      .eq("codigo", `DSA-${s}-SEMV`)
      .maybeSingle();
    if (existe) {
      semVinculoId = (existe as { id: string }).id;
    } else {
      const { data, error } = await admin()
        .from("instrutores")
        .insert({
          codigo: `DSA-${s}-SEMV`,
          posto_graduacao: "CT",
          esp_hab_obs: "-EF",
          nome_completo: semeado.nomeSemHabilitacao,
          categoria: "Militar",
          om: "CIAARA",
        })
        .select("id")
        .single();
      if (error) throw new Error(`falha ao criar o instrutor sem vínculo: ${error.message}`);
      semVinculoId = (data as { id: string }).id;
    }
  }

  /* O VÍNCULO do primeiro — o controle positivo da habilitação. */
  {
    const { data: existe } = await admin()
      .from("instrutor_disciplina")
      .select("id")
      .eq("instrutor_id", instrutorId)
      .eq("disciplina_id", disciplinaId)
      .maybeSingle();
    if (!existe) {
      const { error } = await admin()
        .from("instrutor_disciplina")
        .insert({
          codigo: `DSA-${s}-VIN`,
          instrutor_id: instrutorId,
          disciplina_id: disciplinaId,
          modo_atribuicao: "dividido",
        });
      if (error) throw new Error(`falha ao vincular o instrutor: ${error.message}`);
    }
  }

  /*
   * A disciplina **ISENTA** (`sem_unidades_ensino`) e a de **TFM**.
   *
   * ⚠️ A isenta é o que faz o modo *"Aula sem unidade"* aparecer: a tela só o oferece onde
   * `app.disciplina_sem_ue` vale, e oferecê-lo sempre faria o banco recusar com `23514`.
   * ⚠️ A de TFM existe para o **único bloqueio** do épico: o nome casa com o marcador `tfm` que
   * `lib/dominio/dsa/tetos.ts` normaliza sem acento.
   */
  for (const d of [
    { cod: semeado.codDisciplinaIsenta, nome: "Disciplina sem unidades do percurso", isenta: true },
    { cod: semeado.codDisciplinaTfm, nome: "TFM do percurso", isenta: false },
  ]) {
    const { data: existe } = await admin()
      .from("disciplinas")
      .select("id")
      .eq("curso_id", cursoId)
      .eq("cod_disciplina", d.cod)
      .maybeSingle();
    let id = (existe as { id: string } | null)?.id ?? "";
    if (id === "") {
      const { data, error } = await admin()
        .from("disciplinas")
        .insert({
          codigo: `DSA-${s}-${d.cod}`,
          curso_id: cursoId,
          cod_disciplina: d.cod,
          nome_disciplina: d.nome,
          carga_horaria_tempos: 40,
          sem_unidades_ensino: d.isenta,
        })
        .select("id")
        .single();
      if (error) throw new Error(`falha ao criar a disciplina ${d.cod}: ${error.message}`);
      id = (data as { id: string }).id;
    }
    /* As duas recebem vínculo do primeiro instrutor, senão o lançamento nelas seria barrado. */
    const { data: temVinculo } = await admin()
      .from("instrutor_disciplina")
      .select("id")
      .eq("instrutor_id", instrutorId)
      .eq("disciplina_id", id)
      .maybeSingle();
    if (!temVinculo) {
      await admin()
        .from("instrutor_disciplina")
        .insert({
          codigo: `DSA-${s}-VIN-${d.cod}`,
          instrutor_id: instrutorId,
          disciplina_id: id,
          modo_atribuicao: "dividido",
        });
    }
    /* A de TFM precisa de uma unidade, para o lançamento normal poder apontar para ela. */
    if (!d.isenta) {
      const { data: ue } = await admin()
        .from("unidades_ensino")
        .select("id")
        .eq("disciplina_id", id)
        .eq("numero_ue", 1)
        .maybeSingle();
      if (!ue) {
        await admin()
          .from("unidades_ensino")
          .insert({
            codigo: `DSA-${s}-UE-${d.cod}`,
            disciplina_id: id,
            curso_id: cursoId,
            numero_ue: 1,
            topico: "Treinamento físico",
            ch_prevista_tempos: 20,
          });
      }
    }
  }
  void semVinculoId;

  /*
   * OS LANÇAMENTOS. ⚠️ `ta_final` **não** é escrita: ela é `GENERATED ALWAYS`, e o banco recusa
   * valor nela com `428C9` — medido ao escrever o pgTAP do PR B.
   */
  const aulas = [
    /* O bloco que ATRAVESSA O ALMOÇO: 4 TA a partir do 3º, com a G45 (`SC-011`). */
    {
      codigo: `DSA-${s}-A1`,
      data: SEGUNDA,
      ta_inicial: 3,
      tempos_consumidos: 4,
      conteudo_resumo: "Bloco que atravessa o almoço",
      local: semeado.sala,
    },
    /* Um bloco em LOCAL DIFERENTE da sala da turma — tem de sair destacado (`FR-006`). */
    {
      codigo: `DSA-${s}-A2`,
      data: TERCA,
      ta_inicial: 1,
      tempos_consumidos: 2,
      conteudo_resumo: "Aula no laboratório",
      local: "Laboratório de Informática",
    },
    /* Um lançamento no SÁBADO: a coluna aparece mesmo sem `?sabado=sim` (`Q-4`). */
    {
      codigo: `DSA-${s}-A3`,
      data: SABADO,
      ta_inicial: 1,
      tempos_consumidos: 2,
      conteudo_resumo: "Aula de sábado",
      local: semeado.sala,
    },
    /* Uma aula gravada no dia do feriado de DIA INTEIRO: ela continua VISÍVEL. */
    {
      codigo: `DSA-${s}-A4`,
      data: QUARTA,
      ta_inicial: 1,
      tempos_consumidos: 1,
      conteudo_resumo: "Aula no dia do feriado",
      local: semeado.sala,
    },
  ];
  /*
   * ⚠️ **TODO `upsert` DAQUI CONFERE O ERRO, e a primeira versão NÃO conferia.** O resultado foi o
   * modo de falha que esta base já registrou duas vezes: *"erro descartado é pior que erro bruto —
   * ele não esconde a causa, ele INVENTA outra"*. As avaliações não entravam, e o percurso acusava
   * *"a avaliação herdada não caiu na faixa"*, mandando procurar a regra da `Q-12` quando o que
   * faltava era a linha no banco.
   */
  for (const a of aulas) {
    const { error } = await admin()
      .from("registros_aula")
      .upsert(
        {
          ...a,
          turma_id: turmaId,
          curso_id: cursoId,
          unidade_ensino_id: ueId,
          instrutor_id: instrutorId,
          metodologia: null,
        },
        { onConflict: "codigo" },
      );
    if (error) throw new Error(`falha ao lançar ${a.codigo}: ${error.message}`);
  }

  /*
   * ⚠️ **A AULA SEM TA — o estado das 1.566 do ETL.** A catraca
   * `reg_aula_ue_so_nula_no_historico` aceita UE nula só em linha histórica; aqui a UE **está**
   * preenchida, e o que falta é a POSIÇÃO: `ta_inicial` e `tempos_consumidos` nulos, que o
   * `ativ_tempos_so_nulo_no_historico` irmão só permite com procedência. Por isso ela leva
   * `origem_migracao_v1` — é literalmente o estado que a carga produziu.
   */
  const { error: erroSemTa } = await admin()
    .from("registros_aula")
    .upsert(
      {
        codigo: `DSA-${s}-SEMTA`,
        data: QUINTA,
        turma_id: turmaId,
        curso_id: cursoId,
        unidade_ensino_id: ueId,
        instrutor_id: instrutorId,
        ta_inicial: null,
        tempos_consumidos: null,
        conteudo_resumo: "Lançamento migrado, sem posição",
        origem_migracao_v1: `Semente_DSA:${s}:SEMTA`,
      },
      { onConflict: "codigo" },
    );
  if (erroSemTa) throw new Error(`falha ao lançar a aula sem TA: ${erroSemTa.message}`);

  /*
   * ⚠️ **AS DUAS AVALIAÇÕES NO TA 1 — o caso que discrimina a `Q-12` (`SC-017`).** A HERDADA tem
   * procedência de ETL e `editado_em` nulo, e o `ta_inicial = 1` dela é **sentinela da carga**, não
   * posição: ela vai para a faixa. A NOVA, no mesmo TA 1 de outro dia, fica na grade. Medir só uma
   * das duas não distingue "trata herdado" de "esconde tudo no TA 1".
   */
  for (const av of [
    {
      codigo: `DSA-${s}-AVHERD`,
      data_avaliacao: TERCA,
      herdada: true,
    },
    {
      codigo: `DSA-${s}-AVNOVA`,
      data_avaliacao: QUINTA,
      herdada: false,
    },
  ]) {
    const { error: erroAv } = await admin()
      .from("avaliacoes")
      .upsert(
        {
          codigo: av.codigo,
          turma_id: turmaId,
          curso_id: cursoId,
          disciplina_id: disciplinaId,
          tipo_avaliacao: TIPO_DE_AVALIACAO,
          data_avaliacao: av.data_avaliacao,
          ta_inicial: 1,
          tempos_consumidos: 2,
          instrutor_responsavel_id: instrutorId,
          local: semeado.sala,
          ...(av.herdada ? { origem_migracao_v1: `Semente_DSA:${s}:${av.codigo}` } : {}),
        },
        { onConflict: "codigo" },
      );
    if (erroAv) throw new Error(`falha ao criar a avaliação ${av.codigo}: ${erroAv.message}`);
  }

  /* Os TRÊS impactos de feriado, na mesma semana (`RN-EVT-02`). */
  for (const f of [
    { data: QUARTA, descricao: `Feriado de dia inteiro ${s}`, impacto: "dia_inteiro" },
    { data: QUINTA, descricao: `Ponto facultativo ${s}`, impacto: "parcial" },
    { data: TERCA, descricao: `Aniversário da OM ${s}`, impacto: "informativo" },
  ]) {
    const { error: erroFer } = await admin()
      .from("feriados")
      .upsert(
        {
          codigo: `DSA-${s}-${f.impacto}`,
          ano: 2026,
          data: f.data,
          descricao: f.descricao,
          impacto: f.impacto,
          abrangencia: "nacional",
        },
        { onConflict: "codigo" },
      );
    if (erroFer) throw new Error(`falha ao criar o feriado ${f.impacto}: ${erroFer.message}`);
  }

  /*
   * ⚠️ **AS DUAS VIGÊNCIAS DE ASSINATURA — e sem elas o critério 3 NÃO É DEMONSTRÁVEL** (`T086`).
   *
   * > *"Reimprimir hoje um DSA de março traz quem assinava em março, não quem assina hoje."*
   * > — critério **3** do Épico 6, documento 06 da Fase 1
   *
   * ⚠️ **MEDIDO NO REMOTO EM 05/10/2026: há UMA SÓ vigência por papel**, e as duas linhas reais são
   * **GERAL** (`curso_id` nulo) — `elaborador` em modo dinâmico e `encarregado_divisao` em modo
   * fixo. Com uma vigência só, **qualquer** semana resolve para a mesma pessoa: o caso de abril e o
   * de julho dariam o **mesmo veredito antes e depois** de a resolução por data existir, que é
   * exatamente o que o DoD 8 proíbe chamar de teste.
   *
   * ⚠️ **A LINHA DO CURSO VENCE A GERAL** (`FR-036.1`), então estas quatro linhas **substituem** as
   * duas reais na impressão desta turma, sem tocar nelas. É o mecanismo que o requisito descreve, e
   * não um atalho da suíte.
   *
   * ⚠️ **AS VIGÊNCIAS NÃO SE SOBREPÕEM, e isso é exigência do banco**: `ex_assinatura_sem_sobreposicao`
   * é uma `EXCLUDE` que **protege** a linha com `curso_id` preenchido (a nota do autor registra que
   * ela **não** protege as GERAL, porque expressão nula não conflita com ninguém). Janelas
   * sobrepostas aqui seriam recusadas com `23P01`.
   *
   * ⚠️ **O MODO É `fixo` NOS DOIS, e o `CHECK resp_fixo_tem_nominal` cobra `posto_graduacao` E
   * `nome_guerra`** — medido no catálogo. O `nome_completo` é **nulável** no banco (divergência já
   * reportada em `assinaturas.ts`), e é ele que o papel imprime: a semente manda os três.
   */
  const ASSINANTES = [
    {
      sufixo: "ELAB-1",
      papel_assinatura: "elaborador",
      vigente_de: "2026-01-01",
      vigente_ate: "2026-05-31",
      posto_graduacao: "1ºTEN",
      nome_guerra: "ABRIL",
      nome_completo: `ANTONIO DE ABRIL ${s}`,
      funcao_descricao: "Auxiliar da Div. de Adm. Academica",
    },
    {
      sufixo: "ELAB-2",
      papel_assinatura: "elaborador",
      vigente_de: "2026-06-01",
      vigente_ate: null,
      posto_graduacao: "CT",
      nome_guerra: "JULHO",
      nome_completo: `JOAQUIM DE JULHO ${s}`,
      funcao_descricao: "Auxiliar da Div. de Adm. Academica",
    },
    {
      sufixo: "ENC-1",
      papel_assinatura: "encarregado_divisao",
      vigente_de: "2026-01-01",
      vigente_ate: null,
      posto_graduacao: "CC",
      nome_guerra: "ENCARREGADO",
      nome_completo: `ERNESTO ENCARREGADO ${s}`,
      funcao_descricao: "Encarregado da Div. de Adm. Academica",
    },
  ] as const;

  for (const a of ASSINANTES) {
    const { error: erroResp } = await admin()
      .from("responsaveis_curso")
      .upsert(
        {
          /* ⚠️ `codigo` é obrigatório e **sem `DEFAULT`** nesta tabela — medido no tipo gerado. */
          codigo: `DSA-${s}-${a.sufixo}`,
          curso_id: cursoId,
          papel_assinatura: a.papel_assinatura,
          preenchimento: "fixo",
          vigente_de: a.vigente_de,
          vigente_ate: a.vigente_ate,
          exibir_no_dsa: true,
          ordem: 1,
          posto_graduacao: a.posto_graduacao,
          nome_guerra: a.nome_guerra,
          nome_completo: a.nome_completo,
          funcao_descricao: a.funcao_descricao,
        },
        { onConflict: "codigo" },
      );
    if (erroResp) {
      throw new Error(`falha ao criar o responsavel ${a.sufixo}: ${erroResp.message}`);
    }
  }

  return semeado;
}

/** Deixa a base no estado inicial. Roda ANTES e DEPOIS — execução interrompida não inviabiliza a seguinte. */
export async function limparDsa(semeado: DsaSemeado | undefined): Promise<void> {
  if (!semeado) return;
  const s = semeado.turmaComRelogio
    .replace(/^CUR-/, "")
    .replace(/ 2026$/, "")
    .replace(/-REL$/, "");

  await admin().from("feriados").delete().like("codigo", `DSA-${s}-%`);
  await admin().from("responsaveis_curso").delete().like("codigo", `DSA-${s}-%`);
  /*
   * ⚠️ **O VALOR SEMEADO EM `config_listas` NÃO É APAGADO, e isso foi corrigido PELO CI.**
   *
   * `playwright.config.ts` tem `fullyParallel: true`: os casos de um arquivo se espalham pelos
   * processos, e **cinco** arquivos do DSA chamam `semearDsa`/`limparDsa`. `config_listas` é
   * **estado compartilhado por todos eles** — a lista não tem número de processo no valor, porque é
   * vocabulário do domínio, não amostra. Apagá-la no `afterAll` de um processo derrubava a semente
   * de outro **que ainda estava rodando**, com a mensagem *"O valor «Prova Escrita» não pertence à
   * lista tipos_avaliacao"* — que acusa a LISTA quando a causa é a ordem de limpeza.
   * ⚠️ **MEDIDO NO CI em 06/10/2026: duas execuções sobre o MESMO commit, uma verde e uma
   * vermelha** (runs `37395622272` e `37395617001` do PR #30) — o modo de falha que mais parece
   * azar e não é.
   * ⚠️ **É a terceira vez que esta forma aparece nesta base** (a segunda foi `rls.test.ts` apagando
   * `tipos_atividade` inteira no meio da suíte, no PR 2), e a regra que ela ensina é: **amostra
   * apaga o que carrega o número do processo; vocabulário compartilhado, não.**
   * ⚠️ **O que fica para trás é UMA linha marcada** (`observacao = MARCA_DA_SEMENTE`), e ela
   * desaparece no `db:reset` da verificação seguinte — que é como a suíte sempre começa.
   */
  await admin().from("avaliacoes").delete().like("codigo", `DSA-${s}-%`);
  await admin().from("registros_aula").delete().like("codigo", `DSA-${s}-%`);

  for (const codigo of [
    semeado.turmaComRelogio,
    semeado.turmaComVigenciaNova,
    semeado.turmaSemRelogio,
    semeado.turmaEad,
  ]) {
    const { data } = await admin().from("turmas").select("id").eq("codigo", codigo).maybeSingle();
    if (!data) continue;
    const id = (data as { id: string }).id;
    await admin().from("registros_aula").delete().eq("turma_id", id);
    await admin().from("avaliacoes").delete().eq("turma_id", id);
    await admin().from("atividades_nao_letivas").delete().eq("turma_id", id);
    await admin().from("turma_disciplina_unidade").delete().eq("turma_id", id);
    await admin().from("turma_disciplina").delete().eq("turma_id", id);
    /*
     * ⚠️ A TURMA É APAGADA, e não é zelo: `099_salas.sql` decide entre asserir e pular pela
     * pergunta `count(turmas) > 0`, e uma turma deixada atrás faz aquele arquivo ACHAR que a base
     * está carregada e reprovar com os números da base real. Turma É apagável — só curso não é.
     */
    await admin().from("turmas").delete().eq("id", id);
  }
  /*
   * ⚠️ **A VIGÊNCIA NÃO É APAGADA, E NÃO PODE SER:** `curso_regime_historico` é append-only, com
   * `DELETE` e `TRUNCATE` recusados por gatilho **inclusive para a `service_role`** (`FR-020`). É
   * por isso que a semente **pergunta** quantas vigências ativas existem antes de criar a segunda:
   * a segunda execução encontra as duas e não tenta de novo. É a mesma razão por que o curso fica.
   */
  await admin().from("instrutor_disciplina").delete().like("codigo", `DSA-${s}-%`);
  await admin().from("unidades_ensino").delete().like("codigo", `DSA-${s}-%`);
  await admin().from("disciplinas").delete().like("codigo", `DSA-${s}-%`);
  await admin().from("instrutores").delete().like("codigo", `DSA-${s}-%`);
  /* O curso FICA: o selo do processo no código impede a colisão da próxima execução (regra 9.1). */
}

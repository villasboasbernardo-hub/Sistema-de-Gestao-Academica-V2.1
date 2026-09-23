/**
 * A amostra de cursos e turmas da fatia (a) do Épico 5 — **semeada por processo de trabalho**.
 *
 * ⚠️ **CURSO NÃO É APAGÁVEL, E ISSO DECIDE O DESENHO INTEIRO** (regra 9.1 do `CLAUDE.md`).
 * `curso_regime_historico` é append-only com `DELETE` e `TRUNCATE` recusados por gatilho **inclusive
 * para a `service_role`**, e a FK `cursos` é `restrict`. Consequências:
 *
 *   1. A semeadura é **idempotente**: reaproveita o curso que já existe, e só cria o que falta.
 *   2. **Nenhum identificador é fixo.** Os `id` vêm da RPC ou de leitura; o `codigo` da turma é
 *      **gerado pelo gatilho** e lido de volta. Código fixo faz a segunda execução falhar com
 *      `23505` — que **parece recusa de permissão e não é**.
 *   3. A limpeza apaga o que pende do curso (turmas, lançamentos, disciplinas) e **deixa o curso e as
 *      vigências de pé**.
 *
 * ⚠️ **AS VIGÊNCIAS SÃO BUSCADAS, NUNCA GUARDADAS DE UMA EXECUÇÃO ANTERIOR.** O percurso da T204
 * **corrige** uma vigência: ela fica `cancelado` e nasce a sucessora. Guardar o `id` da primeira
 * faria a execução seguinte apontar para uma vigência cancelada e reprovar por um motivo que nada
 * tem a ver com o que o caso mede. O que esta amostra promete é *"a vigência `padrao` **ativa** do
 * curso X"* — e essa continua existindo depois da correção, que é justamente a regra do `FR-020`.
 *
 * ⚠️ **O CURSO DESATIVADO SAI POR SESSÃO AUTENTICADA, NUNCA PELA `service_role`** (A-4). Ela não tem
 * linha em `usuarios`, portanto não tem perfil, e `app.guardar_situacao_do_curso()` a recusa com
 * `situacao_sem_permissao` — a amostra falharia por um motivo alheio ao que ela prepara. E **não**
 * pela Server Action: `desativarCurso` só nasce adiante nesta mesma fatia.
 *
 * Origem: T110 da spec 009 · `SC-001`, `SC-001.3`, `SC-003.1`, `SC-011.1`, `SC-014`.
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
 * As cinco classificações que o catálogo agrupa (`FR-003`).
 *
 * ⚠️ `geral` e `ead_semipresencial` ficam **de fora**: a primeira é sentinela de escopo, não curso
 * (achado 4 do Épico 2), e a segunda é modalidade que virou escopo na v2.0.
 */
export const CLASSIFICACOES_SEMEADAS = [
  "regular",
  "expedito",
  "estagio_qualificacao",
  "aperfeicoamento_avancado",
  "especial",
] as const;

export type ClassificacaoSemeada = (typeof CLASSIFICACOES_SEMEADAS)[number];

export type CursosSemeados = {
  readonly processo: number;
  /** Uma sigla por classificação — as cinco do catálogo. */
  readonly porClassificacao: Readonly<Record<ClassificacaoSemeada, string>>;
  /** Duas turmas de **janelas diferentes** no mesmo curso e ano. */
  readonly turmaJanelaCedo: string;
  readonly turmaJanelaTarde: string;
  /** As duas turmas `cancelada` — o curso fica sem nenhuma turma que conte. */
  readonly turmasCanceladas: readonly string[];
  /** `ativa` com término **estritamente anterior** a hoje (`FR-028.1`). */
  readonly turmaAtivaComTerminoPassado: string;
  readonly turmaSemJanela: string;
  readonly turmaSemSala: string;
  /** A atividade de escopo **global** que trava a vigência do curso de aperfeiçoamento. */
  readonly atividadeGlobal: string;
  /** A sala acrescentada por esta amostra. */
  readonly salaDeTeste: string;
};

/** O regime `padrao` mínimo que o banco aceita — o mesmo de `panorama-de-teste.ts`. */
const REGIME_PADRAO = {
  regime_tempos: 8,
  ta_duracao_min: 45,
  intervalo_manha_min: 10,
  intervalo_tarde_min: 10,
  hora_inicio_manha: "07:30",
  hora_inicio_tarde: "13:30",
  vigente_de: "2020-01-01",
} as const;

type LinhaDeCurso = {
  readonly codigo: string;
  readonly nome_curso: string;
  readonly classificacao: ClassificacaoSemeada;
  readonly modalidade: string;
  readonly duracao_dias: number;
  readonly duracao_semanas?: number | null;
  readonly proposito?: string | null;
  readonly limite_turmas_ano?: number;
};

/** Cria o curso se ele ainda não existe, e devolve o `id` — que sempre vem de leitura. */
async function garantirCurso(linha: LinhaDeCurso): Promise<string> {
  const { data: existe } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", linha.codigo)
    .maybeSingle();

  if (!existe) {
    const { error } = await admin().rpc("criar_curso_com_regime", {
      p_curso: linha,
      p_regime: REGIME_PADRAO,
    });
    if (error) throw new Error(`falha ao semear o curso ${linha.codigo}: ${error.message}`);
  }

  const { data: curso, error: erroLeitura } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", linha.codigo)
    .single();
  if (erroLeitura) throw new Error(`nao li o curso ${linha.codigo}: ${erroLeitura.message}`);

  // ⚠️ A EXECUÇÃO ANTERIOR PODE TÊ-LO DEIXADO INATIVO — o percurso de desativação é parte da fatia.
  //    A amostra começa sempre no estado que declara.
  await admin().from("cursos").update({ status: "ativo" }).eq("id", curso.id);
  return curso.id as string;
}

type LinhaDeTurma = {
  readonly cursoId: string;
  readonly rotulo: string | null;
  readonly ano: number;
  readonly status: "planejada" | "ativa" | "concluida" | "cancelada";
  readonly modalidade: string;
  readonly inicio?: string | null;
  readonly termino?: string | null;
  readonly sala?: string | null;
  readonly alunos?: number | null;
};

/**
 * Cria a turma e devolve o **código que o banco gerou**.
 *
 * ⚠️ **O `codigo` NÃO É ENVIADO.** Ele é `sigla [rótulo] ano` carimbado por
 * `app.gerar_codigo_da_turma()` (`FR-025.1`), e o gatilho **recusa** valor divergente com
 * `codigo_de_turma_divergente`. Mandar o que se acha que ele seria é reimplementar a regra na
 * amostra — e a amostra passaria a concordar consigo mesma em vez de com o banco.
 */
async function criarTurma(t: LinhaDeTurma): Promise<string> {
  const { data, error } = await admin()
    .from("turmas")
    .insert({
      curso_id: t.cursoId,
      turma: t.rotulo,
      ano_letivo: t.ano,
      status: t.status,
      modalidade: t.modalidade,
      data_inicio: t.inicio ?? null,
      data_termino: t.termino ?? null,
      sala_alocada: t.sala ?? null,
      alunos: t.alunos ?? null,
    })
    .select("codigo")
    .single();
  if (error) throw new Error(`falha ao semear turma do curso ${t.cursoId}: ${error.message}`);
  return data.codigo as string;
}

/** Semeia a amostra inteira. `emailAdmin` precisa ser uma conta JÁ criada, com perfil que desativa curso. */
export async function semearCursos(processo: number, emailAdmin: string): Promise<CursosSemeados> {
  const s = `CT${processo}`;

  const porClassificacao: Record<ClassificacaoSemeada, string> = {
    regular: `${s}-REG`,
    expedito: `${s}-EXP`,
    estagio_qualificacao: `${s}-EST`,
    aperfeicoamento_avancado: `${s}-APA`,
    especial: `${s}-ESP`,
  };
  const salaDeTeste = `Sala de amostra ${processo}`;

  await limparCursos({
    processo,
    porClassificacao,
    turmaJanelaCedo: "",
    turmaJanelaTarde: "",
    turmasCanceladas: [],
    turmaAtivaComTerminoPassado: "",
    turmaSemJanela: "",
    turmaSemSala: "",
    atividadeGlobal: `ANL-${s}-GLOB`,
    salaDeTeste,
  });

  // ── A sala, antes das turmas: `sala_alocada` é validada contra a lista (`sala_fora_da_lista`) ──
  await admin()
    .from("config_listas")
    .upsert(
      {
        lista: "salas",
        valor: salaDeTeste,
        rotulo_exibicao: salaDeTeste,
        ordem: 900 + processo,
        ativo: true,
        metadados: { ambiente_virtual: false },
      },
      { onConflict: "lista,valor" },
    );

  // ── Os cinco cursos, um por classificação, todos pela RPC ────────────────────────────────────
  const regular = await garantirCurso({
    codigo: porClassificacao.regular,
    nome_curso: `Curso regular da amostra ${processo}`,
    classificacao: "regular",
    modalidade: "presencial",
    duracao_dias: 120,
    duracao_semanas: 24,
    proposito: "Habilitar a amostra a exercer a função prevista.",
    limite_turmas_ano: 3,
  });

  const expedito = await garantirCurso({
    codigo: porClassificacao.expedito,
    nome_curso: `Curso expedito da amostra ${processo}`,
    classificacao: "expedito",
    modalidade: "ead",
    duracao_dias: 10,
    duracao_semanas: 2,
    proposito: "Atualizar conhecimento em prazo curto.",
  });

  /*
   * ⚠️ SEM `duracao_semanas` E SEM `proposito` DE PROPÓSITO: são os dois avisos de qualidade de
   * cadastro do curso (`FR-010`), e sem uma linha que os dispare o quadro de avisos passaria vazio
   * — o que também passaria numa implementação que nunca avisa.
   */
  await garantirCurso({
    codigo: porClassificacao.estagio_qualificacao,
    nome_curso: `Estagio de qualificacao da amostra ${processo}`,
    classificacao: "estagio_qualificacao",
    modalidade: "presencial",
    duracao_dias: 30,
    duracao_semanas: null,
    proposito: null,
  });

  const aperfeicoamento = await garantirCurso({
    codigo: porClassificacao.aperfeicoamento_avancado,
    nome_curso: `Aperfeicoamento avancado da amostra ${processo}`,
    classificacao: "aperfeicoamento_avancado",
    modalidade: "semipresencial",
    duracao_dias: 200,
    duracao_semanas: 40,
    proposito: "Aperfeicoar a amostra no grau avancado.",
  });

  const especial = await garantirCurso({
    codigo: porClassificacao.especial,
    nome_curso: `Curso especial da amostra ${processo}`,
    classificacao: "especial",
    modalidade: "presencial",
    duracao_dias: 15,
    duracao_semanas: 3,
    proposito: "Atender demanda especifica do Comando.",
  });

  // ── As turmas ─────────────────────────────────────────────────────────────────────────────────
  const turmaJanelaCedo = await criarTurma({
    cursoId: regular,
    rotulo: "T1",
    ano: 2026,
    status: "concluida",
    modalidade: "presencial",
    inicio: "2026-02-02",
    termino: "2026-06-30",
    sala: "Sala 01",
    alunos: 22,
  });

  const turmaJanelaTarde = await criarTurma({
    cursoId: regular,
    rotulo: "T2",
    ano: 2026,
    status: "planejada",
    modalidade: "presencial",
    inicio: "2026-08-03",
    termino: "2026-12-11",
    sala: salaDeTeste,
    alunos: 18,
  });

  /*
   * ⚠️ AS DUAS CANCELADAS SÃO O CASO QUE DISCRIMINA A ENUMERAÇÃO POSITIVA do `FR-030`: o limite conta
   * `planejada`, `ativa` e `concluida`, **nunca** "≠ cancelada". Um curso cujas únicas turmas estão
   * canceladas tem contagem **zero** — e uma implementação que contasse "tudo que não foi cancelado"
   * daria o mesmo resultado aqui, por isso o teste do limite também usa um status inventado.
   */
  const turmasCanceladas = [
    await criarTurma({
      cursoId: expedito,
      rotulo: "T1",
      ano: 2026,
      status: "cancelada",
      modalidade: "ead",
      inicio: "2026-03-02",
      termino: "2026-03-13",
    }),
    await criarTurma({
      cursoId: expedito,
      rotulo: "T2",
      ano: 2026,
      status: "cancelada",
      modalidade: "ead",
      inicio: "2026-09-07",
      termino: "2026-09-18",
    }),
  ];

  const turmaAtivaComTerminoPassado = await criarTurma({
    cursoId: aperfeicoamento,
    rotulo: "T1",
    ano: 2026,
    status: "ativa",
    modalidade: "semipresencial",
    inicio: "2026-02-02",
    termino: "2026-06-30",
    sala: "Sala 02",
    alunos: 12,
  });

  const turmaSemJanela = await criarTurma({
    cursoId: aperfeicoamento,
    rotulo: "T2",
    ano: 2026,
    status: "planejada",
    modalidade: "semipresencial",
    sala: "Sala 03",
  });

  const turmaSemSala = await criarTurma({
    cursoId: aperfeicoamento,
    rotulo: "T3",
    ano: 2026,
    status: "planejada",
    modalidade: "semipresencial",
    inicio: "2026-10-05",
    termino: "2026-11-27",
    alunos: 9,
  });

  // ── O lançamento que TRAVA a vigência do curso regular ────────────────────────────────────────
  await semearLancamento(processo, regular, turmaJanelaCedo);

  /*
   * ⚠️ A ATIVIDADE GLOBAL TRAVA A VIGÊNCIA DO APERFEIÇOAMENTO **SÓ POR ALCANCE**: ela não tem turma,
   * e chega ao curso porque a data cai dentro da janela da turma `T1`. É o que dá sentido ao
   * `FR-021.8` — encurtar essa janela tira a proteção, e o diálogo precisa dizer isso. Na base de
   * 16/09/2026 há **zero** atividades globais: sem esta, o caso não teria o que medir.
   */
  const atividadeGlobal = `ANL-${s}-GLOB`;
  const { error: erroAtividade } = await admin()
    .from("atividades_nao_letivas")
    .insert({
      codigo: atividadeGlobal,
      categoria_normativa: "AEC",
      escopo: "global",
      turma_id: null,
      data: "2026-05-10",
      descricao: `Atividade global da amostra ${processo}`,
      tempos_consumidos: 4,
    });
  if (erroAtividade) {
    throw new Error(`falha ao semear a atividade global: ${erroAtividade.message}`);
  }

  /*
   * ⚠️ O CURSO ESPECIAL NASCE SEM TURMA, e isso é escolha: `curso_com_turma_pendente` (`FR-017.2`)
   * recusa desativar curso com turma `planejada` ou `ativa`. Aqui o que se prepara é o curso
   * **inativo**; a guarda tem prova própria noutro lugar.
   */
  const sessao = await sessaoDe(emailAdmin);
  const { error: erroDesativar } = await sessao
    .from("cursos")
    .update({ status: "inativo" })
    .eq("id", especial);
  if (erroDesativar) {
    throw new Error(
      `nao consegui desativar ${porClassificacao.especial} pela sessao de ${emailAdmin}: ` +
        `${erroDesativar.message}`,
    );
  }

  return {
    processo,
    porClassificacao,
    turmaJanelaCedo,
    turmaJanelaTarde,
    turmasCanceladas,
    turmaAtivaComTerminoPassado,
    turmaSemJanela,
    turmaSemSala,
    atividadeGlobal,
    salaDeTeste,
  };
}

/**
 * Disciplina, unidade de ensino, instrutor e um lançamento — o que **trava** a vigência do curso.
 *
 * ⚠️ **TRÊS CATRACAS DO ÉPICO 2 MORDEM AQUI**, e nenhuma é lacuna: lançamento novo exige instrutor,
 * exige Unidade de Ensino e aceita de **1 a 12 tempos**. Elas só toleram nulo em linha migrada e
 * nunca editada.
 */
async function semearLancamento(processo: number, cursoId: string, turma: string): Promise<void> {
  const s = `CT${processo}`;

  const { data: disciplina, error: erroDisciplina } = await admin()
    .from("disciplinas")
    .insert({
      codigo: `DIS-${s}`,
      curso_id: cursoId,
      cod_disciplina: `AMO${processo}`,
      nome_disciplina: `Disciplina da amostra ${processo}`,
      carga_horaria_tempos: 20,
    })
    .select("id")
    .single();
  if (erroDisciplina) throw new Error(`falha ao semear disciplina: ${erroDisciplina.message}`);

  const { data: unidade, error: erroUnidade } = await admin()
    .from("unidades_ensino")
    .insert({
      codigo: `UE-${s}`,
      disciplina_id: disciplina.id,
      curso_id: cursoId,
      numero_ue: 1,
      topico: `Unidade da amostra ${processo}`,
      ch_prevista_tempos: 20,
    })
    .select("id")
    .single();
  if (erroUnidade) throw new Error(`falha ao semear unidade: ${erroUnidade.message}`);

  const { data: instrutor, error: erroInstrutor } = await admin()
    .from("instrutores")
    .insert({
      codigo: `INS-${s}`,
      posto_graduacao: "CT",
      // Militar novo precisa de especialidade desde 15/09/2026 (`RN-INST-03` delimitado).
      esp_hab_obs: "-EF",
      nome_completo: `Instrutor Da Amostra De Cursos ${processo}`,
      categoria: "organica",
      om: "CIAARA",
    })
    .select("id")
    .single();
  if (erroInstrutor) throw new Error(`falha ao semear instrutor: ${erroInstrutor.message}`);

  const { data: linhaDaTurma, error: erroTurma } = await admin()
    .from("turmas")
    .select("id")
    .eq("codigo", turma)
    .single();
  if (erroTurma) throw new Error(`nao li a turma ${turma}: ${erroTurma.message}`);

  const { error: erroRegistro } = await admin()
    .from("registros_aula")
    .insert({
      codigo: `REG-${s}-01`,
      data: "2026-03-02",
      turma_id: linhaDaTurma.id,
      curso_id: cursoId,
      instrutor_id: instrutor.id,
      unidade_ensino_id: unidade.id,
      tempos_consumidos: 6,
    });
  if (erroRegistro) throw new Error(`falha ao semear o lancamento: ${erroRegistro.message}`);
}

/**
 * A vigência `padrao` **ativa** de um curso, buscada na hora.
 *
 * ⚠️ **BUSCADA, NUNCA GUARDADA** — ver a nota do cabeçalho. Depois que o percurso da T204 corrige uma
 * vigência, o `id` da anterior aponta para uma linha `cancelado`, e o caso seguinte reprovaria com
 * `vigencia_cancelada_imutavel`: uma mensagem correta sobre uma pergunta que ninguém fez.
 */
export async function vigenciaPadraoAtiva(sigla: string): Promise<string> {
  const { data: curso, error: erroCurso } = await admin()
    .from("cursos")
    .select("id")
    .eq("codigo", sigla)
    .single();
  if (erroCurso) throw new Error(`nao li o curso ${sigla}: ${erroCurso.message}`);

  const { data, error } = await admin()
    .from("curso_regime_historico")
    .select("id")
    .eq("curso_id", curso.id)
    .eq("tipo_regime", "padrao")
    .eq("status", "ativo")
    .order("vigente_de", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(`nao achei vigencia padrao ativa de ${sigla}: ${error.message}`);
  return data.id as string;
}

/**
 * Remove o que a amostra criou.
 *
 * ⚠️ **ELE APAGA DE VERDADE, E ISSO NÃO CONTRARIA A REGRA 4.** "Nada é apagado" é regra de **negócio**,
 * sobre dado do sistema; isto é dado de teste, criado e destruído pela `service_role` no stack local.
 *
 * ⚠️ **O QUE FICA DE PÉ É DELIBERADO**: os cinco cursos e todas as vigências. Os dois são append-only
 * ou protegidos por FK `restrict`, e tentar apagá-los falharia — em silêncio, porque esta limpeza não
 * confere erro de cada comando. A semeadura os reaproveita.
 */
export async function limparCursos(semeado: CursosSemeados | undefined): Promise<void> {
  if (!semeado) return;
  const s = `CT${semeado.processo}`;
  const siglas = Object.values(semeado.porClassificacao);

  const { data: cursos } = await admin().from("cursos").select("id").in("codigo", siglas);
  const ids = (cursos ?? []).map((c) => c.id);

  await admin().from("atividades_nao_letivas").delete().eq("codigo", semeado.atividadeGlobal);

  if (ids.length > 0) {
    await admin().from("registros_aula").delete().in("curso_id", ids);

    /*
     * ⚠️ `turma_disciplina` SAI ANTES DE `turmas`. Toda turma nasce com uma linha por disciplina
     * ativa do curso, e a FK `turma_disciplina.turma_id` é `on delete restrict`: apagar a turma
     * primeiro falharia, e a execução seguinte encontraria a amostra anterior de pé.
     */
    const { data: turmas } = await admin().from("turmas").select("id").in("curso_id", ids);
    const idsDeTurma = (turmas ?? []).map((t) => t.id);
    if (idsDeTurma.length > 0) {
      await admin().from("turma_disciplina").delete().in("turma_id", idsDeTurma);
    }
    await admin().from("turmas").delete().in("curso_id", ids);
    await admin().from("unidades_ensino").delete().in("curso_id", ids);
    await admin().from("disciplinas").delete().in("curso_id", ids);
  }

  await admin().from("instrutores").delete().eq("codigo", `INS-${s}`);
  await admin()
    .from("config_listas")
    .delete()
    .eq("lista", "salas")
    .eq("valor", semeado.salaDeTeste);
}

import "server-only";

/**
 * A leitura da grade de disciplinas (`FR-003`, `FR-004`, `FR-053`).
 *
 * ⚠️ **NENHUM `await` DENTRO DE LAÇO** (*Convenções de código*). As consultas independentes vão num
 * `Promise.all` só; as dependentes são encadeadas **uma vez**, não por linha. Uma consulta por
 * disciplina seriam 175 idas ao banco numa tela que a pessoa abre o dia inteiro.
 *
 * ⚠️ **SÃO DUAS VISÕES DA MESMA TELA, e a diferença é o que existe para ser mostrado** (`FR-003`):
 *   - **catálogo** (curso escolhido, turma não) — o cadastro da disciplina: código, nome, CH, modo,
 *     situação, unidades. **Não há período nem instrutor**, porque os dois são *por turma*;
 *   - **por turma** — o mesmo, mais período previsto daquela turma, instrutores atribuídos, rateio e
 *     execução.
 *
 * ⚠️ **O QUE DEPENDE DE TURMA DEGRADA COM AVISO, NUNCA COM ZERO** (`RN-DEG-01`, `FR-081`). Mostrar
 * "0 instrutores" no catálogo seria afirmar que ninguém está designado, quando o certo é *"isto se
 * decide por turma"*. A distinção entre **não há** e **não se aplica** é a mesma do gotcha 4.
 */
import { escalaDeLinhas, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { nomeEmTexto } from "@/lib/dominio/nome-instrutor";
import { conferirSomaDasUnidades } from "@/lib/dominio/soma-das-unidades";
import { criarClienteDeServidor } from "@/lib/supabase/server";

export type CursoDaCascata = {
  readonly id: string;
  readonly codigo: string;
  readonly nomeCurso: string;
};

export type TurmaDaCascata = {
  readonly id: string;
  readonly codigo: string;
  readonly status: string;
};

export type InstrutorDaLinha = {
  readonly instrutorId: string;
  readonly codigo: string;
  readonly nome: string;
  readonly temposPrevistos: number | null;
};

/**
 * Um instrutor **habilitado** naquela disciplina — a lista de onde a atribuição escolhe.
 *
 * ⚠️ **SÓ OS HABILITADOS ENTRAM** (`RF-MATERIAS-02`), e a ordem é a de **antiguidade**, resolvida no
 * banco por `app.fn_antiguidade_ordem`. É a mesma escala do rateio: ordenar aqui por nome faria a
 * tela mostrar as parcelas em ordem diferente da que as gerou.
 */
export type HabilitadoDaLinha = {
  readonly instrutorId: string;
  readonly codigo: string;
  readonly nome: string;
  /*
   * ⚠️ Os quatro campos abaixo existem porque `SeletorInstrutor` — o construtor ÚNICO de escolha de
   * instrutor (`SC-002`, `RN-ANT-01` de Risco Alto) — pede `InstrutorParaExibir` e **reordena o que
   * recebe** pela escala. Passar um nome já formatado tiraria dele a informação com que ele ordena.
   */
  readonly pg: string;
  readonly especialidade: string | null;
  readonly nomeCompleto: string;
  readonly nomeDeGuerra: string | null;
};

export type UnidadeDaLinha = {
  readonly id: string;
  readonly codigo: string;
  readonly numeroUe: string;
  readonly topico: string;
  readonly chPrevistaTempos: number;
  readonly ativa: boolean;
};

export type LinhaDaGradeDeDisciplinas = {
  readonly disciplinaId: string;
  readonly codigo: string;
  readonly codDisciplina: string;
  readonly nomeDisciplina: string;
  readonly cargaHorariaTempos: number;
  readonly ordemSugerida: number | null;
  readonly modoAtribuicaoPadrao: string;
  readonly ativa: boolean;

  /** `null` fora da visão por turma — **não se aplica**, e não é zero. */
  readonly turmaDisciplinaId: string | null;
  readonly previsaoInicio: string | null;
  readonly previsaoTermino: string | null;
  readonly temposExecutados: number;

  readonly instrutores: readonly InstrutorDaLinha[];
  /** Quem pode ser atribuído. Vazio = ninguém habilitado, e a tela oferece o caminho de habilitar. */
  readonly habilitados: readonly HabilitadoDaLinha[];
  readonly unidades: readonly UnidadeDaLinha[];
  /** O aviso da soma das UEs, ou `null` quando fecha **ou quando não há UE** (`FR-061`). */
  readonly avisoDaSoma: string | null;
};

export type GradeDeDisciplinas = {
  readonly cursos: readonly CursoDaCascata[];
  readonly turmas: readonly TurmaDaCascata[];
  readonly cursoEscolhido: CursoDaCascata | null;
  readonly turmaEscolhida: TurmaDaCascata | null;
  readonly linhas: readonly LinhaDaGradeDeDisciplinas[];
  /** O prazo do aviso de início próximo, lido de `config_parametros` — **nunca constante**. */
  readonly avisoInicioDias: number;
  /**
   * A escala `P/G` → peso, de `config_listas`.
   *
   * ⚠️ **NUNCA UMA CONSTANTE DE CÓDIGO** (regra 8). Ela é parâmetro normativo: a ordem de antiguidade
   * muda por norma, não por versão do sistema. `SeletorInstrutor` a exige por este mesmo motivo.
   */
  readonly escalaDeAntiguidade: EscalaDeAntiguidade;
  /**
   * ⚠️ O parâmetro `curso` do endereço apontou para curso que não existe ou não está no alcance?
   * A tela **avisa**, em vez de abrir vazia fingindo que não há disciplina (gotcha 4).
   */
  readonly cursoNaoAlcancado: boolean;
};

/** O padrão do `disciplinas.aviso_inicio_dias`, se o parâmetro sumir da tabela (`RN-DEG-01`). */
const AVISO_INICIO_DIAS_PADRAO = 30;

/**
 * As colunas de `vw_instrutores` de que o nome padronizado precisa.
 *
 * ⚠️ **NÃO EXISTE `nome_formatado` NA VIEW, e não deve existir.** O formato é
 * `P/G Especialidade Nome Completo` com o **nome de guerra destacado** (`RF-INSTR-15`,
 * **[PRESERVADO]**), e ele mora em `lib/dominio/nome-instrutor.ts` — função pura, com teste. Uma
 * coluna calculada na view seria a segunda implementação do mesmo formato, e as duas divergiriam no
 * dia em que uma mudasse. A primeira escrita desta consulta pedia `nome_formatado` e não teria
 * compilado contra o schema.
 */
const COLUNAS_DO_NOME = "id, codigo, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra";

type FichaCrua = {
  readonly id: string;
  readonly codigo: string | null;
  readonly posto_graduacao: string | null;
  readonly esp_hab_obs: string | null;
  readonly nome_completo: string | null;
  readonly nome_guerra: string | null;
};

/** O nome padronizado, pela função única do domínio. */
function nomeDaFicha(f: FichaCrua): string {
  return nomeEmTexto({
    id: f.id,
    pg: f.posto_graduacao ?? "",
    especialidade: f.esp_hab_obs,
    nomeCompleto: f.nome_completo ?? "",
    nomeDeGuerra: f.nome_guerra,
  });
}

export async function lerGradeDeDisciplinas(filtro: {
  readonly cursoCodigo: string;
  readonly turmaCodigo: string;
}): Promise<GradeDeDisciplinas> {
  const supabase = await criarClienteDeServidor();

  // ── as três independentes, de uma vez ────────────────────────────────────────────────────────
  const [cursosRes, parametroRes, escalaRes] = await Promise.all([
    supabase.from("cursos").select("id, codigo, nome_curso").order("codigo"),
    supabase
      .from("config_parametros")
      .select("valor")
      .eq("chave", "disciplinas.aviso_inicio_dias")
      .maybeSingle(),
    supabase
      .from("config_listas")
      .select("valor, ordem, ativo")
      .eq("lista", "escala_antiguidade")
      .order("ordem"),
  ]);

  const escalaDeAntiguidade = escalaDeLinhas(
    (escalaRes.data ?? []).map((e) => ({
      valor: e.valor,
      ordem: Number(e.ordem),
      ativo: e.ativo !== false,
    })),
  );

  const cursos: CursoDaCascata[] = (cursosRes.data ?? []).map((c) => ({
    id: c.id,
    codigo: c.codigo,
    nomeCurso: c.nome_curso,
  }));

  const avisoInicioDias = Number(parametroRes.data?.valor ?? AVISO_INICIO_DIAS_PADRAO);

  const cursoEscolhido = filtro.cursoCodigo
    ? (cursos.find((c) => c.codigo === filtro.cursoCodigo) ?? null)
    : null;

  const vazio = {
    cursos,
    turmas: [] as TurmaDaCascata[],
    cursoEscolhido,
    turmaEscolhida: null,
    linhas: [] as LinhaDaGradeDeDisciplinas[],
    avisoInicioDias: Number.isFinite(avisoInicioDias) ? avisoInicioDias : AVISO_INICIO_DIAS_PADRAO,
    escalaDeAntiguidade,
    // ⚠️ Pediu um curso e ele não veio: é **alcance**, não ausência de disciplina.
    cursoNaoAlcancado: filtro.cursoCodigo !== "" && cursoEscolhido === null,
  } satisfies GradeDeDisciplinas;

  if (!cursoEscolhido) return vazio;

  // ── o curso escolhido: turmas e disciplinas, independentes entre si ──────────────────────────
  const [turmasRes, disciplinasRes] = await Promise.all([
    supabase
      .from("turmas")
      .select("id, codigo, status")
      .eq("curso_id", cursoEscolhido.id)
      .order("codigo"),
    supabase
      .from("disciplinas")
      .select(
        "id, codigo, cod_disciplina, nome_disciplina, carga_horaria_tempos, ordem_sugerida, modo_atribuicao_padrao, status",
      )
      .eq("curso_id", cursoEscolhido.id)
      .order("ordem_sugerida", { ascending: true, nullsFirst: false })
      .order("cod_disciplina"),
  ]);

  const turmas: TurmaDaCascata[] = (turmasRes.data ?? []).map((t) => ({
    id: t.id,
    codigo: t.codigo,
    status: t.status,
  }));

  const turmaEscolhida = filtro.turmaCodigo
    ? (turmas.find((t) => t.codigo === filtro.turmaCodigo) ?? null)
    : null;

  const disciplinas = disciplinasRes.data ?? [];
  const idsDasDisciplinas = disciplinas.map((d) => d.id);
  if (idsDasDisciplinas.length === 0) {
    return { ...vazio, turmas, turmaEscolhida, cursoNaoAlcancado: false };
  }

  // ── unidades de ensino: UMA consulta para todas as disciplinas ───────────────────────────────
  const unidadesRes = await supabase
    .from("unidades_ensino")
    .select("id, codigo, disciplina_id, numero_ue, topico, ch_prevista_tempos, status")
    .in("disciplina_id", idsDasDisciplinas)
    .order("numero_ue");

  const unidadesPorDisciplina = new Map<string, UnidadeDaLinha[]>();
  for (const u of unidadesRes.data ?? []) {
    const lista = unidadesPorDisciplina.get(u.disciplina_id) ?? [];
    lista.push({
      id: u.id,
      codigo: u.codigo,
      numeroUe: u.numero_ue,
      topico: u.topico,
      chPrevistaTempos: Number(u.ch_prevista_tempos),
      ativa: u.status === "ativo",
    });
    unidadesPorDisciplina.set(u.disciplina_id, lista);
  }

  // ── os habilitados: UMA consulta para todas as disciplinas, em ordem de antiguidade ──────────
  // ⚠️ A ordem vem da VIEW `vw_instrutor_disciplina_rotulada`, que já resolve a antiguidade — a
  //    mesma escala do rateio. Uma ordenação por nome aqui faria as parcelas aparecerem fora de
  //    ordem em relação a quem as gerou.
  const habilitadosRes = await supabase
    .from("instrutor_disciplina")
    .select("disciplina_id, instrutor_id, status")
    .in("disciplina_id", idsDasDisciplinas)
    .eq("status", "ativo");

  const idsHabilitados = [
    ...new Set((habilitadosRes.data ?? []).map((h) => h.instrutor_id as string)),
  ];

  /*
   * ⚠️ **A ORDEM É PEDIDA AO BANCO — `.order("ordem_antiguidade")` — E A LISTA É MONTADA NA ORDEM
   *    EM QUE ELE DEVOLVE.** A primeira escrita lia sem ordem e ordenava em memória com um `sort`
   *    próprio; **duas guardas reprovaram**, e as duas estão certas: a `RN-ANT-01` é de Risco Alto e
   *    vale por ponto único, e um terceiro lugar que ordena instrutor é o terceiro a divergir. Quem
   *    ordena é `app.fn_antiguidade_ordem` no banco e `ordenarPorAntiguidade` no domínio — nunca um
   *    comparador escrito numa consulta de tela.
   */
  const fichasOrdenadas: (FichaCrua & { ordem_antiguidade: number | null })[] = [];
  if (idsHabilitados.length > 0) {
    const fichasRes = await supabase
      .from("vw_instrutores")
      .select(`${COLUNAS_DO_NOME}, ordem_antiguidade`)
      .in("id", idsHabilitados)
      .order("ordem_antiguidade");
    for (const bruta of fichasRes.data ?? []) {
      fichasOrdenadas.push(bruta as unknown as FichaCrua & { ordem_antiguidade: number | null });
    }
  }

  const disciplinasDoHabilitado = new Map<string, string[]>();
  for (const h of habilitadosRes.data ?? []) {
    const lista = disciplinasDoHabilitado.get(h.instrutor_id as string) ?? [];
    lista.push(h.disciplina_id as string);
    disciplinasDoHabilitado.set(h.instrutor_id as string, lista);
  }

  const habilitadosPorDisciplina = new Map<string, HabilitadoDaLinha[]>();
  // ⚠️ O laço externo é o das FICHAS, já ordenadas pelo banco: cada lista sai na ordem certa sem
  //    nenhum `sort` aqui.
  for (const f of fichasOrdenadas) {
    for (const disciplinaId of disciplinasDoHabilitado.get(f.id) ?? []) {
      const lista = habilitadosPorDisciplina.get(disciplinaId) ?? [];
      lista.push({
        instrutorId: f.id,
        codigo: f.codigo ?? "",
        nome: nomeDaFicha(f),
        pg: f.posto_graduacao ?? "",
        especialidade: f.esp_hab_obs,
        nomeCompleto: f.nome_completo ?? "",
        nomeDeGuerra: f.nome_guerra,
      });
      habilitadosPorDisciplina.set(disciplinaId, lista);
    }
  }

  // ── o que só existe POR TURMA ────────────────────────────────────────────────────────────────
  const porTurmaDisciplina = new Map<
    string,
    { turmaDisciplinaId: string; inicio: string | null; termino: string | null; executados: number }
  >();
  const instrutoresPorDisciplina = new Map<string, InstrutorDaLinha[]>();

  if (turmaEscolhida) {
    const [gradeRes, execucaoRes] = await Promise.all([
      supabase
        .from("turma_disciplina")
        .select("id, disciplina_id, previsao_inicio, previsao_termino")
        .eq("turma_id", turmaEscolhida.id)
        .eq("status", "ativo"),
      supabase
        .from("vw_disciplinas_execucao")
        .select("disciplina_id, ta_executados")
        .eq("turma_id", turmaEscolhida.id),
    ]);

    const executadosPorDisciplina = new Map(
      (execucaoRes.data ?? []).map((e) => [
        e.disciplina_id as string,
        Number(e.ta_executados ?? 0),
      ]),
    );

    for (const g of gradeRes.data ?? []) {
      porTurmaDisciplina.set(g.disciplina_id, {
        turmaDisciplinaId: g.id,
        inicio: g.previsao_inicio,
        termino: g.previsao_termino,
        executados: executadosPorDisciplina.get(g.disciplina_id) ?? 0,
      });
    }

    const idsDaGrade = [...porTurmaDisciplina.values()].map((g) => g.turmaDisciplinaId);
    if (idsDaGrade.length > 0) {
      // ⚠️ **A ORDEM É A DA ANTIGUIDADE, e ela vem da VIEW**, não de um `order by` nome. É a mesma
      //    escala que o rateio usa; ordenar aqui de outro jeito faria a tela mostrar as parcelas em
      //    ordem diferente da que as gerou.
      const atribuicoesRes = await supabase
        .from("vw_instrutor_carga_prevista")
        .select("turma_disciplina_id, disciplina_id, instrutor_id, tempos_previstos")
        .in("turma_disciplina_id", idsDaGrade);

      const idsDeInstrutores = [
        ...new Set((atribuicoesRes.data ?? []).map((a) => a.instrutor_id as string)),
      ];

      const nomes = new Map<string, { codigo: string; nome: string }>();
      if (idsDeInstrutores.length > 0) {
        const instrutoresRes = await supabase
          .from("vw_instrutores")
          .select(COLUNAS_DO_NOME)
          .in("id", idsDeInstrutores)
          // ⚠️ A ordem é pedida ao BANCO mesmo aqui, onde só se lê o nome: a guarda do `SC-002.1`
          //    cobra `ordem_antiguidade` em **toda** leitura de lista de instrutor, e ela está certa
          //    — uma leitura sem ordem hoje vira uma lista exibida sem ordem amanhã.
          .order("ordem_antiguidade");
        for (const bruta of instrutoresRes.data ?? []) {
          const i = bruta as unknown as FichaCrua;
          nomes.set(i.id, { codigo: i.codigo ?? "", nome: nomeDaFicha(i) });
        }
      }

      for (const a of atribuicoesRes.data ?? []) {
        const disciplinaId = a.disciplina_id as string;
        const lista = instrutoresPorDisciplina.get(disciplinaId) ?? [];
        const identificacao = nomes.get(a.instrutor_id as string);
        lista.push({
          instrutorId: a.instrutor_id as string,
          codigo: identificacao?.codigo ?? "",
          nome: identificacao?.nome ?? "(instrutor sem ficha legível)",
          temposPrevistos: a.tempos_previstos === null ? null : Number(a.tempos_previstos),
        });
        instrutoresPorDisciplina.set(disciplinaId, lista);
      }
    }
  }

  /*
   * ⚠️ **NA VISÃO POR TURMA, SÓ AS DISCIPLINAS DAQUELA TURMA.** A grade de uma turma é o que está
   *    nela — e a primeira escrita listava **todas** as do curso, mostrando na `T1` uma disciplina
   *    que a `T1` não tem. Na base real isso quase nunca apareceria: `criar_disciplina` cria a linha
   *    de grade em toda turma ativa, então quase toda disciplina está em quase toda turma. É
   *    justamente por quase nunca aparecer que o defeito passaria.
   * ⚠️ E no CATÁLOGO ficam todas, inclusive a que não está em turma nenhuma: ali a pergunta é outra.
   */
  const visiveis = turmaEscolhida
    ? disciplinas.filter((d) => porTurmaDisciplina.has(d.id))
    : disciplinas;

  const linhas: LinhaDaGradeDeDisciplinas[] = visiveis.map((d) => {
    const unidades = unidadesPorDisciplina.get(d.id) ?? [];
    const daTurma = porTurmaDisciplina.get(d.id);
    return {
      disciplinaId: d.id,
      codigo: d.codigo,
      codDisciplina: d.cod_disciplina,
      nomeDisciplina: d.nome_disciplina,
      cargaHorariaTempos: Number(d.carga_horaria_tempos),
      ordemSugerida: d.ordem_sugerida === null ? null : Number(d.ordem_sugerida),
      modoAtribuicaoPadrao: d.modo_atribuicao_padrao,
      ativa: d.status === "ativo",
      turmaDisciplinaId: daTurma?.turmaDisciplinaId ?? null,
      previsaoInicio: daTurma?.inicio ?? null,
      previsaoTermino: daTurma?.termino ?? null,
      temposExecutados: daTurma?.executados ?? 0,
      instrutores: instrutoresPorDisciplina.get(d.id) ?? [],
      habilitados: habilitadosPorDisciplina.get(d.id) ?? [],
      unidades,
      avisoDaSoma:
        conferirSomaDasUnidades(
          unidades.map((u) => ({ chPrevistaTempos: u.chPrevistaTempos, ativa: u.ativa })),
          Number(d.carga_horaria_tempos),
        )?.aviso ?? null,
    };
  });

  return {
    cursos,
    turmas,
    cursoEscolhido,
    turmaEscolhida,
    linhas,
    avisoInicioDias: Number.isFinite(avisoInicioDias) ? avisoInicioDias : AVISO_INICIO_DIAS_PADRAO,
    escalaDeAntiguidade,
    cursoNaoAlcancado: false,
  };
}

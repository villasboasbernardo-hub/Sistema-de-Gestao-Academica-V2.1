/**
 * A ficha da turma (`FR-031`, `FR-031.4` a `FR-031.6`, `FR-041`).
 *
 * ⚠️ **NÃO HÁ `/editar`** (`FR-031.5`). A ficha **é** o formulário, no modo `edicao`, para quem pode
 * editar; quem só consulta vê os mesmos dados sem campos. Uma rota de edição separada faria a pessoa
 * navegar duas vezes para mudar um efetivo.
 *
 * ⚠️ **O CAMINHO DE VOLTA É O CURSO** (`FR-031.6`): a turma se alcança pela página dele, e é para lá
 * que se volta.
 *
 * ⚠️ **A RPC DE PROTEÇÃO SÓ É LIDA PARA QUEM PODE EDITAR** (`FR-021.8`) — ela tem porteiro próprio, e
 * quem consulta não vai mudar janela nenhuma.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 */
import Link from "next/link";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { andamentoDaTurma } from "@/lib/dominio/andamento-da-turma";
import {
  opcoesDoSeletor,
  rotuloDoCurriculo,
  ROTULO_DA_SITUACAO,
  type CurriculoParaVigencia,
} from "@/lib/dominio/curriculos";
import { enderecoDoCursoNoCurriculo } from "@/lib/navegacao/endereco-de-turma";
import { regimeEfetivo, rotuloDoRegime } from "@/lib/dominio/regime-da-turma";
import {
  estadoDoArquivamento,
  fraseDaTurmaArquivada,
  podeArquivar,
  podeDesarquivar,
  RECURSO_DO_ARQUIVAMENTO,
} from "@/lib/dominio/arquivamento-da-turma";
import { historicoDaTurma } from "@/lib/dominio/historico-da-turma";
import { avisosDaTurma } from "@/lib/dominio/avisos-da-turma";
import { execucaoSeparada, foraDoDsaAte } from "@/lib/dominio/ta-fora-do-dsa";
import { tetosDaTurma, type Categoria } from "@/lib/dominio/tetos-da-turma";
import { gravarPrevistoProens } from "@/lib/acoes/previsto-proens";
import {
  confirmarSugestao,
  definirTempoArbitrado,
  nomearUe,
} from "@/lib/acoes/avaliacoes-do-curriculo";
import { juntarComoSessao } from "@/lib/acoes/juntar-sessao";
import { AVISO_DE_TURMA_EAD, ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import type { JanelaDeTurma, VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import { ROTULO_DO_STATUS_DE_TURMA, TOM_DO_STATUS_DE_TURMA } from "@/lib/dominio/seletor-de-turma";
import { ROTULO_DA_MODALIDADE } from "@/lib/constantes/curso";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataParaLeitura } from "@/lib/formato/data";
import {
  ANCORA_DAS_DISCIPLINAS,
  enderecoDasTurmas,
  enderecoDaPlanilhaDeContingencia,
  enderecoDoDsa,
  ROTA_DA_FICHA_DA_TURMA,
} from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { SePodeVer } from "@/components/ciaara/SePodeVer";

import { alcanceDoPerfil } from "../../cursos/consulta";
import { lerGradeDeDisciplinas } from "../../disciplinas/consulta";
import { DisciplinasDaTurma } from "./DisciplinasDaTurma";
import { podeBaixarPlanilhaDeContingencia } from "./dsa/planilha/acesso";
import { EdicaoDaTurma } from "./EdicaoDaTurma";
import { Rotulo } from "./Rotulo";
import { SecaoDeAndamento } from "./SecaoDeAndamento";
import { CardsDeTetos, type AutoriaDoPrevisto } from "./CardsDeTetos";
import { CardDeAvaliacoes } from "./CardDeAvaliacoes";
import { AvaliacoesDaTurma } from "./AvaliacoesDaTurma";
import { AbasDaTurma } from "./AbasDaTurma";
import { AlertasDeVista } from "./AlertasDeVista";
import { ArquivarTurma } from "./ArquivarTurma";
import { HistoricoDaTurma } from "./HistoricoDaTurma";
import { lerAvaliacoesDaTurma } from "./consulta-de-avaliacoes";
import { EdicaoDoPrevisto } from "./EdicaoDoPrevisto";
import {
  CHAVES_DOS_PARAMETROS_DOS_TETOS,
  COLUNAS_DO_PREVISTO,
  entradaDosTetos,
  parametroDoAno,
} from "./tetos";
import { FormularioDeTurma } from "../FormularioDeTurma";
import {
  codigoDaFicha,
  COLUNAS_DA_CARGA_DA_TURMA,
  COLUNAS_DO_TA_FORA_DO_DSA,
  COLUNAS_DA_FICHA_DA_TURMA,
  regimeEmbutido,
  COLUNAS_DO_REGIME_DO_CURSO,
  datasDeFeriado,
  deveLerFeriados,
  deveLerProtecao,
  mensagemDeTurmaNaoEncontrada,
  protecoesDoBanco,
  regimeDoBanco,
  registrosForaDoDsaDoBanco,
  type LinhaDoTaForaDoDsa,
  type RegistroForaDoDsaDaTela,
} from "./consulta";
import { QuadroDeAvisosDaTurma } from "./QuadroDeAvisosDaTurma";
import { TrocarSituacao } from "./TrocarSituacao";

/*
 * ⚠️ **O "HOJE" LOCAL SAIU DAQUI EM 04/10/2026.** Havia TRÊS fórmulas no repositório: esta cópia,
 *    uma igual na página do curso e um `new Date().toISOString()` em `/disciplinas` — este último
 *    em **UTC**, que divergia das outras duas entre 21h e a meia-noite. Agora todas chamam
 *    `hojeNaCiaara()`, que já existia em `lib/formato/ano-corrente.ts` com um consumidor só.
 */

export default async function FichaDaTurma({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);
  /*
   * ⚠️ **OS PARÂMETROS DA FICHA, E QUEM LÊ CADA UM:** `aba` e `aberta` são lidos pelas folhas, pelo
   *    gancho; `gravada` (a confirmação, spec 016) é lido aqui. ⚠️ **`aberta` deixou de descer daqui
   *    em 17/10/2026** (conferência do PR #67): a cópia do servidor ficava velha e reabria a linha que
   *    a pessoa tinha fechado.
   */
  const { valores } = lerParametros(ROTA_DA_FICHA_DA_TURMA, await searchParams);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_FICHA_DA_TURMA)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!turma) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Turma</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const podeEditar = pode(permissoes, "turmas", "editar");
  const podeArquivarTurmas = pode(permissoes, RECURSO_DO_ARQUIVAMENTO, "editar");
  const cursoId = turma.curso_id as string;

  /*
   * ⚠️ A RPC É PROMESSA CONDICIONAL, NÃO `await` SOLTO — ela entra na MESMA rodada das outras três.
   *    Lê-la depois custaria uma ida a mais ao banco por abertura de ficha (`FR-012`).
   */
  const protecaoPromessa = deveLerProtecao(podeEditar)
    ? supabase.rpc("protecao_das_vigencias_por_atividade_global", { p_curso_id: cursoId })
    : null;

  /*
   * ⚠️ **O "HOJE" SUBIU PARA CÁ EM 04/10/2026, e não é arrumação: ele É UM LIMITE DA CONSULTA.** Os
   *    feriados pedidos ao banco são os do intervalo `[hoje, término]`, e lê-lo depois obrigaria a
   *    uma segunda rodada só por causa da data. Continua sendo `hojeNaCiaara()`, a fórmula única.
   */
  const hoje = hojeNaCiaara();
  const dataTermino = turma.data_termino as string | null;

  /*
   * ⚠️ **A CONSULTA DE FERIADOS É PROMESSA CONDICIONAL, PELO MESMO CRITÉRIO DA RPC** (`FR-012`): sem
   *    data de término não há intervalo, a capacidade sai `sem_termino` e a lista seria descartada
   *    pelo domínio. ⚠️ **E ela filtra `impacto` E `status`:** `RN-EVT-02` manda descontar **só**
   *    feriado de dia inteiro, e feriado desativado é exclusão lógica (regra 4) — contá-lo tiraria
   *    capacidade de um dia que voltou a ser útil.
   */
  const feriadosPromessa = deveLerFeriados(dataTermino)
    ? supabase
        .from("feriados")
        .select("data")
        .eq("impacto", "dia_inteiro")
        .eq("status", "ativo")
        .gte("data", hoje)
        .lte("data", dataTermino as string)
    : null;

  const turmaId = turma.id as string;
  /*
   * ⚠️ **O TA FORA DO DSA SÓ É LIDO POR QUEM LÊ LANÇAMENTO DA TURMA** (`registros_aula.ler`, a régua das views da
   *    CHD; D-COR-3): para os demais a RLS devolveria vazio, e vazio na tela leria como "não há" (gotcha 4).
   */
  const podeLerLancamento = pode(permissoes, "registros_aula", "ler");
  const foraPromessa = podeLerLancamento
    ? supabase
        .from("ta_fora_do_dsa")
        .select(COLUNAS_DO_TA_FORA_DO_DSA)
        .eq("turma_id", turmaId)
        .order("data", { ascending: false })
    : null;
  const [
    cursoRes,
    turmasRes,
    salasRes,
    protecaoRes,
    cargaRes,
    regimeRes,
    feriadosRes,
    diasParadosRes,
    previstosRes,
    conformidadeRes,
    parametrosRes,
    executadaRes,
    foraRes,
    trocasRes,
    arquivosRes,
    regimesDoCursoRes,
    regimeTravadoRes,
    curriculosDoCursoRes,
  ] = await Promise.all([
    supabase
      .from("cursos")
      .select("codigo, nome_curso, limite_turmas_ano, status")
      .eq("id", cursoId)
      .maybeSingle(),
    supabase
      .from("turmas")
      .select("codigo, turma, ano_letivo, status, data_inicio, data_termino")
      .eq("curso_id", cursoId),
    supabase
      .from("config_listas")
      .select("valor, ativo, metadados")
      .eq("lista", "salas")
      .order("ordem"),
    protecaoPromessa,
    /*
     * ⚠️ **A CARGA VEM DA MESMA VIEW QUE O `/inicio` LÊ** — `vw_carga_horaria_turma` —: a CH curricular e os
     *    cards de AEC, TAD e TR. A EXECUTADA do andamento é a de até hoje, abaixo.
     */
    supabase
      .from("vw_carga_horaria_turma")
      .select(COLUNAS_DA_CARGA_DA_TURMA)
      .eq("turma_id", turma.id as string)
      .maybeSingle(),
    /*
     * ⚠️ **O TA/DIA NÃO É PARÂMETRO NOVO: ele é o REGIME VIGENTE DO CURSO** (decisão de Bernardo,
     *    04/10/2026, Q1 do clarify). `vw_cursos_regime_vigente` resolve a vigência de hoje, e a
     *    escolha entre `regime_padrao_tempos` e `limite_diario_ead_horas` é da **modalidade da
     *    turma** (`RN-MAT-04`), feita no módulo puro.
     */
    supabase
      .from("vw_cursos_regime_vigente")
      .select(COLUNAS_DO_REGIME_DO_CURSO)
      .eq("curso_id", cursoId)
      .maybeSingle(),
    feriadosPromessa,
    /*
     * ⚠️ **OS CARDS DE AEC, TAD E TR** (spec 014, PR 2): dias parados por tipo, o previsto do
     *    PROENS da turma, os números crus de `vw_conformidade_tetos` (limite declarado e percentual
     *    do ano) e os parâmetros — tudo na MESMA rodada, nenhum `await` em laço.
     */
    supabase.from("vw_dias_parados_turma").select("tipo, tempos, dias").eq("turma_id", turmaId),
    supabase
      .from("previstos_proens_turma")
      .select(COLUNAS_DO_PREVISTO)
      .eq("turma_id", turmaId)
      .eq("status", "ativo"),
    supabase
      .from("vw_conformidade_tetos")
      .select("categoria, limite_declarado, percentual_norma, ch_curricular")
      .eq("turma_id", turmaId),
    supabase
      .from("config_parametros")
      .select("chave, valor, ano_vigencia")
      .in("chave", [...CHAVES_DOS_PARAMETROS_DOS_TETOS])
      .eq("status", "ativo"),
    /*
     * ⚠️ **A EXECUTADA DO ANDAMENTO É A DE ATÉ HOJE, A MESMA DO `/inicio`** (D-COR-2; FR-014.1 e FR-014.4 da spec
     *    016): `chd_da_turma_ate(hoje)`, filtrada por esta turma, com o dia de São Paulo passado aqui (a função não
     *    tem valor padrão, FR-014.3). Nada lançado até hoje = nenhuma linha = executada **0**.
     */
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }).eq("turma_id", turmaId).maybeSingle(),
    foraPromessa,
    /* D-COR-4 e D-COR-5: as duas trilhas da turma, na mesma rodada — quem lê a turma as lê (policy por alcance). */
    supabase
      .from("turma_trocas_de_situacao")
      .select("ordem, situacao_anterior, situacao_nova, observacao, autor_id, criado_em")
      .eq("turma_id", turmaId)
      .order("ordem"),
    supabase
      .from("turma_arquivamentos")
      .select("ordem, acao, observacao, autor_id, criado_em")
      .eq("turma_id", turmaId)
      .order("ordem"),
    /* Spec 018 (C-18): os regimes nomeados do curso e se a escolha da turma já travou, para *Editar turma*. */
    supabase
      .from("regimes_de_horario")
      .select("id, nome, regime_tempos, ta_duracao_min, status")
      .eq("curso_id", cursoId)
      .order("nome"),
    supabase.rpc("regime_da_turma_travado", { p_turma: turma.id as string }),
    /* Spec 021 (RC-4): os currículos do curso, para *Editar turma* — a troca trava com o regime (mesmo lançamento). */
    supabase
      .from("curriculos")
      .select("id, versao, vigente_de, status, arquivado_em")
      .eq("curso_id", cursoId),
  ]);
  const trocas = (trocasRes.data ?? []) as {
    ordem: number;
    situacao_anterior: string;
    situacao_nova: string;
    observacao: string | null;
    autor_id: string | null;
    criado_em: string;
  }[];
  const arquivos = (arquivosRes.data ?? []) as {
    ordem: number;
    acao: "arquivar" | "desarquivar";
    observacao: string | null;
    autor_id: string | null;
    criado_em: string;
  }[];
  const linhasDoForaDoDsa = (foraRes?.data ?? []) as unknown as LinhaDoTaForaDoDsa[];

  const sigla = (cursoRes.data?.codigo as string | undefined) ?? "";

  /*
   * ⚠️ **ERRO DE LEITURA DEGRADA, NÃO ESTOURA** (`RN-DEG-01`): sem a linha da carga o andamento sai
   *    com prevista e executada **zero**, que a seção já sabe dizer (*"o curso não tem carga
   *    curricular lançada"*). A ficha continua editável — é o `FR-033`.
   * ⚠️ **E A FALHA DA EXECUTADA ATÉ HOJE CAI NO MESMO CAMINHO**: cair na soma da view traria de volta, em
   *    silêncio, o lançado no futuro (D-COR-2), e executada zero com a prevista inteira inventaria atraso.
   */
  const cargaDoAndamento = executadaRes.error ? null : cargaRes.data;
  const regimeDaFicha = regimeEmbutido(turma.regime);
  const andamento = andamentoDaTurma(
    {
      status: turma.status as string,
      modalidade: turma.modalidade as string,
      dataTermino,
      prevista: Number(cargaDoAndamento?.chr_curricular ?? 0),
      executada: Number(
        cargaDoAndamento === null || cargaDoAndamento === undefined
          ? 0
          : ((executadaRes.data as { chd_executada: number } | null)?.chd_executada ?? 0),
      ),
    },
    /* Spec 018 (C-9): o regime nomeado da turma troca os TA presenciais; o limite EAD fica (`RN-MAT-04`). */
    regimeEfetivo(
      regimeDoBanco(regimeRes.data ?? null),
      regimeDaFicha ? { regimeTempos: Number(regimeDaFicha.regime_tempos) } : null,
    ),
    datasDeFeriado(feriadosRes?.data ?? []),
    hoje,
  );

  /*
   * ⚠️ **A GRADE VEM NUMA SEGUNDA RODADA, E O CUSTO ESTÁ DECLARADO:** `lerGradeDeDisciplinas` é
   *    indexada pela **sigla** do curso, e a sigla só existe depois da leitura do curso. São duas
   *    idas ao banco em vez de uma — e a alternativa seria uma consulta paralela por `curso_id`,
   *    que duplicaria a função que a tela de disciplinas já usa. **Duplicar a leitura dos
   *    instrutores é o que custa caro**: é ela que carrega o `.order("ordem_antiguidade")` que a
   *    guarda da `RN-ANT-01` cobra, e uma segunda cópia é um lugar a mais onde esquecê-lo.
   */
  /* Spec 021 (Bloco 6, RC-4): a turma segue o SEU currículo — disciplinas, duração, avaliações. */
  const curriculoDaTurma =
    (
      turma as unknown as {
        curriculo?: {
          id?: string;
          versao?: number;
          vigente_de?: string;
          duracao_semanas?: number | null;
        } | null;
      }
    ).curriculo ?? null;
  const grade = await lerGradeDeDisciplinas({
    cursoCodigo: sigla,
    turmaCodigo: codigo,
    curriculoId: curriculoDaTurma?.id ?? null,
  });
  const naGrade = grade.linhas.filter((l) => l.turmaDisciplinaId !== null);

  const avisos = avisosDaTurma(
    {
      status: turma.status as string,
      dataInicio: turma.data_inicio,
      dataTermino: turma.data_termino,
      sala: turma.sala_alocada,
      alunos: turma.alunos === null ? null : Number(turma.alunos),
      /*
       * ⚠️ **A CONTAGEM PASSOU A SER REAL EM 04/10/2026** (decisão **D6**). Até aqui era `1` fixo,
       *    com o comentário *"a grade da turma é do Épico 6 — declarar 1 mantém o aviso
       *    silencioso"*: a ficha não lia `turma_disciplina` e não tinha o número. Agora lê, e o
       *    aviso `sem_disciplina` passa a **disparar de verdade** em turma sem grade — é mudança
       *    visível, e é o aviso existente passando a dizer a verdade.
       * ⚠️ **NA ABA GRADE DO CURSO O `1` FIXO CONTINUA**, e de propósito: o `FR-012` da spec 009
       *    proíbe consulta por turma naquela lista, que mostra todas as turmas do curso.
       */
      disciplinasAtivas: naGrade.length,
      /* FR-009.7 da spec 016: o T da «Semana N de T» — a ficha avisa quando a turma passa dele. */
      /* Spec 021 (Bloco 6, RC-1): a duração é do currículo DA TURMA. */
      duracaoSemanasDoCurso: curriculoDaTurma?.duracao_semanas ?? null,
    },
    hoje,
  );

  const todas = turmasRes.data ?? [];
  /* ⚠️ A TURMA EDITADA SAI DA CONTA DO LIMITE — senão o próprio lugar dela viraria excesso. */
  const outras: TurmaParaLimite[] = todas
    .filter((t) => t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), status: t.status as string }));

  const janelas: JanelaDeTurma[] = todas.map((t) => ({
    codigo: t.codigo as string,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
  }));

  const semRotuloNoAno = todas
    .filter((t) => t.turma === null && t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), codigo: t.codigo as string }));

  const todasAsSalas: Sala[] = (salasRes.data ?? []).map((s) => ({
    valor: s.valor as string,
    ativo: s.ativo !== false,
    metadados: s.metadados,
  }));
  /* ⚠️ A SALA ATUAL ENTRA MESMO DESATIVADA (`FR-029.4`) — quem decide é `lib/dominio/salas.ts`. */
  const salas = salasParaEscolher(todasAsSalas, turma.sala_alocada);

  const protegidas: VigenciaProtegida[] = protecoesDoBanco(protecaoRes?.data ?? []);

  /*
   * ⚠️ **OS CARDS SAEM DE `tetosDaTurma`, O ÚNICO LUGAR QUE DECIDE TETO** (SC-003). A turma EAD não
   *    tem cards (`FR-006`): a frase da spec 013 já está no cabeçalho.
   */
  const ano = Number(turma.ano_letivo);
  const parametros = parametrosRes.data ?? [];
  const previstos = previstosRes.data ?? [];
  const tetos = tetosDaTurma(
    entradaDosTetos({
      carga: (cargaRes.data as Record<string, unknown> | null) ?? null,
      diasParados: diasParadosRes.data ?? [],
      previstos,
      conformidade: conformidadeRes.data ?? [],
      referenciaEi: {
        comEstudoObrigatorio: parametroDoAno(parametros, "estudo_obrig_com_regime_pct", ano),
        semEstudoObrigatorio: parametroDoAno(parametros, "estudo_obrig_sem_regime_pct", ano),
      },
      ead: ehEadPuro(turma.modalidade as string | null),
    }),
  );
  /*
   * ⚠️ **O NOME DE QUEM ALTEROU É UMA LEITURA A MAIS, E SÓ QUANDO HÁ PREVISTO** — os ids só existem
   *    depois da leitura do previsto. Uma consulta, com `in`, nunca uma por card.
   */
  const autores = [
    ...new Set(
      [
        ...previstos.map((p) => p.editado_por ?? p.criado_por),
        // D-COR-3: quem registrou o TA fora do DSA, na MESMA leitura (C-22).
        ...linhasDoForaDoDsa.map((f) => f.criado_por),
        // D-COR-4 e D-COR-5: quem trocou a situação e quem arquivou.
        ...trocas.map((t) => t.autor_id),
        ...arquivos.map((a) => a.autor_id),
      ].filter((x): x is string => !!x),
    ),
  ];
  const { data: nomes } = autores.length
    ? await supabase
        .from("usuarios")
        .select("auth_user_id, nome_exibicao, nome")
        .in("auth_user_id", autores)
    : { data: [] as { auth_user_id: string | null; nome_exibicao: string | null; nome: string }[] };
  const autoria = Object.fromEntries(
    (["aec", "tad", "tr"] as const).map((c) => {
      const p = previstos.find((x) => x.categoria.toLowerCase() === c);
      const id = p?.editado_por ?? p?.criado_por ?? null;
      const quem = (nomes ?? []).find((u) => u.auth_user_id === id);
      const linha: AutoriaDoPrevisto = p
        ? {
            nome: quem?.nome_exibicao || quem?.nome || "outra conta",
            em: (p.editado_em ?? p.criado_em) as string,
          }
        : null;
      return [c, linha];
    }),
  ) as Record<Categoria, AutoriaDoPrevisto>;
  const nomesDosAutores = new Map(
    (nomes ?? [])
      .filter((u) => u.auth_user_id !== null)
      .map((u) => [u.auth_user_id as string, u.nome_exibicao || u.nome] as const),
  );
  /*
   * ⚠️ **A EXECUÇÃO SEPARADA (D-COR-3)**: a executada até hoje JÁ SOMA o fora do DSA (a base da CHD); aqui só se
   *    diz quanto dela está fora, até o mesmo dia de São Paulo.
   */
  const registrosForaDoDsa = registrosForaDoDsaDoBanco(linhasDoForaDoDsa, nomesDosAutores);
  const foraDoDsaAteHoje = foraDoDsaAte(registrosForaDoDsa, hoje);
  const separada =
    foraDoDsaAteHoje > 0
      ? execucaoSeparada({ total: andamento.executada, foraDoDsa: foraDoDsaAteHoje }).texto
      : null;
  const foraPorLinha: Record<string, RegistroForaDoDsaDaTela[]> = {};
  for (const r of registrosForaDoDsa) (foraPorLinha[r.turmaDisciplinaId] ??= []).push(r);
  /*
   * ⚠️ **A TURMA ARQUIVADA É SOMENTE LEITURA** (D-COR-5; C-4: nem o Admin edita): toda ação de gravar some da ficha.
   *    Quem garante é o servidor (`recusaSeTurmaArquivada`) e, com a M4, o banco; aqui só não se oferece o botão.
   */
  const arquivamento = estadoDoArquivamento(
    arquivos.map((a) => ({
      ordem: a.ordem,
      acao: a.acao,
      criadoEm: a.criado_em,
      autor: a.autor_id === null ? null : (nomesDosAutores.get(a.autor_id) ?? "outra conta"),
      observacao: a.observacao,
    })),
  );
  const arquivada = arquivamento.arquivada;
  const historico = historicoDaTurma({
    trocas: trocas.map((t) => ({
      ordem: t.ordem,
      anterior: t.situacao_anterior,
      nova: t.situacao_nova,
      observacao: t.observacao,
      autorId: t.autor_id,
      em: t.criado_em,
    })),
    arquivamentos: arquivos.map((a) => ({
      ordem: a.ordem,
      acao: a.acao,
      observacao: a.observacao,
      autorId: a.autor_id,
      em: a.criado_em,
    })),
    nomes: nomesDosAutores,
  });
  const podeEditarPrevisto = pode(permissoes, "previsto_proens", "editar") && !arquivada;
  const edicao = podeEditarPrevisto
    ? Object.fromEntries(
        (["aec", "tad", "tr"] as const).map((c) => {
          const atual =
            previstos.find((x) => x.categoria.toLowerCase() === c)?.tempos_previstos ?? null;
          return [
            c,
            <EdicaoDoPrevisto
              key={c}
              turmaId={turmaId}
              categoria={c.toUpperCase() as "AEC" | "TAD" | "TR"}
              atual={atual === null ? null : Number(atual)}
              sugestao={parametroDoAno(parametros, `proens.reserva_generica_${c}`, ano)}
              gravar={gravarPrevistoProens}
            />,
          ];
        }),
      )
    : undefined;

  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  // Spec 014, PR 5 (FR-055 a FR-058): o quadro de avaliações. Turma EAD puro não tem DSA nem avaliação lançada.
  const avaliacoes = ehEadPuro(turma.modalidade as string | null)
    ? null
    : await lerAvaliacoesDaTurma({
        turmaId: turma.id as string,
        cursoId,
        /* Spec 021 (RC-4): as avaliações do currículo DA TURMA. */
        curriculoId: curriculoDaTurma?.id ?? null,
        hoje,
        terminoDaTurma: dataTermino,
        turmaCodigo: turma.codigo as string,
      });

  return (
    <section className="flex flex-col gap-5">
      {arquivamento.arquivada ? (
        <div
          role="status"
          className="border-atrasado-tinta bg-superficie-2 rounded-ciaara flex flex-col gap-1 border px-3 py-2 text-sm"
          data-slot="turma-arquivada"
        >
          <p className="text-texto font-medium">{fraseDaTurmaArquivada(arquivamento)}</p>
          {arquivamento.observacao ? (
            <p className="text-texto-suave">{arquivamento.observacao}</p>
          ) : null}
        </div>
      ) : null}
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-texto text-xl font-semibold" data-slot="codigo-da-turma">
            {turma.codigo}
          </h1>
          {/*
            ⚠️ **O PRIMEIRO DOS TRÊS CAMINHOS ATÉ O DSA** (`FR-011` da spec 013, e a regra
               *"tela sem caminho clicável é tela não entregue"*). Os outros dois são a ação de
               linha em `/turmas` e o bloco da turma no `/inicio`.
            ⚠️ **E O BOTÃO SEGUE A PERMISSÃO DA PÁGINA DE DESTINO, nunca uma regra própria**: o DSA
               pede `registros_aula.ler`, que é o que `SePodeVer` confere aqui.
          */}
          {/*
            ⚠️ **TURMA EAD PURO NÃO TEM O BOTÃO, E SIM O AVISO** (item 9 da conferência do PR #40,
               decisão de Bernardo Villas Boas de 08/10/2026). A regra e a frase são de
               `lib/dominio/dsa/ead-puro.ts` — as mesmas da lista, do `/inicio` e da própria rota do
               DSA. Semipresencial **mantém** o botão: tem DSA na etapa presencial (`D-DSA-2`).
          */}
          {ehEadPuro(turma.modalidade as string | null) ? (
            <p className="text-texto-suave max-w-prose text-sm" data-slot="dsa-turma-ead">
              {AVISO_DE_TURMA_EAD}
            </p>
          ) : (
            <SePodeVer permissoes={permissoes} recurso="registros_aula" acao="ler">
              <Link
                href={enderecoDoDsa(turma.codigo as string)}
                className="border-borda rounded-ciaara hover:bg-marca-suave border px-3 py-1.5 text-sm font-medium"
                data-slot="abrir-o-dsa"
              >
                Abrir o DSA
              </Link>
            </SePodeVer>
          )}
          {/*
            ⚠️ **O MESMO «ESTEPE» DA TELA DO DSA** (spec 015, `FR-001`): pela MESMA condição da rota
               (`podeBaixarPlanilhaDeContingencia`) — quem não lança e a turma EAD não veem o botão.
               Daqui ele vale mais que lá: é o caminho que sobra quando a tela do DSA não abre.
          */}
          {podeBaixarPlanilhaDeContingencia(permissoes, turma.modalidade as string | null) ? (
            <a
              href={enderecoDaPlanilhaDeContingencia(turma.codigo as string)}
              className="border-borda rounded-ciaara hover:bg-marca-suave border px-3 py-1.5 text-sm"
              data-slot="baixar-planilha-de-contingencia"
            >
              Baixar planilha de contingência
            </a>
          ) : null}
        </div>
        {/*
          ⚠️ **O CAMINHO DE VOLTA É A LISTA, E NÃO O CURSO** (`D-NAV-3`, 04/10/2026). Isto **emenda o
             `FR-031.6`** da spec 009, que escrevia *"o caminho de volta é o curso"* — e escrevia certo
             enquanto a ficha só se alcançava por dentro dele. Agora ela se alcança pela lista, pelo
             curso e pelo endereço antigo de disciplinas; voltar ao curso deixou de ser *o* caminho.
          ⚠️ **E O CURSO NÃO FICOU LONGE:** ele é a linha de baixo, como link. O que mudou é qual dos
             dois é "voltar".
        */}
        <p className="text-sm">
          <Link
            href={enderecoDasTurmas()}
            className="text-marca underline-offset-2 hover:underline"
            data-slot="voltar-a-lista"
          >
            ← Turmas
          </Link>
        </p>

        {sigla ? (
          <p className="text-texto-suave text-sm">
            <Link
              href={`/cursos/${encodeURIComponent(sigla)}`}
              className="text-texto underline-offset-2 hover:underline"
              data-slot="curso-da-turma"
            >
              {sigla} — {cursoRes.data?.nome_curso as string}
            </Link>
          </p>
        ) : null}

        {/* Spec 021 (RC-9, RC-12): o currículo que a turma segue — o mesmo rótulo da lista de turmas do curso. */}
        {sigla && curriculoDaTurma?.versao !== undefined && curriculoDaTurma.vigente_de ? (
          <p className="text-texto-suave text-sm" data-slot="curriculo-da-turma">
            Segue o{" "}
            <Link
              href={enderecoDoCursoNoCurriculo(sigla, curriculoDaTurma.versao)}
              className="text-texto underline-offset-2 hover:underline"
            >
              {rotuloDoCurriculo({
                versao: curriculoDaTurma.versao,
                vigente_de: curriculoDaTurma.vigente_de,
              })}
            </Link>
          </p>
        ) : null}

        {/*
          ⚠️ **O CABEÇALHO RESUME A TURMA NUM LUGAR SÓ** (`FR-021` da spec 012), e ele vale para quem
             edita e para quem não edita. Antes, quem não editava via estes campos num `<dl>` de
             somente-leitura e quem editava não via nenhum — o formulário mostra campos, não resumo.
          ⚠️ **ELE FICOU COMPACTO EM 05/10/2026** *(decisão de Bernardo, na conferência)*: era uma
             grade de duas colunas e seis linhas, que empurrava o andamento para baixo da dobra.
             Agora é **uma linha que quebra**, e **Início** e **Término** viraram um item só —
             *Período* —, porque as duas datas são lidas juntas e separadas custavam duas linhas.
          ⚠️ **AS DATAS SAEM EM `DD/MM/AAAA`** (decisão do mesmo dia): até aqui esta mesma ficha
             mostrava ISO no cabeçalho e `DD/MM/AAAA` no Andamento, porque só o segundo chamava o
             formatador. ⚠️ **E o `inicial` do formulário, mais abaixo, CONTINUA EM ISO** — ele é
             valor de `<input type="date">`, não exibição, e formatá-lo abriria o campo vazio.
        */}
        <dl
          className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
          data-slot="cabecalho-da-turma"
        >
          <span className="flex items-center gap-2">
            <Rotulo>Situação</Rotulo>
            <dd className="flex items-center gap-2">
              <BadgeStatus
                tom={TOM_DO_STATUS_DE_TURMA[turma.status as string] ?? "planejado"}
                rotulo={
                  ROTULO_DO_STATUS_DE_TURMA[turma.status as string] ?? (turma.status as string)
                }
              />
              {/*
                ⚠️ AO LADO DO SELO (spec 016, FR-015.1): até 17/10/2026 a situação só se trocava pelo
                   campo de *"Editar turma"*, recolhido no fim da página. Segue `turmas/editar` e o
                   curso em oferta, como *Nova turma*; o banco recusa de qualquer forma.
              */}
              {podeEditar && !arquivada && cursoRes.data?.status !== "inativo" ? (
                <TrocarSituacao codigo={turma.codigo as string} atual={turma.status as string} />
              ) : null}
              {/*
                D-COR-5: arquivar em qualquer situação; arquivam E desarquivam o Admin, o Encarregado e o Ajudante da
                Administração Acadêmica (o recurso da matriz; decisão de Bernardo Villas Boas, 19/10/2026).
              */}
              {podeArquivar({ podeArquivarTurmas, arquivada }) ||
              podeDesarquivar({ podeArquivarTurmas, arquivada }) ? (
                <ArquivarTurma
                  codigo={turma.codigo as string}
                  situacao={turma.status as string}
                  arquivada={arquivada}
                />
              ) : null}
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Modalidade</Rotulo>
            <dd className="text-texto">
              {ROTULO_DA_MODALIDADE[turma.modalidade as string] ?? (turma.modalidade as string)}
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Período</Rotulo>
            <dd className="text-texto">
              {dataParaLeitura(turma.data_inicio)} a {dataParaLeitura(dataTermino)}
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Sala</Rotulo>
            <dd className="text-texto">{texto(turma.sala_alocada) || "—"}</dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Efetivo</Rotulo>
            <dd className="text-texto">{texto(turma.alunos) || "—"}</dd>
          </span>
        </dl>

        {/*
          ⚠️ A CONFIRMAÇÃO DA GRAVAÇÃO (spec 016, FR-015.2) vem pela URL, escrita por
             `enderecoDaTurmaGravada`: até 17/10/2026 trocar a situação ou gravar a turma não dizia nada.
        */}
        {valores.gravada === "situacao" ? (
          <p role="status" className="text-executado-tinta text-sm" data-slot="situacao-gravada">
            Situação gravada:{" "}
            {ROTULO_DO_STATUS_DE_TURMA[turma.status as string] ?? (turma.status as string)}.
          </p>
        ) : valores.gravada === "turma" ? (
          <p role="status" className="text-executado-tinta text-sm" data-slot="turma-gravada">
            Alterações da turma gravadas.
          </p>
        ) : valores.gravada === "arquivada" ? (
          <p
            role="status"
            className="text-executado-tinta text-sm"
            data-slot="turma-arquivada-gravada"
          >
            Turma arquivada.
          </p>
        ) : valores.gravada === "desarquivada" ? (
          <p
            role="status"
            className="text-executado-tinta text-sm"
            data-slot="turma-desarquivada-gravada"
          >
            Turma desarquivada.
          </p>
        ) : valores.gravada === "ta-fora" ? (
          <p role="status" className="text-executado-tinta text-sm" data-slot="ta-fora-gravado">
            TA fora do DSA registrado.
          </p>
        ) : valores.gravada === "ta-fora-desfeito" ? (
          <p
            role="status"
            className="text-executado-tinta text-sm"
            data-slot="ta-fora-desfeito-gravado"
          >
            Registro de TA fora do DSA desfeito.
          </p>
        ) : null}
      </header>

      <QuadroDeAvisosDaTurma avisos={avisos} />

      {/* As vistas atrasadas e as que vencem em breve (FR-054, `RF-CURSO-06`): informativo, nunca bloqueia. */}
      <AlertasDeVista alertas={avaliacoes?.alertas ?? []} mostrarTurma={false} />

      <SecaoDeAndamento
        andamento={andamento}
        dataTermino={dataTermino}
        execucaoSeparada={separada}
      />

      <HistoricoDaTurma eventos={historico} />

      {/*
        ⚠️ **A FAIXA DOS CARDS FICA LOGO ABAIXO DO ANDAMENTO** (comentário de Bernardo no protótipo da
           ficha, 13/10/2026): Progresso · Saldo em dias · Capacidade diária acima; AEC, TAD e TR aqui.
      */}
      <CardsDeTetos tetos={tetos} ano={ano} autoria={autoria} {...(edicao ? { edicao } : {})} />

      {/*
        ⚠️ **O CARD DE AVALIAÇÕES FECHA A FAIXA DOS CARDS** (R-12): N de M, a OD e as vistas, com o clique
           levando à ABA «Avaliações» (`?aba=avaliacoes`) — decisão de Bernardo Villas Boas, 14/10/2026.
      */}
      {avaliacoes?.quadro ? (
        <CardDeAvaliacoes
          contagem={avaliacoes.quadro.contagem}
          turmaCodigo={turma.codigo as string}
        />
      ) : null}

      {/*
        ⚠️ **AS ABAS FICAM ABAIXO DA FAIXA DOS CARDS** (R-12): acima delas, o que se lê de toda turma —
           cabeçalho, avisos, Andamento e cards. A aba *Ficha* tem o conteúdo de antes (disciplinas e
           edição); a aba *Avaliações*, o quadro por disciplina. A URL é dona da aba (`aba`).
      */}
      <AbasDaTurma
        avaliacoes={
          avaliacoes ? (
            <AvaliacoesDaTurma
              quadro={avaliacoes.quadro}
              aviso={avaliacoes.aviso}
              turmaId={turma.id as string}
              {...(pode(permissoes, "avaliacoes_curriculo_arbitrado", "editar") && !arquivada
                ? {
                    arbitrado: {
                      definir: definirTempoArbitrado,
                      confirmar: confirmarSugestao,
                      nomear: nomearUe,
                    },
                  }
                : {})}
              {...(pode(permissoes, "avaliacoes_juntar_sessao", "editar") && !arquivada
                ? { juntar: juntarComoSessao }
                : {})}
            />
          ) : (
            <p className="text-texto-suave text-sm" data-slot="avaliacoes-turma-ead">
              Turma EAD: sem avaliações lançadas no DSA.
            </p>
          )
        }
        ficha={
          <>
            {/*
        ⚠️ **A SEÇÃO DE DISCIPLINAS VEIO DE `/disciplinas?turma=` EM 04/10/2026** (`FR-018`), e o
           endereço antigo **redireciona para esta âncora**. O `id` é o destino do `#`, e é por isso
           que ele é fixo e sai do módulo de endereço: um `#disciplinas` escrito à mão aqui e lá
           seriam duas grafias do mesmo destino.
        ⚠️ **O `<dl>` DE SOMENTE-LEITURA SAIU**: o cabeçalho acima mostra os mesmos campos para todo
           mundo, e manter os dois dava a mesma informação duas vezes na mesma tela para quem não
           edita.
      */}
            <section
              id={ANCORA_DAS_DISCIPLINAS}
              aria-labelledby="titulo-das-disciplinas"
              className="flex flex-col gap-2"
              data-slot="disciplinas-da-turma"
            >
              <h2 id="titulo-das-disciplinas" className="text-texto text-base font-semibold">
                Disciplinas
              </h2>
              {naGrade.length === 0 ? (
                <p className="text-texto-suave text-sm" data-slot="turma-sem-grade">
                  Esta turma ainda não tem disciplinas na grade.
                </p>
              ) : (
                <DisciplinasDaTurma
                  linhas={naGrade}
                  turmaCodigo={turma.codigo as string}
                  escala={grade.escalaDeAntiguidade}
                  podeEditar={pode(permissoes, "disciplinas", "editar") && !arquivada}
                  avisoInicioDias={grade.avisoInicioDias}
                  hoje={hoje}
                  executadaDaTurma={andamento.executada}
                  {...(podeLerLancamento
                    ? {
                        foraDoDsa: {
                          porLinha: foraPorLinha,
                          podeGravar: pode(permissoes, "ta_fora_do_dsa", "editar") && !arquivada,
                        },
                      }
                    : {})}
                />
              )}
            </section>

            {/*
        ⚠️ **O FORMULÁRIO DESCEU E FICOU RECOLHIDO EM 05/10/2026** *(decisão de Bernardo, na
           conferência)*: a ficha abre para **ler** — cabeçalho, indicadores, andamento,
           disciplinas — e editar é um ato deliberado, atrás de *"Editar turma"*.
        ⚠️ **ELE CONTINUA SENDO A FICHA, e não uma rota `/editar`** (`FR-031.5` da spec 009): o
           que mudou é que ele não disputa mais a primeira tela com o que se lê. Uma rota
           separada faria navegar duas vezes para mudar um efetivo, que é o que aquele requisito
           recusou.
        ⚠️ **E O QUADRO DE AVISOS FICOU NO TOPO, não desceu com ele.** O cabeçalho de
           `QuadroDeAvisosDaTurma` dizia que ele vinha *"acima do formulário porque a pessoa
           precisa lê-lo antes de salvar"* — com o formulário no fim ele está acima de qualquer
           jeito, e acima de **tudo**, que é onde uma região de alertas pertence (`RNF-USA-04`).
      */}
            {podeEditar && !arquivada ? (
              <EdicaoDaTurma>
                <FormularioDeTurma
                  modo="edicao"
                  cursoId={cursoId}
                  codigoAtual={turma.codigo as string}
                  inicial={{
                    ano_letivo: texto(turma.ano_letivo),
                    status: turma.status as string,
                    modalidade: turma.modalidade as string,
                    turma: texto(turma.turma),
                    data_inicio: texto(turma.data_inicio),
                    data_termino: texto(turma.data_termino),
                    sala_alocada: texto(turma.sala_alocada),
                    alunos: texto(turma.alunos),
                    inicio_etapa_presencial: texto(turma.inicio_etapa_presencial),
                    termino_etapa_presencial: texto(turma.termino_etapa_presencial),
                    regime_de_horario_id: texto(turma.regime_de_horario_id),
                    curriculo_id: curriculoDaTurma?.id ?? "",
                  }}
                  regimeDeHorario={{
                    /* Os ativos, mais o atual se estiver inativo (C-11: ele continua valendo para a turma). */
                    opcoes: (regimesDoCursoRes.data ?? [])
                      .filter((r) => r.status === "ativo" || r.id === turma.regime_de_horario_id)
                      .map((r) => ({
                        id: r.id,
                        rotulo: rotuloDoRegime({
                          nome: r.nome,
                          regimeTempos: Number(r.regime_tempos),
                          taDuracaoMin: Number(r.ta_duracao_min),
                        }),
                        ativo: r.status === "ativo",
                      })),
                    /* ⚠️ A falha da leitura trava o campo: liberar a troca sem saber se há lançamento seria pior. */
                    travado: regimeTravadoRes.error ? true : regimeTravadoRes.data === true,
                  }}
                  /*
                   * Spec 021 (RC-4): os currículos que a turma pode seguir — os do seletor (sem arquivado), mais o
                   * atual. Trava com o regime: o mesmo "a turma já tem lançamento" (`app.turma_tem_lancamento_no_dsa`).
                   */
                  curriculo={{
                    opcoes: opcoesDoSeletor(
                      (curriculosDoCursoRes.data ?? []) as (CurriculoParaVigencia & {
                        id: string;
                      })[],
                      hoje,
                      false,
                    )
                      .filter(
                        (o) => o.situacao !== "passado" || o.curriculo.id === curriculoDaTurma?.id,
                      )
                      .map((o) => ({
                        id: o.curriculo.id,
                        rotulo: `${o.rotulo} — ${ROTULO_DA_SITUACAO[o.situacao]}`,
                      })),
                    travado:
                      regimeTravadoRes.error || curriculosDoCursoRes.error
                        ? true
                        : regimeTravadoRes.data === true,
                    comPadrao: false,
                  }}
                  salas={salas}
                  turmasDoCurso={outras}
                  limiteDoCurso={
                    cursoRes.data?.limite_turmas_ano === null ||
                    cursoRes.data?.limite_turmas_ano === undefined
                      ? null
                      : Number(cursoRes.data.limite_turmas_ano)
                  }
                  semRotuloNoAno={semRotuloNoAno}
                  vigenciasProtegidas={protegidas}
                  janelasDoCurso={janelas}
                />
              </EdicaoDaTurma>
            ) : null}
          </>
        }
      />
    </section>
  );
}

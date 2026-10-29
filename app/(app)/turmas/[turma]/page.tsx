/**
 * A ficha da turma (`FR-031`, `FR-041` da spec 009) — **só leitura** desde o Bloco 10 (spec 025, item 1).
 *
 * > *"Cabeçalho reestruturado: identificação limpa (turma, curso sigla + extenso, currículo + vigência, situação atual)
 * > sem o link solto "Turmas" nem o curso como botão de texto. Barra de ações no topo direito (RT-1): Abrir DSA ·
 * > Baixar planilha de contingência · Editar turma · Arquivar/Desarquivar · Excluir turma. (…) Cartões de andamento,
 * > tempos reserva e avaliações todos juntos, mesmo padrão (RT-7); depois histórico da situação, ficha e aba de
 * > avaliações."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **A EDIÇÃO SAIU DAQUI** (RT-3, D-1; emenda o *"NÃO HÁ `/editar`"* da spec 009, A-1): *Editar turma* leva a
 *    `/turmas/[turma]/editar`, onde um formulário edita a turma inteira, a situação inclusive. As leituras que só o
 *    formulário usava (salas, proteção de vigência, regimes, currículos, as turmas do curso) foram com ele.
 * ⚠️ **O CAMINHO DE VOLTA É A LATERAL** (A-3; emenda o `FR-020` da spec 012): o *"← Turmas"* solto saiu. O curso
 *    continua mostrado e alcançável pela identificação (`FR-031.5` da spec 009), como texto e não como botão.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** As folhas são as ações da barra, as abas e os diálogos.
 */
import Link from "next/link";

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { ExclusaoPermanente } from "@/components/ciaara/exclusao-permanente";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import {
  confirmarSugestao,
  definirTempoArbitrado,
  nomearUe,
} from "@/lib/acoes/avaliacoes-do-curriculo";
import { juntarComoSessao } from "@/lib/acoes/juntar-sessao";
import { gravarPrevistoProens } from "@/lib/acoes/previsto-proens";
import { excluirTurma } from "@/lib/acoes/turma";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { ROTULO_DA_MODALIDADE } from "@/lib/constantes/curso";
import {
  andamentoDaTurma,
  AVISO_DA_CONTAGEM_PRESENCIAL,
  contagemDaTurma,
  regimesDasSemanas,
} from "@/lib/dominio/andamento-da-turma";
import {
  estadoDoArquivamento,
  fraseDaTurmaArquivada,
  podeArquivar,
  podeDesarquivar,
  RECURSO_DO_ARQUIVAMENTO,
} from "@/lib/dominio/arquivamento-da-turma";
import { feriadosDaTurma } from "@/lib/dominio/calendario";
import { rotuloDoCurriculo } from "@/lib/dominio/curriculos";
import { AVISO_DE_TURMA_EAD, ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import { estadoDaExclusaoDaTurma } from "@/lib/dominio/exclusao-de-turma";
import { historicoDaTurma } from "@/lib/dominio/historico-da-turma";
import { regimeEfetivo, rotuloDoRegime } from "@/lib/dominio/regime-da-turma";
import { ROTULO_DO_STATUS_DE_TURMA, TOM_DO_STATUS_DE_TURMA } from "@/lib/dominio/seletor-de-turma";
import { execucaoSeparada, foraDoDsaAte } from "@/lib/dominio/ta-fora-do-dsa";
import { tetosDaTurma, type Categoria } from "@/lib/dominio/tetos-da-turma";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataParaLeitura } from "@/lib/formato/data";
import {
  ANCORA_DAS_DISCIPLINAS,
  enderecoDaEdicaoDaTurma,
  enderecoDaPlanilhaDeContingencia,
  enderecoDoCurriculoNoCurso,
  enderecoDoCurso,
  enderecoDoDsa,
  ROTA_DA_FICHA_DA_TURMA,
} from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../cursos/consulta";
import { lerGradeDeDisciplinas } from "../../disciplinas/consulta";
import { lerContagemPresencial } from "../contagem-presencial";
import { lerRegimesDasSemanas } from "../regimes-das-semanas";
import { AvisoDoRegimeNaoLido } from "../AvisoDoRegimeNaoLido";
import { AbasDaTurma } from "./AbasDaTurma";
import { ArquivarTurma } from "./ArquivarTurma";
import { AvaliacoesDaTurma } from "./AvaliacoesDaTurma";
import { type AutoriaDoPrevisto } from "./CardsDeTetos";
import {
  codigoDaFicha,
  COLUNAS_DA_CARGA_DA_TURMA,
  COLUNAS_DA_FICHA_DA_TURMA,
  COLUNAS_DO_REGIME_DO_CURSO,
  COLUNAS_DO_TA_FORA_DO_DSA,
  datasDeFeriado,
  deveLerFeriados,
  mensagemDeTurmaNaoEncontrada,
  regimeDoBanco,
  regimeEmbutido,
  registrosForaDoDsaDoBanco,
  type LinhaDoTaForaDoDsa,
  type RegistroForaDoDsaDaTela,
} from "./consulta";
import { lerAvaliacoesDaTurma } from "./consulta-de-avaliacoes";
import { DisciplinasDaTurma } from "./DisciplinasDaTurma";
import { podeBaixarPlanilhaDeContingencia } from "./dsa/planilha/acesso";
import { EdicaoDoPrevisto } from "./EdicaoDoPrevisto";
import { HistoricoDaTurma } from "./HistoricoDaTurma";
import { IndicadoresDaTurma } from "./IndicadoresDaTurma";
import { Rotulo } from "./Rotulo";
import {
  CHAVES_DOS_PARAMETROS_DOS_TETOS,
  COLUNAS_DO_PREVISTO,
  entradaDosTetos,
  parametroDoAno,
} from "./tetos";

/** A confirmação que a URL traz (`?gravada=`), escrita por `enderecoDaTurmaGravada`. */
const CONFIRMACAO: Readonly<Record<string, string>> = {
  situacao: "Situação gravada.",
  turma: "Alterações da turma gravadas.",
  arquivada: "Turma arquivada.",
  desarquivada: "Turma desarquivada.",
  "ta-fora": "TA fora do DSA registrado.",
  "ta-fora-desfeito": "Registro de TA fora do DSA desfeito.",
};

const SLOT_DA_CONFIRMACAO: Readonly<Record<string, string>> = {
  situacao: "situacao-gravada",
  turma: "turma-gravada",
  arquivada: "turma-arquivada-gravada",
  desarquivada: "turma-desarquivada-gravada",
  "ta-fora": "ta-fora-gravado",
  "ta-fora-desfeito": "ta-fora-desfeito-gravado",
};

export default async function FichaDaTurma({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);
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
  const podeExcluir = pode(permissoes, "turmas", "criar");
  const podeArquivarTurmas = pode(permissoes, RECURSO_DO_ARQUIVAMENTO, "editar");
  const cursoId = turma.curso_id as string;
  const turmaId = turma.id as string;

  /*
   * ⚠️ O "HOJE" É UM LIMITE DA CONSULTA: os feriados pedidos ao banco são os do intervalo `[hoje, término]`. Sem data de
   *    término não há intervalo, e a consulta nem sai (`deveLerFeriados`). Feriado de dia inteiro e ativo só
   *    (`RN-EVT-02`, regra 4).
   */
  const hoje = hojeNaCiaara();
  const dataTermino = turma.data_termino as string | null;
  const feriadosPromessa = deveLerFeriados(dataTermino)
    ? supabase
        .from("feriados")
        /* Spec 023 (D-4): com as turmas escolhidas — o feriado de outras turmas não desconta aqui. */
        .select(`data, ${COLUNAS_DA_ABRANGENCIA}`)
        .eq("impacto", "dia_inteiro")
        .eq("status", "ativo")
        .gte("data", hoje)
        .lte("data", dataTermino as string)
    : null;

  /* O TA fora do DSA só é lido por quem lê lançamento (`registros_aula.ler`): para os demais a RLS daria vazio. */
  const podeLerLancamento = pode(permissoes, "registros_aula", "ler");
  const foraPromessa = podeLerLancamento
    ? supabase
        .from("ta_fora_do_dsa")
        .select(COLUNAS_DO_TA_FORA_DO_DSA)
        .eq("turma_id", turmaId)
        .order("data", { ascending: false })
    : null;
  /* D-COR-6 (spec 025): o que prende a turma — só pergunta quem pode excluir; sem resposta, nunca liberado. */
  const impedimentosPromessa = podeExcluir
    ? supabase.rpc("impedimentos_de_exclusao_da_turma", { p_turma_id: turmaId })
    : null;

  const [
    cursoRes,
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
    contagensPresenciais,
    impedimentosRes,
    semanasDaTurma,
  ] = await Promise.all([
    supabase.from("cursos").select("codigo, nome_curso, status").eq("id", cursoId).maybeSingle(),
    /* A carga vem da MESMA view do `/inicio`: a CH curricular e os cartões de AEC, TAD e TR. */
    supabase
      .from("vw_carga_horaria_turma")
      .select(COLUNAS_DA_CARGA_DA_TURMA)
      .eq("turma_id", turmaId)
      .maybeSingle(),
    /* O TA/dia é o regime vigente do curso, escolhido pela modalidade da turma (`RN-MAT-04`). */
    supabase
      .from("vw_cursos_regime_vigente")
      .select(COLUNAS_DO_REGIME_DO_CURSO)
      .eq("curso_id", cursoId)
      .maybeSingle(),
    feriadosPromessa,
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
    /* A executada do andamento é a de ATÉ HOJE (D-COR-2), a mesma do `/inicio`. */
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }).eq("turma_id", turmaId).maybeSingle(),
    foraPromessa,
    /* D-COR-4 e D-COR-5: as duas trilhas da turma. */
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
    /* Spec 024 (FR-020): a etapa presencial das semipresenciais. */
    lerContagemPresencial(supabase, hoje),
    impedimentosPromessa,
    /* Spec 029 (`FR-005`): o regime das semanas do DSA desta turma — o saldo soma o TA/dia da semana de cada dia. */
    lerRegimesDasSemanas(supabase, { hoje, turmaId }),
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

  /* ⚠️ ERRO DE LEITURA DEGRADA, NÃO ESTOURA (`RN-DEG-01`): sem a executada de até hoje, o andamento sai sem carga. */
  const cargaDoAndamento = executadaRes.error ? null : cargaRes.data;
  const regimeDaFicha = regimeEmbutido(turma.regime);
  const regimeDoCursoHoje = regimeDoBanco(regimeRes.data ?? null);
  const contagem = contagemDaTurma(
    {
      modalidade: turma.modalidade as string,
      dataTermino,
      prevista: Number(cargaDoAndamento?.chr_curricular ?? 0),
      executada: Number(
        cargaDoAndamento === null || cargaDoAndamento === undefined
          ? 0
          : ((executadaRes.data as { chd_executada: number } | null)?.chd_executada ?? 0),
      ),
    },
    contagensPresenciais.get(turmaId) ?? null,
  );
  const andamento = andamentoDaTurma(
    {
      status: turma.status as string,
      modalidade: turma.modalidade as string,
      dataTermino: contagem.dataTermino,
      inicioDaCapacidade: contagem.inicioDaCapacidade,
      prevista: contagem.prevista,
      executada: contagem.executada,
    },
    /* Spec 018 (C-9): o regime nomeado da turma troca os TA presenciais; o limite EAD fica (`RN-MAT-04`). */
    regimeEfetivo(
      regimeDoCursoHoje,
      regimeDaFicha ? { regimeTempos: Number(regimeDaFicha.regime_tempos) } : null,
    ),
    datasDeFeriado(
      feriadosDaTurma(linhasComAbrangencia<{ data: string }>(feriadosRes?.data), turmaId),
    ),
    hoje,
    /* Spec 029 (`FR-005`, D-12): o regime de cada semana, com o padrão de hoje do curso como o «do curso». */
    regimesDasSemanas(semanasDaTurma.porTurma.get(turmaId), regimeDoCursoHoje),
  );
  /*
   * Spec 029 (`FR-005`; revisão do Bloco 14, achado 7): sem o regime das semanas, o saldo acima sai pela conta de antes
   *    (um TA/dia só) — e a ficha diz isso. A turma EAD puro não tem saldo (`controle_da_dead`): nada a avisar.
   */
  const regimeNaoLido = !semanasDaTurma.lido && !ehEadPuro(turma.modalidade as string | null);

  /* Spec 021 (RC-4): a turma segue o SEU currículo — disciplinas, duração, avaliações. */
  const curriculoDaTurma =
    (
      turma as unknown as {
        curriculo?: { id?: string; versao?: number; vigente_de?: string } | null;
      }
    ).curriculo ?? null;
  const grade = await lerGradeDeDisciplinas({
    cursoCodigo: sigla,
    turmaCodigo: codigo,
    curriculoId: curriculoDaTurma?.id ?? null,
  });
  const naGrade = grade.linhas.filter((l) => l.turmaDisciplinaId !== null);

  /* Os cartões de AEC, TAD e TR saem de `tetosDaTurma`, o único lugar que decide teto (SC-003). */
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

  /* Os nomes de quem alterou o previsto, registrou o TA fora do DSA, trocou a situação e arquivou: uma leitura só. */
  const autores = [
    ...new Set(
      [
        ...previstos.map((p) => p.editado_por ?? p.criado_por),
        ...linhasDoForaDoDsa.map((f) => f.criado_por),
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

  /* D-COR-3: a executada até hoje já soma o fora do DSA; aqui só se diz quanto dela está fora. */
  const registrosForaDoDsa = registrosForaDoDsaDoBanco(linhasDoForaDoDsa, nomesDosAutores);
  const foraDoDsaAteHoje = foraDoDsaAte(registrosForaDoDsa, hoje);
  const separada =
    foraDoDsaAteHoje > 0
      ? execucaoSeparada({ total: andamento.executada, foraDoDsa: foraDoDsaAteHoje }).texto
      : null;
  const foraPorLinha: Record<string, RegistroForaDoDsaDaTela[]> = {};
  for (const r of registrosForaDoDsa) (foraPorLinha[r.turmaDisciplinaId] ??= []).push(r);

  /* ⚠️ A TURMA ARQUIVADA É SOMENTE LEITURA (D-COR-5, C-4): nada de gravar — nem editar, nem excluir. */
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

  /* O ícone *Editar* do previsto, no canto de cada cartão (D-8): registro próprio, permissão própria. */
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

  // Spec 014, PR 5 (FR-055 a FR-058): o quadro de avaliações. Turma EAD puro não tem DSA nem avaliação lançada.
  const avaliacoes = ehEadPuro(turma.modalidade as string | null)
    ? null
    : await lerAvaliacoesDaTurma({
        turmaId,
        cursoId,
        /* Spec 021 (RC-4): as avaliações do currículo DA TURMA. */
        curriculoId: curriculoDaTurma?.id ?? null,
        hoje,
        terminoDaTurma: dataTermino,
        turmaCodigo: codigo,
      });

  /* D-COR-6 (spec 025, D-13): sem resposta do banco, desabilitado — nunca liberado. */
  const estadoDaExclusao = estadoDaExclusaoDaTurma(
    impedimentosRes === null || impedimentosRes.error
      ? null
      : ((impedimentosRes.data as string[] | null) ?? []),
  );
  const cursoEmOferta = cursoRes.data?.status !== "inativo";
  const ead = ehEadPuro(turma.modalidade as string | null);
  const texto = (v: string | number | null) => (v === null || v === "" ? "—" : String(v));
  const confirmacao = CONFIRMACAO[String(valores.gravada)];

  return (
    <section className="flex flex-col gap-5">
      {arquivada ? (
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

      {/*
        ⚠️ A IDENTIFICAÇÃO E A BARRA NA MESMA LINHA (RT-1, D-4): a turma, o curso (sigla e extenso), o currículo com a
           vigência e a situação, à esquerda; as ações, à direita, na ordem do pedido — o destrutivo por último.
      */}
      <header
        className="flex flex-wrap items-start justify-between gap-3"
        data-slot="cabecalho-da-turma"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-xl font-semibold" data-slot="codigo-da-turma">
            {turma.codigo}
          </h1>
          <dl
            className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm"
            data-slot="identificacao-da-turma"
          >
            <Rotulo>Curso</Rotulo>
            <dd className="text-texto">
              {sigla ? (
                <Link
                  href={enderecoDoCurso(sigla)}
                  className="text-texto underline-offset-2 hover:underline"
                  data-slot="curso-da-turma"
                >
                  {sigla} — {cursoRes.data?.nome_curso as string}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <Rotulo>Currículo</Rotulo>
            <dd className="text-texto" data-slot="curriculo-da-turma">
              {sigla && curriculoDaTurma?.versao !== undefined && curriculoDaTurma.vigente_de ? (
                <Link
                  href={enderecoDoCurriculoNoCurso(sigla, curriculoDaTurma.versao)}
                  className="text-texto underline-offset-2 hover:underline"
                >
                  {rotuloDoCurriculo({
                    versao: curriculoDaTurma.versao,
                    vigente_de: curriculoDaTurma.vigente_de,
                  })}
                  , vigente desde {dataParaLeitura(curriculoDaTurma.vigente_de)}
                </Link>
              ) : (
                "—"
              )}
            </dd>
            <Rotulo>Situação</Rotulo>
            <dd className="flex items-center gap-2">
              <BadgeStatus
                tom={TOM_DO_STATUS_DE_TURMA[turma.status as string] ?? "planejado"}
                rotulo={
                  ROTULO_DO_STATUS_DE_TURMA[turma.status as string] ?? (turma.status as string)
                }
              />
              {arquivada ? <BadgeStatus tom="inativo" rotulo="Arquivada" /> : null}
            </dd>
          </dl>
        </div>

        <BarraDeAcoes rotulo="Ações da turma">
          {/*
            ⚠️ O DSA SEGUE A PERMISSÃO DA PÁGINA DE DESTINO (`registros_aula.ler`). A turma EAD puro não tem DSA nem
               planilha: o aviso dela fica nos cartões.
          */}
          {ead ? null : (
            <SePodeVer permissoes={permissoes} recurso="registros_aula" acao="ler">
              <BotaoDeIcone
                acao="abrir-dsa"
                rotulo="Abrir o DSA"
                href={enderecoDoDsa(turma.codigo as string)}
                data-slot="abrir-o-dsa"
              />
            </SePodeVer>
          )}
          {podeBaixarPlanilhaDeContingencia(permissoes, turma.modalidade as string | null) ? (
            <BotaoDeIcone
              acao="baixar"
              rotulo="Baixar planilha de contingência"
              nativo
              href={enderecoDaPlanilhaDeContingencia(turma.codigo as string)}
              data-slot="baixar-planilha-de-contingencia"
            />
          ) : null}
          {podeEditar && !arquivada && cursoEmOferta ? (
            <BotaoDeIcone
              acao="editar"
              rotulo="Editar turma"
              href={enderecoDaEdicaoDaTurma(turma.codigo as string)}
              data-slot="editar-turma"
            />
          ) : null}
          {podeArquivar({ podeArquivarTurmas, arquivada }) ||
          podeDesarquivar({ podeArquivarTurmas, arquivada }) ? (
            <ArquivarTurma
              codigo={turma.codigo as string}
              situacao={turma.status as string}
              arquivada={arquivada}
            />
          ) : null}
          {/* A arquivada tem o registro do arquivamento: o caminho dela é desarquivar, não excluir (como nas listas). */}
          {podeExcluir && !arquivada ? (
            <ExclusaoPermanente
              id={turmaId}
              codigo={turma.codigo as string}
              nomeDoCodigo="o código da turma"
              rotulo={`Excluir a turma ${turma.codigo as string}`}
              titulo={`Excluir a turma ${turma.codigo as string} permanentemente?`}
              consequencia="A turma sai do sistema, com as linhas da grade, as atribuições de instrutor e o rateio. Só é possível porque ela não tem registro: nenhum lançamento, semana do DSA salva ou publicada, troca de situação nem arquivamento."
              estado={estadoDaExclusao}
              excluir={excluirTurma}
              depois="navegar"
              slot="excluir-turma"
            />
          ) : null}
        </BarraDeAcoes>
      </header>

      {confirmacao ? (
        <p
          role="status"
          className="text-executado-tinta text-sm"
          data-slot={SLOT_DA_CONFIRMACAO[String(valores.gravada)]}
        >
          {confirmacao}
          {valores.gravada === "situacao"
            ? ` ${ROTULO_DO_STATUS_DE_TURMA[turma.status as string] ?? (turma.status as string)}.`
            : ""}
        </p>
      ) : null}

      {regimeNaoLido ? <AvisoDoRegimeNaoLido /> : null}

      <IndicadoresDaTurma
        andamento={andamento}
        dataTermino={dataTermino}
        execucaoSeparada={separada}
        avisoDaContagem={
          contagem.aviso === null ? null : AVISO_DA_CONTAGEM_PRESENCIAL[contagem.aviso]
        }
        tetos={tetos}
        ano={ano}
        autoria={autoria}
        {...(edicao ? { edicao } : {})}
        avaliacoes={avaliacoes?.quadro?.contagem ?? null}
        turmaCodigo={turma.codigo as string}
      />

      <HistoricoDaTurma eventos={historico} />

      {/*
        ⚠️ AS ABAS FICAM DEPOIS DO HISTÓRICO (item 1): a *Ficha* tem os dados da turma e as disciplinas; a
           *Avaliações*, o quadro por disciplina. A URL é dona da aba (`aba`).
      */}
      <AbasDaTurma
        avaliacoes={
          avaliacoes ? (
            <AvaliacoesDaTurma
              quadro={avaliacoes.quadro}
              aviso={avaliacoes.aviso}
              turmaId={turmaId}
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
            /* Só a turma EAD puro chega aqui: ela não tem DSA nem avaliação lançada. */
            <p className="text-texto-suave text-sm" data-slot="avaliacoes-turma-ead">
              {AVISO_DE_TURMA_EAD}
            </p>
          )
        }
        ficha={
          <>
            {/* D-4: o que saiu da identificação — modalidade, período, sala, efetivo e regime — é dado da ficha. */}
            <section
              aria-labelledby="titulo-dos-dados-da-turma"
              className="flex flex-col gap-2"
              data-slot="dados-da-turma"
            >
              <h2 id="titulo-dos-dados-da-turma" className="text-texto text-base font-semibold">
                Dados da turma
              </h2>
              <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span className="flex items-center gap-2">
                  <Rotulo>Modalidade</Rotulo>
                  <dd className="text-texto">
                    {ROTULO_DA_MODALIDADE[turma.modalidade as string] ??
                      (turma.modalidade as string)}
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
                  <dd className="text-texto">{texto(turma.sala_alocada)}</dd>
                </span>
                <span className="flex items-center gap-2">
                  <Rotulo>Efetivo</Rotulo>
                  <dd className="text-texto">{texto(turma.alunos)}</dd>
                </span>
                <span className="flex items-center gap-2">
                  <Rotulo>Regime de horário</Rotulo>
                  <dd className="text-texto" data-slot="regime-da-ficha">
                    {regimeDaFicha
                      ? rotuloDoRegime({
                          nome: regimeDaFicha.nome as string,
                          regimeTempos: Number(regimeDaFicha.regime_tempos),
                          taDuracaoMin: Number(regimeDaFicha.ta_duracao_min),
                        })
                      : "o vigente do curso"}
                  </dd>
                </span>
                {turma.modalidade === "semipresencial" ? (
                  <span className="flex items-center gap-2">
                    <Rotulo>Etapa presencial</Rotulo>
                    <dd className="text-texto">
                      {turma.inicio_etapa_presencial
                        ? `${dataParaLeitura(turma.inicio_etapa_presencial)} a ${dataParaLeitura(turma.termino_etapa_presencial)}`
                        : "não cadastrada"}
                    </dd>
                  </span>
                ) : null}
              </dl>
            </section>

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
                <>
                  {/*
                    ⚠️ **A LEITURA DOS HABILITADOS QUE FALHOU É DITA** (D-16 da spec 029; `RN-DEG-01`): até 28/10/2026
                       o erro era descartado, a lista chegava vazia, e o detalhe de cada disciplina dizia *"Nenhum
                       instrutor habilitado"*. A faixa diz a falha; o detalhe também (`habilitadosLidos`).
                  */}
                  {grade.habilitadosLidos ? null : (
                    <p
                      role="status"
                      className="text-atrasado-tinta text-sm"
                      data-slot="habilitados-indisponiveis"
                    >
                      Não foi possível ler os instrutores habilitados nas disciplinas. As listas de
                      instrutor do detalhe saem vazias até a leitura voltar — recarregue a página;
                      se continuar, avise o suporte.
                    </p>
                  )}
                  <DisciplinasDaTurma
                    linhas={naGrade}
                    turmaCodigo={turma.codigo as string}
                    escala={grade.escalaDeAntiguidade}
                    podeEditar={pode(permissoes, "disciplinas", "editar") && !arquivada}
                    avisoInicioDias={grade.avisoInicioDias}
                    hoje={hoje}
                    executadaDaTurma={andamento.executada}
                    /*
                     * FR-006 da spec 029: o «você não vê» das listas de instrutor decide-se AQUI, no servidor — a RLS
                     * de `instrutores` e `instrutor_disciplina` é `app.pode('instrutores','ler')`, tudo ou nada.
                     */
                    podeLerInstrutores={pode(permissoes, "instrutores", "ler")}
                    habilitadosLidos={grade.habilitadosLidos}
                    {...(podeLerLancamento
                      ? {
                          foraDoDsa: {
                            porLinha: foraPorLinha,
                            podeGravar: pode(permissoes, "ta_fora_do_dsa", "editar") && !arquivada,
                          },
                        }
                      : {})}
                  />
                </>
              )}
            </section>
          </>
        }
      />
    </section>
  );
}

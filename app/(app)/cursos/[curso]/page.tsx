/**
 * A página do curso (`RF-CURSO-01`, `FR-006` a `FR-011`, `FR-031.4`).
 *
 * ⚠️ **SÓ LEITURA, NO CURRÍCULO VIGENTE** (spec 021, Bloco 6, ajustes 1 e 2 da conferência do PR #82, Bernardo Villas
 * Boas, 21/10/2026): as abas mostram o currículo vigente hoje, sem ação de edição — criar e editar currículo, disciplina,
 * UE, avaliação, horário e limite mora em *Editar curso*. A aba *Currículo* lista todos e consulta cada um.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** As abas e o seletor de turma são folhas; o conteúdo das duas abas é
 * desenhado aqui, no servidor, e passado pronto.
 *
 * ⚠️ **`Promise.all` DE CONSULTAS INDEPENDENTES, NUNCA UMA POR TURMA** (`FR-012`). Curso, turmas,
 * regime vigente, disciplinas e avaliações saem numa rodada só.
 *
 * ⚠️ **NÃO ENCONTRADO DEPENDE DO PERFIL** (`FR-031.4`). Para quem alcança tudo, o curso não existe;
 * para quem tem recorte, ele pode existir e estar fora do alcance — e a RLS não diz qual dos dois é.
 *
 * ⚠️ **NENHUM ACESSO A AVALIAÇÕES NEM A RELATÓRIO** (`FR-008`, A-4). Nem link, nem botão, nem marca
 * *"em breve"*: *"a tela não anuncia o que não entrega"*. A reserva das duas rotas em `FORA_DO_MENU`
 * continua valendo — ela diz que o menu não as terá, não que esta página já as mostra.
 */
import { estadosPorRegistro, type ImpedimentosDoRegistro } from "@/lib/dominio/exclusao-permanente";
import { redirect } from "next/navigation";

import { SeletorDeAno } from "@/components/ciaara/seletor-de-ano";
import { excluirTurma } from "@/lib/acoes/turma";
import { curriculoDeReferencia } from "@/lib/dominio/ano-escolhido";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import { estadoDaExclusaoDaTurma } from "@/lib/dominio/exclusao-de-turma";
import { RECURSO_DO_ARQUIVAMENTO } from "@/lib/dominio/arquivamento-da-turma";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  curriculoDaPagina,
  curriculoVigenteEm,
  versaoDoAnoEscolhido,
  opcoesDoSeletor,
  rotuloDoCurriculo,
  ROTULO_DA_SITUACAO,
} from "@/lib/dominio/curriculos";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../consulta";
import { AbaCurriculo, type CurriculoNaLista } from "./AbaCurriculo";
import { AbaTurmas, type TurmaDaAba } from "./AbaTurmas";
import { BarraDoCurso } from "./BarraDoCurso";
import { AbaSobre } from "./AbaSobre";
import { RegrasDeAvaliacao, type AvaliacaoPrevista } from "./RegrasDeAvaliacao";
import { AbaAvaliacoes } from "./AbaAvaliacoes";
import { AbasDoCurso } from "./AbasDoCurso";
import { lerAvaliacoesDoCurso } from "../../turmas/[turma]/consulta-de-avaliacoes";
import { CabecalhoDoCurso } from "./CabecalhoDoCurso";
import {
  COLUNAS_DAS_TURMAS_DO_CURSO,
  COLUNAS_DA_PAGINA_DO_CURSO,
  SEM_CURRICULO,
  mensagemDeCursoNaoEncontrado,
  resolverTurmaSelecionada,
  type CurriculoDaPagina,
} from "./consulta";
import type { LinhaDoLimite } from "./BlocoDeLimites";
import { AbaAtividades } from "./AbaAtividades";
import { AbaHorarios } from "./AbaHorarios";
import { lerHorariosDoCurso, type HorariosDoCurso } from "./consulta-de-horarios";
import { RegimesDoCurso } from "./RegimesDoCurso";
import { GradeDeDisciplinas } from "../../disciplinas/GradeDeDisciplinas";
import { lerGradeDeDisciplinas } from "../../disciplinas/consulta";
import type { TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { limiteMaximo } from "@/lib/dominio/limite-maximo";
import { parametroDoAno } from "../../turmas/[turma]/tetos";

/** Hoje em `yyyy-mm-dd`, no fuso de apresentação. Entra como argumento nas funções puras. */
/* ⚠️ A cópia local saiu em 04/10/2026: `hojeNaCiaara()` é a mesma conta, num lugar só. */
const hojeEmSaoPaulo = hojeNaCiaara;

/* Ajuste 1 da conferência do PR #82 (spec 021): a página do curso é só leitura — nenhuma ação de edição nas abas. */
const SO_LEITURA = { criar: false, editar: false, desativar: false } as const;

export default async function PaginaDoCurso({
  params,
  searchParams,
}: {
  params: Promise<{ curso: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { curso: segmento } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmento);
  const busca = await searchParams;
  /*
   * Spec 022 (Bloco 7, FR-005.1, D-12): a aba *Grade* passou a *Turmas*. O endereço antigo — guardado em favorito, num
   * e-mail, num roteiro — redireciona com o resto da consulta (a turma escolhida inclusive), em vez de cair na aba padrão.
   */
  if (busca.aba === "grade") {
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(busca)) {
      for (const v of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) {
        consulta.append(chave, chave === "aba" ? "turmas" : v);
      }
    }
    redirect(`/cursos/${encodeURIComponent(sigla)}?${consulta.toString()}`);
  }
  const { valores } = lerParametros("/cursos/[curso]", busca);

  const supabase = await criarClienteDeServidor();
  const usuario = await usuarioDaSessao();
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);

  const { data: curso, error } = await supabase
    .from("cursos")
    .select(COLUNAS_DA_PAGINA_DO_CURSO)
    .eq("codigo", sigla)
    .maybeSingle();

  if (error || !curso) {
    /*
     * ⚠️ ERRO DE LEITURA E CURSO AUSENTE CAEM NA MESMA FRASE, e é correto: a negativa da RLS chega
     * como lista vazia, sem erro (gotcha nº 4). Distinguir aqui exigiria afirmar sobre o que não foi
     * medido.
     */
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Curso</h1>
        <p role="status" className="text-texto" data-slot="curso-nao-encontrado">
          {mensagemDeCursoNaoEncontrado(sigla, alcance)}
        </p>
      </section>
    );
  }

  /*
   * ⚠️ SPEC 021 (Bloco 6, RC-1; ajuste 1 da conferência do PR #82): o propósito, a duração, o PDF, as disciplinas, as
   *    regras de avaliação, os limites e os horários são do CURRÍCULO — e a página mostra o VIGENTE hoje. Com um
   *    currículo por curso, o mesmo conteúdo que ela mostrava pelo curso. Os outros se consultam na aba *Currículo*.
   */
  const hoje = hojeEmSaoPaulo();
  /*
   * ⚠️ RT-6 (spec 025, D-26 e D-27): a página segue o ANO ESCOLHIDO — a aba Turmas lista só as turmas dele, e o currículo
   *    mostrado é o vigente nele (hoje, no ano corrente; 1º de janeiro, nos outros). As abas de consulta do currículo
   *    continuam podendo abrir qualquer um (`?curriculo=N`).
   */
  const escolha = await anoEscolhido(String(valores.ano), hoje);
  const referencia = curriculoDeReferencia(escolha.ano, hoje);
  const curriculosDoCurso = ((curso as unknown as { curriculos?: CurriculoDaPagina[] })
    .curriculos ?? []) as CurriculoDaPagina[];
  const curriculo = curriculoVigenteEm(curriculosDoCurso, referencia);
  const curriculoId = curriculo?.id ?? SEM_CURRICULO;
  /*
   * O número do currículo mostrado, SÓ quando ele não é o vigente hoje (outro ano no seletor): o PDF e o *Editar* dos
   * horários vão a ele, e não ao de hoje (revisão do PR #90). No caso comum o endereço fica o de sempre.
   */
  const versaoDoAno = versaoDoAnoEscolhido(curriculosDoCurso, referencia, hoje);
  /* A aba *Currículo*: o consultado (`?curriculo=N`), ou o vigente — com o aviso quando o pedido não serve. */
  const escolhaDaConsulta = curriculoDaPagina(curriculosDoCurso, String(valores.curriculo), hoje);
  const consultado = escolhaDaConsulta.curriculo;
  const consultadoId = consultado?.id ?? SEM_CURRICULO;

  const [
    turmasRes,
    regimeRes,
    disciplinasRes,
    avaliacoesRes,
    permissoes,
    limitesRes,
    parametrosRes,
    arquivadasRes,
  ] = await Promise.all([
    supabase
      .from("turmas")
      .select(COLUNAS_DAS_TURMAS_DO_CURSO)
      .eq("curso_id", curso.id as string)
      .order("ano_letivo", { ascending: false })
      .order("codigo", { ascending: true }),
    supabase
      .from("vw_cursos_regime_vigente")
      .select(
        "regime_padrao_tempos, ta_padrao_duracao_min, hora_inicio_manha, hora_inicio_tarde, limite_diario_ead_horas",
      )
      .eq("curso_id", curso.id as string)
      .maybeSingle(),
    supabase
      .from("disciplinas")
      .select("carga_horaria_tempos")
      .eq("curriculo_id", curriculoId)
      .eq("status", "ativo"),
    supabase
      .from("avaliacoes_planejadas")
      .select("nome_disciplina, descricao_instrumentos, carater, formula_mf")
      .eq("curriculo_id", curriculoId)
      .eq("status", "ativo")
      .order("nome_disciplina", { ascending: true }),
    permissoesDoPerfil(usuario?.perfil ?? null),
    /*
     * ⚠️ **OS LIMITES DO CURSO E AS TURMAS EXCEDIDAS** (spec 014, PR 2, `FR-009`, `FR-005`): quatro
     *    leituras na MESMA rodada; o veredito de cada turma sai de `tetosDaTurma`, em memória.
     */
    supabase
      .from("limites_curriculo")
      .select("categoria, tempos, fonte_pagina")
      .eq("curriculo_id", curriculoId)
      .eq("status", "ativo"),
    supabase
      .from("config_parametros")
      .select("chave, valor, ano_vigencia")
      .in("chave", [
        "teto.aec_percentual_chr",
        "teto.tad_percentual_chr",
        "teto.tr_percentual_chr",
        // Spec 018 (C-6): a referência do Estudo Individual, informativa, na aba Atividades.
        "estudo_obrig_com_regime_pct",
        "estudo_obrig_sem_regime_pct",
      ])
      .eq("status", "ativo"),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some da aba Grade, do seletor e da pré-seleção. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
  ]);

  /*
   * ⚠️ **A ARQUIVADA SOME DO SELETOR E DA PRÉ-SELEÇÃO** (D-COR-5; C-24). Os avisos do curso e as turmas com teto
   *    excedido saíram desta página no Bloco 7 (spec 022, FR-004.4): moram na página Avisos, pelo sininho.
   */
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const todasAsTurmas = turmasRes.data ?? [];
  /*
   * ⚠️ SPEC 021 (RC-9): a lista da aba Grade mostra TODAS as turmas, inclusive as arquivadas, cada uma com o currículo
   *    que segue; o seletor de turma e a pré-seleção continuam sem as arquivadas (C-24 da spec 017).
   */
  const rotuloDoCurriculoPorId = new Map(
    curriculosDoCurso.map((c) => [c.id, rotuloDoCurriculo(c)] as const),
  );
  const doAno = todasAsTurmas.filter((t) => Number(t.ano_letivo) === escolha.ano);
  const turmasDaLista: TurmaDaAba[] = doAno.map((t) => ({
    id: t.id as string,
    codigo: t.codigo as string,
    rotulo: t.turma,
    ano: Number(t.ano_letivo),
    status: t.status as string,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
    sala: t.sala_alocada,
    alunos: t.alunos === null ? null : Number(t.alunos),
    /*
     * ⚠️ `sem_disciplina` PRECISARIA DE UMA CONSULTA POR TURMA para ser exato, e o `FR-012` proíbe.
     * Nesta fatia a grade da turma não é lida; declarar 1 mantém o aviso silencioso em vez de acusar
     * todas as turmas de estarem sem disciplina — acusar errado é pior que não acusar (`RN-DEG-02`).
     * A contagem exata entra com a fatia que ler `turma_disciplina`.
     */
    disciplinasAtivas: 1,
    curriculo: rotuloDoCurriculoPorId.get(t.curriculo_id as string) ?? null,
    arquivada: arquivadas.has(t.id as string),
  }));
  const turmas = turmasDaLista.filter((t) => !t.arquivada);

  const selecao = resolverTurmaSelecionada(
    turmas.map((t) => ({
      codigo: t.codigo,
      status: t.status,
      dataInicio: t.dataInicio,
      dataTermino: t.dataTermino,
    })),
    String(valores.turma),
    hoje,
  );

  /*
   * ⚠️ **CADA ABA LÊ SÓ QUANDO ABERTA** (spec 018): as outras não pagam a consulta.
   * ⚠️ **A ABA AVALIAÇÕES LÊ SEM TURMA** (spec 018, FR-002, C-4): só o currículo do curso. Até o Bloco 3 ela lia a
   *    turma da Grade e mostrava o cumprido — acompanhamento de turma, que mora na ficha da turma.
   */
  const aba = String(valores.aba);
  const naConsulta = aba === "curriculo" && consultado !== null;
  const turmasPorRegime = todasAsTurmas.map((t) => ({
    codigo: t.codigo as string,
    regimeId: (t.regime_de_horario_id as string | null) ?? null,
  }));
  /* D-COR-6 (spec 025): o que prende cada turma da lista, numa ida só — e só para quem pode excluir. */
  const podeExcluirTurma = pode(permissoes, "turmas", "criar");
  const idsDaLista = turmasDaLista.map((t) => t.id);
  const [
    avaliacoesDoCurso,
    gradeDeDisciplinas,
    horariosDoCurso,
    tiposRes,
    consultaRes,
    impedimentosRes,
  ] = await Promise.all([
    aba === "avaliacoes"
      ? lerAvaliacoesDoCurso({
          cursoId: curso.id as string,
          turmaCodigo: null,
          hoje,
          curriculoId,
        })
      : Promise.resolve({ quadro: null, aviso: null }),
    aba === "disciplinas"
      ? lerGradeDeDisciplinas({
          cursoCodigo: curso.codigo as string,
          turmaCodigo: "",
          curriculoId,
        })
      : Promise.resolve(null),
    aba === "horarios"
      ? lerHorariosDoCurso({ cursoId: curso.id as string, curriculoId, turmas: turmasPorRegime })
      : Promise.resolve(null),
    aba === "atividades" || naConsulta
      ? supabase
          .from("config_listas")
          .select("id, valor, ativo, metadados")
          .eq("lista", "tipos_atividade")
          .order("ordem")
      : Promise.resolve({ data: [] }),
    /* Ajuste 2: a consulta do currículo escolhido na aba *Currículo* — os mesmos leitores das outras abas. */
    naConsulta
      ? Promise.all([
          lerGradeDeDisciplinas({
            cursoCodigo: curso.codigo as string,
            turmaCodigo: "",
            curriculoId: consultadoId,
          }),
          lerAvaliacoesDoCurso({
            cursoId: curso.id as string,
            turmaCodigo: null,
            hoje,
            curriculoId: consultadoId,
          }),
          lerHorariosDoCurso({
            cursoId: curso.id as string,
            curriculoId: consultadoId,
            turmas: turmasPorRegime,
          }),
          supabase
            .from("limites_curriculo")
            .select("categoria, tempos, fonte_pagina")
            .eq("curriculo_id", consultadoId)
            .eq("status", "ativo"),
          supabase
            .from("disciplinas")
            .select("carga_horaria_tempos")
            .eq("curriculo_id", consultadoId)
            .eq("status", "ativo"),
        ])
      : Promise.resolve(null),
    aba === "turmas" && podeExcluirTurma && idsDaLista.length > 0
      ? supabase.rpc("impedimentos_de_exclusao_das_turmas", { p_turmas: idsDaLista })
      : Promise.resolve(null),
  ]);
  /* Sem resposta do banco, cada turma fica com o *Excluir* desabilitado (D-13): a chave ausente diz "não lido". */
  const exclusaoDasTurmas = estadosPorRegistro(
    impedimentosRes === null || impedimentosRes.error
      ? null
      : ((impedimentosRes.data ?? []) as ImpedimentosDoRegistro[]),
    estadoDaExclusaoDaTurma,
  );

  /* Spec 022 (FR-005.2): a grade curricular saiu de *Sobre o Curso*; as disciplinas lidas aqui dão a CH curricular. */
  const disciplinas = (disciplinasRes.data ?? []).map((d) => ({
    cargaHorariaTempos: d.carga_horaria_tempos === null ? null : Number(d.carga_horaria_tempos),
  }));

  const avaliacoes: AvaliacaoPrevista[] = (avaliacoesRes.data ?? []).map((a) => ({
    disciplina: a.nome_disciplina as string,
    instrumentos: a.descricao_instrumentos,
    carater: a.carater,
    formulaMf: a.formula_mf,
  }));

  const regime = regimeRes.data
    ? {
        tempos:
          regimeRes.data.regime_padrao_tempos === null
            ? null
            : Number(regimeRes.data.regime_padrao_tempos),
        duracaoTaMin:
          regimeRes.data.ta_padrao_duracao_min === null
            ? null
            : Number(regimeRes.data.ta_padrao_duracao_min),
        horaInicioManha: regimeRes.data.hora_inicio_manha,
        horaInicioTarde: regimeRes.data.hora_inicio_tarde,
        limiteDiarioEadHoras:
          regimeRes.data.limite_diario_ead_horas === null
            ? null
            : Number(regimeRes.data.limite_diario_ead_horas),
      }
    : null;

  const cursoAtivo = curso.status === "ativo";

  /*
   * ⚠️ **A CH CURRICULAR DO CURSO É A SOMA DAS DISCIPLINAS ATIVAS** que esta página já lê — a mesma
   *    base de `vw_carga_horaria_turma.chr_curricular`; o ano do percentual é o de hoje.
   */
  const anoDosLimites = escolha.ano;
  const chCurricular = disciplinas.reduce((s, d) => s + (d.cargaHorariaTempos ?? 0), 0) || null;
  const limitesDe = (
    declarados: readonly { categoria: string; tempos: number; fonte_pagina: number | null }[],
    ch: number | null,
  ): LinhaDoLimite[] =>
    (["AEC", "TAD", "TR"] as const).map((sigla) => {
      const declarado = declarados.find((l) => l.categoria === sigla);
      const percentual = parametroDoAno(
        parametrosRes.data ?? [],
        `teto.${sigla.toLowerCase()}_percentual_chr`,
        anoDosLimites,
      );
      return {
        sigla,
        limite: limiteMaximo({
          declarado: declarado ? Number(declarado.tempos) : null,
          chCurricular: ch,
          percentual,
        }),
        pagina: declarado?.fonte_pagina ?? null,
        percentual,
        chCurricular: ch,
      };
    });
  const linhasDosLimites = limitesDe(
    (limitesRes.data ?? []) as { categoria: string; tempos: number; fonte_pagina: number | null }[],
    chCurricular,
  );

  /*
   * Ajuste 3 (conferência do PR #82): *Editar curso* é onde o currículo inteiro se edita — então quem edita disciplina
   * ou horário também chega lá. O botão segue a permissão da página de destino.
   */
  const podeAbrirEdicao =
    pode(permissoes, "cursos", "editar") ||
    pode(permissoes, "horarios", "criar") ||
    pode(permissoes, "horarios", "editar") ||
    pode(permissoes, "disciplinas", "criar") ||
    pode(permissoes, "disciplinas", "editar");

  /* Ajuste 2: a lista da aba *Currículo* — todos, os arquivados também, do mais novo ao mais antigo. */
  const turmasPorCurriculo = new Map<string, number>();
  for (const t of todasAsTurmas) {
    const id = t.curriculo_id as string;
    turmasPorCurriculo.set(id, (turmasPorCurriculo.get(id) ?? 0) + 1);
  }
  const listaDeCurriculos: CurriculoNaLista[] = opcoesDoSeletor(curriculosDoCurso, hoje, true).map(
    (o) => ({
      versao: o.curriculo.versao,
      rotulo: o.rotulo,
      situacao: ROTULO_DA_SITUACAO[o.situacao],
      vigenteDe: o.curriculo.vigente_de,
      descricao: o.curriculo.descricao ?? null,
      temPdf: o.curriculo.pdf_carregado_em !== null,
      turmas: turmasPorCurriculo.get(o.curriculo.id) ?? 0,
    }),
  );

  return (
    <section className="flex flex-col gap-5">
      {/* RT-1: a identificação à esquerda; o ano e as ações à direita, na mesma linha. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CabecalhoDoCurso
          curso={{
            codigo: curso.codigo as string,
            nome: curso.nome_curso as string,
            classificacao: curso.classificacao as string,
            modalidade: curso.modalidade,
            ativo: cursoAtivo,
          }}
          regime={regime}
          /*
           * ⚠️ A MESMA REGRA DA PÁGINA DE EDIÇÃO — `cursos.editar` **ou** `horarios.criar`. Ela é
           *    montada aqui, no servidor, e o cabeçalho só a recebe: duas telas decidindo alcance
           *    por conta própria é como as duas divergem.
           */
          podeAbrirEdicao={podeAbrirEdicao}
        />

        {/*
        ⚠️ A BARRA ÚNICA, NO TOPO (spec 016, FR-006.1): Editar · Desativar/Reativar · Nova turma, do
           mesmo tamanho. Cada botão segue a permissão do destino, decidida aqui no servidor — e o
           banco recusa de qualquer forma (`FR-017.8` da spec 009).
      */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SeletorDeAno
            ano={escolha.ano}
            vigente={escolha.vigente}
            origem={escolha.origem}
            rota="/cursos/[curso]"
          />
          <BarraDoCurso
            sigla={curso.codigo as string}
            ativo={cursoAtivo}
            podeAbrirEdicao={podeAbrirEdicao}
            podeMudarSituacao={pode(permissoes, "cursos", "desativar")}
            podeCriarTurma={pode(permissoes, "turmas", "criar")}
            podeExcluir={pode(permissoes, "cursos", "criar")}
          />
        </div>
      </div>

      {/*
        ⚠️ OS AVISOS DO CURSO E AS TURMAS COM TETO EXCEDIDO SAÍRAM DAQUI (spec 022, Bloco 7, FR-004.4; A-2): o sininho do
           cabeçalho conta, e a página Avisos lista cada um com o link para onde se resolve.
      */}

      <AbasDoCurso
        turmas={
          <AbaTurmas
            sigla={curso.codigo as string}
            turmas={turmasDaLista}
            selecionada={selecao.codigo}
            hoje={hoje}
            avisoDaSelecao={selecao.aviso}
            motivoDoVazio={
              turmasDaLista.length > 0
                ? null
                : todasAsTurmas.length > 0
                  ? "nenhuma-no-ano"
                  : alcance === "recortado"
                    ? "nao-ve"
                    : "nao-ha"
            }
            ano={escolha.ano}
            acoes={{
              podeEditar: pode(permissoes, "turmas", "editar") && cursoAtivo,
              podeArquivar: pode(permissoes, RECURSO_DO_ARQUIVAMENTO, "editar"),
              podeExcluir: podeExcluirTurma,
              exclusao: exclusaoDasTurmas,
              excluir: excluirTurma,
            }}
          />
        }
        sobre={
          <AbaSobre
            catalogo={{
              codigo: curso.codigo as string,
              nome: curso.nome_curso as string,
              classificacao: curso.classificacao as string,
              modalidade: curso.modalidade,
              duracaoSemanas:
                curriculo?.duracao_semanas === null || curriculo?.duracao_semanas === undefined
                  ? null
                  : Number(curriculo.duracao_semanas),
              duracaoDias: curriculo === null ? null : Number(curriculo.duracao_dias),
              limiteTurmasAno:
                curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
              proposito: curriculo?.proposito ?? null,
              ofertavelEstrangeiros: curso.ofertavel_estrangeiros,
              estrangeirosObservacao: curso.estrangeiros_observacao,
              custoTotal: curso.custo_total === null ? null : Number(curso.custo_total),
              custoComposicao: curso.custo_composicao,
              curriculoPdfEm: curriculo?.pdf_carregado_em ?? null,
              /* O PDF é o do currículo MOSTRADO — o do ano escolhido, não o de hoje (revisão do PR #90). */
              curriculoVersao: versaoDoAno,
            }}
          />
        }
        disciplinas={
          <div data-slot="aba-disciplinas">
            {gradeDeDisciplinas ? (
              <GradeDeDisciplinas
                grade={gradeDeDisciplinas}
                parametros={{
                  situacao: String(valores.situacao),
                  busca: String(valores.busca),
                }}
                /* Ajuste 1 (conferência do PR #82): a página do curso é SÓ LEITURA — edita-se em *Editar curso*. */
                permissoes={SO_LEITURA}
                hoje={hoje}
              />
            ) : null}
          </div>
        }
        avaliacoes={
          /* Spec 022 (D-11): as regras de avaliação do currículo, que saíram de *Sobre o Curso*, no topo desta aba. */
          <div className="flex flex-col gap-6">
            <RegrasDeAvaliacao avaliacoes={avaliacoes} legiveis={!avaliacoesRes.error} />
            <AbaAvaliacoes quadro={avaliacoesDoCurso.quadro} aviso={avaliacoesDoCurso.aviso} />
          </div>
        }
        atividades={
          <AbaAtividades
            limites={linhasDosLimites}
            ano={anoDosLimites}
            estudoIndividual={{
              comEstudoObrigatorio: parametroDoAno(
                parametrosRes.data ?? [],
                "estudo_obrig_com_regime_pct",
                anoDosLimites,
              ),
              semEstudoObrigatorio: parametroDoAno(
                parametrosRes.data ?? [],
                "estudo_obrig_sem_regime_pct",
                anoDosLimites,
              ),
            }}
            tipos={(tiposRes.data ?? []) as unknown as TipoDeAtividade[]}
          />
        }
        horarios={
          horariosDoCurso ? (
            <AbaHorarios
              sigla={curso.codigo as string}
              cursoId={curso.id as string}
              curriculoId={curriculoId}
              curriculoVersao={versaoDoAno}
              cursoAtivo={cursoAtivo}
              horarios={horariosDoCurso}
              permissoes={{
                ...SO_LEITURA,
                abrirEdicaoDoCurso: podeAbrirEdicao,
              }}
            />
          ) : null
        }
        curriculo={
          <AbaCurriculo
            sigla={curso.codigo as string}
            lista={listaDeCurriculos}
            consultado={consultado?.versao ?? null}
            aviso={escolhaDaConsulta.aviso}
            consulta={
              consultaRes
                ? {
                    disciplinas: (
                      <GradeDeDisciplinas
                        grade={consultaRes[0]}
                        parametros={{
                          situacao: String(valores.situacao),
                          busca: String(valores.busca),
                        }}
                        permissoes={SO_LEITURA}
                        hoje={hoje}
                      />
                    ),
                    avaliacoes: (
                      <AbaAvaliacoes quadro={consultaRes[1].quadro} aviso={consultaRes[1].aviso} />
                    ),
                    horarios: (
                      <RegimesDoCurso
                        cursoId={curso.id as string}
                        curriculoId={consultadoId}
                        regimes={(consultaRes[2] as HorariosDoCurso).regimes}
                        configuracoes={(consultaRes[2] as HorariosDoCurso).configuracoes}
                        permissoes={SO_LEITURA}
                      />
                    ),
                    atividades: (
                      <AbaAtividades
                        limites={limitesDe(
                          (consultaRes[3].data ?? []) as {
                            categoria: string;
                            tempos: number;
                            fonte_pagina: number | null;
                          }[],
                          (consultaRes[4].data ?? []).reduce(
                            (soma, d) => soma + Number(d.carga_horaria_tempos ?? 0),
                            0,
                          ) || null,
                        )}
                        ano={anoDosLimites}
                        estudoIndividual={{
                          comEstudoObrigatorio: parametroDoAno(
                            parametrosRes.data ?? [],
                            "estudo_obrig_com_regime_pct",
                            anoDosLimites,
                          ),
                          semEstudoObrigatorio: parametroDoAno(
                            parametrosRes.data ?? [],
                            "estudo_obrig_sem_regime_pct",
                            anoDosLimites,
                          ),
                        }}
                        tipos={(tiposRes.data ?? []) as unknown as TipoDeAtividade[]}
                      />
                    ),
                  }
                : null
            }
          />
        }
      />
    </section>
  );
}

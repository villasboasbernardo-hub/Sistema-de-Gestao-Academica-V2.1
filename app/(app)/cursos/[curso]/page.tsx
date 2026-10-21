/**
 * A página do curso (`RF-CURSO-01`, `FR-006` a `FR-011`, `FR-031.4`).
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
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { avisosDoCurso } from "@/lib/dominio/avisos-do-curso";
import {
  curriculoDaPagina,
  curriculoVigenteEm,
  impedimentoDoArquivamento,
  impedimentoDoDescarte,
  opcoesDoSeletor,
  rotuloDoCurriculo,
  ROTULO_DA_SITUACAO,
  situacaoDoCurriculo,
} from "@/lib/dominio/curriculos";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../consulta";
import { AbaGrade, type TurmaDaGrade } from "./AbaGrade";
import { BarraDoCurriculo } from "./BarraDoCurriculo";
import { BarraDoCurso } from "./BarraDoCurso";
import { AbaSobre, type AvaliacaoPrevista, type DisciplinaDaGrade } from "./AbaSobre";
import { AbaAvaliacoes } from "./AbaAvaliacoes";
import { AbasDoCurso } from "./AbasDoCurso";
import { lerAvaliacoesDoCurso } from "../../turmas/[turma]/consulta-de-avaliacoes";
import {
  confirmarSugestao,
  definirTempoArbitrado,
  nomearUe,
} from "@/lib/acoes/avaliacoes-do-curriculo";
import { CabecalhoDoCurso } from "./CabecalhoDoCurso";
import {
  COLUNAS_DAS_TURMAS_DO_CURSO,
  COLUNAS_DA_PAGINA_DO_CURSO,
  SEM_CURRICULO,
  mensagemDeCursoNaoEncontrado,
  resolverTurmaSelecionada,
  type CurriculoDaPagina,
} from "./consulta";
import { QuadroDeAvisosDoCurso } from "./QuadroDeAvisosDoCurso";
import { TurmasComTetoExcedido, type LinhaDoLimite } from "./BlocoDeLimites";
import { AbaAtividades } from "./AbaAtividades";
import { AbaHorarios } from "./AbaHorarios";
import { lerHorariosDoCurso } from "./consulta-de-horarios";
import { GradeDeDisciplinas } from "../../disciplinas/GradeDeDisciplinas";
import { lerGradeDeDisciplinas } from "../../disciplinas/consulta";
import type { TipoDeAtividade } from "@/lib/dominio/categoria-pelo-tipo";
import { limiteMaximo } from "@/lib/dominio/limite-maximo";
import {
  COLUNAS_DA_CONFORMIDADE,
  tetosExcedidos,
  type LinhaDaConformidade,
  type LinhaDoPrevisto,
} from "../../turmas/tetos-excedidos";
import { parametroDoAno } from "../../turmas/[turma]/tetos";

/** Hoje em `yyyy-mm-dd`, no fuso de apresentação. Entra como argumento nas funções puras. */
/* ⚠️ A cópia local saiu em 04/10/2026: `hojeNaCiaara()` é a mesma conta, num lugar só. */
const hojeEmSaoPaulo = hojeNaCiaara;

export default async function PaginaDoCurso({
  params,
  searchParams,
}: {
  params: Promise<{ curso: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { curso: segmento } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmento);
  const { valores } = lerParametros("/cursos/[curso]", await searchParams);

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
   * ⚠️ SPEC 021 (Bloco 6, RC-1 e RC-8): o propósito, a duração, o PDF, as disciplinas, as regras de avaliação e os
   *    limites são do CURRÍCULO — o escolhido no seletor (`?curriculo=N`), ou o vigente hoje. Com um currículo por
   *    curso, o mesmo conteúdo que a página mostrava pelo curso.
   */
  const hoje = hojeEmSaoPaulo();
  const curriculosDoCurso = ((curso as unknown as { curriculos?: CurriculoDaPagina[] })
    .curriculos ?? []) as CurriculoDaPagina[];
  const escolhaDoCurriculo = curriculoDaPagina(curriculosDoCurso, String(valores.curriculo), hoje);
  const curriculo = escolhaDoCurriculo.curriculo;
  const vigente = curriculoVigenteEm(curriculosDoCurso, hoje);
  const curriculoId = curriculo?.id ?? SEM_CURRICULO;
  const curriculoArquivado = curriculo !== null && curriculo.arquivado_em !== null;
  /* RC-10: o arquivado sai do seletor — mas o que foi aberto pelo número aparece nele, para não sumir da escolha. */
  const opcoesDeCurriculo = opcoesDoSeletor(
    curriculosDoCurso,
    hoje,
    valores.arquivados === "sim" || curriculoArquivado,
  ).map((o) => ({
    versao: o.curriculo.versao,
    rotulo: o.rotulo,
    situacao: ROTULO_DA_SITUACAO[o.situacao],
  }));

  const [
    turmasRes,
    regimeRes,
    disciplinasRes,
    avaliacoesRes,
    permissoes,
    limitesRes,
    parametrosRes,
    conformidadeRes,
    previstosRes,
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
      .select("cod_disciplina, nome_disciplina, carga_horaria_tempos")
      .eq("curriculo_id", curriculoId)
      .eq("status", "ativo")
      .order("ordem_sugerida", { ascending: true, nullsFirst: false })
      .order("cod_disciplina", { ascending: true }),
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
    supabase
      .from("vw_conformidade_tetos")
      .select(COLUNAS_DA_CONFORMIDADE)
      .eq("curso_id", curso.id as string),
    supabase
      .from("previstos_proens_turma")
      .select("turma_id, categoria, tempos_previstos, turmas!inner(curso_id)")
      .eq("turmas.curso_id", curso.id as string)
      .eq("status", "ativo"),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some da aba Grade, do seletor e da pré-seleção. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
  ]);

  /*
   * ⚠️ **A ARQUIVADA SOME DA GRADE, MAS CONTA NO LIMITE** (D-COR-5; C-7 e C-24): `paraLimite` lê TODAS as turmas,
   *    e a lista, o seletor, a pré-seleção e *"Turmas com teto excedido"* só as não arquivadas.
   */
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const todasAsTurmas = turmasRes.data ?? [];
  const codigosArquivados = new Set(
    todasAsTurmas.filter((t) => arquivadas.has(t.id as string)).map((t) => t.codigo as string),
  );
  /*
   * ⚠️ SPEC 021 (RC-9): a lista da aba Grade mostra TODAS as turmas, inclusive as arquivadas, cada uma com o currículo
   *    que segue; o seletor de turma e a pré-seleção continuam sem as arquivadas (C-24 da spec 017).
   */
  const rotuloDoCurriculoPorId = new Map(
    curriculosDoCurso.map((c) => [c.id, rotuloDoCurriculo(c)] as const),
  );
  const turmasDaLista: TurmaDaGrade[] = todasAsTurmas.map((t) => ({
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

  /* RC-10: arquivar o currículo selecionado — o botão só aparece quando a regra deixa (o banco confere de novo). */
  const turmasDoCurriculo = todasAsTurmas
    .filter((t) => t.curriculo_id === curriculo?.id)
    .map((t) => ({ arquivada: arquivadas.has(t.id as string) }));
  const podeArquivarCurriculo =
    curriculo !== null &&
    pode(permissoes, "arquivamento_de_curriculo", "editar") &&
    (curriculoArquivado ||
      impedimentoDoArquivamento(curriculo, curriculosDoCurso, hoje, turmasDoCurriculo) === null);

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
  const [avaliacoesDoCurso, gradeDeDisciplinas, horariosDoCurso, tiposRes] = await Promise.all([
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
      ? lerHorariosDoCurso({
          cursoId: curso.id as string,
          turmas: todasAsTurmas.map((t) => ({
            codigo: t.codigo as string,
            regimeId: (t.regime_de_horario_id as string | null) ?? null,
          })),
        })
      : Promise.resolve(null),
    aba === "atividades"
      ? supabase
          .from("config_listas")
          .select("id, valor, ativo, metadados")
          .eq("lista", "tipos_atividade")
          .order("ordem")
      : Promise.resolve({ data: [] }),
  ]);

  const paraLimite: TurmaParaLimite[] = todasAsTurmas.map((t) => ({
    ano: Number(t.ano_letivo),
    status: t.status as string,
  }));
  const avisos = avisosDoCurso(
    {
      duracaoSemanas:
        curriculo?.duracao_semanas === null || curriculo?.duracao_semanas === undefined
          ? null
          : Number(curriculo.duracao_semanas),
      proposito: curriculo?.proposito ?? null,
      limiteTurmasAno: curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
    },
    paraLimite,
  );

  const disciplinas: DisciplinaDaGrade[] = (disciplinasRes.data ?? []).map((d) => ({
    codigo: d.cod_disciplina as string,
    nome: d.nome_disciplina as string,
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
  const anoDosLimites = Number(hoje.slice(0, 4));
  const chCurricular = disciplinas.reduce((s, d) => s + (d.cargaHorariaTempos ?? 0), 0) || null;
  const linhasDosLimites: LinhaDoLimite[] = (["AEC", "TAD", "TR"] as const).map((sigla) => {
    const declarado = (limitesRes.data ?? []).find((l) => l.categoria === sigla);
    const percentual = parametroDoAno(
      parametrosRes.data ?? [],
      `teto.${sigla.toLowerCase()}_percentual_chr`,
      anoDosLimites,
    );
    return {
      sigla,
      limite: limiteMaximo({
        declarado: declarado ? Number(declarado.tempos) : null,
        chCurricular,
        percentual,
      }),
      pagina: declarado?.fonte_pagina ?? null,
      percentual,
      chCurricular,
    };
  });
  const excedidos = tetosExcedidos(
    (conformidadeRes.data ?? []) as LinhaDaConformidade[],
    (previstosRes.data ?? []) as unknown as LinhaDoPrevisto[],
    new Map((turmasRes.data ?? []).map((t) => [t.id as string, t.modalidade as string | null])),
  ).filter((e) => !codigosArquivados.has(e.turmaCodigo));

  return (
    <section className="flex flex-col gap-5">
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
        podeAbrirEdicao={
          pode(permissoes, "cursos", "editar") || pode(permissoes, "horarios", "criar")
        }
      />

      {/*
        ⚠️ A BARRA ÚNICA, NO TOPO (spec 016, FR-006.1): Editar · Desativar/Reativar · Nova turma, do
           mesmo tamanho. Cada botão segue a permissão do destino, decidida aqui no servidor — e o
           banco recusa de qualquer forma (`FR-017.8` da spec 009).
      */}
      <BarraDoCurso
        sigla={curso.codigo as string}
        ativo={cursoAtivo}
        podeAbrirEdicao={
          pode(permissoes, "cursos", "editar") || pode(permissoes, "horarios", "criar")
        }
        podeMudarSituacao={pode(permissoes, "cursos", "desativar")}
        podeCriarTurma={pode(permissoes, "turmas", "criar")}
      />

      {/* ⚠️ ACIMA DAS ABAS, fora de qualquer uma (`FR-010.1`) */}
      <QuadroDeAvisosDoCurso avisos={avisos} />

      {/*
        ⚠️ ACIMA DAS ABAS (spec 018, C-5): as turmas com teto excedido são ALERTA do curso (`RF-CURSO-06`). Os limites,
           que são o previsto, foram para a aba Atividades.
      */}
      <TurmasComTetoExcedido excedidos={excedidos} />

      {/* ⚠️ ACIMA DAS ABAS (RC-8): o currículo que as abas mostram. */}
      <BarraDoCurriculo
        sigla={curso.codigo as string}
        opcoes={opcoesDeCurriculo}
        selecionado={curriculo?.versao ?? null}
        vigente={vigente?.versao ?? null}
        situacao={
          curriculo === null
            ? null
            : curriculoArquivado
              ? ROTULO_DA_SITUACAO.arquivado
              : ROTULO_DA_SITUACAO[situacaoDoCurriculo(curriculo, curriculosDoCurso, hoje)]
        }
        aviso={escolhaDoCurriculo.aviso}
        podeCriar={cursoAtivo && pode(permissoes, "cursos", "editar") && vigente !== null}
        podeEditar={
          cursoAtivo &&
          pode(permissoes, "cursos", "editar") &&
          curriculo !== null &&
          !curriculoArquivado
        }
        arquivamento={podeArquivarCurriculo ? { arquivado: curriculoArquivado } : null}
        podeDescartar={
          cursoAtivo &&
          curriculo !== null &&
          !curriculoArquivado &&
          pode(permissoes, "cursos", "editar") &&
          impedimentoDoDescarte(curriculo, curriculosDoCurso, hoje, turmasDoCurriculo.length) ===
            null
        }
      />

      <AbasDoCurso
        grade={
          <AbaGrade
            sigla={curso.codigo as string}
            turmas={turmasDaLista}
            selecionada={selecao.codigo}
            hoje={hoje}
            avisoDaSelecao={selecao.aviso}
            motivoDoVazio={
              turmasDaLista.length > 0 ? null : alcance === "recortado" ? "nao-ve" : "nao-ha"
            }
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
              /* RC-11: o PDF do currículo mostrado; o do vigente baixa pelo endereço sem número. */
              curriculoVersao:
                curriculo === null || curriculo.versao === vigente?.versao
                  ? null
                  : curriculo.versao,
            }}
            disciplinas={disciplinas}
            avaliacoes={avaliacoes}
            avaliacoesLegiveis={!avaliacoesRes.error}
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
                permissoes={{
                  /* RC-10: o currículo arquivado se consulta — não recebe disciplina nova. */
                  criar:
                    cursoAtivo && !curriculoArquivado && pode(permissoes, "disciplinas", "criar"),
                  editar: pode(permissoes, "disciplinas", "editar"),
                  desativar: pode(permissoes, "disciplinas", "desativar"),
                }}
                hoje={hoje}
              />
            ) : null}
          </div>
        }
        avaliacoes={
          <AbaAvaliacoes
            quadro={avaliacoesDoCurso.quadro}
            aviso={avaliacoesDoCurso.aviso}
            {...(pode(permissoes, "avaliacoes_curriculo_arbitrado", "editar")
              ? {
                  arbitrado: {
                    definir: definirTempoArbitrado,
                    confirmar: confirmarSugestao,
                    nomear: nomearUe,
                  },
                }
              : {})}
          />
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
              cursoAtivo={cursoAtivo}
              horarios={horariosDoCurso}
              permissoes={{
                criar: pode(permissoes, "horarios", "criar"),
                editar: pode(permissoes, "horarios", "editar"),
                desativar: pode(permissoes, "horarios", "desativar"),
                abrirEdicaoDoCurso:
                  pode(permissoes, "cursos", "editar") || pode(permissoes, "horarios", "criar"),
              }}
            />
          ) : null
        }
      />
    </section>
  );
}

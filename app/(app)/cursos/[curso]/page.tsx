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
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { avisosDoCurso } from "@/lib/dominio/avisos-do-curso";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../consulta";
import { AbaGrade, type TurmaDaGrade } from "./AbaGrade";
import { AcoesDeSituacao } from "./AcoesDeSituacao";
import { AbaSobre, type AvaliacaoPrevista, type DisciplinaDaGrade } from "./AbaSobre";
import { AbasDoCurso } from "./AbasDoCurso";
import { CabecalhoDoCurso } from "./CabecalhoDoCurso";
import {
  COLUNAS_DAS_TURMAS_DO_CURSO,
  COLUNAS_DA_PAGINA_DO_CURSO,
  mensagemDeCursoNaoEncontrado,
  resolverTurmaSelecionada,
} from "./consulta";
import { QuadroDeAvisosDoCurso } from "./QuadroDeAvisosDoCurso";

/** Hoje em `yyyy-mm-dd`, no fuso de apresentação. Entra como argumento nas funções puras. */
function hojeEmSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

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

  const [turmasRes, regimeRes, disciplinasRes, avaliacoesRes, permissoes] = await Promise.all([
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
      .eq("curso_id", curso.id as string)
      .eq("status", "ativo")
      .order("ordem_sugerida", { ascending: true, nullsFirst: false })
      .order("cod_disciplina", { ascending: true }),
    supabase
      .from("avaliacoes_planejadas")
      .select("nome_disciplina, descricao_instrumentos, carater, formula_mf")
      .eq("curso_id", curso.id as string)
      .eq("status", "ativo")
      .order("nome_disciplina", { ascending: true }),
    permissoesDoPerfil(usuario?.perfil ?? null),
  ]);

  const hoje = hojeEmSaoPaulo();

  const turmas: TurmaDaGrade[] = (turmasRes.data ?? []).map((t) => ({
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
  }));

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

  const paraLimite: TurmaParaLimite[] = turmas.map((t) => ({ ano: t.ano, status: t.status }));
  const avisos = avisosDoCurso(
    {
      duracaoSemanas: curso.duracao_semanas === null ? null : Number(curso.duracao_semanas),
      proposito: curso.proposito,
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
        podeEditar={pode(permissoes, "cursos", "editar")}
      />

      {/* ⚠️ ACIMA DAS ABAS, fora de qualquer uma (`FR-010.1`) */}
      <QuadroDeAvisosDoCurso avisos={avisos} />

      {/* ⚠️ OCULTO para quem não tem a permissão — e o banco recusa de qualquer forma (`FR-017.8`) */}
      <SePodeVer permissoes={permissoes} recurso="cursos" acao="desativar">
        <AcoesDeSituacao sigla={curso.codigo as string} ativo={cursoAtivo} />
      </SePodeVer>

      <AbasDoCurso
        grade={
          <AbaGrade
            sigla={curso.codigo as string}
            turmas={turmas}
            selecionada={selecao.codigo}
            hoje={hoje}
            avisoDaSelecao={selecao.aviso}
            podeCriarTurma={pode(permissoes, "turmas", "criar")}
            cursoAtivo={cursoAtivo}
            motivoDoVazio={turmas.length > 0 ? null : alcance === "recortado" ? "nao-ve" : "nao-ha"}
          />
        }
        sobre={
          <AbaSobre
            catalogo={{
              codigo: curso.codigo as string,
              nome: curso.nome_curso as string,
              classificacao: curso.classificacao as string,
              modalidade: curso.modalidade,
              duracaoSemanas: curso.duracao_semanas === null ? null : Number(curso.duracao_semanas),
              duracaoDias: curso.duracao_dias === null ? null : Number(curso.duracao_dias),
              limiteTurmasAno:
                curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
              proposito: curso.proposito,
            }}
            disciplinas={disciplinas}
            avaliacoes={avaliacoes}
            avaliacoesLegiveis={!avaliacoesRes.error}
          />
        }
      />
    </section>
  );
}

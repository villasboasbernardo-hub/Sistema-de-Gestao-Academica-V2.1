/**
 * *Editar turma* — **página própria** (RT-3 do Bloco 10, spec 025, D-1 e D-2; A-1 e A-2).
 *
 * > *"O botão Editar sai do fim da página. Trocar situação e arquivar só dentro de Editar turma (RT-3), um único
 * > diálogo/página edita tudo."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **UM FORMULÁRIO EDITA A TURMA INTEIRA**, a situação inclusive, com a observação da troca (D-COR-4): o botão
 *    *Trocar situação* que ficava ao lado do selo saiu. Arquivar continua na barra da ficha (D-3).
 * ⚠️ **AS LEITURAS SÃO AS QUE A FICHA FAZIA PARA O FORMULÁRIO**: salas (a atual mesmo desativada, `FR-029.4`), a
 *    proteção das vigências por atividade global (`FR-021.8`), os regimes nomeados e os currículos (e se a escolha já
 *    travou), e as turmas do curso (o limite por ano e as janelas). Uma rodada só.
 * ⚠️ **A TURMA ARQUIVADA NÃO SE EDITA** (D-COR-5, C-4): a página diz isso, e o banco recusa de qualquer forma.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { estadoDoArquivamento } from "@/lib/dominio/arquivamento-da-turma";
import {
  opcoesDoSeletor,
  ROTULO_DA_SITUACAO,
  type CurriculoParaVigencia,
} from "@/lib/dominio/curriculos";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import type { JanelaDeTurma, VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { rotuloDoRegime } from "@/lib/dominio/regime-da-turma";
import { salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../../cursos/consulta";
import { FormularioDeTurma } from "../../FormularioDeTurma";
import {
  codigoDaFicha,
  COLUNAS_DA_FICHA_DA_TURMA,
  mensagemDeTurmaNaoEncontrada,
  protecoesDoBanco,
} from "../consulta";

export default async function EditarTurma({ params }: { params: Promise<{ turma: string }> }) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);

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
        <h1 className="text-texto text-lg font-semibold">Editar turma</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const voltar = (
    <Link
      href={enderecoDaTurma(turma.codigo as string)}
      className="text-marca text-sm underline-offset-2 hover:underline"
      data-slot="voltar-a-ficha"
    >
      Voltar à ficha da turma
    </Link>
  );

  if (!pode(permissoes, "turmas", "editar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar {turma.codigo as string}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não edita turma"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
        {voltar}
      </section>
    );
  }

  const cursoId = turma.curso_id as string;
  const turmaId = turma.id as string;
  const hoje = hojeNaCiaara();

  const [
    cursoRes,
    turmasRes,
    salasRes,
    protecaoRes,
    regimesRes,
    regimeTravadoRes,
    regimeDesdeRes,
    curriculosRes,
    arquivosRes,
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
    supabase.rpc("protecao_das_vigencias_por_atividade_global", { p_curso_id: cursoId }),
    supabase
      .from("regimes_de_horario")
      .select("id, nome, regime_tempos, ta_duracao_min, status, curriculo_id")
      .eq("curso_id", cursoId)
      .order("nome"),
    supabase.rpc("regime_da_turma_travado", { p_turma: turmaId }),
    /* RD-3 (Bloco 11, D-10): a vigência «desde» do relógio do DSA, a mais recente que já começou — só leitura. */
    supabase
      .from("turma_regime_vigencia")
      .select("vigente_de, regime:regimes_de_horario(nome, regime_tempos)")
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .lte("vigente_de", hoje)
      .order("vigente_de", { ascending: false })
      .limit(1),
    supabase
      .from("curriculos")
      .select("id, versao, vigente_de, status, arquivado_em")
      .eq("curso_id", cursoId),
    supabase
      .from("turma_arquivamentos")
      .select("ordem, acao, criado_em")
      .eq("turma_id", turmaId)
      .order("ordem"),
  ]);

  const arquivada = estadoDoArquivamento(
    (arquivosRes.data ?? []).map((a) => ({
      ordem: a.ordem as number,
      acao: a.acao as "arquivar" | "desarquivar",
      criadoEm: a.criado_em as string,
      autor: null,
      observacao: null,
    })),
  ).arquivada;

  if (arquivada || cursoRes.data?.status === "inativo") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar {turma.codigo as string}</h1>
        <p role="status" className="text-texto text-sm" data-slot="edicao-indisponivel">
          {arquivada
            ? "A turma está arquivada: ela se consulta, não se edita. Para editá-la, desarquive-a na ficha."
            : "O curso está fora de oferta: a turma fica para consulta e não recebe edição."}
        </p>
        {voltar}
      </section>
    );
  }

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
  const protegidas: VigenciaProtegida[] = protecoesDoBanco(protecaoRes.data ?? []);
  const curriculoDaTurma =
    (turma as unknown as { curriculo?: { id?: string } | null }).curriculo ?? null;
  const texto = (v: string | number | null) => (v === null ? "" : String(v));
  /* ⚠️ A falha da leitura trava o campo: liberar a troca sem saber se há lançamento seria pior. */
  const travado = regimeTravadoRes.error ? true : regimeTravadoRes.data === true;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-lg font-semibold">Editar {turma.codigo as string}</h1>
          <p className="text-texto-suave text-sm">
            {cursoRes.data?.codigo as string} — {cursoRes.data?.nome_curso as string}
          </p>
        </div>
        {voltar}
      </header>

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
          /* Os ativos do currículo da turma, mais o atual se estiver inativo (C-11 da spec 018). */
          opcoes: (regimesRes.data ?? [])
            .filter(
              (r) =>
                (r.status === "ativo" && r.curriculo_id === curriculoDaTurma?.id) ||
                r.id === turma.regime_de_horario_id,
            )
            .map((r) => ({
              id: r.id,
              rotulo: rotuloDoRegime({
                nome: r.nome,
                regimeTempos: Number(r.regime_tempos),
                taDuracaoMin: Number(r.ta_duracao_min),
              }),
              ativo: r.status === "ativo",
            })),
          travado,
          noDsaDesde: (() => {
            const v = (regimeDesdeRes.data ?? [])[0] as
              | { vigente_de: string; regime: { nome: string; regime_tempos: number } | null }
              | undefined;
            if (v === undefined) return null;
            return {
              desde: dataParaLeitura(v.vigente_de),
              rotulo: v.regime
                ? `${v.regime.nome} (${v.regime.regime_tempos} tempos)`
                : "o regime do curso",
            };
          })(),
        }}
        curriculo={{
          opcoes: opcoesDoSeletor(
            (curriculosRes.data ?? []) as (CurriculoParaVigencia & { id: string })[],
            hoje,
            false,
          )
            .filter((o) => o.situacao !== "passado" || o.curriculo.id === curriculoDaTurma?.id)
            .map((o) => ({
              id: o.curriculo.id,
              rotulo: `${o.rotulo} — ${ROTULO_DA_SITUACAO[o.situacao]}`,
            })),
          travado: travado || curriculosRes.error !== null,
          comPadrao: false,
        }}
        salas={salasParaEscolher(todasAsSalas, turma.sala_alocada)}
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
    </section>
  );
}

/**
 * A central de avisos — **a leitura** (spec 022, Bloco 7, FR-004; D-8 e D-9) — servidor.
 *
 * ⚠️ **AS MESMAS LEITURAS DOS QUADROS QUE SAÍRAM DAS PÁGINAS**, numa rodada só (`Promise.all`, nenhuma por linha): as do
 *    curso, do Início, de `/turmas`, da ficha da turma, de `/instrutores` e da ficha do instrutor. Os predicados são os
 *    de sempre, e a tabela da §6 da spec é `montarAvisos`.
 * ⚠️ **O ALCANCE É O DA PESSOA** (D-8): a RLS recorta cada leitura, e nenhum filtro de tela entra — cursos em oferta;
 *    turmas não arquivadas (a arquivada trava a edição, D-COR-5, e o aviso dela não teria onde se resolver); a carga, o
 *    andamento e a vista pelas regras do Início; o conflito da semana de hoje; instrutores ativos (a ficha do inativo
 *    não mostrava alerta, CHK019).
 * ⚠️ **"NÃO PUDE LER" É DITO, NUNCA ZERO** (gotcha 4): a leitura que falha entra em `naoLidos`, com o módulo, e a página
 *    diz que não pôde ler — o que falhou não vira "nenhum aviso".
 */
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import { STATUS_DE_AVALIACAO_VIVA } from "@/lib/dominio/avaliacao-viva";
import { alertasDeVista } from "@/lib/dominio/avaliacoes/alertas-de-vista";
import { naturezaPeloTipo } from "@/lib/dominio/avaliacoes/quadro-da-turma";
import { exigeVista, instrumentoDaVista } from "@/lib/dominio/avaliacoes/vista-obrigatoria";
import { AVISOS_INICIAIS, avisosDoCadastro } from "@/lib/dominio/avisos-cadastro-instrutor";
import { avisosDaTurma } from "@/lib/dominio/avisos-da-turma";
import { avisosDoCurso } from "@/lib/dominio/avisos-do-curso";
import type { Aviso, ModuloDeAviso } from "@/lib/dominio/avisos/central";
import { alertaForaDaFaixa, alertaSemCapacitacao } from "@/lib/dominio/alertas-instrutor";
import { capacitacaoDoCadastro } from "@/lib/dominio/capacitacao-didatica";
import {
  cargaPorSemana,
  limitesDoAnoIso,
  semanasDoAno,
  semanasForaDaFaixa,
} from "@/lib/dominio/carga-semanal";
import { curriculoVigenteEm, type CurriculoParaVigencia } from "@/lib/dominio/curriculos";
import { mediaSemanalDaAtribuicao } from "@/lib/dominio/media-semanal";
import { nomeEmTexto } from "@/lib/dominio/nome-instrutor";
import {
  painelDeTurmas,
  semanaDoPainel,
  type AvisoDeTurma,
  type OcupacaoDoPainel,
} from "@/lib/dominio/painel-de-turmas";
import type { criarClienteDeServidor } from "@/lib/supabase/server";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";

import {
  montarPanorama,
  type CargaDaTurma,
  type CursoDoRecorte,
  type RegimeDoCursoNoBanco,
  type TurmaDoPanorama,
} from "../inicio/panorama";
import {
  COLUNAS_DA_CONFORMIDADE,
  tetosExcedidos,
  type LinhaDaConformidade,
  type LinhaDoPrevisto,
} from "../turmas/tetos-excedidos";
import { montarAvisos, type EntradaDaCentral } from "./montar";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export type LeituraDosAvisos = {
  readonly avisos: readonly Aviso[];
  /** Os módulos com alguma leitura que falhou — a página diz "não pude ler", nunca "nenhum aviso". */
  readonly naoLidos: readonly ModuloDeAviso[];
};

type CurriculoDoCurso = CurriculoParaVigencia & {
  readonly proposito: string | null;
  readonly duracao_semanas: number | null;
};

type CursoLido = {
  readonly id: string;
  readonly codigo: string;
  readonly classificacao: string;
  readonly modalidade: string;
  readonly limite_turmas_ano: number | null;
  readonly status: string;
  readonly curriculos: readonly CurriculoDoCurso[] | null;
};

type TurmaLida = TurmaDoPanorama & {
  readonly codigo: string;
  readonly status: string;
  readonly curso_id: string;
  readonly ano_letivo: number;
  readonly data_inicio: string | null;
  readonly sala_alocada: string | null;
  readonly alunos: number | null;
  readonly curriculo: { readonly duracao_semanas: number | null } | null;
};

type AvaliacaoLida = {
  id: string;
  tipo_avaliacao: string | null;
  data_avaliacao: string | null;
  status: string;
  avaliacao_curriculo_id: string | null;
  turma: { codigo: string } | null;
  disciplina: { cod_disciplina: string } | null;
  item: { status: string; instrumento: { valor: string | null; metadados: unknown } | null } | null;
  instrumento: { valor: string | null; metadados: unknown } | null;
  vistas_de_avaliacao: { data: string; status: string }[];
  sessoes_de_aplicacao: { data: string; status: string }[] | null;
};

type OcupacaoLida = {
  turma_id: string | null;
  origem: string | null;
  fato_id: string | null;
  sessao_id: string | null;
  data: string;
  ta_inicial: number;
  ta_final: number;
  instrutor_id: string | null;
  fiscal_id: string | null;
  local: string | null;
};

const COLUNAS_DOS_INSTRUTORES =
  "id, codigo, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, categoria, om, nip, capacitacoes_didaticas, capacitacao_didatica_a_corrigir, data_inicio_docencia_ciaara, ordem_antiguidade";

export async function lerAvisos(supabase: Cliente, hoje: string): Promise<LeituraDosAvisos> {
  const ano = Number(hoje.slice(0, 4));
  const semana = semanaDoPainel(hoje);
  const limitesDoAno = limitesDoAnoIso(ano);

  const [
    cursosRes,
    turmasRes,
    arquivadasRes,
    cargasRes,
    executadaRes,
    regimesRes,
    feriadosRes,
    conformidadeRes,
    previstosRes,
    avaliacoesRes,
    parametrosDaVistaRes,
    linhasRes,
    comInstrutorRes,
    ocupacaoRes,
    instrutoresRes,
    cargaAnualRes,
    previstaRes,
  ] = await Promise.all([
    supabase
      .from("cursos")
      .select(
        "id, codigo, classificacao, modalidade, limite_turmas_ano, status, curriculos:curriculos!curriculos_curso_id_fkey(versao, vigente_de, status, arquivado_em, proposito, duracao_semanas)",
      ),
    supabase
      .from("turmas")
      .select(
        "id, codigo, status, curso_id, ano_letivo, data_inicio, data_termino, modalidade, sala_alocada, alunos, regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos), curriculo:curriculos!turmas_curriculo_do_proprio_curso_fk(duracao_semanas)",
      ),
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    supabase
      .from("vw_carga_horaria_turma")
      .select(
        "turma_id, turma_codigo, curso_id, curso_codigo, nome_curso, ano_letivo, status_turma, chr_curricular",
      ),
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }),
    supabase
      .from("vw_cursos_regime_vigente")
      .select("curso_id, regime_padrao_tempos, limite_diario_ead_horas"),
    supabase
      .from("feriados")
      .select("data")
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
    supabase.from("vw_conformidade_tetos").select(COLUNAS_DA_CONFORMIDADE),
    supabase
      .from("previstos_proens_turma")
      .select("turma_id, categoria, tempos_previstos")
      .eq("status", "ativo"),
    supabase
      .from("avaliacoes")
      .select(
        "id, tipo_avaliacao, data_avaliacao, status, avaliacao_curriculo_id, turma:turmas!avaliacoes_turma_id_fkey(codigo), disciplina:disciplinas!avaliacoes_disciplina_id_fkey(cod_disciplina), item:avaliacoes_curriculo!avaliacoes_item_da_disciplina(status, instrumento:config_listas!avaliacoes_curriculo_instrumento_id_fkey(valor, metadados)), instrumento:config_listas!avaliacoes_instrumento_id_fkey(valor, metadados), vistas_de_avaliacao(data, status), sessoes_de_aplicacao!sessoes_de_aplicacao_avaliacao_id_fkey(data, status)",
      )
      .in("status", [...STATUS_DE_AVALIACAO_VIVA])
      .lte("data_avaliacao", hoje),
    supabase
      .from("config_parametros")
      .select("chave, valor")
      .in("chave", ["avaliacao.prazo_vista_dias", "avaliacao.vence_em_breve_dias"])
      .eq("status", "ativo"),
    lerTodasAsPaginas((f) =>
      supabase
        .from("turma_disciplina")
        .select("id, turma_id", contagemNaPrimeira(f))
        .eq("status", "ativo")
        .order("id")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("turma_disciplina_instrutor")
        .select("turma_disciplina_id", contagemNaPrimeira(f))
        .eq("status", "ativo")
        .order("turma_disciplina_id")
        .range(f.de, f.ate),
    ),
    supabase.rpc("ocupacao_para_conflitos", { p_de: semana.de, p_ate: semana.ate }),
    supabase
      .from("vw_instrutores")
      .select(COLUNAS_DOS_INSTRUTORES)
      .eq("status", "ativo")
      .order("ordem_antiguidade"),
    supabase
      .from("vw_instrutor_carga_anual")
      .select("instrutor_id, faixa_semanal_min, faixa_semanal_max")
      .eq("ano", ano),
    lerTodasAsPaginas((f) =>
      supabase
        .from("vw_instrutor_carga_prevista")
        .select(
          "atribuicao_id, instrutor_id, previsao_inicio, previsao_termino, tempos_previstos, media_semanal",
          contagemNaPrimeira(f),
        )
        .or(
          `ano.eq.${ano},and(previsao_inicio.lte.${limitesDoAno.fim},previsao_termino.gte.${limitesDoAno.inicio})`,
        )
        .order("atribuicao_id")
        .range(f.de, f.ate),
    ),
  ]);

  const naoLidos = new Set<ModuloDeAviso>();
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  if (arquivadasRes.error) naoLidos.add("turmas");

  // ── Cursos: os avisos do quadro da página do curso, dos cursos em oferta ───────────────────────────
  const cursos = (cursosRes.data ?? []) as unknown as CursoLido[];
  const turmas = ((turmasRes.data ?? []) as unknown as TurmaLida[]).filter(
    (t) => !arquivadas.has(t.id),
  );
  if (cursosRes.error) naoLidos.add("cursos");
  const todasAsTurmas = (turmasRes.data ?? []) as unknown as TurmaLida[];
  const doCurso: EntradaDaCentral["cursos"] = turmasRes.error
    ? []
    : cursos
        .filter((c) => c.status === "ativo")
        .map((c) => {
          const vigente = curriculoVigenteEm(c.curriculos ?? [], hoje);
          return {
            sigla: c.codigo,
            avisos: avisosDoCurso(
              {
                duracaoSemanas:
                  vigente?.duracao_semanas == null ? null : Number(vigente.duracao_semanas),
                proposito: vigente?.proposito ?? null,
                limiteTurmasAno: c.limite_turmas_ano === null ? null : Number(c.limite_turmas_ano),
              },
              /* O limite conta TODAS as turmas do curso, as arquivadas também (C-7 da spec 017), como a página. */
              todasAsTurmas
                .filter((t) => t.curso_id === c.id)
                .map((t) => ({ ano: Number(t.ano_letivo), status: t.status })),
            ),
          };
        });
  if (turmasRes.error) naoLidos.add("cursos");

  // ── Turmas: tetos excedidos (o curso e o Início) ─────────────────────────────────────────────────
  const modalidade = new Map(turmas.map((t) => [t.id, t.modalidade as string | null] as const));
  const naoArquivada = new Set(turmas.map((t) => t.codigo));
  const tetos =
    conformidadeRes.error || previstosRes.error
      ? (naoLidos.add("turmas"), [])
      : tetosExcedidos(
          (conformidadeRes.data ?? []) as LinhaDaConformidade[],
          (previstosRes.data ?? []) as LinhaDoPrevisto[],
          modalidade,
        ).filter((e) => naoArquivada.has(e.turmaCodigo));

  // ── Turmas: em atraso (o Início), pelo mesmo panorama e o mesmo `andamentoDaTurma` ───────────────
  const atrasadas =
    cargasRes.error || executadaRes.error
      ? (naoLidos.add("turmas"), [])
      : montarPanorama(
          ((cargasRes.data ?? []) as unknown as CargaDaTurma[]).filter(
            (c) => !arquivadas.has(c.turma_id),
          ),
          cursos as unknown as CursoDoRecorte[],
          turmas,
          (regimesRes.data ?? []) as unknown as RegimeDoCursoNoBanco[],
          (feriadosRes.data ?? []).map((f) => f.data as string),
          hoje,
          new Map(
            ((executadaRes.data ?? []) as { turma_id: string; chd_executada: number }[]).map(
              (e) => [e.turma_id, Number(e.chd_executada)] as const,
            ),
          ),
        )
          .filter((t) => t.emAtraso)
          .map((t) => t.turmaCodigo);

  // ── Avaliações: as vistas (o Início e a ficha da turma) ──────────────────────────────────────────
  const parametroDaVista = (chave: string, padrao: number) =>
    Number((parametrosDaVistaRes.data ?? []).find((p) => p.chave === chave)?.valor ?? padrao) ||
    padrao;
  if (avaliacoesRes.error) naoLidos.add("avaliacoes");
  const vistas = alertasDeVista(
    ((avaliacoesRes.data ?? []) as unknown as AvaliacaoLida[])
      .filter((a) => a.turma && naoArquivada.has(a.turma.codigo))
      .map((a) => {
        /* Só o item ATIVO conta como ligado, como no Início e na ficha da turma. */
        const item = a.item?.status === "ativo" ? a.item : null;
        const instrumento = instrumentoDaVista(
          a.avaliacao_curriculo_id !== null ? item?.instrumento : a.instrumento,
        );
        return {
          id: a.id,
          turma: a.turma?.codigo ?? "",
          disciplina: a.disciplina?.cod_disciplina ?? "",
          tipo: a.tipo_avaliacao ?? "",
          natureza: naturezaPeloTipo(a.tipo_avaliacao ?? ""),
          estadoDoRegistro: a.status,
          aplicacao: a.data_avaliacao,
          sessoesDeVista: a.vistas_de_avaliacao
            .filter((v) => v.status === "ativo")
            .map((v) => v.data),
          sessoesDeAplicacao: (a.sessoes_de_aplicacao ?? [])
            .filter((v) => v.status === "ativo")
            .map((v) => v.data),
          temItemDeVista: exigeVista({ instrumento }),
          itemLigado: a.avaliacao_curriculo_id !== null && item !== null,
          instrumentoConhecido: a.avaliacao_curriculo_id === null && instrumento !== null,
        };
      }),
    {
      prazoDias: parametroDaVista("avaliacao.prazo_vista_dias", 7),
      venceEmBreveDias: parametroDaVista("avaliacao.vence_em_breve_dias", 2),
      hoje,
    },
  );

  // ── Turmas: o que falta (o painel de `/turmas`), de cada ano com turma em oferta ─────────────────
  const comInstrutor = new Set(
    ((comInstrutorRes.data ?? []) as { turma_disciplina_id: string }[]).map(
      (t) => t.turma_disciplina_id,
    ),
  );
  const linhasDoPainel =
    linhasRes.error || comInstrutorRes.error
      ? null
      : ((linhasRes.data ?? []) as { id: string; turma_id: string }[]).map((l) => ({
          turmaId: l.turma_id,
          temInstrutor: comInstrutor.has(l.id),
        }));
  const ocupacao: OcupacaoDoPainel[] | null = ocupacaoRes.error
    ? null
    : ((ocupacaoRes.data ?? []) as unknown as OcupacaoLida[]).map((o, n) => ({
        turmaId: o.turma_id,
        chave: `${o.origem ?? "anonima"}:${o.fato_id ?? n}:${o.sessao_id ?? ""}`,
        data: o.data,
        taInicial: Number(o.ta_inicial),
        taFinal: Number(o.ta_final),
        instrutorId: o.instrutor_id,
        fiscalId: o.fiscal_id,
        local: o.local,
      }));
  const anosEmOferta = [
    ...new Set(
      turmas
        .filter((t) => t.status === "planejada" || t.status === "ativa")
        .map((t) => t.ano_letivo),
    ),
  ];
  const doPainel: AvisoDeTurma[] = [];
  for (const anoDoPainel of anosEmOferta) {
    const painel = painelDeTurmas({
      ano: Number(anoDoPainel),
      turmas: turmas.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        ano: Number(t.ano_letivo),
        status: t.status,
        dataInicio: t.data_inicio,
        dataTermino: t.data_termino,
        arquivada: false,
      })),
      mostrarArquivadas: false,
      hoje,
      diasDeAviso: null,
      linhas: linhasDoPainel,
      ocupacao,
    });
    doPainel.push(...painel.avisos);
    if (painel.naoLidos.length > 0) naoLidos.add("turmas");
  }

  // ── Turmas: o quadro de cadastro da ficha, de cada turma não arquivada ──────────────────────────
  const disciplinasDaTurma = new Map<string, number>();
  for (const l of linhasDoPainel ?? []) {
    disciplinasDaTurma.set(l.turmaId, (disciplinasDaTurma.get(l.turmaId) ?? 0) + 1);
  }
  const daFicha: EntradaDaCentral["daFicha"] = turmasRes.error
    ? (naoLidos.add("turmas"), [])
    : turmas.map((t) => ({
        turmaCodigo: t.codigo,
        avisos: avisosDaTurma(
          {
            status: t.status,
            dataInicio: t.data_inicio,
            dataTermino: t.data_termino,
            sala: t.sala_alocada,
            alunos: t.alunos === null ? null : Number(t.alunos),
            /* Sem a leitura das linhas, 1: o aviso "sem disciplina" não acusa o que não foi medido (RN-DEG-02). */
            disciplinasAtivas: linhasDoPainel === null ? 1 : (disciplinasDaTurma.get(t.id) ?? 0),
            duracaoSemanasDoCurso: t.curriculo?.duracao_semanas ?? null,
          },
          hoje,
        ),
      }));

  // ── Instrutores: o quadro de cadastro e os alertas da ficha, dos ativos ──────────────────────────
  if (instrutoresRes.error) naoLidos.add("instrutores");
  const instrutores = (instrutoresRes.data ?? []).map((i) => {
    const capacitacao = capacitacaoDoCadastro(
      i.capacitacoes_didaticas as string[] | null,
      i.capacitacao_didatica_a_corrigir as string | null,
    );
    return {
      id: i.id as string,
      codigo: i.codigo as string,
      nome: nomeEmTexto({
        id: i.id as string,
        pg: i.posto_graduacao as string,
        especialidade: i.esp_hab_obs,
        nomeCompleto: i.nome_completo as string,
        nomeDeGuerra: i.nome_guerra,
      }),
      pg: i.posto_graduacao as string | null,
      especialidade: i.esp_hab_obs as string | null,
      nomeCompleto: i.nome_completo as string | null,
      categoria: i.categoria as string | null,
      om: i.om as string | null,
      nip: i.nip as string | null,
      dataInicioDocenciaCiaara: i.data_inicio_docencia_ciaara as string | null,
      capacitacao,
      capacitacaoACorrigir: (i.capacitacao_didatica_a_corrigir as string | null)?.trim() || null,
    };
  });
  const doCadastro = avisosDoCadastro(instrutores, AVISOS_INICIAIS);

  const faixaDe = new Map(
    (cargaAnualRes.data ?? []).map((c) => [
      c.instrutor_id as string,
      c.faixa_semanal_min != null && c.faixa_semanal_max != null
        ? { minimo: Number(c.faixa_semanal_min), maximo: Number(c.faixa_semanal_max) }
        : null,
    ]),
  );
  const janelasDe = new Map<
    string,
    { inicio: string | null; termino: string | null; mediaSemanal: number | null }[]
  >();
  for (const a of (previstaRes.data ?? []) as {
    instrutor_id: string;
    previsao_inicio: string | null;
    previsao_termino: string | null;
    tempos_previstos: number | null;
    media_semanal: number | null;
  }[]) {
    const media = mediaSemanalDaAtribuicao({
      mediaCadastrada: a.media_semanal === null ? null : Number(a.media_semanal),
      tempos: Number(a.tempos_previstos ?? 0),
      inicio: a.previsao_inicio,
      termino: a.previsao_termino,
    });
    janelasDe.set(a.instrutor_id, [
      ...(janelasDe.get(a.instrutor_id) ?? []),
      { inicio: a.previsao_inicio, termino: a.previsao_termino, mediaSemanal: media },
    ]);
  }
  const semCarga = cargaAnualRes.error !== null || previstaRes.error !== null;
  if (semCarga) naoLidos.add("instrutores");
  const doInstrutor: EntradaDaCentral["doInstrutor"] = instrutores.map((i) => {
    const faixa = semCarga ? null : (faixaDe.get(i.id) ?? null);
    return {
      codigo: i.codigo,
      nome: i.nome,
      capacitacaoACorrigir: i.capacitacaoACorrigir,
      alertas: [
        alertaForaDaFaixa(
          semanasForaDaFaixa(semanasDoAno(cargaPorSemana(janelasDe.get(i.id) ?? []), ano), faixa),
          faixa,
        ),
        alertaSemCapacitacao(
          { dataInicioDocenciaCiaara: i.dataInicioDocenciaCiaara, capacitacao: i.capacitacao },
          hoje,
        ),
      ].flatMap((a) => (a ? [a] : [])),
    };
  });

  return {
    avisos: montarAvisos({
      cursos: doCurso,
      tetos,
      atrasadas,
      vistas,
      doPainel,
      daFicha,
      doCadastro,
      doInstrutor,
    }),
    naoLidos: [...naoLidos],
  };
}

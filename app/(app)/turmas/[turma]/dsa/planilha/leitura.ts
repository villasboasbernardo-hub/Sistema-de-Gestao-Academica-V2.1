/**
 * A leitura da planilha de contingência — `contracts/rota-de-download.md`, R-2, R-3 e R-9 da spec 015.
 *
 * ⚠️ **A MESMA LEITURA DO DSA, NO PERÍODO INTEIRO** (R-2): `lerPeriodoDoDsa` busca o ano da turma numa
 * rodada só, e cada semana sai de `montarSemanaDoDsa` — o MESMO texto de montagem da tela — e de
 * `montarDocumentoDoDsa` — o MESMO papel do `/print/dsa`. Nenhuma semana é montada de outro jeito.
 *
 * ⚠️ **TODA LISTA EM PÁGINAS ATÉ ACABAR** (`DP-5`): o teto de 1.000 linhas do PostgREST cortava em
 * silêncio, e a planilha é justamente o ano inteiro.
 *
 * ⚠️ **A ATRIBUIÇÃO POR UE É LIDA PELA `turma_disciplina`** — `turma_disciplina_unidade` não tem
 * `turma_id`, e a consulta do DSA que a filtra por essa coluna falha calada desde 07/10/2026
 * (`PEND-DSA-SUGESTAO`). A da tela não muda nesta spec; a da planilha nasce certa.
 *
 * ⚠️ **SEM DADO PESSOAL** (`FR-029`): dos instrutores, só o nome como o DSA imprime — nenhuma coluna
 * de CPF, RG, telefone ou endereço é pedida, e só entram os da turma.
 */
import type { criarClienteDeServidor } from "@/lib/supabase/server";

import { semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { ordenarPorAntiguidade } from "@/lib/dominio/antiguidade";
import { rubricaResolvida } from "@/lib/dominio/dsa/assinatura-editada";
import {
  siglaOuExtenso,
  textoDoPapel,
  SIGLA_DO_ESTUDO_INDIVIDUAL,
} from "@/lib/dominio/dsa/impressao";
import { nomeParaDsa } from "@/lib/dominio/nome-instrutor";
import { tecnicaDaVistaDeProva } from "@/lib/dominio/dsa/rotulos";
import { semanasDaPlanilha, temSabadoNoAno } from "@/lib/dominio/dsa/planilha/semanas";
import {
  chaveDoFato,
  type CategoriaNormativa,
  type FatoDoInsumo,
  type InsumoDaPlanilha,
  type LancamentoForaDaPasta,
  type LancamentoSemPosicao,
  type SemanaDoInsumo,
} from "@/lib/dominio/dsa/planilha/tipos";
import { contagemNaPrimeira, lerTodasAsPaginas, type ListaLida } from "@/lib/supabase/paginacao";

import { montarDocumentoDoDsa } from "../../../../../print/dsa/documento";
import { quadrosDaSemana } from "../consulta";
import {
  lerExtrasDaImpressao,
  lerPeriodoDoDsa,
  lerSemanaDoDsa,
  montarSemanaDoDsa,
} from "../leitura";

type Cliente = Awaited<ReturnType<typeof criarClienteDeServidor>>;

export type TurmaDaPlanilha = {
  readonly id: string;
  readonly codigo: string;
  readonly curso_id: string;
  readonly modalidade: string | null;
  readonly sala_alocada: string | null;
  readonly alunos: number | null;
  readonly data_inicio: string | null;
  readonly data_termino: string | null;
  readonly inicio_etapa_presencial: string | null;
  readonly termino_etapa_presencial: string | null;
};

/** As colunas da turma que a planilha usa — as do DSA e o término do período (`FR-030`). */
export const COLUNAS_DA_TURMA_DA_PLANILHA =
  "id, codigo, curso_id, modalidade, sala_alocada, alunos, data_inicio, data_termino, inicio_etapa_presencial, termino_etapa_presencial";

/**
 * A lista que já é conhecida por falhar na leitura do DSA (`PEND-DSA-SUGESTAO`) — a planilha lê a
 * atribuição por UE pela consulta certa, logo a falha daquela não a impede.
 */
const FALHA_CONHECIDA_DO_DSA = "atribuições por UE";

export class FalhaNaLeituraDaPlanilha extends Error {
  constructor(readonly listas: readonly string[]) {
    super(`a planilha não pôde ler: ${listas.join(", ")}`);
  }
}

function lista<T>(lida: ListaLida, nome: string, erros: string[]): T[] {
  if (lida.error !== null) erros.push(`${nome} (${lida.error.message})`);
  return (lida.data ?? []) as T[];
}

export async function lerDadosDaPlanilha(
  supabase: Cliente,
  turma: TurmaDaPlanilha,
  contexto: { readonly hoje: string; readonly geradaEm: string; readonly geradaPor: string },
): Promise<InsumoDaPlanilha> {
  const erros: string[] = [];
  const turmaId = turma.id;
  const cursoId = turma.curso_id;
  const paraEtapa = {
    modalidade: turma.modalidade,
    inicioEtapaPresencial: turma.inicio_etapa_presencial,
    terminoEtapaPresencial: turma.termino_etapa_presencial,
    dataInicio: turma.data_inicio,
    dataTermino: turma.data_termino,
  };

  /* As leituras que não dependem do período, numa rodada só. */
  const extrasDoCatalogo = Promise.all([
    lerTodasAsPaginas((f) =>
      supabase
        .from("turma_disciplina_unidade")
        .select(
          "unidade_ensino_id, instrutor_id, turma_disciplina!inner(turma_id)",
          contagemNaPrimeira(f),
        )
        .eq("turma_disciplina.turma_id", turmaId)
        .eq("status", "ativo")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("turma_disciplina_instrutor")
        .select(
          "instrutor_id, turma_disciplina!inner(turma_id, disciplina_id)",
          contagemNaPrimeira(f),
        )
        .eq("turma_disciplina.turma_id", turmaId)
        .eq("status", "ativo")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("unidades_ensino")
        .select(
          "id, disciplina_id, numero_ue, topico, ch_prevista_tempos, tecnica_ensino_sugerida, status",
          contagemNaPrimeira(f),
        )
        .eq("curso_id", cursoId)
        .order("numero_ue", { ascending: true })
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerExtrasDaImpressao(supabase, { turmaId, cursoId }),
    /*
     * ⚠️ **A SEMANA CORRENTE PELA LEITURA DA TELA, COM CONFLITOS** (`FR-025`, T056): é dela que o
     * painel de situação tira *Atrasada* e *Conflitou*, e a CONTROLE os traz como retrato.
     */
    lerSemanaDoDsa(supabase, {
      turmaId,
      cursoId,
      ano: semanaIsoDe(contexto.hoje)?.ano ?? 2026,
      numero: semanaIsoDe(contexto.hoje)?.numero ?? 1,
      sabadoPedido: false,
      hoje: contexto.hoje,
    }),
  ]);

  /* O período: o cadastrado; sem ele, o das datas com lançamento (`Edge Cases`). */
  const periodoConhecido = turma.data_inicio !== null && turma.data_termino !== null;
  const [tdu, tdi, ues, extras, semanaCorrente] = await extrasDoCatalogo;
  const {
    semanas: semanasDaPasta,
    inicial,
    avisos,
  } = semanasDaPlanilha({
    turma: paraEtapa,
    datasComLancamento: periodoConhecido ? [] : extras.datasComLancamentoDaTurma,
    hoje: contexto.hoje,
  });
  const primeira = semanasDaPasta[0];
  const ultima = semanasDaPasta[semanasDaPasta.length - 1];
  const de = primeira?.seisDias[0] ?? contexto.hoje;
  const ate = ultima?.seisDias[5] ?? contexto.hoje;

  const [dados, aulas, avaliacoes, atividades] = await Promise.all([
    lerPeriodoDoDsa(supabase, { turmaId, cursoId, de, ate, comConflitos: false }),
    lerTodasAsPaginas((f) =>
      supabase
        .from("registros_aula")
        .select("id, codigo, unidade_ensino_id, disciplina_id", contagemNaPrimeira(f))
        .eq("turma_id", turmaId)
        .eq("status", "ativo")
        .gte("data", de)
        .lte("data", ate)
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("avaliacoes")
        .select("id, codigo, tipo_avaliacao, disciplina_id", contagemNaPrimeira(f))
        .eq("turma_id", turmaId)
        .neq("status", "cancelada")
        .order("codigo")
        .range(f.de, f.ate),
    ),
    lerTodasAsPaginas((f) =>
      supabase
        .from("atividades_nao_letivas")
        .select("id, codigo, categoria_normativa, disciplina_id", contagemNaPrimeira(f))
        .or(`turma_id.eq.${turmaId},turma_id.is.null`)
        .eq("status", "ativo")
        .gte("data", de)
        .lte("data", ate)
        .order("codigo")
        .range(f.de, f.ate),
    ),
  ]);
  for (const e of dados.erros)
    if (e.lista !== FALHA_CONHECIDA_DO_DSA) erros.push(`${e.lista} (${e.mensagem})`);

  const porUe = lista<{ unidade_ensino_id: string; instrutor_id: string }>(
    tdu,
    "atribuições por UE da turma",
    erros,
  );
  const porDisciplinaBruta = lista<{
    instrutor_id: string;
    turma_disciplina: { disciplina_id: string } | { disciplina_id: string }[];
  }>(tdi, "atribuições por disciplina da turma", erros);
  const unidadesBrutas = lista<{
    id: string;
    disciplina_id: string;
    numero_ue: number;
    topico: string;
    ch_prevista_tempos: number | null;
    tecnica_ensino_sugerida: string | null;
    status: string;
  }>(ues, "unidades de ensino", erros);
  const aulasLidas = lista<{
    id: string;
    codigo: string;
    unidade_ensino_id: string | null;
    disciplina_id: string | null;
  }>(aulas, "códigos das aulas", erros);
  const avaliacoesLidas = lista<{
    id: string;
    codigo: string;
    tipo_avaliacao: string | null;
    disciplina_id: string;
  }>(avaliacoes, "códigos das avaliações", erros);
  const atividadesLidas = lista<{
    id: string;
    codigo: string;
    categoria_normativa: CategoriaNormativa;
    disciplina_id: string | null;
  }>(atividades, "códigos das atividades", erros);
  if (erros.length > 0) throw new FalhaNaLeituraDaPlanilha(erros);

  /* As semanas, cada uma pela montagem do DSA e pelo papel do `/print/dsa`. */
  const codigoDaDisciplina = new Map(
    (dados.disciplinas as { id: string; cod_disciplina: string }[]).map((d) => [
      d.id,
      d.cod_disciplina,
    ]),
  );
  const numeroDaUe = new Map(unidadesBrutas.map((u) => [u.id, u.numero_ue]));
  const disciplinaDaUe = new Map(unidadesBrutas.map((u) => [u.id, u.disciplina_id]));
  const daAula = new Map(aulasLidas.map((a) => [a.id, a]));
  const daAvaliacao = new Map(avaliacoesLidas.map((a) => [a.id, a]));
  const daAtividade = new Map(atividadesLidas.map((a) => [a.id, a]));
  const fatoDoInsumo = (fatoId: string, origem: FatoDoInsumo["origem"]): FatoDoInsumo => {
    if (origem === "aula") {
      const a = daAula.get(fatoId);
      const ue = a?.unidade_ensino_id ?? null;
      /*
       * ⚠️ **A DISCIPLINA DA AULA COM UE É A DA UE** — `registros_aula.disciplina_id` fica nulo nela, e
       * `vw_ocupacao_ta` resolve com `coalesce(ue.disciplina_id, r.disciplina_id)`. Medido na
       * T048: lida só da coluna, toda aula da semente virava *"sem disciplina"* na planilha.
       */
      const disciplinaId =
        (ue === null ? null : disciplinaDaUe.get(ue)) ?? a?.disciplina_id ?? null;
      return {
        origem,
        codigo: a?.codigo ?? null,
        disciplinaCodigo:
          disciplinaId === null ? null : (codigoDaDisciplina.get(disciplinaId) ?? null),
        unidadeNumero: ue === null ? null : (numeroDaUe.get(ue) ?? null),
        tipoAvaliacao: null,
        categoria: null,
      };
    }
    if (origem === "avaliacao" || origem === "vista_prova") {
      const a = daAvaliacao.get(fatoId);
      return {
        origem,
        codigo: a?.codigo ?? null,
        disciplinaCodigo: codigoDaDisciplina.get(a?.disciplina_id ?? "") ?? null,
        unidadeNumero: null,
        tipoAvaliacao: a?.tipo_avaliacao ?? null,
        categoria: null,
      };
    }
    const n = daAtividade.get(fatoId);
    return {
      origem,
      codigo: n?.codigo ?? null,
      disciplinaCodigo: n?.disciplina_id ? (codigoDaDisciplina.get(n.disciplina_id) ?? null) : null,
      unidadeNumero: null,
      tipoAvaliacao: null,
      categoria: n?.categoria_normativa ?? null,
    };
  };

  const fatos = new Map<string, FatoDoInsumo>();
  /* A referência do catálogo de técnicas, dos tipos e dos instrutores: qualquer semana serve — eles não dependem dela. */
  const referencia = montarSemanaDoDsa(dados, {
    ano: primeira?.ano ?? semanaIsoDe(contexto.hoje)?.ano ?? 2026,
    numero: primeira?.numero ?? semanaIsoDe(contexto.hoje)?.numero ?? 1,
    sabadoPedido: true,
    hoje: contexto.hoje,
  });
  const semanas: SemanaDoInsumo[] = semanasDaPasta.map((s, k) => {
    const lida =
      k === 0
        ? referencia
        : montarSemanaDoDsa(dados, {
            ano: s.ano,
            numero: s.numero,
            sabadoPedido: true,
            hoje: contexto.hoje,
          });
    const documento = montarDocumentoDoDsa({
      codigoDaTurma: turma.codigo,
      turma,
      cursoId,
      escolha: { ano: s.ano, numero: s.numero },
      lida,
      extras,
      hoje: contexto.hoje,
    });
    const semPosicao: LancamentoSemPosicao[] = [];
    for (const dia of lida.semana.dias) {
      for (const celula of dia.celulas) {
        const b = celula.bloco;
        if (b === null) continue;
        fatos.set(chaveDoFato(b.fatoId, b.data, b.taInicial), fatoDoInsumo(b.fatoId, b.origem));
      }
      for (const { fato, motivo } of dia.semPosicao) {
        fatos.set(
          chaveDoFato(fato.fatoId, fato.data, fato.taInicial),
          fatoDoInsumo(fato.fatoId, fato.origem),
        );
        const ehEi = lida.idsDeEstudoIndividual.has(fato.fatoId);
        semPosicao.push({
          fatoId: fato.fatoId,
          data: fato.data,
          taInicial: fato.taInicial,
          tempos: fato.tempos,
          disciplina: textoDoPapel(fato.disciplina),
          conteudo: textoDoPapel(fato.conteudo),
          local: textoDoPapel(fato.local),
          te:
            fato.origem === "atividade_nao_letiva"
              ? ehEi
                ? SIGLA_DO_ESTUDO_INDIVIDUAL
                : ""
              : siglaOuExtenso(fato.tecnica, lida.tecnicasComSigla),
          instrutor: textoDoPapel(fato.instrutor),
          motivo,
        });
      }
    }
    const rubrica = (lado: "esquerda" | "direita") =>
      rubricaResolvida(documento.assinaturas[lado], contexto.geradaPor);
    return {
      semana: { ano: s.ano, numero: s.numero },
      rotulo: s.rotulo,
      seisDias: s.seisDias,
      relogio: lida.relogio,
      dias: documento.dias,
      avisosDosDias: lida.semana.dias.map((d) => d.avisos),
      semPosicao,
      numero: documento.numero,
      alunos: documento.alunos,
      assinaturas: { esquerda: rubrica("esquerda"), direita: rubrica("direita") },
    };
  });

  /* Os instrutores da turma — atribuídos e presentes nos lançamentos —, em antiguidade (`RN-ANT-01`). */
  const porDisciplina = porDisciplinaBruta.map((a) => {
    const td = Array.isArray(a.turma_disciplina) ? a.turma_disciplina[0] : a.turma_disciplina;
    return { disciplinaId: td?.disciplina_id ?? "", instrutorId: a.instrutor_id };
  });
  const daTurma = new Set<string>([
    ...porUe.map((a) => a.instrutor_id),
    ...porDisciplina.map((a) => a.instrutorId),
    ...(dados.ocupacao as { instrutor_id: string | null; fiscal_id: string | null }[]).flatMap(
      (o) => [o.instrutor_id, o.fiscal_id].filter((x): x is string => x !== null),
    ),
  ]);
  const { ordenados } = ordenarPorAntiguidade(
    referencia.instrutores.filter((i) => daTurma.has(i.id)),
    referencia.escala,
  );
  const posicao = new Map(ordenados.map((i, n) => [i.id, n]));
  /* ⚠️ A primeira atribuição da lista é a sugerida (`preencherLancamento`) — a ordem é a da antiguidade. */
  const emAntiguidade = <T extends { instrutorId: string }>(xs: readonly T[]) =>
    xs
      .slice()
      .sort((a, b) => (posicao.get(a.instrutorId) ?? 1e9) - (posicao.get(b.instrutorId) ?? 1e9));

  /* O que a turma lançou fora das semanas da pasta — conta na CH e no nº do sistema. */
  const naPasta = new Set(semanasDaPasta.flatMap((s) => s.seisDias));
  const foraDaPasta: LancamentoForaDaPasta[] = [
    ...(
      dados.acumulada as {
        data: string;
        disciplina_id: string | null;
        tempos_consumidos: number | null;
      }[]
    )
      .filter((o) => !naPasta.has(o.data) && o.disciplina_id !== null)
      .map((o) => ({
        data: o.data,
        disciplinaCodigo: codigoDaDisciplina.get(o.disciplina_id ?? "") ?? null,
        tempos: o.tempos_consumidos ?? 0,
        contaNoNumero: false,
      })),
    ...extras.datasComLancamentoDaTurma
      .filter((d) => !naPasta.has(d) && d <= ate)
      .map((data) => ({ data, disciplinaCodigo: null, tempos: 0, contaNoNumero: true })),
  ];

  const datasDoAno = [
    ...(dados.ocupacao as { data: string }[]).map((o) => o.data),
    ...semanas.flatMap((s) => s.semPosicao.map((x) => x.data)),
  ];
  /* A UE inativa que a turma usou entra também — senão o lançamento nasceria sem chave no catálogo. */
  const usadas = new Set(
    aulasLidas.map((a) => a.unidade_ensino_id).filter((x): x is string => x !== null),
  );

  /* O retrato do painel de situação (`quadrosDaSemana`, o MESMO cálculo da tela do DSA). */
  const emConflito = new Set(
    [...semanaCorrente.marcasDeConflito.entries()]
      .filter(([, m]) => m.conflito !== null)
      .map(([id]) => id),
  );
  const quadros = quadrosDaSemana({
    execucao: extras.execucao,
    ocupacao: semanaCorrente.ocupacaoAcumulada,
    emConflito,
    ateODia: semanaCorrente.dias[semanaCorrente.dias.length - 1] ?? contexto.hoje,
    hoje: contexto.hoje,
  });
  const retrato = new Map<string, "atrasada" | "conflitou">();
  for (const q of quadros) {
    if (q.situacao === "atrasada" || q.situacao === "conflitou") retrato.set(q.codigo, q.situacao);
  }

  return {
    hoje: contexto.hoje,
    retrato,
    turma: {
      codigo: turma.codigo,
      curso: referencia.cursoCodigo ?? turma.codigo,
      dataInicio: turma.data_inicio,
      salaAlocada: turma.sala_alocada,
    },
    geradaEm: contexto.geradaEm,
    geradaPor: contexto.geradaPor,
    semanas,
    semanaInicial: inicial,
    temSabado: temSabadoNoAno(datasDoAno),
    fatos,
    disciplinas: extras.execucao.map((d) => ({
      id: d.disciplinaId,
      codigo: d.codigo,
      nome: d.nome,
      chPrevista: d.prevista,
    })),
    unidades: unidadesBrutas
      .filter((u) => u.status === "ativo" || usadas.has(u.id))
      .map((u) => ({
        id: u.id,
        disciplinaId: u.disciplina_id,
        numero: u.numero_ue,
        topico: u.topico,
        chPrevista: u.ch_prevista_tempos ?? 0,
        tecnicaSugerida: u.tecnica_ensino_sugerida,
      })),
    atribuicoesPorUe: emAntiguidade(
      porUe.map((a) => ({ unidadeEnsinoId: a.unidade_ensino_id, instrutorId: a.instrutor_id })),
    ),
    atribuicoesPorDisciplina: emAntiguidade(porDisciplina),
    instrutores: ordenados.map((i) => ({ id: i.id, nomeNoDsa: nomeParaDsa(i) })),
    tecnicas: referencia.tecnicasComSigla,
    tiposDeAvaliacao: referencia.tiposDeAvaliacao,
    tecnicaDaVista: tecnicaDaVistaDeProva(referencia.tecnicasComSigla),
    foraDaPasta,
    avisos,
  };
}

/**
 * Tela Início — o panorama (`RF-INI-01` a `RF-INI-05`, `FR-028` a `FR-033`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O filtro é folha, noutro arquivo. Um `"use client"` aqui mandaria
 * o panorama inteiro para o navegador, e o erro não aparece na checagem de tipos.
 *
 * ⚠️ **SEIS CONSULTAS INDEPENDENTES, EM PARALELO — NUNCA UMA POR TURMA.** O antipadrão de N leituras
 * já foi combatido na v2.0 (spec 017), e o `RF-INI-01` escreve *"por VIEW ou consulta única"*. Os
 * volumes são 24 cursos, 28 turmas e o calendário do ano: a junção acontece em memória, numa passada.
 *
 * ⚠️ **ERAM TRÊS ATÉ 04/10/2026, E AS TRÊS NOVAS SÃO O QUE FALTAVA PARA O VEREDITO EXISTIR**: a
 * turma (pelo `data_termino` e pela `modalidade`, que a view de carga **não** tem), o regime vigente
 * do curso (o TA/dia da `RN-MAT-04`) e os feriados de dia inteiro (`RN-EVT-02`). Sem elas o painel
 * comparava previsto com executado e chamava o excesso de atraso.
 *
 * ⚠️ **O ESCOPO POR PERFIL NÃO É FILTRADO AQUI** (`RF-INI-02`). Quem nega é a **RLS**: o usuário fora
 * de escopo não recebe a linha, ainda que troque o parâmetro na URL à mão. Filtrar por disciplina de
 * código seria uma segunda fronteira — e a segunda é a que alguém esquece.
 *
 * ⚠️ **TRÊS VAZIOS DIFERENTES, E O TERCEIRO É O QUE FALTAVA** (`FR-033`). *"Não há"* e *"você não
 * vê"* já eram distinguidos desde o Épico 1. O terceiro é *"ainda não existe no sistema"* — a base
 * ainda não recebeu a carga —, e é o único dos três que **some sozinho com o tempo**. Tratá-lo como
 * "não há" faria a tela afirmar, com todas as letras, que a CIAARA-11 não tem turma nenhuma.
 */
import { idsArquivados, semAsArquivadas } from "@/lib/dominio/arquivamento-da-turma";
import Link from "next/link";

import { AlertaConformidade } from "@/components/ciaara/alerta-conformidade";
import { CardKpi } from "@/components/ciaara/card-kpi";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
// ⚠️ O ENDERECO DE TURMA VEM DO MODULO, E NAO DE UM TEMPLATE AQUI (`FR-031.2`). O codigo da
//    turma e `sigla [rotulo] ano` e CONTEM ESPACO — montar a mao produzia um `href` com
//    espaco cru, que o navegador aceita e o servidor recebe diferente. Defeito medido e
//    corrigido em 18/09/2026; a varredura de `endereco-de-turma-unico.test.ts` o impede
//    de voltar.
import { lerParametros } from "@/lib/navegacao/esquema";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import {
  COLUNAS_DA_CONFORMIDADE,
  fraseDoExcedido,
  tetosExcedidos,
  type LinhaDaConformidade,
  type LinhaDoPrevisto,
} from "../turmas/tetos-excedidos";
import { FiltroDoPanorama } from "./FiltroDoPanorama";
import { CartaoDaTurma } from "./CartaoDaTurma";
import { ManchetesDoDsa, type MancheteDoDsa } from "./ManchetesDoDsa";
import { AnoDoPainel } from "../turmas/AnoDoPainel";
import { Carrossel } from "@/components/ciaara/carrossel";
import { anoDoPainel, anosDoSeletor, semanaDoPainel } from "@/lib/dominio/painel-de-turmas";
import { cartoesDoInicio } from "@/lib/dominio/cartoes-do-inicio";
import { resumoDoDsa, temDsaNaSemana } from "@/lib/dominio/dsa-da-semana";
import { semanaDoCurso } from "@/lib/dominio/dsa/semana-do-curso";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import { AlertasDeVista } from "../turmas/[turma]/AlertasDeVista";
import { STATUS_DE_AVALIACAO_VIVA } from "@/lib/dominio/avaliacao-viva";
import { alertasDeVista } from "@/lib/dominio/avaliacoes/alertas-de-vista";
import { naturezaPeloTipo } from "@/lib/dominio/avaliacoes/quadro-da-turma";
import { exigeVista, instrumentoDaVista } from "@/lib/dominio/avaliacoes/vista-obrigatoria";
import {
  montarPanorama,
  totaisDo,
  type CargaDaTurma,
  type CursoDoRecorte,
  type RegimeDoCursoNoBanco,
  type TurmaDoPanorama,
} from "./panorama";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE **ANTES** DE O VALOR ALCANÇAR A CONSULTA (`FR-041`). Com o `RF-NAV-01`, a
   * barra de endereço é entrada de usuário: quem cola um link não é sempre quem o escreveu. Valor
   * fora do domínio cai para o padrão e a tela abre — nunca vira predicado.
   */
  const { valores } = lerParametros("/inicio", await searchParams);
  const classificacao = String(valores.classificacao);
  const modalidade = String(valores.modalidade);
  /*
   * ⚠️ **O "HOJE" É LIDO UMA VEZ, ANTES DA RODADA** — é a mesma função da ficha da turma e dos avisos (`hojeNaCiaara`).
   * ⚠️ **O ANO DO INÍCIO** (spec 019, C-1): a régua do painel de Turmas — `?ano=` válido, senão o vigente em São Paulo.
   */
  const hoje = hojeNaCiaara();
  const anoVigente = Number(hoje.slice(0, 4));
  const ano = anoDoPainel(String(valores.ano), hoje);
  const semanaAtual = semanaDoPainel(hoje);

  const supabase = await criarClienteDeServidor();

  /*
   * ⚠️ `status = "ativo"` É EXPLÍCITO AQUI, E PRECISA SER (`FR-017.6` da spec 009, R-1). Até a
   * migration 7 desta fatia, `app.cursos_do_usuario()` filtrava a situação, e o panorama nunca via
   * curso inativo — não porque esta tela filtrasse, mas porque o ALCANCE escondia. A migration tirou
   * o filtro de lá de propósito (`FR-017.1`: desativar tira de OFERTA, não de VISTA), e o recorte
   * passou a ser responsabilidade de cada consumidor, explicitamente. **Sem esta linha, turma de
   * curso desativado volta ao panorama sem erro nenhum** — medido em 18/09/2026, pelo caso de
   * `inicio.spec.ts`, que reprovou antes dela existir.
   */
  let consultaDeCursos = supabase
    .from("cursos")
    .select("id, codigo, classificacao, modalidade, nome_curso, duracao_semanas")
    .eq("status", "ativo");
  if (classificacao !== "") consultaDeCursos = consultaDeCursos.eq("classificacao", classificacao);
  if (modalidade !== "") consultaDeCursos = consultaDeCursos.eq("modalidade", modalidade);

  const [
    cursosRes,
    cargasRes,
    totalRes,
    turmasRes,
    regimesRes,
    feriadosRes,
    conformidadeRes,
    previstosRes,
    avaliacoesRes,
    parametrosDaVistaRes,
    executadaRes,
    arquivadasRes,
    ocupacaoDaSemanaRes,
  ] = await Promise.all([
    consultaDeCursos,
    supabase
      .from("vw_carga_horaria_turma")
      .select(
        "turma_id, turma_codigo, curso_id, curso_codigo, nome_curso, ano_letivo, status_turma, chr_curricular",
      ),
    /*
     * ⚠️ ESTA TERCEIRA CONSULTA EXISTE SÓ PARA DISTINGUIR OS VAZIOS, e é uma contagem — não traz
     * linha. Sem ela não há como separar *"o recorte não achou nada"* de *"a base ainda não recebeu
     * a carga"*, e as duas frases levam a pessoa a lugares opostos.
     *
     * ⚠️ **E ELA CONTA TODOS OS CURSOS, INCLUSIVE OS INATIVOS — de propósito** (`FR-017.6`, R-1).
     * A pergunta que ela responde é *"existe curso neste sistema?"*, e curso arquivado existe.
     * Acrescentar `status = "ativo"` aqui, por simetria com a consulta acima, faria a tela anunciar
     * *"ainda não existe no sistema"* numa base com dezenas de cursos arquivados — mentira que manda
     * a pessoa procurar a carga em vez do filtro. As duas consultas fazem perguntas diferentes, e é
     * por isso que só uma delas filtra.
     */
    supabase.from("cursos").select("id", { count: "exact", head: true }),
    /*
     * ⚠️ **AS TRÊS LEITURAS NOVAS NÃO FILTRAM PELO RECORTE, E É DE PROPÓSITO.** O recorte do filtro é
     *    aplicado em memória, sobre `cursos`, e o alcance por perfil é aplicado pela **RLS** — pedir
     *    `in(curso_id, …)` aqui exigiria esperar a consulta de cursos e transformaria uma rodada em
     *    duas (`FR-012`). Os volumes mandam: 28 turmas, 24 regimes e o calendário de um ano.
     */
    supabase
      .from("turmas")
      .select(
        "id, codigo, status, curso_id, ano_letivo, data_inicio, data_termino, inicio_etapa_presencial, termino_etapa_presencial, modalidade, regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos)",
      ),
    supabase
      .from("vw_cursos_regime_vigente")
      .select("curso_id, regime_padrao_tempos, limite_diario_ead_horas"),
    /*
     * ⚠️ **SÓ FERIADO DE DIA INTEIRO E ATIVO DESCONTA CAPACIDADE** (`RN-EVT-02`, regra 4). E o limite
     *    superior é **aberto**: ele seria o maior `data_termino` do recorte, que só se conhece depois
     *    de ler as turmas — uma segunda rodada para cortar uma lista que tem dezenas de linhas. O
     *    piso é `hoje`, que é o que elimina o calendário dos anos passados.
     */
    supabase
      .from("feriados")
      .select("data")
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
    /*
     * ⚠️ **OS TETOS DE AEC, TAD E TR** (spec 014, PR 2, `FR-005`, `RF-INI-04`): o veredito sai de
     *    `tetosDaTurma`, o mesmo dos cards da ficha, em memória — duas leituras na mesma rodada.
     */
    supabase.from("vw_conformidade_tetos").select(COLUNAS_DA_CONFORMIDADE),
    supabase
      .from("previstos_proens_turma")
      .select("turma_id, categoria, tempos_previstos")
      .eq("status", "ativo"),
    /*
     * ⚠️ **OS ALERTAS DE VISTA** (spec 014, FR-054, `RF-INI-04`): as avaliações VIVAS já aplicadas, com as sessões
     *    de vista e o INSTRUMENTO do item (`RN-AV-13`, 15/10/2026: a vista é obrigatória só para PM e PO, decidido por
     *    `exigeVista`); o veredito é de `alertasDeVista`, sobre `situacaoDaAvaliacao`.
     */
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
    /*
     * ⚠️ **A EXECUTADA DO ANDAMENTO É A DE ATÉ HOJE** (D-COR-2; FR-014.1 da spec 016): a soma da CHD com data
     *    até `hoje`, inclusive — o dia de São Paulo, passado aqui, porque a função não tem valor padrão
     *    (FR-014.3). A view de carga continua dando o resto (curso, CH curricular, situação).
     */
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some do panorama e, com ele, dos alertas. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    /*
     * ⚠️ **OS DSA DA SEMANA** (spec 019, C-10 e C-11): os lançamentos de segunda a sábado desta semana, de TODAS as
     *    turmas, numa leitura só — e as atividades globais (`turma_id` nulo), que aparecem no DSA de cada turma.
     */
    supabase
      .from("vw_ocupacao_ta")
      .select("turma_id, data, origem, disciplina_id, tempos_consumidos")
      .gte("data", semanaAtual.de)
      .lte("data", semanaAtual.ate),
  ]);

  /*
   * ⚠️ ERRO DE LEITURA NÃO ESTOURA (`RN-DEG-01`). Ele vira o vazio de "você não vê", que é o que uma
   * negativa da RLS de fato significa — e o gotcha nº 4 do BRIEF manda distinguir isso de "não há".
   */
  /*
   * ⚠️ A EXECUTADA ATÉ HOJE É CONDIÇÃO DA TELA COMO A VIEW DE CARGA: sem ela, o andamento voltaria em
   *    silêncio à soma que inclui o futuro (D-COR-2) — e o número errado seria o que a tela mostra.
   */
  if (cursosRes.error || cargasRes.error || executadaRes.error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Início</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  /*
   * ⚠️ **ERRO NAS TRÊS LEITURAS NOVAS NÃO DERRUBA A TELA, E TAMBÉM NÃO INVENTA ALERTA** — ele cai no
   *    `?? []`, e turma sem término sai *"sem capacidade calculada"*, sem veredito de atraso
   *    (`RN-DEG-01`). Só `cursos` e a view de carga continuam sendo condição para a tela existir:
   *    sem elas não há panorama nenhum a desenhar.
   */
  /*
   * ⚠️ **A ARQUIVADA SAI ANTES DO PANORAMA** (D-COR-5; C-24): tetos e vistas seguem o panorama (`noRecorte`), e saem
   *    com ele. Falha na leitura das arquivadas não esconde nada — a turma aparece, como antes do Bloco 2.
   */
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const cargasVivas = semAsArquivadas(
    (cargasRes.data ?? []) as unknown as CargaDaTurma[],
    arquivadas,
    (c) => c.turma_id,
  );
  /* Spec 019 (C-1, C-2): o seletor oferece os anos das turmas e o vigente; o panorama é só do ano escolhido. */
  const anos = anosDoSeletor(
    cargasVivas.map((c) => Number(c.ano_letivo)),
    anoVigente,
  );
  const panorama = montarPanorama(
    cargasVivas.filter((c) => Number(c.ano_letivo) === ano),
    (cursosRes.data ?? []) as unknown as CursoDoRecorte[],
    (turmasRes.data ?? []) as unknown as TurmaDoPanorama[],
    (regimesRes.data ?? []) as unknown as RegimeDoCursoNoBanco[],
    (feriadosRes.data ?? []).map((f) => f.data as string),
    hoje,
    new Map(
      ((executadaRes.data ?? []) as { turma_id: string; chd_executada: number }[]).map(
        (e) => [e.turma_id, Number(e.chd_executada)] as const,
      ),
    ),
  );
  const totais = totaisDo(panorama);
  /* ⚠️ O alerta de teto respeita o recorte: só as turmas que o panorama mostra (e não EAD, FR-006). */
  const noRecorte = new Set(panorama.map((t) => t.turmaCodigo));
  const excedidos = tetosExcedidos(
    (conformidadeRes.data ?? []) as LinhaDaConformidade[],
    (previstosRes.data ?? []) as LinhaDoPrevisto[],
    new Map((turmasRes.data ?? []).map((t) => [t.id as string, t.modalidade as string | null])),
  ).filter((e) => noRecorte.has(e.turmaCodigo));
  const parametroDaVista = (chave: string, padrao: number) =>
    Number((parametrosDaVistaRes.data ?? []).find((p) => p.chave === chave)?.valor ?? padrao) ||
    padrao;
  type LinhaDeAvaliacao = {
    id: string;
    tipo_avaliacao: string | null;
    data_avaliacao: string | null;
    status: string;
    avaliacao_curriculo_id: string | null;
    turma: { codigo: string } | null;
    disciplina: { cod_disciplina: string } | null;
    item: {
      status: string;
      instrumento: { valor: string | null; metadados: unknown } | null;
    } | null;
    /** RN-AV-13 (desenho de 15/10/2026): o instrumento da prova SEM item (`avaliacoes.instrumento_id`). */
    instrumento: { valor: string | null; metadados: unknown } | null;
    vistas_de_avaliacao: { data: string; status: string }[];
    sessoes_de_aplicacao: { data: string; status: string }[] | null;
  };
  const vistas = alertasDeVista(
    ((avaliacoesRes.data ?? []) as unknown as LinhaDeAvaliacao[])
      .filter((a) => a.turma && noRecorte.has(a.turma.codigo))
      .map((a) => {
        /*
         * ⚠️ SÓ O ITEM ATIVO CONTA COMO LIGADO, como na ficha da turma (`consulta-de-avaliacoes.ts`), que lê os itens
         *    com `status = 'ativo'` e não acha o inativo. Sem este filtro, a prova ligada a item INATIVO dava alerta
         *    aqui e não na ficha — a mesma prova com dois vereditos. Item inativo ou não lido: instrumento
         *    desconhecido e fora do alerta (decisão de 14/10/2026, `alertas-de-vista.ts`).
         */
        const item = a.item?.status === "ativo" ? a.item : null;
        // RN-AV-13: o instrumento do item ligado ou, sem item, o da própria prova — a marca do banco decide.
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
  const temRecorte = classificacao !== "" || modalidade !== "";
  const baseVazia = (totalRes.count ?? 0) === 0;
  /* Ajuste A-2 (20/10/2026): os cartões são só das turmas ativas do ano; os números contam todas. */
  const cartoes = cartoesDoInicio(panorama);

  /*
   * ⚠️ **OS DSA DA SEMANA** (spec 019, C-8 a C-11): as turmas do recorte (classificação e modalidade — não o ano: a
   *    semana é a de hoje) que têm DSA nesta semana, cada uma com o que está lançado nela.
   */
  const diasDaSemana = (() => {
    const s = semanaIsoDe(hoje);
    return s === null ? [] : datasDaSemanaIso(s.ano, s.numero).slice(0, 6);
  })();
  const semanaIso = semanaIsoDe(hoje);
  type TurmaDaLeitura = {
    id: string;
    codigo: string;
    status: string;
    curso_id: string;
    data_inicio: string | null;
    data_termino: string | null;
    inicio_etapa_presencial: string | null;
    termino_etapa_presencial: string | null;
    modalidade: string | null;
  };
  type CursoDaLeitura = {
    id: string;
    codigo: string;
    nome_curso: string;
    duracao_semanas: number | null;
  };
  type LinhaDaOcupacao = {
    turma_id: string | null;
    data: string;
    origem: string;
    disciplina_id: string | null;
    tempos_consumidos: number | null;
  };
  const cursoDoRecorte = new Map(
    ((cursosRes.data ?? []) as unknown as CursoDaLeitura[]).map((c) => [c.id, c] as const),
  );
  const ocupacao = (ocupacaoDaSemanaRes.data ?? []) as unknown as LinhaDaOcupacao[];
  const manchetes: MancheteDoDsa[] = ((turmasRes.data ?? []) as unknown as TurmaDaLeitura[])
    .filter((t) => cursoDoRecorte.has(t.curso_id))
    .filter((t) =>
      temDsaNaSemana(
        {
          status: t.status,
          modalidade: t.modalidade,
          dataInicio: t.data_inicio,
          dataTermino: t.data_termino,
          inicioEtapaPresencial: t.inicio_etapa_presencial,
          terminoEtapaPresencial: t.termino_etapa_presencial,
          arquivada: arquivadas.has(t.id),
        },
        diasDaSemana,
      ),
    )
    .map((t) => {
      const curso = cursoDoRecorte.get(t.curso_id) as CursoDaLeitura;
      const lancamentos = ocupacao
        .filter(
          (o) =>
            o.turma_id === t.id ||
            (o.turma_id === null &&
              t.data_inicio !== null &&
              t.data_termino !== null &&
              o.data >= t.data_inicio &&
              o.data <= t.data_termino),
        )
        .map((o) => ({
          origem: o.origem,
          data: o.data,
          disciplinaId: o.disciplina_id,
          tempos: Number(o.tempos_consumidos ?? 0),
        }));
      return {
        turmaCodigo: t.codigo,
        cursoCodigo: curso.codigo,
        nomeCurso: curso.nome_curso,
        semana: semanaDoCurso({
          dataInicio: t.data_inicio,
          dataTermino: t.data_termino,
          duracaoSemanasDoCurso:
            curso.duracao_semanas === null ? null : Number(curso.duracao_semanas),
          semana: semanaIso ?? { ano: anoVigente, numero: 1 },
        }),
        resumo: resumoDoDsa(lancamentos),
      };
    })
    .sort(
      (a, b) =>
        a.cursoCodigo.localeCompare(b.cursoCodigo, "pt-BR", { numeric: true }) ||
        a.turmaCodigo.localeCompare(b.turmaCodigo, "pt-BR", { numeric: true }),
    );

  return (
    <section className="flex flex-col gap-5">
      {/*
        Spec 019 (C-1 e ajuste A-1 de 20/10/2026): o ano numa caixa de seleção, no canto superior direito — a mesma
        régua de Turmas, com o ano de hoje por padrão.
      */}
      <header
        className="flex flex-wrap items-start justify-between gap-3"
        data-slot="cabecalho-do-inicio"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-lg font-semibold">Início</h1>
          {/* veste: a dica que explica o alcance do panorama — texto fixo, nunca dado */}
          <p className="text-texto-tenue text-xs">
            Panorama das turmas sob a CIAARA-11. O recorte vai para o endereço: este link abre com
            ele.
          </p>
        </div>
        <AnoDoPainel anos={anos} ano={ano} vigente={anoVigente} rota="/inicio" />
      </header>

      <FiltroDoPanorama />

      {/*
        ⚠️ A REGIÃO DE ALERTAS É SEMPRE VISÍVEL (`RF-INI-04`, `RNF-USA-04`), inclusive quando não há
        o que alertar. Uma região que some quando está tudo bem ensina a não procurá-la — e quando
        ela reaparecer, ninguém vai saber onde ela ficava.

        ⚠️ SÓ UM PREDICADO EXISTE HOJE, e os demais do `RF-INI-04` — disciplina sem instrutor, vista
        de prova vencida, regime de horário perto de mudar — são dos Épicos 5 a 9. A região entra
        agora para eles terem onde chegar.
      */}
      <AlertaConformidade
        tom={totais.emAtraso > 0 ? "atrasado" : "conformidade"}
        titulo={totais.emAtraso > 0 ? "Turmas exigindo atenção" : "Nada exigindo atenção"}
        avisos={
          totais.emAtraso > 0
            ? [`${totais.emAtraso} turma(s) em andamento com saldo de carga horária negativo.`]
            : ["Nenhuma turma em andamento com saldo negativo no recorte atual."]
        }
      />

      <AlertasDeVista alertas={vistas} mostrarTurma />

      {/*
        ⚠️ **UM ALERTA POR CARD EXCEDIDO, COM LINK PARA A TURMA** (spec 014, `FR-005`). Informativo:
           nada aqui bloqueia lançamento (`RN-DEG-02`).
      */}
      {excedidos.length > 0 ? (
        <section
          aria-labelledby="titulo-tetos-excedidos"
          className="border-atrasado-borda bg-atrasado-fundo rounded-ciaara flex flex-col gap-1 border p-3"
          data-slot="alertas-de-teto"
        >
          <h2 id="titulo-tetos-excedidos" className="text-atrasado-tinta text-sm font-semibold">
            Tetos de AEC, TAD e TR
          </h2>
          <ul role="status" className="flex flex-col gap-0.5 text-sm">
            {excedidos.map((e) => (
              <li key={`${e.turmaCodigo}-${e.categoria}-${e.alerta}`}>
                <Link
                  href={enderecoDaTurma(e.turmaCodigo)}
                  className="text-atrasado-tinta underline-offset-2 hover:underline"
                  data-slot="alerta-de-teto"
                >
                  {fraseDoExcedido(e)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        aria-labelledby="titulo-turmas-do-ano"
        className="flex flex-col gap-3"
        data-slot="turmas-do-ano"
        data-ano={ano}
      >
        <h2 id="titulo-turmas-do-ano" className="text-texto text-base font-semibold">
          Turmas de {ano}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CardKpi rotulo="Turmas no recorte" valor={totais.turmas} />
          <CardKpi rotulo="Em andamento" valor={totais.ativas} />
          <CardKpi rotulo="Carga executada" valor={totais.executada} unidade="TA" />
          <CardKpi rotulo="Progresso do recorte" valor={`${totais.percentual}%`} />
        </div>

        {panorama.length === 0 && baseVazia ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Ainda não existe no sistema"
            detalhe="A carga de cursos e turmas ainda não foi feita nesta base. Não é ausência de cadastro na CIAARA-11: é dado que ainda não chegou aqui."
          />
        ) : panorama.length === 0 && temRecorte ? (
          /*
           * ⚠️ **O RECORTE SEM RESULTADO CONTINUA DIZENDO QUE NÃO HÁ, E COMO VOLTAR** (`FR-008` da spec 008, gotcha 4):
           *    é outro caso que o do A-2 — aqui o filtro não achou turma nenhuma do ano, e a pessoa precisa saber que
           *    o sistema tem turmas e o que mexer. Medido no CI do PR #77: trocá-lo pela frase do A-2 reprovou
           *    `url-degradada.spec.ts`.
           */
          <EstadoVazio
            motivo="sem-dado"
            titulo="Nenhuma turma neste recorte"
            detalhe={`Há turmas cadastradas, mas nenhuma de ${ano} com esta classificação e modalidade. Volte o filtro para Todas ou escolha outro ano.`}
          />
        ) : cartoes.length === 0 ? (
          /* Ajuste A-2: sem turma ativa no ano, uma frase — nunca um carrossel vazio. */
          <p className="text-texto-suave text-sm" data-slot="sem-turma-ativa">
            Nenhuma turma em andamento em {ano}
            {temRecorte ? " neste recorte" : ""}.
          </p>
        ) : (
          /*
           * ⚠️ **OS CARTÕES EM CARROSSEL** (spec 019, C-3 a C-7, e ajustes A-2 a A-4 de 20/10/2026): só as turmas
           *    ATIVAS do ano, cada uma levando à sua ficha, com a barra de progresso; o carrossel passa sozinho, pausa e
           *    anda por teclado. Os números acima contam todas as turmas do ano.
           */
          <div data-slot="panorama-de-turmas">
            <Carrossel
              rotulo={`Turmas em andamento em ${ano}`}
              intervaloMs={6000}
              largura="cartao"
              dataSlot="carrossel-de-turmas"
              itens={cartoes.map((t) => (
                <CartaoDaTurma key={t.turmaId} turma={t} />
              ))}
            />
          </div>
        )}
      </section>

      <ManchetesDoDsa
        manchetes={manchetes}
        semana={semanaAtual}
        erro={Boolean(ocupacaoDaSemanaRes.error || turmasRes.error)}
      />
    </section>
  );
}

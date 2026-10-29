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
import { lerContagemPresencial } from "../turmas/contagem-presencial";
import { lerRegimesDasSemanas } from "../turmas/regimes-das-semanas";
import { AvisoDoRegimeNaoLido } from "../turmas/AvisoDoRegimeNaoLido";
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { CardKpi } from "@/components/ciaara/card-kpi";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { SeletorDeAno } from "@/components/ciaara/seletor-de-ano";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
// ⚠️ O ENDERECO DE TURMA VEM DO MODULO, E NAO DE UM TEMPLATE AQUI (`FR-031.2`). O codigo da
//    turma e `sigla [rotulo] ano` e CONTEM ESPACO — montar a mao produzia um `href` com
//    espaco cru, que o navegador aceita e o servidor recebe diferente. Defeito medido e
//    corrigido em 18/09/2026; a varredura de `endereco-de-turma-unico.test.ts` o impede
//    de voltar.
import { lerParametros } from "@/lib/navegacao/esquema";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { FiltroDoPanorama } from "./FiltroDoPanorama";
import { CartaoDaTurma } from "./CartaoDaTurma";
import { EscalaDoPapel } from "./EscalaDoPapel";
import { EscolhaDaSemana } from "./EscolhaDaSemana";
import { DocumentoDoDsa } from "../../print/dsa/DocumentoDoDsa";
import type { DadosDoDocumento } from "../../print/dsa/documento";
import { lerPublicadosDaSemana } from "../turmas/[turma]/dsa/publicacao";
import { rotuloDoAlt } from "@/lib/dominio/dsa/publicacao";
import { semanaDaDataEscolhida } from "@/lib/dominio/dsa/semana-pela-data";
import { instanteComHoraParaLeitura } from "@/lib/formato/data";
import { CONTRATO } from "@/lib/navegacao/contrato";
import { ROTA_DO_DSA, rotuloDaSemana } from "../turmas/[turma]/dsa/consulta";
import { Carrossel } from "@/components/ciaara/carrossel";
import {
  cartoesDoInicio,
  contagemPorSituacao,
  fraseDoCarrosselVazio,
} from "@/lib/dominio/cartoes-do-inicio";
import { compararTurmas } from "@/lib/dominio/ordem-de-cursos";
import { datasDaSemanaIso, semanaIsoDe } from "@/lib/dominio/carga-semanal";
import {
  montarPanorama,
  type CargaDaTurma,
  type CursoDoRecorte,
  type RegimeDoCursoNoBanco,
  type TurmaDoPanorama,
} from "./panorama";

/** A faixa de anos que a URL aceita — a mesma da navegação do DSA (`semanaDaDataEscolhida`). */
const ANOS_DA_URL = CONTRATO[ROTA_DO_DSA].parametros.ano;

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
  /* RT-6 (spec 025, D-24): o ano escolhido vale no sistema inteiro — o `?ano=` do link, senão o guardado, senão hoje. */
  const escolha = await anoEscolhido(String(valores.ano), hoje);
  const anoVigente = escolha.vigente;
  const ano = escolha.ano;
  /*
   * ⚠️ **RD-7 (Bloco 11, D-28): A SEMANA DOS DSA PUBLICADOS** — `?semana=` é uma data da semana; vazia ou inválida, a de
   *    hoje. Segunda a sábado; anterior e seguinte saem da segunda-feira, na virada do ano também.
   */
  const pedida = String(valores.semana).trim();
  const dataDaSemana =
    pedida !== "" && semanaDaDataEscolhida(pedida, ANOS_DA_URL) !== null ? pedida : hoje;
  const isoDaSemana = semanaIsoDe(dataDaSemana) ?? { ano: anoVigente, numero: 1 };
  const diasDaSemanaMostrada = datasDaSemanaIso(isoDaSemana.ano, isoDaSemana.numero);
  const segundaMostrada = diasDaSemanaMostrada[0] ?? dataDaSemana;
  const somarDias = (data: string, dias: number) =>
    new Date(Date.parse(`${data}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
  const isoDeHoje = semanaIsoDe(hoje);
  const ehAAtual =
    isoDeHoje !== null &&
    isoDeHoje.ano === isoDaSemana.ano &&
    isoDeHoje.numero === isoDaSemana.numero;

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
    .select("id, codigo, classificacao, modalidade, nome_curso")
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
    executadaRes,
    arquivadasRes,
    publicadosRes,
    presenciais,
    semanasDasTurmas,
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
        "id, codigo, status, curso_id, ano_letivo, data_inicio, data_termino, inicio_etapa_presencial, termino_etapa_presencial, modalidade, regime:regimes_de_horario!turmas_regime_do_proprio_curso_fk(regime_tempos), curriculo:curriculos!turmas_curriculo_do_proprio_curso_fk(duracao_semanas)",
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
      /* Spec 023 (D-4): com as turmas escolhidas, para cada turma descontar só o que a alcança. */
      .select(`data, ${COLUNAS_DA_ABRANGENCIA}`)
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
    /*
     * ⚠️ **A EXECUTADA DO ANDAMENTO É A DE ATÉ HOJE** (D-COR-2; FR-014.1 da spec 016): a soma da CHD com data
     *    até `hoje`, inclusive — o dia de São Paulo, passado aqui, porque a função não tem valor padrão
     *    (FR-014.3). A view de carga continua dando o resto (curso, CH curricular, situação).
     */
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }),
    /*
     * D-COR-5 e RT-8 (spec 029, FR-007): a marca de arquivada — os cartões do ano a contam; o carrossel das turmas e o
     * dos DSA publicados não a mostram.
     */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    /*
     * ⚠️ **RD-7 (Bloco 11): OS DSA PUBLICADOS DA SEMANA**, de todas as turmas que a sessão alcança — a última versão
     *    publicada de cada uma (a original ou a ALT mais recente), pela mesma trilha do histórico e do *Reimprimir*.
     *    Nunca rascunho nem salvo.
     */
    lerPublicadosDaSemana(supabase, { ano: isoDaSemana.ano, numero: isoDaSemana.numero }),
    /* Spec 024 (FR-020): a etapa presencial das semipresenciais. */
    lerContagemPresencial(supabase, hoje),
    /* Spec 029 (`FR-005`): o regime das semanas do DSA — o saldo soma o TA/dia da semana de cada dia útil. */
    lerRegimesDasSemanas(supabase, { hoje }),
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
   * ⚠️ **A ARQUIVADA FICA NO PANORAMA, COM A MARCA** (RT-8; spec 029, FR-007.2 e D-17, que emendam a D-26 e o
   *    FR-006.1 da spec 026 e a C-24 da spec 017 na parte do `/inicio`): *"ela CONTINUA contando nas estatísticas e
   *    nos cartões do ano dela, com a situação que tinha"* (Bernardo Villas Boas, 28/10/2026). Até o Bloco 14 ela saía
   *    ANTES do panorama, e os cartões do ano a descontavam — contra a A-2 de 20/10/2026 (*"os números do painel
   *    continuam contando todas"*). Agora a mesma população vai às duas funções de `cartoes-do-inicio.ts`: os números
   *    a contam, o carrossel a tira. Falha na leitura das arquivadas não esconde nada — a turma aparece no carrossel,
   *    como antes do Bloco 2.
   * ⚠️ **O «EM ATRASO» E OS AVISOS NÃO PASSAM A VÊ-LA** (D-COR-5): o veredito só se desenha no cartão do carrossel,
   *    que não tem a arquivada, e a página Avisos monta o próprio panorama, sem ela (`avisos/leitura.ts`).
   */
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  /* O panorama é só do ano escolhido; o seletor oferece qualquer ano (RT-6, D-25). */
  const panorama = montarPanorama(
    ((cargasRes.data ?? []) as unknown as CargaDaTurma[]).filter(
      (c) => Number(c.ano_letivo) === ano,
    ),
    (cursosRes.data ?? []) as unknown as CursoDoRecorte[],
    (turmasRes.data ?? []) as unknown as TurmaDoPanorama[],
    (regimesRes.data ?? []) as unknown as RegimeDoCursoNoBanco[],
    linhasComAbrangencia<{ data: string }>(feriadosRes.data),
    hoje,
    new Map(
      ((executadaRes.data ?? []) as { turma_id: string; chd_executada: number }[]).map(
        (e) => [e.turma_id, Number(e.chd_executada)] as const,
      ),
    ),
    presenciais,
    semanasDasTurmas.porTurma,
  ).map((t) => ({ ...t, arquivada: arquivadas.has(t.turmaId) }));
  /*
   * RD-8 (Bloco 11) com a RT-8 (spec 029): os cartões contam as turmas do ano por situação — a população do panorama,
   * arquivada inclusive, pela situação que tinha.
   */
  const contagem = contagemPorSituacao(panorama);
  /*
   * ⚠️ **OS ALERTAS SAÍRAM DO INÍCIO NO BLOCO 7** (spec 022, FR-004.4; A-2, que emenda o `RF-INI-04`): as turmas em
   *    atraso, as vistas de prova e os tetos de AEC, TAD e TR moram na página Avisos, pelo sininho do cabeçalho.
   */
  const temRecorte = classificacao !== "" || modalidade !== "";
  const baseVazia = (totalRes.count ?? 0) === 0;
  /*
   * Ajuste A-2 (20/10/2026): os cartões são só das turmas ativas do ano; os números contam todas. RT-8 (D-17): a ativa
   * arquivada conta em *Turmas ativas* e não ganha cartão.
   */
  const cartoes = cartoesDoInicio(panorama);
  /* Sem cartão, a frase: a do A-2 — ou, com a ativa arquivada contada em *Turmas ativas*, quantas são e onde vê-las. */
  const fraseSemCartao = fraseDoCarrosselVazio(contagem.ativas, cartoes.length, ano, temRecorte);

  /*
   * ⚠️ **RD-7 (Bloco 11, D-27): O CARROSSEL DO DSA SEGUE O RECORTE** (classificação e modalidade) e a semana ISO — não o
   *    ano: a semana é de calendário. A turma arquivada fica de fora, como no carrossel das turmas (D-COR-5; D-17 da
   *    spec 029: é vista do dia a dia, e o DSA dela segue alcançável pela ficha e pelo *Reimprimir*). A ordem é a única
   *    do sistema (spec 022, FR-003): a do curso, depois o ano e o código.
   */
  type TurmaDaLeitura = { id: string; codigo: string; curso_id: string; ano_letivo: number };
  type CursoDaLeitura = { id: string; codigo: string; classificacao: string | null };
  const cursoDoRecorte = new Map(
    ((cursosRes.data ?? []) as unknown as CursoDaLeitura[]).map((c) => [c.id, c] as const),
  );
  const turmaPorId = new Map(
    ((turmasRes.data ?? []) as unknown as TurmaDaLeitura[]).map((t) => [t.id, t] as const),
  );
  /*
   * ⚠️ **NÃO LER A TURMA É «NÃO LI», NÃO «NÃO HÁ»** (gotcha 4; revisão do Bloco 11): sem `turmasRes` cada publicação
   *    perde a turma e sai do carrossel, e a frase de nenhum publicado mentiria — as manchetes de antes tratavam o erro.
   */
  const publicadosNaoLidos = publicadosRes.erro || Boolean(turmasRes.error);
  const publicados = publicadosRes.publicados
    .flatMap((p) => {
      const turma = turmaPorId.get(p.turmaId);
      const curso = turma ? cursoDoRecorte.get(turma.curso_id) : undefined;
      return turma && curso && !arquivadas.has(turma.id) ? [{ ...p, turma, curso }] : [];
    })
    .sort((a, b) =>
      compararTurmas(
        {
          codigo: a.turma.codigo,
          cursoCodigo: a.curso.codigo,
          cursoClassificacao: a.curso.classificacao,
          ano: Number(a.turma.ano_letivo),
        },
        {
          codigo: b.turma.codigo,
          cursoCodigo: b.curso.codigo,
          cursoClassificacao: b.curso.classificacao,
          ano: Number(b.turma.ano_letivo),
        },
      ),
    );

  return (
    <ProvedorDePaineis>
      <section className="flex flex-col gap-5">
        {/*
        Spec 019 (C-1 e ajuste A-1 de 20/10/2026): o ano numa caixa de seleção, no canto superior direito — a mesma
        de todo módulo (RT-6). Ao lado, o ícone *Filtros* (RT-4, D-19): os números do ano continuam à vista.
        Spec 029 (Bloco 14, item 8, FR-008.1): a frase do panorama saiu; o título e a barra ficam (RT-1 e RT-6).
      */}
        <header
          className="flex flex-wrap items-start justify-between gap-3"
          data-slot="cabecalho-do-inicio"
        >
          <h1 className="text-texto text-lg font-semibold">Início</h1>
          <BarraDeAcoes rotulo="Ações do Início">
            <SeletorDeAno ano={ano} vigente={anoVigente} origem={escolha.origem} rota="/inicio" />
            <GatilhoDePainel
              painel="filtros"
              contagem={filtrosForaDoPadrao("/inicio", { classificacao, modalidade })}
            />
          </BarraDeAcoes>
        </header>

        <ConteudoDePainel painel="filtros">
          <FiltroDoPanorama />
        </ConteudoDePainel>

        {/*
         * ⚠️ **OS DSA PUBLICADOS LOGO ABAIXO DO CABEÇALHO** (spec 029, Bloco 14, item 8, FR-008.2; emenda o FR-008.1 e
         *    a D-31 da spec 026, em que eles vinham depois do carrossel das turmas): é o que se vê sem rolar. Rolando,
         *    os cartões do ano e o carrossel das turmas. O papel é enquadrado pela largura E pela altura da janela
         *    (`EscalaDoPapel`, FR-008.3) — e a escala se refaz com o painel de Filtros aberto aqui em cima (D-27).
         * ⚠️ **O ANO DO CABEÇALHO NÃO VALE PARA O PAPEL**: ele segue a semana e o recorte (D-27 da spec 026) — trocar o
         *    ano muda os cartões, não o DSA.
         * ⚠️ **O VAZIO É UMA FRASE SÓ, SEM ALTURA RESERVADA** (FR-008.4): sem papel, os cartões do ano sobem.
         */}
        <section
          aria-labelledby="titulo-dsa-publicados"
          className="flex flex-col gap-3"
          data-slot="dsa-publicados"
          data-semana={`${isoDaSemana.ano}-${isoDaSemana.numero}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="titulo-dsa-publicados" className="text-texto text-base font-semibold">
              DSA publicados da semana
            </h2>
            <EscolhaDaSemana
              rotulo={rotuloDaSemana(diasDaSemanaMostrada)}
              dataDaSemana={segundaMostrada}
              anterior={somarDias(segundaMostrada, -7)}
              seguinte={somarDias(segundaMostrada, 7)}
              ehAAtual={ehAAtual}
              anos={{ minimo: ANOS_DA_URL.minimo, maximo: ANOS_DA_URL.maximo }}
            />
          </div>
          {publicadosNaoLidos ? (
            <p
              role="status"
              className="text-atrasado-tinta text-sm"
              data-slot="dsa-publicados-nao-lidos"
            >
              Não foi possível ler os DSA publicados desta semana. Recarregue a página; se
              continuar, avise o suporte.
            </p>
          ) : publicados.length === 0 ? (
            /* RD-7: sem DSA publicado na semana, a frase — sem carrossel. */
            <p className="text-texto-suave text-sm" data-slot="sem-dsa-publicado">
              Não há DSA publicado para esta semana
            </p>
          ) : (
            /*
             * ⚠️ **O PAPEL É O DA IMPRESSÃO** (`DocumentoDoDsa`, verde e amarelo), do RETRATO publicado — só leitura
             *    (D-29): a data do papel é a da publicação, e o ALT é o da versão.
             */
            <Carrossel
              rotulo="DSA publicados da semana"
              intervaloMs={10000}
              largura="inteira"
              dataSlot="carrossel-do-dsa"
              itens={publicados.map((p) => (
                <figure
                  key={p.turmaId}
                  className="m-0 flex flex-col gap-1"
                  data-turma={p.turma.codigo}
                >
                  {/* D-21 (spec 029): a legenda centrada, como o papel embaixo dela. */}
                  <figcaption className="text-texto-suave text-center text-xs">
                    {p.turma.codigo} · {p.numero === 0 ? "original" : `ALT ${p.numero}`} · publicada
                    em {instanteComHoraParaLeitura(p.ocorridoEm)}
                  </figcaption>
                  <EscalaDoPapel>
                    <DocumentoDoDsa
                      dados={p.dados as DadosDoDocumento}
                      nomeDeQuemImprime={null}
                      geradoEm={p.ocorridoEm}
                      alteracao={rotuloDoAlt(p.numero)}
                      nivelDoTitulo={3}
                    />
                  </EscalaDoPapel>
                </figure>
              ))}
            />
          )}
        </section>

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
            <CardKpi rotulo="Turmas ativas" valor={contagem.ativas} />
            <CardKpi rotulo="Planejadas" valor={contagem.planejadas} />
            <CardKpi rotulo="Concluídas" valor={contagem.concluidas} />
            <CardKpi rotulo="Canceladas" valor={contagem.canceladas} />
          </div>

          {/*
           * Spec 029 (`FR-005`; revisão do Bloco 14, achado 7): o regime das semanas que não se leu é dito, uma linha só —
           *    o «em atraso» dos cartões sai pela conta de antes (um TA/dia só). Só com cartão: sem carrossel não há veredito.
           */}
          {!semanasDasTurmas.lido && cartoes.length > 0 ? <AvisoDoRegimeNaoLido /> : null}

          {/*
           * ⚠️ **OS VAZIOS LEEM A MESMA POPULAÇÃO DOS NÚMEROS** (RT-8): «Nenhuma turma neste recorte» só quando nem
           *    arquivada houver no ano e no recorte — com a arquivada contada num cartão ao lado, a frase desmentiria o
           *    número. Sem cartão no carrossel, a frase sai de `fraseDoCarrosselVazio`: a do A-2 quando não há ativa
           *    nenhuma; havendo ativa ARQUIVADA (que conta em *Turmas ativas* e não ganha cartão), ela diz quantas são e
           *    como vê-las — a do A-2 ali desmentiria o «Turmas ativas: 1» logo acima (revisão do Bloco 14).
           */}
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
          ) : fraseSemCartao !== null ? (
            /* Ajuste A-2: sem cartão no carrossel, uma frase — nunca um carrossel vazio. */
            <p className="text-texto-suave text-sm" data-slot="sem-turma-ativa">
              {fraseSemCartao}
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
      </section>
    </ProvedorDePaineis>
  );
}

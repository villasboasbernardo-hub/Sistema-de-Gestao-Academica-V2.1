/**
 * A semana do Detalhe Semanal de Aula (`RF-DSA-01`, `RF-DSA-02`, `RF-HOR-04`, `RF-HOR-06`,
 * `RN-2027-09`, `RN-EVT-02`, `RN-DEG-01`, `RF-NAV-04` · spec 013, PR 1, PR 2 e PR 3).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só a navegação da semana e o painel de lançamento são folhas; a
 * grade é servidor — uma semana do `C-Ap-HN` tem 9 TA × 6 dias com blocos dentro, e levar isso ao
 * bundle seria o gotcha 1 com o maior conteúdo da aplicação.
 *
 * ⚠️ **A LEITURA SAIU DAQUI NO PR 3, e a razão é a razão de ser da spec.** Ela vive agora em
 * `leitura.ts`, **compartilhada com a rota de impressão**: o papel precisa da **mesma** semana que
 * a tela mostra. Com dois leitores, a primeira divergência entre tela e papel seria **invisível** —
 * é o `D-5` e o `D-6` da planilha, onde o ESPELHO e a IMPRESSÃO liam linhas diferentes do mesmo
 * dado e ninguém via, até a inspeção da CAC contar 11.918 erros.
 *
 * ⚠️ **OS AVISOS DE DADO FALTANTE SÃO DESTA TELA, NÃO DO PAPEL** (`FR-039`, `SC-015`): *"dado
 * faltante vira aviso na tela, ao lado do botão Imprimir, ANTES de abrir a impressão"*. O que
 * acontece quando o aviso vai junto está medido: *"VERIFICAR Nº DE TA"* saiu **impresso** em 10 das
 * 15 planilhas (`D-2`).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { CheckCheck, PencilLine, Save, Stamp, type LucideIcon } from "lucide-react";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import {
  atualizar,
  excluir,
  lancar,
  lancarEstudoIndividualDaSemana,
  limparSemanaDoDsa,
  mover,
  removerEstudoIndividualDaSemana,
} from "@/lib/acoes/dsa";
import { desfazerParada, pararDia } from "@/lib/acoes/dia-parado";
import {
  definirRegimeDaSemana,
  descartarRascunhoDoDsa,
  fazerAlteracaoNoDsa,
  publicarSemanaDoDsa,
  salvarAlteracaoDoDsa,
  salvarSemanaDoDsa,
} from "@/lib/acoes/publicacao-do-dsa";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { QUEM_DESARQUIVA } from "@/lib/dominio/arquivamento-da-turma";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import {
  diasForaDaEtapa,
  etapaDaSemana,
  TEXTO_DA_ETAPA_A_DISTANCIA,
  type TurmaParaEtapa,
} from "@/lib/dominio/dsa/etapa-presencial";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { avisosAntesDeImprimir } from "@/lib/dominio/dsa/impressao";
import {
  documentosIguais,
  seloDaSituacao,
  situacaoDaSemana,
  type IconeDoSelo,
  type Situacao,
} from "@/lib/dominio/dsa/publicacao";
import { semanaSalva } from "@/lib/dominio/dsa/regime-da-semana";
import { abasDeVersao, versaoEscolhida } from "@/lib/dominio/dsa/versao-escolhida";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataComDiaDaSemana, dataParaLeitura, intervaloDeDatas } from "@/lib/formato/data";
import {
  enderecoDaEdicaoDoCurso,
  enderecoDaPlanilhaDeContingencia,
  enderecoDaTurma,
  enderecoDaImpressaoDoDsa,
} from "@/lib/navegacao/endereco-de-turma";
import { CONTRATO } from "@/lib/navegacao/contrato";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  rotuloDaSemanaDoCurso,
  semanaDoCurso,
  SEMANA_AUSENTE_NO_CABECALHO,
} from "@/lib/dominio/dsa/semana-do-curso";
import { montarDocumentoDoDsa, type DadosDoDocumento } from "../../../../print/dsa/documento";
import { conteudoDaSemana, montarRetratoDaSemana } from "../../../../print/dsa/retrato";
import { alcanceDoPerfil } from "../../../cursos/consulta";
import { codigoDaFicha, mensagemDeTurmaNaoEncontrada } from "../consulta";
import {
  COLUNAS_DA_TURMA_DO_DSA,
  ehEadPuro,
  quadrosDaSemana,
  rotuloDaSemana,
  ROTA_DO_DSA,
  semanaEscolhida,
} from "./consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "./leitura";
import { BotaoImprimir, EdicaoDasAssinaturasNaTela } from "./AssinaturasEditaveis";
import { RodapeDaSemana } from "./DocumentoNaTela";
import { NavegacaoDaSemana } from "./NavegacaoDaSemana";
import { podeBaixarPlanilhaDeContingencia } from "./planilha/acesso";
import { ParadasDaSemana, type ParadaNaSemana, type TipoDeParada } from "./ControleDeParadas";
import { PainelDeLancamento } from "./PainelDeLancamento";
import { BarraDoDsa } from "./BarraDoDsa";
import { AbasDeVersao } from "./AbasDeVersao";
import { NotasDaPublicacao } from "./NotasDaPublicacao";
import { PapelDaVersao } from "./PapelDaVersao";
import { lerPublicacaoDaSemana } from "./publicacao";
import { PainelDeSituacao } from "./PainelDeSituacao";

export default async function SemanaDoDsa({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);
  /*
   * ⚠️ **OS `descartes` SÃO LIDOS, E A PRIMEIRA VERSÃO OS IGNORAVA — com defeito silencioso.** Eu
   * esperava que `?semana=99` chegasse como 99 e fosse recusada por `semanaEscolhida`; medido,
   * **`lerParametros` já a degrada** para o padrão, porque o contrato declara `maximo: 53`. Sem ler
   * os descartes, a tela abria a semana corrente **sem dizer nada** — exatamente o que a
   * `RN-DEG-01` proíbe: *"dependência ausente devolve vazio/neutro COM AVISO"*.
   */
  const { valores, descartes } = lerParametros(ROTA_DO_DSA, await searchParams);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  if (!pode(permissoes, "registros_aula", "ler")) notFound();

  const supabase = await criarClienteDeServidor();
  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_TURMA_DO_DSA)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!turma) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-texto">Detalhe Semanal de Aula</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const hoje = hojeNaCiaara();
  /*
   * O que o contrato descartou, dito em português — é o aviso da `RN-DEG-01`. ⚠️ **O AVISO INTEIRO
   * SAI DA ESCOLHA, inclusive a consequência** (conferência do PR #40, 08/10/2026): a página colava
   * *"Abrimos a semana corrente"* a qualquer descarte, e `?semana=22&ano=2019` abria a semana 22.
   */
  const escolha = semanaEscolhida({
    semana: Number(valores.semana ?? 0),
    ano: Number(valores.ano ?? 0),
    hoje,
    descartes,
    faixas: CONTRATO[ROTA_DO_DSA].parametros,
  });
  const aviso = escolha.aviso;

  /*
   * ⚠️ **O DSA NÃO SE APLICA A EAD PURO** (`Q-13`, decisão de Bernardo Villas Boas de 05/10/2026).
   * Semipresencial **tem** DSA — ele cobre a semana presencial. A tela diz isso e para aqui, em vez
   * de desenhar uma grade de nove tempos para uma turma que não tem TA presencial nenhum.
   * ⚠️ **A FRASE É A MESMA DA FICHA, DA LISTA E DO `/inicio`** (item 9 da conferência do PR #40,
   * 08/10/2026): elas já não oferecem o botão, e quem chega pelo endereço lê o mesmo aviso.
   */
  if (ehEadPuro(turma.modalidade as string | null)) {
    return (
      <section className="flex flex-col gap-3">
        <CabecalhoDoDsa codigo={codigo} semanaDoCurso={null} dias={[]} />
        <p role="status" className="max-w-prose text-texto" data-slot="dsa-nao-se-aplica">
          {AVISO_DE_TURMA_EAD}
        </p>
      </section>
    );
  }

  const turmaId = turma.id as string;
  const cursoId = turma.curso_id as string;

  /*
   * ⚠️ **`D-DSA-2`: A TURMA SEMIPRESENCIAL SÓ TEM DSA NA ETAPA PRESENCIAL** (decisão de Bernardo Villas
   * Boas, 08/10/2026). Semana sem nenhum dia na janela não tem DSA — a tela diz e para aqui, mas
   * MANTÉM a navegação, para se chegar às semanas que têm. ⚠️ Quem decide é `etapaDaSemana`, a mesma
   * regra da Server Action e do papel; os dias são os seis da semana ISO (o sábado entra).
   */
  const paraEtapa: TurmaParaEtapa = {
    modalidade: (turma.modalidade as string | null) ?? null,
    inicioEtapaPresencial: (turma.inicio_etapa_presencial as string | null) ?? null,
    terminoEtapaPresencial: (turma.termino_etapa_presencial as string | null) ?? null,
  };
  const diasDaSemanaIso = datasDaSemanaIso(escolha.ano, escolha.numero).slice(0, 6);
  const etapa = etapaDaSemana(paraEtapa, diasDaSemanaIso);
  if (etapa.tipo === "fora") {
    /*
     * A semana do curso também na etapa a distância (spec 016, FR-009.2) — só a duração falta, e ela é do currículo
     * DA TURMA (spec 021, RC-1).
     */
    const { data: daEtapa } = await supabase
      .from("turmas")
      .select("curriculo:curriculos!turmas_curriculo_do_proprio_curso_fk(duracao_semanas)")
      .eq("id", turmaId)
      .maybeSingle();
    const cursoDaEtapa = (
      daEtapa as { curriculo?: { duracao_semanas?: number | null } | null } | null
    )?.curriculo;
    /* Bloco 15 (`FR-009.3`, `FR-010`): a linha única e, na barra, só a navegação — mantida para chegar às semanas com DSA. */
    return (
      <section className="flex min-w-0 flex-col gap-3">
        <header className="flex flex-wrap items-start gap-2">
          <CabecalhoDoDsa
            codigo={codigo}
            semanaDoCurso={rotuloDaSemanaDoCurso(
              semanaDoCurso({
                dataInicio: (turma.data_inicio as string | null) ?? null,
                dataTermino: (turma.data_termino as string | null) ?? null,
                duracaoSemanasDoCurso:
                  (cursoDaEtapa?.duracao_semanas as number | null | undefined) ?? null,
                semana: { ano: escolha.ano, numero: escolha.numero },
              }),
            )}
            dias={diasDaSemanaIso}
          />
          <BarraDeAcoes rotulo="Ações do DSA" className="ml-auto">
            <NavegacaoDaSemana
              codigo={codigo}
              ano={escolha.ano}
              semana={escolha.numero}
              sabadoAberto={false}
            />
          </BarraDeAcoes>
        </header>
        <div
          role="status"
          className="rounded-ciaara border-borda bg-superficie flex max-w-prose flex-col gap-1 border p-3"
          data-slot="dsa-etapa-a-distancia"
        >
          <p className="font-medium text-texto">{TEXTO_DA_ETAPA_A_DISTANCIA}</p>
          <p className="text-sm text-texto-suave">
            A etapa presencial desta turma vai de {dataParaLeitura(etapa.janela.inicio)} a{" "}
            {dataParaLeitura(etapa.janela.termino)}. Fora dela não se lança no DSA.{" "}
            <Link
              href={enderecoDaTurma(codigo)}
              className="underline underline-offset-2 hover:text-texto"
            >
              Ajustar a etapa presencial na ficha da turma.
            </Link>
          </p>
        </div>
      </section>
    );
  }
  const diasADistancia = diasForaDaEtapa(paraEtapa, diasDaSemanaIso);

  /* ⚠️ As duas leituras são independentes: uma rodada só, nenhum `await` em sequência inútil. */
  const [lida, extras, tiposDeParadaRes, arquivamentoRes, publicacao] = await Promise.all([
    lerSemanaDoDsa(supabase, {
      comRascunho: true,
      turmaId,
      cursoId,
      ano: escolha.ano,
      numero: escolha.numero,
      sabadoPedido: valores.sabado === "sim",
      hoje,
    }),
    lerExtrasDaImpressao(supabase, { turmaId, cursoId }),
    /* Spec 014: os tipos de parada (FR, LA, LP, NT, RC, PF) para «Parar dia». */
    supabase
      .from("config_listas")
      .select("id, valor, rotulo_exibicao, metadados")
      .eq("lista", "tipos_parada")
      .eq("ativo", true)
      .order("ordem"),
    /* D-COR-5 (spec 017): a turma arquivada abre o DSA só para ler. */
    supabase
      .from("vw_turmas_arquivadas")
      .select("arquivada_em")
      .eq("turma_id", turmaId)
      .maybeSingle(),
    /* Spec 024 (RP-3): a trilha da semana e o número de rascunhos dela. */
    lerPublicacaoDaSemana(supabase, {
      turmaId,
      ano: escolha.ano,
      numero: escolha.numero,
      de: diasDaSemanaIso[0] ?? hoje,
      /*
       * ⚠️ **A SEMANA VAI ATÉ O SÁBADO** (Bloco 11, FR-005.3): a lista tem SEIS datas (segunda a sábado), e o índice 6
       *    caía no «?? hoje» — o rascunho de uma semana passada era contado até hoje, e o de uma semana futura não era.
       */
      ate: diasDaSemanaIso.at(-1) ?? hoje,
    }),
  ]);
  /*
   * Spec 024 (RP-4): semana publicada — o papel de HOJE (só o salvo, montado com o mesmo «hoje» do retrato) ainda é o
   * publicado? Só se lê quando a semana está travada: é a única situação em que a pergunta tem resposta.
   */
  const publicadas = publicacao.eventos.filter(
    (e) => (e.tipo === "publicado" || e.tipo === "alteracao_publicada") && e.dados !== null,
  );
  const vigente = publicadas.at(-1);
  const travadaAgora = situacaoDaSemana(publicacao.eventos, publicacao.rascunhos, false).travada;
  const retratoDeHoje =
    travadaAgora && vigente?.hoje
      ? await montarRetratoDaSemana(supabase, {
          turmaId,
          ano: escolha.ano,
          numero: escolha.numero,
          hoje: vigente.hoje,
        })
      : null;
  const documentoDifere =
    retratoDeHoje !== null && vigente !== undefined
      ? !documentosIguais(
          conteudoDaSemana(retratoDeHoje.dados),
          conteudoDaSemana(vigente.dados as DadosDoDocumento),
        )
      : false;
  const situacaoDaPublicacao = situacaoDaSemana(
    publicacao.eventos,
    publicacao.rascunhos,
    documentoDifere,
  );
  /*
   * Bloco 15 (`FR-007`): as abas — a Minuta e as versões publicadas — e a que o `?versao=` pede (Minuta, com aviso,
   * quando ela não existe). O retrato da aberta vem da mesma trilha que já foi lida.
   */
  const numerosPublicados = situacaoDaPublicacao.historico.map((h) => h.numero);
  const abas = abasDeVersao(numerosPublicados);
  const escolhaDaVersao = versaoEscolhida(String(valores.versao ?? ""), numerosPublicados);
  const versaoAberta =
    escolhaDaVersao.numero === null
      ? null
      : (situacaoDaPublicacao.historico.find((h) => h.numero === escolhaDaVersao.numero) ?? null);
  const retratoDaVersaoAberta =
    versaoAberta === null
      ? null
      : ((publicadas.find((e) => (e.numero ?? 0) === versaoAberta.numero)?.dados as
          DadosDoDocumento | undefined) ?? null);
  const tiposDeParada: TipoDeParada[] = (tiposDeParadaRes.data ?? []).map((t) => {
    const m = (t.metadados ?? {}) as { pode_global?: boolean; aceita_tr?: boolean };
    return {
      id: t.id as string,
      valor: t.valor as string,
      rotulo: (t.rotulo_exibicao as string | null) ?? (t.valor as string),
      podeGlobal: m.pode_global !== false,
      aceitaTr: m.aceita_tr === true,
    };
  });
  const paradasDaSemana: ParadaNaSemana[] = lida.semana.dias.flatMap((d) =>
    d.paradas
      .filter((p) => p.codigo !== undefined && p.destino !== undefined)
      .map((p) => ({
        data: p.data,
        tipo: p.tipo,
        motivo: p.motivo,
        global: p.turmaId === null,
        taInicial: p.taInicial,
        tempos: p.tempos,
        destino: p.destino as ParadaNaSemana["destino"],
        codigo: p.codigo as string,
      })),
  );

  const semRelogio = lida.relogio === null;
  /*
   * ⚠️ **A ARQUIVADA DESLIGA SÓ O FORMULÁRIO, POR UMA MARCA PRÓPRIA** (D-COR-5; contrato das telas da spec 017): o
   *    *pode lançar* do perfil não muda — é ele que decide o botão e a rota da planilha de contingência
   *    (`podeBaixarPlanilhaDeContingencia`), que continuam para a arquivada, como o *Imprimir*. A falha de leitura não
   *    libera: quem grava é recusado pelo servidor de qualquer forma (`recusaSeTurmaArquivada`).
   */
  const arquivada = arquivamentoRes.error !== null || arquivamentoRes.data !== null;
  /* Spec 024 (RP-5): quem lança o DSA da turma salva, publica e altera — e a semana publicada não aceita lançamento. */
  const podeOperarAPublicacao = pode(permissoes, "registros_aula", "criar") && !arquivada;
  const podeLancar = podeOperarAPublicacao && !situacaoDaPublicacao.travada;

  /*
   * ⚠️ **OS AVISOS SÃO CALCULADOS COM AS MESMAS FUNÇÕES QUE O PAPEL USA.** O número do DSA, as
   * assinaturas e as linhas impressas saem de `lib/dominio/dsa/`, e é por isso que o aviso diz a
   * verdade sobre o que **vai** sair — e não um palpite sobre o que talvez saia.
   */
  /* ⚠️ A MESMA montagem da rota `/print/dsa` — a grade da tela e a do papel saem do mesmo objeto. */
  const documento = montarDocumentoDoDsa({
    codigoDaTurma: codigo,
    turma,
    cursoId,
    escolha,
    lida,
    extras,
    hoje,
    /* A tela mostra todas as linhas da semana, para que se possa lançar num tempo que o papel ainda não tem. */
    minimoDeTempos: lida.semana.linhas,
  });
  const assinaturas = documento.assinaturas;
  const impresso = documento.dias;
  /* ⚠️ As linhas de Estudo Individual não contam: elas existem mesmo na semana vazia. */
  const linhasImpressas = impresso.reduce(
    (total, dia) => total + dia.linhas.filter((l) => !l.estudoIndividual).length,
    0,
  );
  /*
   * ⚠️ **SÓ O CONFLITO DE PESSOA FAZ A DISCIPLINA «CONFLITAR»; o alerta de SALA não** — a
   * `RN-CONF-01` separa os dois, e `marcasDeConflito` traz os dois juntos. Contar o alerta de sala
   * aqui marcaria *"Conflitou"* numa disciplina cujo instrutor não tem conflito nenhum, e a tela
   * mandaria procurar o que não existe.
   */
  const emConflito = new Set(
    [...lida.marcasDeConflito.entries()].filter(([, m]) => m.conflito !== null).map(([id]) => id),
  );
  const ultimoDia = lida.dias[lida.dias.length - 1] ?? hoje;
  const quadros = quadrosDaSemana({
    execucao: extras.execucao,
    ocupacao: lida.ocupacaoAcumulada,
    emConflito,
    /* ⚠️ O corte é o FIM da semana selecionada, não hoje (`RN-CRONOS-03`, `Q-2`). */
    ateODia: ultimoDia,
    hoje,
    /* Bloco 15 (`PEND-029-1`, D-21): a «Atrasada» compara com a janela da carga, recortada pelo período da turma. */
    periodoDaTurma: {
      inicio: (turma.data_inicio as string | null) ?? null,
      termino: (turma.data_termino as string | null) ?? null,
    },
  });

  const avisosDaImpressao = avisosAntesDeImprimir({
    semanaDoCurso: documento.semanaDoCurso,
    alunos: (turma.alunos as number | null) ?? null,
    semRelogio,
    semAssinaturaEsquerda: assinaturas.esquerda === null,
    semAssinaturaDireita: assinaturas.direita === null,
    linhasImpressas,
  });

  /*
   * ⚠️ **A SEÇÃO É A FOLHA QUE GUARDA A EDIÇÃO DAS ASSINATURAS** (item 4 da conferência do PR #40,
   * 08/10/2026) — o *Imprimir* e o rodapé leem a mesma edição. A `key` zera o que foi editado ao
   * trocar de semana: o Next reaproveitaria o estado, e a edição de uma semana iria para o papel da
   * outra. O conteúdo continua servidor, por `children`.
   */
  return (
    <EdicaoDasAssinaturasNaTela
      key={`${escolha.ano}-${escolha.numero}`}
      className="flex min-w-0 flex-col gap-3"
    >
      {/*
        ⚠️ **RD-6 (Bloco 11) E O BLOCO 15: A BARRA À DIREITA, sem cartão separado, e a SEMANA UMA VEZ SÓ.** Sob o título,
           uma linha — o código da turma (o link da ficha) · *Semana N de T* · as datas (`FR-009`): saíram o *Voltar à
           turma*, o ano solto, o quadro *Semana do curso / Período / Alunos* da tela e o rótulo repetido da navegação. A
           navegação, o sábado, o *Parar dia* e o EI foram para a barra (`FR-010`). O selo foi para a aba *Minuta*
           (`FR-007`, D-15); o atributo da situação continua aqui, que é onde os casos de ponta a ponta o leem.
      */}
      <header
        className="flex flex-wrap items-start gap-2"
        data-slot="publicacao-do-dsa"
        data-situacao={situacaoDaPublicacao.situacao}
      >
        <CabecalhoDoDsa
          codigo={codigo}
          semanaDoCurso={documento.rotuloDaSemanaDoCurso}
          dias={lida.dias}
        />
        <BarraDoDsa
          turmaId={turmaId}
          codigo={codigo}
          ano={escolha.ano}
          semana={escolha.numero}
          sabadoAberto={lida.sabadoAberto}
          situacao={situacaoDaPublicacao}
          podeOperar={podeOperarAPublicacao && !publicacao.erro}
          podeLancar={podeLancar}
          regime={lida.regimeDaSemana}
          regimesOferecidos={lida.regimesOferecidos}
          semanaSalva={semanaSalva({
            tiposDeEvento: publicacao.eventos.map((e) => e.tipo),
            temLancamentoSalvo: lida.temLancamentoSalvo,
          })}
          paradas={
            tiposDeParada.length > 0
              ? {
                  dias: lida.semana.dias.map((d) => d.data),
                  tipos: tiposDeParada,
                  podeGlobal: pode(permissoes, "calendario", "criar"),
                  pararDia,
                }
              : null
          }
          planilha={
            podeBaixarPlanilhaDeContingencia(permissoes, turma.modalidade as string | null) ? (
              <BotaoDeIcone
                acao="baixar"
                rotulo="Baixar planilha de contingência"
                nativo
                href={enderecoDaPlanilhaDeContingencia(codigo)}
                data-slot="baixar-planilha-de-contingencia"
              />
            ) : null
          }
          previa={
            /*
              Spec 024 (D-6): antes da publicação o papel é a PRÉVIA, e ela exige a semana salva (FR-010); depois,
              «Imprimir» imprime a versão vigente (o retrato). ⚠️ Folha de cliente: o endereço leva as assinaturas
              editadas no rodapé (item 4, 08/10/2026).
            */
            <BotaoImprimir
              codigo={codigo}
              semana={escolha.numero}
              ano={escolha.ano}
              sabado={lida.sabadoAberto}
              rotulo={situacaoDaPublicacao.historico.length > 0 ? "Imprimir" : "Gerar prévia"}
              desabilitadoPor={
                situacaoDaPublicacao.historico.length > 0 || situacaoDaPublicacao.podeGerarPrevia
                  ? null
                  : situacaoDaPublicacao.rascunhos > 0
                    ? "salve o rascunho antes"
                    : "salve a semana antes"
              }
            />
          }
          salvar={salvarSemanaDoDsa}
          salvarAlteracao={salvarAlteracaoDoDsa}
          descartar={descartarRascunhoDoDsa}
          fazerAlteracao={fazerAlteracaoNoDsa}
          publicar={publicarSemanaDoDsa}
          limpar={limparSemanaDoDsa}
          lancarEstudoIndividual={lancarEstudoIndividualDaSemana}
          removerEstudoIndividual={removerEstudoIndividualDaSemana}
          definirRegime={definirRegimeDaSemana}
        />
      </header>

      <NotasDaPublicacao situacao={situacaoDaPublicacao} />
      {escolhaDaVersao.aviso ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="aviso-de-versao">
          {escolhaDaVersao.aviso}
        </p>
      ) : null}

      {arquivamentoRes.data !== null ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="turma-arquivada">
          Turma arquivada — o DSA abre só para ler e imprimir. Desarquivam {QUEM_DESARQUIVA}.
        </p>
      ) : arquivamentoRes.error !== null ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="arquivamento-nao-lido">
          Não foi possível conferir se a turma está arquivada, e o lançamento ficou fechado.
          Recarregue a página; se continuar, avise o suporte.
        </p>
      ) : null}

      {/*
        ⚠️ **O QUE A LEITURA NÃO CONSEGUIU LER É DITO** (FR-012.1 da spec 016; `RN-DEG-01`): até 18/10/2026
           a lista que falhava chegava vazia em silêncio — e a sugestão de instrutor por UE nunca aparecia sem
           que ninguém soubesse por quê.
      */}
      {lida.errosDeLeitura.length > 0 ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="aviso-de-leitura">
          Parte da semana não pôde ser lida ({lida.errosDeLeitura.map((e) => e.lista).join(", ")}).
          O que aparece abaixo pode estar incompleto — recarregue a página; se continuar, avise o
          suporte.
        </p>
      ) : null}

      {aviso ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="aviso-de-semana">
          {aviso}
        </p>
      ) : null}

      {/*
        ⚠️ **SEMIPRESENCIAL SEM JANELA: AVISO, SEM BLOQUEIO** (`D-DSA-2`, `RN-DEG-01`). A tela não
           inventa a etapa — mostra o DSA como sempre e diz onde cadastrar.
      */}
      {etapa.tipo === "sem_janela" ? (
        <p
          role="status"
          className="text-sm text-atrasado-tinta"
          data-slot="dsa-sem-etapa-presencial"
        >
          Esta turma é semipresencial e não tem a etapa presencial cadastrada, então todas as
          semanas mostram o DSA.{" "}
          <Link
            href={enderecoDaTurma(codigo)}
            className="underline underline-offset-2 hover:text-texto"
          >
            Cadastre o início e o término da etapa presencial em «Editar turma».
          </Link>
        </p>
      ) : null}

      {/* A semana que a janela corta ao meio: o DSA abre, e os dias de fora são ditos. */}
      {diasADistancia.length > 0 ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="dsa-dias-a-distancia">
          Nesta semana, {diasADistancia.map((d) => dataComDiaDaSemana(d)).join(", ")}{" "}
          {diasADistancia.length === 1 ? "é" : "são"} da etapa a distância: neles não se lança.
        </p>
      ) : null}

      {/*
       * ⚠️ **DEGRADAÇÃO SEGURA, COM O CONSERTO A UM CLIQUE** (`RN-DEG-01`): curso sem vigência de
       * regime não tem relógio, e a grade sai com os TA **numerados**, sem horário — nunca com
       * exceção e nunca vazia. O aviso leva à tela que resolve, em vez de dizer "faltou dado".
       */}
      {/*
       * ⚠️ O LINK LEVAVA À FICHA DA TURMA, que não registra vigência (achado da triagem da spec 022, Bloco 7): a vigência
       *    mora em *Editar curso* → parte *Horários* (spec 022, item 9), e é para lá que ele leva.
       */}
      {semRelogio ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="sem-relogio">
          Este curso não tem vigência de regime que cubra esta semana, então os Tempos de Aula
          aparecem numerados, sem horário.{" "}
          <Link
            href={
              lida.cursoCodigo
                ? // Spec 022 (item 9): a vigência do regime mora na parte *Horários* de Editar curso.
                  `${enderecoDaEdicaoDoCurso(lida.cursoCodigo, undefined, "horarios")}#regime-de-horario`
                : enderecoDaTurma(codigo)
            }
            className="underline underline-offset-2 hover:text-texto"
            data-slot="registrar-vigencia"
          >
            Abra a edição do curso para registrar uma nova vigência.
          </Link>
        </p>
      ) : null}

      {valores.planilha === "falhou" ? (
        <p role="alert" className="text-sm text-conflito-tinta" data-slot="planilha-falhou">
          A planilha de contingência não pôde ser gerada agora. Tente de novo em instantes; se
          continuar, avise o administrador do sistema.
        </p>
      ) : null}

      {/* As paradas e os feriados da semana, com o *Desfazer* (spec 014 e 023; Bloco 15, D-19). */}
      {podeLancar && tiposDeParada.length > 0 ? (
        <ParadasDaSemana
          turmaId={turmaId}
          podeDesfazerGlobal={pode(permissoes, "calendario", "editar")}
          paradas={paradasDaSemana}
          feriados={lida.feriadosNaFaixa}
          desfazerParada={desfazerParada}
        />
      ) : null}

      {/*
        ⚠️ **AS ABAS DE VERSÃO** (Bloco 15, spec 030, `FR-007`): a *Minuta* é a semana de trabalho — os avisos do papel, a
           grade, a situação e o rodapé —, e cada versão publicada é o PAPEL dela, do retrato, com *Reimprimir*. O servidor
           desenha só a aba aberta (`?versao=`).
      */}
      <AbasDeVersao
        abas={abas}
        atual={escolhaDaVersao.numero === null ? "" : String(escolhaDaVersao.numero)}
        seloDaMinuta={
          <span className="flex items-center gap-2 font-normal">
            <SeloDaSemana
              situacao={situacaoDaPublicacao.situacao}
              versao={situacaoDaPublicacao.versaoVigente}
              alteracaoSalva={situacaoDaPublicacao.alteracaoSalva}
            />
            {situacaoDaPublicacao.rascunhos > 0 ? (
              <span className="text-atrasado-tinta text-xs font-medium" data-slot="nao-salvos">
                {situacaoDaPublicacao.rascunhos} lançamento
                {situacaoDaPublicacao.rascunhos === 1 ? "" : "s"} não salvo
                {situacaoDaPublicacao.rascunhos === 1 ? "" : "s"}
              </span>
            ) : null}
          </span>
        }
      >
        {versaoAberta !== null ? (
          <PapelDaVersao
            numero={versaoAberta.numero}
            ocorridoEm={versaoAberta.ocorridoEm}
            autor={versaoAberta.autor}
            justificativa={versaoAberta.justificativa}
            dados={retratoDaVersaoAberta}
            enderecoDeReimpressao={enderecoDaImpressaoDoDsa(codigo, {
              semana: escolha.numero,
              ano: escolha.ano,
              versao: versaoAberta.numero,
            })}
          />
        ) : (
          <>
            {/*
             * ⚠️ **NENHUM DELES BLOQUEIA O BOTÃO** (`RN-DEG-02`): *"regra normativa vira alerta, nunca
             * bloqueio"*. Quem precisa do papel hoje imprime com o traço no cabeçalho e corrige o
             * cadastro depois. ⚠️ Sem cartão (RD-6): a barra mora no cabeçalho.
             */}
            {avisosDaImpressao.length > 0 ? (
              <div role="status" data-slot="avisos-da-impressao" className="flex flex-col gap-1">
                <p className="text-sm font-medium text-atrasado-tinta">
                  O papel sai assim ({avisosDaImpressao.length} aviso
                  {avisosDaImpressao.length > 1 ? "s" : ""}):
                </p>
                <ul className="list-disc pl-5 text-sm text-atrasado-tinta">
                  {avisosDaImpressao.map((texto) => (
                    <li key={texto}>{texto}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <PainelDeLancamento
              semana={lida.semana}
              grade={documento.grade}
              nomesNoCartao={documento.nomesNoCartao}
              disciplinasDaSemana={documento.quadroDeCh.map((d) => ({
                codigo: d.codigo,
                nome: d.nome,
              }))}
              turmaId={turmaId}
              cursoId={cursoId}
              salaDaTurma={(turma.sala_alocada as string | null) ?? null}
              podeLancar={podeLancar}
              unidades={lida.unidades}
              atribuicoesPorUe={lida.atribuicoesPorUe}
              atribuicoesPorDisciplina={lida.atribuicoesPorDisciplina}
              disciplinas={lida.disciplinas}
              avaliacoesParaVista={lida.avaliacoesParaVista}
              avaliacoesDoCurriculo={lida.avaliacoesDoCurriculo}
              instrutores={lida.instrutores}
              habilitacoes={lida.habilitacoes}
              /*
               * FR-006 da spec 029: sem `instrutores.ler`, as listas de instrutor chegam vazias pela RLS (tudo ou nada por
               * perfil), e o vazio tem de dizer «o seu perfil não os alcança» — não «nenhum habilitado».
               */
              podeLerInstrutores={pode(permissoes, "instrutores", "ler")}
              escala={lida.escala}
              tecnicas={lida.tecnicas}
              tiposDeAvaliacao={lida.tiposDeAvaliacao}
              instrumentos={lida.instrumentos}
              subtipos={lida.subtipos}
              podeAtividadeGlobal={pode(permissoes, "atividades_globais", "criar")}
              lancar={lancar}
              mover={mover}
              atualizar={atualizar}
              excluir={excluir}
            />

            {/*
              ⚠️ **O PAINEL FICA ABAIXO DA GRADE, EM LARGURA TOTAL** *(item 3 das correções de 08/10/2026,
                 decisão de Bernardo Villas Boas)*. Até ali ele ficava ao lado a partir de `xl`, numa coluna
                 de 384 px que apertava a grade v4 e cortava os nomes das disciplinas.
              ⚠️ **A CASCATA USA O LANÇADO ATÉ A SEMANA**, o mesmo corte da linha da disciplina — e não o
                 lançado da turma inteira, que é o do formulário (`unidadesDaTurma`).
            */}
            <PainelDeSituacao
              quadros={quadros}
              unidades={lida.unidades.map((u) => ({ ...u, lancada: u.lancadaAteASemana }))}
              avaliacoesPorDisciplina={lida.avaliacoesPorDisciplina}
              rotuloDaSemana={rotuloDaSemana(lida.dias)}
            />

            {/*
              ⚠️ **O RODAPÉ DO PAPEL, NA TELA** — carga horária acumulada, técnicas e as assinaturas da
                 data da semana, do MESMO objeto do `/print/dsa`, no visual do sistema.
            */}
            <RodapeDaSemana dados={documento} nomeDeQuemImprime={usuario?.nome ?? null} />
          </>
        )}
      </AbasDeVersao>
    </EdicaoDasAssinaturasNaTela>
  );
}

/**
 * O título e a linha única da semana (Bloco 15, spec 030, `FR-009`): *código da turma (o link da ficha) · Semana N de T ·
 * 26/10 a 31/10/2026*. Vale para a página com grade e para as sem grade (turma EAD, semana fora da etapa presencial).
 *
 * > *"Deixar UMA linha: código da turma (link para a ficha) · Semana 30 de 37 · 26/10 a 31/10/2026. Sair: 'Voltar à
 * > turma', o ano solto, o número de alunos, o quadro e a linha repetida."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **SEM A SEMANA DO CURSO CONHECIDA, A LINHA SAI SEM ELA** (D-25): código · datas, e não um travessão solto.
 * ⚠️ **O `data-slot="semana-atual"` MUDOU DE LUGAR**: era o rótulo da navegação; os casos de ponta a ponta leem a semana
 *    daqui.
 */
function CabecalhoDoDsa({
  codigo,
  semanaDoCurso,
  dias,
}: {
  readonly codigo: string;
  /** *"Semana N de T"*, de `rotuloDaSemanaDoCurso`; nulo na turma EAD (sem semana). */
  readonly semanaDoCurso: string | null;
  /** Os dias mostrados (segunda a sexta, ou a sábado); vazio na turma EAD. */
  readonly dias: readonly string[];
}) {
  const datas = intervaloDeDatas(dias[0], dias[dias.length - 1]);
  const semana =
    semanaDoCurso !== null && semanaDoCurso !== SEMANA_AUSENTE_NO_CABECALHO ? semanaDoCurso : null;
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <h1 className="text-lg font-semibold text-texto">Detalhe Semanal de Aula</h1>
      <p className="text-sm text-texto-suave tabular-nums" data-slot="semana-atual">
        <Link
          href={enderecoDaTurma(codigo)}
          className="font-medium text-texto underline-offset-2 hover:underline"
          data-slot="turma-do-dsa"
        >
          {codigo}
        </Link>
        {semana ? (
          <>
            {" · "}
            <span className="font-semibold text-texto">{semana}</span>
          </>
        ) : null}
        {datas ? ` · ${datas}` : ""}
      </p>
    </div>
  );
}

/** O desenho de cada ícone do selo (RD-5) — o domínio diz qual, a tela desenha. */
const ICONE_DO_SELO: Readonly<Record<IconeDoSelo, LucideIcon>> = {
  salvo: Save,
  preenchimento: PencilLine,
  carimbo: Stamp,
  alteracao: CheckCheck,
};

const TOM_DO_SELO = {
  em_preenchimento: "planejado",
  registrado: "executado",
  publicado: "conformidade",
  alteracao_em_andamento: "atrasado",
} as const satisfies Record<Situacao, string>;

/**
 * O selo da situação da semana: ícone + palavra (RD-5) — Registrado, Em preenchimento, Publicado, ALT N; Em alteração, e
 * *Em alteração · salva* depois do *Salvar alteração* sem rascunho novo (RP-9, D-8 da spec 029), com o tom da alteração.
 */
function SeloDaSemana({
  situacao,
  versao,
  alteracaoSalva,
}: {
  readonly situacao: Situacao;
  readonly versao: number | null;
  readonly alteracaoSalva: boolean;
}) {
  const selo = seloDaSituacao(situacao, versao, alteracaoSalva);
  return (
    <span data-slot="selo-da-semana" data-selo={selo.palavra}>
      <BadgeStatus
        tom={TOM_DO_SELO[situacao]}
        rotulo={selo.palavra}
        icone={ICONE_DO_SELO[selo.icone]}
      />
    </span>
  );
}

/*
 * ⚠️ **ESTE ARQUIVO NÃO REEXPORTA NADA, E A PRIMEIRA VERSÃO REEXPORTAVA — com custo.** Ela tinha
 * `export { enderecoDoDsa }` no fim, "para a guarda de caminhos", e o resultado foi um defeito que
 * **só aparece no build de produção**: a tela caía no `error.tsx` com *"Minified React error #130"*
 * (*element type is invalid: got undefined*), enquanto em `next dev` a mesma rota respondia **200**.
 * Módulo de página do Next aceita um conjunto FECHADO de exports — `default`, `metadata`,
 * `generateMetadata`, `revalidate`, `dynamic` e alguns mais —, e um export estranho é transformado
 * de um jeito que devolve `undefined` onde o componente deveria estar.
 * ⚠️ **É o gotcha 1 na forma mais cara**: `tsc` passa, `vitest` passa, `next dev` passa, e só o
 * `next build` + a navegação de verdade mostram. Quem monta endereço é
 * `lib/navegacao/endereco-de-turma.ts`, e a guarda já o lê de lá.
 */
export const metadata = { title: "Detalhe Semanal de Aula" };

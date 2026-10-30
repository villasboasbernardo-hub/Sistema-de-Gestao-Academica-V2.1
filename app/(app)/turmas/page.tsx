/**
 * A lista de turmas (`FR-012` a `FR-016`, `FR-022` da spec 012; `RF-CURSO-01`).
 *
 * ⚠️ **ELA EXISTE PORQUE A TURMA NÃO TINHA LUGAR.** Até 04/10/2026 a turma só existia como
 * **parâmetro** de outras telas — `/cursos/[curso]?turma=` e `/disciplinas?curso=&turma=` — e a ficha
 * `/turmas/[turma]`, de pé desde a fatia (a) do Épico 5, só se alcançava **por dentro do curso**. Quem
 * pensava *"quero ver a turma T2"* não tinha por onde começar. Nasceu de uso real, nos testes de
 * Bernardo.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Filtro e tabela são folhas declaradas; a leitura é de servidor.
 *
 * ⚠️ **UMA CONSULTA DE TURMAS POR TELA, E NENHUMA POR LINHA** (`SC-008`). As leituras vão em paralelo: o
 * recorte, o universo de anos, os cursos para o filtro e — para as colunas Progresso e Saldo (FR-014.6 da spec
 * 016) — a CH curricular, a CHD executada até hoje, o regime vigente e os feriados de dia inteiro.
 *
 * ⚠️ **O ESTADO VAZIO DISTINGUE QUATRO COISAS, E ISSO NÃO É ENFEITE** (gotcha 4): *a leitura falhou*,
 * *não há turma neste recorte*, *o seu perfil não lê turmas* e *você não alcança curso nenhum*. A
 * policy `turmas_ler` recorta por alcance **sem erro nenhum** — um perfil estreito recebe lista
 * parcial, e concluir *"não tem turma cadastrada"* a partir de uma lista vazia é exatamente a leitura
 * errada que o gotcha descreve. Quem decide a frase é o **alcance declarado do perfil**, nunca o
 * tamanho da lista.
 *
 * ⚠️ **SÓ O ANO ESCOLHIDO** (RT-6 do Bloco 10, spec 025, D-26): a lista e o painel são de um ano, o do seletor do
 * canto superior direito — o mesmo de todo módulo. O *"Ano"* dos filtros saiu.
 * ⚠️ **FILTROS E ESTATÍSTICAS SÃO ÍCONES NA BARRA** (RT-4, D-19): os seis números passaram para o painel de
 * Estatísticas, recolhido ao chegar.
 * ⚠️ **A ARQUIVADA SOME DA TABELA E CONTINUA NOS NÚMEROS** (RT-8; spec 029, `FR-007.3`): a tabela é lista do dia a
 * dia e só a mostra com *Mostrar arquivadas*; as Estatísticas a contam com ou sem o filtro, pela situação que ela
 * tinha. Por isso o cabeçalho e o vazio dizem quantas ficaram fora da lista (D-19 da spec 029) — sem isso, o *Total*
 * maior que as linhas pareceria defeito.
 */
import { estadosPorRegistro, type ImpedimentosDoRegistro } from "@/lib/dominio/exclusao-permanente";
import { lerContagemPresencial } from "./contagem-presencial";
import { lerRegimesDasSemanas } from "./regimes-das-semanas";
import { AvisoDoRegimeNaoLido } from "./AvisoDoRegimeNaoLido";
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { excluirTurma } from "@/lib/acoes/turma";
import { estadoDaExclusaoDaTurma } from "@/lib/dominio/exclusao-de-turma";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  idsArquivados,
  RECURSO_DO_ARQUIVAMENTO,
  semAsArquivadas,
} from "@/lib/dominio/arquivamento-da-turma";
import { painelDeTurmas } from "@/lib/dominio/painel-de-turmas";
import { emOrdemDeCurso } from "@/lib/dominio/ordem-de-cursos";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import {
  COLUNAS_DA_LISTA_DE_TURMAS,
  comAndamento,
  montarConsultaDeTurmas,
  paraLinhasDeTurma,
  type InsumosDoAndamentoDaLista,
  type LinhaBrutaDeTurma,
} from "./consulta";
import { FiltrosDeTurmas } from "./FiltrosDeTurmas";
import { PainelDeTurmas } from "./PainelDeTurmas";
import { TabelaDeTurmas } from "./TabelaDeTurmas";

export default async function Turmas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário: valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/turmas", await searchParams);

  /* O dia de São Paulo, passado às funções do banco — elas não têm valor padrão (FR-014.3). */
  const hoje = hojeNaCiaara();
  const escolha = await anoEscolhido(String(valores.ano), hoje);
  const filtro = {
    curso: String(valores.curso),
    situacao: String(valores.situacao),
    busca: String(valores.busca),
  };
  /* RT-6: o ano escolhido entra na consulta como o recorte que sempre vale — não é filtro. */
  const parametros = { ...filtro, ano: String(escolha.ano) };

  const supabase = await criarClienteDeServidor();
  /*
   * D-COR-5: a arquivada só aparece NA TABELA com «Mostrar arquivadas» (`?arquivadas=sim`); nos números da página,
   * sempre (RT-8, spec 029).
   */
  const mostrarArquivadas = valores.arquivadas === "sim";

  const [
    usuario,
    recorte,
    universo,
    cursosRes,
    cargasRes,
    executadasRes,
    regimesRes,
    feriadosRes,
    arquivadasRes,
    parametroRes,
    presenciais,
    semanasDasTurmas,
  ] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeTurmas(supabase.from("turmas").select(COLUNAS_DA_LISTA_DE_TURMAS), parametros),
    /* RT-6: se há turma em OUTRO ano, o vazio do ano escolhido diz isso — e não "ainda não existe turma". */
    supabase.from("turmas").select("id", { count: "exact", head: true }),
    supabase
      .from("cursos")
      .select("codigo, nome_curso, classificacao")
      .eq("status", "ativo")
      .order("codigo"),
    /*
     * ⚠️ **AS COLUNAS PROGRESSO E SALDO PELO MESMO CAMINHO DO `/inicio`** (FR-014.6; Q-6): a CH curricular da
     *    view de carga, a executada ATÉ HOJE (`chd_da_turma_ate`, D-COR-2), o regime vigente do curso e os
     *    feriados de dia inteiro e ativos a partir de hoje (`RN-EVT-02`). Nenhuma por linha.
     */
    supabase.from("vw_carga_horaria_turma").select("turma_id, chr_curricular"),
    supabase.rpc("chd_da_turma_ate", { p_ate: hoje }),
    supabase
      .from("vw_cursos_regime_vigente")
      .select("curso_id, regime_padrao_tempos, limite_diario_ead_horas"),
    supabase
      .from("feriados")
      /* Spec 023 (D-4): com as turmas escolhidas, para cada turma descontar só o que a alcança. */
      .select(`data, ${COLUNAS_DA_ABRANGENCIA}`)
      .eq("impacto", "dia_inteiro")
      .eq("status", "ativo")
      .gte("data", hoje),
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    /* O painel (FR-005): o parâmetro do "iniciando". Os avisos do painel saíram para a página Avisos (spec 022). */
    supabase
      .from("config_parametros")
      .select("valor")
      .eq("chave", "turmas.aviso_inicio_dias")
      .eq("status", "ativo")
      .maybeSingle(),
    /* Spec 024 (FR-020): a etapa presencial das semipresenciais. */
    lerContagemPresencial(supabase, hoje),
    /* Spec 029 (`FR-005`): o regime das semanas do DSA — o Saldo soma o TA/dia da semana de cada dia útil. */
    lerRegimesDasSemanas(supabase, { hoje }),
  ]);

  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeLer = pode(permissoes, "turmas", "ler");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const haFiltro = Object.values(filtro).some((v) => v !== "") || mostrarArquivadas;
  const ativos = filtrosForaDoPadrao("/turmas", {
    ...filtro,
    arquivadas: mostrarArquivadas ? "sim" : "",
  });

  /*
   * ⚠️ **FALHA NUMA DAS LEITURAS DO ANDAMENTO NÃO DERRUBA A LISTA E NÃO INVENTA ALERTA** (`RN-DEG-01`): sem a
   *    carga ou sem a executada até hoje, as duas colunas saem «—» em toda linha — a soma antiga, que inclui o
   *    futuro, não volta em silêncio.
   */
  const semAndamento = cargasRes.error !== null || executadasRes.error !== null;
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const doRecorte = paraLinhasDeTurma(
    (recorte.data ?? []) as unknown as readonly LinhaBrutaDeTurma[],
  ).map((l) => ({ ...l, arquivada: arquivadas.has(l.id) }));
  const linhas = comAndamento(
    mostrarArquivadas ? doRecorte : semAsArquivadas(doRecorte, arquivadas, (l) => l.id),
    {
      cargas: semAndamento
        ? []
        : ((cargasRes.data ?? []) as unknown as InsumosDoAndamentoDaLista["cargas"]),
      executadas: (executadasRes.data ?? []) as unknown as InsumosDoAndamentoDaLista["executadas"],
      regimes: (regimesRes.data ?? []) as unknown as InsumosDoAndamentoDaLista["regimes"],
      feriadosDiaInteiro: linhasComAbrangencia<{ data: string }>(feriadosRes.data),
      hoje,
      presenciais,
      semanasDasTurmas: semanasDasTurmas.porTurma,
    },
  );
  /*
   * Spec 029 (`FR-005`; revisão do Bloco 14, achado 7): o regime das semanas que não se leu é dito, uma linha só acima
   *    da tabela — a coluna Saldo sai pela conta de antes (um TA/dia só), e quem olha precisa saber. Só quando a tabela
   *    desenha o Saldo: sem a carga ou a executada ele já sai «—» (`semAndamento`).
   */
  const regimeNaoLido =
    !semanasDasTurmas.lido && !semAndamento && !recorte.error && linhas.length > 0;
  /*
   * ⚠️ **D-19 (spec 029): AS ARQUIVADAS DO RECORTE QUE A TABELA ESCONDE** — o cabeçalho as acrescenta à contagem, e o
   *    vazio diz quantas são e como mostrá-las. Com *Mostrar arquivadas* elas estão na tabela: zero fora da lista.
   */
  const arquivadasForaDaLista = mostrarArquivadas ? 0 : doRecorte.filter((l) => l.arquivada).length;
  const plural = (n: number) => (n === 1 ? "" : "s");
  /*
   * ⚠️ **O PAINEL É DO RECORTE** (C-14): o filtro de curso, situação e busca muda a tabela e os números juntos; a
   *    leitura que falhar vira "não pude ler" (gotcha 4), e o parâmetro não lido vira «—» (regra 8).
   * ⚠️ **MAS NÃO É MAIS "AS MESMAS TURMAS DA TABELA"** (RT-8): o painel recebe o recorte INTEIRO, com a marca de
   *    arquivada, e conta a arquivada com ou sem *Mostrar arquivadas* — o *Total* passa da tabela pelas
   *    `arquivadasForaDaLista`, que o cabeçalho declara (D-19).
   */
  const valorDoParametro = Number.parseInt(
    String((parametroRes.data as { valor?: string } | null)?.valor ?? ""),
    10,
  );
  const diasDeAviso =
    parametroRes.error || !Number.isFinite(valorDoParametro) ? null : valorDoParametro;
  /*
   * ⚠️ **O PAINEL É DE UM ANO SÓ** (ajuste de 19/10/2026): o `ano` da URL, ou o vigente — o de hoje em São Paulo. A
   *    planejada do ano seguinte não entra nos números do vigente.
   */
  const anoDoPainelEscolhido = escolha.ano;
  const painel = painelDeTurmas({
    ano: anoDoPainelEscolhido,
    turmas: doRecorte.map((l) => ({
      id: l.id,
      codigo: l.codigo,
      ano: l.ano,
      status: l.status,
      dataInicio: l.dataInicio,
      dataTermino: l.dataTermino,
      arquivada: l.arquivada,
    })),
    mostrarArquivadas,
    hoje,
    diasDeAviso,
    /* Os avisos do painel moram na página Avisos (spec 022, FR-004.4); aqui ficam só os números. */
    linhas: [],
    ocupacao: [],
  });
  /* D-COR-6 (spec 025): o que prende cada turma da lista, numa ida só — e só para quem exclui (D-9). */
  const podeExcluir = pode(permissoes, "turmas", "criar");
  const impedimentosRes =
    podeExcluir && linhas.length > 0
      ? await supabase.rpc("impedimentos_de_exclusao_das_turmas", {
          p_turmas: linhas.map((l) => l.id),
        })
      : null;
  const exclusao = estadosPorRegistro(
    impedimentosRes === null || impedimentosRes.error
      ? null
      : ((impedimentosRes.data ?? []) as ImpedimentosDoRegistro[]),
    estadoDaExclusaoDaTurma,
  );
  const excluida = String(valores.excluida ?? "");

  /* Spec 022 (FR-003.2): as opções de curso do filtro na ordem única dos cursos. */
  const cursos = emOrdemDeCurso(cursosRes.data ?? []).map((c) => ({
    codigo: c.codigo,
    nome: c.nome_curso,
  }));

  return (
    <ProvedorDePaineis>
      <div className="flex flex-col gap-4" data-slot="lista-de-turmas">
        {/* Spec 019, ajuste A-1: o ano numa caixa de seleção, no canto superior direito — o mesmo do Início. */}
        <header
          className="flex flex-wrap items-start justify-between gap-3"
          data-slot="cabecalho-de-turmas"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Turmas</h1>
            {/*
              veste: a contagem do recorte, em tom secundário, acima da tabela. Conta as LINHAS; as arquivadas fora
              delas vêm à parte (D-19 da spec 029), porque as Estatísticas as contam (RT-8).
            */}
            <p className="text-texto-suave text-sm" data-slot="contagem-de-turmas">
              {linhas.length} turma{plural(linhas.length)} em {anoDoPainelEscolhido}
              {haFiltro ? " neste recorte" : ""}
              {arquivadasForaDaLista > 0
                ? ` · ${arquivadasForaDaLista} arquivada${plural(arquivadasForaDaLista)} fora da lista`
                : ""}
            </p>
          </div>
          <BarraDeAcoes rotulo="Ações das turmas">
            <GatilhoDePainel painel="filtros" contagem={ativos} />
            {recorte.error ? null : <GatilhoDePainel painel="estatisticas" />}
          </BarraDeAcoes>
        </header>

        {excluida ? (
          <p role="status" className="text-executado-tinta text-sm" data-slot="turma-excluida">
            Turma {excluida} excluída permanentemente.
          </p>
        ) : null}

        <ConteudoDePainel painel="filtros">
          <FiltrosDeTurmas cursos={cursos} />
        </ConteudoDePainel>

        {regimeNaoLido ? <AvisoDoRegimeNaoLido /> : null}

        {recorte.error ? null : (
          <ConteudoDePainel painel="estatisticas">
            <PainelDeTurmas
              indicadores={painel.indicadores}
              diasDeAviso={diasDeAviso}
              ano={anoDoPainelEscolhido}
            />
          </ConteudoDePainel>
        )}

        {recorte.error ? (
          /*
           * ⚠️ **FALHA DE LEITURA NÃO ESTOURA A TELA** (`RN-DEG-01`): a lista volta vazia com aviso, e a
           *    pessoa continua com filtro, menu e sessão. Dizer "não há turma" aqui seria afirmar o que
           *    não se mediu.
           */
          <EstadoVazio
            motivo="sem-permissao"
            titulo="Não foi possível ler as turmas agora"
            detalhe="A leitura falhou. Tente de novo; se persistir, procure o suporte."
          />
        ) : linhas.length > 0 ? (
          <TabelaDeTurmas
            linhas={linhas}
            acoes={{
              podeEditar: pode(permissoes, "turmas", "editar"),
              podeArquivar: pode(permissoes, RECURSO_DO_ARQUIVAMENTO, "editar"),
              podeExcluir,
              exclusao,
              excluir: excluirTurma,
            }}
          />
        ) : !podeLer ? (
          <EstadoVazio
            motivo="sem-permissao"
            titulo="O seu perfil não lê o cadastro de turmas"
            detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de turma."
          />
        ) : arquivadasForaDaLista > 0 ? (
          /*
           * ⚠️ **D-19 (spec 029): TODAS AS TURMAS DO RECORTE ESTÃO ARQUIVADAS** — é o uso esperado no fim do ano. Dizer
           *    "Nenhuma turma em ANO" desmentiria o *Total* das Estatísticas, que as conta (RT-8); o vazio diz quantas
           *    são e o caminho para vê-las. Vem antes dos vazios de filtro e de ano, que perguntam outra coisa.
           */
          <EstadoVazio
            motivo="sem-dado"
            titulo={`Nenhuma turma de ${anoDoPainelEscolhido} na lista`}
            detalhe={`Há ${arquivadasForaDaLista} turma${plural(arquivadasForaDaLista)} arquivada${plural(arquivadasForaDaLista)} em ${anoDoPainelEscolhido}${haFiltro ? " neste recorte" : ""}, fora da lista. Para ${arquivadasForaDaLista === 1 ? "vê-la" : "vê-las"}, abra os Filtros e, em Arquivadas, escolha «Mostrar arquivadas».`}
          />
        ) : haFiltro ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Nenhuma turma neste recorte"
            detalhe="Afrouxe ou limpe os filtros acima."
          />
        ) : (universo.count ?? 0) > 0 ? (
          <EstadoVazio
            motivo="sem-dado"
            titulo={`Nenhuma turma em ${anoDoPainelEscolhido}`}
            detalhe="As turmas de outros anos aparecem trocando o ano, no canto superior direito."
          />
        ) : alcance === "recortado" ? (
          /*
           * ⚠️ **SEM FILTRO E SEM LINHA, COM PERMISSÃO DE LER: a pergunta é se a pessoa ALCANÇA algum
           *    curso.** Um Operador de escopo estreito sem curso atribuído lê zero turmas, e a frase
           *    "ainda não existe turma" seria falsa — existem 28 no banco.
           */
          <EstadoVazio
            motivo="sem-permissao"
            titulo="Você não alcança turmas"
            detalhe="O seu perfil vê só as turmas dos cursos sob a sua responsabilidade."
          />
        ) : (
          <EstadoVazio
            motivo="sem-dado"
            titulo="Ainda não existe turma cadastrada"
            detalhe="As turmas nascem na página do curso, em “Nova turma”."
          />
        )}
      </div>
    </ProvedorDePaineis>
  );
}

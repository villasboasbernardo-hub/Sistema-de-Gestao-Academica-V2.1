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
 */
import { COLUNAS_DA_ABRANGENCIA, linhasComAbrangencia } from "@/lib/calendario/abrangencia";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  idsArquivados,
  RECURSO_DO_ARQUIVAMENTO,
  semAsArquivadas,
} from "@/lib/dominio/arquivamento-da-turma";
import { anoDoPainel, anosDoSeletor, painelDeTurmas } from "@/lib/dominio/painel-de-turmas";
import { emOrdemDeCurso } from "@/lib/dominio/ordem-de-cursos";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import {
  anosDistintos,
  COLUNAS_DA_LISTA_DE_TURMAS,
  comAndamento,
  montarConsultaDeTurmas,
  paraLinhasDeTurma,
  type InsumosDoAndamentoDaLista,
  type LinhaBrutaDeTurma,
} from "./consulta";
import { AnoDoPainel } from "./AnoDoPainel";
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

  const parametros = {
    curso: String(valores.curso),
    ano: String(valores.ano),
    situacao: String(valores.situacao),
    busca: String(valores.busca),
  };

  const supabase = await criarClienteDeServidor();
  /* O dia de São Paulo, passado às funções do banco — elas não têm valor padrão (FR-014.3). */
  const hoje = hojeNaCiaara();
  /* D-COR-5: a arquivada só aparece com «Mostrar arquivadas» (`?arquivadas=sim`). */
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
  ] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeTurmas(supabase.from("turmas").select(COLUNAS_DA_LISTA_DE_TURMAS), parametros),
    supabase.from("turmas").select("ano_letivo"),
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
  ]);

  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeLer = pode(permissoes, "turmas", "ler");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const haFiltro = Object.values(parametros).some((v) => v !== "") || mostrarArquivadas;

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
    },
  );
  /*
   * ⚠️ **O PAINEL É DO RECORTE** (C-14): as mesmas turmas da tabela; a leitura que falhar vira "não pude ler"
   *    (gotcha 4), e o parâmetro não lido vira «—» (regra 8).
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
  const vigente = anoDoPainel("", hoje);
  const anoDoPainelEscolhido = anoDoPainel(parametros.ano, hoje);
  const anos = anosDistintos(universo.data ?? []);
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
  /* Spec 022 (FR-003.2): as opções de curso do filtro na ordem única dos cursos. */
  const cursos = emOrdemDeCurso(cursosRes.data ?? []).map((c) => ({
    codigo: c.codigo,
    nome: c.nome_curso,
  }));

  return (
    <div className="flex flex-col gap-4" data-slot="lista-de-turmas">
      {/* Spec 019, ajuste A-1: o ano numa caixa de seleção, no canto superior direito — o mesmo do Início. */}
      <header
        className="flex flex-wrap items-start justify-between gap-3"
        data-slot="cabecalho-de-turmas"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-texto text-xl font-semibold">Turmas</h1>
          {/* veste: a contagem do recorte, em tom secundário, acima da tabela */}
          <p className="text-texto-suave text-sm" data-slot="contagem-de-turmas">
            {linhas.length} turma{linhas.length === 1 ? "" : "s"}
            {haFiltro ? " neste recorte" : ""}
          </p>
        </div>
        <AnoDoPainel
          ano={anoDoPainelEscolhido}
          anos={anosDoSeletor(anos, vigente)}
          vigente={vigente}
        />
      </header>

      {recorte.error ? null : (
        <PainelDeTurmas
          indicadores={painel.indicadores}
          diasDeAviso={diasDeAviso}
          ano={anoDoPainelEscolhido}
        />
      )}

      <FiltrosDeTurmas cursos={cursos} anos={anos} />

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
          podeArquivarTurmas={pode(permissoes, RECURSO_DO_ARQUIVAMENTO, "editar")}
        />
      ) : !podeLer ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não lê o cadastro de turmas"
          detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de turma."
        />
      ) : haFiltro ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhuma turma neste recorte"
          detalhe="Afrouxe ou limpe os filtros acima."
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
  );
}

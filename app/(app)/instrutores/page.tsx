/**
 * Instrutores — a listagem (`RF-INSTR-01`, `RN-ANT-01` e `FR-027.1` da spec 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** A tabela é folha, noutro arquivo. Um `"use client"` aqui mandaria a
 * listagem de 177 linhas inteira para o navegador, e o erro não aparece na checagem de tipos.
 *
 * ⚠️ **A ORDEM VEM DO BANCO.** A consulta é montada por `consulta.ts`, que pede `ordem_antiguidade`
 * sempre; `?ordem=` reordena por cima, na folha. É a separação que `tests/unidade/consulta-de-instrutores.test.ts`
 * prova, e que a varredura de `ordenacao-de-instrutor.test.ts` cobra de toda tela nova.
 *
 * ⚠️ **A CARGA DO ANO É LIDA, NUNCA DIGITADA** (`FR-014`, `RN-INST-04`). Ela vem de
 * `vw_instrutor_carga_anual`, na mesma rodada de consultas, e é casada por `instrutor_id`. A view só
 * tem linha de um ano em que houve fato: **ausência é zero**, não "instrutor sumido".
 *
 * ⚠️ **INDICADORES, GRÁFICOS E AVISOS SÃO DO RECORTE** (spec 015 da v2.0, `FR-016`). Eles são
 * calculados sobre as mesmas linhas que a tabela mostra, pelas funções de `lib/dominio/`; mudar um
 * filtro muda os três junto com a lista, e nunca mostra o total seguido de uma correção.
 *
 * ⚠️ **SEM PERMISSÃO E SEM DADO SÃO VAZIOS DIFERENTES** (`FR-027.4`, gotcha nº 4). A negativa da RLS
 * de leitura filtra em silêncio: a tela confere a permissão antes de dizer "não há".
 *
 * ⚠️ **ERRO DE LEITURA NÃO ESTOURA** (`RN-DEG-01`): vira o vazio de "você não vê", que é o que uma
 * negativa da RLS de fato significa.
 */

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { escalaDeLinhas } from "@/lib/dominio/antiguidade";
import { capacitacaoDoCadastro } from "@/lib/dominio/capacitacao-didatica";
import { graficosDeInstrutores } from "@/lib/dominio/graficos-instrutor";
import { indicadoresDeInstrutores } from "@/lib/dominio/indicadores-instrutor";
import {
  filtrarPorSelecao,
  noRecorteDeCurso,
  selecionadosNoAno,
  type DesignacaoComAno,
  type HabilitacaoNoCurso,
} from "@/lib/dominio/selecao-no-ano";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { lerParametros } from "@/lib/navegacao/esquema";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { contagemNaPrimeira, lerTodasAsPaginas } from "@/lib/supabase/paginacao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_LISTAGEM,
  montarConsultaDeInstrutores,
  type ParametrosDaListagem,
} from "./consulta";
import { FiltrosDeInstrutores } from "./FiltrosDeInstrutores";
import { opcoesDosFiltros } from "./opcoes";
import { PainelDeInstrutores } from "./PainelDeInstrutores";
import { TabelaDeInstrutores, type LinhaDeInstrutor } from "./TabelaDeInstrutores";

/** Uma designação lida, com a turma embutida (`turma_disciplina!inner(…, turmas!inner(ano_letivo))`). */
type DesignacaoLida = {
  readonly instrutor_id: string;
  readonly turma_disciplina: {
    readonly turmas: {
      readonly ano_letivo: number;
      readonly curso: { readonly codigo: string; readonly classificacao: string } | null;
    } | null;
  } | null;
};

/** Uma habilitação lida, com o curso da disciplina embutido. */
type HabilitacaoLida = {
  readonly instrutor_id: string;
  readonly disciplina: {
    readonly curso: { readonly codigo: string; readonly classificacao: string } | null;
  } | null;
};

export default async function Instrutores({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * ⚠️ A VALIDAÇÃO ACONTECE ANTES DE O VALOR ALCANÇAR A CONSULTA. Com o `RF-NAV-01`, a barra de
   * endereço é entrada de usuário; valor fora do domínio cai para o padrão e nunca vira predicado.
   */
  const { valores } = lerParametros("/instrutores", await searchParams);
  const parametros: ParametrosDaListagem = {
    busca: String(valores.busca),
    om: String(valores.om),
    categoria: String(valores.categoria),
    capacitacao: String(valores.capacitacao),
    regime: String(valores.regime),
    escolaridade: String(valores.escolaridade),
    posto: String(valores.posto),
    circulo: String(valores.circulo),
    curso: String(valores.curso),
    classificacao: String(valores.classificacao),
    habilitado: String(valores.habilitado),
    selecionado: String(valores.selecionado),
    situacao: String(valores.situacao),
    ordem: String(valores.ordem),
  };

  /* RT-6 (spec 025, D-26): a coluna *CH do ano* é a do ano escolhido. */
  const escolha = await anoEscolhido(String(valores.ano));
  const ano = escolha.ano;
  const supabase = await criarClienteDeServidor();
  const [
    usuario,
    { data, error },
    cargaRes,
    cursosRes,
    escalaRes,
    opcoesRes,
    designacoesRes,
    habilitacoesRes,
  ] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeInstrutores(
      supabase.from("vw_instrutores").select(COLUNAS_DA_LISTAGEM),
      parametros,
    ),
    supabase
      .from("vw_instrutor_carga_anual")
      .select("instrutor_id, ta_ministrado_ano")
      .eq("ano", ano),
    /*
     * ⚠️ `status` ENTRA NA CONSULTA (`FR-017.10` da spec 009). Curso inativo CONTINUA no filtro — a
     * listagem de instrutores é consulta sobre histórico, e esconder o curso arquivado tornaria o
     * passado inalcançável. O que muda é que ele vai para o FIM da lista e sai marcado, o que
     * `opcoesDosFiltros` resolve. Sem a coluna, os dois ficam indistinguíveis.
     */
    supabase.from("cursos").select("codigo, status, classificacao").order("codigo"),
    supabase
      .from("config_listas")
      .select("valor, ordem, ativo")
      .eq("lista", "escala_antiguidade")
      .order("ordem"),
    // As opções dos filtros saem do cadastro inteiro, não do recorte (ver `opcoes.ts`).
    supabase
      .from("vw_instrutores")
      .select("om, categoria, nivel_escolaridade, posto_graduacao")
      .order("ordem_antiguidade"),
    /*
     * ⚠️ O SELECIONADO TEM ANO (conferência do PR #90, 24/10/2026): as designações ativas em linha de turma
     *    ativa, com o ano da TURMA. A coluna `selecionado` da view vale para qualquer ano — em 2027, sem turma
     *    designada, ela dava os 34 de 2026. Em páginas, como toda leitura que pode passar do teto.
     */
    lerTodasAsPaginas((f) =>
      supabase
        .from("turma_disciplina_instrutor")
        .select(
          "id, instrutor_id, turma_disciplina!inner(status, turmas!inner(ano_letivo, curso:cursos!turmas_curso_id_fkey(codigo, classificacao)))",
          contagemNaPrimeira(f),
        )
        .eq("status", "ativo")
        .eq("turma_disciplina.status", "ativo")
        .order("id")
        .range(f.de, f.ate),
    ),
    /*
     * D-40 invertida (conferência final de 25/10/2026): o filtro Curso também conta o HABILITADO, que não tem ano —
     * as habilitações ativas com o curso da disciplina. Só quando há filtro de curso ou classificação.
     */
    parametros.curso === "" && parametros.classificacao === ""
      ? Promise.resolve({ data: [], error: null })
      : lerTodasAsPaginas((f) =>
          supabase
            .from("instrutor_disciplina")
            .select(
              "id, instrutor_id, disciplina:disciplinas!inner(curso:cursos!disciplinas_curso_id_fkey(codigo, classificacao))",
              contagemNaPrimeira(f),
            )
            .eq("status", "ativo")
            .order("id")
            .range(f.de, f.ate),
        ),
  ]);
  const escala = escalaDeLinhas(
    (escalaRes.data ?? []).map((e) => ({
      valor: e.valor,
      ordem: Number(e.ordem),
      ativo: e.ativo !== false,
    })),
  );
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutores</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  /*
   * ⚠️ A CARGA QUE FALHA NÃO DERRUBA A LISTA (`RN-DEG-01`). Sem ela, a coluna mostra "—" e um aviso
   * diz por quê; zero seria mentira — afirmaria que ninguém deu aula.
   */
  const cargaDisponivel = !cargaRes.error;
  const cargaPorInstrutor = new Map<string, number>();
  for (const c of cargaRes.data ?? []) {
    if (c.instrutor_id) cargaPorInstrutor.set(c.instrutor_id, Number(c.ta_ministrado_ano ?? 0));
  }

  /*
   * Sem as designações lidas, ninguém conta como selecionado — e um aviso diz por quê (`RN-DEG-01`): o número
   * da view, sem ano, seria o defeito de volta.
   */
  const selecaoLida = !designacoesRes.error;
  const designacoes: readonly DesignacaoComAno[] = selecaoLida
    ? ((designacoesRes.data ?? []) as DesignacaoLida[]).map((d) => ({
        instrutorId: d.instrutor_id,
        anoDaTurma: d.turma_disciplina?.turmas?.ano_letivo ?? null,
        cursoCodigo: d.turma_disciplina?.turmas?.curso?.codigo ?? null,
        classificacao: d.turma_disciplina?.turmas?.curso?.classificacao ?? null,
      }))
    : [];
  const selecionados = selecionadosNoAno(designacoes, ano);
  /* D-40 invertida (25/10/2026): Curso e Classificação — habilitado (sem ano) OU designado no ano escolhido. */
  const habilitacoes: readonly HabilitacaoNoCurso[] = (
    (habilitacoesRes.data ?? []) as HabilitacaoLida[]
  ).map((h) => ({
    instrutorId: h.instrutor_id,
    cursoCodigo: h.disciplina?.curso?.codigo ?? null,
    classificacao: h.disciplina?.curso?.classificacao ?? null,
  }));
  const doCurso = noRecorteDeCurso(designacoes, habilitacoes, ano, {
    curso: parametros.curso,
    classificacao: parametros.classificacao,
  });
  const brutas = filtrarPorSelecao(data ?? [], selecionados, parametros.selecionado).filter(
    (b) => doCurso === null || doCurso.has(b.id as string),
  );
  const linhas: LinhaDeInstrutor[] = brutas.map((i) => ({
    id: i.id as string,
    codigo: i.codigo as string,
    pg: i.posto_graduacao as string,
    especialidade: i.esp_hab_obs,
    nomeCompleto: i.nome_completo as string,
    nomeDeGuerra: i.nome_guerra,
    categoria: i.categoria as string,
    om: i.om as string,
    regime: i.regime_trabalho,
    ordemAntiguidade: i.ordem_antiguidade as number,
    cargaNoAno: cargaDisponivel ? (cargaPorInstrutor.get(i.id as string) ?? 0) : null,
  }));

  /*
   * ⚠️ HABILITADO VEM DA PRÓPRIA LINHA (`vw_instrutores`, migration `20260915091717`); SELECIONADO, das
   * designações do ANO (`selecionadosNoAno`). Os dois são o mesmo critério dos filtros — cartão, gráfico e
   * filtro não podem discordar.
   */
  /* Spec 020 (Bloco 5): a lista fechada e o texto que não casou — "tem capacitação" é um dos dois (C-12). */
  const capacitacaoDaLinha = (n: number) =>
    capacitacaoDoCadastro(
      brutas[n]?.capacitacoes_didaticas,
      brutas[n]?.capacitacao_didatica_a_corrigir,
    );
  const habilitados = new Set(
    brutas.filter((b) => b.habilitado === true).map((b) => b.id as string),
  );
  const selecionadosDoRecorte = new Set(
    brutas.map((b) => b.id as string).filter((id) => selecionados.has(id)),
  );
  const indicadores = indicadoresDeInstrutores(
    linhas.map((l, n) => ({
      id: l.id,
      capacitacao: capacitacaoDaLinha(n),
    })),
    habilitados,
    selecionadosDoRecorte,
  );
  const graficos = graficosDeInstrutores(
    linhas.map((l, n) => ({
      id: l.id,
      pg: l.pg,
      categoria: l.categoria,
      om: l.om,
      escolaridade: brutas[n]?.nivel_escolaridade ?? null,
      regime: l.regime,
      capacitacao: capacitacaoDaLinha(n),
    })),
    escala,
    indicadores.taxaDeSelecao,
  );
  const opcoes = opcoesDosFiltros(opcoesRes.data ?? [], cursosRes.data ?? [], escala);
  const podeLer = pode(permissoes, "instrutores", "ler");

  /* RT-4 (spec 025, D-18): o número no ícone é a mesma régua do *Limpar filtros*; a ordem não é filtro. */
  const { busca, om, categoria, capacitacao, regime, escolaridade, posto, circulo } = parametros;
  const { curso, classificacao, habilitado, selecionado, situacao } = parametros;
  const ativos = filtrosForaDoPadrao("/instrutores", {
    busca,
    om,
    categoria,
    capacitacao,
    regime,
    escolaridade,
    posto,
    circulo,
    curso,
    classificacao,
    habilitado,
    selecionado,
    situacao,
  });

  return (
    <ProvedorDePaineis>
      <section className="flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-texto text-lg font-semibold">Instrutores</h1>
            <BarraDeAcoes rotulo="Ações dos instrutores">
              <GatilhoDePainel painel="filtros" contagem={ativos} />
              <GatilhoDePainel painel="estatisticas" />
              {/* ⚠️ Oculto para quem não pode criar — e a RLS nega se a ação vier por fora da tela. */}
              <SePodeVer permissoes={permissoes} recurso="instrutores" acao="criar">
                <BotaoDeIcone
                  acao="novo"
                  rotulo="Novo instrutor"
                  variante="padrao"
                  href="/instrutores/novo"
                />
              </SePodeVer>
            </BarraDeAcoes>
          </div>
          {/* veste: a dica que explica a ordem da lista — texto fixo, nunca dado */}
          <p className="text-texto-tenue text-xs">
            A lista sai sempre em antiguidade. Clicar num cabeçalho reordena só a exibição.
          </p>
        </header>

        {/* ⚠️ No topo, acima dos filtros, e recolhido — com as contagens à vista (emenda de 15/09/2026 ao FR-027). */}
        {/* Os avisos de qualidade de cadastro saíram daqui no Bloco 7 (spec 022, FR-004.4; A-2): página Avisos. */}

        <ConteudoDePainel painel="filtros">
          <FiltrosDeInstrutores opcoes={opcoes} />
        </ConteudoDePainel>

        <ConteudoDePainel painel="estatisticas">
          <PainelDeInstrutores indicadores={indicadores} graficos={graficos} ano={ano} />
        </ConteudoDePainel>

        <p className="text-texto-suave text-sm" data-slot="contagem-de-instrutores">
          {linhas.length} instrutor(es){" "}
          {parametros.situacao === "inativo" ? "inativo(s)" : "ativo(s)"}
        </p>

        {habilitacoesRes.error && (
          <p
            className="text-texto-suave text-sm"
            role="status"
            data-slot="habilitacoes-indisponiveis"
          >
            Não foi possível ler as habilitações: o filtro Curso mostra só os designados em {ano}
            até a leitura voltar.
          </p>
        )}

        {!selecaoLida && (
          <p className="text-texto-suave text-sm" role="status" data-slot="selecao-indisponivel">
            Não foi possível ler as designações de {ano}. Selecionados, o status da seleção e os
            filtros Curso e Classificação saem sem elas até a leitura voltar.
          </p>
        )}

        {!cargaDisponivel && (
          <p className="text-texto-suave text-sm" role="status" data-slot="carga-indisponivel">
            Não foi possível ler a carga horária de {ano}. A lista continua completa; a coluna
            mostra “—” até a leitura voltar.
          </p>
        )}

        {linhas.length === 0 ? (
          podeLer ? (
            <EstadoVazio
              motivo="sem-dado"
              titulo="Nenhum instrutor neste recorte"
              detalhe="O seu perfil lê o cadastro inteiro: não é falta de acesso. Afrouxe ou limpe os filtros."
            />
          ) : (
            <EstadoVazio
              motivo="sem-permissao"
              detalhe="O seu perfil não lê o cadastro de instrutores. Fale com o Admin se precisar."
            />
          )
        ) : (
          <TabelaDeInstrutores linhas={linhas} ano={ano} />
        )}
      </section>
    </ProvedorDePaineis>
  );
}

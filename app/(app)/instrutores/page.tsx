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
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { SePodeVer } from "@/components/ciaara/SePodeVer";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { escalaDeLinhas } from "@/lib/dominio/antiguidade";
import {
  AVISOS_INICIAIS,
  avisosDoCadastro,
  type RegraDeAviso,
} from "@/lib/dominio/avisos-cadastro-instrutor";
import { graficosDeInstrutores } from "@/lib/dominio/graficos-instrutor";
import { indicadoresDeInstrutores } from "@/lib/dominio/indicadores-instrutor";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { anoCorrente } from "@/lib/formato/ano-corrente";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_LISTAGEM,
  montarConsultaDeInstrutores,
  type ParametrosDaListagem,
} from "./consulta";
import { FiltrosDeInstrutores } from "./FiltrosDeInstrutores";
import { opcoesDosFiltros } from "./opcoes";
import { PainelDeInstrutores } from "./PainelDeInstrutores";
import { QuadroDeAvisos, type InstrutorDoAviso } from "./QuadroDeAvisos";
import { TabelaDeInstrutores, type LinhaDeInstrutor } from "./TabelaDeInstrutores";

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

  const ano = anoCorrente();
  const supabase = await criarClienteDeServidor();
  const [usuario, { data, error }, cargaRes, cursosRes, escalaRes, opcoesRes] = await Promise.all([
    usuarioDaSessao(),
    montarConsultaDeInstrutores(
      supabase.from("vw_instrutores").select(COLUNAS_DA_LISTAGEM),
      parametros,
    ),
    supabase
      .from("vw_instrutor_carga_anual")
      .select("instrutor_id, ta_ministrado_ano")
      .eq("ano", ano),
    supabase.from("cursos").select("codigo").order("codigo"),
    supabase
      .from("config_listas")
      .select("valor, ordem, ativo")
      .eq("lista", "escala_antiguidade")
      .order("ordem"),
    // As opções dos filtros saem do cadastro inteiro, não do recorte (ver `opcoes.ts`).
    supabase
      .from("vw_instrutores")
      .select("om, categoria, capacitacao_didatica, nivel_escolaridade, posto_graduacao")
      .order("ordem_antiguidade"),
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

  const brutas = data ?? [];
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
   * ⚠️ HABILITADO E SELECIONADO VÊM DA PRÓPRIA LINHA (`vw_instrutores`, migration `20260915091717`),
   * que é o mesmo critério dos filtros — cartão, gráfico e filtro não podem discordar.
   */
  const idsOnde = (coluna: "habilitado" | "selecionado") =>
    new Set(brutas.filter((b) => b[coluna] === true).map((b) => b.id as string));
  const indicadores = indicadoresDeInstrutores(
    linhas.map((l, n) => ({
      id: l.id,
      capacitacaoDidatica: brutas[n]?.capacitacao_didatica ?? null,
      cargaNoAno: l.cargaNoAno,
    })),
    idsOnde("habilitado"),
    idsOnde("selecionado"),
  );
  const graficos = graficosDeInstrutores(
    linhas.map((l, n) => ({
      id: l.id,
      pg: l.pg,
      categoria: l.categoria,
      om: l.om,
      escolaridade: brutas[n]?.nivel_escolaridade ?? null,
      regime: l.regime,
      capacitacaoDidatica: brutas[n]?.capacitacao_didatica ?? null,
    })),
    escala,
    indicadores.taxaDeSelecao,
  );
  const avisos = avisosDoCadastro<InstrutorDoAviso & Parameters<RegraDeAviso["seAplica"]>[0]>(
    linhas.map((l, n) => ({
      id: l.id,
      codigo: l.codigo,
      pg: l.pg,
      especialidade: l.especialidade,
      nomeCompleto: l.nomeCompleto,
      nomeDeGuerra: l.nomeDeGuerra,
      categoria: l.categoria,
      om: l.om,
      nip: (brutas[n]?.nip as string | null | undefined) ?? null,
    })),
    AVISOS_INICIAIS,
  );
  const opcoes = opcoesDosFiltros(opcoesRes.data ?? [], cursosRes.data ?? [], escala);
  const podeLer = pode(permissoes, "instrutores", "ler");

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-texto text-lg font-semibold">Instrutores</h1>
          {/* ⚠️ Oculto para quem não pode criar — e a RLS nega se a ação vier por fora da tela. */}
          <SePodeVer permissoes={permissoes} recurso="instrutores" acao="criar">
            <Link
              href="/instrutores/novo"
              className="border-marca bg-marca text-marca-contraste rounded-ciaara focus-visible:ring-marca border px-3 py-1 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
            >
              Novo instrutor
            </Link>
          </SePodeVer>
        </div>
        {/* veste: a dica que explica a ordem da lista — texto fixo, nunca dado */}
        <p className="text-texto-tenue text-xs">
          A lista sai sempre em antiguidade. Clicar num cabeçalho reordena só a exibição.
        </p>
      </header>

      <FiltrosDeInstrutores opcoes={opcoes} />

      <QuadroDeAvisos avisos={avisos} />

      <PainelDeInstrutores indicadores={indicadores} graficos={graficos} ano={ano} />

      <p className="text-texto-suave text-sm" data-slot="contagem-de-instrutores">
        {linhas.length} instrutor(es){" "}
        {parametros.situacao === "inativo" ? "inativo(s)" : "ativo(s)"}
      </p>

      {!cargaDisponivel && (
        <p className="text-texto-suave text-sm" role="status" data-slot="carga-indisponivel">
          Não foi possível ler a carga horária de {ano}. A lista continua completa; a coluna mostra
          “—” até a leitura voltar.
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
  );
}

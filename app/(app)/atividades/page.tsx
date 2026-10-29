/**
 * `/atividades` — a lista de atividades não letivas (spec 014, PR 2, `FR-063`; `RF-EXTRA-03`).
 *
 * ⚠️ **SÓ LEITURA.** O lançamento continua no DSA da turma; aqui se consulta por turma, tipo,
 *    categoria (Apoio Individualizado e a global inclusive), data e TA.
 * ⚠️ **O FILTRO ESTÁ NA URL** e é validado antes de virar predicado (`RF-NAV-01`): valor fora do
 *    contrato cai para o padrão.
 * ⚠️ **"NÃO HÁ" × "VOCÊ NÃO VÊ"** (gotcha 4): a RLS nega em silêncio, e a frase do vazio distingue.
 * ⚠️ SEM MARCADOR DE CLIENTE. Só os filtros, as abas e o painel do calendário são folha.
 * ⚠️ **A ABA CALENDÁRIO** (spec 023, Bloco 8, FR-005 a FR-014) só existe para quem tem `calendario.criar` ou
 *    `calendario.editar`; para os demais a página é a de antes, sem abas, e `?aba=calendario` cai na lista. Só a aba
 *    aberta é lida no servidor.
 * ⚠️ **O *EXCLUIR* DO CALENDÁRIO É SÓ DO ADMIN E NUNCA BLOQUEADO** (D-COR-7, spec 027): exclusão lógica, depois do alerta
 *    com o impacto calculado na hora.
 * ⚠️ **AS DUAS ABAS SEGUEM O ANO ESCOLHIDO** (RT-6 do Bloco 10, spec 025, D-26): a lista mostra só as atividades do ano
 *    (as datas *De* e *Até* recortam dentro dele), e o filtro de turma oferece só as turmas do ano. O seletor é o mesmo de
 *    todo módulo, no canto superior direito, e o *Filtros* da lista é um ícone ao lado dele (RT-4).
 */
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { SeletorDeAno } from "@/components/ciaara/seletor-de-ano";
import {
  excluirLinhaDoCalendario,
  gravarLinhaDoCalendario,
  lerImpactoDaExclusao,
  mudarSituacaoDaLinha,
} from "@/lib/acoes/calendario";
import { desfazerParada, pararDia } from "@/lib/acoes/dia-parado";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { dataParaLeitura } from "@/lib/formato/data";
import { lerParametros } from "@/lib/navegacao/esquema";
import { idsArquivados, semAsArquivadas } from "@/lib/dominio/arquivamento-da-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../cursos/consulta";
import {
  COLUNAS_DAS_ATIVIDADES,
  LIMITE_DE_ATIVIDADES,
  paraLinhas,
  ROTULO_DA_CATEGORIA,
} from "./consulta";
import { AbasDeAtividades } from "./AbasDeAtividades";
import { lerCalendario } from "./calendario";
import { predicadoDoAno } from "./predicado-do-ano";
import { FiltrosDeAtividades } from "./FiltrosDeAtividades";
import { PainelDoCalendario } from "./PainelDoCalendario";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function Atividades({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { valores } = lerParametros("/atividades", await searchParams);
  const filtro = {
    turma: String(valores.turma),
    categoria: String(valores.categoria),
    tipo: String(valores.tipo),
    de: DATA_ISO.test(String(valores.de)) ? String(valores.de) : "",
    ate: DATA_ISO.test(String(valores.ate)) ? String(valores.ate) : "",
  };

  const supabase = await criarClienteDeServidor();
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const podeCriarNoCalendario = pode(permissoes, "calendario", "criar");
  const podeEditarCalendario = pode(permissoes, "calendario", "editar");
  const temCalendario = podeCriarNoCalendario || podeEditarCalendario;
  const aba = temCalendario && valores.aba === "calendario" ? "calendario" : "atividades";

  const hoje = hojeNaCiaara();
  const escolha = await anoEscolhido(String(valores.ano ?? ""), hoje);
  const ano = escolha.ano;
  const seletorDeAno = (
    <SeletorDeAno ano={ano} vigente={escolha.vigente} origem={escolha.origem} rota="/atividades" />
  );

  if (aba === "calendario") {
    const dados = await lerCalendario(supabase, ano);
    /*
     * D-COR-7 (spec 027, FR-004): só o Admin exclui do calendário — e o *Excluir* nunca é bloqueado (a D-COR-6 deixou de
     * valer aqui). Quem recusa a chamada direta é o banco (`app.eh_admin()`).
     */
    const podeExcluirDoCalendario = usuario?.perfil === "admin";
    return (
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm">
              Feriados, licenças e paradas de todas as turmas. Linha de dia inteiro bloqueia aula
              nova e desconta capacidade do saldo das turmas que alcança.
            </p>
          </div>
          <BarraDeAcoes rotulo="Ano das atividades">{seletorDeAno}</BarraDeAcoes>
        </header>
        <AbasDeAtividades>
          <PainelDoCalendario
            ano={ano}
            dados={dados}
            podeCriar={podeCriarNoCalendario}
            podeEditar={podeEditarCalendario}
            gravar={gravarLinhaDoCalendario}
            mudarSituacao={mudarSituacaoDaLinha}
            pararDia={pararDia}
            desfazerParada={desfazerParada}
            podeExcluir={podeExcluirDoCalendario}
            lerImpacto={lerImpactoDaExclusao}
            excluir={excluirLinhaDoCalendario}
          />
        </AbasDeAtividades>
      </div>
    );
  }

  /*
   * ⚠️ RT-6 (conferência do PR #90, 24/10/2026): a atividade de turma vale no ANO DA TURMA, nunca pela data; a global
   *    (sem turma), pela data. Por isso as turmas do ano vêm antes — o recorte precisa dos ids delas.
   */
  const turmasRes = await supabase
    .from("turmas")
    .select("id, codigo")
    .eq("ano_letivo", ano)
    .order("codigo");
  const idsDoAno = (turmasRes.data ?? []).map((t) => t.id as string);

  let consulta = supabase
    .from("atividades_nao_letivas")
    .select(
      filtro.turma
        ? COLUNAS_DAS_ATIVIDADES.replace("turmas(codigo)", "turmas!inner(codigo)")
        : COLUNAS_DAS_ATIVIDADES,
    )
    .eq("status", "ativo")
    /* Spec 024 (RP-0/RP-8): o rascunho só aparece no DSA da turma; a lista é do salvo. */
    .eq("salvo", true)
    /* RT-6 (spec 025, D-26; conferência de 24/10/2026): só o ano escolhido — o da turma. */
    .or(predicadoDoAno(ano, idsDoAno));
  if (filtro.turma) consulta = consulta.eq("turmas.codigo", filtro.turma);
  if (filtro.categoria) consulta = consulta.eq("categoria_normativa", filtro.categoria as never);
  if (filtro.tipo) consulta = consulta.ilike("subtipo", `%${filtro.tipo}%`);
  if (filtro.de) consulta = consulta.gte("data", filtro.de);
  if (filtro.ate) consulta = consulta.lte("data", filtro.ate);

  const [atividadesRes, arquivadasRes, universo] = await Promise.all([
    consulta.order("data", { ascending: false }).order("ta_inicial").limit(LIMITE_DE_ATIVIDADES),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some do filtro de turma. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    /*
     * O universo SEM o ano — só a contagem: é o que separa *"nenhuma em <ano>"* de *"ainda não há"* (revisão do PR #90;
     * o mesmo de Turmas, Início e da aba Turmas do curso).
     */
    supabase
      .from("atividades_nao_letivas")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
      .eq("salvo", true),
  ]);
  const podeLer = pode(permissoes, "atividades_nao_letivas", "ler");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const haFiltro = Object.values(filtro).some((v) => v !== "");

  const linhas = paraLinhas((atividadesRes.data ?? []) as never);
  const turmas = semAsArquivadas(
    turmasRes.data ?? [],
    idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]),
    (t) => t.id as string,
  ).map((t) => t.codigo as string);

  const corpo = (
    <>
      {atividadesRes.error || turmasRes.error ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Não foi possível ler as atividades agora"
          detalhe="A leitura falhou. Tente de novo; se persistir, procure o suporte."
        />
      ) : linhas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="text-texto w-full text-sm" data-slot="tabela-de-atividades">
            <thead className="text-texto-suave text-left text-xs">
              <tr className="border-borda border-b">
                <th className="py-1 pr-3 font-medium">Data</th>
                <th className="py-1 pr-3 font-medium">TA</th>
                <th className="py-1 pr-3 font-medium">Turma</th>
                <th className="py-1 pr-3 font-medium">Categoria</th>
                <th className="py-1 pr-3 font-medium">Tipo</th>
                <th className="py-1 pr-3 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.codigo} className="border-borda border-b" data-atividade={l.codigo}>
                  <td className="py-1 pr-3 tabular-nums">{dataParaLeitura(l.data)}</td>
                  <td className="py-1 pr-3 tabular-nums">
                    {l.taInicial === null ? "—" : `${l.taInicial}º`}
                    {l.tempos === null ? "" : ` · ${l.tempos} TA`}
                  </td>
                  <td className="py-1 pr-3">{l.turma ?? "Todas as turmas com DSA"}</td>
                  <td className="py-1 pr-3" data-categoria={l.categoria}>
                    {ROTULO_DA_CATEGORIA[l.categoria] ?? l.categoria}
                  </td>
                  <td className="py-1 pr-3">{l.tipo ?? "—"}</td>
                  <td className="py-1 pr-3">
                    {/* Spec 029, D-6: o Estudo Individual sem «O que é» mostra «—», nunca a célula vazia. */}
                    {l.descricao ?? "—"}
                    {l.alunos === null ? "" : ` (${l.alunos} aluno${l.alunos === 1 ? "" : "s"})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !podeLer ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não lê as atividades"
          detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de atividade."
        />
      ) : haFiltro ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Nenhuma atividade neste recorte"
          detalhe="Afrouxe ou limpe os filtros acima."
        />
      ) : (universo.count ?? 0) > 0 ? (
        <EstadoVazio
          motivo="sem-dado"
          titulo={`Nenhuma atividade em ${ano}`}
          detalhe="As atividades de outros anos aparecem trocando o ano, no canto superior direito."
        />
      ) : alcance === "recortado" ? (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Você não alcança atividades"
          detalhe="O seu perfil vê só as atividades das turmas dos cursos sob a sua responsabilidade."
        />
      ) : (
        <EstadoVazio
          motivo="sem-dado"
          titulo="Ainda não há atividade lançada"
          detalhe="As atividades nascem no DSA da turma."
        />
      )}
    </>
  );

  /* RT-4 (spec 025, D-18): o número no ícone é a mesma régua do *Limpar filtros*. */
  const ativos = filtrosForaDoPadrao("/atividades", filtro);
  const filtros = (
    <ConteudoDePainel painel="filtros">
      <FiltrosDeAtividades turmas={turmas} />
    </ConteudoDePainel>
  );

  return (
    <ProvedorDePaineis>
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm" data-slot="contagem-de-atividades">
              {linhas.length} atividade{linhas.length === 1 ? "" : "s"} em {ano}
              {haFiltro ? " neste recorte" : ""}
              {linhas.length === LIMITE_DE_ATIVIDADES
                ? ` — mostrando as ${LIMITE_DE_ATIVIDADES} mais recentes; filtre para ver as demais`
                : ""}
              . O lançamento é feito no DSA da turma.
            </p>
          </div>
          <BarraDeAcoes rotulo="Ações das atividades">
            {seletorDeAno}
            <GatilhoDePainel painel="filtros" contagem={ativos} />
          </BarraDeAcoes>
        </header>

        {temCalendario ? (
          <AbasDeAtividades>
            {filtros}
            {corpo}
          </AbasDeAtividades>
        ) : (
          <>
            {filtros}
            {corpo}
          </>
        )}
      </div>
    </ProvedorDePaineis>
  );
}

/**
 * `/atividades`, aba **Atividades** — a lista das atividades não letivas do ano, com filtros, estatísticas e as ações
 * por linha (spec 014, PR 2, `FR-063`, `RF-EXTRA-03`; Bloco 18, spec 033, `FR-006.1` a `FR-006.4`).
 *
 * > *"Todas as turmas do ano escolhido no cabeçalho (RA-7, RT-6), com a arquivada contando nas estatísticas (RT-8)."*
 * > — `FR-006.1` da spec 033
 *
 * ⚠️ **O LANÇAMENTO CONTINUA NO DSA DA TURMA** (RP-0/RP-9): *Editar* abre o DSA na semana do lançamento, e *Desativar*
 *    pede a exclusão como rascunho da semana — nada se grava fora do DSA (D-10).
 * ⚠️ **O FILTRO ESTÁ NA URL** e é validado antes de virar recorte (`RF-NAV-01`): valor fora do contrato cai para o
 *    padrão.
 * ⚠️ **AS ESTATÍSTICAS CONTAM AS MESMAS LINHAS DA LISTA — TODAS**: a tabela mostra até `LIMITE_DE_ATIVIDADES`, e os
 *    números contam o recorte inteiro, lido em páginas.
 * ⚠️ **"NÃO HÁ" × "VOCÊ NÃO VÊ" × "NÃO FOI POSSÍVEL LER"** (gotcha 4): a RLS nega em silêncio, e a frase do vazio
 *    distingue.
 * ⚠️ **A ARQUIVADA SOME DO FILTRO DE TURMA E CONTA NOS NÚMEROS** (RT-8): ela só perde as ações (D-COR-5).
 * ⚠️ SEM MARCADOR DE CLIENTE. Os filtros, as abas e as ações da linha são folha.
 */
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import {
  ConteudoDePainel,
  GatilhoDePainel,
  ProvedorDePaineis,
} from "@/components/ciaara/paineis-da-pagina";
import { excluir } from "@/lib/acoes/dsa";
import { pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { idsArquivados, semAsArquivadas } from "@/lib/dominio/arquivamento-da-turma";
import { estatisticasDeAtividades } from "@/lib/dominio/atividades/estatisticas";
import {
  disciplinasDasLinhas,
  filtrarAtividades,
  filtroDaUrl,
  haFiltro,
  paraEstatistica,
} from "@/lib/dominio/atividades/lista";
import { ehEadPuro } from "@/lib/dominio/dsa/ead-puro";
import { emOrdemDeCurso, emOrdemDeTurma } from "@/lib/dominio/ordem-de-cursos";
import { CATEGORIA_FORA_DA_LISTA_DE_ATIVIDADES } from "@/lib/navegacao/contrato";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { AvisoDaLista } from "../admin/usuarios/AvisoDaLista";
import { alcanceDoPerfil } from "../cursos/consulta";
import { AbasDeAtividades } from "./AbasDeAtividades";
import {
  lerAtividades,
  lerLimitesDasTurmas,
  lerTiposDaLista,
  LIMITE_DE_ATIVIDADES,
  type TurmaDaLista,
} from "./consulta";
import type { ContextoDoModulo } from "./contexto";
import { EstatisticasDeAtividades } from "./EstatisticasDeAtividades";
import { FiltrosDeAtividades } from "./FiltrosDeAtividades";
import { lerApoinstDasTurmas, lerPalestrasDasTurmas } from "./leitura-do-planejado";
import { predicadoDoAno } from "./predicado-do-ano";
import { TabelaDeAtividades } from "./TabelaDeAtividades";

type TurmaDoAno = TurmaDaLista & {
  readonly ano: number;
  readonly modalidade: string | null;
  readonly curriculoId: string | null;
  readonly cursoClassificacao: string | null;
};

export async function AbaDeAtividades({ contexto }: { readonly contexto: ContextoDoModulo }) {
  const { ano, hoje, permissoes, temCalendario, valores } = contexto;
  const filtro = filtroDaUrl(valores);
  const supabase = await criarClienteDeServidor();

  /*
   * ⚠️ RT-6 (conferência do PR #90, 24/10/2026): a atividade de turma vale no ANO DA TURMA, nunca pela data; a global
   *    (sem turma), pela data. Por isso as turmas do ano vêm antes — o recorte precisa dos ids delas.
   */
  const [usuario, turmasRes, arquivadasRes, tipos] = await Promise.all([
    usuarioDaSessao(),
    supabase
      .from("turmas")
      .select(
        "id, codigo, ano_letivo, modalidade, curriculo_id, curso:cursos!turmas_curso_id_fkey(codigo, classificacao)",
      )
      .eq("ano_letivo", ano),
    /* D-COR-5 (spec 017, C-24): a turma arquivada some do filtro de turma e perde as ações. */
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    lerTiposDaLista(supabase),
  ]);

  const turmasDoAno: TurmaDoAno[] = emOrdemDeTurma(
    ((turmasRes.data ?? []) as unknown as Record<string, unknown>[]).map((t) => {
      const curso = (Array.isArray(t.curso) ? t.curso[0] : t.curso) as
        { codigo: string; classificacao: string | null } | null | undefined;
      return {
        id: t.id as string,
        codigo: t.codigo as string,
        /* A ordem de turma pede a sigla como texto; a turma sem curso legível fica no fim, sem sigla. */
        cursoCodigo: curso?.codigo ?? "",
        cursoClassificacao: curso?.classificacao ?? null,
        ano: Number(t.ano_letivo),
        modalidade: (t.modalidade as string | null) ?? null,
        curriculoId: (t.curriculo_id as string | null) ?? null,
      };
    }),
  ).map((t) => ({ ...t, cursoCodigo: t.cursoCodigo === "" ? null : t.cursoCodigo }));
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const turmasPorId = new Map(turmasDoAno.map((t) => [t.id, t] as const));

  /* Palestras, APOINST e o uso do limite valem para as turmas do recorte de turma e curso — as outras chaves não são delas. */
  const turmasDoRecorte = turmasDoAno.filter(
    (t) =>
      (filtro.turma === "" || t.codigo === filtro.turma) &&
      (filtro.curso === "" || t.cursoCodigo === filtro.curso),
  );
  const planejado = turmasDoRecorte.map((t) => ({
    id: t.id,
    codigo: t.codigo,
    curriculoId: t.curriculoId,
  }));

  const [leitura, universo, limites, palestras, apoinst] = await Promise.all([
    lerAtividades(
      supabase,
      {
        tipo: "ano",
        predicado: predicadoDoAno(
          ano,
          turmasDoAno.map((t) => t.id),
        ),
      },
      turmasPorId,
    ),
    /*
     * O universo SEM o ano — só a contagem: é o que separa *"nenhuma em <ano>"* de *"ainda não há"* (revisão do PR #90;
     * o mesmo de Turmas, Início e da aba Turmas do curso).
     */
    supabase
      .from("atividades_nao_letivas")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
      .eq("salvo", true)
      .neq("categoria_normativa", CATEGORIA_FORA_DA_LISTA_DE_ATIVIDADES),
    lerLimitesDasTurmas(
      supabase,
      turmasDoRecorte.map((t) => ({ id: t.id, codigo: t.codigo, ead: ehEadPuro(t.modalidade) })),
    ),
    lerPalestrasDasTurmas(planejado),
    lerApoinstDasTurmas(planejado, hoje),
  ]);

  const filtradas = filtrarAtividades(leitura.linhas, filtro);
  const linhas = filtradas.slice(0, LIMITE_DE_ATIVIDADES);
  const recorte = haFiltro(filtro);
  const palestrasDoRecorte = [...palestras.quadros.values()].reduce(
    (s, q) => ({ cumpridas: s.cumpridas + q.cumpridas, previstas: s.previstas + q.total }),
    { cumpridas: 0, previstas: 0 },
  );
  const estatisticas = estatisticasDeAtividades({
    atividades: filtradas.map(paraEstatistica),
    palestras: palestrasDoRecorte,
    apoinstPorSituacao: apoinst.quadro.porSituacao,
    tetos: limites.tetos,
  });

  const podeLer = pode(permissoes, "atividades_nao_letivas", "ler");
  /*
   * `FR-006.4`: *"Só para quem lança o DSA"* — editar a atividade (a RLS de `atividades_nao_letivas` decide a exclusão,
   * que é a do cartão do DSA, por `gravar_rascunho_do_dsa`, de invocador) E lançar no DSA (`registros_aula.criar`, o
   * mesmo recurso que a página do DSA usa para o lançamento). Medido em 03/11/2026 em `perfil_permissao` no banco local
   * (cópia do remoto): os dois recursos têm os mesmos quatro perfis (Admin, Encarregado, Ajudante e Operador).
   */
  const podeEditar =
    pode(permissoes, "atividades_nao_letivas", "editar") &&
    pode(permissoes, "registros_aula", "criar");
  const alcance = alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso);
  const erroDaLeitura = leitura.erro !== null || turmasRes.error !== null;

  const opcoesDeTurma = semAsArquivadas(turmasDoAno, arquivadas, (t) => t.id).map((t) => t.codigo);
  const opcoesDeCurso = emOrdemDeCurso([
    ...new Map(
      turmasDoAno
        .filter((t) => t.cursoCodigo !== null)
        .map((t) => [
          t.cursoCodigo as string,
          { codigo: t.cursoCodigo as string, classificacao: t.cursoClassificacao },
        ]),
    ).values(),
  ]).map((c) => c.codigo);

  const corpo = erroDaLeitura ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="Não foi possível ler as atividades agora"
      detalhe="A leitura falhou. Tente de novo; se persistir, procure o suporte."
    />
  ) : linhas.length > 0 ? (
    <AvisoDaLista>
      <TabelaDeAtividades
        linhas={linhas}
        mostrarTurma
        acoes={
          podeEditar
            ? { excluir, arquivadas, desativacaoPendente: leitura.desativacaoPendente }
            : null
        }
      />
    </AvisoDaLista>
  ) : !podeLer ? (
    <EstadoVazio
      motivo="sem-permissao"
      titulo="O seu perfil não lê as atividades"
      detalhe="Quem nega o acesso é o banco, e a lista chega vazia por isso — não por falta de atividade."
    />
  ) : recorte ? (
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
  );

  /* RT-4 (spec 025, D-18): o número no ícone é a mesma régua do *Limpar filtros*. */
  const ativos = filtrosForaDoPadrao("/atividades", filtro);

  return (
    <ProvedorDePaineis>
      <div className="flex flex-col gap-4" data-slot="lista-de-atividades">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-texto text-xl font-semibold">Atividades</h1>
            <p className="text-texto-suave text-sm" data-slot="contagem-de-atividades">
              {filtradas.length} atividade{filtradas.length === 1 ? "" : "s"} em {ano}
              {recorte ? " neste recorte" : ""}
              {filtradas.length > LIMITE_DE_ATIVIDADES
                ? ` — mostrando as ${LIMITE_DE_ATIVIDADES} mais recentes; filtre para ver as demais (as estatísticas contam todas)`
                : ""}
              . O lançamento é feito no DSA da turma.
            </p>
          </div>
          <BarraDeAcoes rotulo="Ações das atividades">
            <GatilhoDePainel painel="filtros" contagem={ativos} />
            <GatilhoDePainel painel="estatisticas" />
          </BarraDeAcoes>
        </header>

        <AbasDeAtividades comCalendario={temCalendario}>
          <ConteudoDePainel painel="filtros">
            <FiltrosDeAtividades
              turmas={opcoesDeTurma}
              cursos={opcoesDeCurso}
              tipos={tipos}
              disciplinas={disciplinasDasLinhas(leitura.linhas, true)}
            />
          </ConteudoDePainel>
          <ConteudoDePainel painel="estatisticas">
            {erroDaLeitura ? (
              <EstadoVazio
                motivo="sem-permissao"
                titulo="Não foi possível calcular as estatísticas agora"
                detalhe="A leitura das atividades falhou. Tente de novo; se persistir, procure o suporte."
              />
            ) : (
              <EstatisticasDeAtividades
                estatisticas={estatisticas}
                recorte={recorte}
                erroDasPalestras={palestras.erro}
                erroDaApoinst={apoinst.erro}
                limites={limites}
              />
            )}
          </ConteudoDePainel>
          {corpo}
        </AbasDeAtividades>
      </div>
    </ProvedorDePaineis>
  );
}

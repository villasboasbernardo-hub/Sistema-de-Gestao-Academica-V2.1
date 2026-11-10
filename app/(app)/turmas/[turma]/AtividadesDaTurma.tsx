/**
 * A aba **Atividades** da ficha da turma (Bloco 18, spec 033, `FR-007.1`, D-9): a lista das atividades da turma, com
 * os filtros, as estatísticas e as ações por linha do módulo, recortados por ela — **mais o uso do limite** de AEC, TAD
 * e TR do currículo.
 *
 * > *"As abas da turma passam a Ficha · Avaliações · Atividades · APOINST · Palestras. Atividades tem os mesmos
 * > filtros e estatísticas do módulo, recortados pela turma, mais o uso do limite de AEC/TAD/TR do currículo."*
 * > — `FR-007.1` da spec 033
 *
 * ⚠️ **AS MESMAS PEÇAS DO MÓDULO** (`app/(app)/atividades/`): a leitura (`lerAtividades`, com o recorte da turma), a
 *    regra dos filtros (`lib/dominio/atividades/lista.ts`), os campos (`campos-dos-filtros.ts`), a tabela, as ações da
 *    linha e as estatísticas. Nada de segunda conta: o que difere é o recorte e o que não faz sentido numa turma só
 *    (os filtros de turma e curso, as barras por curso e por turma).
 * ⚠️ **SÓ A ABA ABERTA É LIDA**: a ficha desenha este componente só com `?aba=atividades`.
 * ⚠️ **O USO DO LIMITE É O VEREDITO DE `tetosDaTurma`** (SC-003 da spec 014), em cartões — o mesmo da faixa da ficha.
 * ⚠️ **A ATIVIDADE DE TODAS AS TURMAS NÃO ENTRA** (como o filtro de turma do módulo sempre fez): ela não é DESTA turma.
 * ⚠️ **A TURMA ARQUIVADA É SÓ LEITURA** (D-COR-5): a lista e os números ficam, as ações aparecem indisponíveis com o
 *    motivo — e a Server Action recusa de novo (`recusaSeTurmaArquivada`).
 * ⚠️ **«NÃO HÁ» × «VOCÊ NÃO VÊ» × «NÃO FOI POSSÍVEL LER»** (gotcha 4, RN-DEG-01).
 * ⚠️ SEM MARCADOR DE CLIENTE: os filtros, os painéis e as ações da linha são folha.
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
import { estatisticasDeAtividades } from "@/lib/dominio/atividades/estatisticas";
import {
  disciplinasDasLinhas,
  filtrarAtividades,
  filtroDaUrl,
  haFiltro,
  paraEstatistica,
} from "@/lib/dominio/atividades/lista";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { ROTA_DA_FICHA_DA_TURMA } from "@/lib/navegacao/endereco-de-turma";
import { filtrosForaDoPadrao } from "@/lib/navegacao/filtros-fora-do-padrao";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { AvisoDaLista } from "../../admin/usuarios/AvisoDaLista";
import {
  lerAtividades,
  lerLimitesDasTurmas,
  lerTiposDaLista,
  LIMITE_DE_ATIVIDADES,
} from "../../atividades/consulta";
import { EstatisticasDeAtividades } from "../../atividades/EstatisticasDeAtividades";
import { lerApoinstDasTurmas, lerPalestrasDasTurmas } from "../../atividades/leitura-do-planejado";
import { TabelaDeAtividades } from "../../atividades/TabelaDeAtividades";
import type { ContextoDaTurmaNasAbas } from "./contexto-das-abas";
import { FiltrosDeAtividadesDaTurma } from "./FiltrosDeAtividadesDaTurma";

export async function AtividadesDaTurma({
  contexto,
}: {
  readonly contexto: ContextoDaTurmaNasAbas;
}) {
  if (contexto.ead) {
    return (
      <p role="status" className="text-texto-suave text-sm" data-slot="atividades-turma-ead">
        {AVISO_DE_TURMA_EAD}
      </p>
    );
  }
  if (!pode(contexto.permissoes, "atividades_nao_letivas", "ler")) {
    return (
      <EstadoVazio
        motivo="sem-permissao"
        titulo="O seu perfil não lê as atividades"
        detalhe="Quem nega o acesso é o banco, e a lista chegaria vazia por isso — não por falta de atividade."
      />
    );
  }

  const filtro = filtroDaUrl(contexto.valores);
  const supabase = await criarClienteDeServidor();
  const turma = { id: contexto.turmaId, codigo: contexto.turmaCodigo, cursoCodigo: null };
  const planejado = [
    { id: contexto.turmaId, codigo: contexto.turmaCodigo, curriculoId: contexto.curriculoId },
  ];

  const [leitura, tipos, limites, palestras, apoinst] = await Promise.all([
    lerAtividades(
      supabase,
      { tipo: "turma", turmaId: contexto.turmaId },
      new Map([[turma.id, turma]]),
    ),
    lerTiposDaLista(supabase),
    lerLimitesDasTurmas(supabase, [
      { id: contexto.turmaId, codigo: contexto.turmaCodigo, ead: false },
    ]),
    lerPalestrasDasTurmas(planejado),
    lerApoinstDasTurmas(planejado, contexto.hoje),
  ]);

  const filtradas = filtrarAtividades(leitura.linhas, filtro);
  const linhas = filtradas.slice(0, LIMITE_DE_ATIVIDADES);
  const recorte = haFiltro(filtro);
  const quadro = palestras.quadros.get(contexto.turmaId);
  const estatisticas = estatisticasDeAtividades({
    atividades: filtradas.map(paraEstatistica),
    palestras: { cumpridas: quadro?.cumpridas ?? 0, previstas: quadro?.total ?? 0 },
    apoinstPorSituacao: apoinst.quadro.porSituacao,
    tetos: limites.tetos,
  });

  /* `FR-006.4`: só para quem lança o DSA — e nunca no acompanhamento só de leitura. */
  const podeEditar =
    !contexto.somenteLeitura &&
    pode(contexto.permissoes, "atividades_nao_letivas", "editar") &&
    pode(contexto.permissoes, "registros_aula", "criar");
  /* D-COR-5: na arquivada, as ações aparecem indisponíveis, com o motivo (a ação recusa de novo). */
  const arquivadas: ReadonlySet<string> = contexto.arquivada
    ? new Set([contexto.turmaId])
    : new Set();

  /* RT-4: o número no ícone é a mesma régua do *Limpar filtros* — só os filtros desta aba. */
  const ativos = filtrosForaDoPadrao(ROTA_DA_FICHA_DA_TURMA, {
    categoria: filtro.categoria,
    tipo: filtro.tipo,
    disciplina: filtro.disciplina,
    vinculo: filtro.vinculo,
    responsavel: filtro.responsavel,
    de: filtro.de,
    ate: filtro.ate,
  });

  const corpo =
    leitura.erro !== null ? (
      <EstadoVazio
        motivo="sem-permissao"
        titulo="Não foi possível ler as atividades agora"
        detalhe={leitura.erro}
      />
    ) : linhas.length > 0 ? (
      <AvisoDaLista>
        <TabelaDeAtividades
          linhas={linhas}
          mostrarTurma={false}
          acoes={
            podeEditar
              ? { excluir, arquivadas, desativacaoPendente: leitura.desativacaoPendente }
              : null
          }
        />
      </AvisoDaLista>
    ) : recorte ? (
      <EstadoVazio
        motivo="sem-dado"
        titulo="Nenhuma atividade neste recorte"
        detalhe="Afrouxe ou limpe os filtros acima."
      />
    ) : (
      <EstadoVazio
        motivo="sem-dado"
        titulo="Nenhuma atividade lançada nesta turma"
        detalhe="As atividades nascem no DSA da turma."
      />
    );

  return (
    <ProvedorDePaineis>
      <section
        className="flex flex-col gap-3"
        data-slot="atividades-da-turma"
        aria-label="Atividades da turma"
      >
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-texto text-sm font-semibold">Atividades da turma</h2>
            <p className="text-texto-suave text-xs" data-slot="contagem-de-atividades">
              {filtradas.length} atividade{filtradas.length === 1 ? "" : "s"}
              {recorte ? " neste recorte" : ""}
              {filtradas.length > LIMITE_DE_ATIVIDADES
                ? ` — mostrando as ${LIMITE_DE_ATIVIDADES} mais recentes; filtre para ver as demais (as estatísticas contam todas)`
                : ""}
              . O lançamento é feito no DSA da turma.
            </p>
          </div>
          <BarraDeAcoes rotulo="Ações das atividades da turma">
            <GatilhoDePainel painel="filtros" contagem={ativos} />
            <GatilhoDePainel painel="estatisticas" />
          </BarraDeAcoes>
        </header>

        <ConteudoDePainel painel="filtros">
          <FiltrosDeAtividadesDaTurma
            tipos={tipos}
            disciplinas={disciplinasDasLinhas(leitura.linhas, false)}
          />
        </ConteudoDePainel>
        <ConteudoDePainel painel="estatisticas">
          {leitura.erro !== null ? (
            <EstadoVazio
              motivo="sem-permissao"
              titulo="Não foi possível calcular as estatísticas agora"
              detalhe={leitura.erro}
            />
          ) : (
            <EstatisticasDeAtividades
              estatisticas={estatisticas}
              recorte={recorte}
              erroDasPalestras={palestras.erro}
              erroDaApoinst={apoinst.erro}
              limites={limites}
              daTurma
            />
          )}
        </ConteudoDePainel>
        {corpo}
      </section>
    </ProvedorDePaineis>
  );
}

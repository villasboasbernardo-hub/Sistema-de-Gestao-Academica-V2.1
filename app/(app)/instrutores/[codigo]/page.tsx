/**
 * A ficha do instrutor (`RF-INSTR-10`, `FR-012`, `FR-027.3`, `FR-027.4`, `FR-031` e `FR-032` da spec
 * 006).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é folha, noutro arquivo.
 *
 * ⚠️ **A IDENTIDADE É O CÓDIGO NO CAMINHO**, o número que a pessoa reconhece. O `id` uuid nunca
 * aparece na URL nem na tela (`FR-027.3`).
 *
 * ⚠️ **"NÃO HÁ" E "VOCÊ NÃO VÊ" SÃO RESPOSTAS DIFERENTES** (`FR-027.4`, gotcha nº 4 do BRIEF). Sem
 * permissão de ler instrutor, a tela diz que o perfil não alcança; com permissão e sem linha, diz
 * que o código não existe.
 *
 * ⚠️ **A CARGA HORÁRIA É SÓ LEITURA** (`FR-014`, `FR-015`, `RF-INSTR-13`). A ministrada e a prevista
 * vêm de `vw_instrutor_carga_anual`, em TA; a view só tem linha de ano com fato ou previsão, e
 * ausência é zero. As atribuições, com a média semanal de cada uma, vêm de
 * `vw_instrutor_carga_prevista` (T011, decisão de Bernardo Villas Boas, 15/09/2026).
 *
 * ⚠️ **A EDIÇÃO MORA EM PÁGINA PRÓPRIA** (RT-3 do Bloco 10, spec 025, D-35): `/instrutores/[codigo]/editar`. A barra
 * *Editar · Desativar/Reativar · Excluir* fica no canto superior direito, na linha do nome, com o seletor de ano.
 *
 * ⚠️ **A FICHA SEGUE O ANO ESCOLHIDO** (RT-6, D-26): a carga, as atribuições e os alertas são do ano do seletor.
 *
 * ⚠️ **A JANELA DE CADA ATRIBUIÇÃO É A DA CARGA** (spec 029, Bloco 14, item 4, `FR-004`): a previsão da view recortada
 * pelo período da turma, que vem embutido na mesma leitura (`janelaDaCarga`). É ela que põe a turma de outro ano — a
 * `CAHO 2027`, com previsão da disciplina em 2026 — nas semanas do ano dela.
 *
 * ⚠️ **OS ALERTAS DE FAIXA VOLTARAM, EM LILÁS** (item 9, D-29; emenda a A-2 da spec 022): *"voltar a mostrar EM QUAIS
 * SEMANAS a carga passou da faixa"* — uma linha por semana, pela MESMA função da página Avisos (`alertaAcimaDaFaixa`),
 * só para instrutor ativo (CHK019). Avisam, não bloqueiam (`RN-DEG-02`); o da capacitação continua em Avisos.
 */
import { AlertaConformidade } from "@/components/ciaara/alerta-conformidade";
import { BadgeStatus } from "@/components/ciaara/badge-status";
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { alertaAcimaDaFaixa } from "@/lib/dominio/alertas-instrutor";
import {
  cargaPorSemana,
  janelaDaCarga,
  semanasAcimaDaFaixa,
  semanasDoAno,
} from "@/lib/dominio/carga-semanal";
import { motivoDoImpedimento } from "@/lib/dominio/exclusao-de-instrutor";
import { DICA_SEM_LEITURA } from "@/lib/dominio/exclusao-permanente";
import { mediaSemanalDaAtribuicao } from "@/lib/dominio/media-semanal";
import { disciplinasSoHabilitadas } from "@/lib/dominio/so-habilitado";
import { anoEscolhido } from "@/lib/navegacao/ano-da-tela";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { valoresFuncionaisDe } from "../campos";
import { comSigla } from "../catalogo";
import { AcoesDeInstrutor } from "./AcoesDeInstrutor";
import { ExcluirInstrutor } from "./ExcluirInstrutor";
import { CargaDoInstrutor } from "./CargaDoInstrutor";
import { FichaEmLeitura } from "./FichaEmLeitura";

/**
 * A ordem da tabela de atribuições pela **janela da carga** (spec 029, item 4, `FR-004.2`): o banco ordena pela
 * PREVISÃO (`previsao_inicio`), e a janela recortada pode começar noutro dia — a da `CAHO 2027` passa de maio de 2026
 * para janeiro de 2027. Sem início vai para o fim, como os nulos do `order` do banco; o empate fica na ordem do banco
 * (o `sort` é estável).
 */
function pelaJanela(
  a: { readonly inicio: string | null },
  b: { readonly inicio: string | null },
): number {
  if (a.inicio === b.inicio) return 0;
  if (a.inicio === null) return 1;
  if (b.inicio === null) return -1;
  return a.inicio < b.inicio ? -1 : 1;
}

/** O período da turma embutido na leitura da prevista (`turma:turmas!…(data_inicio, data_termino)`). */
type PeriodoEmbutido = {
  readonly data_inicio: string | null;
  readonly data_termino: string | null;
} | null;

const COLUNAS_DA_FICHA =
  "id, codigo, status, posto_graduacao, esp_hab_obs, nome_completo, categoria, om, nome_guerra, nip, data_nascimento, dep_divisao, data_assuncao_setor, email, regime_trabalho, nivel_escolaridade, formacao_principal_secundaria, capacitacoes_didaticas, capacitacao_didatica_a_corrigir, data_inicio_docencia_mb, data_inicio_docencia_ciaara, ultima_avaliacao_desempenho, data_avaliacao_desempenho, preferencia, antiguidade_declarada, area_conhecimento";

export default async function FichaDoInstrutor({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { codigo } = await params;
  const { valores } = lerParametros("/instrutores/[codigo]", await searchParams);
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);

  if (!pode(permissoes, "instrutores", "ler")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const supabase = await criarClienteDeServidor();
  const [instrutorRes, disciplinasRes, cursosRes, curriculosRes] = await Promise.all([
    supabase.from("vw_instrutores").select(COLUNAS_DA_FICHA).eq("codigo", codigo).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("id, nome_disciplina, curso_id, curriculo_id, status")
      .order("nome_disciplina"),
    // ⚠️ `status` entra pelo mesmo motivo do cadastro novo, e aqui com a segunda metade: as
    //    habilitações JÁ EXISTENTES em curso inativo continuam EXIBIDAS, só leitura (`FR-017.6`).
    supabase.from("cursos").select("id, codigo, status"),
    /* Spec 021 (RC-12): o currículo no rótulo, quando o curso tem mais de um. */
    supabase.from("curriculos").select("id, curso_id, versao, vigente_de").eq("status", "ativo"),
  ]);

  if (instrutorRes.error) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio motivo="sem-permissao" />
      </section>
    );
  }

  const instrutor = instrutorRes.data;
  if (!instrutor) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Instrutor</h1>
        <EstadoVazio
          motivo="sem-dado"
          titulo="Instrutor não encontrado"
          detalhe={`Não há instrutor com o código ${codigo}. O seu perfil lê o cadastro inteiro: não é falta de acesso.`}
        />
      </section>
    );
  }

  const escolha = await anoEscolhido(String(valores.ano));
  const ano = escolha.ano;
  const podeExcluir = pode(permissoes, "instrutores", "criar");
  const [cargaRes, atribuicoesRes, vinculosRes, impedimentosRes] = await Promise.all([
    supabase
      .from("vw_instrutor_carga_anual")
      .select("ta_ministrado_ano, ta_previsto_ano, faixa_semanal_min, faixa_semanal_max")
      .eq("instrutor_id", instrutor.id)
      .eq("ano", ano)
      .maybeSingle(),
    supabase
      .from("vw_instrutor_carga_prevista")
      /*
       * ⚠️ O PERÍODO DA TURMA VEM EMBUTIDO (spec 029, item 4, `FR-004`): a janela da carga é a previsão recortada por
       *    ele (`janelaDaCarga`), na mesma leitura — nenhuma consulta a mais. A view não muda (D-11).
       */
      .select(
        "atribuicao_id, ano, disciplina_id, nome_disciplina, curso_codigo, turma_codigo, previsao_inicio, previsao_termino, tempos_previstos, semanas, media_semanal, turma:turmas!turma_disciplina_turma_id_fkey(data_inicio, data_termino)",
      )
      .eq("instrutor_id", instrutor.id)
      /*
       * ⚠️ SÓ AS ATRIBUIÇÕES DAS TURMAS DO ANO (RT-6, conferência do PR #90, 24/10/2026): *"o ano de qualquer
       *    informação ligada a turma é o ANO DA TURMA, nunca a data do registro ou a janela da atribuição"*. A coluna
       *    `ano` da view é o ano da turma (migration `20261024213231`). Isto SUBSTITUI a CHK005 (15/09/2026), que
       *    trazia também toda janela que tocasse o ano: a atribuição de uma turma de 2027 com janela em 2026 entrava na
       *    carga e no alerta de 2026. A lista, a marca "só habilitado" e o alerta de faixa saem desta mesma leitura.
       */
      .eq("ano", ano)
      // A ordem base, pela previsão; a tabela é reordenada pela janela da carga (`pelaJanela`, spec 029 item 4).
      .order("previsao_inicio"),
    supabase
      .from("instrutor_disciplina")
      .select("disciplina_id")
      .eq("instrutor_id", instrutor.id)
      .eq("status", "ativo"),
    // A exceção única à regra 4 (autorização de Bernardo Villas Boas, 15/09/2026): só pergunta quem pode.
    podeExcluir
      ? supabase.rpc("impedimentos_de_exclusao_do_instrutor", { p_instrutor_id: instrutor.id })
      : Promise.resolve(null),
  ]);

  const catalogo = comSigla(
    disciplinasRes.data ?? [],
    cursosRes.data ?? [],
    curriculosRes.data ?? [],
  );
  const habilitadas = (vinculosRes.data ?? []).flatMap((v) =>
    v.disciplina_id ? [v.disciplina_id] : [],
  );
  const doCatalogo = new Map(catalogo.map((d) => [d.id, d]));
  const janelasDoAno = atribuicoesRes.error ? null : (atribuicoesRes.data ?? []);
  /*
   * ⚠️ **"SÓ HABILITADO — NÃO GERA CH PREVISTA", POR DISCIPLINA** (FR-013.4 da spec 016; NQ-4): a habilitação sem
   *    atribuição que conte no ano mostrado. Sem a leitura das atribuições, nenhuma marca — afirmar "só habilitado"
   *    sem saber se há atribuição seria inventar.
   */
  const soHabilitadas =
    janelasDoAno === null
      ? null
      : disciplinasSoHabilitadas(
          habilitadas,
          janelasDoAno.map((a) => ({
            disciplinaId: a.disciplina_id as string,
            ano: a.ano === null ? null : Number(a.ano),
          })),
          ano,
        );
  const habilitadasEmLeitura = vinculosRes.error
    ? null
    : habilitadas.flatMap((id) => {
        const d = doCatalogo.get(id);
        return d
          ? [{ nome: d.nome, sigla: d.sigla, soHabilitado: soHabilitadas?.has(id) ?? false }]
          : [];
      });
  // ⚠️ Falha de leitura é "—", não zero (`RN-DEG-01`): zero afirmaria que não houve aula.
  const ministrada = cargaRes.error ? null : Number(cargaRes.data?.ta_ministrado_ano ?? 0);
  const prevista = cargaRes.error ? null : Number(cargaRes.data?.ta_previsto_ano ?? 0);

  /*
   * ⚠️ **OS ALERTAS DA US4 SAÍRAM DA FICHA NO BLOCO 7** (spec 022, FR-004.4; A-2): a carga semanal acima da faixa e a
   *    docência sem capacitação moram na página Avisos, calculados lá pelas mesmas funções (`alertaAcimaDaFaixa`,
   *    `alertaSemCapacitacao`) e só para instrutor ativo (CHK019). Continuam avisando sem bloquear (`RN-DEG-02`).
   */
  /*
   * ⚠️ **A MÉDIA SEMANAL É A DA `RN-DIST-02`** (FR-013.3 da spec 016): a que a view entrega (das semanas cadastradas
   *    da disciplina) e, sem ela, a CH dividida pelas semanas da janela — a mesma média na lista e no alerta de
   *    faixa. Sem a de reserva, a atribuição sem `semanas` ficava fora do alerta, mesmo com janela.
   * ⚠️ **A JANELA É A DA CARGA** (spec 029, item 4, `FR-004`; D-9 a D-11): a previsão da view recortada pelo período
   *    da turma, e o período inteiro quando a previsão não o toca (`janelaDaCarga`, o ponto único). Ela alimenta, daqui
   *    para baixo, a coluna «Janela prevista», a média de reserva «(pela janela)», o alerta lilás e a ordem da tabela —
   *    e nenhum deles lê mais `previsao_*` cru. A média cadastrada continua vencendo (D-10).
   */
  const comMedia = (janelasDoAno ?? []).map((a) => {
    /*
     * ⚠️ O TIPO GERADO LÊ O EMBUTIDO DA VIEW COMO LISTA, e o PostgREST o devolve como OBJETO (muitos-para-um: a linha
     *    aponta para uma turma) — o mesmo caso de `regimeEmbutido`, na ficha da turma. Aceitar as duas formas: lido
     *    pela forma errada, o período sairia nulo e o recorte não aconteceria, sem erro nenhum.
     */
    const turma: PeriodoEmbutido | undefined = Array.isArray(a.turma) ? a.turma[0] : a.turma;
    const janela = janelaDaCarga(
      { inicio: a.previsao_inicio, termino: a.previsao_termino },
      { inicio: turma?.data_inicio ?? null, termino: turma?.data_termino ?? null },
    );
    const cadastrada = a.media_semanal === null ? null : Number(a.media_semanal);
    const media = mediaSemanalDaAtribuicao({
      mediaCadastrada: cadastrada,
      tempos: Number(a.tempos_previstos ?? 0),
      inicio: janela.inicio,
      termino: janela.termino,
    });
    return { ...a, janela, media, mediaDaJanela: cadastrada === null && media !== null };
  });
  const atribuicoes =
    janelasDoAno === null
      ? null
      : comMedia
          .filter((a) => a.ano === ano)
          .map((a) => ({
            id: a.atribuicao_id as string,
            disciplina: a.nome_disciplina as string,
            curso: a.curso_codigo as string,
            turma: a.turma_codigo as string,
            inicio: a.janela.inicio,
            termino: a.janela.termino,
            tempos: Number(a.tempos_previstos ?? 0),
            semanas: a.semanas,
            mediaSemanal: a.media,
            mediaDaJanela: a.mediaDaJanela,
          }))
          .sort(pelaJanela);

  const ativo = instrutor.status === "ativo";

  /*
   * ⚠️ AS SEMANAS ACIMA DA FAIXA (D-29): a faixa do regime vem da view anual; sem ela, ou sem as atribuições, nenhum
   *    alerta — afirmar "acima" sem a conta seria inventar (`RN-DEG-01`).
   */
  const faixa =
    cargaRes.error ||
    cargaRes.data?.faixa_semanal_min == null ||
    cargaRes.data?.faixa_semanal_max == null
      ? null
      : {
          minimo: Number(cargaRes.data.faixa_semanal_min),
          maximo: Number(cargaRes.data.faixa_semanal_max),
        };
  const alertaDeFaixa =
    ativo && janelasDoAno !== null
      ? alertaAcimaDaFaixa(
          semanasAcimaDaFaixa(
            semanasDoAno(
              cargaPorSemana(
                comMedia.map((a) => ({
                  inicio: a.janela.inicio,
                  termino: a.janela.termino,
                  mediaSemanal: a.media,
                })),
              ),
              ano,
            ),
            faixa,
          ),
          faixa,
        )
      : null;

  /*
   * ⚠️ SEM RESPOSTA DO BANCO, A EXCLUSÃO FICA INDISPONÍVEL — nunca liberada (`RN-DEG-01`). Um erro de
   * leitura dos impedimentos não pode virar "não tem histórico".
   */
  const motivoDeNaoExcluir =
    impedimentosRes === null
      ? null
      : impedimentosRes.error
        ? "Não foi possível conferir o histórico deste instrutor; a exclusão fica indisponível."
        : motivoDoImpedimento((impedimentosRes.data as string[] | null) ?? []);
  /* D-33: a dica do ícone desabilitado é a da D-COR-6; sem leitura, a de não ter conferido. */
  const dicaDeNaoExcluir =
    impedimentosRes !== null && impedimentosRes.error
      ? DICA_SEM_LEITURA
      : "tem registros: use Desativar";
  const podeEditar = pode(permissoes, "instrutores", "editar");

  const leitura = (
    <>
      {alertaDeFaixa ? (
        <AlertaConformidade
          tom="conformidade"
          titulo={`${alertaDeFaixa.titulo} em ${ano}`}
          avisos={alertaDeFaixa.detalhes}
          className="static"
        />
      ) : null}

      <FichaEmLeitura
        id={instrutor.id}
        valores={valoresFuncionaisDe(instrutor)}
        habilitadas={habilitadasEmLeitura}
      />

      <CargaDoInstrutor
        ano={ano}
        ministrada={ministrada}
        prevista={prevista}
        atribuicoes={atribuicoes}
      />
    </>
  );

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-texto text-lg font-semibold">
            <NomeInstrutor
              instrutor={{
                id: instrutor.id,
                pg: instrutor.posto_graduacao,
                especialidade: instrutor.esp_hab_obs,
                nomeCompleto: instrutor.nome_completo,
                nomeDeGuerra: instrutor.nome_guerra,
              }}
            />
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-texto-suave" data-slot="codigo-do-instrutor">
              Código {instrutor.codigo}
            </span>
            <BadgeStatus
              tom={ativo ? "executado" : "inativo"}
              rotulo={ativo ? "ativo" : "inativo"}
            />
          </div>
        </div>

        {/* RT-1 (D-35): o ano e as ações no canto superior direito, na linha do nome. */}
        <BarraDeAcoes rotulo="Ações do instrutor">
          {podeEditar ? (
            <BotaoDeIcone
              acao="editar"
              rotulo="Editar instrutor"
              href={`/instrutores/${encodeURIComponent(instrutor.codigo)}/editar`}
              data-slot="abrir-edicao-do-instrutor"
            />
          ) : null}
          {podeEditar ? <AcoesDeInstrutor instrutorId={instrutor.id} ativo={ativo} /> : null}
          {/* ⚠️ Excluir é de quem CRIA instrutor — a ação de escrita mais restritiva da matriz. */}
          {podeExcluir ? (
            <ExcluirInstrutor
              instrutorId={instrutor.id}
              codigo={instrutor.codigo}
              motivoDoImpedimento={motivoDeNaoExcluir}
              dica={dicaDeNaoExcluir}
            />
          ) : null}
        </BarraDeAcoes>
      </header>

      {/*
        ⚠️ VER PRIMEIRO, EDITAR NA PÁGINA PRÓPRIA (spec 016, FR-010.1; spec 025, D-35): a ficha é leitura para todos, e
           *Editar instrutor* leva a `/instrutores/[codigo]/editar`. O formulário recolhido no fim da ficha saiu.
      */}
      {leitura}
    </section>
  );
}

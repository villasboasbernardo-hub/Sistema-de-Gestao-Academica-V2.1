/**
 * Editar curso (`FR-016`, `FR-014.2`, `FR-013.1`, `FR-041`) — e, desde o ajuste 3 da conferência do PR #82 (spec 021,
 * Bloco 6, Bernardo Villas Boas, 21/10/2026), o lugar onde o CURRÍCULO se escolhe, se cria e se edita por inteiro.
 *
 * > *"Novo currículo" e "Editar currículo" passam para DENTRO de "Editar curso": escolher o currículo (ou criar o novo,
 * > cópia do vigente) e editar ali TODAS as informações dele — disciplinas, códigos, CH, UEs, avaliações, horários,
 * > atividades/limites, propósito, duração, PDF. A correção do vigente em uso continua pela RC-6.*
 *
 * ⚠️ **AS TURMAS SÃO CONTADAS AQUI, e não no formulário** (`FR-014.2`): o diálogo da troca de sigla diz quantas ficam com
 *    a sigla antiga e dá um exemplo — leitura, que é do servidor.
 * ⚠️ **A VIGÊNCIA DO REGIME PADRÃO SE REGISTRA NESTA ROTA** (`FR-013.1`), numa seção própria: ela continua do CURSO. Os
 *    regimes NOMEADOS são do currículo (emenda à RC-1, 21/10/2026) e se editam na parte *Horários*.
 * ⚠️ **CADA PARTE LÊ SÓ QUANDO ABERTA**; cada uma segue a permissão do que edita, e o banco recusa de qualquer forma.
 * ⚠️ **O CURRÍCULO EM USO** (turma com lançamento): mudar o que tinha valor é correção (RC-6) — o diálogo único pede a
 *    justificativa quando o banco a exige.
 * ⚠️ **DUAS ABAS DESDE O BLOCO 10** (spec 025, item 7, D-28): *Cadastro* (o formulário do curso, um *Salvar*) e
 *    *Currículo* (a barra do currículo, os dados com um *Salvar* e o PDF no alto; as sub-abas *Disciplinas · Horários ·
 *    Atividades e limites* embaixo). O link antigo com `?parte=` e sem `?aba=` vai para o *Currículo*; `parte=dados`,
 *    que deixou de existir, cai em *Disciplinas*.
 */
import { estadosPorRegistro, type ImpedimentosDoRegistro } from "@/lib/dominio/exclusao-permanente";
import { redirect } from "next/navigation";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { idsArquivados } from "@/lib/dominio/arquivamento-da-turma";
import {
  curriculoDaPagina,
  curriculoVigenteEm,
  impedimentoDoArquivamento,
  impedimentoDoDescarte,
  opcoesDoSeletor,
  rotuloDoCurriculo,
  ROTULO_DA_SITUACAO,
  situacaoDoCurriculo,
} from "@/lib/dominio/curriculos";
import { anosAcimaDoLimite, type TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { reaisParaEdicao } from "@/lib/formato/moeda";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  confirmarSugestao,
  definirTempoArbitrado,
  nomearUe,
} from "@/lib/acoes/avaliacoes-do-curriculo";

import { GradeDeDisciplinas } from "../../../disciplinas/GradeDeDisciplinas";
import { lerGradeDeDisciplinas } from "../../../disciplinas/consulta";
import { excluirRegimeDeHorario } from "@/lib/acoes/regime-de-horario";
import { estadoDaExclusaoDoRegime } from "@/lib/dominio/exclusao-de-partes";
import { lerAvaliacoesDoCurso } from "../../../turmas/[turma]/consulta-de-avaliacoes";
import { parametroDoAno } from "../../../turmas/[turma]/tetos";
import { alcanceDoPerfil } from "../../consulta";
import { FormularioDeCurso } from "../../FormularioDeCurso";
import { AbaAvaliacoes } from "../AbaAvaliacoes";
import { mensagemDeCursoNaoEncontrado, SEM_CURRICULO } from "../consulta";
import { lerHorariosDoCurso } from "../consulta-de-horarios";
import { RegimesDoCurso } from "../RegimesDoCurso";
import { AbasDaEdicaoDoCurso } from "./AbasDaEdicaoDoCurso";
import { BarraDoCurriculo } from "./BarraDoCurriculo";
import { travasDoBanco, vigenciasDoBanco } from "./consulta";
import { EnvioDoCurriculo } from "./EnvioDoCurriculo";
import { FormularioDoCurriculo } from "./FormularioDoCurriculo";
import { LimitesDoCurriculo, type LimiteNaEdicao } from "./LimitesDoCurriculo";
import { PartesDoCurriculo } from "./PartesDoCurriculo";
import { SecaoDeRegime } from "./SecaoDeRegime";

type CurriculoDaEdicao = {
  readonly id: string;
  readonly versao: number;
  readonly vigente_de: string;
  readonly status: string;
  readonly arquivado_em: string | null;
  readonly descricao: string | null;
  readonly proposito: string | null;
  readonly duracao_dias: number;
  readonly duracao_semanas: number | null;
  readonly pdf_carregado_em: string | null;
};

const CATEGORIAS = ["AEC", "TAD", "TR"] as const;

export default async function EditarCurso({
  params,
  searchParams,
}: {
  params: Promise<{ curso: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { curso: segmento } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmento);
  const busca = await searchParams;
  /* D-28: o endereço antigo (`?parte=` sem `?aba=`, ou `parte=dados`) abre o Currículo, com o resto da consulta. */
  if ((busca.parte !== undefined && busca.aba === undefined) || busca.parte === "dados") {
    const consulta = new URLSearchParams();
    for (const [chave, valor] of Object.entries(busca)) {
      for (const v of Array.isArray(valor) ? valor : valor === undefined ? [] : [valor]) {
        if (chave === "aba") continue;
        consulta.append(chave, chave === "parte" && v === "dados" ? "disciplinas" : v);
      }
    }
    consulta.set("aba", "curriculo");
    redirect(`/cursos/${encodeURIComponent(sigla)}/editar?${consulta.toString()}`);
  }
  const { valores } = lerParametros("/cursos/[curso]/editar", busca);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, nome_curso, classificacao, modalidade, limite_turmas_ano, status, ofertavel_estrangeiros, estrangeiros_observacao, custo_total, custo_composicao, curriculos:curriculos!curriculos_curso_id_fkey(id, versao, vigente_de, status, arquivado_em, descricao, proposito, duracao_dias, duracao_semanas, pdf_carregado_em)",
    )
    .eq("codigo", sigla)
    .maybeSingle();

  if (!curso) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Editar curso</h1>
        <p role="status" className="text-texto" data-slot="curso-nao-encontrado">
          {mensagemDeCursoNaoEncontrado(
            sigla,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  /*
   * ⚠️ **AS PERMISSÕES DESTA ROTA SÃO VÁRIAS, e cada parte segue a sua.** Editar o curso e os dados do currículo é
   *    `cursos.editar`; registrar vigência e os regimes, `horarios.*`; as disciplinas, `disciplinas.*` — e o **Operador**
   *    tem as duas últimas sem a primeira. Barrar a página inteira por `cursos.editar` o deixaria sem caminho para o que
   *    a policy lhe permite. Quem não tem nenhuma não entra.
   */
  const podeEditarCurso = pode(permissoes, "cursos", "editar");
  const podeRegistrarRegime = pode(permissoes, "horarios", "criar");
  const podeHorarios = {
    criar: pode(permissoes, "horarios", "criar"),
    editar: pode(permissoes, "horarios", "editar"),
    desativar: pode(permissoes, "horarios", "desativar"),
  };
  const podeDisciplinas = {
    criar: pode(permissoes, "disciplinas", "criar"),
    editar: pode(permissoes, "disciplinas", "editar"),
    desativar: pode(permissoes, "disciplinas", "desativar"),
  };

  if (
    !podeEditarCurso &&
    !podeHorarios.criar &&
    !podeHorarios.editar &&
    !podeDisciplinas.criar &&
    !podeDisciplinas.editar
  ) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar {curso.codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não edita curso, currículo nem regime"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
      </section>
    );
  }

  const cursoId = curso.id as string;
  const codigo = curso.codigo as string;
  const cursoAtivo = curso.status === "ativo";
  const hoje = hojeNaCiaara();
  const curriculos = ((curso as unknown as { curriculos?: CurriculoDaEdicao[] }).curriculos ??
    []) as CurriculoDaEdicao[];
  const escolha = curriculoDaPagina(curriculos, String(valores.curriculo), hoje);
  const curriculo = escolha.curriculo;
  const vigente = curriculoVigenteEm(curriculos, hoje);
  const curriculoId = curriculo?.id ?? SEM_CURRICULO;
  const curriculoArquivado = curriculo !== null && curriculo.arquivado_em !== null;
  /* O arquivado se edita só depois de desarquivado (RC-10); fora de oferta, nada se edita. */
  const editavel = cursoAtivo && curriculo !== null && !curriculoArquivado;
  /* Só a aba aberta é lida (D-28): no *Cadastro*, nenhuma parte do currículo. */
  const naAbaDoCurriculo = String(valores.aba) === "curriculo";
  const parte = naAbaDoCurriculo ? String(valores.parte) : "";

  const [
    turmasRes,
    vigenciasRes,
    arquivadasRes,
    gradeDeDisciplinas,
    horarios,
    atividadesRes,
    avaliacoesDoCurriculo,
  ] = await Promise.all([
    supabase
      .from("turmas")
      .select("id, codigo, ano_letivo, status, curriculo_id, regime_de_horario_id")
      .eq("curso_id", cursoId)
      .order("codigo"),
    supabase.rpc("vigencias_do_curso", { p_curso_id: cursoId }),
    supabase.from("vw_turmas_arquivadas").select("turma_id"),
    parte === "disciplinas" && curriculo !== null
      ? lerGradeDeDisciplinas({ cursoCodigo: codigo, turmaCodigo: "", curriculoId })
      : Promise.resolve(null),
    parte === "horarios" && curriculo !== null
      ? supabase
          .from("turmas")
          .select("codigo, regime_de_horario_id")
          .eq("curso_id", cursoId)
          .then((r) =>
            lerHorariosDoCurso({
              cursoId,
              curriculoId,
              turmas: (r.data ?? []).map((t) => ({
                codigo: t.codigo as string,
                regimeId: (t.regime_de_horario_id as string | null) ?? null,
              })),
            }),
          )
      : Promise.resolve(null),
    parte === "atividades" && curriculo !== null
      ? Promise.all([
          supabase
            .from("limites_curriculo")
            .select("categoria, tempos, fonte_arquivo, fonte_pagina")
            .eq("curriculo_id", curriculoId)
            .eq("status", "ativo"),
          supabase
            .from("disciplinas")
            .select("carga_horaria_tempos")
            .eq("curriculo_id", curriculoId)
            .eq("status", "ativo"),
          supabase
            .from("config_parametros")
            .select("chave, valor, ano_vigencia")
            .in("chave", [
              "teto.aec_percentual_chr",
              "teto.tad_percentual_chr",
              "teto.tr_percentual_chr",
            ])
            .eq("status", "ativo"),
        ])
      : Promise.resolve(null),
    /* As avaliações do currículo, com o arbitrado (spec 014, D5.3): editam-se aqui, junto das disciplinas. */
    parte === "disciplinas" && curriculo !== null
      ? lerAvaliacoesDoCurso({ cursoId, turmaCodigo: null, hoje, curriculoId })
      : Promise.resolve(null),
  ]);

  /* D-COR-6 e D-30 (spec 025): o que prende cada regime do currículo — numa ida só, e só para quem exclui. */
  const podeExcluirRegime = editavel && podeHorarios.criar && horarios !== null;
  const impedimentosDosRegimesRes =
    podeExcluirRegime && horarios.regimes.length > 0
      ? await supabase.rpc("impedimentos_de_exclusao_dos_regimes", {
          p_regimes: horarios.regimes.map((r) => r.id),
        })
      : null;
  const estadosDosRegimes = estadosPorRegistro(
    impedimentosDosRegimesRes === null || impedimentosDosRegimesRes.error
      ? null
      : ((impedimentosDosRegimesRes.data ?? []) as ImpedimentosDoRegistro[]),
    estadoDaExclusaoDoRegime,
  );

  const turmas = turmasRes.data ?? [];
  const linhas = vigenciasRes.data ?? [];
  const vigencias = vigenciasDoBanco(linhas);
  const travas = travasDoBanco(linhas);
  const paraLimite: TurmaParaLimite[] = turmas.map((t) => ({
    ano: Number(t.ano_letivo),
    status: t.status as string,
  }));
  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  /* A barra do currículo: o seletor (todos, os arquivados também), o novo, o arquivamento e o descarte. */
  const arquivadas = idsArquivados((arquivadasRes.data ?? []) as { turma_id: string | null }[]);
  const turmasDoCurriculo = turmas
    .filter((t) => t.curriculo_id === curriculo?.id)
    .map((t) => ({ arquivada: arquivadas.has(t.id as string) }));
  const opcoes = opcoesDoSeletor(curriculos, hoje, true).map((o) => ({
    versao: o.curriculo.versao,
    rotulo: o.rotulo,
    situacao: ROTULO_DA_SITUACAO[o.situacao],
  }));
  const temFuturo = curriculos.some(
    (c) => c.arquivado_em === null && situacaoDoCurriculo(c, curriculos, hoje) === "futuro",
  );
  const podeArquivar =
    curriculo !== null &&
    pode(permissoes, "arquivamento_de_curriculo", "editar") &&
    (curriculoArquivado ||
      impedimentoDoArquivamento(curriculo, curriculos, hoje, turmasDoCurriculo) === null);

  /* Os limites da parte *Atividades*: o declarado, ou o percentual da norma que vale sem ele. */
  let limites: LimiteNaEdicao[] = [];
  if (atividadesRes) {
    const [limitesRes, disciplinasRes, parametrosRes] = atividadesRes;
    const ano = Number(hoje.slice(0, 4));
    const chCurricular =
      (disciplinasRes.data ?? []).reduce((s, d) => s + Number(d.carga_horaria_tempos ?? 0), 0) ||
      null;
    limites = CATEGORIAS.map((categoria) => {
      const declarado = (limitesRes.data ?? []).find((l) => l.categoria === categoria);
      const percentual = parametroDoAno(
        parametrosRes.data ?? [],
        `teto.${categoria.toLowerCase()}_percentual_chr`,
        ano,
      );
      const referencia =
        percentual === null
          ? "o percentual da norma, que não está cadastrado"
          : chCurricular === null
            ? `${percentual.toLocaleString("pt-BR")}% da CH curricular (sem disciplinas, não calculável)`
            : `${percentual.toLocaleString("pt-BR")}% da CH curricular (${(
                Math.round(chCurricular * percentual) / 100
              ).toLocaleString("pt-BR")} TA)`;
      return {
        categoria,
        tempos: declarado ? Number(declarado.tempos) : null,
        fonteArquivo: declarado?.fonte_arquivo ?? null,
        fontePagina: declarado ? Number(declarado.fonte_pagina) : null,
        referencia,
      };
    });
  }

  /* A vigência do regime de horário do curso — na parte *Horários* (spec 022, item 9). */
  const secaoDeRegime = (
    <SecaoDeRegime
      cursoId={cursoId}
      sigla={codigo}
      vigencias={vigencias}
      travas={travas}
      podeRegistrar={podeRegistrarRegime}
    />
  );

  const cadastro = (
    <section aria-labelledby="titulo-cadastro-do-curso" className="flex flex-col gap-3">
      <h2 id="titulo-cadastro-do-curso" className="text-texto text-base font-semibold">
        Cadastro do curso
      </h2>
      {podeEditarCurso ? (
        <FormularioDeCurso
          modo="edicao"
          inicial={{
            codigo,
            nome_curso: curso.nome_curso as string,
            classificacao: curso.classificacao as string,
            modalidade: texto(curso.modalidade),
            duracao_dias: "",
            duracao_semanas: "",
            limite_turmas_ano: texto(curso.limite_turmas_ano),
            proposito: "",
            /* Spec 020 (C-1 a C-4): estrangeiros e custo, só na edição. */
            ofertavel_estrangeiros:
              curso.ofertavel_estrangeiros === true
                ? "sim"
                : curso.ofertavel_estrangeiros === false
                  ? "nao"
                  : "",
            estrangeiros_observacao: texto(curso.estrangeiros_observacao),
            custo_total: reaisParaEdicao(
              curso.custo_total === null ? null : Number(curso.custo_total),
            ),
            custo_composicao: texto(curso.custo_composicao),
          }}
          turmasDoCurso={turmas.length}
          {...(turmas[0] ? { exemploDeTurma: turmas[0].codigo as string } : {})}
          anosAcimaDoLimite={anosAcimaDoLimite(
            paraLimite,
            curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
          )}
        />
      ) : (
        <p className="text-texto-suave text-sm" role="status" data-slot="so-o-regime">
          O seu perfil registra o regime e edita o conteúdo do currículo deste curso, mas não edita
          o cadastro dele.
        </p>
      )}
    </section>
  );

  const abaDoCurriculo = (
    <section
      aria-labelledby="titulo-curriculo-do-curso"
      className="flex flex-col gap-4"
      data-slot="curriculo-na-edicao"
    >
      {/*
          Spec 022 (Bloco 7), item 9 — o terceiro grupo: *"currículo e suas partes"*. A vigência do regime de horário do
          curso, que ficava solta entre o cadastro e o currículo, foi para a parte *Horários*, ao lado dos regimes
          nomeados — tudo o que é horário num lugar só.
        */}
      <h2 id="titulo-curriculo-do-curso" className="text-texto text-base font-semibold">
        Currículo
      </h2>
      <BarraDoCurriculo
        sigla={codigo}
        opcoes={opcoes}
        selecionado={curriculo?.versao ?? null}
        vigente={vigente?.versao ?? null}
        situacao={
          curriculo === null
            ? null
            : curriculoArquivado
              ? ROTULO_DA_SITUACAO.arquivado
              : ROTULO_DA_SITUACAO[situacaoDoCurriculo(curriculo, curriculos, hoje)]
        }
        aviso={escolha.aviso}
        novo={
          cursoAtivo && podeEditarCurso && vigente !== null && !temFuturo
            ? {
                copiaDe: rotuloDoCurriculo(vigente),
                vigenteDeSugerido: `${Number(hoje.slice(0, 4)) + 1}-01-01`,
              }
            : null
        }
        arquivamento={podeArquivar ? { arquivado: curriculoArquivado } : null}
        podeDescartar={
          cursoAtivo &&
          curriculo !== null &&
          !curriculoArquivado &&
          podeEditarCurso &&
          impedimentoDoDescarte(curriculo, curriculos, hoje, turmasDoCurriculo.length) === null
        }
      />
      {curriculoArquivado ? (
        <p role="status" className="text-texto text-sm" data-slot="curriculo-arquivado">
          Este currículo está arquivado: ele se consulta, não se edita. Para editá-lo, desarquive-o.
        </p>
      ) : null}
      {!cursoAtivo ? (
        <p role="status" className="text-texto-suave text-sm" data-slot="curso-fora-de-oferta">
          Curso fora de oferta: o currículo fica para consulta e não recebe edição.
        </p>
      ) : null}
      {curriculo !== null ? (
        <p className="text-texto-suave text-sm" data-slot="aviso-da-correcao">
          Se uma turma que segue este currículo já tem lançamento, mudar o que já tinha valor é
          correção: só o Admin, o Encarregado e o Ajudante da Administração Acadêmica a fazem, com
          justificativa, e ela fica registrada. Completar o que estava vazio é livre.
        </p>
      ) : null}

      {curriculo !== null ? (
        /*
         * ⚠️ A CHAVE É O CURRÍCULO: trocar de currículo no seletor mantém a mesma página, e os campos dos formulários
         *    (não controlados) guardariam o valor do anterior — gravar o 2 com a data do 1 colidia (medido no e2e).
         * ⚠️ OS DADOS E O PDF NO ALTO DA ABA (D-28): um *Salvar* só para vigência, descrição, propósito e duração.
         */
        <div key={curriculo.id} className="flex flex-col gap-6">
          <div className="flex flex-col gap-4" data-slot="parte-dados">
            {podeEditarCurso && editavel ? (
              <FormularioDoCurriculo
                sigla={codigo}
                versao={curriculo.versao}
                inicial={{
                  vigenteDe: curriculo.vigente_de,
                  descricao: texto(curriculo.descricao),
                  proposito: texto(curriculo.proposito),
                  duracaoDias: texto(curriculo.duracao_dias),
                  duracaoSemanas: texto(curriculo.duracao_semanas),
                }}
              />
            ) : (
              <p className="text-texto-suave text-sm">
                Os dados do currículo se editam com a permissão de editar o curso.
              </p>
            )}
            {podeEditarCurso ? (
              <EnvioDoCurriculo
                sigla={codigo}
                cursoId={cursoId}
                curriculoId={curriculo.id}
                versao={curriculo.versao}
                carregadoEm={curriculo.pdf_carregado_em}
                cursoAtivo={editavel}
              />
            ) : null}
          </div>
          <PartesDoCurriculo
            disciplinas={
              <div className="flex flex-col gap-6" data-slot="parte-disciplinas">
                {gradeDeDisciplinas ? (
                  <GradeDeDisciplinas
                    grade={gradeDeDisciplinas}
                    parametros={{
                      situacao: String(valores.situacao),
                      busca: String(valores.busca),
                    }}
                    permissoes={{
                      criar: editavel && podeDisciplinas.criar,
                      editar: editavel && podeDisciplinas.editar,
                      desativar: editavel && podeDisciplinas.desativar,
                    }}
                    hoje={hoje}
                    /* Spec 022 (D-2): *Nova disciplina* e *Editar* levam à página própria da disciplina. */
                    edicao={{ sigla: codigo, versao: curriculo.versao }}
                  />
                ) : null}
                {avaliacoesDoCurriculo ? (
                  <AbaAvaliacoes
                    quadro={avaliacoesDoCurriculo.quadro}
                    aviso={avaliacoesDoCurriculo.aviso}
                    {...(editavel && pode(permissoes, "avaliacoes_curriculo_arbitrado", "editar")
                      ? {
                          arbitrado: {
                            definir: definirTempoArbitrado,
                            confirmar: confirmarSugestao,
                            nomear: nomearUe,
                          },
                        }
                      : {})}
                  />
                ) : null}
              </div>
            }
            horarios={
              <div className="flex flex-col gap-6" data-slot="parte-horarios">
                {horarios ? (
                  <>
                    {horarios.erro ? (
                      <p role="alert" className="text-atrasado-tinta text-sm">
                        Não foi possível ler os horários do currículo agora. Recarregue a página.
                      </p>
                    ) : null}
                    <RegimesDoCurso
                      cursoId={cursoId}
                      curriculoId={curriculo.id}
                      regimes={horarios.regimes}
                      configuracoes={horarios.configuracoes}
                      permissoes={{
                        criar: editavel && podeHorarios.criar,
                        editar: editavel && podeHorarios.editar,
                        desativar: editavel && podeHorarios.desativar,
                      }}
                      {...(podeExcluirRegime
                        ? {
                            exclusao: {
                              estados: estadosDosRegimes,
                              excluir: excluirRegimeDeHorario,
                            },
                          }
                        : {})}
                    />
                  </>
                ) : null}
                {secaoDeRegime}
              </div>
            }
            atividades={
              <div data-slot="parte-atividades">
                <LimitesDoCurriculo
                  sigla={codigo}
                  versao={curriculo.versao}
                  limites={limites}
                  podeEditar={editavel && podeEditarCurso}
                />
              </div>
            }
          />
        </div>
      ) : (
        /* Sem currículo não há partes: a vigência do regime fica à vista mesmo assim. */
        secaoDeRegime
      )}
    </section>
  );

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-texto text-lg font-semibold">Editar {codigo}</h1>
      <AbasDaEdicaoDoCurso cadastro={cadastro} curriculo={abaDoCurriculo} />
    </section>
  );
}

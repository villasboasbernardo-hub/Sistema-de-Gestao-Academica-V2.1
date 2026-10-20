/**
 * Editar curso (`FR-016`, `FR-014.2`, `FR-013.1`, `FR-041`).
 *
 * ⚠️ **AS TURMAS SÃO CONTADAS AQUI, e não no formulário** (`FR-014.2`). O diálogo da troca de sigla
 * precisa dizer **quantas** turmas ficam com a sigla antiga e dar **um exemplo** — e isso é leitura,
 * que é do servidor.
 *
 * ⚠️ **OS ANOS ACIMA DO LIMITE TAMBÉM VÊM PRONTOS**, de `lib/dominio/limite-de-turmas.ts`, sobre as
 * mesmas turmas. Recalcular no navegador daria duas respostas para "passou do limite?".
 *
 * ⚠️ **A VIGÊNCIA DE REGIME SE REGISTRA NESTA ROTA** (`FR-013.1`, decisão de 17/09/2026), na seção
 * abaixo do formulário — que **não** toca em regime: mudar TA por dia é vigência nova, nunca edição
 * da linha do curso (`FR-020`).
 *
 * ⚠️ **O HISTÓRICO E AS TRAVAS VÊM NUMA CHAMADA SÓ**, de `public.vigencias_do_curso` — a função que
 * envolve `app.lancamentos_que_travam_vigencia`, do schema `app`, fora do alcance do PostgREST. Ler
 * as quatro origens de lançamento aqui seria reimplementar o `FR-021.2` na tela.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { anosAcimaDoLimite, type TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import { reaisParaEdicao } from "@/lib/formato/moeda";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../consulta";
import { FormularioDeCurso } from "../../FormularioDeCurso";
import { mensagemDeCursoNaoEncontrado } from "../consulta";
import { travasDoBanco, vigenciasDoBanco } from "./consulta";
import { EnvioDoCurriculo } from "./EnvioDoCurriculo";
import { SecaoDeRegime } from "./SecaoDeRegime";

export default async function EditarCurso({ params }: { params: Promise<{ curso: string }> }) {
  const { curso: sigla } = await params;

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, nome_curso, classificacao, modalidade, duracao_dias, duracao_semanas, limite_turmas_ano, proposito, status, ofertavel_estrangeiros, estrangeiros_observacao, custo_total, custo_composicao, curriculo_pdf_em",
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
   * ⚠️ **SÃO DUAS PERMISSÕES DIFERENTES NESTA MESMA ROTA, e tratá-las como uma fecharia a porta a um
   *    perfil que o BANCO autoriza.** Editar o curso é `cursos.editar`; registrar vigência é
   *    `horarios.criar` — e o **Operador** tem a segunda sem ter a primeira. É o mesmo par que serviu
   *    de caso que discrimina na migration da fatia (a) (`N-1b`). Barrar a tela inteira por
   *    `cursos.editar` deixaria o Operador sem caminho nenhum para o que a policy lhe permite fazer.
   *
   * ⚠️ **E QUEM NÃO TEM NENHUMA DAS DUAS NÃO ENTRA** — aí a tela não tem o que oferecer.
   */
  const podeEditarCurso = pode(permissoes, "cursos", "editar");
  const podeRegistrarRegime = pode(permissoes, "horarios", "criar");

  if (!podeEditarCurso && !podeRegistrarRegime) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar {curso.codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não edita curso nem registra regime"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
      </section>
    );
  }

  const cursoId = curso.id as string;

  const [turmasRes, vigenciasRes] = await Promise.all([
    supabase
      .from("turmas")
      .select("codigo, ano_letivo, status")
      .eq("curso_id", cursoId)
      .order("codigo"),
    supabase.rpc("vigencias_do_curso", { p_curso_id: cursoId }),
  ]);
  const turmas = turmasRes.data;

  const linhas = vigenciasRes.data ?? [];
  const vigencias = vigenciasDoBanco(linhas);
  const travas = travasDoBanco(linhas);

  const paraLimite: TurmaParaLimite[] = (turmas ?? []).map((t) => ({
    ano: Number(t.ano_letivo),
    status: t.status as string,
  }));

  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-texto text-lg font-semibold">Editar {curso.codigo}</h1>
      {podeEditarCurso ? (
        <FormularioDeCurso
          modo="edicao"
          inicial={{
            codigo: curso.codigo as string,
            nome_curso: curso.nome_curso as string,
            classificacao: curso.classificacao as string,
            modalidade: texto(curso.modalidade),
            duracao_dias: texto(curso.duracao_dias),
            duracao_semanas: texto(curso.duracao_semanas),
            limite_turmas_ano: texto(curso.limite_turmas_ano),
            proposito: texto(curso.proposito),
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
          turmasDoCurso={(turmas ?? []).length}
          {...(turmas && turmas[0] ? { exemploDeTurma: turmas[0].codigo as string } : {})}
          anosAcimaDoLimite={anosAcimaDoLimite(
            paraLimite,
            curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
          )}
        />
      ) : (
        <p className="text-texto-suave text-sm" role="status" data-slot="so-o-regime">
          O seu perfil registra o regime deste curso, mas não edita o cadastro dele.
        </p>
      )}

      {/* Spec 020 (C-8): carrega quem edita o curso — o botão segue a permissão do banco (policy do balde). */}
      {podeEditarCurso ? (
        <EnvioDoCurriculo
          sigla={curso.codigo as string}
          cursoId={cursoId}
          carregadoEm={(curso.curriculo_pdf_em as string | null) ?? null}
          cursoAtivo={curso.status === "ativo"}
        />
      ) : null}

      <SecaoDeRegime
        cursoId={cursoId}
        sigla={curso.codigo as string}
        vigencias={vigencias}
        travas={travas}
        podeRegistrar={podeRegistrarRegime}
      />
    </section>
  );
}

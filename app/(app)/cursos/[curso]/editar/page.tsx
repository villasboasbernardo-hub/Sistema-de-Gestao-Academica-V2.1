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
 * ⚠️ **A VIGÊNCIA DE REGIME SE REGISTRA NESTA ROTA** (`FR-013.1`, decisão de 17/09/2026) — a seção
 * entra na Fase 20; o formulário de curso não toca em regime na edição.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { anosAcimaDoLimite, type TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../consulta";
import { FormularioDeCurso } from "../../FormularioDeCurso";
import { mensagemDeCursoNaoEncontrado } from "../consulta";

export default async function EditarCurso({ params }: { params: Promise<{ curso: string }> }) {
  const { curso: sigla } = await params;

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, nome_curso, classificacao, modalidade, duracao_dias, duracao_semanas, limite_turmas_ano, proposito",
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

  if (!pode(permissoes, "cursos", "editar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Editar {curso.codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não edita curso"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
      </section>
    );
  }

  const { data: turmas } = await supabase
    .from("turmas")
    .select("codigo, ano_letivo, status")
    .eq("curso_id", curso.id as string)
    .order("codigo");

  const paraLimite: TurmaParaLimite[] = (turmas ?? []).map((t) => ({
    ano: Number(t.ano_letivo),
    status: t.status as string,
  }));

  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-texto text-lg font-semibold">Editar {curso.codigo}</h1>
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
        }}
        turmasDoCurso={(turmas ?? []).length}
        {...(turmas && turmas[0] ? { exemploDeTurma: turmas[0].codigo as string } : {})}
        anosAcimaDoLimite={anosAcimaDoLimite(
          paraLimite,
          curso.limite_turmas_ano === null ? null : Number(curso.limite_turmas_ano),
        )}
      />
    </section>
  );
}

/**
 * Cadastrar turma (`FR-025`, `FR-026.1`, `FR-041`).
 *
 * ⚠️ **A TURMA NASCE DENTRO DO CURSO** (`FR-031.6`): não existe `/turmas/nova` solta. O curso do
 * caminho é o curso da turma, e é por isso que o formulário não tem seletor de curso.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 *
 * ⚠️ **SEM PERMISSÃO, A TELA DIZ ISSO** — e não mostra um formulário que o banco vai recusar. Quem
 * protege continua sendo a policy; esconder é conforto de quem usa.
 */
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import type { JanelaDeTurma, VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import { codigoDaTurmaNoSegmento } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../../consulta";
import { mensagemDeCursoNaoEncontrado } from "../../consulta";
import { FormularioDeTurma } from "../../../../turmas/FormularioDeTurma";
import { protecoesDoBanco } from "../../../../turmas/[turma]/consulta";

export default async function NovaTurma({ params }: { params: Promise<{ curso: string }> }) {
  const { curso: segmento } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmento);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select("id, codigo, nome_curso, limite_turmas_ano")
    .eq("codigo", sigla)
    .maybeSingle();

  if (!curso) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Nova turma</h1>
        <p role="status" className="text-texto" data-slot="curso-nao-encontrado">
          {mensagemDeCursoNaoEncontrado(
            sigla,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  if (!pode(permissoes, "turmas", "criar")) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Nova turma em {curso.codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="O seu perfil não cadastra turma"
          detalhe="Fale com o Admin se precisar deste acesso."
        />
      </section>
    );
  }

  const cursoId = curso.id as string;

  const [turmasRes, salasRes, protecaoRes] = await Promise.all([
    supabase
      .from("turmas")
      .select("codigo, turma, ano_letivo, status, data_inicio, data_termino")
      .eq("curso_id", cursoId),
    supabase
      .from("config_listas")
      .select("valor, ativo, metadados")
      .eq("lista", "salas")
      .order("ordem"),
    supabase.rpc("protecao_das_vigencias_por_atividade_global", { p_curso_id: cursoId }),
  ]);

  const todas = turmasRes.data ?? [];

  const turmasDoCurso: TurmaParaLimite[] = todas.map((t) => ({
    ano: Number(t.ano_letivo),
    status: t.status as string,
  }));

  const janelasDoCurso: JanelaDeTurma[] = todas.map((t) => ({
    codigo: t.codigo as string,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
  }));

  /* ⚠️ A NOTA DO `FR-026.1` — a turma sem rótulo que já existe no ano. Nota, nunca diálogo. */
  const semRotuloNoAno = todas
    .filter((t) => t.turma === null)
    .map((t) => ({ ano: Number(t.ano_letivo), codigo: t.codigo as string }));

  const todasAsSalas: Sala[] = (salasRes.data ?? []).map((s) => ({
    valor: s.valor as string,
    ativo: s.ativo !== false,
    metadados: s.metadados,
  }));
  /* ⚠️ Turma nova não tem sala atual — aqui só as ativas entram. */
  const salas = salasParaEscolher(todasAsSalas, null);

  const vigenciasProtegidas: VigenciaProtegida[] = protecoesDoBanco(protecaoRes.data ?? []);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-lg font-semibold">Nova turma em {curso.codigo}</h1>
        <p className="text-texto-suave text-sm">{curso.nome_curso as string}</p>
      </header>

      <FormularioDeTurma
        modo="novo"
        cursoId={cursoId}
        salas={salas}
        turmasDoCurso={turmasDoCurso}
        limiteDoCurso={
          curso.limite_turmas_ano === null || curso.limite_turmas_ano === undefined
            ? null
            : Number(curso.limite_turmas_ano)
        }
        semRotuloNoAno={semRotuloNoAno}
        vigenciasProtegidas={vigenciasProtegidas}
        janelasDoCurso={janelasDoCurso}
      />
    </section>
  );
}

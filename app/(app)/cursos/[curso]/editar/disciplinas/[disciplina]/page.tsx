/**
 * A página própria da disciplina, dentro de *Editar curso* (spec 022, Bloco 7, FR-002.2, D-2).
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime) ou página própria (formulário
 * > longo: disciplina, curso) — nunca campos abertos na página. Modelo: a ficha do instrutor."*
 * > — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O FORMULÁRIO LONGO MORA AQUI, e os curtos abrem em diálogo**: o cadastro da disciplina na página; as UEs e as
 *    avaliações do currículo, cada uma num diálogo. A situação e a exclusão ficam no topo, à direita (FR-001.2).
 * ⚠️ **DENTRO DE *EDITAR CURSO*, e não na página do curso**: a página do curso é só leitura (A-1 da spec 021). Quem não
 *    edita disciplina não chega aqui pela tela; se chegar pelo endereço, lê — e o banco recusa qualquer gravação.
 * ⚠️ **A MESMA LEITURA DA GRADE** (`lerGradeDeDisciplinas`, pelo currículo da disciplina): a linha, as UEs e as
 *    avaliações do currículo são as mesmas que o detalhe da grade mostra.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Os painéis são folhas.
 */
import Link from "next/link";

import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { rotuloDoCurriculo } from "@/lib/dominio/curriculos";
import { disciplinaTemCurriculo } from "@/lib/dominio/modelo-do-curriculo";
import {
  codigoDaTurmaNoSegmento,
  enderecoDaEdicaoDoCurso,
} from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { lerGradeDeDisciplinas } from "../../../../../disciplinas/consulta";
import { DialogoDeExclusao } from "../../../../../disciplinas/paineis/DialogoDeExclusao";
import { FormularioDeDisciplina } from "../../../../../disciplinas/paineis/FormularioDeDisciplina";
import { PainelDeAvaliacoesDoCurriculo } from "../../../../../disciplinas/paineis/PainelDeAvaliacoesDoCurriculo";
import { PainelDeUnidades } from "../../../../../disciplinas/paineis/PainelDeUnidades";
import { SituacaoDaDisciplina } from "../../../../../disciplinas/paineis/SituacaoDaDisciplina";

type CurriculoDaDisciplina = {
  readonly id: string;
  readonly versao: number;
  readonly vigente_de: string;
  readonly arquivado_em: string | null;
  readonly descricao: string | null;
};

export default async function PaginaDaDisciplina({
  params,
}: {
  params: Promise<{ curso: string; disciplina: string }>;
}) {
  const { curso: segmentoDoCurso, disciplina: segmentoDaDisciplina } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmentoDoCurso);
  // O decodificador único do segmento (FR-031.2): o mesmo da sigla do curso.
  const codigo = codigoDaTurmaNoSegmento(segmentoDaDisciplina);

  const usuario = await usuarioDaSessao();
  const supabase = await criarClienteDeServidor();
  const [permissoes, { data: disciplina }] = await Promise.all([
    permissoesDoPerfil(usuario?.perfil ?? null),
    supabase
      .from("disciplinas")
      .select(
        "id, codigo, curriculo_id, curso:cursos!disciplinas_curso_id_fkey(id, codigo, status), curriculo:curriculos!disciplinas_curriculo_do_proprio_curso_fk(id, versao, vigente_de, arquivado_em, descricao)",
      )
      .eq("codigo", codigo)
      .maybeSingle(),
  ]);

  const curso = (
    disciplina as unknown as { curso?: { id: string; codigo: string; status: string } }
  )?.curso;
  const curriculo = (disciplina as unknown as { curriculo?: CurriculoDaDisciplina | null })
    ?.curriculo;
  const voltar = (versao?: number) => enderecoDaEdicaoDoCurso(sigla, versao, "disciplinas");

  if (!disciplina || !curso || curso.codigo !== sigla || !curriculo) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Disciplina</h1>
        <p role="status" className="text-texto" data-slot="disciplina-nao-encontrada">
          A disciplina {codigo} não foi encontrada neste curso, ou o seu perfil não a alcança.
        </p>
        <Link href={voltar()} className="text-marca text-sm underline-offset-2 hover:underline">
          Voltar às disciplinas de {sigla}
        </Link>
      </section>
    );
  }

  const podeDisciplinas = {
    criar: pode(permissoes, "disciplinas", "criar"),
    editar: pode(permissoes, "disciplinas", "editar"),
    desativar: pode(permissoes, "disciplinas", "desativar"),
  };
  /* O arquivado se edita só depois de desarquivado (RC-10); fora de oferta, nada se edita — como em *Editar curso*. */
  const editavel = curso.status === "ativo" && curriculo.arquivado_em === null;

  const grade = await lerGradeDeDisciplinas({
    cursoCodigo: sigla,
    turmaCodigo: "",
    curriculoId: curriculo.id,
  });
  const linha = grade.linhas.find((l) => l.codigo === codigo);

  if (!linha) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Disciplina {codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Não pude ler esta disciplina"
          detalhe="Recarregue a página; se continuar, o seu perfil pode não alcançá-la."
        />
      </section>
    );
  }

  const podeEditar = editavel && podeDisciplinas.editar;
  const podeDesativar = editavel && podeDisciplinas.desativar;

  return (
    <section className="flex flex-col gap-5" data-slot="pagina-da-disciplina">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href={voltar(curriculo.versao)}
            className="text-marca text-sm underline-offset-2 hover:underline"
            data-slot="voltar-as-disciplinas"
          >
            Voltar às disciplinas de {sigla}
          </Link>
          <h1 className="text-texto text-lg font-semibold">
            {linha.codDisciplina} — {linha.nomeDisciplina}
          </h1>
          {/* veste: o código gerado e o currículo, abaixo do título — texto secundário */}
          <p className="text-texto-tenue text-xs">
            {linha.codigo} · {rotuloDoCurriculo(curriculo)}
            {linha.ativa ? "" : " · fora de oferta"}
          </p>
        </div>
        {/* Spec 022 (FR-001.2): as ações da página no topo, à direita. */}
        <BarraDeAcoes rotulo="Ações da disciplina">
          {podeDesativar ? (
            <SituacaoDaDisciplina
              disciplinaId={linha.disciplinaId}
              nome={linha.nomeDisciplina}
              ativa={linha.ativa}
              turmasQueUsam={linha.turmaDisciplinaId === null ? 0 : 1}
            />
          ) : null}
          {/* ⚠️ Excluir segue a permissão de CRIAR (`FR-021`): o Operador, que edita, não vê este botão. */}
          {editavel && podeDisciplinas.criar ? (
            <DialogoDeExclusao
              tipo="disciplina"
              nome={linha.nomeDisciplina}
              codigo={linha.codigo}
              identificador={linha.disciplinaId}
              destinoAoExcluir={voltar(curriculo.versao)}
            />
          ) : null}
        </BarraDeAcoes>
      </header>

      {!editavel ? (
        <p role="status" className="text-texto-suave text-sm" data-slot="disciplina-so-leitura">
          {curso.status !== "ativo"
            ? "Curso fora de oferta: a disciplina fica para consulta e não recebe edição."
            : "Este currículo está arquivado: a disciplina se consulta, não se edita."}
        </p>
      ) : null}

      <section aria-labelledby="titulo-cadastro-da-disciplina" className="flex flex-col gap-2">
        <h2 id="titulo-cadastro-da-disciplina" className="text-texto text-base font-semibold">
          Cadastro
        </h2>
        {podeEditar ? (
          <FormularioDeDisciplina
            cursoId={curso.id}
            disciplina={{
              disciplinaId: linha.disciplinaId,
              codDisciplina: linha.codDisciplina,
              nomeDisciplina: linha.nomeDisciplina,
              cargaHorariaTempos: linha.cargaHorariaTempos,
              ordemSugerida: linha.ordemSugerida,
              modoAtribuicaoPadrao: linha.modoAtribuicaoPadrao,
              tecnicaEnsinoSugerida: linha.tecnicaEnsinoSugerida,
              localPadrao: linha.localPadrao,
              nomeNoDsa: linha.nomeNoDsa,
              presencial: linha.presencial,
            }}
          />
        ) : (
          <p className="text-texto text-sm" data-slot="cadastro-em-leitura">
            {linha.cargaHorariaTempos} TA
            {linha.nomeNoDsa ? ` · no DSA: ${linha.nomeNoDsa}` : ""}
          </p>
        )}
      </section>

      {disciplinaTemCurriculo({
        disciplinaId: linha.disciplinaId,
        unidadesAtivas: linha.unidades.filter((u) => u.ativa).length,
      }) || podeEditar ? (
        <PainelDeUnidades
          disciplinaId={linha.disciplinaId}
          unidades={linha.unidades}
          avisoDaSoma={linha.avisoDaSoma}
          podeEditar={podeEditar}
          podeDesativar={podeDesativar}
        />
      ) : null}

      <PainelDeAvaliacoesDoCurriculo
        disciplinaId={linha.disciplinaId}
        itens={linha.avaliacoesDoCurriculo}
        podeEditar={podeEditar}
      />
    </section>
  );
}

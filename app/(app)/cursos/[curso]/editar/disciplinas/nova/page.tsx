/**
 * O cadastro de disciplina, em página própria, dentro de *Editar curso* (spec 022, Bloco 7, FR-002.2, D-2).
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto) ou página própria (formulário longo: disciplina, curso)."*
 * > — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **A DISCIPLINA NASCE NO CURRÍCULO ESCOLHIDO** (`?curriculo=N`, RC-5 da spec 021): o mesmo que *Editar curso* mostra;
 *    sem número, o vigente. O pedido que não serve degrada com aviso, como lá.
 * ⚠️ **DEPOIS DE CRIAR, DE VOLTA ÀS DISCIPLINAS DO CURSO**, onde a linha nova aparece — e de onde se abre a página dela
 *    para acrescentar as UEs e as avaliações.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** O formulário é folha.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { curriculoDaPagina, rotuloDoCurriculo } from "@/lib/dominio/curriculos";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import {
  codigoDaTurmaNoSegmento,
  enderecoDaEdicaoDoCurso,
} from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { FormularioDeDisciplina } from "../../../../../disciplinas/paineis/FormularioDeDisciplina";

type CurriculoDoCurso = {
  readonly id: string;
  readonly versao: number;
  readonly vigente_de: string;
  readonly status: string;
  readonly arquivado_em: string | null;
};

export default async function NovaDisciplina({
  params,
  searchParams,
}: {
  params: Promise<{ curso: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { curso: segmento } = await params;
  const sigla = codigoDaTurmaNoSegmento(segmento);
  const { valores } = lerParametros("/cursos/[curso]/editar/disciplinas/nova", await searchParams);

  const usuario = await usuarioDaSessao();
  const supabase = await criarClienteDeServidor();
  const [permissoes, { data: curso }] = await Promise.all([
    permissoesDoPerfil(usuario?.perfil ?? null),
    supabase
      .from("cursos")
      .select(
        "id, codigo, status, curriculos:curriculos!curriculos_curso_id_fkey(id, versao, vigente_de, status, arquivado_em)",
      )
      .eq("codigo", sigla)
      .maybeSingle(),
  ]);

  if (!curso) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Nova disciplina</h1>
        <p role="status" className="text-texto" data-slot="curso-nao-encontrado">
          O curso {sigla} não foi encontrado, ou o seu perfil não o alcança.
        </p>
      </section>
    );
  }

  const curriculos = ((curso as unknown as { curriculos?: CurriculoDoCurso[] }).curriculos ??
    []) as CurriculoDoCurso[];
  const escolha = curriculoDaPagina(curriculos, String(valores.curriculo), hojeNaCiaara());
  const curriculo = escolha.curriculo;
  const voltar = enderecoDaEdicaoDoCurso(sigla, curriculo?.versao, "disciplinas");
  const podeCriar =
    pode(permissoes, "disciplinas", "criar") &&
    curso.status === "ativo" &&
    curriculo !== null &&
    curriculo.arquivado_em === null;

  return (
    <section className="flex flex-col gap-5" data-slot="pagina-da-nova-disciplina">
      <header className="flex flex-col gap-1">
        <Link href={voltar} className="text-marca text-sm underline-offset-2 hover:underline">
          Voltar às disciplinas de {sigla}
        </Link>
        <h1 className="text-texto text-lg font-semibold">Nova disciplina em {sigla}</h1>
        {curriculo ? (
          /* veste: o currículo onde a disciplina nasce, abaixo do título */
          <p className="text-texto-tenue text-xs">No {rotuloDoCurriculo(curriculo)}</p>
        ) : null}
      </header>

      {escolha.aviso ? (
        <p role="status" className="text-atrasado-tinta text-sm" data-slot="aviso-do-curriculo">
          {escolha.aviso}
        </p>
      ) : null}

      {podeCriar ? (
        <div data-slot="cadastro-de-disciplina">
          <FormularioDeDisciplina
            cursoId={curso.id as string}
            curriculoId={curriculo.id}
            destinoAoConcluir={voltar}
          />
        </div>
      ) : (
        <EstadoVazio
          motivo="sem-permissao"
          titulo="Não é possível cadastrar disciplina aqui"
          detalhe="O seu perfil não cadastra disciplina, ou o curso está fora de oferta, ou o currículo está arquivado."
        />
      )}
    </section>
  );
}

/**
 * *Editar currículo* — spec 021, Bloco 6, RC-1, RC-5, RC-6, RC-11 e RC-12.
 *
 * > *"RC-5 · Editar escolhendo o currículo."* · *"RC-11 · PDF. Cada currículo tem o seu PDF."*
 *
 * ⚠️ O BOTÃO SEGUE A PERMISSÃO DO DESTINO (`cursos.editar`), e a página confere de novo.
 * ⚠️ O ARQUIVADO SE CONSULTA, não se edita (RC-10): a página diz isso e aponta o desarquivar, que mora na página do curso.
 * ⚠️ AS DISCIPLINAS, AS UEs E AS AVALIAÇÕES DO CURRÍCULO se editam na aba *Disciplinas* do curso, com este currículo
 *    escolhido no seletor — o link leva até lá.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { rotuloDoCurriculo, type CurriculoParaVigencia } from "@/lib/dominio/curriculos";
import { enderecoDoCursoNoCurriculo } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../../../consulta";
import { mensagemDeCursoNaoEncontrado } from "../../../consulta";
import { EnvioDoCurriculo } from "./EnvioDoCurriculo";
import { FormularioDoCurriculo } from "./FormularioDoCurriculo";

type CurriculoDaEdicao = CurriculoParaVigencia & {
  readonly id: string;
  readonly descricao: string | null;
  readonly proposito: string | null;
  readonly duracao_dias: number;
  readonly duracao_semanas: number | null;
  readonly pdf_carregado_em: string | null;
};

export default async function EditarCurriculo({
  params,
}: {
  params: Promise<{ curso: string; versao: string }>;
}) {
  const { curso: sigla, versao: numero } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, status, curriculos:curriculos!curriculos_curso_id_fkey(id, versao, vigente_de, status, arquivado_em, descricao, proposito, duracao_dias, duracao_semanas, pdf_carregado_em)",
    )
    .eq("codigo", sigla)
    .maybeSingle();
  const curriculo = curso
    ? (((curso as unknown as { curriculos?: CurriculoDaEdicao[] }).curriculos ?? []).find(
        (c) => String(c.versao) === numero && c.status === "ativo",
      ) ?? null)
    : null;

  if (!curso || !curriculo) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Editar currículo</h1>
        <p role="status" className="text-texto" data-slot="curriculo-nao-encontrado">
          {curso
            ? `O Currículo ${numero} não existe em ${curso.codigo as string}.`
            : mensagemDeCursoNaoEncontrado(
                sigla,
                alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
              )}
        </p>
      </section>
    );
  }

  const codigo = curso.codigo as string;
  const rotulo = rotuloDoCurriculo(curriculo);
  const voltar = (
    <Link
      href={enderecoDoCursoNoCurriculo(codigo, curriculo.versao)}
      className="text-marca text-sm underline-offset-2 hover:underline"
      data-slot="voltar-ao-curriculo"
    >
      Voltar ao curso, no {rotulo}
    </Link>
  );

  if (!pode(permissoes, "cursos", "editar") || curso.status !== "ativo") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">
          {codigo} — {rotulo}
        </h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo={
            curso.status !== "ativo"
              ? "Curso fora de oferta: o currículo não se edita"
              : "O seu perfil não edita currículo"
          }
          detalhe="Quem edita currículo é quem edita o curso (Admin, Encarregado e Ajudante da Administração Acadêmica)."
        />
        {voltar}
      </section>
    );
  }

  if (curriculo.arquivado_em !== null) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">
          {codigo} — {rotulo}
        </h1>
        <p role="status" className="text-texto text-sm" data-slot="curriculo-arquivado">
          Este currículo está arquivado: ele se consulta, não se edita. Para editá-lo, desarquive-o
          na página do curso.
        </p>
        {voltar}
      </section>
    );
  }

  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-texto text-lg font-semibold">
        {codigo} — {rotulo}
      </h1>
      <p className="text-texto-suave text-sm" data-slot="aviso-da-correcao">
        Se uma turma que segue este currículo já tem lançamento, mudar o que já tinha valor é
        correção: só o Admin, o Encarregado e o Ajudante da Administração Acadêmica a fazem, com
        justificativa, e ela fica registrada. Completar o que estava vazio é livre. As disciplinas,
        as unidades de ensino e as avaliações deste currículo se editam na aba{" "}
        <Link
          href={enderecoDoCursoNoCurriculo(codigo, curriculo.versao, "disciplinas")}
          className="text-marca underline-offset-2 hover:underline"
          data-slot="ir-para-disciplinas-do-curriculo"
        >
          Disciplinas
        </Link>
        .
      </p>
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
      <EnvioDoCurriculo
        sigla={codigo}
        cursoId={curso.id as string}
        curriculoId={curriculo.id}
        versao={curriculo.versao}
        carregadoEm={curriculo.pdf_carregado_em}
        cursoAtivo={curso.status === "ativo"}
      />
      {voltar}
    </section>
  );
}

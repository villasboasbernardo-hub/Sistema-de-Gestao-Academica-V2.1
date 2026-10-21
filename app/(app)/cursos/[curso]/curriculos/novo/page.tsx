/**
 * *Novo currículo* — spec 021, Bloco 6, RC-2, RC-7 e D-27.
 *
 * > *"RC-7 · Novo currículo. "Novo currículo" nasce como cópia do vigente e é editado livremente enquanto nenhuma turma
 * > com lançamento o segue."* · *"RC-2 · No máximo UM currículo vigente por curso; pode haver um FUTURO e os PASSADOS."*
 *
 * ⚠️ O BOTÃO SEGUE A PERMISSÃO DO DESTINO (`cursos.editar`), e a página confere de novo: quem não tem, não vê o formulário.
 * ⚠️ JÁ HÁ UM FUTURO? A página não oferece outro (D-27) — aponta para ele, que é onde a mudança planejada se edita.
 */
import Link from "next/link";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import {
  curriculoVigenteEm,
  rotuloDoCurriculo,
  situacaoDoCurriculo,
} from "@/lib/dominio/curriculos";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaEdicaoDoCurriculo, enderecoDoCurso } from "@/lib/navegacao/endereco-de-turma";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { alcanceDoPerfil } from "../../../consulta";
import { mensagemDeCursoNaoEncontrado, type CurriculoDaPagina } from "../../consulta";
import { FormularioDeNovoCurriculo } from "./FormularioDeNovoCurriculo";

export default async function NovoCurriculo({ params }: { params: Promise<{ curso: string }> }) {
  const { curso: sigla } = await params;
  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: curso } = await supabase
    .from("cursos")
    .select(
      "id, codigo, status, curriculos:curriculos!curriculos_curso_id_fkey(id, versao, vigente_de, status, arquivado_em, proposito, duracao_dias, duracao_semanas, pdf_carregado_em)",
    )
    .eq("codigo", sigla)
    .maybeSingle();

  if (!curso) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Novo currículo</h1>
        <p role="status" className="text-texto" data-slot="curso-nao-encontrado">
          {mensagemDeCursoNaoEncontrado(
            sigla,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const codigo = curso.codigo as string;
  const voltar = (
    <Link
      href={enderecoDoCurso(codigo)}
      className="text-marca text-sm underline-offset-2 hover:underline"
    >
      Voltar ao curso
    </Link>
  );

  if (!pode(permissoes, "cursos", "editar") || curso.status !== "ativo") {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-texto text-lg font-semibold">Novo currículo de {codigo}</h1>
        <EstadoVazio
          motivo="sem-permissao"
          titulo={
            curso.status !== "ativo"
              ? "Curso fora de oferta não recebe currículo novo"
              : "O seu perfil não cria currículo"
          }
          detalhe="Quem cria currículo é quem edita o curso (Admin, Encarregado e Ajudante da Administração Acadêmica)."
        />
        {voltar}
      </section>
    );
  }

  const hoje = hojeNaCiaara();
  const curriculos = ((curso as unknown as { curriculos?: CurriculoDaPagina[] }).curriculos ??
    []) as CurriculoDaPagina[];
  const vigente = curriculoVigenteEm(curriculos, hoje);
  const futuro =
    curriculos.find(
      (c) => c.arquivado_em === null && situacaoDoCurriculo(c, curriculos, hoje) === "futuro",
    ) ?? null;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-texto text-lg font-semibold">Novo currículo de {codigo}</h1>
      {futuro ? (
        <p role="status" className="text-texto text-sm" data-slot="ja-ha-futuro">
          Já há um currículo futuro, o {rotuloDoCurriculo(futuro)}. A mudança planejada se edita
          nele:{" "}
          <Link
            href={enderecoDaEdicaoDoCurriculo(codigo, futuro.versao)}
            className="text-marca underline-offset-2 hover:underline"
          >
            editar o {rotuloDoCurriculo(futuro)}
          </Link>
          .
        </p>
      ) : vigente === null ? (
        <p role="status" className="text-texto text-sm" data-slot="sem-vigente">
          Este curso não tem currículo vigente hoje para copiar.
        </p>
      ) : (
        <>
          <p className="text-texto text-sm" data-slot="o-que-se-copia">
            O currículo novo nasce como <strong>cópia do {rotuloDoCurriculo(vigente)}</strong>:
            disciplinas, unidades de ensino, avaliações do currículo, limites de AEC, TAD e TR,
            regras de avaliação, habilitações de instrutor, propósito e duração. O PDF não é
            copiado. As turmas que já existem continuam no currículo delas.
          </p>
          <FormularioDeNovoCurriculo
            sigla={codigo}
            vigenteDeSugerido={`${Number(hoje.slice(0, 4)) + 1}-01-01`}
          />
        </>
      )}
      {voltar}
    </section>
  );
}

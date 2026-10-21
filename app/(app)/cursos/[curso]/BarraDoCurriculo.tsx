/**
 * A barra do currículo na página do curso — spec 021, Bloco 6, RC-7, RC-8, RC-10 e RC-12.
 *
 * > *"RC-8 · Página do curso. Tem um seletor de currículo (o vigente por padrão), que alterna entre vigente, futuro e
 * > passados."* · *"RC-12 · Nome na tela. "Currículo N", com o ano de início da vigência."*
 *
 * ⚠️ SEM MARCADOR DE CLIENTE: o seletor e o arquivamento são folhas; os botões são links.
 * ⚠️ CADA BOTÃO SEGUE A PERMISSÃO DO DESTINO, decidida pela página (`cursos.editar` para criar e editar currículo,
 *    `arquivamento_de_curriculo.editar` para arquivar) — e o banco recusa de qualquer forma.
 * ⚠️ O CURRÍCULO ARQUIVADO SE CONSULTA, não se edita por aqui: o botão de editar some; desarquivar o devolve.
 */
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  enderecoDaEdicaoDoCurriculo,
  enderecoDoNovoCurriculo,
} from "@/lib/navegacao/endereco-de-turma";

import { ArquivarCurriculo } from "./ArquivarCurriculo";
import { DescartarCurriculo } from "./DescartarCurriculo";
import { SeletorDeCurriculo, type OpcaoDoSeletorDeCurriculo } from "./SeletorDeCurriculo";

export function BarraDoCurriculo({
  sigla,
  opcoes,
  selecionado,
  vigente,
  situacao,
  aviso,
  podeCriar,
  podeEditar,
  arquivamento,
  podeDescartar,
}: {
  readonly sigla: string;
  readonly opcoes: readonly OpcaoDoSeletorDeCurriculo[];
  readonly selecionado: number | null;
  readonly vigente: number | null;
  /** A situação do selecionado, já em texto (vigente, futuro, passado, arquivado). */
  readonly situacao: string | null;
  /** O pedido da URL que não serviu (`curriculoDaPagina`). */
  readonly aviso: string | null;
  /** *Novo currículo*: `cursos.editar` e curso em oferta. */
  readonly podeCriar: boolean;
  /** *Editar currículo*: `cursos.editar`, curso em oferta e currículo não arquivado. */
  readonly podeEditar: boolean;
  /** Arquivar ou desarquivar o selecionado — `null` quando não cabe (RC-10). */
  readonly arquivamento: { readonly arquivado: boolean } | null;
  /** D-36: descartar o selecionado — não é o vigente, nenhuma turma o segue, e quem vê edita o curso. */
  readonly podeDescartar: boolean;
}) {
  return (
    <div className="flex flex-col gap-2" data-slot="barra-do-curriculo">
      {aviso ? (
        <p
          role="status"
          className="text-atrasado-tinta text-sm"
          data-slot="aviso-da-escolha-do-curriculo"
        >
          {aviso}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        {opcoes.length > 0 ? (
          <SeletorDeCurriculo opcoes={opcoes} selecionado={selecionado} vigente={vigente} />
        ) : (
          <p className="text-texto-suave text-sm" data-slot="sem-curriculo">
            Este curso ainda não tem currículo.
          </p>
        )}
        {situacao ? (
          <span className="text-texto-suave text-xs" data-slot="situacao-do-curriculo">
            {situacao}
          </span>
        ) : null}
        {podeEditar && selecionado !== null ? (
          <Link
            href={enderecoDaEdicaoDoCurriculo(sigla, selecionado)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
            data-slot="editar-curriculo"
          >
            Editar currículo
          </Link>
        ) : null}
        {podeCriar ? (
          <Link
            href={enderecoDoNovoCurriculo(sigla)}
            className={buttonVariants({ size: "sm", variant: "outline" })}
            data-slot="novo-curriculo"
          >
            Novo currículo
          </Link>
        ) : null}
        {podeDescartar && selecionado !== null ? (
          <DescartarCurriculo sigla={sigla} versao={selecionado} />
        ) : null}
        {arquivamento && selecionado !== null ? (
          <ArquivarCurriculo
            sigla={sigla}
            versao={selecionado}
            arquivado={arquivamento.arquivado}
          />
        ) : null}
      </div>
    </div>
  );
}

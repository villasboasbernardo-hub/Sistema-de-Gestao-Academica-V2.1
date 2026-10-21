/**
 * A barra do currículo em *Editar curso* — spec 021, Bloco 6, RC-7, RC-10 e RC-12, no lugar que o ajuste 3 da
 * conferência do PR #82 (21/10/2026) lhe deu: *"escolher o currículo (ou criar o novo, cópia do vigente) e editar ali
 * TODAS as informações dele"*.
 *
 * ⚠️ SEM MARCADOR DE CLIENTE: o seletor, o currículo novo, o arquivamento e o descarte são folhas.
 * ⚠️ CADA AÇÃO SEGUE A PERMISSÃO DO DESTINO, decidida pela página (`cursos.editar` para criar e descartar,
 *    `arquivamento_de_curriculo.editar` para arquivar) — e o banco recusa de qualquer forma.
 */
import { ArquivarCurriculo } from "./ArquivarCurriculo";
import { DescartarCurriculo } from "./DescartarCurriculo";
import { FormularioDeNovoCurriculo } from "./FormularioDeNovoCurriculo";
import { SeletorDeCurriculo, type OpcaoDoSeletorDeCurriculo } from "./SeletorDeCurriculo";

export function BarraDoCurriculo({
  sigla,
  opcoes,
  selecionado,
  vigente,
  situacao,
  aviso,
  novo,
  arquivamento,
  podeDescartar,
}: {
  readonly sigla: string;
  readonly opcoes: readonly OpcaoDoSeletorDeCurriculo[];
  readonly selecionado: number | null;
  readonly vigente: number | null;
  /** A situação do selecionado, já em texto (vigente, futuro, passado, arquivado). */
  readonly situacao: string | null;
  /** O pedido da URL que não serviu. */
  readonly aviso: string | null;
  /** *Novo currículo*: o rótulo do vigente (que é copiado) e a data sugerida — `null` quando não cabe. */
  readonly novo: { readonly copiaDe: string; readonly vigenteDeSugerido: string } | null;
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
        {novo ? (
          <FormularioDeNovoCurriculo
            sigla={sigla}
            copiaDe={novo.copiaDe}
            vigenteDeSugerido={novo.vigenteDeSugerido}
          />
        ) : null}
      </div>
    </div>
  );
}

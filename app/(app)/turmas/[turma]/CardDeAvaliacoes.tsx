/**
 * O card *"Avaliações — N aplicadas de M previstas no currículo"* da ficha da turma (FR-055, FR-056 da spec 014).
 *
 * ⚠️ **AQUI NÃO SE CONTA NADA.** Os números chegam de `contagemDeAvaliacoes`, via `quadroDeAvaliacoesDaTurma`.
 * ⚠️ **A OD E A VISTA FICAM FORA DE N E DE M** (Q-17): a OD é *"+ K avaliações contínuas (OD)"* logo abaixo, e a
 *    vista é *"vistas realizadas A de B"*. A disciplina sem previsto definido é contada à parte, sem esconder o total.
 * ⚠️ O número vai no texto e nos atributos da barra — nunca só na cor.
 * ⚠️ SEM MARCADOR DE CLIENTE: o clique é um link para a seção de avaliações (`#avaliacoes`).
 */
import type { ContagemDeAvaliacoes } from "@/lib/dominio/avaliacoes/contagem";
import { BarraDeProgresso } from "@/components/ciaara/barra-de-progresso";

export const ANCORA_DAS_AVALIACOES = "avaliacoes";

export function CardDeAvaliacoes({ contagem }: { readonly contagem: ContagemDeAvaliacoes }) {
  const {
    aplicadas,
    previstas,
    od,
    vistasRealizadas,
    vistasPrevistas,
    disciplinasNaoDefinidas,
    disciplinasArbitradas,
  } = contagem;
  const percentual = previstas > 0 ? Math.round((aplicadas / previstas) * 100) : null;
  return (
    <a
      href={`#${ANCORA_DAS_AVALIACOES}`}
      className="border-borda bg-superficie rounded-ciaara hover:bg-marca-suave flex flex-col gap-2 border p-3 md:max-w-md"
      data-slot="card-de-avaliacoes"
      data-aplicadas={aplicadas}
      data-previstas={previstas}
    >
      <h3 className="text-texto text-sm font-semibold">Avaliações</h3>
      <p className="text-texto text-sm" data-avaliacoes="n-de-m">
        {aplicadas} aplicadas de {previstas} previstas no currículo
        {percentual === null ? "" : ` (${percentual} %)`}
      </p>
      <BarraDeProgresso
        valor={percentual}
        rotuloAcessivel={`Avaliações: ${aplicadas} aplicadas de ${previstas} previstas no currículo`}
      />
      {od > 0 ? (
        <p className="text-texto-suave text-xs" data-avaliacoes="od">
          + {od} {od === 1 ? "avaliação contínua" : "avaliações contínuas"} (OD)
        </p>
      ) : null}
      <p className="text-texto-suave text-xs" data-avaliacoes="vistas">
        vistas realizadas {vistasRealizadas} de {vistasPrevistas}
      </p>
      {disciplinasArbitradas > 0 ? (
        <p className="text-texto-suave text-xs" data-avaliacoes="arbitradas">
          {disciplinasArbitradas} {disciplinasArbitradas === 1 ? "disciplina" : "disciplinas"} com
          quantidade arbitrada pela Divisão
        </p>
      ) : null}
      {disciplinasNaoDefinidas > 0 ? (
        <p
          role="status"
          className="text-atrasado-tinta text-xs font-medium"
          data-avaliacoes="nao-definido"
        >
          {disciplinasNaoDefinidas} {disciplinasNaoDefinidas === 1 ? "disciplina" : "disciplinas"}{" "}
          sem previsto definido
        </p>
      ) : null}
    </a>
  );
}

/**
 * O quadro de avisos do curso — **acima das abas, fora de qualquer uma** (`FR-010`, `FR-010.1`).
 *
 * ⚠️ **ACIMA DAS ABAS É REQUISITO, NÃO ESTÉTICA.** Dentro de uma aba, o aviso sumiria ao trocar de
 * aba — e um aviso que some quando a pessoa navega é um aviso que ninguém vê.
 *
 * ⚠️ **NASCE RECOLHIDO, COM AS CONTAGENS À VISTA** (`RNF-USA-04`). O que se recolhe é a lista; o
 * número nunca sai da tela. É o mesmo componente do quadro de instrutores — um só, desde a T111.
 *
 * ⚠️ **SEM AVISO NENHUM, ELE DIZ ISSO.** Um quadro vazio se lê como quadro que não carregou.
 */
import { AvisosRecolhiveis } from "@/components/ciaara/avisos-recolhiveis";
import type { AvisoDoCurso } from "@/lib/dominio/avisos-do-curso";

export function QuadroDeAvisosDoCurso({ avisos }: { readonly avisos: readonly AvisoDoCurso[] }) {
  return (
    <section
      aria-labelledby="quadro-de-avisos-do-curso"
      data-slot="quadro-de-avisos-do-curso"
      className="border-borda bg-superficie-1 rounded-ciaara flex flex-col gap-2 border p-3"
    >
      <h2 id="quadro-de-avisos-do-curso" className="text-atrasado-tinta font-semibold">
        Avisos de qualidade de cadastro
      </h2>

      {avisos.length === 0 ? (
        <p className="text-texto" role="status">
          Nenhum aviso neste curso.
        </p>
      ) : (
        <AvisosRecolhiveis
          contagens={
            <p className="text-texto" data-slot="total-de-avisos" data-quantidade={avisos.length}>
              <strong>{avisos.length}</strong> {avisos.length === 1 ? "aviso" : "avisos"}
            </p>
          }
        >
          <ul className="flex flex-col gap-1">
            {avisos.map((a, n) => (
              <li key={`${a.chave}-${n}`} data-aviso={a.chave} className="text-texto">
                {a.titulo}
                {a.detalhe ? ` — ${a.detalhe}` : ""}
              </li>
            ))}
          </ul>
        </AvisosRecolhiveis>
      )}
    </section>
  );
}

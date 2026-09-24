/**
 * O quadro de avisos da turma (`FR-028.1`, `FR-028.4`).
 *
 * ⚠️ **NENHUM AVISO BLOQUEIA GRAVAÇÃO** (`RN-DEG-02`). Ele fica **acima** do formulário porque a
 * pessoa precisa lê-lo antes de salvar — não porque o salvar dependa dele.
 *
 * ⚠️ **NASCE RECOLHIDO, COM A CONTAGEM À VISTA** (`RNF-USA-04`) — o mesmo componente do quadro do
 * curso e do de instrutores. Um só, desde a T111.
 *
 * ⚠️ **SEM AVISO NENHUM, ELE DIZ ISSO.** Quadro vazio se lê como quadro que não carregou.
 */
import { AvisosRecolhiveis } from "@/components/ciaara/avisos-recolhiveis";
import type { AvisoDaTurma } from "@/lib/dominio/avisos-da-turma";

export function QuadroDeAvisosDaTurma({ avisos }: { readonly avisos: readonly AvisoDaTurma[] }) {
  return (
    <section
      aria-labelledby="quadro-de-avisos-da-turma"
      data-slot="quadro-de-avisos-da-turma"
      className="border-borda bg-superficie-1 rounded-ciaara flex flex-col gap-2 border p-3"
    >
      <h2 id="quadro-de-avisos-da-turma" className="text-atrasado-tinta font-semibold">
        Avisos de qualidade de cadastro
      </h2>

      {avisos.length === 0 ? (
        <p className="text-texto" role="status">
          Nenhum aviso nesta turma.
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
            {avisos.map((a) => (
              <li key={a.chave} data-aviso={a.chave} className="text-texto">
                {a.titulo}
              </li>
            ))}
          </ul>
        </AvisosRecolhiveis>
      )}
    </section>
  );
}

/**
 * O quadro de avisos de qualidade de cadastro (`FR-027`, `RF-INSTR-09`, `RNF-USA-04`).
 *
 * ⚠️ NASCE RECOLHIDO, NO TOPO DA PÁGINA, E AS CONTAGENS FICAM SEMPRE À VISTA (emenda ao `FR-027` e ao
 * `RNF-USA-04`, decisão de Bernardo Villas Boas, 15/09/2026). A redação anterior proibia recolher,
 * porque *"aviso que se fecha é aviso que se esquece"*. O que se recolhe agora é só a **lista de
 * nomes**: a contagem de cada tipo e o total continuam visíveis sem abrir nada — é isso que preserva a
 * intenção do `RNF-USA-04`, que é o aviso estar sempre à vista, não a lista inteira ocupar a tela.
 *
 * ⚠️ TIPO COM ZERO NÃO APARECE NA LINHA DE CONTAGENS, e recorte sem aviso nenhum mantém o quadro na tela
 * dizendo isso (`RN-DEG-01`) — o quadro nunca some.
 *
 * ⚠️ O TOTAL É DE AVISOS, NÃO DE INSTRUTORES. Quem está em dois tipos conta nos dois, como conta em cada
 * linha: o total é a soma da linha de contagens, e a tela diz "avisos".
 *
 * ⚠️ ESTE ARQUIVO É SERVIDOR. Só o botão de abrir é folha de cliente (`AvisosRecolhiveis`); os nomes
 * saem por `NomeInstrutor` (`FR-019`) aqui, e chegam prontos. O aviso não condiciona nada (`RN-DEG-02`).
 *
 * ⚠️ ELE NÃO AVALIA REGRA NENHUMA. A lista de avisos é dado, avaliada por
 * `lib/dominio/avisos-cadastro-instrutor.ts`; aqui chega pronta.
 */
import Link from "next/link";

import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import type { AvisoDeCadastro } from "@/lib/dominio/avisos-cadastro-instrutor";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

import { AvisosRecolhiveis } from "@/components/ciaara/avisos-recolhiveis";

export type InstrutorDoAviso = InstrutorParaExibir & { readonly codigo: string };

export function QuadroDeAvisos({
  avisos,
}: {
  readonly avisos: readonly AvisoDeCadastro<InstrutorDoAviso>[];
}) {
  const comOcorrencia = avisos.filter((a) => a.instrutores.length > 0);
  const total = comOcorrencia.reduce((soma, a) => soma + a.instrutores.length, 0);

  return (
    <section
      aria-labelledby="quadro-de-avisos"
      data-slot="quadro-de-avisos"
      className="border-atrasado-borda bg-atrasado-fundo rounded-ciaara flex flex-col gap-2 border p-3 text-sm"
    >
      <h2 id="quadro-de-avisos" className="text-atrasado-tinta font-semibold">
        Avisos de qualidade de cadastro
      </h2>

      {comOcorrencia.length === 0 ? (
        <p className="text-texto" role="status">
          Nenhum aviso de cadastro neste recorte.
        </p>
      ) : (
        <AvisosRecolhiveis
          contagens={
            <ul
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
              data-slot="contagens-de-avisos"
            >
              {comOcorrencia.map((aviso) => (
                <li
                  key={aviso.chave}
                  className="text-texto"
                  data-contagem={aviso.chave}
                  data-quantidade={aviso.instrutores.length}
                >
                  {aviso.titulo}: <strong>{aviso.instrutores.length}</strong>
                </li>
              ))}
              <li className="text-texto" data-slot="total-de-avisos" data-quantidade={total}>
                Total: <strong>{total}</strong> {total === 1 ? "aviso" : "avisos"}
              </li>
            </ul>
          }
        >
          <ul className="flex flex-col gap-2">
            {comOcorrencia.map((aviso) => (
              <li key={aviso.chave} data-aviso={aviso.chave} className="flex flex-col gap-1">
                <p className="text-texto font-medium">
                  {aviso.titulo}: {aviso.instrutores.length}
                </p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {aviso.instrutores.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/instrutores/${i.codigo}`}
                        className="text-texto underline-offset-2 hover:underline"
                      >
                        <NomeInstrutor instrutor={i} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </AvisosRecolhiveis>
      )}
    </section>
  );
}

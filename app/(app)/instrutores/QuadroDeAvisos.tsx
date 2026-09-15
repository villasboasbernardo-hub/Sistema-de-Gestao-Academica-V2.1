/**
 * O quadro de avisos de qualidade de cadastro (`FR-027`, `RF-INSTR-09`, `RNF-USA-04`).
 *
 * ⚠️ SEMPRE VISÍVEL, NUNCA RECOLHIDO. Não há botão de recolher nem de dispensar: aviso que se fecha é
 * aviso que se esquece. Sem aviso no recorte, o quadro continua na tela e diz isso (`RN-DEG-01`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, e o aviso não condiciona nada (`RN-DEG-02`). Os nomes saem por
 * `NomeInstrutor` (`FR-019`) e levam à ficha, onde o cadastro se corrige.
 *
 * ⚠️ ELE NÃO AVALIA REGRA NENHUMA. A lista de avisos é dado, avaliada por
 * `lib/dominio/avisos-cadastro-instrutor.ts`; aqui chega pronta.
 */
import Link from "next/link";

import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import type { AvisoDeCadastro } from "@/lib/dominio/avisos-cadastro-instrutor";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

export type InstrutorDoAviso = InstrutorParaExibir & { readonly codigo: string };

export function QuadroDeAvisos({
  avisos,
}: {
  readonly avisos: readonly AvisoDeCadastro<InstrutorDoAviso>[];
}) {
  const comOcorrencia = avisos.filter((a) => a.instrutores.length > 0);

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
      )}
    </section>
  );
}

/**
 * As **regras de avaliação do currículo** — instrumentos, caráter e fórmula da média final, como o catálogo oficial os
 * traz (`FR-007` e `FR-007.1` da spec 009) — no topo da aba **Avaliações** do curso.
 *
 * ⚠️ **SAÍRAM DE *SOBRE O CURSO* NO BLOCO 7** (spec 022, FR-005.2, D-11; pedido de Bernardo Villas Boas, 22/10/2026:
 *    *"Sobre o Curso só com informações gerais (disciplinas e avaliações saem, sem duplicar)"*). Hoje elas só existiam
 *    ali, e *"sem duplicar"* não pode virar *"sem mostrar"*: vieram para a aba onde o currículo fala de avaliação.
 * ⚠️ **ARQUIVO PRÓPRIO, E NÃO DENTRO DE `AbaAvaliacoes.tsx`**: a varredura do `FR-062` da spec 014 proíbe os dois campos
 *    nas telas de avaliação da turma e do curso, e a do `FR-007.1` só autoriza a exibir quem só exibe. Este arquivo é
 *    esse único leitor — e por isso não compara, não filtra, não ordena e não conta caráter nem fórmula.
 * ⚠️ **AS AVALIAÇÕES SÃO LIDAS COM `avaliacoes.ler`, e não `cursos.ler`** — e por isso o bloco distingue *"não há"* de
 *    *"você não vê"* (`FR-047`). É o gotcha nº 4: policy restritiva devolve lista vazia sem erro.
 * ⚠️ **SEM MARCADOR DE CLIENTE.** É leitura.
 */
import type * as React from "react";

import { EstadoVazio } from "@/components/ciaara/EstadoVazio";

export type AvaliacaoPrevista = {
  readonly disciplina: string;
  readonly instrumentos: string | null;
  readonly carater: string | null;
  readonly formulaMf: string | null;
};

const traco = (v: string | null) => (v === null || v.trim() === "" ? "—" : v);

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 font-normal">
      {children}
    </th>
  );
}

export function RegrasDeAvaliacao({
  avaliacoes,
  legiveis,
}: {
  readonly avaliacoes: readonly AvaliacaoPrevista[];
  /** `false` quando a policy de `avaliacoes_planejadas` recortou a leitura. */
  readonly legiveis: boolean;
}) {
  return (
    <section
      aria-labelledby="bloco-avaliacoes"
      className="flex flex-col gap-2"
      data-slot="regras-de-avaliacao"
    >
      <h2 id="bloco-avaliacoes" className="text-texto text-base font-semibold">
        Regras de avaliação do currículo
      </h2>
      {avaliacoes.length === 0 ? (
        <EstadoVazio
          motivo={legiveis ? "sem-dado" : "sem-permissao"}
          titulo={
            legiveis
              ? "Nenhuma avaliação prevista no catálogo"
              : "Você não vê as avaliações previstas"
          }
          detalhe={
            legiveis
              ? "O catálogo oficial não traz avaliação para este curso."
              : "Existe conteúdo aqui — o seu perfil não alcança."
          }
        />
      ) : (
        <table
          className="w-full border-collapse text-sm"
          data-slot="avaliacoes-previstas"
          aria-label="Avaliações previstas do curso"
        >
          <thead>
            <tr className="border-borda border-b text-left">
              <Th>Disciplina</Th>
              <Th>Instrumentos</Th>
              <Th>Caráter</Th>
              <Th>Fórmula da média final</Th>
            </tr>
          </thead>
          <tbody>
            {avaliacoes.map((a, n) => (
              <tr key={`${a.disciplina}-${n}`} className="border-borda border-b">
                <td className="text-texto py-1">{a.disciplina}</td>
                <td className="text-texto py-1">{traco(a.instrumentos)}</td>
                {/* texto do currículo, exibido — nunca interpretado (`FR-007.1`) */}
                <td className="text-texto py-1">{traco(a.carater)}</td>
                <td className="text-texto py-1">{traco(a.formulaMf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

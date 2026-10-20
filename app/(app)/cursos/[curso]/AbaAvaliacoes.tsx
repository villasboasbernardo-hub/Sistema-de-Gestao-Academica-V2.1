/**
 * A aba **Avaliações** da página do curso — **só o previsto do currículo** (spec 018, FR-002, C-4; spec 014, FR-053,
 * `RF-CURSO-02`) — componente de servidor.
 *
 * ⚠️ **O CURSO NÃO MOSTRA ACOMPANHAMENTO DE TURMA** (pedido de Bernardo Villas Boas, 19/10/2026: *"O curso NÃO mostra
 *    acompanhamento de turma em aba nenhuma: só o previsto no currículo. Achado do Bloco 2: a aba Avaliações do curso
 *    mostra o cumprido da turma — tirar."*). Até o Bloco 3 esta aba reaproveitava o quadro da ficha da turma com a
 *    turma da Grade — e sem turma ele dizia *"0 de N aplicadas"*, que é afirmação sobre execução. O cumprido, a
 *    situação, a projeção e as provas lançadas sem item moram na aba Avaliações da **ficha da turma**.
 * ⚠️ **AQUI NÃO SE CALCULA NADA** — o previsto vem de `previstoDaDisciplina`, pela mesma leitura do currículo
 *    (`lerAvaliacoesDoCurso` sem turma). Esta folha escolhe frases.
 * ⚠️ *Definir tempo* só com alcance de CURSO (`turmaId` vazio), e só para quem tem
 *    `avaliacoes_curriculo_arbitrado.editar`; a página monta as ações, e o banco recusa de qualquer forma.
 * ⚠️ Nota, média e aprovação NÃO aparecem (escopo de outra divisão, `RNF-NORM-06`).
 */
import type * as React from "react";

import { MARCA_ARBITRADO, MARCA_SUGESTAO } from "@/lib/dominio/avaliacoes/previsto";
import type { QuadroDeAvaliacoes } from "@/lib/dominio/avaliacoes/quadro-da-turma";

import { DefinirTempoArbitrado } from "../../turmas/[turma]/DefinirTempoArbitrado";

type Acoes = Pick<
  React.ComponentProps<typeof DefinirTempoArbitrado>,
  "definir" | "confirmar" | "nomear"
>;

export function AbaAvaliacoes({
  quadro,
  aviso,
  arbitrado,
}: {
  /** O quadro lido SEM turma: só o currículo do curso. */
  readonly quadro: QuadroDeAvaliacoes | null;
  readonly aviso: string | null;
  readonly arbitrado?: Acoes;
}) {
  return (
    <section
      aria-labelledby="titulo-avaliacoes-do-curriculo"
      className="flex flex-col gap-2"
      data-slot="aba-avaliacoes-do-curriculo"
    >
      <h2 id="titulo-avaliacoes-do-curriculo" className="text-texto text-base font-semibold">
        Avaliações previstas no currículo
      </h2>
      <p className="text-texto-suave text-sm">
        O que o currículo prevê, por disciplina. O que cada turma já aplicou fica na aba Avaliações
        da ficha da turma.
      </p>
      {aviso ? (
        <p role="status" className="text-atrasado-tinta text-sm">
          {aviso}
        </p>
      ) : null}
      {quadro && quadro.disciplinas.length === 0 ? (
        <p className="text-texto-suave text-sm">Este curso ainda não tem disciplinas com CH.</p>
      ) : null}
      {quadro?.disciplinas.map(({ disciplina, previsto, itens }) => (
        <details
          key={disciplina.id}
          className="border-borda rounded-ciaara border p-2"
          data-avaliacoes-disciplina={disciplina.cod}
        >
          <summary className="text-texto flex cursor-pointer flex-wrap items-baseline gap-x-3 text-sm">
            <span className="font-medium">
              {disciplina.cod} — {disciplina.nome}
            </span>
            <span className="text-texto-suave" data-avaliacoes="divisao">
              CH {previsto.ch} = {previsto.taAula} aula + {previsto.taAvaliacao} avaliação
            </span>
            <span className="text-texto-suave" data-avaliacoes="previstas">
              {itens.length === 1 ? "1 avaliação prevista" : `${itens.length} avaliações previstas`}
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            {previsto.avisos.length > 0 ? (
              <p
                role="status"
                className="text-atrasado-tinta text-xs font-medium"
                data-avaliacoes="avisos"
              >
                {previsto.avisos.join(" · ")}
              </p>
            ) : null}
            {itens.length === 0 ? (
              <p className="text-texto-suave text-xs">
                Nenhuma avaliação do currículo carregada para esta disciplina.
              </p>
            ) : (
              <ul className="flex flex-col gap-1" data-avaliacoes="itens">
                {itens.map((item) => (
                  <li
                    key={item.rotulo}
                    className="flex flex-wrap items-center gap-2"
                    data-avaliacoes-item={item.rotulo}
                  >
                    <span className="font-medium">
                      {item.natureza === "od"
                        ? `${item.rotulo} — avaliação contínua (OD)`
                        : item.rotulo}
                    </span>
                    {item.natureza === "od" ? null : (
                      <span className="text-texto-suave text-xs">
                        {item.tempo === null
                          ? "tempo de avaliação não definido"
                          : `${item.tempo} TA`}
                      </span>
                    )}
                    {item.origemDaUe ? (
                      <span className="text-texto-suave text-xs">{item.origemDaUe}</span>
                    ) : null}
                    {item.marca === "nao_consta_do_curriculo" ? (
                      <span
                        className="text-atrasado-tinta text-xs font-medium"
                        data-avaliacoes="arbitrado"
                      >
                        {MARCA_ARBITRADO}
                      </span>
                    ) : null}
                    {item.marca === "sugestao_a_confirmar" ? (
                      <span
                        className="text-atrasado-tinta text-xs font-medium"
                        data-avaliacoes="sugestao"
                      >
                        {MARCA_SUGESTAO}
                      </span>
                    ) : null}
                    {arbitrado && item.natureza !== "od" ? (
                      <DefinirTempoArbitrado
                        itemId={item.itemId}
                        turmaId=""
                        tempoDeCurriculo={item.tempoDeCurriculo}
                        sugestaoAConfirmar={item.marca === "sugestao_a_confirmar"}
                        unidades={item.semUe ? disciplina.unidades : []}
                        definir={arbitrado.definir}
                        confirmar={arbitrado.confirmar}
                        nomear={arbitrado.nomear}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      ))}
    </section>
  );
}

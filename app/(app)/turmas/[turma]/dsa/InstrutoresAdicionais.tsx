/**
 * Os **instrutores adicionais** da aula — RD-9 (Bloco 16, spec 031, `FR-006`).
 *
 * > *"selecionar 1 ou mais instrutores no lançamento; todos têm de ser HABILITADOS na disciplina (RD-1)."* — Bernardo
 * > Villas Boas, 30/10/2026
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Escolher e retirar é interação.
 * ⚠️ **O SELETOR É O CANÔNICO** (`SeletorInstrutor`, `RN-ANT-01`, *Risco: Alto*): cada escolha acrescenta um, e o
 *    seletor volta vazio para o próximo. A lista oferecida é a da AULA (os habilitados, RD-1) sem quem ministra e sem os
 *    já escolhidos (`adicionaisOferecidos`). Nenhum elemento de escolha nativo aqui — a guarda `SC-002` reprovaria.
 * ⚠️ **OS ESCOLHIDOS FICAM EM ANTIGUIDADE** (`ordenarPorAntiguidade`, o dono único da ordem) — e é nessa ordem que
 *    eles vão gravados e saem no papel, depois de quem ministra.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { NomeInstrutor } from "@/components/ciaara/nome-instrutor";
import { SeletorInstrutor } from "@/components/ciaara/seletor-instrutor";
import { ordenarPorAntiguidade, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import { adicionaisOferecidos } from "@/lib/dominio/dsa/instrutores-adicionais";
import { vazioDaListaDeInstrutores } from "@/lib/dominio/dsa/instrutores-da-aula";
import { nomeEmTexto, type InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

export function InstrutoresAdicionais({
  id,
  listaDaAula,
  quemMinistra,
  escolhidos,
  aoMudar,
  escala,
  podeLerInstrutores,
}: {
  readonly id: string;
  /** Os instrutores da aula — os habilitados na disciplina, ativos (RD-1). */
  readonly listaDaAula: readonly InstrutorParaExibir[];
  readonly quemMinistra: string;
  readonly escolhidos: readonly string[];
  readonly aoMudar: (ids: string[]) => void;
  readonly escala: EscalaDeAntiguidade;
  readonly podeLerInstrutores: boolean;
}) {
  const porId = new Map(listaDaAula.map((i) => [i.id, i] as const));
  /* Os escolhidos que a lista conhece, em antiguidade; um escolhido de fora da lista (inabilitado depois) segue no fim. */
  const conhecidos = ordenarPorAntiguidade(
    escolhidos.flatMap((e) => {
      const i = porId.get(e);
      return i ? [i] : [];
    }),
    escala,
  ).ordenados;
  const fora = escolhidos.filter((e) => !porId.has(e));
  const oferecidos = adicionaisOferecidos(listaDaAula, quemMinistra, escolhidos);

  function acrescentar(novo: string): void {
    if (novo === "" || escolhidos.includes(novo)) return;
    const juntos = ordenarPorAntiguidade(
      [...escolhidos, novo].flatMap((e) => {
        const i = porId.get(e);
        return i ? [i] : [];
      }),
      escala,
    ).ordenados.map((i) => i.id);
    aoMudar([...juntos, ...fora]);
  }

  return (
    <div className="flex flex-col gap-1" data-slot="instrutores-adicionais">
      <span className="text-texto text-sm font-medium" id={`${id}-rotulo`}>
        Instrutores adicionais (opcional)
      </span>
      {conhecidos.length + fora.length > 0 ? (
        <ul className="flex flex-wrap gap-1" aria-labelledby={`${id}-rotulo`}>
          {conhecidos.map((i) => (
            <li
              key={i.id}
              data-slot="instrutor-adicional"
              className="border-borda bg-superficie-2 flex items-center gap-1 rounded border py-0.5 pr-0.5 pl-2 text-xs"
            >
              <NomeInstrutor instrutor={i} />
              <BotaoDeIcone
                acao="retirar"
                rotulo={`Retirar ${nomeEmTexto(i)}`}
                variante="fantasma"
                onClick={() => aoMudar(escolhidos.filter((e) => e !== i.id))}
              />
            </li>
          ))}
          {fora.map((e) => (
            <li
              key={e}
              data-slot="instrutor-adicional"
              className="border-atrasado-borda bg-atrasado-fundo text-atrasado-tinta flex items-center gap-1 rounded border py-0.5 pr-0.5 pl-2 text-xs"
            >
              não habilitado nesta disciplina
              <BotaoDeIcone
                acao="retirar"
                rotulo="Retirar o instrutor não habilitado"
                variante="fantasma"
                onClick={() => aoMudar(escolhidos.filter((x) => x !== e))}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <SeletorInstrutor
        instrutores={oferecidos}
        escala={escala}
        valor=""
        aoMudar={acrescentar}
        rotulo="Acrescentar instrutor adicional"
        vazio={vazioDaListaDeInstrutores(podeLerInstrutores, "sem-outro-habilitado")}
      />
      <p className="text-texto-suave text-xs">
        Cada um conta os tempos inteiros na própria carga; a turma conta a aula uma vez.
      </p>
    </div>
  );
}

/**
 * O painel que junta a grade ao formulário (`RF-DSA-04`, `Q-7` · spec 013, PR 2).
 *
 * ⚠️ **FOLHA DE CLIENTE, DECLARADA.** Ele guarda **só** qual célula está escolhida — estado efêmero
 * de tela, que o guia de estado na URL manda deixar fora dela: a célula selecionada não é recorte
 * compartilhável, e pô-la no endereço faria um link abrir um formulário.
 *
 * ⚠️ **A GRADE CONTINUA RECEBENDO A `Semana` PRONTA.** Este painel não lê banco e não calcula
 * nada: a página montou a semana no servidor e passou por propriedade. O que ele acrescenta é o
 * clique.
 *
 * ⚠️ **AS DUAS AÇÕES CHEGAM POR PROPRIEDADE**, nunca por `import` de `@/lib/acoes/` — é a proibição
 * do Princípio XI, que as guardas de fronteira impõem.
 */
"use client";

import * as React from "react";

import { GradeDsa } from "@/components/ciaara/grade-dsa";
import { Button } from "@/components/ui/button";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import type { Semana } from "@/lib/dominio/dsa/grade";
import type { InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";

import {
  FormularioDeLancamento,
  type DisciplinaIsenta,
  type ResultadoDaAcao,
  type UnidadeOferecida,
} from "./FormularioDeLancamento";

export type ResultadoDoEstudoIndividual =
  | { readonly ok: true; readonly criados: number; readonly pulados: readonly string[] }
  | { readonly ok: false; readonly mensagem: string };

export type PainelDeLancamentoProps = {
  readonly semana: Semana;
  readonly turmaId: string;
  readonly cursoId: string;
  readonly salaDaTurma: string | null;
  readonly ano: number;
  readonly numeroDaSemana: number;
  readonly podeLancar: boolean;
  readonly unidades: readonly UnidadeOferecida[];
  readonly disciplinasIsentas: readonly DisciplinaIsenta[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  readonly tecnicas: readonly string[];
  readonly tiposDeAvaliacao: readonly string[];
  readonly subtipos: readonly { readonly valor: string; readonly categoria: string | null }[];
  readonly lancar: (entrada: unknown) => Promise<ResultadoDaAcao>;
  readonly lancarEstudoIndividual: (entrada: unknown) => Promise<ResultadoDoEstudoIndividual>;
};

export function PainelDeLancamento({
  semana,
  turmaId,
  cursoId,
  salaDaTurma,
  ano,
  numeroDaSemana,
  podeLancar,
  unidades,
  disciplinasIsentas,
  instrutores,
  escala,
  tecnicas,
  tiposDeAvaliacao,
  subtipos,
  lancar,
  lancarEstudoIndividual,
}: PainelDeLancamentoProps) {
  const [celula, definirCelula] = React.useState<{ dia: string; ta: number } | null>(null);
  const [respostaDoEi, definirRespostaDoEi] = React.useState<string | null>(null);
  const [lancandoEi, definirLancandoEi] = React.useState(false);

  async function lancarEi(): Promise<void> {
    definirRespostaDoEi(null);
    definirLancandoEi(true);
    const r = await lancarEstudoIndividual({ turmaId, ano, semana: numeroDaSemana });
    definirLancandoEi(false);
    if (!r.ok) {
      definirRespostaDoEi(r.mensagem);
      return;
    }
    /*
     * ⚠️ **OS PULADOS SÃO INFORMAÇÃO, NÃO SILÊNCIO.** Clicar de novo não cria nada — e sem dizer
     * isso a tela pareceria não ter feito nada. É a lição do `AvisoDaLista` da spec 011: a resposta
     * de toda ação é publicada, porque "não aconteceu nada" é o que uma falha invisível parece.
     */
    definirRespostaDoEi(
      r.criados === 0
        ? `Nenhum dia novo: os ${r.pulados.length} dias úteis desta semana já têm Estudo Individual, ou são feriado de dia inteiro.`
        : `Estudo Individual lançado em ${r.criados} dia(s).` +
            (r.pulados.length > 0
              ? ` ${r.pulados.length} pulado(s) — já tinham, ou são feriado.`
              : ""),
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {podeLancar ? (
        <div className="flex flex-wrap items-center gap-2">
          {/*
            ⚠️ `Q-7`: o Estudo Individual padrão da semana **em um clique**. Ele ocupa o slot
               seguinte ao último TA lançado de cada dia (`D-4`) e dura um TA (`D-11`).
          */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={lancandoEi}
            onClick={lancarEi}
            data-slot="lancar-estudo-individual"
          >
            {lancandoEi ? "Lançando…" : "Lançar o Estudo Individual da semana"}
          </Button>
          <span className="text-xs text-texto-suave">
            Clique numa célula livre da grade para lançar nela.
          </span>
        </div>
      ) : null}

      {respostaDoEi ? (
        <p role="status" className="text-sm text-texto" data-slot="resposta-do-estudo-individual">
          {respostaDoEi}
        </p>
      ) : null}

      <GradeDsa
        semana={semana}
        salaDaTurma={salaDaTurma}
        {...(podeLancar
          ? { aoEscolherCelula: (dia: string, ta: number) => definirCelula({ dia, ta }) }
          : {})}
      />

      {celula ? (
        <FormularioDeLancamento
          turmaId={turmaId}
          cursoId={cursoId}
          salaDaTurma={salaDaTurma}
          dia={celula.dia}
          taInicial={celula.ta}
          unidades={unidades}
          disciplinasIsentas={disciplinasIsentas}
          instrutores={instrutores}
          escala={escala}
          tecnicas={tecnicas}
          tiposDeAvaliacao={tiposDeAvaliacao}
          subtipos={subtipos}
          lancar={lancar}
          aoFechar={() => definirCelula(null)}
        />
      ) : null}
    </div>
  );
}

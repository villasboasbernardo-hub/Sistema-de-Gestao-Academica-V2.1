/**
 * A aba **Avaliações** do acompanhamento do DSA — folha de cliente (Bloco 16, spec 031, `FR-009`, D-16).
 *
 * ⚠️ **NO MESMO ESTILO DO PAINEL DAS DISCIPLINAS**: a tabela única (`TabelaDensa`, cujas colunas são funções — por isso
 *    folha de cliente), a situação como selo com a palavra (`RNF-USA-05`) e o corte dito na tela.
 * ⚠️ **ELE NÃO CALCULA NADA**: as linhas chegam prontas de `linhasDoAcompanhamentoDeAvaliacoes`
 *    (`lib/dominio/dsa/acompanhamento-de-avaliacoes.ts`), com a situação do quadro de avaliações da turma.
 */
"use client";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { TabelaDensa, type Coluna } from "@/components/ciaara/tabela-densa";
import { ROTULO_DA_SITUACAO, type SituacaoDaAvaliacao } from "@/lib/dominio/avaliacoes/situacao";
import type { LinhaDoAcompanhamentoDeAvaliacoes } from "@/lib/dominio/dsa/acompanhamento-de-avaliacoes";

/* Os tons da aba Avaliações da ficha da turma (`AvaliacoesDaTurma.tsx`) — a mesma situação, a mesma cor. */
const TOM: Record<
  SituacaoDaAvaliacao,
  "executado" | "planejado" | "atrasado" | "conflito" | "adiantado"
> = {
  concluida: "executado",
  em_andamento: "adiantado",
  pendente: "planejado",
  atrasada: "atrasado",
  sem_correspondencia: "conflito",
};

const semana = (n: number | null) => (n === null ? "—" : n);

export function AcompanhamentoDeAvaliacoes({
  linhas,
  rotuloDaSemana,
  aviso,
}: {
  readonly linhas: readonly LinhaDoAcompanhamentoDeAvaliacoes[];
  readonly rotuloDaSemana: string;
  /** A falha de leitura do quadro (`RN-DEG-01`): a tabela sai vazia, com o motivo. */
  readonly aviso: string | null;
}) {
  const colunas: readonly Coluna<LinhaDoAcompanhamentoDeAvaliacoes>[] = [
    {
      chave: "disciplina",
      titulo: "Disciplina",
      celula: (l) => (
        <span className="whitespace-normal" data-disciplina={l.disciplina}>
          <span className="text-texto font-medium">{l.disciplina}</span>{" "}
          <span className="text-texto-suave">{l.nomeDaDisciplina}</span>
        </span>
      ),
    },
    { chave: "avaliacao", titulo: "Avaliação", celula: (l) => l.avaliacao },
    {
      chave: "situacao",
      titulo: "Situação",
      celula: (l) =>
        l.situacao === null ? (
          "—"
        ) : (
          <span data-slot="situacao-da-avaliacao" data-situacao={l.situacao}>
            <BadgeStatus tom={TOM[l.situacao]} rotulo={ROTULO_DA_SITUACAO[l.situacao]} />
          </span>
        ),
    },
    {
      chave: "prevista",
      titulo: "Semana prevista",
      numerica: true,
      celula: (l) => semana(l.semanaPrevista),
    },
    {
      chave: "lancada",
      titulo: "Semana lançada",
      numerica: true,
      celula: (l) => semana(l.semanaLancada),
    },
    {
      chave: "aplicada",
      titulo: "Semana aplicada",
      numerica: true,
      celula: (l) => semana(l.semanaAplicada),
    },
    { chave: "ta", titulo: "TA", numerica: true, celula: (l) => (l.ta === null ? "—" : l.ta) },
  ];

  return (
    <section
      data-slot="acompanhamento-de-avaliacoes"
      aria-label="Situação das avaliações da turma"
      className="rounded-ciaara border-borda bg-superficie flex min-w-0 flex-col gap-3 border p-3"
    >
      <header className="flex flex-col">
        <h2 className="text-texto text-sm font-semibold">Situação das avaliações</h2>
        <p className="text-texto-suave text-xs">
          Até a semana de {rotuloDaSemana}. As semanas são as do curso: a prevista é a do fim
          previsto da disciplina; a aplicada, a lançada que já chegou.
        </p>
      </header>
      {aviso ? (
        <p role="status" className="text-atrasado-tinta text-sm">
          {aviso}
        </p>
      ) : null}
      <TabelaDensa
        linhas={linhas}
        colunas={colunas}
        chaveLinha={(l) => l.chave}
        rotulo="Avaliações da turma"
        motivoDoVazio="sem-dado"
      />
    </section>
  );
}

import type * as React from "react";
import { BadgeStatus } from "ciaara-11-ds";

type Tom = React.ComponentProps<typeof BadgeStatus>["tom"];

/** Os nove tons do domínio, cada um com o rótulo textual — a cor nunca vem sozinha. */
const NOVE: readonly (readonly [Tom, string])[] = [
  ["planejado", "Planejado"],
  ["executado", "Executado"],
  ["adiantado", "Adiantado"],
  ["atrasado", "Em atraso"],
  ["conflito", "Conflito"],
  ["conformidade", "Conforme"],
  ["nao-letivo", "Não letivo"],
  ["reserva", "Reserva"],
  ["inativo", "Inativo"],
];

export function NoveTons() {
  return (
    <div className="flex flex-wrap gap-2">
      {NOVE.map(([tom, rotulo]) => (
        <BadgeStatus key={tom} tom={tom} rotulo={rotulo} />
      ))}
    </div>
  );
}

/** O de-para de situação de turma é de quem chama: o emblema não conhece o banco. */
export function SituacaoDaTurma() {
  return (
    <div className="flex flex-wrap gap-2">
      <BadgeStatus tom="planejado" rotulo="Planejada" />
      <BadgeStatus tom="executado" rotulo="Ativa" />
      <BadgeStatus tom="conformidade" rotulo="Concluída" />
      <BadgeStatus tom="inativo" rotulo="Cancelada" />
    </div>
  );
}

/** A situação de cada disciplina no painel do DSA. */
export function SituacaoDaDisciplina() {
  return (
    <div className="flex flex-wrap gap-2">
      <BadgeStatus tom="planejado" rotulo="Aguardando início" />
      <BadgeStatus tom="executado" rotulo="Em andamento" />
      <BadgeStatus tom="conformidade" rotulo="Concluída" />
      <BadgeStatus tom="conflito" rotulo="Conflitou" />
    </div>
  );
}

const TURMAS = [
  {
    codigo: "C-Ap-HN 2026",
    curso: "Aperfeiçoamento de Hidrografia e Navegação",
    situacao: ["executado", "Ativa"] as const,
    progresso: "816/1.165 TA · 70%",
    emAtraso: false,
  },
  {
    codigo: "C-Ap-FR 2026",
    curso: "Aperfeiçoamento de Faroleiro",
    situacao: ["executado", "Ativa"] as const,
    progresso: "408/1.165 TA · 35%",
    emAtraso: true,
  },
  {
    codigo: "C-Esp-ALH 2026",
    curso: "Especial em Análise de Levantamentos Hidrográficos",
    situacao: ["conformidade", "Concluída"] as const,
    progresso: "312/312 TA · 100%",
    emAtraso: false,
  },
];

/** No panorama do Início: situação da turma e, ao lado do número, a tarja de atraso. */
export function NoPanoramaDeTurmas() {
  return (
    <ul className="flex max-w-2xl flex-col gap-2">
      {TURMAS.map((t) => (
        <li
          key={t.codigo}
          className="border-borda bg-superficie rounded-ciaara flex flex-wrap items-center justify-between gap-3 border p-3"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-texto text-sm font-medium">{t.codigo}</span>
            <span className="text-texto-suave text-xs">{t.curso}</span>
          </span>
          <span className="flex items-center gap-3">
            <BadgeStatus tom={t.situacao[0]} rotulo={t.situacao[1]} />
            <span className="text-texto text-sm tabular-nums">{t.progresso}</span>
            {t.emAtraso ? <BadgeStatus tom="atrasado" rotulo="em atraso" /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

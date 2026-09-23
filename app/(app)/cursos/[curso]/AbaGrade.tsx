/**
 * A aba "Grade" — a turma selecionada e a lista de turmas do curso (`FR-006.2`, `FR-006.3`,
 * `FR-028.1`, `FR-047`).
 *
 * ⚠️ **SEM PROGRESSO POR DISCIPLINA NESTA FATIA** — o `FR-009` foi **cortado** em 17/09/2026 pela
 * linha de corte do `FR-009.1`. O que entra aqui é a identificação da turma e a lista; o progresso
 * nasce com a fatia que o recebeu.
 *
 * ⚠️ **A SALA DE CADA TURMA APARECE NA LISTA** *(decisão de Bernardo Villas Boas, 23/09/2026)*. Ela é
 * o dado que se confere de relance — "onde essa turma vai acontecer" —, e até aqui só existia como
 * ausência, no aviso `sem_sala`. Turma sem sala mostra o traço, e o aviso continua contando.
 *
 * ⚠️ **CURSO SEM TURMA NÃO VIRA BECO** (`FR-006.3`): o botão de nova turma fica **fora** da lista, e
 * por isso continua alcançável quando a lista está vazia. Escondê-lo atrás da lista faria o único
 * caminho de saída desaparecer justo no estado em que ele é necessário.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o seletor de turma é folha.
 */
import type * as React from "react";

import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";
import { Button } from "@/components/ui/button";
import { avisosDaTurma, type TurmaParaAvisos } from "@/lib/dominio/avisos-da-turma";
import { enderecoDaNovaTurma, enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { SeletorDeTurmaNaUrl } from "./SeletorDeTurmaNaUrl";

export type TurmaDaGrade = TurmaParaAvisos & {
  readonly codigo: string;
  readonly rotulo: string | null;
  readonly ano: number;
};

const ROTULO_DO_STATUS: Readonly<Record<string, string>> = {
  planejada: "Planejada",
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const TOM_DO_STATUS: Readonly<
  Record<string, "planejado" | "executado" | "conformidade" | "inativo">
> = {
  planejada: "planejado",
  ativa: "executado",
  concluida: "conformidade",
  cancelada: "inativo",
};

const traco = (v: string | null) => (v === null || v.trim() === "" ? "—" : v);

/**
 * O rótulo de um campo e o cabeçalho de uma coluna — **os dois únicos usos de `--texto-tenue` aqui**.
 *
 * ⚠️ O token veste **rótulo e cabeçalho**, nunca valor (`FR-031`). Funilar os dois por estes dois
 * componentes deixa a regra num lugar só, em vez de num comentário repetido em cada `<span>`.
 */
function Rotulo({ children }: { readonly children: React.ReactNode }) {
  return <span className="text-texto-tenue">{children}</span>;
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 font-normal">
      {children}
    </th>
  );
}

/** A janela em uma linha. Ponta ausente vira traço — nunca uma data inventada. */
function janela(t: TurmaDaGrade): string {
  if (t.dataInicio === null && t.dataTermino === null) return "—";
  return `${traco(t.dataInicio)} a ${traco(t.dataTermino)}`;
}

export function AbaGrade({
  sigla,
  turmas,
  selecionada,
  hoje,
  avisoDaSelecao,
  podeCriarTurma,
  cursoAtivo,
  motivoDoVazio,
}: {
  readonly sigla: string;
  readonly turmas: readonly TurmaDaGrade[];
  readonly selecionada: string | null;
  readonly hoje: string;
  readonly avisoDaSelecao: string | null;
  readonly podeCriarTurma: boolean;
  readonly cursoAtivo: boolean;
  /** Qual dos três vazios do `FR-047` mostrar quando não há turma. */
  readonly motivoDoVazio: "nao-ha" | "nao-ve" | "ainda-nao-existe" | null;
}) {
  const turmaAtual = turmas.find((t) => t.codigo === selecionada) ?? null;

  const botaoDeNovaTurma =
    podeCriarTurma && cursoAtivo ? (
      <Button asChild size="sm">
        <Link href={enderecoDaNovaTurma(sigla)} data-slot="nova-turma">
          Nova turma
        </Link>
      </Button>
    ) : null;

  return (
    <div className="flex flex-col gap-4" data-slot="aba-grade">
      {avisoDaSelecao ? (
        <p role="status" className="text-atrasado-tinta text-sm" data-slot="aviso-da-selecao">
          {avisoDaSelecao}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        {turmas.length > 1 ? (
          <SeletorDeTurmaNaUrl
            turmas={turmas.map((t) => ({ id: t.codigo, rotulo: t.codigo }))}
            selecionada={selecionada}
          />
        ) : null}
        {botaoDeNovaTurma}
      </div>

      {turmaAtual ? (
        <section
          aria-label={`Turma ${turmaAtual.codigo}`}
          data-slot="turma-selecionada"
          data-turma={turmaAtual.codigo}
          className="border-borda bg-superficie-1 rounded-ciaara flex flex-wrap gap-x-6 gap-y-2 border p-3"
        >
          <p className="text-sm">
            <Rotulo>Situação:</Rotulo>{" "}
            <span className="text-texto">
              {ROTULO_DO_STATUS[turmaAtual.status] ?? turmaAtual.status}
            </span>
          </p>
          <p className="text-sm">
            <Rotulo>Janela:</Rotulo> <span className="text-texto">{janela(turmaAtual)}</span>
          </p>
          <p className="text-sm">
            <Rotulo>Sala:</Rotulo>{" "}
            <span className="text-texto" data-slot="sala-da-turma">
              {traco(turmaAtual.sala)}
            </span>
          </p>
          <p className="text-sm">
            <Rotulo>Efetivo:</Rotulo>{" "}
            <span className="text-texto">
              {turmaAtual.alunos === null ? "—" : String(turmaAtual.alunos)}
            </span>
          </p>
        </section>
      ) : null}

      {turmas.length === 0 ? (
        <EstadoVazio
          motivo={motivoDoVazio === "nao-ve" ? "sem-permissao" : "sem-dado"}
          titulo={
            motivoDoVazio === "nao-ve"
              ? "Você não alcança as turmas deste curso"
              : motivoDoVazio === "ainda-nao-existe"
                ? "Ainda não há turma no sistema"
                : "Este curso ainda não tem turma"
          }
          detalhe={
            motivoDoVazio === "nao-ve"
              ? "Existe turma aqui — o seu perfil não alcança."
              : "Crie a primeira turma pelo botão acima."
          }
        />
      ) : (
        <table
          className="w-full border-collapse text-sm"
          data-slot="turmas-do-curso"
          aria-label="Turmas do curso"
        >
          <thead>
            <tr className="border-borda border-b text-left">
              <Th>Turma</Th>
              <Th>Ano</Th>
              <Th>Situação</Th>
              <Th>Janela</Th>
              <Th>Sala</Th>
              <Th>Avisos</Th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((t) => {
              const avisos = avisosDaTurma(t, hoje);
              return (
                <tr key={t.codigo} className="border-borda border-b" data-linha-turma={t.codigo}>
                  <td className="py-1">
                    <Link
                      href={enderecoDaTurma(t.codigo)}
                      className="text-texto underline-offset-2 hover:underline"
                    >
                      {t.codigo}
                    </Link>
                  </td>
                  <td className="text-texto py-1">{t.ano}</td>
                  <td className="py-1">
                    <BadgeStatus
                      tom={TOM_DO_STATUS[t.status] ?? "planejado"}
                      rotulo={ROTULO_DO_STATUS[t.status] ?? t.status}
                    />
                  </td>
                  <td className="text-texto py-1">{janela(t)}</td>
                  <td className="text-texto py-1" data-slot="sala-na-lista">
                    {traco(t.sala)}
                  </td>
                  <td className="text-texto py-1" data-slot="contagem-de-avisos">
                    {avisos.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

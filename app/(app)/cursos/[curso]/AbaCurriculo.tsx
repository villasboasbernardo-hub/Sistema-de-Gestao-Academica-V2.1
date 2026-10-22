/**
 * A aba **Currículo** da página do curso — spec 021, Bloco 6, ajuste 2 da conferência do PR #82 (Bernardo Villas Boas,
 * 21/10/2026).
 *
 * > *"Nova aba "Currículo": lista o vigente, o novo (futuro) e os arquivados, com consulta ao conteúdo de cada um
 * > (disciplinas, avaliações, horários, atividades) só para leitura."*
 *
 * ⚠️ SÓ LEITURA, como a página inteira (ajuste 1). Criar e editar currículo mora em *Editar curso* (ajuste 3).
 * ⚠️ SEM MARCADOR DE CLIENTE: a consulta chega pronta da página, nos mesmos componentes das outras abas, sem ações.
 * ⚠️ O CURRÍCULO CONSULTADO VIVE NA URL (`?curriculo=N`); vazio, o vigente.
 */
import type * as React from "react";

import Link from "next/link";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDoCurriculo, enderecoDoCurriculoNoCurso } from "@/lib/navegacao/endereco-de-turma";

export type CurriculoNaLista = {
  readonly versao: number;
  readonly rotulo: string;
  readonly situacao: string;
  readonly vigenteDe: string;
  readonly descricao: string | null;
  readonly temPdf: boolean;
  /** Quantas turmas o seguem (as arquivadas também). */
  readonly turmas: number;
};

export function AbaCurriculo({
  sigla,
  lista,
  consultado,
  aviso,
  consulta,
}: {
  readonly sigla: string;
  readonly lista: readonly CurriculoNaLista[];
  /** O número do currículo consultado. */
  readonly consultado: number | null;
  /** O pedido da URL que não serviu. */
  readonly aviso: string | null;
  readonly consulta: {
    readonly disciplinas: React.ReactNode;
    readonly avaliacoes: React.ReactNode;
    readonly horarios: React.ReactNode;
    readonly atividades: React.ReactNode;
  } | null;
}) {
  const atual = lista.find((c) => c.versao === consultado) ?? null;

  return (
    <section
      aria-labelledby="titulo-curriculos"
      className="flex flex-col gap-4"
      data-slot="aba-curriculo"
    >
      <h2 id="titulo-curriculos" className="text-texto text-base font-semibold">
        Currículos do curso
      </h2>
      {aviso ? (
        <p
          role="status"
          className="text-atrasado-tinta text-sm"
          data-slot="aviso-da-escolha-do-curriculo"
        >
          {aviso}
        </p>
      ) : null}
      {lista.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-curriculo">
          Este curso ainda não tem currículo.
        </p>
      ) : (
        <table
          className="w-full border-collapse text-sm"
          data-slot="lista-de-curriculos"
          aria-label="Currículos do curso"
        >
          <thead>
            <tr className="border-borda border-b text-left">
              <Th>Currículo</Th>
              <Th>Situação</Th>
              <Th>Vale a partir de</Th>
              <Th>Turmas</Th>
              <Th>O que muda</Th>
              <Th>PDF</Th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr
                key={c.versao}
                className="border-borda border-b"
                data-curriculo={c.versao}
                aria-current={c.versao === consultado ? "true" : undefined}
              >
                <td className="py-1">
                  {c.versao === consultado ? (
                    <span className="text-texto font-semibold">{c.rotulo}</span>
                  ) : (
                    <Link
                      href={enderecoDoCurriculoNoCurso(sigla, c.versao)}
                      className="text-marca underline-offset-2 hover:underline"
                      data-slot="consultar-curriculo"
                    >
                      {c.rotulo}
                    </Link>
                  )}
                </td>
                <td className="text-texto py-1" data-slot="situacao-na-lista">
                  {c.situacao}
                </td>
                <td className="text-texto py-1">{dataParaLeitura(c.vigenteDe)}</td>
                <td className="text-texto py-1">{c.turmas}</td>
                <td className="text-texto py-1">{c.descricao ?? "—"}</td>
                <td className="py-1">
                  {c.temPdf ? (
                    <BotaoDeIcone
                      acao="baixar"
                      rotulo={`Baixar o PDF do Currículo ${c.versao}`}
                      variante="fantasma"
                      nativo
                      href={enderecoDoCurriculo(sigla, c.versao)}
                    />
                  ) : (
                    <span className="text-texto-suave">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {atual && consulta ? (
        <section
          aria-labelledby="titulo-consulta-do-curriculo"
          className="flex flex-col gap-5"
          data-slot="consulta-do-curriculo"
          data-curriculo={atual.versao}
        >
          <h2 id="titulo-consulta-do-curriculo" className="text-texto text-base font-semibold">
            {atual.rotulo} — {atual.situacao}
          </h2>
          <ParteDaConsulta titulo="Disciplinas" slot="consulta-disciplinas">
            {consulta.disciplinas}
          </ParteDaConsulta>
          <ParteDaConsulta titulo="Avaliações" slot="consulta-avaliacoes">
            {consulta.avaliacoes}
          </ParteDaConsulta>
          <ParteDaConsulta titulo="Horários" slot="consulta-horarios">
            {consulta.horarios}
          </ParteDaConsulta>
          <ParteDaConsulta titulo="Atividades" slot="consulta-atividades">
            {consulta.atividades}
          </ParteDaConsulta>
        </section>
      ) : null}
    </section>
  );
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 font-normal">
      {children}
    </th>
  );
}

function ParteDaConsulta({
  titulo,
  slot,
  children,
}: {
  readonly titulo: string;
  readonly slot: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      className="border-borda rounded-ciaara flex flex-col gap-3 border p-3"
      data-slot={slot}
    >
      <h3 className="text-texto text-sm font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

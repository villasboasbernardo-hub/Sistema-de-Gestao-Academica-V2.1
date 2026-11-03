/**
 * As **AEC previstas do currículo**, só para ler — Bloco 18 (spec 033), RA-2 e FR-002.3: *"A página do curso, aba
 * Atividades, mostra as AEC previstas do currículo selecionado, só para ler."* — componente de servidor.
 *
 * ⚠️ **SÓ O PREVISTO, SEM AÇÃO** (RC-8; ajuste 1 da conferência do PR #82): incluir, editar e desativar moram em *Editar
 *    curso → Currículo → Atividades e limites*. O cumprido é da turma (RA-3), nunca do curso.
 * ⚠️ **AS TRÊS RESPOSTAS SÃO DIFERENTES** (gotcha 4): não leu (alerta), não há (o currículo não prevê) e a lista.
 * ⚠️ SEM MARCADOR DE CLIENTE.
 */
import type * as React from "react";

import {
  ROTULO_DA_OBRIGATORIA,
  textoDaDisciplina,
  textoDaFonte,
  textoDosTaPrevistos,
} from "@/lib/dominio/atividades/aec-previstas-no-curriculo";

import type { AecPrevistasLidas } from "./consulta-de-aec-previstas";

export function AecPrevistasDoCurso({ previstas }: { readonly previstas: AecPrevistasLidas }) {
  return (
    <section
      aria-labelledby="titulo-aec-previstas-do-curso"
      className="flex flex-col gap-2"
      data-slot="aec-previstas-do-curso"
    >
      <h3 id="titulo-aec-previstas-do-curso" className="text-texto text-sm font-semibold">
        AEC previstas no currículo
      </h3>
      <p className="text-texto-suave text-xs">
        As palestras e visitas que o currículo nomeia. Cada turma as herda como «a cumprir»; o
        cumprimento se acompanha na ficha da turma.
      </p>
      {previstas.erro ? (
        <p
          role="alert"
          className="text-atrasado-tinta text-sm"
          data-slot="aec-previstas-sem-leitura"
        >
          {previstas.erro}
        </p>
      ) : previstas.lista.length === 0 ? (
        <p className="text-texto-suave text-sm" data-slot="sem-aec-previstas">
          O currículo não prevê AEC por nome.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-sm"
            aria-label="AEC previstas no currículo"
            data-slot="tabela-de-aec-previstas"
          >
            <thead>
              <tr className="border-borda border-b text-left">
                <Th>Nome</Th>
                <Th>Tipo</Th>
                <Th>TA previstos</Th>
                <Th>Disciplina</Th>
                <Th>Obrigatória</Th>
                <Th>Fonte</Th>
              </tr>
            </thead>
            <tbody>
              {previstas.lista.map((p) => (
                <tr
                  key={p.id}
                  className="border-borda border-b align-top"
                  data-slot="aec-prevista-do-curso"
                  data-codigo={p.codigo}
                >
                  <td className="text-texto py-1 pr-3">
                    {p.nome}
                    {p.observacao ? (
                      <span className="text-texto-suave block text-xs">{p.observacao}</span>
                    ) : null}
                  </td>
                  <td className="text-texto py-1 pr-3">{p.tipoRotulo}</td>
                  <td className="text-texto py-1 pr-3">{textoDosTaPrevistos(p.taPrevistos)}</td>
                  <td className="text-texto py-1 pr-3">
                    {p.disciplina ? textoDaDisciplina(p.disciplina) : "—"}
                  </td>
                  <td className="text-texto py-1 pr-3">
                    {ROTULO_DA_OBRIGATORIA[p.obrigatoria ? "sim" : "nao"]}
                  </td>
                  <td className="text-texto-suave py-1">
                    {textoDaFonte(p.fonteArquivo, p.fontePagina) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children }: { readonly children: React.ReactNode }) {
  return (
    // veste: o cabeçalho da coluna; as células abaixo são dado
    <th scope="col" className="text-texto-tenue py-1 pr-3 font-normal">
      {children}
    </th>
  );
}

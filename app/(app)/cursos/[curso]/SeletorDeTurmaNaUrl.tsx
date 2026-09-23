/**
 * O seletor de turma da aba "Grade", ligado ao `?turma=` — folha de cliente (`FR-006.2`, `FR-036`).
 *
 * ⚠️ **ELE ESCREVE O `codigo` DA TURMA, NUNCA O `uuid`** (`FR-037`), e a escrita **empilha**
 * histórico: trocar de turma é ir a outro lugar.
 *
 * ⚠️ **A CODIFICAÇÃO É DA FUNÇÃO ÚNICA DO ENDEREÇO.** `useParametro` serializa o valor; o código tem
 * espaços (`C-Ap-FR T2 2026`), e é por isso que ele nunca é montado à mão em tela nenhuma.
 *
 * ⚠️ **ESTE ARQUIVO É DA FATIA (a); a Fase 17 o generaliza** para "o mesmo seletor em qualquer
 * tela". Enquanto isso, ele é o único lugar que liga `SeletorTurma` ao parâmetro.
 */
"use client";

import { SeletorTurma, type TurmaParaExibir } from "@/components/ciaara/seletor-turma";
import { useParametro } from "@/lib/navegacao/usar-parametro";

export function SeletorDeTurmaNaUrl({
  turmas,
  selecionada,
}: {
  readonly turmas: readonly TurmaParaExibir[];
  readonly selecionada: string | null;
}) {
  const [, definirTurma] = useParametro("/cursos/[curso]", "turma");

  return (
    <SeletorTurma
      turmas={turmas}
      {...(selecionada === null ? {} : { valor: selecionada })}
      aoMudar={(codigo) => void definirTurma(codigo)}
      rotulo="Turma"
    />
  );
}

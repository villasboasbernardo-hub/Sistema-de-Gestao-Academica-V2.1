/**
 * *Registrar nova vigência* e *Corrigir esta vigência* **em diálogo** (RT-3 do Bloco 10, spec 025, D-34) — **folha de
 * cliente**.
 *
 * > *"Edição só em janela ou página própria."* — Bernardo Villas Boas, 24/10/2026 (`docs/correcoes/padroes-de-tela.md`)
 *
 * ⚠️ **ATÉ 24/10/2026 OS DOIS FORMULÁRIOS ABRIAM NUM `<details>` NO MEIO DA LISTA** (spec 009, `FR-013.1`): a edição
 *    empurrava o histórico para baixo. O formulário é o mesmo (`FormularioDeVigencia`); o diálogo fecha quando ele grava.
 * ⚠️ **ELE EXISTE PORQUE O DIÁLOGO RECEBE O FORMULÁRIO POR FUNÇÃO** (`fechar`), e a seção do regime é de servidor:
 *    função não atravessa a fronteira servidor/cliente.
 */
"use client";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoDeFormulario } from "@/components/ciaara/dialogo-de-formulario";
import type { ValoresDaVigencia } from "@/lib/dominio/vigencia-de-regime";

import { FormularioDeVigencia } from "./FormularioDeVigencia";

export function DialogoDeVigencia({
  modo,
  cursoId,
  sigla,
  vigenciaId,
  inicial,
  periodo,
}: {
  readonly modo: "registrar" | "corrigir";
  readonly cursoId: string;
  readonly sigla: string;
  readonly vigenciaId?: string;
  readonly inicial?: ValoresDaVigencia;
  /** Na correção, o período da vigência, para o título (*"de 01/01/2026 até —"*). */
  readonly periodo?: string;
}) {
  const registrar = modo === "registrar";
  return (
    <DialogoDeFormulario
      largo
      slot="dialogo-de-vigencia"
      titulo={registrar ? "Registrar nova vigência" : `Corrigir a vigência ${periodo ?? ""}`.trim()}
      descricao={
        registrar
          ? "A nova vigência passa a valer na data escolhida; a anterior se encerra na véspera."
          : "Só se corrige a vigência que nenhuma turma já usou com lançamento."
      }
      gatilho={
        <BotaoDeIcone
          acao={registrar ? "novo" : "editar"}
          rotulo={registrar ? "Registrar nova vigência" : "Corrigir esta vigência"}
          variante={registrar ? "contorno" : "fantasma"}
          data-slot={registrar ? "registrar-nova-vigencia" : "corrigir-vigencia"}
        />
      }
    >
      {(fechar) => (
        <FormularioDeVigencia
          modo={modo}
          cursoId={cursoId}
          sigla={sigla}
          {...(vigenciaId === undefined ? {} : { vigenciaId })}
          {...(inicial === undefined ? {} : { inicial })}
          aoGravar={fechar}
        />
      )}
    </DialogoDeFormulario>
  );
}

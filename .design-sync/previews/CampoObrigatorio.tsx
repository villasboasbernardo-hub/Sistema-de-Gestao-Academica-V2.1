import type * as React from "react";
import {
  CampoObrigatorio,
  Input,
  propsDoControle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ciaara-11-ds";

/*
 * O rótulo marca a obrigatoriedade com o asterisco (escondido do leitor de tela) e um texto de apoio;
 * o controle recebe `required` e `aria-required` por `propsDoControle`. Quem valida é o Zod, no
 * servidor — o rótulo só informa.
 */
export function ObrigatorioEOpcional() {
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="previa-sigla" rotulo="Sigla" obrigatorio />
        <Input {...propsDoControle("previa-sigla", true)} placeholder="C-Ap-HN" />
      </div>
      <div className="flex flex-col gap-1">
        <CampoObrigatorio para="previa-proposito" rotulo="Propósito" />
        <Input {...propsDoControle("previa-proposito", false)} placeholder="opcional" />
      </div>
    </div>
  );
}

function Campo({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

/** O formulário da turma: obrigatórios e opcionais lado a lado, com campo de texto e seleção. */
export function FormularioDeTurma() {
  return (
    <form className="grid max-w-2xl grid-cols-2 gap-3" onSubmit={(e) => e.preventDefault()}>
      <Campo>
        <CampoObrigatorio para="previa-turma-ano" rotulo="Ano letivo" obrigatorio />
        <Input
          {...propsDoControle("previa-turma-ano", true)}
          inputMode="numeric"
          defaultValue="2026"
        />
      </Campo>
      <Campo>
        <CampoObrigatorio para="previa-turma-situacao" rotulo="Situação" obrigatorio />
        <Select defaultValue="ativa" required>
          <SelectTrigger {...propsDoControle("previa-turma-situacao", true)} className="w-full">
            <SelectValue placeholder="Escolha a situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planejada">Planejada</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </Campo>
      <Campo>
        <CampoObrigatorio para="previa-turma-modalidade" rotulo="Modalidade" obrigatorio />
        <Select required>
          <SelectTrigger {...propsDoControle("previa-turma-modalidade", true)} className="w-full">
            <SelectValue placeholder="Escolha a modalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="presencial">Presencial</SelectItem>
            <SelectItem value="semipresencial">Semipresencial</SelectItem>
            <SelectItem value="ead">EAD</SelectItem>
          </SelectContent>
        </Select>
      </Campo>
      <Campo>
        <CampoObrigatorio para="previa-turma-rotulo" rotulo="Rótulo (T1, T2…)" />
        <Input
          {...propsDoControle("previa-turma-rotulo", false)}
          placeholder="deixe vazio na turma única"
        />
      </Campo>
      <Campo>
        <CampoObrigatorio para="previa-turma-sala" rotulo="Sala" />
        <Select defaultValue="sala-01">
          <SelectTrigger {...propsDoControle("previa-turma-sala", false)} className="w-full">
            <SelectValue placeholder="Sem sala" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sala-01">Sala 01 — sala de aula</SelectItem>
            <SelectItem value="lab-02">Laboratório 02 — laboratório</SelectItem>
          </SelectContent>
        </Select>
      </Campo>
      <Campo>
        <CampoObrigatorio para="previa-turma-efetivo" rotulo="Efetivo" />
        <Input
          {...propsDoControle("previa-turma-efetivo", false)}
          inputMode="numeric"
          defaultValue="16"
        />
      </Campo>
    </form>
  );
}

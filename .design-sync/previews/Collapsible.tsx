import * as React from "react";
import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
} from "ciaara-11-ds";
import { BookOpenIcon, ChevronDownIcon, PencilIcon } from "lucide-react";

function Campo({
  id,
  rotulo,
  valor,
}: {
  readonly id: string;
  readonly rotulo: string;
  readonly valor: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} defaultValue={valor} />
    </div>
  );
}

function EdicaoDaTurma({ abertoDeInicio }: { readonly abertoDeInicio: boolean }) {
  const [aberto, definirAberto] = React.useState(abertoDeInicio);
  return (
    <Collapsible
      open={aberto}
      onOpenChange={definirAberto}
      className="flex max-w-3xl flex-col gap-3"
    >
      <h2 className="text-texto text-base font-semibold">
        <CollapsibleTrigger className="border-borda bg-superficie hover:border-borda-forte focus-visible:ring-marca rounded-ciaara flex w-full items-center justify-between gap-2 border px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none">
          <span className="flex items-center gap-2">
            <PencilIcon aria-hidden="true" className="size-4 shrink-0" />
            Editar turma
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            data-aberto={aberto ? "true" : "false"}
            className="text-texto-suave size-4 shrink-0 transition-transform motion-reduce:transition-none data-[aberto=true]:rotate-180"
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent>
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="turma-ano" rotulo="Ano letivo" valor="2026" />
            <Campo id="turma-rotulo" rotulo="Rótulo (T1, T2…)" valor="T1" />
            <Campo id="turma-sala" rotulo="Sala" valor="Sala 01" />
            <Campo id="turma-efetivo" rotulo="Efetivo" valor="16" />
          </div>
          <div>
            <Button type="submit" size="sm">
              Salvar alterações
            </Button>
          </div>
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Recolhido() {
  return <EdicaoDaTurma abertoDeInicio={false} />;
}

export function Aberto() {
  return <EdicaoDaTurma abertoDeInicio />;
}

const UNIDADES = [
  { codigo: "V-1", nome: "Cartas e publicações náuticas", tempos: 16 },
  { codigo: "V-2", nome: "Navegação costeira", tempos: 30 },
  { codigo: "V-3", nome: "Navegação estimada", tempos: 22 },
  { codigo: "V-4", nome: "Navegação eletrônica", tempos: 24 },
] as const;

export function ListaDeUnidades() {
  const [aberto, definirAberto] = React.useState(true);
  return (
    <Collapsible
      open={aberto}
      onOpenChange={definirAberto}
      className="border-borda rounded-ciaara bg-superficie max-w-xl border"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-3">
          <span className="flex items-center gap-2">
            <BookOpenIcon aria-hidden="true" className="size-4" />V — Navegação
            <span className="text-texto-suave font-normal">· 4 unidades de ensino</span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            data-aberto={aberto ? "true" : "false"}
            className="text-texto-suave size-4 shrink-0 transition-transform motion-reduce:transition-none data-[aberto=true]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="border-borda border-t text-sm">
          {UNIDADES.map((ue) => (
            <li
              key={ue.codigo}
              className="border-borda flex items-center justify-between gap-3 border-b px-3 py-2 last:border-0"
            >
              <span className="text-texto">
                <span className="font-medium">{ue.codigo}</span> · {ue.nome}
              </span>
              <span className="text-texto-suave tabular-nums">{ue.tempos} TA</span>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

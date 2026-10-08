import { Button } from "ciaara-11-ds";
import { Plus, Printer } from "lucide-react";

export function Variantes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Gravar lançamento</Button>
      <Button variant="secondary">Cancelar</Button>
      <Button variant="outline">Imprimir</Button>
      <Button variant="destructive">Excluir</Button>
      <Button variant="ghost">Limpar</Button>
      <Button variant="link">Abrir a ficha da turma</Button>
    </div>
  );
}

export function Tamanhos() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">Compacta</Button>
      <Button size="sm">Pequeno</Button>
      <Button>Padrão</Button>
      <Button size="lg">Grande</Button>
    </div>
  );
}

export function ComIcone() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <Plus aria-hidden="true" />
        Nova turma
      </Button>
      <Button variant="outline" size="sm">
        <Printer aria-hidden="true" />
        Imprimir o DSA
      </Button>
      <Button variant="outline" size="icon" aria-label="Imprimir">
        <Printer aria-hidden="true" />
      </Button>
    </div>
  );
}

export function Desabilitado() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled>Gravando…</Button>
      <Button variant="outline" disabled>
        Imprimir
      </Button>
    </div>
  );
}

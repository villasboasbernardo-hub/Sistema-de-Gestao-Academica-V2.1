import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ciaara-11-ds";
import { CalendarDays } from "lucide-react";

export function ComCampo() {
  return (
    <div className="flex max-w-sm flex-col gap-1">
      <Label htmlFor="rotulo-nome-disciplina">Nome da disciplina</Label>
      <Input id="rotulo-nome-disciplina" defaultValue="Hidrografia" />
    </div>
  );
}

export function ComIcone() {
  return (
    <div className="flex max-w-xs flex-col gap-1">
      <Label htmlFor="rotulo-termino-previsto">
        <CalendarDays aria-hidden="true" className="text-texto-suave size-4" />
        Término previsto
      </Label>
      <Input id="rotulo-termino-previsto" type="date" lang="pt-BR" defaultValue="2026-11-11" />
    </div>
  );
}

export function ComSelecao() {
  return (
    <div className="flex max-w-xs flex-col gap-1">
      <Label htmlFor="rotulo-modalidade">Modalidade</Label>
      <Select defaultValue="presencial">
        <SelectTrigger id="rotulo-modalidade" className="w-full">
          <SelectValue placeholder="Escolha a modalidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="presencial">Presencial</SelectItem>
          <SelectItem value="ead">EAD</SelectItem>
          <SelectItem value="semipresencial">Semipresencial</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function Desabilitado() {
  return (
    <div className="group flex max-w-sm flex-col gap-1" data-disabled="true">
      <Label htmlFor="rotulo-codigo-gerado">Código</Label>
      <Input id="rotulo-codigo-gerado" defaultValue="DIS-000123" disabled />
    </div>
  );
}

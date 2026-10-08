import { Badge } from "ciaara-11-ds";
import { CalendarDaysIcon, CheckIcon, TriangleAlertIcon } from "lucide-react";

export function Variantes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Presencial</Badge>
      <Badge variant="secondary">DSA Nº 18</Badge>
      <Badge variant="destructive">2 conflitos</Badge>
      <Badge variant="outline">EAD</Badge>
      <Badge variant="ghost">Em breve</Badge>
      <Badge variant="link" asChild>
        <a href="#liq">Ver a LIQ</a>
      </Badge>
    </div>
  );
}

export function ComIcone() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>
        <CheckIcon aria-hidden="true" />
        Lançado
      </Badge>
      <Badge variant="secondary">
        <CalendarDaysIcon aria-hidden="true" />
        Semana 34
      </Badge>
      <Badge variant="destructive">
        <TriangleAlertIcon aria-hidden="true" />
        Conflito de instrutor
      </Badge>
      <Badge variant="outline">16 alunos</Badge>
    </div>
  );
}

export function NoCabecalho() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-texto text-lg font-semibold">C-Ap-HN 2026</h3>
        <Badge>Presencial</Badge>
        <Badge variant="outline">T1</Badge>
        <Badge variant="secondary">16 alunos</Badge>
      </div>
      <p className="text-texto-suave text-sm">
        Curso de Aperfeiçoamento em Hidrografia e Navegação · 02/03/2026 a 11/12/2026 · Sala 01
      </p>
    </div>
  );
}

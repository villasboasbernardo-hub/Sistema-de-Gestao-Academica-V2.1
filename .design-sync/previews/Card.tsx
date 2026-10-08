import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "ciaara-11-ds";

export function Simples() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>C-Ap-HN 2026</CardTitle>
        <CardDescription>Curso de Aperfeiçoamento em Hidrografia e Navegação</CardDescription>
      </CardHeader>
      <CardContent className="text-texto-suave text-sm">
        Turma ativa de 02/03/2026 a 11/12/2026 · 16 alunos · Sala 01
      </CardContent>
    </Card>
  );
}

export function ComAcaoERodape() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Detalhe Semanal de Aula</CardTitle>
        <CardDescription>Semana 34 · 17/08/2026 a 22/08/2026</CardDescription>
        <CardAction>
          <Badge variant="secondary">DSA Nº 18</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="text-sm">
        42 tempos de aula lançados, 5 de Estudo Individual e nenhum conflito de instrutor.
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Abrir a grade</Button>
        <Button size="sm" variant="outline">
          Imprimir
        </Button>
      </CardFooter>
    </Card>
  );
}

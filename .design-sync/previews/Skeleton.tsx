import { Card, CardContent, CardHeader, Skeleton } from "ciaara-11-ds";

export function Texto() {
  return (
    <div role="status" aria-busy="true" className="flex max-w-md flex-col gap-2">
      <span className="sr-only">Carregando a descrição do curso.</span>
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

export function Cartao() {
  return (
    <Card role="status" aria-busy="true" className="max-w-sm">
      <span className="sr-only">Carregando o panorama da turma.</span>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  );
}

export function Indicadores() {
  return (
    <div role="status" aria-busy="true" className="grid grid-cols-2 gap-3">
      <span className="sr-only">Carregando os indicadores.</span>
      {["turmas", "carga", "executadas", "atrasados"].map((chave) => (
        <Card key={chave} className="gap-0 py-4">
          <CardContent className="flex flex-col gap-2 px-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Formulario() {
  return (
    <div role="status" aria-busy="true" className="flex max-w-sm flex-col gap-4">
      <span className="sr-only">Carregando o formulário da disciplina.</span>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );
}

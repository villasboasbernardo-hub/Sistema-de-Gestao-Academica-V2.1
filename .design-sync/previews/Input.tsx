import { Button, Input, Label } from "ciaara-11-ds";

export function Padrao() {
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-nome-disciplina">Nome da disciplina</Label>
        <Input id="input-nome-disciplina" defaultValue="Navegação Astronômica" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-cod-disciplina">Código da disciplina</Label>
        <Input id="input-cod-disciplina" placeholder="Ex.: VII" />
      </div>
    </div>
  );
}

export function Tipos() {
  return (
    <div className="grid max-w-md grid-cols-2 gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-ch-prevista">CH prevista (TA)</Label>
        <Input id="input-ch-prevista" type="number" min={1} defaultValue={92} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-inicio-previsto">Início previsto</Label>
        <Input id="input-inicio-previsto" type="date" lang="pt-BR" defaultValue="2026-03-03" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-procurar">Procurar disciplina</Label>
        <Input id="input-procurar" type="search" placeholder="Nome ou código" />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="input-senha-nova">Senha nova</Label>
        <Input
          id="input-senha-nova"
          type="password"
          autoComplete="new-password"
          defaultValue="senha-temporaria"
        />
      </div>
    </div>
  );
}

export function EmFormulario() {
  return (
    <form className="flex max-w-md items-end gap-3" onSubmit={(e) => e.preventDefault()}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label htmlFor="input-nome-exibicao">Como você quer ser chamado</Label>
        <Input id="input-nome-exibicao" defaultValue="CC (T) Andrade" required />
      </div>
      <Button type="submit">Gravar</Button>
    </form>
  );
}

export function Desabilitado() {
  return (
    <div className="flex max-w-sm flex-col gap-1">
      <Label htmlFor="input-codigo-gerado">Código</Label>
      <Input id="input-codigo-gerado" defaultValue="DIS-000123" disabled />
      <p className="text-texto-suave text-xs">Gerado pelo sistema — não se edita.</p>
    </div>
  );
}

export function ComErro() {
  return (
    <div className="flex max-w-sm flex-col gap-1">
      <Label htmlFor="input-cod-recusado">Código da disciplina</Label>
      <Input
        id="input-cod-recusado"
        defaultValue="V"
        aria-invalid="true"
        aria-describedby="input-cod-recusado-motivo"
      />
      <p id="input-cod-recusado-motivo" role="alert" className="text-conflito-tinta text-xs">
        Já existe uma disciplina ativa com o código V neste curso.
      </p>
    </div>
  );
}

import * as React from "react";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger } from "ciaara-11-ds";
import { Check, ChevronDown, Info, Pencil } from "lucide-react";

export function Aberto() {
  return (
    <div className="flex justify-center p-8">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Info aria-hidden="true" />
            Carga horária de Navegação
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-texto text-sm font-semibold">V · Navegação</p>
              <p className="text-texto-suave text-xs">C-Ap-HN 2026 · semana de 05/10/2026</p>
            </div>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-texto-suave">CH prevista</dt>
                <dd className="text-texto tabular-nums">92 TA</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-texto-suave">CH acumulada</dt>
                <dd className="text-texto tabular-nums">65 TA</dd>
              </div>
              <div className="border-borda flex justify-between gap-4 border-t pt-1">
                <dt className="text-texto font-medium">Resta</dt>
                <dd className="text-texto font-medium tabular-nums">27 TA</dd>
              </div>
            </dl>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ComFormulario() {
  return (
    <div className="flex justify-center p-8">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil aria-hidden="true" />
            Editar lançamento
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1">
              <p className="text-texto text-sm font-semibold">V · Navegação</p>
              <p className="text-texto-suave text-xs">TER 06/10/2026 · 1º e 2º tempos</p>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="painel-quantos-tempos">Quantos tempos</Label>
                <Input
                  id="painel-quantos-tempos"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={2}
                  className="w-24 tabular-nums"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Label htmlFor="painel-local">Local</Label>
                <Input id="painel-local" defaultValue="Sala 01" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="painel-topico">Tópico</Label>
              <Input id="painel-topico" defaultValue="Marcação de pontos na carta" />
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" className="ml-auto">
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Gravar
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const SITUACOES = [
  { valor: "aguardando_inicio", rotulo: "Aguardando início", contagem: 7 },
  { valor: "em_andamento", rotulo: "Em andamento", contagem: 12 },
  { valor: "concluida", rotulo: "Concluída", contagem: 4 },
  { valor: "conflitou", rotulo: "Conflitou", contagem: 1 },
] as const;

export function EscolhaMultipla() {
  const [escolhidas, definirEscolhidas] = React.useState<readonly string[]>([
    "em_andamento",
    "conflitou",
  ]);
  const alternar = (valor: string) =>
    definirEscolhidas((atual) =>
      atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor],
    );

  return (
    <div className="flex justify-center p-8">
      <div className="flex flex-col gap-1">
        <span className="text-texto text-sm leading-none font-medium">Situação da disciplina</span>
        <Popover defaultOpen>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-56 justify-between">
              <span>
                {escolhidas.length === 0 ? "Todas" : `${escolhidas.length} selecionada(s)`}
              </span>
              <ChevronDown aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1">
            <ul className="flex flex-col">
              {SITUACOES.map((o) => {
                const marcada = escolhidas.includes(o.valor);
                return (
                  <li key={o.valor}>
                    <button
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => alternar(o.valor)}
                      className={
                        marcada
                          ? /*cls*/ "hover:bg-accent bg-accent text-accent-foreground flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm font-medium"
                          : /*cls*/ "hover:bg-accent text-texto flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                      }
                    >
                      <span className="flex items-center gap-2">
                        {marcada ? (
                          <Check aria-hidden="true" className="size-4" />
                        ) : (
                          <span aria-hidden="true" className="size-4" />
                        )}
                        {o.rotulo}
                      </span>
                      <span className="text-texto-suave text-2xs tabular-nums">{o.contagem}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

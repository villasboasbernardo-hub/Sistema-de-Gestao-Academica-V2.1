/**
 * Filtro avançado — genérico, recolhível, com contagem por opção (`RF-DS-02`, `FR-007`).
 *
 * ⚠️ ELE NÃO CONHECE INSTRUTOR, TURMA, DISCIPLINA NEM CURSO, e essa ausência é o teste de que a
 * fatia entregou vocabulário e não uma tela disfarçada de componente. Se para atender a spec 006
 * for preciso escrever a palavra "instrutor" aqui dentro, o componente está errado.
 *
 * ⚠️ A FILTRAGEM CRUZADA APARECE NA CONTAGEM, e quem a recalcula é quem chama. Cada filtro opera
 * sobre o resultado do anterior, então a contagem de uma opção muda conforme as outras escolhas.
 * Se o componente recalculasse, ele teria de conhecer o dado — e conheceria instrutor.
 *
 * ⚠️ ELE NÃO SABE ONDE O ESTADO MORA. Recebe e devolve por propriedade; levá-lo para a URL é da
 * fatia (c), e é premissa desta spec que ele não saiba disso.
 *
 * ⚠️ COM MARCADOR DE CLIENTE: recolher, abrir painel e digitar são comportamento de navegador.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { ChevronDownIcon, FilterIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type OpcaoDeFiltro = {
  readonly valor: string;
  readonly rotulo: string;
  /** Quantos registros restam nesta opção, JÁ considerando os outros filtros. Vem pronta. */
  readonly contagem?: number;
};

export type TipoDeCampo = "escolha" | "escolha-multipla" | "texto" | "intervalo";

export type CampoDeFiltro = {
  readonly chave: string;
  readonly rotulo: string;
  readonly tipo: TipoDeCampo;
  readonly opcoes?: readonly OpcaoDeFiltro[];
};

/** Cada chave guarda os valores escolhidos. Intervalo guarda dois: início e fim. */
export type EstadoDeFiltro = Readonly<Record<string, readonly string[]>>;

export type FiltroAvancadoProps = {
  readonly campos: readonly CampoDeFiltro[];
  readonly estado: EstadoDeFiltro;
  readonly aoMudar: (proximo: EstadoDeFiltro) => void;
  readonly titulo?: string;
  readonly className?: string;
};

/** Quantos campos têm alguma escolha — o número que aparece ao lado do rótulo recolhido. */
function contarAtivos(estado: EstadoDeFiltro): number {
  return Object.values(estado).filter((v) => v.some((x) => x !== "")).length;
}

export function FiltroAvancado({
  campos,
  estado,
  aoMudar,
  titulo = "Filtros",
  className,
}: FiltroAvancadoProps) {
  const [aberto, definirAberto] = React.useState(true);
  const ativos = contarAtivos(estado);

  const trocar = (chave: string, valores: readonly string[]) =>
    aoMudar({ ...estado, [chave]: valores });

  return (
    <Collapsible
      open={aberto}
      onOpenChange={definirAberto}
      data-slot="filtro-avancado"
      className={cn("border-borda rounded-ciaara bg-superficie border", className)}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-3">
          <span className="flex items-center gap-2">
            <FilterIcon aria-hidden="true" className="size-4" />
            {titulo}
            {ativos > 0 ? (
              <span className="bg-marca-suave text-texto rounded-ciaara-sm px-1.5 text-2xs font-medium tabular-nums">
                {ativos}
              </span>
            ) : null}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 transition-transform", aberto && "rotate-180")}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {campos.map((campo) => (
            <CampoDoFiltro
              key={campo.chave}
              campo={campo}
              valores={estado[campo.chave] ?? []}
              aoMudar={(v) => trocar(campo.chave, v)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CampoDoFiltro({
  campo,
  valores,
  aoMudar,
}: {
  readonly campo: CampoDeFiltro;
  readonly valores: readonly string[];
  readonly aoMudar: (valores: readonly string[]) => void;
}) {
  const id = `filtro-${campo.chave}`;
  const opcoes = campo.opcoes ?? [];

  if (campo.tipo === "texto") {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{campo.rotulo}</Label>
        <Input
          id={id}
          value={valores[0] ?? ""}
          onChange={(e) => aoMudar(e.target.value ? [e.target.value] : [])}
        />
      </div>
    );
  }

  if (campo.tipo === "intervalo") {
    return (
      <fieldset className="flex flex-col gap-1">
        <legend className="text-texto text-sm leading-none font-medium">{campo.rotulo}</legend>
        <div className="flex items-center gap-2">
          <Input
            aria-label={`${campo.rotulo} — início`}
            value={valores[0] ?? ""}
            onChange={(e) => aoMudar([e.target.value, valores[1] ?? ""])}
          />
          {/* veste: o separador entre início e fim do intervalo — texto estático (FR-031) */}
          <span className="text-texto-tenue text-xs">até</span>
          <Input
            aria-label={`${campo.rotulo} — fim`}
            value={valores[1] ?? ""}
            onChange={(e) => aoMudar([valores[0] ?? "", e.target.value])}
          />
        </div>
      </fieldset>
    );
  }

  if (campo.tipo === "escolha") {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={id}>{campo.rotulo}</Label>
        <Select value={valores[0] ?? ""} onValueChange={(v) => aoMudar(v ? [v] : [])}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {rotuloComContagem(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // escolha-múltipla: painel flutuante com as opções e a contagem de cada uma.
  const escolhidas = new Set(valores);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-texto text-sm leading-none font-medium">{campo.rotulo}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between">
            <span>{escolhidas.size === 0 ? "Todos" : `${escolhidas.size} selecionado(s)`}</span>
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="max-h-72 overflow-y-auto p-1">
          <ul className="flex flex-col">
            {opcoes.map((o) => {
              const marcada = escolhidas.has(o.valor);
              return (
                <li key={o.valor}>
                  <button
                    type="button"
                    aria-pressed={marcada}
                    onClick={() =>
                      aoMudar(
                        marcada ? valores.filter((v) => v !== o.valor) : [...valores, o.valor],
                      )
                    }
                    className={cn(
                      "hover:bg-accent flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      marcada && "bg-accent text-accent-foreground font-medium",
                    )}
                  >
                    <span>{o.rotulo}</span>
                    {o.contagem === undefined ? null : (
                      /* ⚠️ `--texto-suave`, NÃO `--texto-tenue`: a contagem é dado, e o `FR-031`
                         reserva o tenue para o que é estático — rótulo, dica, unidade, traço de
                         campo. Dado vestido de dica é dado que alguém deixa de ler. */
                      <span className="text-texto-suave text-2xs tabular-nums">{o.contagem}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * O rótulo com a contagem ao lado — **exibida, nunca recalculada** (`FR-007`).
 *
 * ⚠️ EXPORTADA PARA O TESTE, e é ele que prova a fronteira: entregue uma contagem qualquer, o
 * componente mostra aquela. Se um dia ele passar a contar, este teste reprova.
 */
export function rotuloComContagem(opcao: OpcaoDeFiltro): string {
  return opcao.contagem === undefined ? opcao.rotulo : `${opcao.rotulo} (${opcao.contagem})`;
}

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "ciaara-11-ds";
import { CalendarDays, ChevronLeft, ChevronRight, Info, Printer } from "lucide-react";

export function Aberto() {
  return (
    <div className="flex justify-center py-12">
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Imprimir o DSA">
            <Printer aria-hidden="true" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Imprimir o DSA desta semana</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function EmSigla() {
  return (
    <div className="flex justify-center py-12">
      <div className="border-borda bg-superficie rounded-ciaara text-texto flex items-center gap-6 border px-4 py-2 text-sm">
        <span>
          CHD <strong className="tabular-nums">1.040</strong>
        </span>
        <Tooltip defaultOpen>
          <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex items-center gap-1">
              AEC <strong className="tabular-nums">62</strong>
              <Info aria-hidden="true" className="text-texto-suave size-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            Atividades Extraclasse — palestras, visitas técnicas e viagens. Teto de 10% da soma das
            CHD: é alerta, não impedimento.
          </TooltipContent>
        </Tooltip>
        <span>
          TAD <strong className="tabular-nums">40</strong>
        </span>
        <span>
          TR <strong className="tabular-nums">63</strong>
        </span>
      </div>
    </div>
  );
}

const BARRA_DA_SEMANA = [
  { lado: "left", rotulo: "Semana anterior", Icone: ChevronLeft },
  { lado: "bottom", rotulo: "Voltar para a semana atual", Icone: CalendarDays },
  { lado: "top", rotulo: "Imprimir o DSA", Icone: Printer },
  { lado: "right", rotulo: "Próxima semana", Icone: ChevronRight },
] as const;

export function Posicoes() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex w-96 items-center justify-between">
        {BARRA_DA_SEMANA.map(({ lado, rotulo, Icone }) => (
          <Tooltip key={lado} open>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label={rotulo}>
                <Icone aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side={lado}>{rotulo}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

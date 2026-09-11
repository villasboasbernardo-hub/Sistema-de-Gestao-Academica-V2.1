/**
 * Rótulo de campo com marca de obrigatoriedade (`IND-01`, `FR-014`, `FR-032`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. É um rótulo associado a um controle — nada acontece nele.
 *
 * ⚠️ A MARCA DE OBRIGATÓRIO NÃO É SÓ A COR DO ASTERISCO. O estado vai no atributo que o leitor de
 * tela lê — `aria-required` no controle, pelo `propsDoControle` — senão a obrigatoriedade existe
 * só para quem enxerga. O asterisco tem `aria-hidden` e um texto de apoio junto, porque "asterisco"
 * lido em voz alta não quer dizer nada.
 *
 * ⚠️ ELE NÃO VALIDA. Quem valida é o Zod, na primeira linha da Server Action — e é lá que a regra
 * precisa estar, porque uma Server Action é endpoint HTTP de fato.
 */
import { cn } from "cn";

import { Label } from "@/components/ui/label";

export type CampoObrigatorioProps = {
  /** O `id` do controle que este rótulo descreve. */
  readonly para: string;
  readonly rotulo: string;
  readonly obrigatorio?: boolean;
  readonly className?: string;
};

export function CampoObrigatorio({
  para,
  rotulo,
  obrigatorio = false,
  className,
}: CampoObrigatorioProps) {
  return (
    <Label data-slot="campo-obrigatorio" htmlFor={para} className={cn("gap-1", className)}>
      {rotulo}
      {obrigatorio ? (
        <>
          <span aria-hidden="true" className="text-conflito-tinta">
            *
          </span>
          <span className="sr-only">(obrigatório)</span>
        </>
      ) : null}
    </Label>
  );
}

/**
 * Os atributos que o CONTROLE precisa receber para que a obrigatoriedade exista de verdade.
 *
 * ⚠️ ELA É FUNÇÃO, E NÃO UM COMPONENTE QUE EMBRULHA O CAMPO, porque o controle pode ser campo de
 * texto, seleção ou área de texto — e embrulhar os três produziria três invólucros divergindo.
 */
export function propsDoControle(id: string, obrigatorio: boolean) {
  return { id, required: obrigatorio, "aria-required": obrigatorio } as const;
}

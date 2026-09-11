/**
 * Emblema de status — os nove tons do domínio (`RF-DS-02`, `FR-005`, `FR-025`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. Não há interação: é texto com fundo.
 *
 * ⚠️ O RÓTULO NÃO É OPCIONAL, E ISSO ESTÁ NO TIPO. Um emblema que comunica só por cor é invisível
 * para quem não as distingue e some na impressão em preto e branco. Tornar o rótulo obrigatório no
 * tipo é a forma de o `FR-025` não depender de ninguém lembrar.
 *
 * ⚠️ ELE NÃO TRADUZ VALOR DE BANCO PARA TOM. O de-para é de quem chama — um emblema que soubesse
 * que `status = 'A'` significa "ativo" seria um emblema que conhece o schema.
 *
 * ⚠️ O MAPA DE TONS É `Record<Tom, string>` DE PROPÓSITO: um status novo em `STATUS` passa a
 * faltar aqui e **quebra a compilação**, em vez de sair sem cor e sem ninguém notar.
 */
import { cn } from "cn";

import type { Tom } from "@/lib/design/vocabulario";

const TONS: Record<Tom, string> = {
  planejado: "bg-planejado-fundo text-planejado-tinta border-planejado-borda",
  executado: "bg-executado-fundo text-executado-tinta border-executado-borda",
  adiantado: "bg-adiantado-fundo text-adiantado-tinta border-adiantado-borda",
  atrasado: "bg-atrasado-fundo text-atrasado-tinta border-atrasado-borda",
  conflito: "bg-conflito-fundo text-conflito-tinta border-conflito-borda",
  conformidade: "bg-conformidade-fundo text-conformidade-tinta border-conformidade-borda",
  "nao-letivo": "bg-nao-letivo-fundo text-nao-letivo-tinta border-nao-letivo-borda",
  reserva: "bg-reserva-fundo text-reserva-tinta border-reserva-borda",
  inativo: "bg-inativo-fundo text-inativo-tinta border-inativo-borda",
};

export type BadgeStatusProps = {
  readonly tom: Tom;
  /** ⚠️ OBRIGATÓRIO. É o `FR-025` expresso no tipo, não na convenção. */
  readonly rotulo: string;
  readonly className?: string;
};

export function BadgeStatus({ tom, rotulo, className }: BadgeStatusProps) {
  return (
    <span
      data-slot="badge-status"
      data-tom={tom}
      className={cn(
        "rounded-ciaara-sm inline-flex w-fit shrink-0 items-center border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONS[tom],
        className,
      )}
    >
      {rotulo}
    </span>
  );
}

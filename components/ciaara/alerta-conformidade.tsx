/**
 * Alerta de conformidade normativa (`RNF-USA-04`, `RN-DEG-02`, `FR-008`, `FR-026`).
 *
 * > **Regra 6 do contrato do projeto:** *regra normativa vira alerta, nunca bloqueio.*
 *
 * ⚠️ ELE APARECE AO LADO DA AÇÃO, NUNCA NO LUGAR DELA. Não desabilita botão, não impede salvamento,
 * não interrompe fluxo. Transformar os tetos AEC 10%, TAD 5% e TR 10% em impedimento **mudaria a
 * regra de negócio** — é a mesma razão pela qual eles nunca viram `CHECK` no banco.
 *
 * ⚠️ "SEMPRE VISÍVEL" TEM DEFINIÇÃO OPERACIONAL, e ela custou uma pesquisa: **durante toda a
 * permanência na tela, no topo da região do módulo, sem depender de rolagem e sem poder ser
 * dispensado**. As outras duas leituras produziriam outros componentes — "durante a sessão" exigiria
 * estado sobrevivendo à navegação, que é da fatia (c); "até rolar além" falharia a palavra
 * *sempre*. É o `CHK008`, aberto desde a fatia (a), e fecha aqui.
 *
 * ⚠️ SEM BOTÃO DE DISPENSAR, E É DELIBERADO. Um alerta que a pessoa fecha e esquece é bloqueio
 * nenhum e alerta nenhum.
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, e é consequência da definição acima: fixar posição é folha de estilo.
 * É o que mantém este componente fora do pacote enviado ao navegador, como o documento 23 §3.1 já
 * previa ao marcá-lo com *não*.
 *
 * ⚠️ SALIÊNCIA ESTÁTICA — faixa, ícone e rótulo —, e **nunca piscar** (`FR-026`). Substitui o
 * `.mat-piscar` da v2.0: WCAG 2.2.2 e 2.3.1, e porque a piscada perde eficácia quando muitas linhas
 * piscam ao mesmo tempo.
 *
 * ⚠️ ELE NÃO AVALIA NORMA NENHUMA. Quem avalia teto é função pura (`RN-EVT-01`); aqui chega pronto.
 */
import { cn } from "cn";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";

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

export type AlertaConformidadeProps = {
  readonly tom: Tom;
  readonly titulo: string;
  readonly avisos: readonly string[];
  readonly className?: string;
};

export function AlertaConformidade({ tom, titulo, avisos, className }: AlertaConformidadeProps) {
  if (avisos.length === 0) return null;

  const Icone = tom === "conflito" || tom === "atrasado" ? TriangleAlertIcon : InfoIcon;

  return (
    <div
      data-slot="alerta-conformidade"
      data-tom={tom}
      /*
       * ⚠️ `role="status"` E NÃO `role="alert"`: `alert` interrompe o leitor de tela no meio do que
       * ele estiver dizendo. Um aviso normativo é para ser sabido, não para tomar a vez — e o
       * `FR-030` item b pede exatamente isso, anunciar **sem roubar o foco**.
       */
      role="status"
      aria-live="polite"
      className={cn(
        // ⚠️ `sticky top-0` é o "sempre visível" inteiro: ele acompanha a rolagem da região, e não
        // precisa de uma linha de JavaScript para isso.
        "rounded-ciaara sticky top-0 z-10 flex items-start gap-2 border px-3 py-2 text-sm",
        TONS[tom],
        className,
      )}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        {/* ⚠️ O RÓTULO TEXTUAL ACOMPANHA O ÍCONE E A COR (`FR-025`, `FR-026`). Nenhuma das três
            sozinha comunica o aviso. */}
        <p className="font-medium">{titulo}</p>
        <ul className="flex flex-col gap-0.5">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

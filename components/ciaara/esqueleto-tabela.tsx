/**
 * Silhueta da tabela que está chegando (`RNF-PERF-06`, `FR-014`, `FR-029`).
 *
 * ⚠️ SEM MARCADOR DE CLIENTE. Ele não mede tempo nem decide quando aparecer — quem decide é o
 * `<Suspense>` de quem chama.
 *
 * ⚠️ A SILHUETA TEM O FORMATO DO CONTEÚDO REAL. Um esqueleto de proporção diferente é um salto de
 * layout disfarçado de carregamento: a tela "conserta" sozinha quando o dado chega, e quem estava
 * lendo perde a linha.
 *
 * ⚠️ SEM PULSAÇÃO PARA QUEM PEDIU MENOS MOVIMENTO (`FR-029`). A exclusão está no primitivo de
 * silhueta, por `motion-reduce`, e não só na camada base: reduzir a duração da animação a 0,01ms
 * deixaria um retângulo piscando uma vez em vez de parar.
 */
import { cn } from "cn";

import { Skeleton } from "@/components/ui/skeleton";

export type EsqueletoTabelaProps = {
  readonly linhas?: number;
  readonly colunas?: number;
  readonly className?: string;
};

export function EsqueletoTabela({ linhas = 8, colunas = 4, className }: EsqueletoTabelaProps) {
  return (
    <div
      data-slot="esqueleto-tabela"
      // ⚠️ `role="status"` com texto para leitor de tela: sem isto o carregamento é invisível para
      // quem não vê a tela, e a espera vira silêncio (`FR-030`, item b).
      role="status"
      aria-busy="true"
      className={cn("flex flex-col gap-2", className)}
    >
      <span className="sr-only">Carregando os dados da tabela.</span>
      <div className="flex gap-2">
        {Array.from({ length: colunas }, (_, c) => (
          <Skeleton key={`cabecalho-${c}`} className="h-5 flex-1" />
        ))}
      </div>
      {Array.from({ length: linhas }, (_, l) => (
        <div key={`linha-${l}`} className="flex gap-2">
          {Array.from({ length: colunas }, (_, c) => (
            <Skeleton
              key={`celula-${l}-${c}`}
              className="h-[var(--altura-linha-compacta)] flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

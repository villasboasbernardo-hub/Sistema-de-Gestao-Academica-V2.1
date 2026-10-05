/**
 * Barra de progresso — o quanto de uma carga já foi executado (`FR-023` da spec 012, `RNF-USA-03`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Ela não interage: recebe o número e desenha. Um `"use client"` aqui
 * mandaria para o navegador um componente que só pinta uma faixa.
 *
 * ⚠️ **ELA NASCEU PORQUE A ALTERNATIVA ERA A SEGUNDA CÓPIA.** Medido em 04/10/2026: não havia
 * `role="progressbar"` em lugar nenhum do repositório — o progresso aparecia como **texto** em
 * `/inicio` (`{percentual}%`). A ficha da turma precisava da barra, e o Início vai querer a mesma;
 * escrevê-la inline nas duas telas é o caminho do botão de limpar filtros, que nasceu solto numa tela
 * e só virou componente na segunda que precisou dele.
 *
 * ⚠️ **O NÚMERO ESTÁ NA MARCAÇÃO, E NÃO SÓ NA LARGURA** — `role="progressbar"` com `aria-valuenow`,
 * `aria-valuemin` e `aria-valuemax`. Uma faixa colorida sem isso não existe para quem usa leitor de
 * tela, e é o `FR-025` da fatia (b) aplicado a progresso: **nunca comunicar só pela cor**. Quem chama
 * escreve o número ao lado, em texto.
 *
 * ⚠️ **`valor` NULO É AUSÊNCIA, E ELA NÃO DESENHA NADA.** Carga prevista zero — há **dois** cursos por
 * competências na base real — não dá percentual, e uma barra vazia afirmaria *"0% executado"*, que é
 * uma afirmação sobre a turma. Quem chama diz a frase (`RN-DEG-01`).
 *
 * ⚠️ **ACIMA DE 100% A FAIXA PARA EM 100, E O NÚMERO NÃO.** Turma que executou mais do que o previsto
 * existe, e é caso medido: a faixa não transborda a caixa, e o rótulo de quem chama continua dizendo
 * 120%. Recortar o número seria esconder o excesso.
 *
 * ⚠️ **SÓ TOKENS DO `@theme`** — `components/ciaara/` não define cor literal, e a regra de cor é
 * bloqueante no ESLint.
 */
import { cn } from "cn";

export type TomDoProgresso = "executado" | "atrasado";

export function BarraDeProgresso({
  valor,
  rotuloAcessivel,
  tom = "executado",
  className,
}: {
  /** O percentual executado, ou `null` quando ele não existe. */
  readonly valor: number | null;
  /** O que a barra representa — ela não tem rótulo visível próprio. */
  readonly rotuloAcessivel: string;
  readonly tom?: TomDoProgresso;
  readonly className?: string;
}) {
  if (valor === null) return null;

  const faixa = Math.max(0, Math.min(100, valor));

  return (
    <div
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotuloAcessivel}
      data-slot="barra-de-progresso"
      data-tom={tom}
      /* veste: o trilho da barra — fundo de superfície, nunca dado */
      className={cn(
        "bg-superficie-2 border-borda h-2 w-full overflow-hidden rounded-full border",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full",
          tom === "atrasado" ? "bg-atrasado-tinta" : "bg-executado-tinta",
        )}
        style={{ width: `${faixa}%` }}
      />
    </div>
  );
}

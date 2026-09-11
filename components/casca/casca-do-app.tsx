/**
 * A casca das telas autenticadas (`RF-MOD-01`, `FR-016`, `FR-019`, `FR-021`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE, E ESSA É A PROPRIEDADE MAIS CARA DESTE ARQUIVO.** Ele envolve toda
 * tela do sistema: um `"use client"` aqui mandaria o catálogo inteiro para o pacote do navegador, e
 * o erro **não aparece na checagem de tipos** — aparece no build, que é por que o build faz parte da
 * verificação local. O único cliente da casca é o abre-e-fecha do menu, em folha própria.
 *
 * ⚠️ **A CASCA ENQUADRA.** Não busca dado de negócio, não decide regra, não escolhe cor. Usuário e
 * permissões chegam prontos do layout.
 *
 * ⚠️ **O ATALHO PARA O CONTEÚDO É A PRIMEIRA PARADA DE TABULAÇÃO** (`FR-021`). Sem ele, quem navega
 * por teclado atravessa o menu inteiro **a cada tela** — é o mesmo problema dos 2.400 pressionamentos
 * que a tabela densa resolveu na fatia (b), noutro lugar. Ele fica invisível até receber o foco, e
 * aparecer no foco é o que o torna um atalho e não um enfeite.
 *
 * ⚠️ **`tabIndex={-1}` NO CONTEÚDO É O DESTINO DE FOCO**, e é o que faz o atalho ter para onde ir:
 * um alvo que não aceita foco recebe a âncora e deixa o foco onde estava.
 *
 * ⚠️ **E O MESMO ALVO SERVE À TROCA DE ROTA.** Medido em 11/09/2026: sem o auxiliar de foco, navegar
 * pelo menu deixava `document.activeElement` na entrada clicada — a tela toda mudava e o foco não.
 */
import { CabecalhoDoApp } from "@/components/casca/cabecalho-do-app";
import { FocoAoTrocarDeRota } from "@/components/casca/foco-ao-trocar-de-rota";
import { NavegacaoLateral } from "@/components/casca/navegacao-lateral";

export const ID_DO_CONTEUDO = "conteudo";

export function CascaDoApp({
  nome,
  perfil,
  caminho,
  children,
}: {
  readonly nome: string;
  readonly perfil: string;
  readonly caminho: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div data-slot="casca-do-app" className="flex min-h-dvh flex-col">
      <a
        href={`#${ID_DO_CONTEUDO}`}
        className="bg-marca text-marca-contraste rounded-ciaara-sm focus-visible:ring-marca sr-only px-3 py-2 text-sm focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus-visible:ring-2"
      >
        Pular para o conteúdo
      </a>

      <FocoAoTrocarDeRota alvo={ID_DO_CONTEUDO} />

      <CabecalhoDoApp nome={nome} perfil={perfil} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <NavegacaoLateral caminho={caminho} />
        <main id={ID_DO_CONTEUDO} tabIndex={-1} className="flex-1 p-4 focus-visible:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

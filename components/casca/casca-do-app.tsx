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
  email,
  perfil,
  caminho,
  lateralFixada,
  fotoUrl,
  aoSair,
  children,
}: {
  readonly nome: string;
  readonly email: string;
  readonly perfil: string;
  readonly caminho: string;
  /**
   * A lateral está fixada expandida? **Chega pronta do layout**, que a leu do cookie.
   *
   * ⚠️ É o que faz a primeira pintura já sair certa. A casca não lê cookie — ela enquadra.
   */
  readonly lateralFixada: boolean;
  readonly fotoUrl: string | null;
  /** A Server Action que encerra a sessão — **chega pronta do layout**. A casca não a
   *  importa: `@/lib/acoes/` é proibido em componente, e a proibição está certa. */
  readonly aoSair: () => Promise<void>;
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

      <CabecalhoDoApp nome={nome} email={email} perfil={perfil} fotoUrl={fotoUrl} aoSair={aoSair} />

      <div className="flex flex-1 flex-col lg:flex-row">
        <NavegacaoLateral caminho={caminho} fixada={lateralFixada} />
        {/*
          ⚠️ **`min-w-0` NO `<main>` É O QUE IMPEDE A PÁGINA DE ROLAR LATERALMENTE** (`RNF-COMP-01`),
             e a falta dele foi medida em 05/10/2026, na grade do DSA: um item de flex **não encolhe
             abaixo do próprio min-content** sem isto (`min-width: auto` é o padrão), então uma tela
             larga empurrava o `<main>` para **1267 px** dentro de uma linha de 1224 — e a página
             inteira ganhava rolagem horizontal, arrastando o cabeçalho e o menu com ela.
          ⚠️ **O sintoma aparecia só na suíte inteira**, porque depende de quanto conteúdo cai nas
             células: passava sozinho e reprovava em paralelo, que é o modo de falha que mais parece
             azar e não é. Quem rola é o contêiner de cada tela larga — a grade tem
             `overflow-x-auto` própria —, e `min-w-0` aqui é o que dá a ela essa chance.
        */}
        <main
          id={ID_DO_CONTEUDO}
          tabIndex={-1}
          className="min-w-0 flex-1 p-4 focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

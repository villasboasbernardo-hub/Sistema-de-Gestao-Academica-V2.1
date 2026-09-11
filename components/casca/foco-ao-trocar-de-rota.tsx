/**
 * Leva o foco ao conteúdo quando a rota muda (`FR-021`).
 *
 * ⚠️ **ELE EXISTE PORQUE O FOCO FICAVA PRESO NO LINK CLICADO — medido em 11/09/2026.** Depois de
 * navegar do menu para outra tela, `document.activeElement` continuava sendo a entrada do menu: a
 * tela inteira trocava e quem usa leitor de tela continuava ouvindo a navegação, tendo de procurar
 * a cada vez onde o conteúdo novo começou.
 *
 * ⚠️ **É O SEGUNDO MARCADOR DE CLIENTE DA CASCA, e o contrato previa um.** A adição é declarada, não
 * silenciosa: mover foco é comportamento de navegador e não existe no servidor. Ele é folha, não
 * renderiza nada, e não importa componente algum — o custo de pacote é o próprio arquivo.
 *
 * ⚠️ **A PRIMEIRA RENDERIZAÇÃO NÃO MOVE FOCO**, de propósito. Roubar o foco de quem acabou de abrir
 * a página é o defeito oposto: a pessoa perde o lugar antes de ter escolhido um.
 */
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export function FocoAoTrocarDeRota({ alvo }: { readonly alvo: string }) {
  const caminho = usePathname();
  const primeiraVez = React.useRef(true);

  React.useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    document.getElementById(alvo)?.focus();
  }, [caminho, alvo]);

  return null;
}

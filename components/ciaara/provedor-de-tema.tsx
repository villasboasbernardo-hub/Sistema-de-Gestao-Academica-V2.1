"use client";

/**
 * Provedor de tema (`FR-006` a `FR-008`, `FR-010`, `RNF-USA-05`).
 *
 * ⚠️ ESTE ARQUIVO EXISTE SÓ PARA ISOLAR O `"use client"`. O provedor precisa de estado de cliente;
 * o `app/layout.tsx` NÃO pode tê-lo. O marcador contamina toda a subárvore de importação, e um
 * deles no layout raiz mandaria o catálogo inteiro de telas para o pacote do navegador — defeito
 * que o `tsc` NÃO acusa, só o build. É o achado nº 1 do Épico 0.
 *
 * ⚠️ `disableTransitionOnChange` é o `FR-010`: zero transição durante a troca. Sem ele, a página
 * inteira anima de uma paleta para a outra, e o efeito é de arrastão, não de troca.
 */
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

export function ProvedorDeTema({ children }: { readonly children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="ciaara-tema"
    >
      {children}
    </ThemeProvider>
  );
}

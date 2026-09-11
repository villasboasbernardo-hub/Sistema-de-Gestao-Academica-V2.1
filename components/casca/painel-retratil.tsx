/**
 * O abre-e-fecha do menu em tela estreita — **o único marcador de cliente da casca** (`FR-019`).
 *
 * ⚠️ ELE EXISTE PARA SER PEQUENO. O marcador contamina toda a subárvore de importação: um deles na
 * casca manda **todas as telas** do sistema para o pacote do navegador. Separar o botão do conteúdo
 * mantém a navegação inteira no servidor, e o erro que isto evita **não aparece na checagem de
 * tipos** — aparece no tamanho do pacote, e só quem for olhar vai ver.
 *
 * ⚠️ E O QUE ELE GUARDA É EFÊMERO, de propósito: o painel estar aberto não pertence a link nenhum.
 * Mandá-lo para a barra de endereço seria o erro oposto ao que esta fatia corrige.
 *
 * ⚠️ ACIMA DO PONTO DE QUEBRA O BOTÃO NÃO EXISTE E O PAINEL ESTÁ SEMPRE ABERTO — o estado não tem
 * efeito. É por isso que ele pode começar fechado sem esconder a navegação de ninguém.
 */
"use client";

import * as React from "react";
import { cn } from "cn";
import { MenuIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PainelRetratil({
  idDoPainel,
  children,
}: {
  readonly idDoPainel: string;
  readonly children: React.ReactNode;
}) {
  const [aberto, definirAberto] = React.useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="lg:hidden"
        aria-expanded={aberto}
        aria-controls={idDoPainel}
        onClick={() => definirAberto((x) => !x)}
      >
        {/* veste: o ícone acompanha o rótulo, nunca o substitui (FR-031 da fatia b) */}
        {aberto ? (
          <XIcon aria-hidden="true" className="size-4" />
        ) : (
          <MenuIcon aria-hidden="true" className="size-4" />
        )}
        Menu
      </Button>

      <div id={idDoPainel} className={cn("lg:block", aberto ? "block" : "hidden")}>
        {children}
      </div>
    </>
  );
}

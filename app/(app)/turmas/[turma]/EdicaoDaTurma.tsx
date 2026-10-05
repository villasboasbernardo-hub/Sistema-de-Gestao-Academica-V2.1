/**
 * O formulário de edição da turma, **recolhido atrás de um botão** (`FR-035` da spec 012).
 *
 * *(decisão de Bernardo Villas Boas, 05/10/2026, na conferência: a ficha abre para LER — cabeçalho,
 * indicadores, andamento e disciplinas —, e o formulário fica atrás de "Editar turma".)*
 *
 * ⚠️ **ELE EXISTE PORQUE O `Collapsible` É FOLHA DE CLIENTE E A FICHA NÃO PODE SER.**
 * `components/ui/collapsible.tsx` leva `"use client"`, e importá-lo em `page.tsx` poria o marcador na
 * **página**, contaminando a subárvore inteira — o cabeçalho da ficha declara, desde a fatia (a) do
 * Épico 5, que *"só o formulário é folha"*. Este arquivo recebe o formulário por `children`, que é o
 * mesmo desenho de `components/casca/painel-retratil.tsx` com a lista do menu. ⚠️ **E o erro de
 * fronteira não apareceria no `tsc`** — ele aparece no `next build` (gotcha 1).
 *
 * ⚠️ **O CONTEÚDO É DESMONTADO QUANDO FECHADO, e a consequência está declarada:** o `Collapsible` do
 * Radix não monta o que está fechado, então os campos **deixam de existir** (não só de estar
 * visíveis) e o que alguém digitou sem gravar **se perde** ao fechar. Isso é aceitável porque o painel
 * só fecha por **clique de quem está editando**, e não por nada que a tela decida sozinha. ⚠️ A
 * alternativa — `forceMount` com o conteúdo escondido — deixaria oito campos focáveis dentro de uma
 * caixa invisível, que é pior para quem usa teclado e leitor de tela.
 *
 * ⚠️ **A MENSAGEM DE RECUSA DA GRAVAÇÃO VIVE DENTRO DO FORMULÁRIO**, e por isso ela desaparece se o
 * painel for fechado. É o mesmo risco que a spec 011 pagou duas vezes (*"a mensagem morria com a
 * linha"*) — aqui ele é aceito com a razão escrita: fechar é um ato deliberado de quem acabou de ler
 * o erro, e o aviso de recusa não é informação que a tela precise lembrar depois disso.
 */
"use client";

import * as React from "react";
import { ChevronDownIcon, PencilIcon } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function EdicaoDaTurma({ children }: { readonly children: React.ReactNode }) {
  const [aberto, definirAberto] = React.useState(false);

  return (
    <Collapsible
      open={aberto}
      onOpenChange={definirAberto}
      className="flex flex-col gap-3"
      data-slot="edicao-da-turma"
    >
      <h2 className="text-texto text-base font-semibold">
        <CollapsibleTrigger
          data-slot="abrir-edicao-da-turma"
          className="border-borda bg-superficie hover:border-borda-forte focus-visible:ring-marca rounded-ciaara flex w-full items-center justify-between gap-2 border px-3 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <PencilIcon aria-hidden="true" className="size-4 shrink-0" />
            Editar turma
          </span>
          {/*
            ⚠️ O ÍCONE NÃO É O RÓTULO (`FR-031` da fatia b): quem anuncia o estado é o
               `aria-expanded` que o `CollapsibleTrigger` carrega, e o texto ao lado dele não muda.
          */}
          <ChevronDownIcon
            aria-hidden="true"
            className="text-texto-suave size-4 shrink-0 transition-transform motion-reduce:transition-none data-[aberto=true]:rotate-180"
            data-aberto={aberto ? "true" : "false"}
          />
        </CollapsibleTrigger>
      </h2>

      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

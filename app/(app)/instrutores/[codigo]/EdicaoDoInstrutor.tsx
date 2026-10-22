/**
 * A ficha do instrutor: **ver primeiro, editar ao clicar** — FR-010.1 e FR-010.2 da spec 016 (item 1.10).
 *
 * > *"A ficha abre em leitura; um botão Editar revela o formulário, como na ficha da turma. Barra no
 * > topo com Editar · Desativar/Reativar · Excluir."* — Q-13, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **ATÉ 17/10/2026 O FORMULÁRIO FICAVA SEMPRE MONTADO** abaixo da leitura — 207 campos editáveis
 * visíveis na ficha do instrutor de código 15 — e Desativar e Excluir moravam no rodapé dele.
 *
 * ⚠️ **A BARRA E O FORMULÁRIO VIVEM NA MESMA RAIZ DO `Collapsible`**, e a leitura vai entre os dois por
 * `children`: o gatilho fica no topo e o conteúdo no fim, sem que a página vire cliente. É o desenho de
 * `EdicaoDaTurma.tsx` (spec 012, FR-035), com o gatilho dentro da barra.
 *
 * ⚠️ **O CONTEÚDO É DESMONTADO QUANDO FECHADO** (o Radix não monta o que está fechado): o que alguém
 * digitou sem gravar se perde ao fechar. Só quem está editando fecha, por clique — o mesmo risco aceito
 * na ficha da turma.
 *
 * ⚠️ **A PERMISSÃO É DECIDIDA NA PÁGINA**: esta folha só é montada para quem edita instrutor, e Excluir
 * chega em `acoes` só para quem cria. O banco recusa de qualquer forma.
 */
"use client";

import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { BarraDeAcoes } from "@/components/ciaara/barra-de-acoes";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function EdicaoDoInstrutor({
  acoes,
  formulario,
  children,
}: {
  /** Desativar/Reativar e, para quem cria instrutor, Excluir — desenhados no servidor. */
  readonly acoes: React.ReactNode;
  readonly formulario: React.ReactNode;
  /** A leitura da ficha, que fica entre a barra e o formulário. */
  readonly children: React.ReactNode;
}) {
  const [aberto, definirAberto] = React.useState(false);
  const conteudo = React.useRef<HTMLDivElement>(null);

  // O formulário abre no FIM da ficha: levá-lo à vista poupa a rolagem de quem clicou no topo.
  React.useEffect(() => {
    if (aberto) conteudo.current?.scrollIntoView({ block: "start" });
  }, [aberto]);

  return (
    <Collapsible
      open={aberto}
      onOpenChange={definirAberto}
      className="flex flex-col gap-5"
      data-slot="edicao-do-instrutor"
    >
      <BarraDeAcoes rotulo="Ações do instrutor">
        <CollapsibleTrigger asChild>
          <BotaoDeIcone
            acao="editar"
            rotulo="Editar instrutor"
            data-slot="abrir-edicao-do-instrutor"
          />
        </CollapsibleTrigger>
        {acoes}
      </BarraDeAcoes>

      {children}

      <CollapsibleContent>
        <div ref={conteudo} className="flex flex-col gap-3">
          <h2 className="text-texto text-base font-semibold">Editar cadastro</h2>
          {formulario}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

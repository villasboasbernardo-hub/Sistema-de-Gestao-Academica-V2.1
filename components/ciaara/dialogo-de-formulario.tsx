/**
 * O diálogo de um formulário curto — `FR-002` da spec 022 (Bloco 7).
 *
 * > *"Edição e cadastro SEMPRE em diálogo (formulário curto: UE, avaliação, regime) ou página própria (formulário
 * > longo: disciplina, curso) — nunca campos abertos na página."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **O FORMULÁRIO DE DENTRO FECHA O DIÁLOGO QUANDO GRAVA**: ele recebe `fechar` e o chama ao dar certo. A recusa fica
 *    no diálogo, com o que foi digitado (`FR-002.3`) — fechar na recusa jogaria fora o trabalho de quem preencheu.
 * ⚠️ **O CONTEÚDO SÓ EXISTE ABERTO** (o `Dialog` do Radix desmonta o que está fechado): cada abertura começa do valor
 *    gravado, nunca do rascunho de uma abertura anterior.
 * ⚠️ **O RODAPÉ DE GRAVAR CONTINUA COM TEXTO** (D-3 da spec 022) — o diálogo já é o passo focado, como a confirmação
 *    destrutiva. Quem desenha os botões é o formulário de dentro.
 * ⚠️ **ROLA POR DENTRO** (`max-h-[90vh]`), como o lançamento do DSA: o formulário maior que a tela não empurra o botão de
 *    gravar para fora dela.
 */
"use client";

import * as React from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type DialogoDeFormularioProps = {
  /** O botão que abre — em geral um `BotaoDeIcone`. */
  readonly gatilho: React.ReactElement;
  readonly titulo: string;
  readonly descricao?: string;
  /** O formulário; recebe `fechar`, para chamar quando gravar. */
  readonly children: (fechar: () => void) => React.ReactNode;
  /** Largura maior para o formulário de mais colunas. */
  readonly largo?: boolean;
  /** `data-slot` do conteúdo do diálogo. */
  readonly slot?: string;
  /**
   * O modo controlado, para quem já guarda se o formulário está aberto (o *Parar dia* do DSA, que pede confirmação
   * sem fechar). Sem os dois, o diálogo guarda o próprio estado.
   */
  readonly aberto?: boolean;
  readonly aoMudar?: (aberto: boolean) => void;
};

export function DialogoDeFormulario({
  gatilho,
  titulo,
  descricao,
  children,
  largo = false,
  slot = "dialogo-de-formulario",
  aberto: abertoDeFora,
  aoMudar,
}: DialogoDeFormularioProps): React.ReactNode {
  const [abertoAqui, definirAbertoAqui] = React.useState(false);
  const controlado = abertoDeFora !== undefined;
  const aberto = controlado ? abertoDeFora : abertoAqui;
  const definirAberto = React.useCallback(
    (proximo: boolean) => {
      if (!controlado) definirAbertoAqui(proximo);
      aoMudar?.(proximo);
    },
    [controlado, aoMudar],
  );
  const fechar = React.useCallback(() => definirAberto(false), [definirAberto]);

  return (
    <Dialog open={aberto} onOpenChange={definirAberto}>
      <DialogTrigger asChild>{gatilho}</DialogTrigger>
      <DialogContent
        className={`max-h-[90vh] overflow-y-auto ${largo ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        data-slot={slot}
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao ? (
            <DialogDescription>{descricao}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{titulo}</DialogDescription>
          )}
        </DialogHeader>
        {aberto ? children(fechar) : null}
      </DialogContent>
    </Dialog>
  );
}

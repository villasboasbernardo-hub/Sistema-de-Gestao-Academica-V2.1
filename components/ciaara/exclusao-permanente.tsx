/**
 * O ícone **Excluir** dos cadastros do Bloco 10 — turma, linha do calendário, regime de horário, item de avaliação do
 * currículo e sala (RT-2 e D-COR-6; spec 025, D-12 e D-13).
 *
 * > *"Tudo que se cadastra tem Editar, Desativar/Reativar e Excluir (permanente, com alerta)."* · *"…com registros,
 * > ícone desabilitado com dica 'tem registros: use Arquivar/Desativar'."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **QUEM DECIDE É O BANCO, DUAS VEZES**: o `estado` chega da função de impedimentos (lida pela página), e a exclusão
 *    confere tudo de novo na mesma transação — o motivo velho (um lançamento gravado depois de a página abrir) não
 *    apaga nada: a recusa aparece aqui.
 * ⚠️ **COM REGISTRO, DESABILITADO E COM A DICA** (`indisponivel` do `BotaoDeIcone`): focável, a dica diz o motivo e o
 *    nome acessível diz o que prende. Sem resposta do banco, o mesmo — nunca liberado (`RN-DEG-01`).
 * ⚠️ **O ALERTA E O CÓDIGO DIGITADO** (D-12), como as exclusões do domínio acadêmico (instrutor, disciplina, UE): o
 *    botão *Excluir permanentemente* só libera com o código exato, e o banco o confere de novo.
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE** (Princípio XI): componente não importa Server Action.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { codigoConfere, type EstadoDaExclusao } from "@/lib/dominio/exclusao-permanente";

export type RespostaDaExclusao =
  { readonly ok: true; readonly destino?: string } | { readonly ok: false; readonly erro: string };

export type ExclusaoPermanenteProps = {
  readonly id: string;
  /** O que se digita para confirmar — o código (ou o nome, na sala). */
  readonly codigo: string;
  /** *"o código da turma"*, *"o nome da sala"*. */
  readonly nomeDoCodigo: string;
  /** O nome acessível do ícone: *"Excluir a turma C-Ap-FR 2026"*. */
  readonly rotulo: string;
  readonly titulo: string;
  /** O alerta: o que sai junto, e que não se desfaz. */
  readonly consequencia: string;
  readonly estado: EstadoDaExclusao;
  readonly excluir: (entrada: {
    id: string;
    codigoConfirmacao: string;
  }) => Promise<RespostaDaExclusao | { readonly ok: boolean; readonly erro?: string }>;
  /** Depois de excluir: ir ao `destino` da resposta, ou reler a página. */
  readonly depois?: "navegar" | "atualizar";
  /** Na linha de uma tabela: fantasma e fora da tabulação da grade. */
  readonly naLinha?: boolean;
  /** Onde a recusa aparece; sem ela, abaixo do ícone. */
  readonly aoRecusar?: (erro: string) => void;
  /** Depois de excluir — a resposta acima da lista, quando a linha some com o ícone. */
  readonly aoConcluir?: () => void;
  readonly slot?: string;
};

export function ExclusaoPermanente({
  id,
  codigo,
  nomeDoCodigo,
  rotulo,
  titulo,
  consequencia,
  estado,
  excluir,
  depois = "atualizar",
  naLinha = false,
  aoRecusar,
  aoConcluir,
  slot = "excluir",
}: ExclusaoPermanenteProps) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState(false);
  const [digitado, definirDigitado] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [enviando, iniciar] = React.useTransition();
  const campo = React.useId();

  if (!estado.liberada) {
    return (
      <BotaoDeIcone
        acao="excluir"
        rotulo={estado.detalhe ? `${rotulo}. ${estado.detalhe}` : rotulo}
        variante={naLinha ? "fantasma" : "destrutivo"}
        indisponivel={estado.dica ?? "indisponível"}
        data-slot={slot}
        data-bloqueado="true"
        {...(naLinha ? { tabIndex: -1, className: "size-7" } : {})}
      />
    );
  }

  const confirmar = () =>
    iniciar(async () => {
      definirErro(null);
      const resposta = await excluir({ id, codigoConfirmacao: digitado.trim() });
      if (!resposta.ok) {
        const mensagem = ("erro" in resposta && resposta.erro) || "Não foi possível excluir.";
        if (aoRecusar) {
          aoRecusar(mensagem);
          definirAberto(false);
        } else {
          definirErro(mensagem);
        }
        return;
      }
      definirAberto(false);
      aoConcluir?.();
      const destino = "destino" in resposta ? resposta.destino : undefined;
      if (depois === "navegar" && destino) router.push(destino);
      else router.refresh();
    });

  return (
    <>
      <AlertDialog
        open={aberto}
        onOpenChange={(abrir) => {
          definirAberto(abrir);
          if (!abrir) {
            definirDigitado("");
            definirErro(null);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <BotaoDeIcone
            acao="excluir"
            rotulo={rotulo}
            variante={naLinha ? "fantasma" : "destrutivo"}
            ocupado={enviando}
            rotuloOcupado="Excluindo…"
            data-slot={slot}
            data-bloqueado="false"
            {...(naLinha ? { tabIndex: -1, className: "size-7" } : {})}
          />
        </AlertDialogTrigger>
        <AlertDialogContent data-slot="dialogo-de-exclusao">
          <AlertDialogHeader>
            <AlertDialogTitle>{titulo}</AlertDialogTitle>
            <AlertDialogDescription>
              {consequencia} A exclusão é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor={campo}>
              Para confirmar, digite {nomeDoCodigo}: <strong>{codigo}</strong>
            </Label>
            <Input
              id={campo}
              name="codigo-de-confirmacao"
              autoComplete="off"
              value={digitado}
              onChange={(e) => definirDigitado(e.target.value)}
              data-slot="codigo-de-confirmacao"
            />
          </div>
          {erro ? (
            <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-da-exclusao">
              {erro}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={!codigoConfere(digitado, codigo) || enviando}
              onClick={(e) => {
                e.preventDefault();
                confirmar();
              }}
              data-slot="confirmar-exclusao"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * *Arquivar turma* e *Desarquivar*, no cabeçalho da ficha — **folha de cliente** (D-COR-5; spec 017, FR-004).
 *
 * > *"Arquivar turma em QUALQUER estado, com aviso quando a turma não estiver concluída (…) o Admin pode
 * > desarquivar."* — D-COR-5, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **ARQUIVAR NÃO É SITUAÇÃO**: a situação da turma fica como está; o arquivamento é um evento próprio, e a ficha
 *    passa a ser somente leitura. O aviso de não concluída é do domínio (`avisoAoArquivar`), uma frase só.
 * ⚠️ **QUEM DECIDE É O BANCO** (a policy de `turma_arquivamentos`): esta folha só é montada para quem pode — o Admin, o
 *    Encarregado e o Ajudante da Administração Acadêmica, para as duas ações (decisão de Bernardo Villas Boas,
 *    19/10/2026) — e a recusa chega traduzida pela ação.
 * ⚠️ **A MESMA FOLHA NA LINHA DE `/turmas`** (`naLista`; ajuste da conferência de 19/10/2026: *"botão «Arquivar» em
 *    cada linha (…) sem abrir a ficha, com o mesmo aviso de «não concluída» e a mesma ação do servidor"*): o mesmo
 *    diálogo e a mesma Server Action; muda só o rótulo do botão, a parada de `Tab` (a da célula, como os links da
 *    tabela) e o fim — a lista se relê no lugar, em vez de ir à ficha.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { arquivarTurma, desarquivarTurma } from "@/lib/acoes/turma";
import { avisoAoArquivar } from "@/lib/dominio/arquivamento-da-turma";
import { LIMITE_DA_OBSERVACAO_DA_TURMA } from "@/lib/validacao/turma";

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function ArquivarTurma({
  codigo,
  situacao,
  arquivada,
  naLista = false,
}: {
  readonly codigo: string;
  readonly situacao: string;
  /** Arquivada: o botão é *Desarquivar*; senão, *Arquivar turma* (*Arquivar*, na lista). */
  readonly arquivada: boolean;
  /** Na linha de `/turmas`: depois de gravar, a lista se relê no lugar. */
  readonly naLista?: boolean;
}) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState(false);
  const [observacao, definirObservacao] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();
  const aviso = arquivada ? null : avisoAoArquivar(situacao);

  function abrirOuFechar(abrir: boolean) {
    definirAberto(abrir);
    if (abrir) {
      definirObservacao("");
      definirErro(null);
    }
  }

  function confirmar() {
    iniciar(async () => {
      definirErro(null);
      const resultado = arquivada
        ? await desarquivarTurma({ codigo })
        : await arquivarTurma({ codigo, observacao });
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      definirAberto(false);
      if (naLista) router.refresh();
      else router.replace(resultado.destino);
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={abrirOuFechar}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-slot={
            naLista
              ? arquivada
                ? "desarquivar-da-linha"
                : "arquivar-da-linha"
              : arquivada
                ? "desarquivar-turma"
                : "arquivar-turma"
          }
          {...(naLista
            ? {
                tabIndex: -1,
                "aria-label": `${arquivada ? "Desarquivar" : "Arquivar"} a turma ${codigo}`,
              }
            : {})}
        >
          {arquivada ? "Desarquivar" : naLista ? "Arquivar" : "Arquivar turma"}
        </Button>
      </DialogTrigger>
      <DialogContent data-slot={arquivada ? "dialogo-de-desarquivar" : "dialogo-de-arquivar"}>
        <DialogHeader>
          <DialogTitle>{arquivada ? "Desarquivar a turma" : "Arquivar a turma"}</DialogTitle>
          <DialogDescription>
            {arquivada
              ? `${codigo} volta às listas e a receber gravação.`
              : `${codigo} sai das listas e fica somente leitura. A situação não muda.`}
          </DialogDescription>
        </DialogHeader>

        {aviso ? (
          <p className="text-atrasado-tinta text-sm" data-slot="aviso-nao-concluida">
            {aviso}
          </p>
        ) : null}

        {arquivada ? null : (
          <div className="flex flex-col gap-1">
            <label htmlFor="observacao-do-arquivamento" className="text-texto text-sm font-medium">
              Observação (opcional)
            </label>
            <textarea
              id="observacao-do-arquivamento"
              rows={3}
              maxLength={LIMITE_DA_OBSERVACAO_DA_TURMA}
              value={observacao}
              onChange={(e) => definirObservacao(e.target.value)}
              className={CAMPO}
              data-slot="observacao-do-arquivamento"
            />
          </div>
        )}

        {erro ? (
          <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-do-arquivamento">
            {erro}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={gravando}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={gravando}
            onClick={confirmar}
            data-slot={arquivada ? "confirmar-desarquivar" : "confirmar-arquivar"}
          >
            {gravando ? "Gravando…" : arquivada ? "Desarquivar" : "Arquivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

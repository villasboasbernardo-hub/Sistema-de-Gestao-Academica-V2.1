/**
 * *"Trocar situação"*, ao lado do selo do cabeçalho da ficha — FR-015.1 da spec 016 (item 1.15).
 *
 * > *"Ao lado do selo de Situação, um botão «Trocar situação» que abre um diálogo só com a situação e
 * > grava por uma Server Action própria."* — Q-14, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **O DIAGNÓSTICO QUE O CRIOU**: a troca de situação **funcionava** — reproduzida como Admin, três
 * trocas gravaram no banco local —, mas o campo morava dentro de *"Editar turma"*, que nasce fechado e
 * fica no fim da página, abaixo das disciplinas, e gravar não mostrava aviso nenhum. Quem procurava a
 * situação via o selo, só de leitura, e concluía que não dava para trocar.
 *
 * ⚠️ **QUATRO OPÇÕES EM RÁDIO, NÃO EM LISTA**: são poucas e se leem de uma vez, e a atual vem marcada.
 *
 * ⚠️ **A CONFIRMAÇÃO VAI PELA URL (`?gravada=situacao`)**, como o aviso de exclusão de conta: ela
 * sobrevive ao `revalidatePath` e à remontagem da ficha, e o selo, lido de novo no servidor, já mostra
 * a situação nova.
 *
 * ⚠️ **QUEM DECIDE É O BANCO**: esta folha só é montada para quem tem `turmas/editar` com o curso em
 * oferta, e a recusa da RLS chega traduzida pela ação.
 *
 * ⚠️ **TODA TROCA LEVA OBSERVAÇÃO** (D-COR-4, spec 017): opcional, até 500 caracteres; ela vai com a troca para a
 * trilha da turma, e a ficha a mostra no *Histórico da situação*. As situações vêm do enum gerado, não escritas à
 * mão — arquivar NÃO é uma delas (D-COR-5).
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
import { trocarSituacaoDaTurma } from "@/lib/acoes/turma";
import { ROTULO_DO_STATUS_DE_TURMA } from "@/lib/dominio/seletor-de-turma";
import { Constants } from "@/lib/tipos/database";
import { LIMITE_DA_OBSERVACAO_DA_TURMA } from "@/lib/validacao/turma";

const SITUACOES = Constants.public.Enums.status_turma;

const CAMPO =
  "border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca w-full border px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function TrocarSituacao({
  codigo,
  atual,
}: {
  readonly codigo: string;
  readonly atual: string;
}) {
  const router = useRouter();
  const [aberto, definirAberto] = React.useState(false);
  const [escolhida, definirEscolhida] = React.useState(atual);
  const [observacao, definirObservacao] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, iniciar] = React.useTransition();

  function abrirOuFechar(abrir: boolean) {
    definirAberto(abrir);
    if (abrir) {
      definirEscolhida(atual);
      definirObservacao("");
      definirErro(null);
    }
  }

  function gravar() {
    iniciar(async () => {
      definirErro(null);
      const resultado = await trocarSituacaoDaTurma({ codigo, status: escolhida, observacao });
      if (!resultado.ok) {
        definirErro(resultado.erro);
        return;
      }
      definirAberto(false);
      router.replace(resultado.destino);
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={abrirOuFechar}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" data-slot="trocar-situacao">
          Trocar situação
        </Button>
      </DialogTrigger>
      <DialogContent data-slot="dialogo-de-situacao">
        <DialogHeader>
          <DialogTitle>Trocar a situação da turma</DialogTitle>
          <DialogDescription>
            {codigo} está como {ROTULO_DO_STATUS_DE_TURMA[atual] ?? atual}. Escolha a nova situação.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Situação</legend>
          {SITUACOES.map((s) => (
            <label key={s} className="text-texto flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="situacao"
                value={s}
                checked={escolhida === s}
                onChange={() => definirEscolhida(s)}
                className="accent-marca size-4"
              />
              {ROTULO_DO_STATUS_DE_TURMA[s]}
              {s === atual ? <span className="text-texto-suave text-xs">(atual)</span> : null}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1">
          <label htmlFor="observacao-da-situacao" className="text-texto text-sm font-medium">
            Observação (opcional)
          </label>
          <textarea
            id="observacao-da-situacao"
            rows={3}
            maxLength={LIMITE_DA_OBSERVACAO_DA_TURMA}
            value={observacao}
            onChange={(e) => definirObservacao(e.target.value)}
            className={CAMPO}
            data-slot="observacao-da-situacao"
          />
        </div>

        {erro ? (
          <p role="alert" className="text-conflito-tinta text-sm" data-slot="erro-da-situacao">
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
            disabled={gravando || escolhida === atual}
            onClick={gravar}
            data-slot="gravar-situacao"
          >
            {gravando ? "Gravando…" : "Gravar situação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

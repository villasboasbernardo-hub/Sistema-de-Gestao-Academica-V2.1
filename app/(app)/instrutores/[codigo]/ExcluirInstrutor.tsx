/**
 * Excluir instrutor PERMANENTEMENTE — **folha de cliente**. A exceção única à regra 4, autorizada por
 * Bernardo Villas Boas em 15/09/2026, delimitada a registro sem histórico nenhum.
 *
 * ⚠️ OCULTA PARA QUEM NÃO PODE, DESABILITADA PARA QUEM TEM HISTÓRICO — e as duas coisas são diferentes
 * de propósito. Quem decide a primeira é a página, com `SePodeVer` (`criar` instrutor, a ação mais
 * restritiva que a matriz oferece). A segunda é a pedida: o botão aparece cinza, **com o motivo escrito
 * ao lado**, porque "este instrutor tem aula lançada, só pode ser desativado" é informação que quem
 * administra precisa ter, e não um "existe, mas não para você".
 *
 * ⚠️ DIGITAR O CÓDIGO LIBERA A CONFIRMAÇÃO. Um clique a mais não protege nada numa ação irreversível;
 * copiar o código do cabeçalho obriga a olhar para qual instrutor se está apagando. O banco confere o
 * mesmo código de novo — a tela não é a garantia.
 *
 * ⚠️ QUEM RECUSA É O BANCO. Motivo desatualizado (uma atribuição gravada depois de a página abrir) não
 * apaga nada: `excluir_instrutor` confere tudo na mesma transação, e o erro dele aparece aqui.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { excluirInstrutor } from "@/lib/acoes/instrutor";
import { codigoConfere } from "@/lib/dominio/exclusao-de-instrutor";

export function ExcluirInstrutor({
  instrutorId,
  codigo,
  motivoDoImpedimento,
}: {
  readonly instrutorId: string;
  readonly codigo: string;
  /** `null` quando nada impede; o texto escrito ao lado do botão desabilitado quando há histórico. */
  readonly motivoDoImpedimento: string | null;
}) {
  const router = useRouter();
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const liberado = codigoConfere(digitado, codigo);

  const excluir = () =>
    iniciar(async () => {
      setErro(null);
      const resultado = await excluirInstrutor({ id: instrutorId, codigoConfirmacao: digitado });
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.push("/instrutores");
    });

  if (motivoDoImpedimento !== null) {
    return (
      <div className="flex flex-col gap-1" data-slot="excluir-instrutor" data-bloqueado="true">
        <Button type="button" variant="destructive" disabled>
          Excluir instrutor
        </Button>
        <p className="text-texto-suave max-w-md text-xs" data-slot="motivo-de-nao-excluir">
          {motivoDoImpedimento}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-slot="excluir-instrutor" data-bloqueado="false">
      <AlertDialog onOpenChange={(aberto) => (aberto ? null : setDigitado(""))}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" disabled={enviando}>
            {enviando ? "Excluindo…" : "Excluir instrutor"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-slot="dialogo-de-exclusao">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este instrutor permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente e irreversível: o cadastro sai do banco e não há como
              recuperá-lo. Ela só é possível porque este instrutor não tem histórico nenhum — sem
              aula lançada, atribuição, vínculo de habilitação nem conta de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            <Label htmlFor="codigo-de-confirmacao">
              Digite o código do instrutor, <strong>{codigo}</strong>, para confirmar
            </Label>
            <Input
              id="codigo-de-confirmacao"
              name="codigo-de-confirmacao"
              autoComplete="off"
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={!liberado || enviando}
              onClick={excluir}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Desativar e reativar um instrutor — **folha de cliente** (`FR-008`, `FR-010`, `RN-INST-02` da spec
 * 006).
 *
 * ⚠️ OCULTA, E NÃO DESABILITADA, PARA QUEM NÃO PODE EDITAR. Quem decide é a página, com `SePodeVer`;
 * um botão cinza diria "existe, mas não para você", e a negação de verdade é do banco de qualquer
 * jeito (`FR-020` e `FR-022` da spec 004).
 *
 * ⚠️ UMA AÇÃO POR SITUAÇÃO. Ativo vê "Desativar"; inativo vê "Reativar". Mostrar as duas faria a tela
 * oferecer uma escrita que não muda nada.
 *
 * ⚠️ A CONSEQUÊNCIA ESCRITA NO DIÁLOGO É A REGRA, E NÃO UM AVISO GENÉRICO. Quem desativa precisa saber,
 * antes de confirmar, que o histórico fica e a conta de acesso não é tocada (`FR-010.1`) — é o que a
 * pessoa mais provavelmente supõe errado.
 */
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { desativarInstrutor, reativarInstrutor } from "@/lib/acoes/instrutor";

export function AcoesDeInstrutor({
  instrutorId,
  ativo,
}: {
  readonly instrutorId: string;
  readonly ativo: boolean;
}) {
  const router = useRouter();
  const [enviando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const executar = () =>
    iniciar(async () => {
      setErro(null);
      const acao = ativo ? desativarInstrutor : reativarInstrutor;
      const resultado = await acao({ id: instrutorId });
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2" data-slot="acoes-de-instrutor">
      <DialogoConfirmacao
        titulo={ativo ? "Desativar este instrutor?" : "Reativar este instrutor?"}
        consequencia={
          ativo
            ? "Ele deixa de receber novas atribuições. Todo o histórico já lançado continua com o nome dele, e a conta de acesso, se houver, não é alterada."
            : "Ele volta a poder receber novas atribuições, com o cadastro e o histórico como estavam."
        }
        rotuloConfirmar={ativo ? "Desativar" : "Reativar"}
        aoConfirmar={executar}
      >
        <Button type="button" variant="outline" disabled={enviando}>
          {enviando ? "Gravando…" : ativo ? "Desativar instrutor" : "Reativar instrutor"}
        </Button>
      </DialogoConfirmacao>

      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

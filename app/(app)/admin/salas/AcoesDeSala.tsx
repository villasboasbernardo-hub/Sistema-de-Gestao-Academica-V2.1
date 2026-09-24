/**
 * Desativar e reativar sala — **folha de cliente** (`FR-029.4`, `FR-029.5`).
 *
 * ⚠️ **SÃO DUAS AÇÕES, E NÃO TRÊS: NÃO HÁ APAGAR** (regra 4 do `CLAUDE.md`). Nenhuma tabela tem
 * policy `FOR DELETE`, e a sala desativada continua nomeando as turmas que já a usam.
 *
 * ⚠️ **DESATIVAR SALA EM USO É PERMITIDO — O DIÁLOGO SÓ AVISA** (`RN-DEG-02`). Quem lista as turmas e
 * quem decide se confirma são `lib/dominio/salas.ts` e `lib/dominio/confirmacao-de-gravacao.ts`; esta
 * folha só mostra o que eles responderam.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { desativarSala, reativarSala } from "@/lib/acoes/sala";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";

export function AcoesDeSala({
  valor,
  ativa,
  turmasQueUsam,
}: {
  readonly valor: string;
  readonly ativa: boolean;
  /** As turmas que referenciam a sala — já resolvidas por `turmasQueUsam` no servidor. */
  readonly turmasQueUsam: readonly string[];
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function executar() {
    definirGravando(true);
    definirErro(null);
    const resultado = ativa ? await desativarSala({ valor }) : await reativarSala({ valor });
    definirGravando(false);

    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  const confirmacao = confirmacaoDaGravacao(ativa ? "desativar_sala" : "reativar_sala", {
    sala: valor,
    turmasQueUsamASala: turmasQueUsam,
  });

  const botao = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={gravando}
      data-slot={ativa ? "desativar-sala" : "reativar-sala"}
      {...(confirmacao.confirma ? {} : { onClick: () => void executar() })}
    >
      {ativa ? "Desativar" : "Reativar"}
    </Button>
  );

  return (
    <span className="flex flex-wrap items-center gap-2">
      {confirmacao.confirma ? (
        <DialogoConfirmacao
          titulo={confirmacao.titulo}
          consequencia={confirmacao.mensagens.join(" ")}
          rotuloConfirmar={confirmacao.rotuloConfirmar}
          aoConfirmar={() => void executar()}
        >
          {botao}
        </DialogoConfirmacao>
      ) : (
        botao
      )}
      {erro ? (
        <span role="alert" className="text-atrasado-tinta text-xs" data-slot="erro-da-sala">
          {erro}
        </span>
      ) : null}
    </span>
  );
}

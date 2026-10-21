/**
 * Descartar o currículo criado por engano — spec 021, Bloco 6, D-19 e D-36 — **folha de cliente**, com confirmação.
 *
 * ⚠️ É EXCLUSÃO LÓGICA (regra 4): o currículo vira `inativo` e sai do seletor; nada é apagado. Só aparece no currículo
 *    que nenhuma turma segue e que não é o vigente — e o banco recusa o resto (`versao_em_uso`).
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { descartarCurriculo } from "@/lib/acoes/curriculo";
import { enderecoDoCurso } from "@/lib/navegacao/endereco-de-turma";

export function DescartarCurriculo({
  sigla,
  versao,
}: {
  readonly sigla: string;
  readonly versao: number;
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function acionar() {
    definirGravando(true);
    definirErro(null);
    const resultado = await descartarCurriculo({ sigla, versao });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.push(enderecoDoCurso(sigla));
  }

  return (
    <div className="contents" data-slot="descarte-do-curriculo">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta order-last basis-full text-sm">
          {erro}
        </p>
      ) : null}
      <DialogoConfirmacao
        titulo={`Descartar o Currículo ${versao}?`}
        consequencia="Ele sai do curso e do seletor — fica guardado como inativo, e nada é apagado. Nenhuma turma o segue."
        rotuloConfirmar="Descartar"
        aoConfirmar={() => void acionar()}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={gravando}
          data-slot="descartar-curriculo"
        >
          Descartar currículo
        </Button>
      </DialogoConfirmacao>
    </div>
  );
}

/**
 * Arquivar e desarquivar o currículo — spec 021, Bloco 6, RC-10 e D-28 — **folha de cliente**, sempre com confirmação.
 *
 * > *"RC-10 · Arquivar currículo passado. Quando o currículo novo já está em uso e todas as turmas do currículo passado
 * > estão arquivadas, o trio pode arquivar esse currículo. Ele sai do seletor, mas não é apagado (regra 4) e pode ser
 * > consultado ("mostrar currículos arquivados")."*
 *
 * ⚠️ QUEM DECIDE É O BANCO (`public.arquivar_curriculo`, porteiro do trio; passado e todas as turmas arquivadas): a
 *    página só mostra o botão quando a regra pura (`impedimentoDoArquivamento`) diz que dá, e a recusa traduzida aparece
 *    aqui se ela não der.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { arquivarCurriculo, desarquivarCurriculo } from "@/lib/acoes/curriculo";

export function ArquivarCurriculo({
  sigla,
  versao,
  arquivado,
}: {
  readonly sigla: string;
  readonly versao: number;
  readonly arquivado: boolean;
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  async function acionar() {
    definirGravando(true);
    definirErro(null);
    const resultado = arquivado
      ? await desarquivarCurriculo({ sigla, versao })
      : await arquivarCurriculo({ sigla, versao });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="contents" data-slot="arquivamento-do-curriculo">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta order-last basis-full text-sm">
          {erro}
        </p>
      ) : null}
      <DialogoConfirmacao
        titulo={
          arquivado ? `Desarquivar o Currículo ${versao}?` : `Arquivar o Currículo ${versao}?`
        }
        consequencia={
          arquivado
            ? "Ele volta ao seletor de currículos do curso."
            : "Ele sai do seletor de currículos (continua consultável em «Mostrar currículos arquivados») e não recebe turma nova. Nada é apagado."
        }
        rotuloConfirmar={arquivado ? "Desarquivar" : "Arquivar"}
        aoConfirmar={() => void acionar()}
      >
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={gravando}
          data-slot={arquivado ? "desarquivar-curriculo" : "arquivar-curriculo"}
        >
          {arquivado ? "Desarquivar currículo" : "Arquivar currículo"}
        </Button>
      </DialogoConfirmacao>
    </div>
  );
}

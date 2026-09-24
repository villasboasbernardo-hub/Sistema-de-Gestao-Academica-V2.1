/**
 * Desativar e reativar o curso — **oculto para quem não pode**, e sempre com confirmação
 * (`FR-017`, `FR-017.4`, `FR-017.7`, `FR-017.8`, `FR-018.1`).
 *
 * ⚠️ **OCULTO, E NÃO DESABILITADO.** Quem não tem `cursos.desativar` não vê o botão. Botão
 * desabilitado anuncia uma capacidade que a pessoa não tem e a manda pedir explicação a quem não pode
 * dar — a mesma decisão do `FR-008`/A-4.
 *
 * ⚠️ **AS DUAS CONFIRMAM SEMPRE** (`FR-018.1`), e o texto vem de `lib/dominio/confirmacao-de-gravacao.ts`.
 * Sair de oferta e voltar a ela são mudanças difíceis de desfazer sem que alguém perceba.
 *
 * ⚠️ **QUEM DECIDE É O BANCO, e esta folha só esconde.** `app.guardar_situacao_do_curso()` recusa com
 * `situacao_sem_permissao` e com `curso_com_turma_pendente` — e a segunda **nomeia cada turma**, o que
 * a tela mostra sem reimplementar a regra.
 */
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { desativarCurso, reativarCurso } from "@/lib/acoes/curso";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";

export function AcoesDeSituacao({
  sigla,
  ativo,
}: {
  readonly sigla: string;
  readonly ativo: boolean;
}) {
  const router = useRouter();
  const [erro, definirErro] = React.useState<string | null>(null);
  const [gravando, definirGravando] = React.useState(false);

  const confirmacao = confirmacaoDaGravacao(ativo ? "desativar_curso" : "reativar_curso", {
    sigla,
  });

  async function acionar() {
    definirGravando(true);
    definirErro(null);
    const resultado = ativo ? await desativarCurso({ sigla }) : await reativarCurso({ sigla });
    definirGravando(false);
    if (!resultado.ok) {
      definirErro(resultado.erro);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2" data-slot="acoes-de-situacao">
      {erro ? (
        <p role="alert" className="text-atrasado-tinta text-sm" data-slot="erro-de-situacao">
          {erro}
        </p>
      ) : null}

      {confirmacao.confirma ? (
        <DialogoConfirmacao
          titulo={confirmacao.titulo}
          consequencia={confirmacao.mensagens.join(" ")}
          rotuloConfirmar={confirmacao.rotuloConfirmar}
          aoConfirmar={() => void acionar()}
        >
          <Button
            type="button"
            variant={ativo ? "destructive" : "default"}
            size="sm"
            disabled={gravando}
          >
            {ativo ? "Desativar curso" : "Reativar curso"}
          </Button>
        </DialogoConfirmacao>
      ) : null}
    </div>
  );
}

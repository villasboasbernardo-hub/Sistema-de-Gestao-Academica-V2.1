/**
 * Desativar e reativar o curso — **oculto para quem não pode** (`FR-017.8`).
 *
 * ⚠️ **OCULTO, E NÃO DESABILITADO.** Quem não tem `cursos.desativar` não vê o botão. Botão
 * desabilitado anuncia uma capacidade que a pessoa não tem e a manda pedir explicação a quem não
 * pode dar — é a mesma decisão do `FR-008`/A-4: *"a tela não anuncia o que não entrega"*.
 *
 * ⚠️ **QUEM DECIDE É O BANCO, e esta folha só esconde.** `app.guardar_situacao_do_curso()` recusa com
 * `situacao_sem_permissao` mesmo que a ação seja chamada por outro caminho. Esconder o botão é
 * conforto de quem usa, nunca a proteção.
 *
 * ⚠️ **`aoAcionar` É OBRIGATÓRIO, DE PROPÓSITO.** A gravação nasce na US4 (`desativarCurso`), e até lá
 * esta folha **não é montada por tela nenhuma** — em vez de aparecer inerte. Um botão que existe e
 * não faz nada é pior que um botão ausente: ele ensina que apertar não adianta.
 */
"use client";

import { Button } from "@/components/ui/button";

export function AcoesDeSituacao({
  ativo,
  aoAcionar,
}: {
  readonly ativo: boolean;
  readonly aoAcionar: () => void;
}) {
  return (
    <div data-slot="acoes-de-situacao">
      <Button
        type="button"
        variant={ativo ? "destructive" : "default"}
        size="sm"
        onClick={aoAcionar}
      >
        {ativo ? "Desativar curso" : "Reativar curso"}
      </Button>
    </div>
  );
}

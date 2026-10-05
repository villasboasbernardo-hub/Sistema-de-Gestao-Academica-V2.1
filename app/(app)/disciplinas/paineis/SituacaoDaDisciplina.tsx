/**
 * Desativar e reativar a disciplina (`FR-013`, `Q-04`).
 *
 * ⚠️ **DESATIVAR **NÃO** APAGA, E A LINHA CONTINUA NA GRADE** (regra 4). Ela sai da escolha de
 * atribuição nova e das turmas novas; as turmas em que já está continuam com ela e com o que foi
 * lançado. Sumir da lista seria exclusão com outro nome, e ninguém conseguiria reativá-la.
 *
 * ⚠️ **DESATIVAR LIBERA O CÓDIGO** (`Q-04`), porque a unicidade é por índice **parcial**
 * (`where status = 'ativo'`). A consequência aparece na volta: reativar uma disciplina cujo código
 * outra tomou é **recusado pelo banco**, com a frase traduzida. É o caso que discrimina do `FR-013`,
 * e ele não tem como ser antecipado aqui sem duplicar a regra.
 *
 * ⚠️ **A CONFIRMAÇÃO SÓ APARECE QUANDO HÁ HISTÓRICO** (A-9). Desativar uma disciplina que nenhuma
 * turma usa é barato e desfazível; confirmar ali é o clique a mais que treina a clicar sem ler.
 */
import * as React from "react";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { desativarDisciplina, reativarDisciplina } from "@/lib/acoes/disciplina";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";

export function SituacaoDaDisciplina({
  disciplinaId,
  nome,
  ativa,
  turmasQueUsam,
}: {
  readonly disciplinaId: string;
  readonly nome: string;
  readonly ativa: boolean;
  readonly turmasQueUsam: number;
}) {
  const [erro, setErro] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState(false);

  async function alternar() {
    setErro(null);
    setOcupado(true);
    const resultado = ativa
      ? await desativarDisciplina({ disciplinaId })
      : await reativarDisciplina({ disciplinaId });
    if (!resultado.ok) setErro(resultado.erro);
    setOcupado(false);
  }

  const confirmacao = ativa
    ? confirmacaoDaGravacao("desativar_disciplina_com_historico", { nome, turmasQueUsam })
    : { confirma: false as const };

  const botao = (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={ocupado}
      onClick={confirmacao.confirma ? undefined : alternar}
      data-slot="alternar-situacao-da-disciplina"
    >
      {ativa ? "Desativar" : "Reativar"}
    </Button>
  );

  return (
    <>
      {confirmacao.confirma ? (
        <DialogoConfirmacao
          titulo={confirmacao.titulo}
          consequencia={confirmacao.mensagens.join(" ")}
          rotuloConfirmar={confirmacao.rotuloConfirmar}
          aoConfirmar={() => void alternar()}
        >
          {botao}
        </DialogoConfirmacao>
      ) : (
        botao
      )}

      {erro ? (
        <span role="alert" className="text-conflito-tinta text-xs" data-slot="recusa-da-situacao">
          {erro}
        </span>
      ) : null}
    </>
  );
}

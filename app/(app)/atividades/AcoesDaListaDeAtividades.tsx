/**
 * As ações por linha da lista de atividades — **Editar · Desativar · Excluir** (Bloco 18, spec 033, `FR-006.4`, D-10).
 * Folha de cliente.
 *
 * > *"A lista de atividades tem, por linha, Editar (abre o DSA da turma na semana do lançamento — a edição é do DSA,
 * > RP-0/RP-9), Desativar (pede a exclusão do lançamento como rascunho da semana, que conta ao Salvar) e Excluir
 * > desabilitado («lançamento é registro: use Desativar», regra 4, D-COR-6). Só para quem lança o DSA."* — `FR-006.4`
 *
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE** (Princípio XI): é a MESMA exclusão do cartão do DSA (`excluir` de
 *    `lib/acoes/dsa.ts`), com a mesma entrada — ela pede a exclusão como RASCUNHO da semana (RP-0), recusa a turma
 *    arquivada e, na semana publicada, quem recusa é o banco até *Fazer alteração* (RP-5). Nada é gravado fora do DSA.
 * ⚠️ **A RESPOSTA FICA ACIMA DA LISTA**, no `AvisoDaLista` que já existe (spec 011): a linha não muda de lugar, e uma
 *    mensagem dentro dela passaria despercebida. ⚠️ **NÃO HÁ CONTÊINER DE CONTEXTO NOVO** (`SC-022`): a primeira escrita
 *    criava um só para esta lista, e a guarda o acusou — o canônico é o da lista de usuários, que guarda a resposta de
 *    uma ação, e não recorte. Depois do pedido, a página relê, e a linha ganha a marca «desativação pendente».
 * ⚠️ **O EXCLUIR É SEMPRE INDISPONÍVEL**: lançamento é registro (regra 4); a dica diz o caminho.
 */
"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";

import { useAvisoDaLista } from "../admin/usuarios/AvisoDaLista";

type ResultadoDaExclusao =
  { readonly ok: true } | { readonly ok: false; readonly mensagem: string };

const EXCLUIR_INDISPONIVEL = "lançamento é registro: use Desativar";

export function AcoesDaAtividade({
  atividadeId,
  resumo,
  dataLegivel,
  hrefDoDsa,
  indisponivel,
  pendente,
  excluir,
}: {
  readonly atividadeId: string;
  /** *«Palestra de 12/05/2026»* — o nome acessível de cada botão termina nele. */
  readonly resumo: string;
  readonly dataLegivel: string;
  /** O DSA da turma na semana do lançamento; nulo na atividade de todas as turmas. */
  readonly hrefDoDsa: string | null;
  /** O motivo de nada estar disponível (a turma arquivada); nulo, as ações valem. */
  readonly indisponivel: string | null;
  /** A desativação já foi pedida como rascunho e espera o *Salvar a semana*. */
  readonly pendente: boolean;
  readonly excluir: (entrada: unknown) => Promise<ResultadoDaExclusao>;
}) {
  const { avisar } = useAvisoDaLista();
  const router = useRouter();
  const [ocupado, iniciar] = React.useTransition();

  const desativar = () =>
    iniciar(async () => {
      const r = await excluir({ fatoId: atividadeId, origem: "atividade_nao_letiva" });
      if (r.ok) {
        avisar({
          tom: "ok",
          texto: `Desativação de «${resumo}» pedida como rascunho da semana no DSA. Ela só conta depois de «Salvar a semana» (o ícone Editar da linha abre o DSA); até lá, a atividade continua na lista e nas contas.`,
        });
        router.refresh();
      } else {
        avisar({ tom: "erro", texto: r.mensagem });
      }
    });

  return (
    <div className="flex items-center gap-1" data-slot="acoes-da-atividade">
      <BotaoDeIcone
        acao="editar"
        rotulo={`Editar no DSA: ${resumo}`}
        variante="fantasma"
        indisponivel={
          indisponivel ??
          (hrefDoDsa === null ? "atividade de todas as turmas: edite pelo DSA de uma turma" : null)
        }
        {...(hrefDoDsa === null || indisponivel !== null ? {} : { href: hrefDoDsa })}
      />
      {indisponivel !== null || pendente ? (
        <BotaoDeIcone
          acao="desativar"
          rotulo={`Desativar: ${resumo}`}
          variante="fantasma"
          indisponivel={indisponivel ?? "desativação já pedida: salve a semana no DSA"}
        />
      ) : (
        <DialogoConfirmacao
          titulo="Desativar a atividade?"
          consequencia={`A exclusão de «${resumo}» entra como rascunho da semana de ${dataLegivel} no DSA da turma, e só conta depois de «Salvar a semana». Até lá a atividade continua na lista e nas contas. Nada é apagado: o lançamento fica no histórico.`}
          rotuloConfirmar="Desativar"
          aoConfirmar={desativar}
        >
          <BotaoDeIcone
            acao="desativar"
            rotulo={`Desativar: ${resumo}`}
            variante="fantasma"
            ocupado={ocupado}
            rotuloOcupado="Pedindo…"
          />
        </DialogoConfirmacao>
      )}
      <BotaoDeIcone
        acao="excluir"
        rotulo={`Excluir: ${resumo}`}
        variante="fantasma"
        indisponivel={EXCLUIR_INDISPONIVEL}
      />
    </div>
  );
}

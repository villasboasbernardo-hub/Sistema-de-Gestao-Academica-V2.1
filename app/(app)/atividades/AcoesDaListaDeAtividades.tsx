/**
 * As ações por linha da lista de atividades — **Editar · Desativar · Excluir** (Bloco 18, spec 033, `FR-006.4`, D-10) —
 * e a resposta delas, ACIMA da lista. Folha de cliente.
 *
 * > *"A lista de atividades tem, por linha, Editar (abre o DSA da turma na semana do lançamento — a edição é do DSA,
 * > RP-0/RP-9), Desativar (pede a exclusão do lançamento como rascunho da semana, que conta ao Salvar) e Excluir
 * > desabilitado («lançamento é registro: use Desativar», regra 4, D-COR-6). Só para quem lança o DSA."* — `FR-006.4`
 *
 * ⚠️ **A AÇÃO CHEGA POR PROPRIEDADE** (Princípio XI): é a MESMA exclusão do cartão do DSA (`excluir` de
 *    `lib/acoes/dsa.ts`), com a mesma entrada — ela pede a exclusão como RASCUNHO da semana (RP-0), recusa a turma
 *    arquivada e, na semana publicada, quem recusa é o banco até *Fazer alteração* (RP-5). Nada é gravado fora do DSA.
 * ⚠️ **A RESPOSTA FICA ACIMA DA LISTA** (a lição do `AvisoDaLista`, spec 011): a linha não muda de lugar, e uma mensagem
 *    dentro dela passaria despercebida. Depois do pedido, a página relê, e a linha ganha a marca «desativação pendente».
 * ⚠️ **O EXCLUIR É SEMPRE INDISPONÍVEL**: lançamento é registro (regra 4); a dica diz o caminho.
 */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { BotaoDeIcone } from "@/components/ciaara/botao-de-icone";
import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";

type ResultadoDaExclusao =
  | { readonly ok: true }
  | { readonly ok: false; readonly mensagem: string };

type Resposta = { readonly ok: boolean; readonly texto: string; readonly href: string | null };

const ContextoDaResposta = React.createContext<((r: Resposta) => void) | null>(null);

/** A região da resposta das ações, acima da lista, e o contexto que as linhas usam para publicar nela. */
export function RespostaDasAcoesDaLista({ children }: { readonly children: React.ReactNode }) {
  const [resposta, definirResposta] = React.useState<Resposta | null>(null);
  return (
    <ContextoDaResposta.Provider value={definirResposta}>
      {resposta ? (
        <div
          role={resposta.ok ? "status" : "alert"}
          data-slot="resposta-da-lista-de-atividades"
          data-ok={resposta.ok ? "sim" : "nao"}
          className={
            resposta.ok
              ? "border-borda bg-superficie-2 text-texto rounded-ciaara border px-3 py-2 text-sm"
              : "border-conflito-borda bg-conflito-fundo text-conflito-tinta rounded-ciaara border px-3 py-2 text-sm"
          }
        >
          {resposta.texto}
          {resposta.href ? (
            <>
              {" "}
              <Link href={resposta.href} className="text-marca underline">
                Abrir o DSA da semana
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
      {children}
    </ContextoDaResposta.Provider>
  );
}

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
  const publicar = React.useContext(ContextoDaResposta);
  const router = useRouter();
  const [ocupado, iniciar] = React.useTransition();

  const desativar = () =>
    iniciar(async () => {
      const r = await excluir({ fatoId: atividadeId, origem: "atividade_nao_letiva" });
      if (r.ok) {
        publicar?.({
          ok: true,
          texto: `Desativação de «${resumo}» pedida como rascunho da semana no DSA. Ela só conta depois de «Salvar a semana»; até lá, a atividade continua na lista e nas contas.`,
          href: hrefDoDsa,
        });
        router.refresh();
      } else {
        publicar?.({ ok: false, texto: r.mensagem, href: null });
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

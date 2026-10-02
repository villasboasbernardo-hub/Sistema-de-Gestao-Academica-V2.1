"use client";

/**
 * As ações de acesso da conta: redefinir senha, desativar e reativar — folha de cliente.
 *
 * ⚠️ **AS CONFIRMAÇÕES SÃO DIÁLOGO SIMPLES, e só onde há consequência que a pessoa não vê.** Foi o que
 * Bernardo pediu em 03/10/2026: *"Nada de diálogo sobre diálogo na lista. Confirmações continuam em
 * diálogo simples."* Redefinir senha **derruba todas as sessões abertas** e desativar **tira o acesso na
 * requisição seguinte** — as duas merecem confirmação. Reativar é desfazer, e não pede nada.
 *
 * ⚠️ **O DIÁLOGO É O COMPONENTE ÚNICO**, `components/ciaara/dialogo-confirmacao.tsx`. Um segundo
 * construtor de confirmação seria o mesmo erro que o `BotaoLimparFiltros` já corrigiu.
 *
 * ⚠️ **A SENHA APARECE UMA VEZ, EM BLOCO PRÓPRIO** (`FR-034`) — nunca na mesma linha dos botões, para
 * uma credencial em claro não passar por mensagem de status.
 */
import { useState } from "react";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { Button } from "@/components/ui/button";
import { desativar, reativar, redefinirSenha } from "@/lib/acoes/usuarios";

type Resposta = { ok: boolean; erro?: string; senha?: string };

export function AcoesDaConta({
  usuarioId,
  nome,
  ativa,
  temCredencial,
}: {
  readonly usuarioId: string;
  readonly nome: string;
  readonly ativa: boolean;
  readonly temCredencial: boolean;
}) {
  const [senha, definirSenha] = useState<string | null>(null);
  const [aviso, definirAviso] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);

  async function executar(acao: () => Promise<Resposta>, sucesso: string): Promise<void> {
    definirAviso(null);
    definirErro(null);
    definirOcupado(true);
    const r = await acao();
    if (!r.ok) definirErro(r.erro ?? "Não foi possível concluir.");
    else if (r.senha) definirSenha(r.senha);
    else definirAviso(sucesso);
    definirOcupado(false);
  }

  return (
    <div className="border-borda rounded-ciaara flex max-w-xl flex-col gap-3 border p-3">
      <h2 className="text-texto text-sm font-semibold">Acesso</h2>

      <div className="flex flex-wrap gap-2">
        {/*
          ⚠️ **SEM CREDENCIAL NÃO HÁ SENHA A REDEFINIR.** Desde que o convite saiu do sistema
             (03/10/2026) toda conta nova nasce com credencial, mas as que vieram do ETL e do convite
             antigo podem não ter — e para elas o botão não aparece em vez de dar uma recusa.
        */}
        {temCredencial ? (
          <DialogoConfirmacao
            titulo="Redefinir a senha desta conta?"
            consequencia={`O sistema gera uma senha nova para ${nome}, mostra uma vez e ENCERRA todas as sessões abertas dela. No próximo acesso, ela terá de definir outra senha.`}
            rotuloConfirmar="Redefinir senha"
            aoConfirmar={() =>
              void executar(
                () => redefinirSenha({ usuarioId }) as Promise<Resposta>,
                "Senha redefinida.",
              )
            }
          >
            <Button type="button" variant="outline" disabled={ocupado}>
              Redefinir senha
            </Button>
          </DialogoConfirmacao>
        ) : null}

        {ativa ? (
          <DialogoConfirmacao
            titulo="Desativar esta conta?"
            consequencia={`${nome} perde o acesso na requisição seguinte. NADA é apagado: o cadastro continua na lista, marcado como desativado, e a reativação devolve o acesso.`}
            rotuloConfirmar="Desativar"
            aoConfirmar={() => void executar(() => desativar({ usuarioId }), "Conta desativada.")}
          >
            <Button type="button" variant="outline" disabled={ocupado}>
              Desativar
            </Button>
          </DialogoConfirmacao>
        ) : (
          // Reativar é desfazer — não pede confirmação, porque não há consequência a avisar.
          <Button
            type="button"
            variant="outline"
            disabled={ocupado}
            onClick={() => void executar(() => reativar({ usuarioId }), "Conta reativada.")}
          >
            Reativar
          </Button>
        )}
      </div>

      {senha ? (
        <div
          role="status"
          className="border-borda-forte bg-superficie-2 rounded-ciaara flex flex-col gap-1 border p-2"
        >
          <span className="text-texto text-sm font-semibold">
            Senha temporária: <code>{senha}</code>
          </span>
          {/* veste: advertência colada na credencial — texto de apoio */}
          <span className="text-texto-suave text-xs">
            Ela aparece <strong>uma vez</strong>. Copie agora e entregue à pessoa — recarregar esta
            tela a perde, e as sessões abertas dela foram encerradas.
          </span>
        </div>
      ) : null}

      {aviso ? (
        <p role="status" className="text-texto-suave text-sm">
          {aviso}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-erro text-sm">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

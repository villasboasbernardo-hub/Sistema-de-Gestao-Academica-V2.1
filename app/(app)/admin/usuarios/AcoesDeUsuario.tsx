"use client";

/**
 * Reenviar convite e desativar. Folha.
 *
 * ⚠️ A recusa do último Admin chega do BANCO, e a tela só a mostra. A conferência na Server
 * Action existe para dar mensagem legível antes; a do gatilho existe para que a legível não seja
 * a única coisa entre o sistema e um estado sem volta (FR-016).
 */
import { useState } from "react";

import { desativar, reenviarConvite } from "@/lib/acoes/usuarios";

export function AcoesDeUsuario({
  usuarioId,
  temCredencial,
  ativo,
}: {
  readonly usuarioId: string;
  readonly temCredencial: boolean;
  readonly ativo: boolean;
}) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function executar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setOcupado(true);
    const r = await acao();
    setMensagem(r.ok ? null : (r.erro ?? "Não foi possível concluir."));
    setOcupado(false);
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      {!temCredencial ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => executar(() => reenviarConvite({ usuarioId }))}
          className="rounded border px-2 py-0.5 text-xs"
        >
          Reenviar convite
        </button>
      ) : null}

      {ativo ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => executar(() => desativar({ usuarioId }))}
          className="rounded border px-2 py-0.5 text-xs"
        >
          Desativar
        </button>
      ) : null}

      {mensagem ? (
        <span role="alert" className="text-xs">
          {mensagem}
        </span>
      ) : null}
    </span>
  );
}

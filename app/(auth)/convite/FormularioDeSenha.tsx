"use client";

/**
 * Define a senha da sessão corrente. Usado pelo convite e pela recuperação.
 *
 * ⚠️ `updateUser` age sobre a SESSÃO que o link estabeleceu. Sem sessão não há o que atualizar, e
 * a tela diz isso em vez de falhar em silêncio — link expirado ou já usado cai exatamente aqui.
 *
 * ⚠️ A MENSAGEM DE LINK INVÁLIDO NÃO REVELA SE A CONTA EXISTE (contrato convite V-4). Ela fala do
 * link, nunca da conta.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { criarClienteDeNavegador } from "@/lib/supabase/client";

export function FormularioDeSenha({ rotulo }: { readonly rotulo: string }) {
  const roteador = useRouter();
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const supabase = criarClienteDeNavegador();
    supabase.auth.getSession().then(({ data }) => setTemSessao(Boolean(data.session)));
  }, []);

  async function definir(dados: FormData) {
    setEnviando(true);
    setErro(null);

    const senha = String(dados.get("senha") ?? "");
    const confirmacao = String(dados.get("confirmacao") ?? "");
    if (senha !== confirmacao) {
      setErro("As duas senhas não coincidem.");
      setEnviando(false);
      return;
    }

    const supabase = criarClienteDeNavegador();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setErro(error.message);
      setEnviando(false);
      return;
    }

    roteador.refresh();
    roteador.replace("/");
  }

  if (temSessao === null) return <p className="mt-6 text-sm">Conferindo o link…</p>;

  if (!temSessao) {
    return (
      <p role="alert" className="mt-6 text-sm">
        Este link não é mais válido. Links de convite e de recuperação são de{" "}
        <strong>uso único</strong> e têm validade limitada. Peça ao Admin um novo convite, ou use a
        recuperação de senha.
      </p>
    );
  }

  return (
    <form action={definir} className="mt-6 space-y-3">
      <label className="block text-sm">
        Nova senha
        <input
          name="senha"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      <label className="block text-sm">
        Repita a senha
        <input
          name="confirmacao"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      {erro ? (
        <p role="alert" className="text-sm">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="w-full rounded border px-3 py-2 text-sm">
        {enviando ? "Salvando…" : rotulo}
      </button>
    </form>
  );
}

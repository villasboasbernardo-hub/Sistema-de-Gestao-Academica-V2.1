"use client";

/**
 * Pede o link de recuperação — ou define a nova senha, se o link já trouxe a pessoa de volta.
 *
 * ⚠️ A RESPOSTA É IDÊNTICA EXISTA OU NÃO A CONTA (FR-019, SC-010). A Server Action devolve
 * `ok: true` em todos os caminhos, inclusive quando não faz nada, e esta tela mostra sempre o
 * mesmo texto. Não é descuido nos dois lados: é o requisito. Uma resposta que variasse
 * transformaria a tela num oráculo de quem tem acesso ao sistema.
 *
 * ⚠️ E o texto NÃO diz "enviamos um e-mail para você". Diz "se houver conta ativa" — a diferença
 * importa, porque a primeira frase afirma algo que pode ser falso e ensina o visitante a
 * interpretar o silêncio.
 */
import { useState } from "react";

import { recuperarSenha } from "@/lib/acoes/usuarios";
import { FormularioDeSenha } from "@/app/(auth)/convite/FormularioDeSenha";
import { criarClienteDeNavegador } from "@/lib/supabase/client";
import { useEffect } from "react";

export function FormularioDeRecuperacao() {
  const [temSessao, setTemSessao] = useState<boolean | null>(null);
  const [pedido, setPedido] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const supabase = criarClienteDeNavegador();

    // ⚠️ NÃO BASTA UM `getSession()`. O link de convite traz o token no FRAGMENTO da URL, e o
    // cliente o processa de forma ASSÍNCRONA depois de montar. Um `getSession()` disparado no
    // primeiro `useEffect` corre com esse processamento e costuma perder: a tela então diz
    // "link inválido" com um link perfeitamente válido — que é o pior erro possível aqui, porque
    // manda a pessoa pedir outro convite sem necessidade.
    //
    // `onAuthStateChange` cobre a corrida: dispara quando a sessão aparece, venha ela do
    // armazenamento ou do fragmento.
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setTemSessao(Boolean(sessao));
    });

    // E o `getSession()` continua, para o caso de a sessão JÁ existir quando a tela monta —
    // situação em que `onAuthStateChange` não dispara nada.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTemSessao(true);
      else setTimeout(() => setTemSessao((atual) => atual ?? false), 1500);
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  if (temSessao === null) return <p className="mt-6 text-sm">Carregando…</p>;

  // O link trouxe a pessoa de volta com sessão de recuperação: aqui ela define a nova senha.
  if (temSessao) return <FormularioDeSenha rotulo="Salvar nova senha" />;

  if (pedido) {
    return (
      <p role="status" className="mt-6 text-sm">
        Se houver uma conta <strong>ativa</strong> com este e-mail, um link de recuperação foi
        enviado. O link é de uso único e tem validade limitada.
      </p>
    );
  }

  async function pedir(dados: FormData) {
    setEnviando(true);
    // O resultado é ignorado de propósito: ele é sempre `ok`. Ver o cabeçalho.
    await recuperarSenha({ email: String(dados.get("email") ?? "") });
    setPedido(true);
    setEnviando(false);
  }

  return (
    <form action={pedir} className="mt-6 space-y-3">
      <label className="block text-sm">
        E-mail cadastrado
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      <button type="submit" disabled={enviando} className="w-full rounded border px-3 py-2 text-sm">
        {enviando ? "Enviando…" : "Enviar link de recuperação"}
      </button>
    </form>
  );
}

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

    // ⚠️ O TOKEN VEM NO FRAGMENTO, E O CLIENTE NÃO O PEGA SOZINHO. `createBrowserClient` do
    // `@supabase/ssr` usa fluxo **PKCE** por padrão: ele procura `?code=` na query e IGNORA o
    // `#access_token=` que o endpoint de verificação do convite devolve. O resultado, sem isto,
    // é a tela dizer "link inválido" com um link perfeitamente bom — e mandar a pessoa pedir
    // outro convite sem necessidade.
    //
    // `setSession` com o que veio no fragmento resolve, e vale para os dois fluxos.
    const fragmento = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const acesso = fragmento.get("access_token");
    const renovacao = fragmento.get("refresh_token");

    if (acesso && renovacao) {
      void supabase.auth
        .setSession({ access_token: acesso, refresh_token: renovacao })
        .then(({ error }) => setTemSessao(!error));
      return () => assinatura.subscription.unsubscribe();
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTemSessao(true);
      else setTimeout(() => setTemSessao((atual) => atual ?? false), 1500);
    });

    return () => assinatura.subscription.unsubscribe();
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

    /*
     * ⚠️ SEM ESTA CHAMADA, A PESSOA AUTENTICA E NÃO ENTRA. `convidar()` cria a linha de
     * `usuarios` com `auth_user_id` NULO — a janela do FR-008 —, e até 11/09/2026 **nada
     * no sistema a preenchia de volta**: nem código, nem gatilho. `usuarioDaSessao()`
     * procura a linha por essa coluna, não achava, e o layout de `(app)` devolvia para
     * `/login`. Como a raiz é estática e renderiza sem sessão, o efeito parecia senha
     * errada — e era espelho aberto.
     *
     * ⚠️ O VÍNCULO É DO BANCO, NÃO DAQUI. A função não recebe parâmetro: ela lê o e-mail
     * de `auth.users` pelo `auth.uid()` da sessão. Passar o e-mail daqui seria deixar o
     * cliente escolher de quem é o cadastro que ele assume.
     *
     * ⚠️ FALHA EM SILÊNCIO DE PROPÓSITO, e só aqui: a senha **já foi gravada**, e barrar a
     * tela agora deixaria a pessoa sem senha nova e sem entrada. O caso em que devolve
     * `false` — cadastro inativo, ou vínculo já feito — é indistinguível de sucesso para
     * quem está olhando, e o portão que cobra o espelho é o teste, não esta linha.
     */
    await supabase.rpc("vincular_credencial");

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
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca mt-1 w-full border px-2 py-1 focus-visible:ring-2 focus-visible:outline-none"
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
          className="border-borda-forte bg-superficie text-texto rounded-ciaara focus-visible:ring-marca mt-1 w-full border px-2 py-1 focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>

      {erro ? (
        <p
          role="alert"
          className="border-conflito-borda bg-conflito-fundo text-conflito-tinta rounded-ciaara border px-3 py-2 text-sm"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="border-marca bg-marca text-marca-contraste rounded-ciaara focus-visible:ring-marca w-full border px-3 py-2 text-sm font-medium disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {enviando ? "Salvando…" : rotulo}
      </button>
    </form>
  );
}

"use client";

/**
 * O formulário de login.
 *
 * ⚠️ `"use client"` SÓ EM FOLHA. Este componente é a folha: `page.tsx` continua Server Component,
 * e o marcador não sobe para a árvore. Pôr `"use client"` na página mandaria tudo o que ela
 * importa para o bundle.
 *
 * ⚠️ A AUTENTICAÇÃO ACONTECE NO CLIENTE de propósito. É o cliente do navegador que precisa gravar
 * o cookie de sessão; fazê-la numa Server Action exigiria devolver o token pela resposta, e o
 * token não deve transitar por onde não precisa.
 *
 * ⚠️ A MENSAGEM DE ERRO É A MESMA para e-mail inexistente e senha errada. Distinguir as duas faria
 * a tela dizer quem tem conta no sistema — que é a mesma razão pela qual a recuperação de senha
 * responde igual nos dois casos (FR-019).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

import { registrarAcesso } from "@/lib/acoes/sessao";
import { caminhoDeRetorno } from "@/lib/navegacao/destino-seguro";
import { criarClienteDeNavegador } from "@/lib/supabase/client";

export function FormularioDeLogin({ destino }: { readonly destino: string }) {
  const roteador = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(dados: FormData) {
    setEnviando(true);
    setErro(null);

    const supabase = criarClienteDeNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(dados.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: String(dados.get("senha") ?? ""),
    });

    if (error) {
      setErro("E-mail ou senha incorretos.");
      setEnviando(false);
      return;
    }

    // ⚠️ `ultimo_acesso` é carimbado AQUI, uma vez por sessão (FR-026). A escrita falha em
    // silêncio de propósito: não registrar o acesso é perda de auditoria, não motivo para
    // impedir alguém de trabalhar. O que não pode é passar despercebido — daí o teste.
    await registrarAcesso();

    // `refresh()` antes de navegar: o layout de `(app)` lê o usuário no servidor, e sem isto a
    // primeira renderização usaria a árvore em cache, sem sessão.
    roteador.refresh();
    /*
     * ⚠️ A GUARDA ANTERIOR ERA `destino.startsWith("/")`, E ELA NÃO PROTEGIA NADA. Um endereço
     * começando com **duas** barras é relativo ao protocolo: o navegador o resolve para outro host
     * mantendo só o esquema — **e ele começa com barra**. Passava direto, e o link de retorno
     * terminava fora do sistema depois do login.
     *
     * ⚠️ CORRIGIDO EM 11/09/2026, e a diferença não é de rigor, é de pergunta: procurar padrões
     * proibidos na cadeia pergunta *"isto parece perigoso?"* e erra pelo caso que ninguém pensou.
     * `caminhoDeRetorno` resolve o destino contra a origem desta janela e pergunta *"isto é meu?"*.
     */
    roteador.replace(caminhoDeRetorno(destino, window.location.origin));
  }

  return (
    <form action={entrar} className="mt-6 space-y-3">
      <label className="block text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      <label className="block text-sm">
        Senha
        <input
          name="senha"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>

      {erro ? (
        <p role="alert" className="text-sm">
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="w-full rounded border px-3 py-2 text-sm">
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

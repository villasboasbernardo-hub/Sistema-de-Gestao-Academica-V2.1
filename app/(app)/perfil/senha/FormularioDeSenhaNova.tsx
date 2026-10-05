"use client";

/**
 * O formulário da senha nova (`FR-030` a `FR-032`). Folha — o `"use client"` para aqui.
 *
 * ⚠️ **A DIVERGÊNCIA ENTRE AS DUAS DIGITAÇÕES É RECUSADA ANTES DE QUALQUER ENVIO**, e isso é
 * requisito, não otimização: mandar ao servidor duas senhas que não coincidem é pedir que ele decida
 * qual delas a pessoa quis. A regra está em `lib/dominio/politica-de-senha.ts`, é pura, e a **mesma**
 * função roda no servidor — não são duas regras, é uma, chamada de dois lugares.
 *
 * ⚠️ **E ELA NÃO É A GARANTIA DO MÍNIMO.** Quem impõe 12 caracteres é o servidor de autenticação, e
 * `tests/invariantes/rls/politica-de-senha.test.ts` o prova pelo caminho real. Aqui a conferência
 * existe para a recusa sair **em português**, em vez de *"Password should be at least 12
 * characters"*.
 */
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trocarPropriaSenha } from "@/lib/acoes/perfil";
import { conferirConfirmacao, MINIMO_DE_CARACTERES } from "@/lib/dominio/politica-de-senha";

export function FormularioDeSenhaNova() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  async function gravar(dados: FormData) {
    setMensagem(null);
    setErro(null);

    const senha = String(dados.get("senha") ?? "");
    const confirmacao = String(dados.get("confirmacao") ?? "");

    // ⚠️ Antes de qualquer chamada. O veredito traz a FRASE, e é ela que a tela mostra.
    const veredito = conferirConfirmacao(senha, confirmacao);
    if (!veredito.aceita) {
      setErro(veredito.motivo);
      return;
    }

    setGravando(true);
    const resultado = await trocarPropriaSenha({ senha, confirmacao });
    if (resultado.ok) setMensagem("Senha trocada. Use a nova na próxima entrada.");
    else setErro(resultado.erro);
    setGravando(false);
  }

  return (
    <form action={gravar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="senha">Senha nova</Label>
        {/*
          ⚠️ **SEM `minLength` NO CAMPO, e é decisão.** O atributo faz o navegador recusar com uma
             bolha em inglês, escrita pelo sistema operacional, que ignora a frase do `FR-032`. A
             recusa desta tela é a nossa, em português, e vem da mesma função que o servidor usa.
        */}
        <Input id="senha" name="senha" type="password" required autoComplete="new-password" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="confirmacao">Repita a senha nova</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      <div>
        <Button type="submit" disabled={gravando}>
          {gravando ? "Trocando…" : "Trocar senha"}
        </Button>
      </div>

      {mensagem ? (
        <p role="status" className="text-texto-suave text-sm">
          {mensagem}
        </p>
      ) : null}
      {erro ? (
        <p role="alert" className="text-conflito-tinta text-sm">
          {erro}
        </p>
      ) : null}

      {/* veste: dica do mínimo, repetida junto do botão para quem já rolou a tela */}
      <span className="text-texto-tenue text-xs">Mínimo de {MINIMO_DE_CARACTERES} caracteres.</span>
    </form>
  );
}

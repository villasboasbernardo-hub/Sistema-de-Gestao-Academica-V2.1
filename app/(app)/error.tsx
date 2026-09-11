/**
 * Contenção de erro do grupo autenticado (`FR-020`, `RN-DEG-01`, Princípio V).
 *
 * ⚠️ **A FALHA DE UMA REGIÃO NÃO DERRUBA A CASCA**, e é essa a razão de a contenção ser por segmento
 * em vez de uma só na raiz. Aqui a pessoa continua com cabeçalho, menu e sessão: é a diferença entre
 * uma tela com um painel quebrado e uma sessão perdida.
 *
 * ⚠️ **E O ERRO NÃO DESCARTA A NAVEGAÇÃO.** Quem cai aqui tem duas saídas visíveis — tentar de novo,
 * ou ir para outra tela pelo menu, que continua ao lado.
 */
"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErroNoApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CIAARA-11] falha numa tela autenticada:", error);
  }, [error]);

  return (
    <div role="alert" className="flex max-w-2xl flex-col gap-3">
      <h1 className="text-texto text-lg font-semibold">Algo falhou nesta tela</h1>
      <p className="text-texto-suave text-sm">
        A falha foi contida aqui. A sessão continua aberta e as outras telas seguem disponíveis pelo
        menu ao lado.
      </p>

      <pre className="bg-superficie-2 rounded-ciaara text-texto-suave p-3 text-xs whitespace-pre-wrap">
        {error.message}
      </pre>

      {error.digest ? (
        /* veste: o rótulo "Referência para o suporte"; o identificador ao lado é dado, e
           por isso ele NÃO é pintado por este token */
        <p className="text-xs">
          <span className="text-texto-tenue">Referência para o suporte:</span>{" "}
          <span className="text-texto-suave">{error.digest}</span>
        </p>
      ) : null}

      <div>
        <Button type="button" size="sm" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

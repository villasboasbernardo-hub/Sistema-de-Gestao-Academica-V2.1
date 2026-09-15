/**
 * Contenção de erro do cadastro de instrutor (`RN-DEG-01`, Princípio V).
 *
 * ⚠️ **A FALHA DE UMA TELA NÃO DERRUBA A CASCA.** A pessoa continua com cabeçalho, menu e sessão, e
 * tem duas saídas visíveis: tentar de novo, ou ir para outra tela pelo menu.
 */
"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErroNoCadastroDeInstrutor({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CIAARA-11] falha no cadastro de instrutor:", error);
  }, [error]);

  return (
    <div role="alert" className="flex max-w-2xl flex-col gap-3">
      <h1 className="text-texto text-lg font-semibold">Algo falhou nesta tela</h1>
      <p className="text-texto-suave text-sm">
        A falha foi contida aqui. A sessão continua aberta e as outras telas seguem disponíveis pelo
        menu ao lado.
      </p>

      {error.digest ? (
        /* veste: o rótulo "Referência para o suporte"; o identificador ao lado é dado */
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

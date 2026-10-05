/**
 * Contenção de erro da semana do DSA (`RN-DEG-01`, Princípio V).
 *
 * ⚠️ **A FALHA DESTA TELA NÃO DERRUBA A CASCA.** A pessoa continua com cabeçalho, menu e sessão, e
 * continua alcançando a ficha da turma — é dela que se chega aqui.
 */
"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErroNoDsa({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CIAARA-11] falha na semana do DSA:", error);
  }, [error]);

  return (
    <section role="alert" className="flex flex-col items-start gap-3">
      <h1 className="text-lg font-semibold text-texto">Algo falhou nesta tela</h1>
      <p className="max-w-prose text-texto">
        Não foi possível montar a semana. Os lançamentos continuam gravados — o que falhou é a
        leitura desta tela.
      </p>
      <Button onClick={reset}>Tentar de novo</Button>
      <pre data-diag>{error.message}</pre>
    </section>
  );
}

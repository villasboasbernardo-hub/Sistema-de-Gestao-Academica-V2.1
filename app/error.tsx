"use client";

/**
 * Degradação segura no segmento raiz (FR-019, RN-DEG-01, Princípio V).
 *
 * "Dependência ausente devolve vazio/neutro com aviso, nunca exceção não tratada." Aqui isso vira:
 * a falha é contida, explicada em português, e oferece a ação certa. A causa mais provável no
 * Épico 0 é `.env.local` não preenchido — por isso o aviso diz o que fazer, não só o que quebrou.
 */
import { useEffect } from "react";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CIAARA-11] falha no segmento raiz:", error);
  }, [error]);

  const pareceConfiguracao = error.message.includes("Configuração incompleta");

  return (
    <main style={{ padding: "2rem", maxWidth: "48rem", margin: "0 auto", lineHeight: 1.6 }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        {pareceConfiguracao ? "Configuração incompleta" : "Algo falhou nesta tela"}
      </h1>

      <p>
        {pareceConfiguracao
          ? "O sistema subiu, mas falta preencher variáveis de ambiente. Nada foi perdido."
          : "A falha foi contida nesta tela. O resto do sistema continua disponível."}
      </p>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#f4f4f5",
          padding: "1rem",
          borderRadius: "0.375rem",
          fontSize: "0.875rem",
        }}
      >
        {error.message}
      </pre>

      {error.digest ? <p style={{ fontSize: "0.875rem" }}>Referência: {error.digest}</p> : null}

      <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        Tentar novamente
      </button>
    </main>
  );
}

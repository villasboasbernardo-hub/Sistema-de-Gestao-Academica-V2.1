/**
 * Tela para onde o middleware manda a requisição quando falta configuração (FR-005.1).
 *
 * ⚠️ ELA É O QUE FAZ O `RN-DEG-01` SER CUMPRIDO, e não excetuado. Negar a rota protegida sem dizer
 * nada seria uma exceção não tratada com outra roupa. O princípio pede "vazio/neutro com aviso" —
 * esta é a tela do aviso.
 *
 * Diz QUAL variável falta e para que ela serve. **Nunca mostra valor de configuração.**
 */
import { conferirAmbiente } from "@/lib/ambiente";

export default function SemConfiguracao() {
  const faltas = conferirAmbiente();

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-lg font-semibold">Configuração incompleta</h1>
      <p className="mt-2 text-sm">
        O acesso às telas do sistema está bloqueado até que o ambiente esteja configurado. Isto é
        deliberado: sem estas variáveis não há como validar sessão, e seguir em frente abriria a
        rota protegida.
      </p>
      <ul className="mt-4 space-y-1 text-sm">
        {faltas.map((f) => (
          <li key={f.variavel}>
            <code>{f.variavel}</code> — {f.paraQueServe}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm opacity-80">
        Copie o modelo com <code>cp .env.local.example .env.local</code> e preencha os valores do
        seu ambiente.
      </p>
    </main>
  );
}

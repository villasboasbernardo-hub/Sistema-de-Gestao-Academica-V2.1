/**
 * Página inicial provisória do Épico 0.
 *
 * O sistema ainda não tem tela de negócio — isso é dos épicos 4 em diante (FR-020). O que esta
 * página faz é o que o Épico 0 promete: mostrar que a fundação está de pé e, se a configuração
 * estiver incompleta, **dizer qual variável falta** em vez de quebrar (FR-003, RN-DEG-01).
 */
import { ambienteAtual, conferirAmbiente, mensagemDeConfiguracaoIncompleta } from "@/lib/ambiente";

export default function Inicio() {
  const faltas = conferirAmbiente();
  const aviso = mensagemDeConfiguracaoIncompleta(faltas);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">CIAARA-11 · Gestão Acadêmica</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Versão 2.1 — Épico 0 (Fundação). Ambiente: <strong>{ambienteAtual()}</strong>.
        </p>
      </header>

      {aviso ? (
        <section className="rounded-md border border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/30">
          <h2 className="font-semibold">Configuração incompleta</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm">{aviso}</pre>
        </section>
      ) : (
        <section className="rounded-md border border-emerald-400 bg-emerald-50 p-4 dark:bg-emerald-950/30">
          <h2 className="font-semibold">Fundação de pé</h2>
          <p className="text-sm">
            Variáveis de ambiente completas. Nenhuma tabela de negócio existe ainda — o schema é o
            Épico 1.
          </p>
        </section>
      )}

      <footer className="text-sm text-zinc-600 dark:text-zinc-400">
        <p>
          A produção do CIAARA-11 continua sendo a <strong>v2.0</strong> até o corte. Esta é a
          plataforma nova, no mesmo domínio.
        </p>
      </footer>
    </main>
  );
}

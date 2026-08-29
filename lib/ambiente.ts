/**
 * Leitura validada das variáveis de ambiente.
 *
 * POR QUÊ (FR-003, RN-DEG-01 — Princípio V): variável ausente devolve **aviso legível**, nunca
 * exceção não tratada com stack trace na cara de quem só queria abrir o sistema. Quem chega ao
 * projeto e esquece de copiar o `.env.local.example` precisa ser informado de QUAL variável falta —
 * não receber uma tela branca.
 *
 * POR QUÊ AQUI (FR-022.2): o rótulo de ambiente é lido do mesmo lugar que a URL do banco, para que
 * a correspondência rótulo ↔ projeto seja conferível num só ponto. Rótulo mentiroso é pior que
 * rótulo ausente — é o defeito que o FR-017 existe para evitar.
 *
 * Contrato completo: specs/001-fundacao-repositorio-ci/contracts/variaveis-ambiente.md
 */

export type Ambiente = "local" | "preview" | "producao";

/** Falta de configuração — não é falha de programa. Coletada e apresentada, nunca lançada crua. */
export type FaltaDeConfiguracao = {
  readonly variavel: string;
  readonly paraQueServe: string;
};

const NECESSARIAS_NO_NAVEGADOR = [
  {
    variavel: "NEXT_PUBLIC_SUPABASE_URL",
    paraQueServe: "endereço da API do Supabase",
  },
  {
    variavel: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    paraQueServe: "chave pública do Supabase (papel anon/authenticated; a RLS é quem protege)",
  },
] as const;

/**
 * Devolve o que falta, em vez de explodir. Lista vazia = ambiente completo.
 * Chamado pelos clientes e pela faixa de ambiente.
 */
export function conferirAmbiente(): readonly FaltaDeConfiguracao[] {
  return NECESSARIAS_NO_NAVEGADOR.filter(({ variavel }) => {
    const valor = process.env[variavel];
    return valor === undefined || valor.trim() === "";
  }).map(({ variavel, paraQueServe }) => ({ variavel, paraQueServe }));
}

/** Mensagem para humano. Usada por `app/error.tsx` e pela faixa de ambiente. */
export function mensagemDeConfiguracaoIncompleta(
  faltas: readonly FaltaDeConfiguracao[],
): string | null {
  if (faltas.length === 0) return null;
  const lista = faltas.map((f) => `  • ${f.variavel} — ${f.paraQueServe}`).join("\n");
  return [
    "Configuração incompleta. Falta preencher no `.env.local`:",
    lista,
    "",
    "Copie o modelo com `cp .env.local.example .env.local` e preencha os valores do seu ambiente.",
  ].join("\n");
}

/**
 * URL e chave pública do Supabase.
 *
 * Lança **apenas** quando alcançado sem configuração — e a mensagem diz o que fazer. Os chamadores
 * de tela devem consultar `conferirAmbiente()` antes, para degradar com aviso (RN-DEG-01) em vez de
 * deixar a exceção subir.
 */
export function credenciaisPublicasDoSupabase(): { url: string; chaveAnonima: string } {
  const faltas = conferirAmbiente();
  if (faltas.length > 0) {
    throw new Error(mensagemDeConfiguracaoIncompleta(faltas) ?? "Configuração incompleta.");
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    chaveAnonima: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}

/**
 * Rótulo do ambiente. `local` é o padrão seguro: na dúvida, o sistema se apresenta como o ambiente
 * em que registrar aula não tem consequência.
 */
export function ambienteAtual(): Ambiente {
  const bruto = process.env.NEXT_PUBLIC_AMBIENTE?.trim();
  return bruto === "preview" || bruto === "producao" ? bruto : "local";
}

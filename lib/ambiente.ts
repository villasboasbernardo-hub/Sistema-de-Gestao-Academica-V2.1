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

/**
 * ⚠️ DUAS COISAS PRECISAM SER VERDADE AO MESMO TEMPO AQUI, e a forma abaixo é o que as concilia.
 *
 * **1. O acesso tem de ser LITERAL.** O Next substitui `process.env.NEXT_PUBLIC_FOO` pelo valor
 * no momento do build, e só quando o acesso é literal. `process.env[variavel]`, com a chave numa
 * variável, **não é analisável estaticamente**: não é substituído, e no navegador devolve
 * `undefined` para tudo.
 *
 * A versão anterior fazia exatamente isso. Passou despercebida desde o Épico 0 porque nenhum
 * componente de cliente chamava esta função — no servidor `process.env` é um objeto de verdade e
 * a leitura dinâmica funciona. No Épico 3 o formulário de login passou a chamá-la, e a tela abriu
 * dizendo que **todas** as variáveis faltavam, com o `.env.local` inteiro preenchido.
 *
 * **2. A leitura tem de ser TARDIA.** Uma constante de módulo congelaria o valor no carregamento,
 * e os testes que mutam `process.env` deixariam de medir qualquer coisa.
 *
 * Literal **dentro de função** atende às duas: o Next inlina no build, e o Node reavalia a cada
 * chamada.
 */
function necessariasNoNavegador() {
  return [
    {
      variavel: "NEXT_PUBLIC_SUPABASE_URL",
      valor: process.env.NEXT_PUBLIC_SUPABASE_URL,
      paraQueServe: "endereço da API do Supabase",
    },
    {
      variavel: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      valor: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      paraQueServe: "chave pública do Supabase (papel anon/authenticated; a RLS é quem protege)",
    },
    {
      variavel: "NEXT_PUBLIC_URL_APLICACAO",
      valor: process.env.NEXT_PUBLIC_URL_APLICACAO,
      paraQueServe:
        "URL canônica desta instância, usada nos links de convite e de recuperação de senha",
    },
  ] as const;
}

/**
 * Devolve o que falta, em vez de explodir. Lista vazia = ambiente completo.
 * Chamado pelos clientes e pela faixa de ambiente.
 */
export function conferirAmbiente(): readonly FaltaDeConfiguracao[] {
  return necessariasNoNavegador()
    .filter(({ valor }) => valor === undefined || valor.trim() === "")
    .map(({ variavel, paraQueServe }) => ({ variavel, paraQueServe }));
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
/**
 * URL canônica desta instância, para montar links de convite e de recuperação.
 *
 * ⚠️ POR QUE ELA É PERIGOSA QUANDO ERRADA: o fluxo inteiro FUNCIONA com o valor errado. O convite
 * sai, o e-mail chega, a pessoa clica, define a senha — no ambiente errado. Nenhum teste pega,
 * porque nada falha. Por isso ela entra em `conferirAmbiente()`: ausente, o middleware nega a rota
 * protegida (FR-005.1) em vez de deixar o sistema montar links para lugar nenhum.
 *
 * Sem barra ao final, sempre — quem monta o caminho acrescenta a sua.
 */
export function urlDaAplicacao(): string {
  const bruto = process.env.NEXT_PUBLIC_URL_APLICACAO?.trim();
  if (!bruto) {
    throw new Error(
      mensagemDeConfiguracaoIncompleta(conferirAmbiente()) ??
        "NEXT_PUBLIC_URL_APLICACAO não configurada.",
    );
  }
  return bruto.replace(/\/+$/, "");
}

export function ambienteAtual(): Ambiente {
  const bruto = process.env.NEXT_PUBLIC_AMBIENTE?.trim();
  return bruto === "preview" || bruto === "producao" ? bruto : "local";
}

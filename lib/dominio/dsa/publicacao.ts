/**
 * A situação da semana do DSA e o que se pode fazer nela — spec 024 (Bloco 9).
 *
 * > **RP-1.** Antes da primeira publicação, editar é livre; depois dela, toda mudança é uma alteração numerada, com
 * > justificativa.
 * > **RP-3.** Tela do DSA: mostra a situação da semana (em preenchimento, registrado, publicado, ALT N, ou *alteração em
 * > andamento*) e o **histórico**: original e alterações, com data, autor, justificativa e **Reimprimir** de cada uma.
 * > **RP-4.** Se algo de fora mudar uma semana publicada (…), o DSA avisa *"alterado desde a publicação"* e pede uma
 * > alteração para republicar. Nunca muda a versão publicada em silêncio.
 * > — `docs/correcoes/regras-da-publicacao-do-dsa.md`, Bernardo Villas Boas, 21 a 23/10/2026
 *
 * ⚠️ **A SITUAÇÃO É DERIVADA**: da trilha `dsa_eventos_da_semana` (só de acréscimo), do número de rascunhos da semana e
 *    de o documento de hoje diferir do retrato publicado. Nada aqui é guardado.
 * ⚠️ **QUEM DECIDE A TRAVA É O BANCO** (`app.semana_do_dsa_travada`, com a mesma regra): esta função decide o que a tela
 *    OFERECE; a recusa, se alguém tentar, vem do servidor.
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.**
 */

export type TipoDeEvento =
  "salvo" | "rascunho_descartado" | "publicado" | "alteracao_iniciada" | "alteracao_publicada";

export type EventoDaSemana = {
  readonly tipo: TipoDeEvento;
  /** ISO, com hora. */
  readonly ocorridoEm: string;
  /** 0 na original; N na alteração; nulo nos demais. */
  readonly numero: number | null;
  readonly justificativa: string | null;
  /** O nome de quem fez, como a tela o mostra. */
  readonly autor: string | null;
  /** O «hoje» com que o retrato foi montado (só nas publicações). */
  readonly hoje: string | null;
};

export type Situacao = "em_preenchimento" | "registrado" | "publicado" | "alteracao_em_andamento";

export type VersaoPublicada = {
  readonly numero: number;
  readonly ocorridoEm: string;
  readonly autor: string | null;
  readonly justificativa: string | null;
};

export type SituacaoDaSemana = {
  readonly situacao: Situacao;
  readonly rascunhos: number;
  readonly travada: boolean;
  /** A última versão publicada (0 = original), ou nulo. */
  readonly versaoVigente: number | null;
  readonly historico: readonly VersaoPublicada[];
  readonly podeSalvar: boolean;
  readonly podeDescartar: boolean;
  readonly podeGerarPrevia: boolean;
  readonly podePublicar: boolean;
  readonly podeFazerAlteracao: boolean;
  readonly podePublicarAlteracao: boolean;
  /** RP-4: publicada, travada, e o documento de hoje difere do retrato. */
  readonly alteradoDesdeAPublicacao: boolean;
};

const ehPublicacao = (e: EventoDaSemana) =>
  e.tipo === "publicado" || e.tipo === "alteracao_publicada";

/**
 * @param eventos a trilha da semana, em qualquer ordem.
 * @param rascunhos quantos rascunhos a semana tem (`quantos_rascunhos_na_semana`).
 * @param documentoDifere o documento montado hoje (só o salvo) difere do retrato da versão vigente.
 */
export function situacaoDaSemana(
  eventos: readonly EventoDaSemana[],
  rascunhos: number,
  documentoDifere: boolean,
): SituacaoDaSemana {
  const ordem = [...eventos].sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));
  const publicacoes = ordem.filter(ehPublicacao);
  const ultimoDeTrava = [...ordem]
    .reverse()
    .find((e) => ehPublicacao(e) || e.tipo === "alteracao_iniciada");
  const publicada = publicacoes.length > 0;
  const emAlteracao = ultimoDeTrava?.tipo === "alteracao_iniciada";
  const travada = publicada && !emAlteracao;
  const salva = ordem.some((e) => e.tipo === "salvo");

  const situacao: Situacao = emAlteracao
    ? "alteracao_em_andamento"
    : travada
      ? "publicado"
      : salva && rascunhos === 0
        ? "registrado"
        : "em_preenchimento";

  const vigente = publicacoes.at(-1);
  return {
    situacao,
    rascunhos,
    travada,
    versaoVigente: vigente?.numero ?? null,
    historico: publicacoes.map((e) => ({
      numero: e.numero ?? 0,
      ocorridoEm: e.ocorridoEm,
      autor: e.autor,
      justificativa: e.justificativa,
    })),
    podeSalvar: !travada && !emAlteracao,
    podeDescartar: !travada && rascunhos > 0,
    podeGerarPrevia: !publicada && situacao === "registrado",
    podePublicar: !publicada && situacao === "registrado",
    podeFazerAlteracao: travada,
    podePublicarAlteracao: emAlteracao,
    alteradoDesdeAPublicacao: travada && documentoDifere,
  };
}

/** O campo ALT do papel: em branco na original e antes de publicar (RP, ciclo); *"ALT N"* na alteração N. */
export function rotuloDoAlt(numero: number | null): string {
  return numero === null || numero === 0 ? "ALT —" : `ALT ${numero}`;
}

/** O texto curto da situação, para a tela. */
export const ROTULO_DA_SITUACAO: Readonly<Record<Situacao, string>> = {
  em_preenchimento: "Em preenchimento",
  registrado: "Registrado",
  publicado: "Publicado",
  alteracao_em_andamento: "Alteração em andamento",
};

function normalizado(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(normalizado);
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.keys(valor as Record<string, unknown>)
        .sort()
        .map((k) => [k, normalizado((valor as Record<string, unknown>)[k])]),
    );
  }
  return valor;
}

/** Dois documentos são o mesmo papel? Pelo conteúdo, sem a ordem das chaves (D-8). */
export function documentosIguais(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalizado(a)) === JSON.stringify(normalizado(b));
}

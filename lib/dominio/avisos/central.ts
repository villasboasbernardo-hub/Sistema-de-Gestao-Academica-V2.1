/**
 * `FR-004` da spec 022 (Bloco 7) — **a central de avisos**: o formato de um aviso, a chave estável, os módulos, o
 * agrupamento e o "não visto".
 *
 * > *"SININHO DE AVISOS no cabeçalho, padrão em todo o sistema: número de avisos, pulso sutil em tons da mesma cor
 * > enquanto houver aviso não visto (respeita "reduzir movimento"), para ao abrir; volta só com aviso novo ("visto" no
 * > navegador, sem banco). Clique leva a uma página só de avisos, agrupados por módulo, cada um com link para onde se
 * > resolve."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **ESTE MÓDULO NÃO DECIDE AVISO NENHUM.** Os predicados são os de sempre (`avisosDoCurso`, `avisosDaTurma`,
 *    `painelDeTurmas`, `alertasDeVista`, `avisosDoCadastro`, os alertas do instrutor…); aqui só se dá a eles uma forma
 *    comum. Decidir de novo seria a segunda regra que a casa proíbe.
 * ⚠️ **A CHAVE É `módulo:tipo:sujeito`**, com o sujeito pelo CÓDIGO (sigla, turma, instrutor) — nunca o nome (o
 *    repositório é público, e a chave fica no navegador de quem usa). É ela que diz se um aviso já foi visto: o mesmo
 *    aviso, no mesmo sujeito, continua visto; o mesmo tipo noutro sujeito é novo.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

export const MODULOS_DE_AVISO = ["cursos", "turmas", "avaliacoes", "instrutores"] as const;
export type ModuloDeAviso = (typeof MODULOS_DE_AVISO)[number];

export const ROTULO_DO_MODULO: Readonly<Record<ModuloDeAviso, string>> = {
  cursos: "Cursos",
  turmas: "Turmas",
  avaliacoes: "Avaliações",
  instrutores: "Instrutores",
};

export type Aviso = {
  readonly chave: string;
  readonly modulo: ModuloDeAviso;
  /** O que está errado, com o sujeito — *"CAHO: propósito do curso não informado"*. */
  readonly titulo: string;
  readonly detalhe: string | null;
  /** O endereço onde o aviso se resolve. */
  readonly destino: string;
};

export type GrupoDeAvisos = {
  readonly modulo: ModuloDeAviso;
  readonly rotulo: string;
  readonly avisos: readonly Aviso[];
};

export function chaveDoAviso(modulo: ModuloDeAviso, tipo: string, sujeito: string): string {
  return `${modulo}:${tipo}:${sujeito}`;
}

/** Os grupos na ordem dos módulos, só os que têm aviso; dentro de cada um, a ordem de chegada. */
export function agruparPorModulo(avisos: readonly Aviso[]): readonly GrupoDeAvisos[] {
  return MODULOS_DE_AVISO.map((modulo) => ({
    modulo,
    rotulo: ROTULO_DO_MODULO[modulo],
    avisos: avisos.filter((a) => a.modulo === modulo),
  })).filter((g) => g.avisos.length > 0);
}

/** As chaves do resumo que ainda não foram vistas neste navegador. */
export function naoVistos(chaves: readonly string[], vistas: readonly string[]): readonly string[] {
  const jaVistas = new Set(vistas);
  return chaves.filter((c) => !jaVistas.has(c));
}

export function haAvisoNovo(chaves: readonly string[], vistas: readonly string[]): boolean {
  return naoVistos(chaves, vistas).length > 0;
}

/**
 * As vistas depois de abrir a página: as de antes mais as que ela mostrou, sem repetir, guardando só as ÚLTIMAS
 * `limite` — o armazenamento do navegador não cresce para sempre, e uma chave antiga que saiu da lista só volta a
 * contar como nova se o aviso voltar depois de muito tempo, que é exatamente quando ele merece o pulso.
 */
export function juntarVistas(
  vistas: readonly string[],
  mostradas: readonly string[],
  limite = 2000,
): readonly string[] {
  const novas = new Set(mostradas);
  const juntas = [...vistas.filter((v) => !novas.has(v)), ...novas];
  return juntas.slice(Math.max(0, juntas.length - limite));
}

/** O nome acessível do sininho: o número e se há aviso novo — o pulso nunca é a única via (`RNF-USA-05`). */
export function rotuloDoSininho(total: number, novo: boolean): string {
  if (total === 0) return "Avisos: nenhum";
  return novo ? `Avisos: ${total}, com aviso novo` : `Avisos: ${total}`;
}

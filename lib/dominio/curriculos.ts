/**
 * RC-3 — a vigência do currículo, e o nome dele na tela (RC-12).
 *
 * > *"RC-3 · Vigência. Cada currículo tem uma data de início de vigência. É **vigente** o de maior início de vigência
 * > ≤ hoje; **futuro** é o de início depois de hoje; os demais são **passados**. Nada é amarrado a um ano específico:
 * > o sistema acompanha muitos anos."*
 * > *"RC-12 · Nome na tela. "Currículo N", com o ano de início da vigência. A palavra "versão" fica só no código, se
 * > precisar."*
 * > — regras de negócio do currículo, Bernardo Villas Boas, 21/10/2026 (`docs/correcoes/regras-do-curriculo-bloco-6.md`)
 *
 * ⚠️ **É A MESMA REGRA DE `app.curriculo_vigente`** (migration `20261021030049`), que escolhe o currículo de uma turma
 *    nova: entre os ativos e não arquivados, o de maior `vigente_de` ≤ a data; sem nenhum (data antes do primeiro), o
 *    primeiro. Duas regras para a mesma pergunta divergiriam em silêncio — o teste desta função a confere caso a caso.
 * ⚠️ **HOJE É ARGUMENTO** (`hojeNaCiaara()`, São Paulo), como em toda função pura daqui: lido do relógio aqui dentro, o
 *    veredito mudaria à meia-noite e o teste de hoje reprovaria amanhã.
 * ⚠️ **SÓ O ARQUIVADO É GUARDADO** (RC-3, RC-10): vigente, futuro e passado saem da data, nunca de coluna.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** O mínimo que um currículo precisa trazer — as colunas de `curriculos`, como o banco as devolve. */
export type CurriculoParaVigencia = {
  readonly versao: number;
  /** `yyyy-mm-dd`. */
  readonly vigente_de: string;
  readonly status: string;
  /** Nulo = não arquivado (RC-10). */
  readonly arquivado_em: string | null;
};

export type SituacaoDoCurriculo = "vigente" | "futuro" | "passado";

/** Os que contam para a vigência: ativos (exclusão lógica) e não arquivados. */
function candidatos<T extends CurriculoParaVigencia>(curriculos: readonly T[]): T[] {
  return curriculos.filter((c) => c.status === "ativo" && c.arquivado_em === null);
}

/** Ordem da vigência: a data e, no empate impossível (o banco recusa), o número. */
function porVigencia(a: CurriculoParaVigencia, b: CurriculoParaVigencia): number {
  return a.vigente_de < b.vigente_de ? -1 : a.vigente_de > b.vigente_de ? 1 : a.versao - b.versao;
}

/**
 * O currículo vigente numa data: o de maior `vigente_de` ≤ a data; sem nenhum, o primeiro; sem candidato, `null`.
 * É também o PADRÃO de uma turma nova (RC-4), com a data de início dela.
 */
export function curriculoVigenteEm<T extends CurriculoParaVigencia>(
  curriculos: readonly T[],
  data: string,
): T | null {
  const ordenados = candidatos(curriculos).sort(porVigencia);
  const ate = ordenados.filter((c) => c.vigente_de <= data);
  return ate.at(-1) ?? ordenados[0] ?? null;
}

/**
 * Vigente, futuro ou passado, hoje (RC-3). O arquivado é passado por construção (RC-10 só arquiva o passado).
 * ⚠️ O "primeiro" que vale na falta de vigente (todos começam depois de hoje) é FUTURO: ele só é o padrão de turma.
 */
export function situacaoDoCurriculo<T extends CurriculoParaVigencia>(
  curriculo: T,
  curriculos: readonly T[],
  hoje: string,
): SituacaoDoCurriculo {
  if (curriculo.vigente_de > hoje) return "futuro";
  const vigente = curriculoVigenteEm(
    curriculos.filter((c) => c.vigente_de <= hoje),
    hoje,
  );
  return vigente !== null && vigente.versao === curriculo.versao ? "vigente" : "passado";
}

/** "Currículo N (vigência AAAA)" — o nome do currículo em toda tela (RC-12, RC-9). */
export function rotuloDoCurriculo(
  curriculo: Pick<CurriculoParaVigencia, "versao" | "vigente_de">,
): string {
  return `Currículo ${curriculo.versao} (vigência ${curriculo.vigente_de.slice(0, 4)})`;
}

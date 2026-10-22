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

/** O nome da situação na tela (RC-3, RC-10). */
export const ROTULO_DA_SITUACAO: Readonly<Record<SituacaoDoCurriculo | "arquivado", string>> = {
  vigente: "vigente",
  futuro: "futuro",
  passado: "passado",
  arquivado: "arquivado",
};

/** Uma opção do seletor de currículo da página do curso (RC-8). */
export type OpcaoDeCurriculo<T> = {
  readonly curriculo: T;
  readonly rotulo: string;
  readonly situacao: SituacaoDoCurriculo | "arquivado";
};

/**
 * RC-8 e RC-10 — as opções do seletor: os currículos ativos, do mais novo ao mais antigo, cada um com a situação; o
 * arquivado só aparece quando se pede (`mostrarArquivados`).
 * > *"RC-8 · Página do curso. Tem um seletor de currículo (o vigente por padrão), que alterna entre vigente, futuro e
 * > passados."* · *"RC-10 · (…) Ele sai do seletor, mas não é apagado (regra 4) e pode ser consultado ("mostrar
 * > currículos arquivados")."*
 */
export function opcoesDoSeletor<T extends CurriculoParaVigencia>(
  curriculos: readonly T[],
  hoje: string,
  mostrarArquivados: boolean,
): OpcaoDeCurriculo<T>[] {
  return curriculos
    .filter((c) => c.status === "ativo" && (mostrarArquivados || c.arquivado_em === null))
    .sort((a, b) => b.versao - a.versao)
    .map((c) => ({
      curriculo: c,
      rotulo: rotuloDoCurriculo(c),
      situacao: c.arquivado_em !== null ? "arquivado" : situacaoDoCurriculo(c, curriculos, hoje),
    }));
}

/** O que a página do curso mostra: o currículo pedido na URL, ou o vigente — e o aviso quando o pedido não serve. */
export type CurriculoDaPagina<T> = { readonly curriculo: T | null; readonly aviso: string | null };

/**
 * RC-8 — qual currículo as abas mostram. `?curriculo=N` escolhe o "Currículo N"; vazio, o vigente hoje.
 * ⚠️ PEDIDO QUE NÃO SERVE DEGRADA COM AVISO, nunca em silêncio (a mesma regra do `?turma=`): quem colou um link precisa
 *    saber que está vendo outro currículo.
 * ⚠️ O ARQUIVADO PEDIDO PELO NÚMERO ABRE — consultá-lo é o que a RC-10 garante; ele só não aparece no seletor.
 */
export function curriculoDaPagina<T extends CurriculoParaVigencia>(
  curriculos: readonly T[],
  pedido: string,
  hoje: string,
): CurriculoDaPagina<T> {
  const vigente = curriculoVigenteEm(curriculos, hoje);
  const numero = pedido.trim();
  if (numero === "") return { curriculo: vigente, aviso: null };
  const achado = curriculos.find((c) => c.status === "ativo" && String(c.versao) === numero);
  if (achado) return { curriculo: achado, aviso: null };
  return {
    curriculo: vigente,
    aviso: `O Currículo ${numero} não existe neste curso. Mostrando o vigente.`,
  };
}

/** As opções de currículo de uma turma NOVA (RC-4) e qual vem marcada. */
export type CurriculosParaTurma<T> = {
  readonly opcoes: readonly OpcaoDeCurriculo<T>[];
  readonly padrao: T | null;
};

/**
 * RC-4 — ao criar a turma, escolhe-se o currículo: o vigente ou o futuro; o padrão é o vigente na data de início.
 * > *"RC-4 · (…) Ao criar uma turma, escolhe-se qual currículo ela segue (vigente ou futuro). O padrão é o currículo
 * > vigente na data de início da turma."*
 * ⚠️ O padrão pela DATA DE INÍCIO pode ser um passado (turma registrada com data antiga): ele entra nas opções — é o
 *    mesmo que o banco escolheria sozinho (`app.curriculo_vigente`), e escondê-lo seria escolher outro em silêncio.
 */
export function curriculosParaTurma<T extends CurriculoParaVigencia>(
  curriculos: readonly T[],
  dataInicio: string | null,
  hoje: string,
): CurriculosParaTurma<T> {
  const padrao = curriculoVigenteEm(curriculos, dataInicio ?? hoje);
  const opcoes = opcoesDoSeletor(curriculos, hoje, false).filter(
    (o) => o.situacao !== "passado" || (padrao !== null && o.curriculo.versao === padrao.versao),
  );
  return { opcoes, padrao };
}

/** Por que o currículo não se arquiva — ou `null`, quando se arquiva. */
export type ImpedimentoDoArquivamento = "nao_e_passado" | "turma_nao_arquivada" | "ja_arquivado";

/**
 * RC-10 — o trio arquiva o currículo PASSADO quando TODAS as turmas que o seguem estão arquivadas.
 * > *"RC-10 · Arquivar currículo passado. Quando o currículo novo já está em uso e todas as turmas do currículo passado
 * > estão arquivadas, o trio pode arquivar esse currículo."*
 * ⚠️ É a mesma regra de `public.arquivar_curriculo`, que é quem recusa de verdade; aqui ela só decide se o botão aparece.
 */
export function impedimentoDoArquivamento<T extends CurriculoParaVigencia>(
  curriculo: T,
  curriculos: readonly T[],
  hoje: string,
  turmasQueSeguem: readonly { readonly arquivada: boolean }[],
): ImpedimentoDoArquivamento | null {
  if (curriculo.arquivado_em !== null) return "ja_arquivado";
  if (situacaoDoCurriculo(curriculo, curriculos, hoje) !== "passado") return "nao_e_passado";
  if (turmasQueSeguem.some((t) => !t.arquivada)) return "turma_nao_arquivada";
  return null;
}

/** Por que o currículo não se descarta — ou `null`, quando se descarta. */
export type ImpedimentoDoDescarte = "vigente" | "com_turma";

/**
 * D-19 e D-36 — descartar (exclusão lógica, `status = 'inativo'`) o currículo criado por engano: só o que NENHUMA turma
 * segue, e nunca o vigente (o curso ficaria sem o currículo da turma nova). O passado sai pelo arquivamento (RC-10).
 * ⚠️ O banco recusa o que tem turma de qualquer jeito (`versao_em_uso`); aqui só se decide se o botão aparece.
 */
export function impedimentoDoDescarte<T extends CurriculoParaVigencia>(
  curriculo: T,
  curriculos: readonly T[],
  hoje: string,
  turmasQueSeguem: number,
): ImpedimentoDoDescarte | null {
  if (situacaoDoCurriculo(curriculo, curriculos, hoje) === "vigente") return "vigente";
  if (turmasQueSeguem > 0) return "com_turma";
  return null;
}

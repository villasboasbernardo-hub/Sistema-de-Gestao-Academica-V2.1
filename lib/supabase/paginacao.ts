/**
 * O leitor paginado — toda consulta de **lista** da leitura do DSA passa por aqui (`DP-5` da spec
 * 015, R-3 da pesquisa).
 *
 * > *"a leitura busca em páginas de 1.000 até acabar, para o DSA e para a planilha. NÃO recusar
 * > acima de 1.000."*
 * > — Bernardo Villas Boas, 09/10/2026
 *
 * ⚠️ **O TETO DO POSTGREST CORTA A RESPOSTA SEM ERRO.** `max_rows = 1000` (`supabase/config.toml`)
 * devolve as primeiras mil linhas e mais nada — e uma CH acumulada ou um nº do DSA calculado sobre
 * elas sai errado com cara de certo. Medido no retrato de 08/10/2026: a maior turma tinha 676
 * lançamentos, perto do teto no fim do ano.
 *
 * ⚠️ **CONTAGEM NA PRIMEIRA PÁGINA, AS OUTRAS NUMA RODADA SÓ.** Sabido o total, as páginas são
 * independentes, e um laço que esperasse uma para pedir a seguinte é o `await` em laço que a guarda
 * `FR-045` reprova nas telas. O resultado é o mesmo: todas as páginas, até acabar.
 *
 * ⚠️ **O TAMANHO DA PÁGINA É O QUE O SERVIDOR DEVOLVEU NA PRIMEIRA**, e não um 1.000 fixo: se o
 * remoto tiver um `max_rows` menor que o local, páginas fixas de 1.000 pulariam linhas sem erro.
 *
 * ⚠️ **ERRO DEVOLVE `data: null`, NUNCA PARTE DA LISTA, E NÃO LANÇA** — é o contrato de uma consulta
 * comum do Supabase, e é o que deixa quem lê continuar degradando para vazio com aviso
 * (`RN-DEG-01`). A lista pela metade é o pior resultado possível: ela parece completa.
 *
 * ⚠️ **QUEM PEDE MANDA ORDEM TOTAL** — a ordem que a consulta já tinha, mais um desempate por chave
 * única. Sem ela, duas páginas podem repetir ou pular uma linha, e nada aqui consegue perceber.
 */

/** O `max_rows` do stack local — conferido contra o `config.toml` por teste. */
export const TAMANHO_DA_PAGINA = 1000;

/** O trecho que se pede: `de` e `ate` inclusivos, como o `.range()` do PostgREST. */
export type FaixaDaPagina = {
  readonly de: number;
  readonly ate: number;
  /** Só a primeira página pede a contagem. */
  readonly comContagem: boolean;
};

/** O que uma consulta do Supabase devolve — `data` fica `unknown`, e quem lê faz o molde. */
export type RespostaDaPagina = {
  readonly data: unknown;
  readonly error: { readonly message: string } | null;
  readonly count?: number | null;
};

export type ListaLida = {
  readonly data: unknown[] | null;
  readonly error: { readonly message: string } | null;
};

/** As opções do `.select()` de cada página: `count: "exact"` só na primeira. */
export function contagemNaPrimeira(faixa: FaixaDaPagina): { readonly count: "exact" } | undefined {
  return faixa.comContagem ? { count: "exact" } : undefined;
}

function comoLista(data: unknown): unknown[] {
  return Array.isArray(data) ? data : [];
}

/**
 * Lê todas as páginas de uma consulta. `pedir` monta a consulta inteira — filtros, **ordem total**
 * e `.range(faixa.de, faixa.ate)` — com `.select(colunas, contagemNaPrimeira(faixa))`.
 */
export async function lerTodasAsPaginas(
  pedir: (faixa: FaixaDaPagina) => PromiseLike<RespostaDaPagina>,
): Promise<ListaLida> {
  const primeira = await pedir({ de: 0, ate: TAMANHO_DA_PAGINA - 1, comContagem: true });
  if (primeira.error) return { data: null, error: primeira.error };

  const linhas = comoLista(primeira.data);
  const total = primeira.count;
  /*
   * Sem contagem não há como saber se acabou — devolve a primeira página, que é exatamente o que a
   * leitura fazia antes da paginação. Página vazia também encerra: não há passo para avançar.
   */
  if (typeof total !== "number" || linhas.length >= total || linhas.length === 0) {
    return { data: linhas, error: null };
  }

  const passo = linhas.length;
  const restantes: PromiseLike<RespostaDaPagina>[] = [];
  for (let de = passo; de < total; de += passo) {
    restantes.push(pedir({ de, ate: de + passo - 1, comContagem: false }));
  }
  const respostas = await Promise.all(restantes);
  for (const resposta of respostas) {
    if (resposta.error) return { data: null, error: resposta.error };
    linhas.push(...comoLista(resposta.data));
  }
  return { data: linhas, error: null };
}

/**
 * `RN-ANT-01` — ordenação por antiguidade. **Risco: Alto.**
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção. **Risco: Alto** (é uma diretriz
 * > transversal a praticamente toda a interface; fácil de esquecer em uma tela nova)."*
 * > — documento 04, `RN-ANT-01`
 *
 * `RN-ANT-02` — de onde a antiguidade vem. **Risco: Médio.**
 *
 * > *"A antiguidade é derivada do posto/graduação (`P/G`), não de um campo de banco de dados
 * > dedicado, segundo a escala fixa: CMG=1, CF=2, CC=3, CT=4, 1°Ten=5, 2°Ten=6, SO=7, 1°SG=8,
 * > 2°SG=9, 3°SG=10, CB=11, MN=12 (peso menor = mais antigo). A coluna `Antiguidade` que existe
 * > fisicamente na planilha **não** é mais usada por essa regra […] **Risco: Médio** (confundir a
 * > coluna `Antiguidade` com o peso calculado por `P/G` é o erro mais provável em uma reescrita)."*
 * > — documento 04, `RN-ANT-02`
 *
 * ⚠️ A ESCALA NÃO ESTÁ ESCRITA AQUI, E A AUSÊNCIA É O REQUISITO. Ela vive em `config_listas`
 * (domínio operacional administrável, BRIEF §2) e chega **como argumento**. Uma tabela de doze
 * postos escrita dentro deste arquivo passaria em todo teste desta fatia e violaria o Princípio VII
 * em silêncio — e o dia em que a Marinha criasse um posto, o sistema mentiria sem erro nenhum.
 * A citação acima transcreve a escala porque é o texto da regra; transcrever não é implementar.
 *
 * ⚠️ QUEM CALCULA É ESTA FUNÇÃO; QUEM APLICA É O COMPONENTE. O `FR-020` proíbe o componente de
 * implementar regra `RN-`, e o `FR-011.1` o obriga a ordenar sempre. Não brigam: a diferença está
 * em **quem sabe o critério**. Este arquivo sabe que CMG vem antes de CF; o `SeletorInstrutor` sabe
 * apenas que a lista precisa passar por aqui antes de aparecer.
 */

/** A escala `P/G` → peso, como vem de `config_listas`. Peso menor = mais antigo. */
export type EscalaDeAntiguidade = Readonly<Record<string, number>>;

/** O mínimo que a ordenação precisa saber de alguém. Genérico de propósito. */
export type Ordenavel = {
  readonly pg: string;
  readonly nomeCompleto: string;
};

/**
 * O peso de um `P/G`, ou `null` quando a escala não o conhece.
 *
 * ⚠️ `null` NÃO É ZERO, e a distinção decide o lugar na lista: zero seria o mais antigo de todos, e
 * um posto que a escala não conhece iria parar no topo — o pior lugar possível para um dado que
 * ninguém conferiu.
 *
 * ⚠️ A COMPARAÇÃO É INSENSÍVEL A CAIXA E A ESPAÇO EM VOLTA, porque a planilha de origem mistura as
 * duas formas. Não é normalização de dado: é leitura tolerante de uma chave, e ela não altera nada
 * do que está gravado.
 */
export function pesoAntiguidade(pg: string, escala: EscalaDeAntiguidade): number | null {
  const procurado = pg.trim().toLocaleLowerCase("pt-BR");
  for (const [chave, peso] of Object.entries(escala)) {
    if (chave.trim().toLocaleLowerCase("pt-BR") === procurado) return peso;
  }
  return null;
}

/** O que a ordenação encontrou pelo caminho e não soube resolver sozinha. */
export type AvisoDeAntiguidade = {
  readonly pg: string;
  readonly quantos: number;
  readonly mensagem: string;
};

export type ResultadoDaOrdenacao<T> = {
  readonly ordenados: readonly T[];
  /** ⚠️ Vazio quando a escala cobriu todo mundo. Nunca `null`: ausência de aviso é uma lista vazia. */
  readonly avisos: readonly AvisoDeAntiguidade[];
};

/**
 * Ordena por antiguidade crescente, com empate resolvido por nome.
 *
 * ⚠️ POSTO DESCONHECIDO VAI PARA O FIM, COM AVISO, E **NUNCA SOME** (`RN-DEG-01`). Filtrar o que a
 * escala não conhece seria a saída fácil e a pior: o instrutor desapareceria da lista, e quem
 * procurasse por ele concluiria que não está cadastrado. Aparecer no fim, sinalizado, é o
 * comportamento que permite consertar o dado.
 *
 * ⚠️ O EMPATE É RESOLVIDO POR NOME, E ISSO É DETERMINISMO, NÃO ESTÉTICA. Doze pesos para 177
 * instrutores significa empate em quase toda tela; sem critério de desempate, duas telas com a
 * mesma lista poderiam exibi-la em ordens diferentes, e ninguém saberia qual está certa.
 */
export function ordenarPorAntiguidade<T extends Ordenavel>(
  instrutores: readonly T[],
  escala: EscalaDeAntiguidade,
): ResultadoDaOrdenacao<T> {
  const desconhecidos = new Map<string, number>();

  const comPeso = instrutores.map((instrutor) => {
    const peso = pesoAntiguidade(instrutor.pg, escala);
    if (peso === null) {
      desconhecidos.set(instrutor.pg, (desconhecidos.get(instrutor.pg) ?? 0) + 1);
    }
    return { instrutor, peso };
  });

  const ordenados = comPeso
    .slice()
    .sort((a, b) => {
      // ⚠️ `Infinity` para o desconhecido: ele vai para o fim SEM inventar um peso plausível.
      const pa = a.peso ?? Number.POSITIVE_INFINITY;
      const pb = b.peso ?? Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return a.instrutor.nomeCompleto.localeCompare(b.instrutor.nomeCompleto, "pt-BR");
    })
    .map((x) => x.instrutor);

  const avisos = [...desconhecidos].map(([pg, quantos]) => ({
    pg,
    quantos,
    mensagem:
      `posto ou graduação "${pg}" não está na escala de antiguidade: ${quantos} ` +
      `registro(s) foram para o fim da lista. A escala vive em config_listas — nada foi omitido.`,
  }));

  return { ordenados, avisos };
}

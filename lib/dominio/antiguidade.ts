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
  /**
   * A antiguidade declarada, **só como desempate** entre quem tem o mesmo peso (`FR-002` da spec 006).
   *
   * ⚠️ OPCIONAL, E A AUSÊNCIA TEM LUGAR DEFINIDO: quem não a traz fica no fim do próprio posto, igual
   * ao `coalesce(..., 99999)` de `app.fn_antiguidade_ordem`. Opcional também para que quem só tem
   * posto e nome — o seletor da fatia (b) — continue ordenando como sempre ordenou.
   */
  readonly antiguidadeDeclarada?: number | null;
};

/** Uma linha de `config_listas` da lista `escala_antiguidade`, como a consulta a devolve. */
export type LinhaDaEscala = {
  readonly valor: string;
  readonly ordem: number;
  readonly ativo: boolean;
};

/**
 * `RN-ANT-02` — a escala, montada a partir das linhas de `config_listas` (`FR-003` da spec 006).
 *
 * > *"A antiguidade é derivada do posto/graduação (`P/G`), não de um campo de banco de dados
 * > dedicado, segundo a escala fixa: CMG=1, CF=2, […] MN=12 (peso menor = mais antigo)."*
 * > — documento 04, `RN-ANT-02`
 *
 * ⚠️ ELA NÃO CONHECE POSTO NENHUM, e é para isso que existe: traduz o que a consulta trouxe no
 * formato que a ordenação recebe, sem acrescentar nem corrigir valor. Linha inativa não entra — a
 * escala administrável é a ativa.
 */
export function escalaDeLinhas(linhas: readonly LinhaDaEscala[]): EscalaDeAntiguidade {
  const escala: Record<string, number> = {};
  for (const linha of linhas) {
    if (linha.ativo) escala[linha.valor] = linha.ordem;
  }
  return escala;
}

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
 * Ordena por antiguidade crescente: peso do posto, depois a antiguidade declarada, depois o nome.
 *
 * ⚠️ O DESEMPATE PELA DECLARADA ENTROU EM 15/09/2026 (`FR-002` da spec 006), e alinha esta função ao
 * banco. `app.fn_antiguidade_ordem` sempre desempatou pela declarada; esta função desempatava direto
 * pelo nome, e uma lista ordenada em memória discordaria da ordenada pela consulta. O nome continua
 * como último critério, entre quem não declarou.
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
      // ⚠️ Sem declarada = fim do próprio posto, sem inventar número plausível.
      const da = a.instrutor.antiguidadeDeclarada ?? Number.POSITIVE_INFINITY;
      const db = b.instrutor.antiguidadeDeclarada ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
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

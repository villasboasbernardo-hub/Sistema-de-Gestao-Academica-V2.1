/**
 * O vocabulário dos gráficos (`FR-016` a `FR-018`, documento 23 §7).
 *
 * ⚠️ `forma` E `rotulo` SÃO OBRIGATÓRIOS, E ISSO ESTÁ NO TIPO — não numa convenção. Uma série que
 * dependa só de cor **não compila**, e é assim que o `FR-018` deixa de precisar que alguém lembre.
 *
 * ⚠️ A MEDIÇÃO QUE FORÇOU ISTO: no tema claro, a série 1 (`0,0984`) e a série 8 (`0,0987`) ficam a
 * **0,0003** de luminância uma da outra; no noturno, a 4 e a 7 ficam a **0,0005**. Impressas em
 * cinza, cada par vira a mesma tinta. **A paleta não foi tocada** — ela está mesclada na `main`, e
 * a premissa desta fatia é consumir sem redesenhar. Forma resolve também **na tela**, para quem não
 * distingue cores; reespaçar luminância só resolveria no papel.
 *
 * ⚠️ O DOCUMENTO 23 §7 SE CONTRADIZ SOBRE ISTO. O parágrafo afirma que as oito luminâncias são
 * distintas — e a medição diz que não. A tabela de regras do mesmo §7 manda *"cor nunca é a única
 * codificação: traço tracejado, marcador distinto ou rótulo direto"*. **Este arquivo segue a tabela
 * de regras**; o parágrafo continua errado, e emendá-lo é decisão à parte (achado P-6 do plano).
 *
 * ⚠️ ESTE ARQUIVO NÃO É COMPONENTE E NÃO LEVA MARCADOR DE CLIENTE. São tipos e constantes, e eles
 * precisam ser legíveis também no servidor — a alternativa em tabela dos Épicos 9 e 12 vai lê-los.
 */

/** Um ponto de uma série. `valor` é número **pronto**: agregação é de quem chama. */
export type PontoDeSerie = {
  readonly nome: string;
  readonly valor: number;
};

/**
 * As formas de marcador.
 *
 * ⚠️ SEIS FORMAS PARA OITO CORES, E ISSO BASTA. O documento 23 §7 limita o gráfico a **seis
 * séries** — *"acima disso vira tabela"*. A sétima e a oitava cor existem para categorias dentro de
 * **uma** série, onde o distintivo é o rótulo do eixo, não o marcador.
 */
export type FormaDeMarcador = "circulo" | "quadrado" | "losango" | "triangulo" | "cruz" | "estrela";

/** O de-para para os símbolos da biblioteca de gráficos. */
export const SIMBOLO_DA_FORMA = {
  circulo: "circle",
  quadrado: "square",
  losango: "diamond",
  triangulo: "triangle",
  cruz: "cross",
  estrela: "star",
} as const satisfies Record<FormaDeMarcador, string>;

export type Serie = {
  readonly chave: string;
  /** Sempre presente — vira o rótulo direto, não só a entrada de legenda. */
  readonly rotulo: string;
  /** O que distingue a série quando a cor some. */
  readonly forma: FormaDeMarcador;
  readonly pontos: readonly PontoDeSerie[];
};

/**
 * O teto de séries por gráfico — documento 23 §7.
 *
 * ⚠️ É **RECUSA**, NÃO AVISO. Um gráfico de oito séries já é uma tabela mal desenhada; deixá-lo
 * passar com aviso é deixá-lo passar.
 */
export const MAXIMO_DE_SERIES = 6;

/** Até quantas séries o rótulo direto ainda cabe. Acima disso, a legenda entra como reforço. */
export const MAXIMO_PARA_ROTULO_DIRETO = 4;

/**
 * Até quantas fatias a pizza escreve **nome e percentual** na própria fatia — spec 022 (Bloco 7), item 7.
 *
 * > *"Gráficos de pizza: TODAS as fatias, sem agrupar em «Outras» (desfaz a regra de 5 fatias da Q-11 da spec 016 e o
 * > teto do componente). Legenda legível com muitas fatias."* — Bernardo Villas Boas, 22/10/2026
 *
 * ⚠️ **NÃO É MAIS TETO**: até 22/10/2026 a pizza recusava mais de 5 categorias (documento 23 §7) e a grade de
 *    disciplinas agrupava o resto em "Outras (N)" (`FR-007.2` da spec 016). As duas regras saíram. Acima de 5 fatias o
 *    nome não cabe mais ao lado de cada uma: a fatia leva o **número** dela, e a legenda — numerada, com nome, valor e
 *    percentual — diz o resto. Nenhuma categoria some e nenhuma soma muda.
 */
export const MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO = 5;

/** O percentual de uma fatia, escrito — o olho julga ângulo mal, e o número continua legível sem cor. */
export function percentualDaFatia(valor: number, total: number): string {
  return `${((valor / total) * 100).toFixed(1)}%`;
}

/**
 * O que se escreve junto da fatia: *"nome — x%"* até `MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO` fatias; acima, o
 * **número** da fatia (1, 2, 3…), o mesmo que abre a linha dela na legenda.
 */
export function rotuloDaFatia(
  indice: number,
  ponto: PontoDeSerie,
  total: number,
  quantidade: number,
): string {
  if (quantidade > MAXIMO_DE_FATIAS_COM_ROTULO_COMPLETO) return String(indice + 1);
  return `${ponto.nome} — ${percentualDaFatia(ponto.valor, total)}`;
}

/** As oito séries do ponto único, **em ordem fixa**. */
export const TOKENS_DE_SERIE = [
  "--serie-1",
  "--serie-2",
  "--serie-3",
  "--serie-4",
  "--serie-5",
  "--serie-6",
  "--serie-7",
  "--serie-8",
] as const;

/**
 * A cor da n-ésima série, pela ordem fixa do ponto único (`FR-017`).
 *
 * ⚠️ A ORDEM É FIXA E NÃO SEGUE OS DADOS. Uma paleta que reordena conforme o que chegou faz o
 * leitor **reaprender a legenda a cada recarga** — e num documento institucional impresso em datas
 * diferentes, faz duas cópias do mesmo relatório não conversarem.
 *
 * ⚠️ NENHUMA COR É ESCRITA AQUI: o que sai é uma referência ao token, resolvida pelo tema em tempo
 * de pintura. É por isso que um gráfico acompanha o modo noturno sem uma linha de JavaScript.
 */
export function corDaSerie(indice: number): string {
  const token = TOKENS_DE_SERIE[indice % TOKENS_DE_SERIE.length];
  return `var(${token})`;
}

/** O que o componente faz quando recebe séries demais. */
export type Recusa = { readonly recusado: true; readonly motivo: string };

/**
 * Confere o teto de séries. Devolve `null` quando está tudo bem.
 *
 * ⚠️ ELA É FUNÇÃO E NÃO EXCEÇÃO. Uma tela que derruba a árvore inteira porque um gráfico recebeu
 * sete séries viola a degradação segura (`RN-DEG-01`): o resto da tela continua correto e precisa
 * continuar aparecendo. O gráfico é que se recusa, e diz por quê.
 */
export function conferirTetoDeSeries(series: readonly Serie[]): Recusa | null {
  if (series.length <= MAXIMO_DE_SERIES) return null;
  return {
    recusado: true,
    motivo:
      `${series.length} séries excedem o máximo de ${MAXIMO_DE_SERIES} (documento 23 §7). ` +
      `Acima disso o gráfico vira uma tabela mal desenhada — use a tabela densa.`,
  };
}

/**
 * RT-5 do Bloco 10 (spec 025, D-22) — **todo gráfico é interativo**: clicar na legenda (ou no próprio grupo) oculta e
 * mostra o grupo, e o gráfico se redistribui.
 *
 * > *"Todo gráfico é interativo: clicar na legenda ou na série oculta/mostra o grupo (já existiu em versão antiga)."*
 * > — Bernardo Villas Boas, 24/10/2026 (fecha o `FR-026.6` da spec 006, parado na T119)
 *
 * ⚠️ **O GRUPO VISÍVEL GUARDA O ÍNDICE DE ORIGEM**: a cor e o número da fatia saem dele, e não da posição entre os que
 *    ficaram — ocultar uma fatia não pode repintar as outras (a ordem fixa da paleta, `corDaSerie`).
 * ⚠️ **O ÚLTIMO À VISTA NÃO SE OCULTA**: um gráfico sem grupo nenhum leria como "não há dado".
 */
export type GrupoVisivel<T> = { readonly item: T; readonly indice: number };

/** Os itens cujo nome não está entre os ocultos, na ordem de origem, cada um com o índice de origem. */
export function gruposVisiveis<T>(
  itens: readonly T[],
  nome: (item: T) => string,
  ocultos: ReadonlySet<string>,
): readonly GrupoVisivel<T>[] {
  return itens
    .map((item, indice) => ({ item, indice }))
    .filter(({ item }) => !ocultos.has(nome(item)));
}

/** Oculta o grupo à vista ou mostra o oculto — nunca deixa o gráfico sem nenhum (devolve o mesmo conjunto). */
export function alternarGrupo(
  ocultos: ReadonlySet<string>,
  nome: string,
  todos: readonly string[],
): ReadonlySet<string> {
  const proximo = new Set(ocultos);
  if (proximo.has(nome)) {
    proximo.delete(nome);
    return proximo;
  }
  proximo.add(nome);
  return todos.every((n) => proximo.has(n)) ? ocultos : proximo;
}

/**
 * Os ocultos que AINDA valem para os grupos de agora. ⚠️ O conjunto guardado sobrevive à troca dos dados (um filtro
 * do servidor, uma busca): sem esta poda, o grupo que sumiu continuaria "oculto", e os que sobraram podiam estar todos
 * ocultos — o gráfico vazio que `alternarGrupo` existe para impedir (revisão do PR #90). Sobrando todos ocultos, mostra
 * todos.
 */
export function ocultosEmVigor(
  ocultos: ReadonlySet<string>,
  todos: readonly string[],
): ReadonlySet<string> {
  const valendo = new Set(todos.filter((n) => ocultos.has(n)));
  return todos.length > 0 && valendo.size >= new Set(todos).size ? new Set() : valendo;
}

/** O total dos pontos à vista — a base dos percentuais depois de ocultar (*"o gráfico se redistribui"*). */
export function totalVisivel(pontos: readonly GrupoVisivel<PontoDeSerie>[]): number {
  return pontos.reduce((soma, p) => soma + p.item.valor, 0);
}

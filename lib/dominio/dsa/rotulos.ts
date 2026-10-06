/**
 * O que um fato da semana **diz de si**, na grade e no papel — `RF-DSA-06`, `RF-PDF-01`,
 * `RN-AVAL-02`.
 *
 * > *"A vista de prova NÃO é atividade própria: aplicação e vista são o mesmo fato."*
 * > — `RN-AVAL-02`, documento 04 da Fase 1 (a vista é `UPDATE` na linha da avaliação)
 *
 * ⚠️ **ESTE MÓDULO NASCEU DE QUATRO DIFERENÇAS MEDIDAS**, em 06/10/2026, na carga piloto do
 * `C-Exp-Obs-ME 2026`, comparando o que o sistema imprimia com o DSA assinado:
 *
 * 1. **a vista de prova saía igual à aplicação** — *"Prova Escrita"*, T/E *"PM"*. Como as duas são
 *    a **mesma linha** de `avaliacoes`, chegam com o mesmo conteúdo e a mesma técnica; quem as
 *    separa é a `origem` da ocupação, e nada usava isso para rotular;
 * 2. **o tópico da prova** tem duas fontes — o título gravado e o tipo —, e a precedência estava
 *    escrita com `??` dentro da leitura, onde título em branco passava por título;
 * 3. **o responsável externo** de uma atividade ficava gravado e não chegava à coluna do instrutor;
 * 4. a vista não tem técnica própria no banco, e herdava a da prova.
 *
 * ⚠️ **AS REGRAS MORAM AQUI PARA SEREM UMA SÓ:** a grade e o papel leem o **mesmo** fato, montado
 * pelo mesmo mapeador. Rotular a vista em dois lugares faria a tela e o documento discordarem no
 * primeiro ajuste de texto.
 *
 * ⚠️ **A DATA CHEGA FORMATADA.** `DD/MM/AAAA` é de `lib/formato/data.ts` (ponto único desde a spec
 * 012); este módulo recebe o texto pronto e não conhece `Date`.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por ESLint).
 */

/** O rótulo que distingue a vista da aplicação — em caixa alta, como o documento assinado. */
export const ROTULO_DA_VISTA_DE_PROVA = "VISTA DE PROVA";

/**
 * A sigla da técnica de ensino da vista de prova.
 *
 * ⚠️ **É DECISÃO, NÃO DADO** *(Bernardo Villas Boas, 06/10/2026)*: a vista é conduzida por
 * exposição, e o documento assinado a imprime com **EO**. `avaliacoes` guarda **uma** técnica — a da
 * aplicação —, então a da vista não tem coluna de onde sair. O **nome** por extenso continua vindo
 * do catálogo (`config_listas.metodologias`), por `tecnicaDaVistaDeProva`: aqui fica só a sigla.
 */
export const SIGLA_DA_VISTA_DE_PROVA = "EO";

function limpo(valor: string | null | undefined): string {
  return (valor ?? "").trim();
}

/**
 * O tópico de uma avaliação: o **título gravado** quando há; senão o **tipo**.
 *
 * ⚠️ **TEXTO EM BRANCO É AUSÊNCIA, e o `??` não sabe disso.** Um `conteudo_resumo` de espaços
 * passava por título e imprimia uma célula vazia no lugar de *"Prova Escrita"*.
 */
export function conteudoDaAvaliacao(
  conteudoResumo: string | null | undefined,
  tipoDaAvaliacao: string | null | undefined,
): string | null {
  const titulo = limpo(conteudoResumo);
  if (titulo !== "") return titulo;
  const tipo = limpo(tipoDaAvaliacao);
  return tipo === "" ? null : tipo;
}

/**
 * O rótulo da vista de prova, com a **referência da prova** a que ela pertence.
 *
 * ⚠️ **A REFERÊNCIA É O QUE FAZ O RÓTULO SERVIR**: uma disciplina com duas provas tem duas vistas, e
 * *"VISTA DE PROVA"* sozinho não diz de qual. A data da aplicação entra porque as duas provas de
 * uma disciplina costumam ter o **mesmo título**.
 *
 * ⚠️ **AUSÊNCIA NUNCA VIRA TEXTO** (`SC-013`): sem prova, sai só o rótulo; sem data, sai sem o
 * parêntese — nunca `null` nem `undefined` dentro da frase.
 */
export function rotuloDaVistaDeProva(entrada: {
  /** O tópico da aplicação — o que `conteudoDaAvaliacao` devolveu para ela. */
  readonly prova: string | null | undefined;
  /** A data da aplicação, **já** em `DD/MM/AAAA`. */
  readonly aplicadaEm: string | null | undefined;
}): string {
  const prova = limpo(entrada.prova);
  const data = limpo(entrada.aplicadaEm);
  if (prova === "") return ROTULO_DA_VISTA_DE_PROVA;
  const referencia = `${ROTULO_DA_VISTA_DE_PROVA} — ${prova}`;
  return data === "" ? referencia : `${referencia} (aplicada em ${data})`;
}

/**
 * O **nome** da técnica da vista de prova: o do catálogo cuja sigla é `EO`.
 *
 * ⚠️ **SEM A TÉCNICA NO CATÁLOGO, DEVOLVE NULO — e a célula sai vazia** (`RN-DEG-01`). Escrever
 * *"Exposição Oral"* aqui faria a vista apontar para um valor que a lista administrável pode ter
 * renomeado, e a legenda do rodapé deixaria de casar com a coluna.
 */
export function tecnicaDaVistaDeProva(
  catalogo: readonly { readonly nome: string; readonly sigla: string | null }[],
): string | null {
  const achada = catalogo.find((t) => limpo(t.sigla) === SIGLA_DA_VISTA_DE_PROVA);
  return achada === undefined ? null : achada.nome;
}

/**
 * Quem aparece na coluna do instrutor: o **instrutor**, ou — quando não há — o **responsável
 * externo**.
 *
 * ⚠️ **O BANCO PROÍBE OS DOIS JUNTOS** (`CHECK ativ_responsavel_exclusivo`, medido em 05/10/2026).
 * A precedência do instrutor só decide algo se a restrição cair um dia; até lá ela é a leitura
 * honesta do `ou`: o externo é de quem **não** está no cadastro.
 */
export function responsavelDoFato(
  instrutor: string | null | undefined,
  responsavelExterno: string | null | undefined,
): string | null {
  const doCadastro = limpo(instrutor);
  if (doCadastro !== "") return doCadastro;
  const externo = limpo(responsavelExterno);
  return externo === "" ? null : externo;
}

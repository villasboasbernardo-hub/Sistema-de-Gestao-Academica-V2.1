/**
 * A **posição herdada** — quando um fato da semana cai na faixa *"Sem posição"* (`Q-12`, `SC-017`).
 *
 * > *"Uma avaliação é tratada como **sem posição** quando tem **procedência de ETL**, **nunca foi
 * > editada** e `ta_inicial = 1`. ⚠️ **As três condições juntas, e não só a terceira** — senão uma
 * > avaliação **nova**, legitimamente posicionada no 1º TA, desapareceria da grade."*
 * > — `spec.md` §2.3 da spec 013, resposta `Q-12` de **Bernardo Villas Boas**, 05/10/2026
 *
 * > *"Lançamento sem `ta_inicial` MUST aparecer numa faixa **"Sem posição"** do seu dia, com o motivo
 * > escrito."*
 * > — `FR-008` da spec 013 (origem `RN-DEG-01`)
 *
 * ⚠️ **A MEDIÇÃO QUE SUSTENTA A REGRA, e sem ela a regra seria chute** (banco **remoto**, por
 * `supabase db query --linked`, só `select`, em **05/10/2026** — registro em
 * `specs/013-detalhe-semanal-de-aula/estado-atual.md` §10 e §10.1): as **188** avaliações têm
 * `ta_inicial = 1` **todas elas**, com procedência de ETL nas **188** e `editado_em` nulo nas
 * **188**; o `tempos_consumidos`, em contraste, **varia de 1 a 8**. Logo a **duração é dado real** e
 * a **posição é sentinela do ETL** — *"começa no 1º tempo"* escrito 188 vezes. E `ta_inicial_vista`
 * é nulo nas **188**, por isso a vista de prova nunca precisa da terceira condição: ela entra na
 * faixa pelo primeiro ramo, por não ter posição nenhuma.
 *
 * ⚠️ **POR QUE ISTO É UM MÓDULO, e não um `=== 1` na tela:** a regra só é segura por causa das
 * **três** condições juntas. Escrita como `taInicial === 1`, ela **esconderia** uma avaliação nova
 * legitimamente posicionada no 1º TA — e a grade mentiria por omissão, sem erro nenhum. Como está,
 * ela **se desarma sozinha**: a primeira edição carimba `editado_em`, `herdado` fica falso, e a
 * linha passa a valer o que diz.
 *
 * ⚠️ **POSIÇÃO FALSA É MAIS CARA QUE POSIÇÃO AUSENTE**, e é esta a razão de a sentinela ir para a
 * faixa em vez de ficar na matriz (`SC-017`): a ausente **tem onde ser mostrada**, com o motivo ao
 * lado; a falsa não se distingue da verdadeira, e o operador leria 188 avaliações empilhadas no 1º
 * TA como defeito da grade.
 *
 * ⚠️ **ESTE MÓDULO NÃO DECIDE NADA SOBRE A MATRIZ.** Ele responde *"este fato tem posição?"* e
 * **por que não**; quem monta a grade é `grade.ts`, e quem valida faixa de TA é `bloco.ts`. Separar
 * assim é o que impede a regra de `Q-12` de nascer em dois lugares.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por
 * ESLint). O fato chega **por parâmetro**, já lido da `vw_ocupacao_ta` ou dos três `select … where
 * ta_inicial is null` da semana — este módulo não sabe de onde.
 */

/**
 * As quatro origens que a `vw_ocupacao_ta` declara na coluna `origem`.
 *
 * ⚠️ **ELAS NÃO SÃO O `TipoDeBloco` de `bloco.ts`, e unificar os dois seria erro.** O `TipoDeBloco`
 * tem **sete** valores porque abre a categoria normativa do lançamento (`aec`, `tad`, `tr`,
 * `estudo_individual`); a `origem` tem **quatro** porque nomeia a **tabela de onde o fato veio** —
 * as quatro não letivas chegam todas como `atividade_nao_letiva`. Um tipo só obrigaria a traduzir
 * num dos dois lados, e a tradução é justamente onde a sentinela se perderia.
 */
export type OrigemDoFato = "aula" | "avaliacao" | "vista_prova" | "atividade_nao_letiva";

/** O mínimo que se precisa saber de um fato para decidir se ele tem posição. */
export type FatoParaPosicao = {
  readonly origem: OrigemDoFato;
  /** `origem_migracao_v1 != null && editado_em == null` — a coluna `herdado` da `vw_ocupacao_ta`. */
  readonly herdado: boolean;
  /** O TA em que o fato começa. `null` quando a origem nunca registrou posição. */
  readonly taInicial: number | null;
};

/**
 * O TA que o ETL escreveu nas 188 avaliações por falta de dado — **sentinela, não posição**.
 *
 * ⚠️ **É UMA CONSTANTE NOMEADA DE PROPÓSITO:** um `1` solto na condição se leria como faixa de TA, e
 * alguém o "consertaria" para `>= 1`. O que ele significa é *"o valor que a carga escreve quando não
 * sabe"*, e o nome é a única coisa que diz isso.
 */
export const TA_SENTINELA_DO_ETL = 1;

/**
 * As duas frases, e **são duas porque são dois problemas** (`FR-008`).
 *
 * ⚠️ **"NUNCA FOI POSICIONADO" é ausência de dado na origem**, e quem resolve é **posicionar** o
 * fato (`T092`, o mesmo `mover`). ⚠️ **"POSIÇÃO HERDADA" é dado presente e NÃO confiável**, e quem
 * resolve é **conferir contra a planilha**. A mesma frase para os dois mandaria o operador procurar
 * a coisa errada — e as duas ficam em constante porque a tela e o teste precisam comparar o mesmo
 * texto sem copiá-lo.
 */
export const MOTIVO_NUNCA_POSICIONADO =
  "Sem posição na origem — a planilha da v2.0 não registrava o tempo de aula.";

/** A frase da sentinela. O número aparece para quem for conferir na planilha. */
export const MOTIVO_POSICAO_HERDADA = `Posição herdada da planilha — o ${TA_SENTINELA_DO_ETL}º TA foi escrito pela carga, não pela operação.`;

/** `true` se o valor não serve como posição — `null`, ausente ou não finito. */
function posicaoAusente(taInicial: number | null): boolean {
  /*
   * ⚠️ **`Number.isFinite` COBRE O `undefined` QUE O TIPO NÃO PERMITE.** Em código tipado a
   *    propriedade é `number | null`, mas o fato chega de uma linha de banco: uma coluna que venha
   *    ausente no JSON daria `undefined`, e `undefined === null` é falso. Tratá-la como posição
   *    válida colocaria o fato na matriz, em `NaN`, **sem erro**.
   */
  return taInicial === null || !Number.isFinite(taInicial);
}

/**
 * O fato cai na faixa *"Sem posição"*?
 *
 * ⚠️ **A SENTINELA É SÓ DAS AVALIAÇÕES, e isso foi medido, não suposto.** `registros_aula` e
 * `atividades_nao_letivas` têm `ta_inicial` **nulo** nas 1.566 e nas 664 — elas entram na faixa pelo
 * primeiro ramo. Uma **aula** herdada no TA 1 é aula que alguém posicionou **depois** da carga, e
 * tirá-la da grade seria apagar trabalho real da tela.
 *
 * ⚠️ **FAIXA DE TA NÃO É ASSUNTO DESTE MÓDULO** (`RN-DEG-02` e ponto único): um `taInicial = 13` não
 * vira *"sem posição"* aqui. A faixa 1–12 é garantida pelo `CHECK reg_aula_ta_valido` no banco e
 * conferida por `blocoValido` no lançamento; repeti-la aqui faria a regra viver em três lugares, e o
 * terceiro divergiria.
 */
export function semPosicao(fato: FatoParaPosicao): boolean {
  if (posicaoAusente(fato.taInicial)) return true;

  return fato.origem === "avaliacao" && fato.herdado && fato.taInicial === TA_SENTINELA_DO_ETL;
}

/**
 * A frase que a tela mostra ao lado do fato, na faixa. `null` quando ele **tem** posição.
 *
 * ⚠️ **`null` É A RESPOSTA DE "TEM POSIÇÃO", NUNCA UMA FRASE VAZIA** (`RN-DEG-01`): texto em branco
 * ao lado de um bloco posicionado se leria como motivo que não carregou. ⚠️ **E o texto mora aqui
 * porque a regra mora aqui** — a tela que decidisse a frase por conta própria voltaria a precisar
 * das três condições, que é exatamente o que este módulo existe para centralizar. Nenhuma das duas
 * frases bloqueia nada (`RN-DEG-02`).
 */
export function motivoDaFaltaDePosicao(fato: FatoParaPosicao): string | null {
  if (posicaoAusente(fato.taInicial)) return MOTIVO_NUNCA_POSICIONADO;
  if (semPosicao(fato)) return MOTIVO_POSICAO_HERDADA;
  return null;
}

/**
 * `RN-MAT-05` — o rateio da CH prevista entre os instrutores de uma disciplina numa turma.
 *
 * > *"Quando uma disciplina tiver mais de um instrutor designado, o sistema deve distinguir dois
 * > modos de atribuição de carga horária: **modo dividido** (padrão) — os instrutores repartem entre
 * > si a carga horária total da disciplina; e **modo simultâneo** — cada instrutor designado acumula
 * > a carga horária integral da disciplina, por atuarem concomitantemente com grupos distintos de
 * > alunos. O modo simultâneo aplica-se às disciplinas práticas de encerramento de curso (Prática de
 * > Fim de Curso, Levantamento Hidrográfico de Fim de Curso, Prática de Manutenção de Auxílios à
 * > Navegação) e a qualquer outra disciplina assim marcada no cadastro."*
 * > — documento 04, `RN-MAT-05` **[NOVA — v1.3]**, Risco: Médio
 *
 * ⚠️ **ESTA FUNÇÃO É A REFERÊNCIA, E A VIEW É TESTADA CONTRA ELA — nunca o contrário** (documento
 * 04, nota de implementação da CH do instrutor). `vw_instrutor_carga_prevista` existe como caminho
 * rápido para listagem; quando as duas discordam, **quem está errada é a view**. É por isso que a
 * tabela de casos abaixo é **exportada**: `tests/invariantes/rateio-da-view.test.ts` a consome para
 * semear o banco e exigir da view o mesmo número, caso a caso (`FR-041.7`).
 *
 * ⚠️ **NUNCA PRODUZ FRAÇÃO, e isso foi um defeito real.** Até a M5 a view fazia
 * `carga_horaria_tempos / instrutores_designados` com `round(…, 2)`: **10 TA entre 3 devolviam 3,33
 * três vezes, somando 9,99** — a CH da disciplina não fechava, e nenhuma asserção acusava. A `A-1`
 * (Bernardo Villas Boas, 25/09/2026) fixou divisão **inteira** com o resto distribuído **aos mais
 * antigos, um TA cada**.
 *
 * ⚠️ **E A REGRA MUDOU DE PROPÓSITO EM RELAÇÃO À v2.0.** A spec 032, `FR-007`, punha o resto **no
 * último da lista**; aqui ele vai **aos mais antigos**. O caso 10/3 sai de `3/3/4` para `4/3/3` — é o
 * caso que discrimina a mudança, e está no Vitest com essa palavra.
 *
 * ⚠️ **QUAL CASO VALE SE LÊ DO DADO, sem coluna de modo por turma** (`FR-041.6`), e a **ordem de
 * precedência é a mesma da view**, deliberadamente: UEs atribuídas → parcelas digitadas → simultâneo
 * → divisão igual. Inverter dois desses ramos faria a tela e o banco discordarem em silêncio.
 *
 * Módulo **puro**: números e listas entram, números saem.
 */

/** O modo declarado no cadastro da disciplina. ⚠️ `herdar` é proibido aqui pelo `CHECK` do banco. */
export type ModoDeAtribuicao = "dividido" | "simultaneo";

/** Qual dos cinco casos do `FR-041` decidiu a conta. Serve à tela, que explica o número. */
export type CasoDoRateio =
  "um_instrutor" | "simultaneo" | "divisao_igual" | "por_tempos_digitados" | "por_unidades";

/**
 * Um instrutor na atribuição.
 *
 * ⚠️ **A LISTA CHEGA JÁ ORDENADA POR ANTIGUIDADE**, e esta função **não reordena**. Quem ordena é
 * `lib/dominio/antiguidade.ts` na tela e `app.fn_antiguidade_ordem` no banco — duas implementações da
 * mesma escala, que já existem. Reordenar aqui criaria uma terceira, e o resto do `FR-042` iria para
 * as pessoas erradas sem que nada acusasse.
 */
export type InstrutorNoRateio = {
  readonly instrutorId: string;
  /** Caso 4: TA digitados para esta pessoa. `null` = não digitado. */
  readonly temposDigitados?: number | null;
  /** Caso 5: CH das UEs atribuídas a esta pessoa, somada pelo currículo. */
  readonly temposDasUnidades?: number | null;
};

export type EntradaDoRateio = {
  /** CH da disciplina, em TA. */
  readonly cargaHorariaTempos: number;
  readonly modo: ModoDeAtribuicao;
  /** Já ordenados por antiguidade — do mais antigo para o mais moderno. */
  readonly instrutores: readonly InstrutorNoRateio[];
  /** Há linhas em `turma_disciplina_unidade` para esta turma-disciplina? (`FR-041.6`) */
  readonly temAtribuicaoPorUnidade?: boolean;
};

export type ParcelaDoRateio = {
  readonly instrutorId: string;
  readonly tempos: number;
};

export type ResultadoDoRateio = {
  readonly caso: CasoDoRateio;
  readonly parcelas: readonly ParcelaDoRateio[];
  /** A soma das parcelas. No caso 2 ela é maior que a CH **de propósito**. */
  readonly soma: number;
  /**
   * A soma fecha com a CH da disciplina?
   *
   * ⚠️ **No caso 2 (simultâneo) ela NÃO fecha, e isso é correto** — cada instrutor acumula a CH
   * integral porque atuam com grupos distintos ao mesmo tempo. Tratar o simultâneo como erro de soma
   * seria transformar a `RN-MAT-05` num defeito.
   */
  readonly fecha: boolean;
  /** A explicação, em português, de por que não fecha. `null` quando fecha ou quando é simultâneo. */
  readonly motivo: string | null;
};

/**
 * `FR-041.3` e `FR-042` — divisão igual em TA inteiros, resto aos mais antigos.
 *
 * ⚠️ É **exatamente** a expressão da view: `ch / n + (ordem <= ch % n ? 1 : 0)`, com `ordem`
 * começando em 1. Escrevê-la de outro jeito aqui — por exemplo distribuindo o resto num laço — daria
 * o mesmo número hoje e divergiria no dia em que alguém mexesse num dos dois lados.
 */
function divisaoIgual(
  cargaHorariaTempos: number,
  instrutores: readonly InstrutorNoRateio[],
): ParcelaDoRateio[] {
  const quantidade = instrutores.length;
  const base = Math.floor(cargaHorariaTempos / quantidade);
  const resto = cargaHorariaTempos % quantidade;
  return instrutores.map((instrutor, indice) => ({
    instrutorId: instrutor.instrutorId,
    tempos: base + (indice < resto ? 1 : 0),
  }));
}

/**
 * Calcula as parcelas nos cinco casos do `FR-041`.
 *
 * ⚠️ **A ORDEM DOS RAMOS É A DA VIEW** (`FR-041.6`): UE → digitado → simultâneo → divisão igual. Os
 * casos 4 e 5 **não coexistem** na mesma turma-disciplina, e o banco recusa a mistura — aqui a
 * precedência apenas garante que, se alguém conseguir gravar as duas, tela e banco mostrem o mesmo
 * número em vez de dois.
 */
export function ratear(entrada: EntradaDoRateio): ResultadoDoRateio {
  const { cargaHorariaTempos, modo, instrutores } = entrada;

  if (instrutores.length === 0) {
    return {
      caso: "divisao_igual",
      parcelas: [],
      soma: 0,
      fecha: false,
      motivo: "Nenhum instrutor atribuído.",
    };
  }

  const somar = (parcelas: readonly ParcelaDoRateio[]) =>
    parcelas.reduce((total, parcela) => total + parcela.tempos, 0);

  // ── Caso 5 — por Unidade de Ensino (`FR-041.5`) ──────────────────────────────────────────────
  if (entrada.temAtribuicaoPorUnidade) {
    const parcelas = instrutores.map((instrutor) => ({
      instrutorId: instrutor.instrutorId,
      tempos: instrutor.temposDasUnidades ?? 0,
    }));
    const soma = somar(parcelas);
    const semUnidade = parcelas.filter((p) => p.tempos === 0).length;
    return {
      caso: "por_unidades",
      parcelas,
      soma,
      fecha: soma === cargaHorariaTempos && semUnidade === 0,
      motivo:
        semUnidade > 0
          ? `${semUnidade} instrutor(es) sem nenhuma unidade de ensino atribuída.`
          : soma === cargaHorariaTempos
            ? null
            : `A soma das unidades dá ${soma} TA e a disciplina tem ${cargaHorariaTempos} TA. ` +
              `Toda unidade precisa estar atribuída a exatamente um instrutor.`,
    };
  }

  // ── Caso 4 — por TA digitados (`FR-041.4`) ───────────────────────────────────────────────────
  // ⚠️ Basta UM digitado para o caso valer, e a mistura com `NULL` é recusada — é o que o banco faz
  //    e o que a `FR-043` manda. Preencher o que falta por inferência gravaria escolha que ninguém
  //    fez, que é a `Q-03`.
  const digitados = instrutores.filter(
    (i) => i.temposDigitados !== null && i.temposDigitados !== undefined,
  );
  if (digitados.length > 0) {
    const parcelas = instrutores.map((instrutor) => ({
      instrutorId: instrutor.instrutorId,
      tempos: instrutor.temposDigitados ?? 0,
    }));
    const soma = somar(parcelas);
    const incompleto = digitados.length !== instrutores.length;
    const fracionaria = parcelas.some((p) => !Number.isInteger(p.tempos));
    return {
      caso: "por_tempos_digitados",
      parcelas,
      soma,
      fecha: !incompleto && !fracionaria && soma === cargaHorariaTempos,
      motivo: incompleto
        ? `Falta informar os tempos de ${instrutores.length - digitados.length} instrutor(es). ` +
          `Ou informe todos, ou nenhum — deixar parte em branco não divide o resto.`
        : fracionaria
          ? "Os tempos precisam ser números inteiros."
          : soma === cargaHorariaTempos
            ? null
            : `A soma dá ${soma} TA e a disciplina tem ${cargaHorariaTempos} TA.`,
    };
  }

  // ── Caso 2 — simultâneo (`FR-041.2`) ─────────────────────────────────────────────────────────
  if (modo === "simultaneo") {
    const parcelas = instrutores.map((instrutor) => ({
      instrutorId: instrutor.instrutorId,
      tempos: cargaHorariaTempos,
    }));
    return {
      caso: "simultaneo",
      parcelas,
      soma: somar(parcelas),
      // ⚠️ `fecha` é VERDADEIRO aqui apesar de a soma ser maior que a CH: no simultâneo o certo é
      //    cada um acumular a CH integral, e marcar isso como "não fecha" faria a tela acusar erro
      //    onde a regra de negócio está sendo cumprida.
      fecha: true,
      motivo: null,
    };
  }

  // ── Casos 1 e 3 — um instrutor, ou divisão igual (`FR-041.1`, `FR-041.3`) ─────────────────────
  // ⚠️ O caso 1 NÃO é um ramo à parte: com um instrutor, a divisão inteira já devolve a CH integral
  //    e o resto é zero. Um `if` só para ele seria um segundo caminho que pode divergir — e a view
  //    também não o tem.
  const parcelas = divisaoIgual(cargaHorariaTempos, instrutores);
  return {
    caso: instrutores.length === 1 ? "um_instrutor" : "divisao_igual",
    parcelas,
    soma: somar(parcelas),
    fecha: true,
    motivo: null,
  };
}

/** A frase que a tela mostra ao lado do rateio, explicando **por que** o número é aquele. */
export function explicacaoDoCaso(caso: CasoDoRateio): string {
  switch (caso) {
    case "um_instrutor":
      return "Instrutor único: recebe a carga horária integral.";
    case "simultaneo":
      return "Simultâneo: cada instrutor recebe a carga horária integral, por atuarem com grupos distintos ao mesmo tempo.";
    case "divisao_igual":
      return "Dividido igualmente, em tempos inteiros; o resto vai aos mais antigos, um tempo cada.";
    case "por_tempos_digitados":
      return "Dividido pelos tempos informados; a soma precisa ser igual à carga horária da disciplina.";
    case "por_unidades":
      return "Dividido pelas unidades de ensino; a carga de cada um é a soma das unidades dele.";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// A TABELA DE CASOS — exportada, e é ela que liga esta função à view
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Os casos canônicos do `FR-041`, **usados por dois testes diferentes**:
 *   1. `tests/unidade/rateio-de-carga.test.ts` — a função pura devolve o esperado;
 *   2. `tests/invariantes/rateio-da-view.test.ts` — o banco é semeado com cada caso e
 *      `vw_instrutor_carga_prevista` MUST devolver **o mesmo número**, instrutor por instrutor.
 *
 * ⚠️ **É esta tabela que torna o `FR-041.7` verificável.** Sem ela, "a view implementa os cinco
 * casos" seria afirmação; com ela, a view e a função pura respondem à **mesma** pergunta, e a
 * divergência vira vermelho em vez de virar um número errado numa ficha de instrutor.
 */
export type CasoCanonico = {
  readonly nome: string;
  readonly entrada: EntradaDoRateio;
  /** Os TA esperados, **na ordem da lista de instrutores**. */
  readonly esperado: readonly number[];
  readonly caso: CasoDoRateio;
};

const pessoas = (...ids: readonly string[]): InstrutorNoRateio[] =>
  ids.map((instrutorId) => ({ instrutorId }));

export const CASOS_CANONICOS: readonly CasoCanonico[] = [
  {
    nome: "1 — um instrutor só recebe a CH integral",
    entrada: { cargaHorariaTempos: 30, modo: "dividido", instrutores: pessoas("a") },
    esperado: [30],
    caso: "um_instrutor",
  },
  {
    nome: "2 — simultâneo: cada um recebe a CH integral (2 instrutores)",
    entrada: { cargaHorariaTempos: 20, modo: "simultaneo", instrutores: pessoas("a", "b") },
    esperado: [20, 20],
    caso: "simultaneo",
  },
  {
    nome: "2 — simultâneo com 3 instrutores",
    entrada: { cargaHorariaTempos: 12, modo: "simultaneo", instrutores: pessoas("a", "b", "c") },
    esperado: [12, 12, 12],
    caso: "simultaneo",
  },
  {
    nome: "3 — divisão exata: 30 entre 3",
    entrada: { cargaHorariaTempos: 30, modo: "dividido", instrutores: pessoas("a", "b", "c") },
    esperado: [10, 10, 10],
    caso: "divisao_igual",
  },
  {
    // ⚠️ **O CASO QUE DISCRIMINA A MUDANÇA DE REGRA.** A v2.0 (spec 032, `FR-007`) punha o resto no
    //    ÚLTIMO: daria 3/3/4. Aqui vai ao mais antigo: 4/3/3.
    nome: "3 — 10 entre 3: o resto vai ao MAIS ANTIGO (v2.0 punha no último)",
    entrada: { cargaHorariaTempos: 10, modo: "dividido", instrutores: pessoas("a", "b", "c") },
    esperado: [4, 3, 3],
    caso: "divisao_igual",
  },
  {
    nome: "3 — 11 entre 3: resto 2, aos dois mais antigos",
    entrada: { cargaHorariaTempos: 11, modo: "dividido", instrutores: pessoas("a", "b", "c") },
    esperado: [4, 4, 3],
    caso: "divisao_igual",
  },
  {
    nome: "3 — 11 entre 2: resto 1, ao mais antigo",
    entrada: { cargaHorariaTempos: 11, modo: "dividido", instrutores: pessoas("a", "b") },
    esperado: [6, 5],
    caso: "divisao_igual",
  },
  {
    nome: "4 — por TA digitados, com soma exata",
    entrada: {
      cargaHorariaTempos: 10,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 7 },
        { instrutorId: "b", temposDigitados: 3 },
      ],
    },
    esperado: [7, 3],
    caso: "por_tempos_digitados",
  },
  {
    nome: "4 — por TA digitados entre 3, com soma exata",
    entrada: {
      cargaHorariaTempos: 12,
      modo: "dividido",
      instrutores: [
        { instrutorId: "a", temposDigitados: 6 },
        { instrutorId: "b", temposDigitados: 4 },
        { instrutorId: "c", temposDigitados: 2 },
      ],
    },
    esperado: [6, 4, 2],
    caso: "por_tempos_digitados",
  },
  {
    nome: "5 — por UE: a CH de cada um é a soma das unidades dele",
    entrada: {
      cargaHorariaTempos: 10,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDasUnidades: 6 },
        { instrutorId: "b", temposDasUnidades: 4 },
      ],
    },
    esperado: [6, 4],
    caso: "por_unidades",
  },
  {
    nome: "5 — por UE entre 3",
    entrada: {
      cargaHorariaTempos: 9,
      modo: "dividido",
      temAtribuicaoPorUnidade: true,
      instrutores: [
        { instrutorId: "a", temposDasUnidades: 4 },
        { instrutorId: "b", temposDasUnidades: 3 },
        { instrutorId: "c", temposDasUnidades: 2 },
      ],
    },
    esperado: [4, 3, 2],
    caso: "por_unidades",
  },
];

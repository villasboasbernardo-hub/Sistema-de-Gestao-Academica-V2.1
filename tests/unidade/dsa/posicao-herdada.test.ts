/**
 * `Q-12` · `SC-017` · `FR-008` — a posição herdada e a faixa *"Sem posição"*.
 *
 * ⚠️ **O CASO QUE DISCRIMINA ESTÁ AQUI, e é a avaliação NOVA no 1º TA** (DoD 8): com a regra escrita
 * como `taInicial === 1` — a forma errada e tentadora —, **ela desapareceria da grade**, e os outros
 * casos deste arquivo passariam igual. Ele é o único que separa *"as três condições juntas"* de
 * *"só a terceira"*.
 *
 * ⚠️ **OS VALORES VÊM DA MEDIÇÃO DE 05/10/2026 no banco REMOTO** (`estado-atual.md` §10 e §10.1):
 * **188** avaliações com `ta_inicial = 1`, procedência de ETL e `editado_em` nulo **todas**;
 * `ta_inicial` nulo nas **1.566** aulas e nas **664** atividades; `ta_inicial_vista` nulo nas
 * **188**. Nada aqui é número inventado.
 */

import { describe, expect, it } from "vitest";

import {
  MOTIVO_NUNCA_POSICIONADO,
  MOTIVO_POSICAO_HERDADA,
  motivoDaFaltaDePosicao,
  semPosicao,
  TA_SENTINELA_DO_ETL,
  type FatoParaPosicao,
  type OrigemDoFato,
} from "@/lib/dominio/dsa/posicao-herdada";

/** As quatro origens da `vw_ocupacao_ta`, para os casos que valem em todas. */
const ORIGENS: readonly OrigemDoFato[] = [
  "aula",
  "avaliacao",
  "vista_prova",
  "atividade_nao_letiva",
];

function fato(partes: Partial<FatoParaPosicao>): FatoParaPosicao {
  return {
    origem: partes.origem ?? "avaliacao",
    herdado: partes.herdado ?? false,
    taInicial: partes.taInicial ?? null,
  };
}

describe("`Q-12` · a sentinela do ETL exige as TRÊS condições juntas", () => {
  it("avaliação herdada no 1º TA — as 188 do remoto — fica SEM posição", () => {
    const a188 = fato({ origem: "avaliacao", herdado: true, taInicial: TA_SENTINELA_DO_ETL });

    expect(semPosicao(a188)).toBe(true);
    expect(motivoDaFaltaDePosicao(a188)).toBe(MOTIVO_POSICAO_HERDADA);
  });

  /*
   * ⚠️ **ESTE É O CONTROLE NEGATIVO QUE JUSTIFICA O MÓDULO.** Avaliação nova no 1º TA é posição
   *    REAL, posta por quem está operando; tirá-la da grade seria esconder trabalho feito. Com a
   *    regra reduzida a `taInicial === 1`, só ele reprova.
   */
  it("avaliação NOVA no 1º TA fica POSICIONADA — é o caso que discrimina", () => {
    const nova = fato({ origem: "avaliacao", herdado: false, taInicial: TA_SENTINELA_DO_ETL });

    expect(semPosicao(nova)).toBe(false);
    expect(motivoDaFaltaDePosicao(nova)).toBeNull();
  });

  /*
   * ⚠️ **ESTE CASO PARECE O ANTERIOR E NÃO É O MESMO FATO — a entrada coincide DE PROPÓSITO.**
   *    `herdado` já **é** a conjunção das duas primeiras condições (`origem_migracao_v1 is not null
   *    and editado_em is null`), então uma das 188 **depois de editada** chega aqui exatamente como
   *    chega uma avaliação nova: `herdado = false`. **É assim que a regra se desarma sozinha** — a
   *    primeira edição carimba `editado_em`, a view devolve `false`, e a linha passa a valer o que
   *    diz, sem ninguém mexer em código nem em migration. O caso fica escrito à parte porque é essa
   *    coincidência que precisa ser lida, não deduzida.
   */
  it("avaliação herdada e depois EDITADA no 1º TA volta a ficar posicionada", () => {
    const das188DepoisDeEditada = fato({
      origem: "avaliacao",
      herdado: false,
      taInicial: TA_SENTINELA_DO_ETL,
    });

    expect(semPosicao(das188DepoisDeEditada)).toBe(false);
    expect(motivoDaFaltaDePosicao(das188DepoisDeEditada)).toBeNull();
  });

  /*
   * ⚠️ **A SENTINELA É SÓ DAS AVALIAÇÕES — medido, não suposto.** `registros_aula` tem `ta_inicial`
   *    nulo nas 1.566, então uma aula herdada COM posição é aula que alguém posicionou depois da
   *    carga. Alargar a regra para ela apagaria da grade justamente o trabalho mais recente.
   */
  it("AULA herdada no 1º TA fica posicionada — a sentinela não alcança as aulas", () => {
    const aula = fato({ origem: "aula", herdado: true, taInicial: TA_SENTINELA_DO_ETL });

    expect(semPosicao(aula)).toBe(false);
    expect(motivoDaFaltaDePosicao(aula)).toBeNull();
  });

  it("herdada num TA que NÃO é o 1º fica posicionada, em qualquer origem", () => {
    for (const origem of ORIGENS) {
      const noQuinto = fato({ origem, herdado: true, taInicial: 5 });
      expect(semPosicao(noQuinto), `${origem} no 5º TA devia ficar na grade`).toBe(false);
    }
  });
});

describe("`FR-008` · `RN-DEG-01` — sem `ta_inicial` o fato vai para a faixa, com o motivo escrito", () => {
  it("`taInicial` nulo manda para a faixa nas QUATRO origens, herdado ou não", () => {
    for (const origem of ORIGENS) {
      for (const herdado of [true, false]) {
        const semTa = fato({ origem, herdado, taInicial: null });
        expect(semPosicao(semTa), `${origem} herdado=${herdado} devia ficar sem posição`).toBe(
          true,
        );
        expect(motivoDaFaltaDePosicao(semTa)).toBe(MOTIVO_NUNCA_POSICIONADO);
      }
    }
  });

  /*
   * ⚠️ **A VISTA DE PROVA ENTRA PELO PRIMEIRO RAMO, e é por isso que ela não precisa da terceira
   *    condição:** `ta_inicial_vista` é nulo nas **188**, e `data_vista_prova` está preenchida em
   *    **102**. Ela é **fato datado sem posição** — a única habitante legítima da faixa entre as
   *    avaliações (`estado-atual.md` §10.2).
   */
  it("vista de prova herdada sem posição cai na faixa como «nunca posicionado»", () => {
    const vista = fato({ origem: "vista_prova", herdado: true, taInicial: null });

    expect(semPosicao(vista)).toBe(true);
    expect(motivoDaFaltaDePosicao(vista)).toBe(MOTIVO_NUNCA_POSICIONADO);
  });

  /*
   * ⚠️ **AUSÊNCIA É `null`, NUNCA ZERO NEM FRASE VAZIA** (`RN-DEG-01`). Frase em branco ao lado de um
   *    bloco posicionado se leria como motivo que não carregou.
   */
  it("fato posicionado devolve `null` de motivo — e não texto vazio", () => {
    const posicionado = fato({ origem: "atividade_nao_letiva", herdado: false, taInicial: 3 });

    expect(semPosicao(posicionado)).toBe(false);
    expect(motivoDaFaltaDePosicao(posicionado)).toBeNull();
  });

  it("as duas frases são distintas e nenhuma é vazia — a faixa precisa diferenciá-las", () => {
    expect(MOTIVO_NUNCA_POSICIONADO).not.toBe(MOTIVO_POSICAO_HERDADA);
    expect(MOTIVO_NUNCA_POSICIONADO.length).toBeGreaterThan(0);
    expect(MOTIVO_POSICAO_HERDADA.length).toBeGreaterThan(0);
  });
});

describe("`Q-12` · a degradação que o tipo não impede, porque o fato vem de uma linha de banco", () => {
  /*
   * ⚠️ **COLUNA AUSENTE NO JSON DÁ `undefined`, E `undefined === null` É FALSO.** Em código tipado
   *    isto não acontece; numa linha vinda do PostgREST, acontece — e tratar `undefined` como posição
   *    válida colocaria o fato na matriz em `NaN`, **sem erro nenhum** (gotcha 4, a forma silenciosa).
   */
  it("`taInicial` ausente (como `undefined` de linha de banco) vai para a faixa", () => {
    const comoDoBanco = { origem: "aula", herdado: true } as unknown as FatoParaPosicao;

    expect(semPosicao(comoDoBanco)).toBe(true);
    expect(motivoDaFaltaDePosicao(comoDoBanco)).toBe(MOTIVO_NUNCA_POSICIONADO);
  });

  it("`taInicial` não finito (`NaN`) vai para a faixa, em vez de virar célula inválida", () => {
    const quebrado = fato({ origem: "avaliacao", herdado: true, taInicial: Number.NaN });

    expect(semPosicao(quebrado)).toBe(true);
    expect(motivoDaFaltaDePosicao(quebrado)).toBe(MOTIVO_NUNCA_POSICIONADO);
  });

  /*
   * ⚠️ **FAIXA DE TA NÃO É ASSUNTO DESTE MÓDULO, e o caso está aqui para que ninguém a traga.** A
   *    faixa 1–12 é do `CHECK reg_aula_ta_valido` no banco e de `blocoValido` no lançamento; um
   *    terceiro guardião divergiria do primeiro que mudasse.
   */
  it("`taInicial` fora da faixa NÃO vira «sem posição» — a faixa é do banco e de `blocoValido`", () => {
    const foraDaFaixa = fato({ origem: "aula", herdado: false, taInicial: 13 });

    expect(semPosicao(foraDaFaixa)).toBe(false);
    expect(motivoDaFaltaDePosicao(foraDaFaixa)).toBeNull();
  });
});

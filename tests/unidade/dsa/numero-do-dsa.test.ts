/**
 * `Q-3` · `D-7` · `D-9` — o **Nº do DSA**, derivado da ordem das semanas da turma (`T025`).
 *
 * ⚠️ **O CASO QUE DISCRIMINA ESTÁ AQUI, e é a SEMANA VAZIA NO MEIO** (DoD 8). As duas abas da
 * planilha divergem na contagem (**P-6**): a CRONOS **pula** a semana sem aula, a PREENCHIMENTO
 * **não**. Todos os outros casos deste arquivo dão o **mesmo** veredito nas duas convenções — só a
 * semana vazia separa **3** de **4**, e a `Q-3` escolheu a da CRONOS.
 *
 * ⚠️ **AS SEMANAS ISO SÃO ANCORADAS NUMA MEDIÇÃO, não em calendário de cabeça:**
 * `tests/unidade/carga-semanal.test.ts` mede que **02/03/2026 é a segunda da semana 10 de 2026** e
 * que **01/01/2027 cai na semana 53 de 2026**. Daí saem, por aritmética de sete dias, a 11 (09/03),
 * a 12 (16/03), a 13 (23/03), a 16 (13/04), a 28 (06/07), a 52 (21/12) e a 1 de 2027 (04/01) — e
 * **nenhum número de semana é escrito aqui sem vir dessa âncora**.
 *
 * ⚠️ **UM NÚMERO DESTE ARQUIVO É MEDIDO NA OPERAÇÃO e o resto é sintético, e a distinção está
 * escrita no caso:** o **13** do C-Ap-HN em 06/07/2026 é medição de Bernardo em 15 planilhas (P-6);
 * que aquela turma tivesse **13 semanas consecutivas** com aula **não** foi medido. O caso reproduz
 * a **forma** do fato, não o dado dele.
 */

import { describe, expect, it } from "vitest";

import {
  MOTIVO_SEM_DATA_DE_INICIO,
  MOTIVO_SEM_SEMANA_COM_AULA,
  motivoDoNumeroAusente,
  numeroDoDsa,
  type EntradaDoNumeroDoDsa,
} from "@/lib/dominio/dsa/numero-do-dsa";

/** A segunda-feira de cada semana ISO usada aqui, pela âncora de 02/03/2026 (semana 10). */
const SEGUNDA = {
  s10: "2026-03-02",
  s11: "2026-03-09",
  s12: "2026-03-16",
  s13: "2026-03-23",
} as const;

/** Uma terça de cada semana — para separar o dia do lançamento da segunda do início. */
const TERCA = {
  s10: "2026-03-03",
  s11: "2026-03-10",
  s12: "2026-03-17",
  s13: "2026-03-24",
} as const;

const semana = (ano: number, numero: number) => ({ ano, numero }) as const;

/**
 * ⚠️ **`dataInicio` NÃO PODE CAIR NO `??`, E ISSO REPROVOU DE VERDADE ANTES DE SER ESCRITO ASSIM.**
 * `null` é um **valor de teste legítimo** aqui — é o caso da `D-7` —, e `partes.dataInicio ?? …`
 * o trocava pelo padrão: o caso *"turma sem início"* rodava com início preenchido e devolvia **2**
 * onde o esperado era `null`. ⚠️ **O modo de falha é o caro: o teste reprovava ACUSANDO O MÓDULO**,
 * que estava certo. A ausência da propriedade é que vale como *"use o padrão"* — daí o `in`.
 */
function entrada(partes: Partial<EntradaDoNumeroDoDsa>): EntradaDoNumeroDoDsa {
  return {
    datasComLancamento: partes.datasComLancamento ?? [],
    dataInicio: "dataInicio" in partes ? (partes.dataInicio ?? null) : SEGUNDA.s10,
    semana: partes.semana ?? semana(2026, 10),
  };
}

describe("`Q-3` · o Nº é sequencial por turma, contando semanas COM lançamento", () => {
  it("três semanas seguidas com aula: a terceira é o Nº 3", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, TERCA.s11, TERCA.s12],
        semana: semana(2026, 12),
      }),
    );

    expect(numero).toBe(3);
  });

  it("a primeira semana com aula é o Nº 1 — nunca 0", () => {
    const numero = numeroDoDsa(
      entrada({ datasComLancamento: [TERCA.s10], semana: semana(2026, 10) }),
    );

    expect(numero).toBe(1);
  });

  /*
   * ⚠️ **ESTE É O CASO QUE DISCRIMINA AS DUAS CONVENÇÕES DA PLANILHA.** Quatro semanas desde o
   *    início, a 12 **sem** lançamento: pela CRONOS (a escolhida) a semana 13 é o **3**; pela
   *    PREENCHIMENTO seria o **4**. Nenhum outro caso deste arquivo os separa.
   */
  it("semana VAZIA no meio não consome número: a seguinte é 3, não 4", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, TERCA.s11, TERCA.s13],
        semana: semana(2026, 13),
      }),
    );

    expect(numero).toBe(3);
  });

  it("duas aulas na MESMA semana contam uma vez — e data repetida também", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [SEGUNDA.s10, TERCA.s10, TERCA.s10, "2026-03-04"],
        semana: semana(2026, 10),
      }),
    );

    expect(numero).toBe(1);
  });

  /*
   * ⚠️ **A FORMA DO P-6, com o número medido na operação e as semanas sintéticas.** 13 segundas
   *    seguidas, de 13/04/2026 (semana 16) a 06/07/2026 (semana 28): 28 − 16 + 1 = 13.
   */
  it("13 semanas consecutivas com aula até 06/07/2026 dão o Nº 13 — a forma do C-Ap-HN (P-6)", () => {
    const treSegundas = [
      "2026-04-13",
      "2026-04-20",
      "2026-04-27",
      "2026-05-04",
      "2026-05-11",
      "2026-05-18",
      "2026-05-25",
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
      "2026-07-06",
    ];

    expect(treSegundas).toHaveLength(13);
    expect(
      numeroDoDsa({
        datasComLancamento: treSegundas,
        dataInicio: "2026-04-13",
        semana: semana(2026, 28),
      }),
    ).toBe(13);
  });
});

describe("`Q-3` · semana pedida SEM aula repete o número da última com aula", () => {
  it("aula nas semanas 10 e 11; a semana 12 pedida devolve 2, não 3", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, TERCA.s11],
        semana: semana(2026, 12),
      }),
    );

    expect(numero).toBe(2);
  });

  it("e duas semanas vazias depois também devolvem 2 — o DSA não avança sozinho", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, TERCA.s11],
        semana: semana(2026, 13),
      }),
    );

    expect(numero).toBe(2);
  });
});

describe("`D-9` · não existe DSA número zero — a ausência é `null`", () => {
  /*
   * ⚠️ **O CONTROLE QUE PROTEGE O `D-9`**: o `Set` vazio devolveria `0` com naturalidade, e `Nº 0`
   *    no cabeçalho é o defeito que a planilha tem (*"«SEMANA 0» no bloco cujo DSA é o Nº 1"*).
   */
  it("nenhuma semana com aula até a pedida devolve `null`, e NÃO 0", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s13],
        semana: semana(2026, 11),
      }),
    );

    expect(numero).toBeNull();
    expect(numero).not.toBe(0);
  });

  it("turma sem lançamento nenhum devolve `null`", () => {
    expect(numeroDoDsa(entrada({ datasComLancamento: [] }))).toBeNull();
  });
});

describe("`D-7` · turma sem `data_inicio` não tem número — não se inventa o início", () => {
  it("`dataInicio` nulo devolve `null` e a frase do cadastro a completar", () => {
    const semInicio = entrada({
      datasComLancamento: [TERCA.s10, TERCA.s11],
      dataInicio: null,
      semana: semana(2026, 11),
    });

    expect(numeroDoDsa(semInicio)).toBeNull();
    expect(motivoDoNumeroAusente(semInicio)).toBe(MOTIVO_SEM_DATA_DE_INICIO);
  });

  /*
   * ⚠️ **CONTROLE NEGATIVO DAS DUAS FRASES: elas não se trocam.** O cadastro está certo e falta
   *    lançamento — mandar completar a ficha da turma mandaria o operador à tela errada.
   */
  it("com início e sem aula, a frase é a do lançamento — não a do cadastro", () => {
    const semAula = entrada({ datasComLancamento: [], semana: semana(2026, 11) });

    expect(motivoDoNumeroAusente(semAula)).toBe(MOTIVO_SEM_SEMANA_COM_AULA);
  });

  it("havendo número, não há frase nenhuma", () => {
    const comNumero = entrada({
      datasComLancamento: [TERCA.s10],
      semana: semana(2026, 10),
    });

    expect(numeroDoDsa(comNumero)).toBe(1);
    expect(motivoDoNumeroAusente(comNumero)).toBeNull();
  });
});

describe("`Q-3` · o que fica fora da janela da turma", () => {
  it("lançamento ANTERIOR ao `data_inicio` é ignorado: a semana 11 é o Nº 1, não o 2", () => {
    const numero = numeroDoDsa({
      datasComLancamento: [TERCA.s10, TERCA.s11],
      dataInicio: SEGUNDA.s11,
      semana: semana(2026, 11),
    });

    expect(numero).toBe(1);
  });

  it("semana pedida ANTES do início devolve `null`", () => {
    const numero = numeroDoDsa({
      datasComLancamento: [TERCA.s10, TERCA.s11],
      dataInicio: SEGUNDA.s11,
      semana: semana(2026, 10),
    });

    expect(numero).toBeNull();
  });

  it("lançamento em semana POSTERIOR à pedida não entra na conta", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, TERCA.s12, TERCA.s13],
        semana: semana(2026, 10),
      }),
    );

    expect(numero).toBe(1);
  });
});

describe("`Q-3` · a virada do ano não precisa de caso especial", () => {
  /*
   * A âncora medida: 01/01/2027 cai na **semana 53 de 2026**, cuja segunda é 28/12/2026. Então
   * 21/12/2026 é a segunda da 52, e 04/01/2027 a da semana 1 de **2027**.
   */
  it("três semanas sobre a virada: a semana 1 de 2027 é o Nº 3", () => {
    const numero = numeroDoDsa({
      datasComLancamento: ["2026-12-22", "2026-12-29", "2027-01-05"],
      dataInicio: "2026-12-21",
      semana: semana(2027, 1),
    });

    expect(numero).toBe(3);
  });

  /*
   * ⚠️ **ESTE CASO PEGA A CHAVE DE ORDENAÇÃO ERRADA.** Comparando só o `numero`, a semana 1 de 2027
   *    (chave 1) ficaria **antes** da 53 de 2026 (chave 53), e o lançamento de janeiro entraria na
   *    conta de dezembro — devolvendo 3 onde o certo é 2.
   */
  it("a semana 53 de 2026 é o Nº 2: o lançamento de 2027 não é contado para trás", () => {
    const numero = numeroDoDsa({
      datasComLancamento: ["2026-12-22", "2026-12-29", "2027-01-05"],
      dataInicio: "2026-12-21",
      semana: semana(2026, 53),
    });

    expect(numero).toBe(2);
  });
});

describe("`RN-DEG-01` · entrada estragada devolve ausência, nunca número torto", () => {
  it("data fora do formato na lista é ignorada, e o resto conta", () => {
    const numero = numeroDoDsa(
      entrada({
        datasComLancamento: [TERCA.s10, "03/03/2026", "", "2026-13-45x", TERCA.s11],
        semana: semana(2026, 11),
      }),
    );

    expect(numero).toBe(2);
  });

  it("`dataInicio` fora do formato vale como ausente", () => {
    const numero = numeroDoDsa({
      datasComLancamento: [TERCA.s10],
      dataInicio: "02/03/2026",
      semana: semana(2026, 10),
    });

    expect(numero).toBeNull();
  });

  it("semana fora da faixa 1–53 — o que a URL aceita digitar — devolve `null`", () => {
    const comLancamento = [TERCA.s10, TERCA.s11];

    expect(
      numeroDoDsa(entrada({ datasComLancamento: comLancamento, semana: semana(2026, 0) })),
    ).toBeNull();
    expect(
      numeroDoDsa(entrada({ datasComLancamento: comLancamento, semana: semana(2026, 99) })),
    ).toBeNull();
    expect(
      numeroDoDsa(entrada({ datasComLancamento: comLancamento, semana: semana(2026, 11.5) })),
    ).toBeNull();
  });
});

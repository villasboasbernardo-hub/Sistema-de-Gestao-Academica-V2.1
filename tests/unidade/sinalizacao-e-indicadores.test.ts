/**
 * `FR-050` a `FR-053` e `FR-062` — sinalização da linha, indicadores da grade e soma das UEs.
 *
 * ⚠️ **O CASO QUE DISCRIMINA ATRAVESSA OS TRÊS MÓDULOS, e é o mesmo: a DATA NULA.** A base copiada
 * tem **121** linhas com previsão `nao_informado`. Uma implementação que tratasse `null` como data
 * — e várias o fazem sem querer, porque `new Date(null)` é 1970 — sinalizaria *"começa em breve"* e
 * *"atrasada"* para as 121 de uma vez. O ruído seria grande o bastante para alguém desligar o aviso
 * inteiro, e aí o `FR-052` não protegeria mais nada.
 *
 * ⚠️ **E O SEGUNDO É O PRAZO `N`.** Trocar 30 por 15 MUST mudar o veredito **sem tocar em código** —
 * é o que separa "parâmetro normativo é dado" (regra 8) de uma constante escondida num arquivo.
 */
import { describe, expect, it } from "vitest";

import {
  indicadoresDaGrade,
  ROTULO_DA_SITUACAO,
  situacaoDaExecucao,
  type SituacaoDeExecucao,
} from "@/lib/dominio/indicadores-da-grade";
import {
  diasAte,
  severidadeDaLinha,
  sinaisDaDisciplina,
} from "@/lib/dominio/sinalizacao-de-disciplina";
import { conferirSomaDasUnidades } from "@/lib/dominio/soma-das-unidades";

const HOJE = "2026-03-10";

describe("`diasAte` · conta dias de calendário, não instantes", () => {
  it("hoje é 0, amanhã é 1, ontem é -1", () => {
    expect(diasAte("2026-03-10", HOJE)).toBe(0);
    expect(diasAte("2026-03-11", HOJE)).toBe(1);
    expect(diasAte("2026-03-09", HOJE)).toBe(-1);
  });

  it("⚠️ atravessa mês e ano sem errar — o mês do `Date.UTC` é base ZERO", () => {
    // Um `Date.UTC(ano, mes, dia)` sem o `- 1` erra um mês **em todos os casos**, e por isso passaria
    // num teste que só comparasse duas datas do mesmo mês.
    expect(diasAte("2026-04-01", "2026-03-31")).toBe(1);
    expect(diasAte("2027-01-01", "2026-12-31")).toBe(1);
    expect(diasAte("2026-03-01", "2026-02-28")).toBe(1);
  });
});

describe("`FR-050` a `FR-052` · os sinais da linha", () => {
  it("sem instrutor é ALERTA, e diz isso", () => {
    const sinais = sinaisDaDisciplina(
      { instrutoresAtribuidos: 0, previsaoInicio: "2026-08-01" },
      30,
      HOJE,
    );
    expect(sinais.map((s) => s.chave)).toEqual(["sem_instrutor"]);
    expect(sinais[0]?.severidade).toBe("alerta");
  });

  it("⚠️ O CASO QUE DISCRIMINA · previsão NULA não sinaliza início próximo", () => {
    const sinais = sinaisDaDisciplina({ instrutoresAtribuidos: 2, previsaoInicio: null }, 30, HOJE);
    expect(sinais.map((s) => s.chave)).toEqual(["sem_previsao"]);
    expect(
      sinais.some((s) => s.chave === "inicio_proximo"),
      "previsão ausente virou 'começa em breve' — é o que aconteceria com as 121 linhas reais",
    ).toBe(false);
  });

  it("e a ausência de previsão é INFORMATIVO, não alerta — não é pendência de ninguém", () => {
    const sinais = sinaisDaDisciplina({ instrutoresAtribuidos: 2, previsaoInicio: null }, 30, HOJE);
    expect(sinais[0]?.severidade).toBe("informativo");
  });

  it("⚠️ O SEGUNDO CASO QUE DISCRIMINA · mudar N de 30 para 15 vira o veredito", () => {
    // 20 dias à frente: dentro de 30, fora de 15. Nenhuma linha de código muda entre as duas
    // chamadas — só o parâmetro, que vive em `config_parametros` (regra 8).
    const linha = { instrutoresAtribuidos: 1, previsaoInicio: "2026-03-30" };
    expect(sinaisDaDisciplina(linha, 30, HOJE).some((s) => s.chave === "inicio_proximo")).toBe(
      true,
    );
    expect(sinaisDaDisciplina(linha, 15, HOJE).some((s) => s.chave === "inicio_proximo")).toBe(
      false,
    );
  });

  it("⚠️ `FR-051` · começar em breve SEM instrutor é mais grave que começar em breve com", () => {
    const comInstrutor = sinaisDaDisciplina(
      { instrutoresAtribuidos: 1, previsaoInicio: "2026-03-15" },
      30,
      HOJE,
    );
    const semInstrutor = sinaisDaDisciplina(
      { instrutoresAtribuidos: 0, previsaoInicio: "2026-03-15" },
      30,
      HOJE,
    );
    expect(comInstrutor.find((s) => s.chave === "inicio_proximo")?.severidade).toBe("atencao");
    expect(semInstrutor.find((s) => s.chave === "inicio_proximo")?.severidade).toBe("alerta");
    // E o texto do caso grave NOMEIA a ausência — quem lê a linha não precisa cruzar duas colunas.
    expect(semInstrutor.find((s) => s.chave === "inicio_proximo")?.texto).toContain("não tem");
  });

  it("data já passada não sinaliza início próximo — o aviso é para ANTECIPAR", () => {
    const sinais = sinaisDaDisciplina(
      { instrutoresAtribuidos: 1, previsaoInicio: "2026-01-05" },
      30,
      HOJE,
    );
    expect(sinais).toEqual([]);
  });

  it("a severidade da linha é a mais grave, e é nula quando não há sinal", () => {
    expect(severidadeDaLinha([])).toBeNull();
    expect(
      severidadeDaLinha(
        sinaisDaDisciplina({ instrutoresAtribuidos: 0, previsaoInicio: "2026-03-15" }, 30, HOJE),
      ),
    ).toBe("alerta");
  });
});

describe("`FR-053` · a situação vem da EXECUÇÃO", () => {
  const casos: ReadonlyArray<
    readonly [
      string,
      { previstos: number; executados: number; previsaoTermino: string | null },
      SituacaoDeExecucao,
    ]
  > = [
    [
      "nada executado",
      { previstos: 10, executados: 0, previsaoTermino: "2026-12-01" },
      "nao_iniciada",
    ],
    [
      "parte executada",
      { previstos: 10, executados: 4, previsaoTermino: "2026-12-01" },
      "em_andamento",
    ],
    ["saldo zerado", { previstos: 10, executados: 10, previsaoTermino: "2026-12-01" }, "concluida"],
    [
      "executou além",
      { previstos: 10, executados: 12, previsaoTermino: "2026-12-01" },
      "concluida",
    ],
    [
      "prazo vencido com saldo",
      { previstos: 10, executados: 4, previsaoTermino: "2026-02-01" },
      "atrasada",
    ],
  ];

  it.each(casos)("%s", (_nome, execucao, esperado) => {
    expect(situacaoDaExecucao(execucao, HOJE)).toBe(esperado);
  });

  it("⚠️ O CASO QUE DISCRIMINA · término NULO nunca é atrasada", () => {
    expect(situacaoDaExecucao({ previstos: 10, executados: 0, previsaoTermino: null }, HOJE)).toBe(
      "nao_iniciada",
    );
    expect(situacaoDaExecucao({ previstos: 10, executados: 3, previsaoTermino: null }, HOJE)).toBe(
      "em_andamento",
    );
  });

  it("⚠️ concluída VENCE atrasada — quem fechou a CH não tem o que fazer", () => {
    // Inverter os dois ramos encheria a grade de "atrasada" para disciplinas que terminaram.
    expect(
      situacaoDaExecucao({ previstos: 10, executados: 10, previsaoTermino: "2026-01-01" }, HOJE),
    ).toBe("concluida");
  });

  it("toda situação tem rótulo em português, sem sublinhado", () => {
    for (const [chave, rotulo] of Object.entries(ROTULO_DA_SITUACAO)) {
      expect(rotulo).not.toBe(chave);
      expect(rotulo).not.toContain("_");
    }
  });
});

describe("`SC-011` · os indicadores somam O QUE ESTÁ NA TABELA", () => {
  const linhas = [
    { previstos: 10, executados: 0, previsaoTermino: "2026-12-01", instrutoresAtribuidos: 0 },
    { previstos: 20, executados: 5, previsaoTermino: "2026-12-01", instrutoresAtribuidos: 2 },
    { previstos: 30, executados: 30, previsaoTermino: "2026-12-01", instrutoresAtribuidos: 1 },
    { previstos: 8, executados: 2, previsaoTermino: "2026-02-01", instrutoresAtribuidos: 1 },
  ];

  it("conta, soma e classifica", () => {
    const i = indicadoresDaGrade(linhas, HOJE);
    expect(i.disciplinas).toBe(4);
    expect(i.semInstrutor).toBe(1);
    expect(i.chPrevistaTempos).toBe(68);
    expect(i.chCumpridaTempos).toBe(37);
    expect(i.porSituacao).toEqual({
      nao_iniciada: 1,
      em_andamento: 1,
      concluida: 1,
      atrasada: 1,
    });
  });

  it("⚠️ a soma das situações FECHA com o total — senão uma linha some do painel", () => {
    const i = indicadoresDaGrade(linhas, HOJE);
    const soma = Object.values(i.porSituacao).reduce((a, b) => a + b, 0);
    expect(soma).toBe(i.disciplinas);
  });

  it("⚠️ FILTRAR muda os indicadores — é o que o `SC-011` cobra", () => {
    // Os indicadores recebem as linhas JÁ filtradas. Uma implementação que buscasse a contagem por
    // outra consulta mostraria o total do curso ao lado da tabela filtrada, e ninguém notaria.
    const soComInstrutor = linhas.filter((l) => l.instrutoresAtribuidos > 0);
    const i = indicadoresDaGrade(soComInstrutor, HOJE);
    expect(i.disciplinas).toBe(3);
    expect(i.semInstrutor).toBe(0);
    expect(i.chPrevistaTempos).toBe(58);
  });

  it("lista vazia devolve zeros, sem estourar (`RN-DEG-01`)", () => {
    const i = indicadoresDaGrade([], HOJE);
    expect(i.disciplinas).toBe(0);
    expect(i.chPrevistaTempos).toBe(0);
  });
});

describe("`FR-062` · a soma das unidades avisa, e a ausência não avisa nada", () => {
  it("soma exata não avisa", () => {
    const c = conferirSomaDasUnidades(
      [
        { chPrevistaTempos: 6, ativa: true },
        { chPrevistaTempos: 4, ativa: true },
      ],
      10,
    );
    expect(c?.fecha).toBe(true);
    expect(c?.aviso).toBeNull();
  });

  it("⚠️ faltando, o aviso traz OS DOIS números e a diferença", () => {
    const c = conferirSomaDasUnidades([{ chPrevistaTempos: 6, ativa: true }], 10);
    expect(c?.fecha).toBe(false);
    expect(c?.aviso).toContain("6");
    expect(c?.aviso).toContain("10");
    expect(c?.aviso).toContain("faltam 4");
  });

  it("passando da CH, a frase é a outra — não é a mesma pendência", () => {
    const c = conferirSomaDasUnidades([{ chPrevistaTempos: 14, ativa: true }], 10);
    expect(c?.aviso).toContain("passam 4");
  });

  it("⚠️ O CASO QUE DISCRIMINA · disciplina SEM UE devolve `null`, não um aviso (D-B3)", () => {
    // ⚠️ Das 175 disciplinas reais, 138 têm UE. Avisar "faltam unidades" nas 37 restantes inventaria
    //    uma pendência que ninguém tem — e é a diferença entre "não há" e "está incompleto".
    expect(conferirSomaDasUnidades([], 10)).toBeNull();
  });

  it("⚠️ UE INATIVA não entra na soma — exclusão é lógica e a linha fica no banco", () => {
    const c = conferirSomaDasUnidades(
      [
        { chPrevistaTempos: 6, ativa: true },
        { chPrevistaTempos: 4, ativa: true },
        { chPrevistaTempos: 99, ativa: false },
      ],
      10,
    );
    expect(c?.somaTempos).toBe(10);
    expect(c?.unidades).toBe(2);
    expect(c?.fecha).toBe(true);
  });

  it("todas inativas é o mesmo que nenhuma — devolve `null`", () => {
    expect(conferirSomaDasUnidades([{ chPrevistaTempos: 10, ativa: false }], 10)).toBeNull();
  });
});

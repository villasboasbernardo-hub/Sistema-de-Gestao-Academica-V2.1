/**
 * `FR-011`, `FR-021.1`, `FR-021.2`, `FR-021.4` · o histórico de vigências e o que a tela oferece.
 *
 * ⚠️ **O CASO QUE DISCRIMINA, AQUI, É A VIGÊNCIA ATIVA COM TRAVA.** Uma implementação que oferecesse
 * "Corrigir" a toda ativa passaria em tudo o mais: cancelada já é recusada pelo status. É a linha
 * ativa **que o banco travou** que separa as duas leituras.
 */
import { describe, expect, it } from "vitest";

import {
  historicoDoTipo,
  marcaDaCancelada,
  mensagemDaTrava,
  podeCorrigir,
  travaDe,
  valoresDaVigencia,
  vigenteEm,
  type TravaDaVigencia,
  type VigenciaDoHistorico,
} from "@/lib/dominio/vigencia-de-regime";

const base: VigenciaDoHistorico = {
  id: "v1",
  codigo: "REG-000001",
  tipo: "padrao",
  status: "ativo",
  vigenteDe: "2020-01-01",
  vigenteAte: null,
  regimeTempos: 8,
  taDuracaoMin: 45,
  intervaloManhaMin: 10,
  intervaloTardeMin: 10,
  horaInicioManha: "07:30",
  horaInicioTarde: "13:30",
  limiteDiarioEadHoras: null,
  fundamentoCurricular: "PCP-FCT-2",
  motivo: null,
};

const com = (p: Partial<VigenciaDoHistorico>): VigenciaDoHistorico => ({ ...base, ...p });

const trava = (p: Partial<TravaDaVigencia> = {}): TravaDaVigencia => ({
  vigenciaId: "v1",
  tipo: "aula",
  data: "2026-03-02",
  turma: "C-Ap-FR T1 2026",
  atividade: null,
  total: 1,
  pontaAusente: null,
  ...p,
});

describe("`FR-021.1` · o histórico traz ativas E canceladas, a mais recente primeiro", () => {
  const historico = [
    com({ id: "a", codigo: "REG-000001", vigenteDe: "2020-01-01", vigenteAte: "2025-12-31" }),
    com({ id: "b", codigo: "REG-000002", vigenteDe: "2026-01-01", status: "cancelado" }),
    com({ id: "c", codigo: "REG-000003", vigenteDe: "2026-01-01" }),
    com({ id: "d", codigo: "REG-000004", tipo: "excecao", vigenteDe: "2026-02-01" }),
  ];

  it("⚠️ a cancelada NÃO some — ela é o registro de que houve correção", () => {
    const padrao = historicoDoTipo(historico, "padrao");
    expect(padrao.map((v) => v.id)).toContain("b");
  });

  it("a mais recente vem primeiro, e o código desempata quando a data é a mesma", () => {
    expect(historicoDoTipo(historico, "padrao").map((v) => v.id)).toEqual(["c", "b", "a"]);
  });

  it("cada tipo tem o seu histórico", () => {
    expect(historicoDoTipo(historico, "excecao").map((v) => v.id)).toEqual(["d"]);
  });

  it("⚠️ e a lista recebida não é reordenada", () => {
    const original = [...historico];
    historicoDoTipo(historico, "padrao");
    expect(historico).toEqual(original);
  });
});

describe("`FR-011` · o regime vigente hoje", () => {
  const historico = [
    com({ id: "a", codigo: "REG-000001", vigenteDe: "2020-01-01", vigenteAte: "2025-12-31" }),
    com({ id: "c", codigo: "REG-000003", vigenteDe: "2026-01-01" }),
  ];

  it("a janela inclui as duas pontas (`FR-021.5`)", () => {
    expect(vigenteEm(historico, "padrao", "2025-12-31")?.id).toBe("a");
    expect(vigenteEm(historico, "padrao", "2026-01-01")?.id).toBe("c");
  });

  it("⚠️ `vigente_ate` nulo é ponta aberta", () => {
    expect(vigenteEm(historico, "padrao", "2099-01-01")?.id).toBe("c");
  });

  it("⚠️ a CANCELADA nunca é a vigente, mesmo cobrindo a data", () => {
    const comCancelada = [com({ id: "x", vigenteDe: "2026-01-01", status: "cancelado" })];
    expect(vigenteEm(comCancelada, "padrao", "2026-06-01")).toBeNull();
  });

  it("antes da primeira, não há vigente — e isso não é zero", () => {
    expect(vigenteEm(historico, "padrao", "2019-12-31")).toBeNull();
  });

  it("hoje é ARGUMENTO: a mesma lista dá vereditos diferentes em datas diferentes", () => {
    expect(vigenteEm(historico, "padrao", "2021-06-01")?.id).not.toBe(
      vigenteEm(historico, "padrao", "2026-06-01")?.id,
    );
  });
});

describe("`FR-021.2` · 'Corrigir esta vigência' só onde o banco não achou lançamento", () => {
  it("ativa e sem trava: a ação é oferecida", () => {
    expect(podeCorrigir(base, [])).toBe(true);
  });

  it("⚠️ O CASO QUE DISCRIMINA — ativa COM trava: a ação NÃO é oferecida", () => {
    expect(podeCorrigir(base, [trava()])).toBe(false);
  });

  it("⚠️ a trava é por vigência, e não do curso inteiro", () => {
    expect(podeCorrigir(base, [trava({ vigenciaId: "outra" })])).toBe(true);
  });

  it("cancelada nunca se corrige, nem sem trava", () => {
    expect(podeCorrigir(com({ status: "cancelado" }), [])).toBe(false);
  });

  it("a trava da vigência é devolvida para a tela explicar", () => {
    expect(travaDe(base, [trava()])?.tipo).toBe("aula");
    expect(travaDe(base, [])).toBeNull();
  });
});

describe("`FR-021.4` · a recusa diz o que impede e qual é o caminho", () => {
  it("nomeia tipo, data e turma", () => {
    const m = mensagemDaTrava(trava());
    expect(m).toContain("aula");
    expect(m).toContain("2026-03-02");
    expect(m).toContain("C-Ap-FR T1 2026");
  });

  it("⚠️ e SEMPRE diz o caminho — sem ele, a pessoa sabe que não pode e não sabe o que fazer", () => {
    expect(mensagemDaTrava(trava())).toContain("registrar vigência nova");
  });

  it("conta quantos são, quando é mais de um", () => {
    expect(mensagemDaTrava(trava({ total: 7 }))).toContain("7 lançamentos");
    expect(mensagemDaTrava(trava({ total: 1 }))).not.toContain("São 1");
  });

  it("a vista de prova aparece com o nome que a pessoa usa", () => {
    expect(mensagemDaTrava(trava({ tipo: "vista_de_prova" }))).toContain("vista de prova");
  });

  it("⚠️ a atividade global diz qual atividade, e a janela incompleta diz QUAL ponta falta", () => {
    const m = mensagemDaTrava(
      trava({
        tipo: "atividade_global",
        atividade: "Comemoração cívica",
        pontaAusente: "termino",
        turma: "C-Ap-HN 2026",
      }),
    );
    expect(m).toContain("escopo global");
    expect(m).toContain("Comemoração cívica");
    expect(m).toContain("data de término");
  });

  it("⚠️ e nunca traz erro cru do banco", () => {
    const m = mensagemDaTrava(trava());
    for (const cru of ["23505", "42501", "violates", "constraint"]) {
      expect(m, `vazou "${cru}"`).not.toContain(cru);
    }
  });
});

describe("a cancelada se apresenta marcada (`FR-021.1`, A-5)", () => {
  it("com o motivo, quando há", () => {
    expect(marcaDaCancelada(com({ status: "cancelado", motivo: "erro de digitação" }))).toBe(
      "cancelada — erro de digitação",
    );
  });

  it("sem inventar motivo, quando não há", () => {
    expect(marcaDaCancelada(com({ status: "cancelado", motivo: "   " }))).toBe("cancelada");
  });

  it("⚠️ e a ativa não recebe marca nenhuma", () => {
    expect(marcaDaCancelada(base)).toBeNull();
  });
});

describe("`FR-021.1` · o formulário de correção abre com os valores atuais", () => {
  it("todos os parâmetros vêm preenchidos", () => {
    const v = valoresDaVigencia(base);
    expect(v.regime_tempos).toBe("8");
    expect(v.ta_duracao_min).toBe("45");
    expect(v.hora_inicio_manha).toBe("07:30");
    expect(v.vigente_de).toBe("2020-01-01");
    expect(v.tipo_regime).toBe("padrao");
    expect(v.fundamento_curricular).toBe("PCP-FCT-2");
  });

  it("⚠️ o que é nulo vira vazio, e não o texto 'null'", () => {
    const v = valoresDaVigencia(com({ limiteDiarioEadHoras: null, horaInicioTarde: null }));
    expect(v.limite_diario_ead_horas).toBe("");
    expect(v.hora_inicio_tarde).toBe("");
  });

  it("⚠️ o MOTIVO não é herdado — ele explica ESTA correção, não a anterior", () => {
    expect(valoresDaVigencia(com({ motivo: "motivo de outra mudança" })).motivo).toBe("");
  });
});

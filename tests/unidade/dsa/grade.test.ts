/**
 * `RF-DSA-03` · `RN-EVT-02` · `RN-DEG-01` · `SC-011` · `SC-015` · `SC-017` — a grade da semana.
 *
 * ⚠️ **ESTE ARQUIVO PROVA A COMPOSIÇÃO, não as regras.** O relógio, a faixa "Sem posição", a
 * capacidade e o conflito têm testes próprios; aqui se prova que a matriz `dia × TA` sai certa
 * **usando** aqueles módulos — e, em especial, que nenhum lançamento desaparece.
 */

import { describe, expect, it } from "vitest";

import type { MarcaDeConflito } from "@/lib/dominio/dsa/conflitos";
import { montarSemana, type FatoDaSemana } from "@/lib/dominio/dsa/grade";
import { relogioDoRegime } from "@/lib/dominio/dsa/horario-do-bloco";
import { G45 } from "./relogio-real";

const SEMANA = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"] as const;
const SABADO = "2026-10-10";
const HOJE = "2026-10-06";
const SEM_MARCAS: ReadonlyMap<string, MarcaDeConflito> = new Map();

function fato(ajustes: Partial<FatoDaSemana> = {}): FatoDaSemana {
  return {
    fatoId: "fato-1",
    origem: "aula",
    data: "2026-10-05",
    taInicial: 1,
    tempos: 2,
    herdado: false,
    disciplina: "II",
    conteudo: "Navegação costeira",
    tecnica: "EO",
    instrutor: "1ºTEN SILVA",
    local: "SALA 3",
    ...ajustes,
  };
}

function montar(ajustes: Partial<Parameters<typeof montarSemana>[0]> = {}) {
  return montarSemana({
    dias: [...SEMANA],
    relogio: relogioDoRegime(G45),
    temposDeclarados: G45.regimeTempos,
    fatos: [],
    feriados: [],
    marcas: SEM_MARCAS,
    hoje: HOJE,
    sabadoAberto: false,
    ...ajustes,
  });
}

describe("`RF-DSA-03` · a matriz dia × TA", () => {
  it("tem um dia por data e uma linha por TA do regime", () => {
    const semana = montar();
    expect(semana.dias).toHaveLength(5);
    expect(semana.linhas).toBe(8);
    expect(semana.dias[0]?.celulas).toHaveLength(8);
  });

  it("cada célula traz o horário do seu TA — `RF-HOR-06`", () => {
    const semana = montar();
    const primeira = semana.dias[0]?.celulas[0];
    expect(primeira?.horario).toEqual({ inicio: "07:50", fim: "08:35", periodo: "manha" });
    const quinta = semana.dias[0]?.celulas[4];
    expect(quinta?.horario).toEqual({ inicio: "11:10", fim: "11:55", periodo: "manha" });
  });

  it("o bloco ocupa a célula inicial e marca as seguintes como continuação", () => {
    const semana = montar({ fatos: [fato({ taInicial: 3, tempos: 3 })] });
    const celulas = semana.dias[0]?.celulas ?? [];
    expect(celulas[2]?.estado).toBe("ocupada");
    expect(celulas[2]?.bloco?.fatoId).toBe("fato-1");
    expect(celulas[3]?.estado).toBe("continuacao");
    expect(celulas[3]?.bloco).toBeNull();
    expect(celulas[4]?.estado).toBe("continuacao");
    expect(celulas[5]?.estado).toBe("livre");
  });

  it("`SC-011` · o bloco que atravessa o almoço carrega DOIS trechos", () => {
    const semana = montar({ fatos: [fato({ taInicial: 3, tempos: 4 })] });
    const bloco = semana.dias[0]?.celulas[2]?.bloco;
    expect(bloco?.trechos.map((t) => `${t.inicio}-${t.fim}`)).toEqual([
      "09:30-11:55",
      "13:05-13:50",
    ]);
  });

  it("dia sem lançamento tem todas as células livres", () => {
    const semana = montar({ fatos: [fato({ data: "2026-10-05" })] });
    expect(semana.dias[1]?.celulas.every((c) => c.estado === "livre")).toBe(true);
  });
});

describe("`RN-EVT-02` · o feriado e os três impactos — critério 6", () => {
  it("`dia_inteiro` bloqueia o dia, com a descrição, e tira o dia da capacidade", () => {
    const semana = montar({
      feriados: [
        { data: "2026-10-07", descricao: "Nossa Senhora Aparecida", impacto: "dia_inteiro" },
      ],
    });
    const quarta = semana.dias[2];
    expect(quarta?.bloqueio).toBe("Nossa Senhora Aparecida");
    expect(quarta?.celulas.every((c) => c.estado === "bloqueada")).toBe(true);
    expect(semana.capacidade?.diasUteis).toBe(4);
    expect(semana.capacidade?.ta).toBe(32);
  });

  it("`parcial` e `informativo` NÃO bloqueiam — viram aviso, e a capacidade não muda", () => {
    const semana = montar({
      feriados: [
        { data: "2026-10-07", descricao: "Dia do Servidor", impacto: "parcial" },
        { data: "2026-10-08", descricao: "Aniversário da OM", impacto: "informativo" },
      ],
    });
    expect(semana.dias[2]?.bloqueio).toBeNull();
    expect(semana.dias[2]?.avisos).toEqual(["Dia do Servidor"]);
    expect(semana.dias[3]?.avisos).toEqual(["Aniversário da OM"]);
    expect(semana.capacidade?.diasUteis).toBe(5);
  });

  it("⚠️ o lançamento gravado num dia BLOQUEADO continua visível — esconder seria esconder um fato", () => {
    const semana = montar({
      fatos: [fato({ data: "2026-10-07", taInicial: 1, tempos: 2 })],
      feriados: [{ data: "2026-10-07", descricao: "Feriado", impacto: "dia_inteiro" }],
    });
    const quarta = semana.dias[2];
    expect(quarta?.bloqueio).toBe("Feriado");
    expect(quarta?.celulas[0]?.estado).toBe("ocupada");
    expect(quarta?.celulas[0]?.bloco?.fatoId).toBe("fato-1");
    expect(quarta?.celulas[1]?.estado).toBe("continuacao");
    // A célula VAZIA do dia bloqueado é que sai bloqueada.
    expect(quarta?.celulas[2]?.estado).toBe("bloqueada");
  });
});

describe("`RN-DEG-01` · a faixa «Sem posição» e a degradação", () => {
  it("`SC-015` · lançamento sem `taInicial` vai para a faixa do seu dia, com o motivo", () => {
    const semana = montar({ fatos: [fato({ taInicial: null, tempos: null })] });
    expect(semana.dias[0]?.semPosicao).toHaveLength(1);
    expect(semana.dias[0]?.semPosicao[0]?.motivo).not.toBe("");
    expect(semana.dias[0]?.celulas.every((c) => c.estado === "livre")).toBe(true);
  });

  it("`SC-017` · a avaliação herdada no 1º TA cai na faixa; a NOVA no 1º TA fica na grade", () => {
    const semana = montar({
      fatos: [
        fato({ fatoId: "herdada", origem: "avaliacao", herdado: true, taInicial: 1, tempos: 1 }),
        fato({
          fatoId: "nova",
          origem: "avaliacao",
          herdado: false,
          taInicial: 1,
          tempos: 1,
          data: "2026-10-06",
        }),
      ],
    });
    expect(semana.dias[0]?.semPosicao.map((f) => f.fato.fatoId)).toEqual(["herdada"]);
    expect(semana.dias[1]?.celulas[0]?.bloco?.fatoId).toBe("nova");
  });

  it("sem relógio: toda célula é `sem_relogio` e a capacidade é `null` — nunca zero", () => {
    const semana = montar({ relogio: null });
    expect(semana.dias[0]?.celulas.every((c) => c.estado === "sem_relogio")).toBe(true);
    expect(semana.dias[0]?.celulas.every((c) => c.horario === null)).toBe(true);
    expect(semana.capacidade?.ta).toBe(40); // os TA declarados ainda contam a capacidade
  });

  it("sem relógio E sem TA declarados: ZERO linhas, e só a faixa aparece", () => {
    const semana = montar({
      relogio: null,
      temposDeclarados: null,
      fatos: [fato({ taInicial: null, tempos: null })],
    });
    expect(semana.linhas).toBe(0);
    expect(semana.dias[0]?.celulas).toEqual([]);
    expect(semana.dias[0]?.semPosicao).toHaveLength(1);
    expect(semana.capacidade).toBeNull();
  });

  it("⚠️ lançamento ACIMA do regime cria a linha — nenhum lançamento fica escondido", () => {
    const semana = montar({ fatos: [fato({ taInicial: 9, tempos: 1 })] });
    expect(semana.linhas).toBe(9);
    expect(semana.dias[0]?.celulas[8]?.estado).toBe("ocupada");
    // E o relógio marca o 9º como excepcional (`RF-HOR-03.1`), que é alerta e não erro.
    expect(semana.relogio?.tempos[8]?.tipo).toBe("excepcional");
  });
});

describe("`Q-2` · o lançado à frente conta e é MARCADO", () => {
  it("lançamento com data posterior a hoje vem com `lancadoAFrente`", () => {
    const semana = montar({
      fatos: [
        fato({ fatoId: "passado", data: "2026-10-05" }),
        fato({ fatoId: "futuro", data: "2026-10-09" }),
      ],
    });
    expect(semana.dias[0]?.celulas[0]?.bloco?.lancadoAFrente).toBe(false);
    expect(semana.dias[4]?.celulas[0]?.bloco?.lancadoAFrente).toBe(true);
  });

  it("o lançamento de HOJE não é «à frente»", () => {
    const semana = montar({ fatos: [fato({ data: HOJE })] });
    expect(semana.dias[1]?.celulas[0]?.bloco?.lancadoAFrente).toBe(false);
  });
});

describe("`RN-CONF-01` · as marcas de conflito chegam PRONTAS", () => {
  it("a grade carrega a marca que `detectarConflitos` produziu, sem recalcular", () => {
    const marcas = new Map<string, MarcaDeConflito>([
      ["fato-1", { conflito: "instrutor", alertaSala: true }],
    ]);
    const semana = montar({ fatos: [fato()], marcas });
    const bloco = semana.dias[0]?.celulas[0]?.bloco;
    expect(bloco?.conflito).toBe("instrutor");
    expect(bloco?.alertaSala).toBe(true);
  });

  it("bloco sem marca sai sem conflito e sem alerta", () => {
    const semana = montar({ fatos: [fato()] });
    const bloco = semana.dias[0]?.celulas[0]?.bloco;
    expect(bloco?.conflito).toBeNull();
    expect(bloco?.alertaSala).toBe(false);
  });
});

describe("`Q-4` · o sábado", () => {
  it("entra como sexto dia quando aberto, com as mesmas linhas", () => {
    const semana = montar({ dias: [...SEMANA, SABADO], sabadoAberto: true });
    expect(semana.dias).toHaveLength(6);
    expect(semana.dias[5]?.data).toBe(SABADO);
    expect(semana.dias[5]?.celulas).toHaveLength(8);
    expect(semana.sabadoAberto).toBe(true);
  });

  it("a capacidade conta o sábado quando ele está na semana", () => {
    const semana = montar({ dias: [...SEMANA, SABADO], sabadoAberto: true });
    expect(semana.capacidade?.diasUteis).toBe(6);
  });
});

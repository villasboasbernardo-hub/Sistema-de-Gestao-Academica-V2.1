/**
 * `FR-040` · `Q-1` · `RF-AVAL-06` — o bloco, a unidade de lançamento do DSA.
 *
 * ⚠️ **ESTE ARQUIVO EXISTE POR CAUSA DO DoD 2, e não por causa da lista de tarefas.** A `T001` cria
 * `bloco.ts` e **não** tem tarefa de teste própria — mas o *Definition of Done* do `CLAUDE.md` exige
 * *"Vitest em toda função de `lib/dominio/` tocada, com casos sintéticos"*, e `blocoValido` é função
 * de domínio com regra dentro. A lista de tarefas tinha a lacuna; o DoD não.
 */

import { describe, expect, it } from "vitest";

import { blocoValido, TA_MAXIMO, type Bloco, type ContextoDoBloco } from "@/lib/dominio/dsa/bloco";

const COM_UE: ContextoDoBloco = { disciplinaIsentaDeUe: false };
const SEM_UE: ContextoDoBloco = { disciplinaIsentaDeUe: true };

/** Uma aula válida, com UE — o caso de partida de quase todos os testes. */
function aula(ajustes: Partial<Bloco> = {}): Bloco {
  return {
    turmaId: "turma-1",
    data: "2026-10-05",
    taInicial: 1,
    tempos: 2,
    tipo: "aula",
    disciplinaId: undefined,
    unidadeEnsinoId: "ue-1",
    instrutorId: "instrutor-1",
    ...ajustes,
  };
}

function motivos(bloco: Bloco, contexto: ContextoDoBloco): readonly string[] {
  const conferido = blocoValido(bloco, contexto);
  return conferido.ok ? [] : conferido.motivos;
}

describe("o caso que passa — para que os negativos signifiquem algo", () => {
  it("aula com UE, instrutor e posição válida é aceita", () => {
    expect(blocoValido(aula(), COM_UE)).toEqual({ ok: true });
  });

  it("aula SEM UE em disciplina isenta, com tópico, é aceita (`Q-1`)", () => {
    const bloco = aula({
      unidadeEnsinoId: undefined,
      disciplinaId: "disciplina-1",
      conteudo: "Navegação costeira — exercício de carta",
    });
    expect(blocoValido(bloco, SEM_UE)).toEqual({ ok: true });
  });
});

describe("`CHECK reg_aula_ta_valido` · a faixa de TA, medida no banco", () => {
  it(`fora de 1..${TA_MAXIMO} é recusado nas duas pontas`, () => {
    expect(motivos(aula({ taInicial: 0 }), COM_UE).join(" ")).toContain("tempo inicial");
    expect(motivos(aula({ taInicial: TA_MAXIMO + 1 }), COM_UE).join(" ")).toContain(
      "tempo inicial",
    );
    expect(motivos(aula({ tempos: 0 }), COM_UE).join(" ")).toContain("quantidade de tempos");
  });

  it("o bloco que PASSA do último tempo é recusado — e a mensagem diz qual é o último", () => {
    const lista = motivos(aula({ taInicial: 11, tempos: 3 }), COM_UE);
    expect(lista.join(" ")).toContain(`${TA_MAXIMO}º tempo`);
  });

  it("o bloco que termina EXATAMENTE no último tempo é aceito", () => {
    expect(blocoValido(aula({ taInicial: 11, tempos: 2 }), COM_UE)).toEqual({ ok: true });
  });

  it("TA fracionário é recusado — a coluna é `smallint`", () => {
    expect(motivos(aula({ taInicial: 1.5 }), COM_UE)).not.toHaveLength(0);
  });
});

describe("a data é texto `aaaa-mm-dd`, nunca `Date`", () => {
  it("formato fora do ISO é recusado", () => {
    expect(motivos(aula({ data: "05/10/2026" }), COM_UE).join(" ")).toContain("aaaa-mm-dd");
    expect(motivos(aula({ data: "2026-10-5" }), COM_UE).join(" ")).toContain("aaaa-mm-dd");
    expect(motivos(aula({ data: "" }), COM_UE).join(" ")).toContain("aaaa-mm-dd");
  });
});

describe("`Q-1` · UE **ou** disciplina, e o tópico quando não há UE", () => {
  it("aula sem UE em disciplina que TEM UE é recusada, com a frase do banco", () => {
    const bloco = aula({ unidadeEnsinoId: undefined, disciplinaId: "disciplina-1", conteudo: "x" });
    expect(motivos(bloco, COM_UE).join(" ")).toContain("tem unidades de ensino");
  });

  it("aula sem UE em disciplina isenta, mas SEM tópico, é recusada", () => {
    const bloco = aula({ unidadeEnsinoId: undefined, disciplinaId: "disciplina-1" });
    expect(motivos(bloco, SEM_UE).join(" ")).toContain("tópico");
  });

  it("tópico só com espaço não conta como tópico", () => {
    const bloco = aula({
      unidadeEnsinoId: undefined,
      disciplinaId: "disciplina-1",
      conteudo: "   ",
    });
    expect(motivos(bloco, SEM_UE).join(" ")).toContain("tópico");
  });

  it("⚠️ UE **e** disciplina juntas são recusadas — o `reg_aula_ue_xor_disciplina`", () => {
    const bloco = aula({ unidadeEnsinoId: "ue-1", disciplinaId: "disciplina-1" });
    expect(motivos(bloco, COM_UE).join(" ")).toContain("não as duas");
  });

  it("aula sem UE **e** sem disciplina é recusada", () => {
    const bloco = aula({ unidadeEnsinoId: undefined, disciplinaId: undefined });
    expect(motivos(bloco, SEM_UE)).not.toHaveLength(0);
  });
});

describe("`CHECK reg_aula_instrutor_obrigatorio` · aula precisa de instrutor", () => {
  it("aula sem instrutor é recusada", () => {
    expect(motivos(aula({ instrutorId: undefined }), COM_UE).join(" ")).toContain("instrutor");
  });

  it("atividade não letiva **não** precisa de instrutor", () => {
    const bloco: Bloco = {
      turmaId: "turma-1",
      data: "2026-10-05",
      taInicial: 9,
      tempos: 1,
      tipo: "estudo_individual",
    };
    expect(blocoValido(bloco, COM_UE)).toEqual({ ok: true });
  });
});

describe("`RF-AVAL-06` · o fiscal pode ser alguém de FORA do cadastro", () => {
  function avaliacao(ajustes: Partial<Bloco> = {}): Bloco {
    return {
      turmaId: "turma-1",
      data: "2026-10-05",
      taInicial: 3,
      tempos: 2,
      tipo: "avaliacao",
      disciplinaId: "disciplina-1",
      instrutorId: "instrutor-1",
      ...ajustes,
    };
  }

  it("fiscal com nome externo é aceito — a habilitação não se aplica a este papel", () => {
    const bloco = avaliacao({ fiscal: { nomeExterno: "2ºTEN (RM2-T) CARDOSO (HNMD)" } });
    expect(blocoValido(bloco, COM_UE)).toEqual({ ok: true });
  });

  it("fiscal do cadastro é aceito", () => {
    expect(blocoValido(avaliacao({ fiscal: { instrutorId: "instrutor-2" } }), COM_UE)).toEqual({
      ok: true,
    });
  });

  it("avaliação sem fiscal é aceita — o fiscal é opcional", () => {
    expect(blocoValido(avaliacao(), COM_UE)).toEqual({ ok: true });
  });

  it("avaliação sem responsável é recusada", () => {
    expect(motivos(avaliacao({ instrutorId: undefined }), COM_UE).join(" ")).toContain(
      "responsável",
    );
  });

  it("avaliação sem disciplina é recusada (`RN-MAT-01`)", () => {
    expect(motivos(avaliacao({ disciplinaId: undefined }), COM_UE).join(" ")).toContain(
      "disciplina",
    );
  });
});

describe("`RN-EVT-01` · a atividade não letiva não se vincula a disciplina", () => {
  function atividade(ajustes: Partial<Bloco> = {}): Bloco {
    return {
      turmaId: "turma-1",
      data: "2026-10-05",
      taInicial: 5,
      tempos: 2,
      tipo: "aec",
      subtipo: "Palestra",
      ...ajustes,
    };
  }

  it("AEC com subtipo é aceita", () => {
    expect(blocoValido(atividade(), COM_UE)).toEqual({ ok: true });
  });

  it("AEC com disciplina é recusada — ela não compõe a CHD de disciplina nenhuma", () => {
    expect(motivos(atividade({ disciplinaId: "disciplina-1" }), COM_UE).join(" ")).toContain(
      "não se vincula a disciplina",
    );
  });

  it("AEC com UE é recusada", () => {
    expect(motivos(atividade({ unidadeEnsinoId: "ue-1" }), COM_UE).join(" ")).toContain(
      "unidade de ensino",
    );
  });

  it("`Q-8` · responsável externo **e** instrutor juntos é recusado", () => {
    const bloco = atividade({ responsavelExterno: "DOEP", instrutorId: "instrutor-1" });
    expect(motivos(bloco, COM_UE).join(" ")).toContain("nunca os dois");
  });

  it("responsável externo sozinho é aceito (`Q-8`)", () => {
    expect(blocoValido(atividade({ responsavelExterno: "CIAARA-30" }), COM_UE)).toEqual({
      ok: true,
    });
  });

  it("subtipo em tipo que NÃO é atividade é recusado", () => {
    expect(motivos(aula({ subtipo: "Palestra" }), COM_UE).join(" ")).toContain("Subtipo só existe");
  });
});

describe("a conferência devolve TODOS os motivos, não o primeiro", () => {
  it("um bloco com quatro problemas devolve quatro motivos", () => {
    const ruim: Bloco = {
      turmaId: "turma-1",
      data: "ontem",
      taInicial: 0,
      tempos: 99,
      tipo: "aula",
    };
    const lista = motivos(ruim, COM_UE);
    expect(lista.length).toBeGreaterThanOrEqual(4);
  });

  it("⚠️ e é por isso que quem lança uma semana corrige de uma vez", () => {
    const conferido = blocoValido({ ...aula(), data: "x", taInicial: 0 }, COM_UE);
    expect(conferido.ok).toBe(false);
    if (!conferido.ok) expect(new Set(conferido.motivos).size).toBe(conferido.motivos.length);
  });
});

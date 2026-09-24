/**
 * `FR-018.1` · a lista fechada de gravações que confirmam — e o que **não** confirma.
 *
 * ⚠️ **AS DUAS METADES SÃO O TESTE.** Provar que as cinco da lista confirmam é metade: uma
 * implementação que confirmasse tudo passaria nela inteira. O que discrimina é a outra — criar
 * curso, acrescentar sala, editar turma dentro do limite e desativar sala sem uso **não** podem
 * abrir diálogo —, porque é ela que guarda o motivo da decisão: *"confirmação em toda gravação treina
 * a pessoa a clicar sem ler, e a confirmação falha exatamente quando importa"* (A-9, 17/09/2026).
 *
 * Origem: `FR-018.1` da spec 009, `SC-002.3`, contrato de escritas §4.
 */
import { describe, expect, it } from "vitest";

import {
  confirmacaoDaGravacao,
  TIPOS_DE_GRAVACAO,
  type ContextoDaGravacao,
  type TipoDeGravacao,
} from "@/lib/dominio/confirmacao-de-gravacao";

/** As da lista fechada, no contexto que as faz confirmar. */
const CONFIRMAM: readonly { tipo: TipoDeGravacao; contexto: ContextoDaGravacao }[] = [
  { tipo: "desativar_curso", contexto: { sigla: "C-Ap-FR" } },
  { tipo: "reativar_curso", contexto: { sigla: "C-Ap-FR" } },
  { tipo: "registrar_vigencia", contexto: { sigla: "C-Ap-FR", vigenteDe: "2027-01-01" } },
  { tipo: "corrigir_vigencia", contexto: { sigla: "C-Ap-FR", vigenteDe: "2026-01-01" } },
  {
    tipo: "editar_curso",
    contexto: {
      siglaAntiga: "C-Ap-FR",
      siglaNova: "C-Ap-FRN",
      turmasComSiglaAntiga: 3,
      exemploDeTurmaAntiga: "C-Ap-FR 2026",
    },
  },
  {
    tipo: "criar_turma",
    contexto: { anosAcimaDoLimite: [{ ano: 2026, turmas: 4, limite: 3 }] },
  },
  { tipo: "desativar_sala", contexto: { sala: "Sala 04", turmasQueUsamASala: ["C-Ap-FR 2026"] } },
];

/** As mesmas gravações, no contexto em que **não** há o que confirmar. */
const NAO_CONFIRMAM: readonly { tipo: TipoDeGravacao; contexto: ContextoDaGravacao }[] = [
  { tipo: "criar_curso", contexto: { sigla: "C-Ap-FR" } },
  { tipo: "editar_curso", contexto: { siglaAntiga: "C-Ap-FR", siglaNova: "C-Ap-FR" } },
  { tipo: "criar_turma", contexto: {} },
  { tipo: "editar_turma", contexto: { anosAcimaDoLimite: [], vigenciasDesprotegidas: [] } },
  { tipo: "acrescentar_sala", contexto: { sala: "Sala 09" } },
  { tipo: "reativar_sala", contexto: { sala: "Sala 04" } },
  { tipo: "desativar_sala", contexto: { sala: "Sala 09", turmasQueUsamASala: [] } },
];

describe("`FR-018.1` · as cinco da lista fechada confirmam", () => {
  it.each(CONFIRMAM)("$tipo abre diálogo", ({ tipo, contexto }) => {
    const c = confirmacaoDaGravacao(tipo, contexto);
    expect(c.confirma, `${tipo} deveria confirmar`).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.length, `${tipo} abriu diálogo sem dizer nada`).toBeGreaterThan(0);
    expect(c.titulo.length).toBeGreaterThan(5);
    expect(c.rotuloConfirmar.length).toBeGreaterThan(2);
  });

  it("desativar curso fala do que acontece com as turmas — e que nada é apagado", () => {
    const c = confirmacaoDaGravacao("desativar_curso", { sigla: "C-Ap-FR" });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const tudo = c.mensagens.join(" ");
    expect(tudo).toContain("oferta");
    expect(tudo).toContain("consultáveis");
    expect(c.titulo).toContain("C-Ap-FR");
  });

  it("reativar curso diz que ele volta a receber turma e lançamento", () => {
    const c = confirmacaoDaGravacao("reativar_curso", { sigla: "C-Ap-FR" });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("volta a receber turma e lançamento");
  });

  it("registrar vigência avisa que ela não poderá ser corrigida depois que houver lançamento", () => {
    const c = confirmacaoDaGravacao("registrar_vigencia", { vigenteDe: "2027-01-01" });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const tudo = c.mensagens.join(" ");
    expect(tudo).toContain("2027-01-01");
    expect(tudo).toContain("lançamento");
  });

  it("corrigir vigência diz que a atual é cancelada e a nova a substitui", () => {
    const c = confirmacaoDaGravacao("corrigir_vigencia", { vigenteDe: "2026-01-01" });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const tudo = c.mensagens.join(" ");
    expect(tudo).toContain("cancelada");
    expect(tudo).toContain("substitui");
  });
});

describe("`FR-014.2` · a troca de sigla é dita com todas as letras", () => {
  const trocaDeSigla = (): ContextoDaGravacao => ({
    siglaAntiga: "C-Ap-FR",
    siglaNova: "C-Ap-FRN",
    turmasComSiglaAntiga: 3,
    exemploDeTurmaAntiga: "C-Ap-FR 2026",
  });

  it("diz as duas siglas, a contagem, o exemplo, o motivo e a auditoria", () => {
    const c = confirmacaoDaGravacao("editar_curso", trocaDeSigla());
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const m = c.mensagens.join(" ");
    expect(m).toContain("C-Ap-FR");
    expect(m).toContain("C-Ap-FRN");
    expect(m).toContain("(3)");
    expect(m).toContain("C-Ap-FR 2026");
    expect(m).toContain("DSA");
    expect(m).toContain("auditoria");
    expect(m, "a frase precisa dizer que os links antigos param").toContain("links antigos");
  });

  it("⚠️ a mesma sigla não é troca — e não confirma", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      siglaAntiga: "C-Ap-FR",
      siglaNova: "C-Ap-FR",
      turmasComSiglaAntiga: 3,
    });
    expect(c.confirma).toBe(false);
  });

  it("⚠️ sem turma alguma com a sigla antiga, a frase continua inteira — só muda o número", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      siglaAntiga: "C-Ap-FR",
      siglaNova: "C-Ap-FRN",
      turmasComSiglaAntiga: 0,
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("links antigos");
  });
});

describe("`FR-016.1` · mudar a classificação muda quem alcança o curso", () => {
  it("a mensagem fala dos Operadores dos dois escopos", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      classificacaoAntiga: "regular",
      classificacaoNova: "expedito",
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const m = c.mensagens.join(" ");
    expect(m).toContain("regular");
    expect(m).toContain("expedito");
    expect(m).toContain("Operadores");
  });

  it("⚠️ a mesma classificação não confirma", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      classificacaoAntiga: "regular",
      classificacaoNova: "regular",
    });
    expect(c.confirma).toBe(false);
  });
});

describe("`FR-030` · o limite avisa por ano, com a mensagem do requisito", () => {
  it("uma mensagem por ano, nomeando contagem e limite", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      anosAcimaDoLimite: [
        { ano: 2026, turmas: 4, limite: 3 },
        { ano: 2027, turmas: 5, limite: 3 },
      ],
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens).toHaveLength(2);
    expect(c.mensagens[0]).toContain("2026");
    expect(c.mensagens[0]).toContain("4 turma(s)");
    expect(c.mensagens[0]).toContain("limite é 3");
    expect(c.mensagens[1]).toContain("2027");
  });

  it("criar turma dentro do limite não confirma", () => {
    expect(confirmacaoDaGravacao("criar_turma", { anosAcimaDoLimite: [] }).confirma).toBe(false);
  });
});

describe("`FR-021.8` · vigência que perde proteção avisa, e não impede", () => {
  it("cada vigência afetada vira uma linha do diálogo", () => {
    const c = confirmacaoDaGravacao("editar_turma", {
      vigenciasDesprotegidas: [
        "vigência padrão de 2026-01-01 (REG-000012) — travada pela atividade AEC do Comando de 2026-05-10",
      ],
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens.join(" ")).toContain("REG-000012");
    expect(c.mensagens.join(" ")).toContain("deixam de estar protegidas");
  });

  it("nenhuma vigência afetada, nenhum aviso", () => {
    expect(confirmacaoDaGravacao("editar_turma", { vigenciasDesprotegidas: [] }).confirma).toBe(
      false,
    );
  });
});

describe("`SC-002.3` · dois motivos, UM diálogo com as duas mensagens (A-7)", () => {
  it("turma que passa do limite E deixa vigência sem proteção abre um só diálogo", () => {
    const c = confirmacaoDaGravacao("criar_turma", {
      anosAcimaDoLimite: [{ ano: 2026, turmas: 4, limite: 3 }],
      vigenciasDesprotegidas: ["vigência padrão de 2026-01-01 (REG-000012)"],
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens).toHaveLength(2);
    expect(c.mensagens.join(" ")).toContain("limite é 3");
    expect(c.mensagens.join(" ")).toContain("REG-000012");
  });

  it("curso que troca sigla E classificação E baixa o limite: três mensagens, um diálogo", () => {
    const c = confirmacaoDaGravacao("editar_curso", {
      siglaAntiga: "C-Ap-FR",
      siglaNova: "C-Ap-FRN",
      turmasComSiglaAntiga: 2,
      exemploDeTurmaAntiga: "C-Ap-FR 2026",
      classificacaoAntiga: "regular",
      classificacaoNova: "expedito",
      anosAcimaDoLimite: [{ ano: 2026, turmas: 4, limite: 3 }],
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    expect(c.mensagens).toHaveLength(3);
  });
});

describe("`FR-029.4` · sala confirma só quando está em uso", () => {
  it("em uso: lista as turmas e deixa prosseguir", () => {
    const c = confirmacaoDaGravacao("desativar_sala", {
      sala: "Sala 04",
      turmasQueUsamASala: ["C-Ap-FR 2026", "CAHO 2026", "C-Esp-ALH 2026"],
    });
    expect(c.confirma).toBe(true);
    if (!c.confirma) return;
    const m = c.mensagens.join(" ");
    expect(m).toContain("Sala 04");
    expect(m).toContain("3 turma(s)");
    expect(m).toContain("CAHO 2026");
  });

  it("sem uso: não confirma", () => {
    expect(
      confirmacaoDaGravacao("desativar_sala", { sala: "Sala 09", turmasQueUsamASala: [] }).confirma,
    ).toBe(false);
  });
});

describe("⚠️ a metade que discrimina: nenhuma outra gravação confirma", () => {
  it.each(NAO_CONFIRMAM)("$tipo não abre diálogo", ({ tipo, contexto }) => {
    expect(
      confirmacaoDaGravacao(tipo, contexto).confirma,
      `${tipo} abriu diálogo fora da lista fechada do FR-018.1`,
    ).toBe(false);
  });

  it("⚠️ sem contexto nenhum, só as quatro do 'sempre' confirmam", () => {
    const sempre = TIPOS_DE_GRAVACAO.filter((t) => confirmacaoDaGravacao(t, {}).confirma);
    expect(sempre).toEqual([
      "desativar_curso",
      "reativar_curso",
      "registrar_vigencia",
      "corrigir_vigencia",
    ]);
  });
});

describe("a lista de gravações é fechada — e não envelhece em silêncio", () => {
  it("são as 11 escritas do contrato §1, e nenhuma a mais", () => {
    expect([...TIPOS_DE_GRAVACAO].sort()).toEqual(
      [
        "acrescentar_sala",
        "corrigir_vigencia",
        "criar_curso",
        "criar_turma",
        "desativar_curso",
        "desativar_sala",
        "editar_curso",
        "editar_turma",
        "reativar_curso",
        "reativar_sala",
        "registrar_vigencia",
      ].sort(),
    );
  });

  it("toda gravação da lista tem decisão — nenhuma cai num caminho não previsto", () => {
    for (const tipo of TIPOS_DE_GRAVACAO) {
      const c = confirmacaoDaGravacao(tipo, {});
      expect(typeof c.confirma, `${tipo} não devolveu decisão`).toBe("boolean");
    }
  });
});

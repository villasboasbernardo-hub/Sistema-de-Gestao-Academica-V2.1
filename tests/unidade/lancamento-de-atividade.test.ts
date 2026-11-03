/**
 * RA-4 (Bloco 18, spec 033) — o lançamento de ATIVIDADE no DSA: o «Conta como», a disciplina que ele pede, o vínculo
 * «Cumpre» e a edição pelo cartão (`lib/dominio/atividades/lancamento-de-atividade.ts`).
 *
 * > *"'Conta como' (TA da disciplina escolhida / AEC / TAD / TR), vínculo opcional com uma AEC prevista ou uma APOINST
 * > planejada"* — `RA-4`, Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA ESCOLHA IGUAL AO PADRÃO**: gravar `TAD` num tipo TAD deixaria a linha fora da
 *    recategorização do catálogo (`app.recategorizar_pelo_tipo` pula a linha com escolha) — por isso ela grava NULO.
 */
import { describe, expect, it } from "vitest";

import {
  aceitaVinculo,
  classificacaoNaEdicao,
  contaComoParaGravar,
  disciplinaNaAtividade,
  FRASE_DO_VINCULO_DUPLO,
  FRASE_DO_VINCULO_FORA_DA_CHT,
  FRASE_DO_VINCULO_GLOBAL,
  opcaoDoVinculo,
  opcoesDeContaComo,
  opcoesDeVinculo,
  recusaDoVinculo,
  vinculoDaOpcao,
} from "@/lib/dominio/atividades/lancamento-de-atividade";

const TURMA = "11111111-1111-4111-8111-111111111111";
const DISC = "22222222-2222-4222-8222-222222222222";
const PREVISTA = "33333333-3333-4333-8333-333333333333";
const APOINST = "44444444-4444-4444-8444-444444444444";

describe("contaComoParaGravar — nula é o padrão do tipo", () => {
  it("a escolha IGUAL à classificação do tipo grava nulo", () => {
    expect(contaComoParaGravar("TAD", "TAD")).toBeNull();
    expect(contaComoParaGravar("AEC", "AEC")).toBeNull();
  });
  it("a troca de verdade fica gravada, inclusive o «TA da disciplina»", () => {
    expect(contaComoParaGravar("AEC", "TAD")).toBe("TAD");
    expect(contaComoParaGravar("TR", "CHD")).toBe("CHD");
  });
  it("sem escolha, nulo", () => {
    expect(contaComoParaGravar("AEC", null)).toBeNull();
  });
});

describe("opcoesDeContaComo — só nos tipos de AEC, TAD e TR", () => {
  it("as quatro, na ordem da RA-4, com os rótulos da tela", () => {
    expect(opcoesDeContaComo({ categoriaDoTipo: "AEC", global: false })).toEqual([
      { valor: "CHD", rotulo: "TA da disciplina" },
      { valor: "AEC", rotulo: "AEC" },
      { valor: "TAD", rotulo: "TAD" },
      { valor: "TR", rotulo: "TR" },
    ]);
  });
  it("a de todas as turmas não tem «TA da disciplina» (ele exige a disciplina DA turma)", () => {
    expect(opcoesDeContaComo({ categoriaDoTipo: "TAD", global: true }).map((o) => o.valor)).toEqual(
      ["AEC", "TAD", "TR"],
    );
  });
  it("Estudo Individual e Apoio Individualizado não trocam: nenhuma opção", () => {
    expect(opcoesDeContaComo({ categoriaDoTipo: "Estudo_Individual", global: false })).toEqual([]);
    expect(opcoesDeContaComo({ categoriaDoTipo: "Apoio_Individualizado", global: false })).toEqual(
      [],
    );
    expect(opcoesDeContaComo({ categoriaDoTipo: null, global: false })).toEqual([]);
  });
});

describe("disciplinaNaAtividade", () => {
  it("obrigatória no «TA da disciplina», em qualquer tipo de AEC, TAD ou TR", () => {
    expect(disciplinaNaAtividade({ categoriaDoTipo: "TR", contaComo: "CHD", global: false })).toBe(
      "obrigatoria",
    );
  });
  it("opcional quando a classificação que VALE é a AEC — do tipo ou escolhida", () => {
    expect(disciplinaNaAtividade({ categoriaDoTipo: "AEC", contaComo: null, global: false })).toBe(
      "opcional",
    );
    expect(disciplinaNaAtividade({ categoriaDoTipo: "TAD", contaComo: "AEC", global: false })).toBe(
      "opcional",
    );
  });
  it("⚠️ o caso que vira: a AEC trocada para TAD deixa de levar disciplina", () => {
    expect(disciplinaNaAtividade({ categoriaDoTipo: "AEC", contaComo: "TAD", global: false })).toBe(
      "nenhuma",
    );
  });
  it("nenhuma na de todas as turmas, nem com «TA da disciplina»", () => {
    expect(disciplinaNaAtividade({ categoriaDoTipo: "AEC", contaComo: null, global: true })).toBe(
      "nenhuma",
    );
    expect(disciplinaNaAtividade({ categoriaDoTipo: "AEC", contaComo: "CHD", global: true })).toBe(
      "nenhuma",
    );
  });
});

describe("o vínculo «Cumpre» (FR-003.3)", () => {
  it("cabe na atividade DE TURMA de AEC, TAD ou TR", () => {
    expect(aceitaVinculo({ categoriaDoTipo: "AEC", global: false })).toBe(true);
    expect(aceitaVinculo({ categoriaDoTipo: "TR", global: false })).toBe(true);
    expect(aceitaVinculo({ categoriaDoTipo: "AEC", global: true })).toBe(false);
    expect(aceitaVinculo({ categoriaDoTipo: "Apoio_Individualizado", global: false })).toBe(false);
  });

  it("recusas com a frase — duplo, global e fora da CHT", () => {
    const base = { categoriaDoTipo: "AEC" as const, turmaId: TURMA };
    expect(recusaDoVinculo({ ...base, atividadePrevistaId: null, apoinstId: null })).toBeNull();
    expect(recusaDoVinculo({ ...base, atividadePrevistaId: PREVISTA, apoinstId: null })).toBeNull();
    expect(recusaDoVinculo({ ...base, atividadePrevistaId: PREVISTA, apoinstId: APOINST })).toEqual(
      {
        campo: "apoinstId",
        mensagem: FRASE_DO_VINCULO_DUPLO,
      },
    );
    expect(
      recusaDoVinculo({ ...base, turmaId: null, atividadePrevistaId: null, apoinstId: APOINST }),
    ).toEqual({
      campo: "apoinstId",
      mensagem: FRASE_DO_VINCULO_GLOBAL,
    });
    expect(
      recusaDoVinculo({
        categoriaDoTipo: "Estudo_Individual",
        turmaId: TURMA,
        atividadePrevistaId: PREVISTA,
        apoinstId: null,
      }),
    ).toEqual({ campo: "atividadePrevistaId", mensagem: FRASE_DO_VINCULO_FORA_DA_CHT });
  });

  it("as opções: a prevista cumprida CONTINUA na lista, marcada; a APOINST com os TA lançados", () => {
    const opcoes = opcoesDeVinculo(
      [
        {
          id: PREVISTA,
          nome: "Palestra de segurança",
          tipoRotulo: "Palestra",
          taPrevistos: 2,
          taLancados: 2,
          cumprida: true,
          disciplinaId: null,
        },
        {
          id: "p2",
          nome: "Visita ao porto",
          tipoRotulo: "Visita Técnica",
          taPrevistos: 8,
          taLancados: 3,
          cumprida: false,
          disciplinaId: DISC,
        },
        {
          id: "p3",
          nome: "Sem TA previsto",
          tipoRotulo: "",
          taPrevistos: null,
          taLancados: 0,
          cumprida: false,
          disciplinaId: null,
        },
      ],
      [
        {
          id: APOINST,
          nome: "Reforço de cartas",
          disciplinaCodigo: "IV",
          taPrevistos: 10,
          taLancados: 4,
        },
      ],
    );
    expect(opcoes).toEqual([
      {
        valor: `prevista:${PREVISTA}`,
        rotulo: "AEC prevista: Palestra de segurança · Palestra — 2 TA (já cumprida)",
      },
      {
        valor: "prevista:p2",
        rotulo: "AEC prevista: Visita ao porto · Visita Técnica — 8 TA (3 de 8 TA lançados)",
      },
      { valor: "prevista:p3", rotulo: "AEC prevista: Sem TA previsto" },
      {
        valor: `apoinst:${APOINST}`,
        rotulo: "APOINST: Reforço de cartas — IV (4 de 10 TA lançados)",
      },
    ]);
  });

  it("opção ↔ colunas, nos dois sentidos; vazio ou desconhecido é sem vínculo", () => {
    expect(vinculoDaOpcao(`prevista:${PREVISTA}`)).toEqual({
      atividadePrevistaId: PREVISTA,
      apoinstId: null,
    });
    expect(vinculoDaOpcao(`apoinst:${APOINST}`)).toEqual({
      atividadePrevistaId: null,
      apoinstId: APOINST,
    });
    expect(vinculoDaOpcao("")).toEqual({ atividadePrevistaId: null, apoinstId: null });
    expect(vinculoDaOpcao("outra:coisa")).toEqual({ atividadePrevistaId: null, apoinstId: null });
    expect(vinculoDaOpcao("prevista:")).toEqual({ atividadePrevistaId: null, apoinstId: null });
    expect(opcaoDoVinculo(PREVISTA, null)).toBe(`prevista:${PREVISTA}`);
    expect(opcaoDoVinculo(null, APOINST)).toBe(`apoinst:${APOINST}`);
    expect(opcaoDoVinculo(null, null)).toBe("");
  });
});

describe("classificacaoNaEdicao — o cartão, pela regra do lançar", () => {
  const gravadoVazio = {
    contaComo: null,
    disciplinaId: null,
    atividadePrevistaId: null,
    apoinstId: null,
  };

  it("nada mandado: nenhuma coluna (undefined não mexe)", () => {
    expect(
      classificacaoNaEdicao({
        categoriaDoTipo: "AEC",
        categoriaGravada: "AEC",
        turmaId: TURMA,
        gravado: gravadoVazio,
      }),
    ).toEqual({ ok: true, colunas: {} });
  });

  it("trocar para «TA da disciplina» com a disciplina grava as duas", () => {
    expect(
      classificacaoNaEdicao({
        categoriaDoTipo: "TR",
        categoriaGravada: "TR",
        turmaId: TURMA,
        gravado: gravadoVazio,
        contaComo: "CHD",
        disciplinaId: DISC,
      }),
    ).toEqual({ ok: true, colunas: { conta_como: "CHD", disciplina_id: DISC } });
  });

  it("«TA da disciplina» sem disciplina é recusado antes do banco", () => {
    const r = classificacaoNaEdicao({
      categoriaDoTipo: "TR",
      categoriaGravada: "TR",
      turmaId: TURMA,
      gravado: gravadoVazio,
      contaComo: "CHD",
    });
    expect(r.ok).toBe(false);
    expect(r.ok ? "" : r.mensagem).toBe("«TA da disciplina» exige a disciplina da turma.");
  });

  it("⚠️ usa o GRAVADO no lugar do não mandado: a AEC com disciplina trocada só para TAD é recusada", () => {
    const r = classificacaoNaEdicao({
      categoriaDoTipo: "AEC",
      categoriaGravada: "AEC",
      turmaId: TURMA,
      gravado: { ...gravadoVazio, disciplinaId: DISC },
      contaComo: "TAD",
    });
    expect(r.ok ? "" : r.mensagem).toBe("Só a AEC e o «TA da disciplina» levam disciplina.");
    /* Controle positivo: apagando a disciplina junto, passa. */
    expect(
      classificacaoNaEdicao({
        categoriaDoTipo: "AEC",
        categoriaGravada: "AEC",
        turmaId: TURMA,
        gravado: { ...gravadoVazio, disciplinaId: DISC },
        contaComo: "TAD",
        disciplinaId: null,
      }),
    ).toEqual({ ok: true, colunas: { conta_como: "TAD", disciplina_id: null } });
  });

  it("voltar ao padrão grava NULO (e não o valor do tipo)", () => {
    expect(
      classificacaoNaEdicao({
        categoriaDoTipo: "TAD",
        categoriaGravada: "AEC",
        turmaId: TURMA,
        gravado: { ...gravadoVazio, contaComo: "AEC" },
        contaComo: "TAD",
      }),
    ).toEqual({ ok: true, colunas: { conta_como: null } });
  });

  it("o vínculo novo APAGA o outro — um no máximo, sem contradição com o gravado", () => {
    expect(
      classificacaoNaEdicao({
        categoriaDoTipo: "AEC",
        categoriaGravada: "AEC",
        turmaId: TURMA,
        gravado: { ...gravadoVazio, atividadePrevistaId: PREVISTA },
        apoinstId: APOINST,
      }),
    ).toEqual({ ok: true, colunas: { atividade_prevista_id: null, apoinst_id: APOINST } });
  });

  it("vínculo na atividade de todas as turmas é recusado", () => {
    const r = classificacaoNaEdicao({
      categoriaDoTipo: "AEC",
      categoriaGravada: "AEC",
      turmaId: null,
      gravado: gravadoVazio,
      atividadePrevistaId: PREVISTA,
    });
    expect(r.ok ? "" : r.mensagem).toBe(FRASE_DO_VINCULO_GLOBAL);
  });

  it("linha antiga sem tipo não aceita «Conta como»", () => {
    const r = classificacaoNaEdicao({
      categoriaDoTipo: null,
      categoriaGravada: "AEC",
      turmaId: TURMA,
      gravado: gravadoVazio,
      contaComo: "TAD",
    });
    expect(r.ok ? "" : r.mensagem).toBe(
      "Escolha o tipo da atividade antes de dizer como ela conta.",
    );
  });
});

/**
 * Spec 027 (Bloco 12, D-COR-7) — o resumo do alerta de impacto de excluir uma linha do calendário.
 *
 * ⚠️ O 1º caso é o 12/11/2026 medido na cópia do remoto (`remoto-20261027-061453.sql`): a linha da v2.0, INATIVA desde
 *    26/10, com uma aula salva no dia na C-Espc-FR 2026 e outra na CAHO 2026, e nenhuma semana publicada.
 */
import { describe, expect, it } from "vitest";

import {
  impactoDoBanco,
  resumoDoImpacto,
  type ImpactoDaExclusao,
  type TurmaDoImpacto,
} from "@/lib/dominio/exclusao-no-calendario";

const HOJE = "2026-10-27";

function turma(parcial: Partial<TurmaDoImpacto> & { codigo: string }): TurmaDoImpacto {
  return {
    ano: 2026,
    cursoCodigo: parcial.codigo.split(" ")[0] ?? parcial.codigo,
    cursoClassificacao: "regular",
    duracaoSemanas: null,
    dataInicio: "2026-01-05",
    dataTermino: "2026-12-16",
    aulas: 0,
    atividades: 0,
    avaliacoes: 0,
    versaoPublicada: null,
    ...parcial,
  };
}

function impacto(parcial: Partial<ImpactoDaExclusao>): ImpactoDaExclusao {
  return {
    data: "2026-11-12",
    situacao: "ativo",
    impacto: "dia_inteiro",
    todas: true,
    anoIso: 2026,
    semanaIso: 46,
    atividadesGlobais: 0,
    turmas: [],
    ...parcial,
  };
}

describe("o 12/11/2026 — linha inativa da v2.0, com aula no dia (medido na cópia do remoto)", () => {
  const resumo = resumoDoImpacto(
    impacto({
      situacao: "inativo",
      turmas: [
        turma({ codigo: "C-Espc-FR 2026", cursoCodigo: "C-Espc-FR", aulas: 1 }),
        turma({ codigo: "C-Ap-HN 2026", cursoCodigo: "C-Ap-HN" }),
        turma({ codigo: "CAHO 2026", cursoCodigo: "CAHO", aulas: 1 }),
      ],
    }),
    HOJE,
  );

  it("a data ainda não passou", () => {
    expect(resumo.passou).toBe(false);
    expect(resumo.fraseDaData).toBe("A data (12/11/2026) ainda não passou.");
  });

  it("inativa não atinge turma nenhuma — e diz que excluir não muda nada", () => {
    expect(resumo.turmasAtingidas).toEqual([]);
    expect(resumo.efeito).toMatch(/já está desativada/);
    expect(resumo.efeito).toMatch(/não muda dias úteis, saldo nem DSA/);
  });

  it("lista as aulas do dia, por turma, na ordem de turma, só as que têm lançamento", () => {
    expect(resumo.lancamentos).toEqual([
      { turma: "CAHO 2026", texto: "1 aula" },
      { turma: "C-Espc-FR 2026", texto: "1 aula" },
    ]);
  });

  it("tem vínculo: o botão é «Excluir mesmo assim», sem semana publicada", () => {
    expect(resumo.semVinculo).toBe(false);
    expect(resumo.rotuloConfirmar).toBe("Excluir mesmo assim");
    expect(resumo.publicadas).toEqual([]);
    expect(resumo.avisoDaPublicacao).toBeNull();
  });
});

describe("a linha ativa", () => {
  it("as turmas atingidas são as do impacto, na ordem de turma, e o dia volta a ser útil", () => {
    const resumo = resumoDoImpacto(
      impacto({
        turmas: [
          turma({ codigo: "C-Espc-HN 2026", cursoCodigo: "C-Espc-HN" }),
          turma({ codigo: "CAHO 2026", cursoCodigo: "CAHO" }),
        ],
      }),
      HOJE,
    );
    expect(resumo.turmasAtingidas).toEqual(["CAHO 2026", "C-Espc-HN 2026"]);
    expect(resumo.efeito).toMatch(/volta a ser útil/);
    expect(resumo.lancamentos).toEqual([]);
    expect(resumo.semVinculo).toBe(false);
    expect(resumo.rotuloConfirmar).toBe("Excluir mesmo assim");
  });

  it("a linha que não é de dia inteiro só deixa de valer no calendário", () => {
    const resumo = resumoDoImpacto(impacto({ impacto: "informativo" }), HOJE);
    expect(resumo.efeito).toMatch(/deixa de valer no calendário/);
    expect(resumo.efeito).not.toMatch(/volta a ser útil/);
  });

  it("sem turma atingida, sem lançamento e sem semana publicada: sem vínculo, o botão é «Excluir»", () => {
    const resumo = resumoDoImpacto(impacto({ turmas: [] }), HOJE);
    expect(resumo.semVinculo).toBe(true);
    expect(resumo.rotuloConfirmar).toBe("Excluir");
  });

  it("a semana publicada cita a turma, a semana do curso, as datas de segunda a sexta e a versão", () => {
    const resumo = resumoDoImpacto(
      impacto({
        turmas: [
          turma({
            codigo: "CAHO 2026",
            cursoCodigo: "CAHO",
            duracaoSemanas: 50,
            dataInicio: "2026-01-05",
            dataTermino: "2026-12-16",
            aulas: 2,
            versaoPublicada: 1,
          }),
          turma({ codigo: "C-Ap-FR 2026", cursoCodigo: "C-Ap-FR", versaoPublicada: 0 }),
        ],
      }),
      HOJE,
    );
    expect(resumo.publicadas).toEqual([
      { turma: "CAHO 2026", texto: "Semana 45 de 50 (09/11/2026 a 13/11/2026), ALT 1" },
      { turma: "C-Ap-FR 2026", texto: "Semana 45 de 50 (09/11/2026 a 13/11/2026), original" },
    ]);
    expect(resumo.avisoDaPublicacao).toMatch(/versão publicada não muda/);
    expect(resumo.avisoDaPublicacao).toMatch(/alterado desde a publicação/);
  });

  it("semana fora do período da turma: sem número do curso, mas com as datas", () => {
    const resumo = resumoDoImpacto(
      impacto({
        turmas: [
          turma({
            codigo: "CAHO 2026",
            cursoCodigo: "CAHO",
            dataInicio: null,
            versaoPublicada: 0,
          }),
        ],
      }),
      HOJE,
    );
    expect(resumo.publicadas).toEqual([
      { turma: "CAHO 2026", texto: "Semana de 09/11/2026 a 13/11/2026, original" },
    ]);
  });
});

describe("a data e as contagens", () => {
  it("antes de hoje já passou; hoje ainda não", () => {
    expect(resumoDoImpacto(impacto({ data: "2026-02-09" }), HOJE).passou).toBe(true);
    expect(resumoDoImpacto(impacto({ data: "2026-02-09" }), HOJE).fraseDaData).toBe(
      "A data (09/02/2026) já passou.",
    );
    expect(resumoDoImpacto(impacto({ data: HOJE }), HOJE).passou).toBe(false);
  });

  it("plural e singular, só o que tem, separados por «·»", () => {
    const resumo = resumoDoImpacto(
      impacto({
        turmas: [turma({ codigo: "CAHO 2026", aulas: 2, atividades: 1, avaliacoes: 3 })],
      }),
      HOJE,
    );
    expect(resumo.lancamentos).toEqual([
      { turma: "CAHO 2026", texto: "2 aulas · 1 atividade · 3 avaliações" },
    ]);
  });

  it("as atividades de todas as turmas vêm à parte, e são vínculo", () => {
    const resumo = resumoDoImpacto(impacto({ atividadesGlobais: 2, turmas: [] }), HOJE);
    expect(resumo.atividadesGlobais).toBe("2 atividades de todas as turmas");
    expect(resumo.semVinculo).toBe(false);
    expect(resumoDoImpacto(impacto({ atividadesGlobais: 0 }), HOJE).atividadesGlobais).toBeNull();
  });
});

describe("impactoDoBanco — o `jsonb` da função, em nomes do domínio", () => {
  it("lê o que a função devolve", () => {
    expect(
      impactoDoBanco({
        data: "2026-11-12",
        situacao: "inativo",
        impacto: "dia_inteiro",
        todas: true,
        ano_iso: 2026,
        semana_iso: 46,
        atividades_globais: 0,
        turmas: [
          {
            turma_id: "x",
            codigo: "CAHO 2026",
            ano: 2026,
            curso_codigo: "CAHO",
            curso_classificacao: "regular",
            duracao_semanas: 50,
            data_inicio: "2026-01-05",
            data_termino: "2026-12-16",
            aulas: 1,
            atividades: 0,
            avaliacoes: 0,
            versao_publicada: null,
          },
        ],
      }),
    ).toEqual(
      impacto({
        situacao: "inativo",
        turmas: [turma({ codigo: "CAHO 2026", cursoCodigo: "CAHO", duracaoSemanas: 50, aulas: 1 })],
      }),
    );
  });

  it("o que não tem a forma esperada vira nulo — nunca um impacto inventado (RN-DEG-01)", () => {
    expect(impactoDoBanco(null)).toBeNull();
    expect(impactoDoBanco({ data: "2026-11-12" })).toBeNull();
    expect(impactoDoBanco("texto")).toBeNull();
  });
});

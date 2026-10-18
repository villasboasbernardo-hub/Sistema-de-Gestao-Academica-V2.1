/**
 * D-COR-1 · a **semana do curso**, "Semana N de T" — FR-009 da spec 016 (item 1.9 do plano de correções).
 *
 * > *"O número do DSA passa a ser a semana corrida do curso: semana sem aula também conta."*
 * > — D-COR-1, Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA É A SEMANA VAZIA NO MEIO** (DoD 8): pela convenção CRONOS de antes
 * (`numero-do-dsa.ts`), ela não consumia número; agora consome. Os outros casos dariam o mesmo veredito
 * nas duas convenções numa turma com aula toda semana.
 *
 * ⚠️ **AS SEMANAS ISO SÃO ANCORADAS NA MESMA MEDIÇÃO** de `tests/unidade/carga-semanal.test.ts`:
 * 02/03/2026 é a segunda da semana 10 de 2026, e 01/01/2027 cai na semana 53 de 2026. Daí saem, por
 * sete dias, a 15 (06/04), a 42 (12/10), a 51 (14/12) e a 1 de 2027 (04/01).
 *
 * ⚠️ **A FORMA DA C-AP-FR 2026 É MEDIDA, O DADO NÃO** (cópia `remoto-20261017-005738.sql`): curso de 35
 * semanas, turma de 06/04 a 15/12/2026 (37 semanas), e a semana de 12/10 é a 28ª. O caso reproduz a
 * forma — início, término e duração —, não os lançamentos.
 */
import { describe, expect, it } from "vitest";

import {
  avisoDeDuracao,
  MOTIVO_ANTES_DO_INICIO,
  MOTIVO_DEPOIS_DO_TERMINO,
  MOTIVO_SEM_DATA_DE_INICIO,
  AVISO_SEM_TOTAL,
  rotuloDaSemanaDoCurso,
  semanaDoCurso,
  type EntradaDaSemanaDoCurso,
} from "@/lib/dominio/dsa/semana-do-curso";

const semana = (ano: number, numero: number) => ({ ano, numero }) as const;

/** A forma medida da C-Ap-FR 2026. */
const CAPFR: Omit<EntradaDaSemanaDoCurso, "semana"> = {
  dataInicio: "2026-04-06",
  dataTermino: "2026-12-15",
  duracaoSemanasDoCurso: 35,
};

describe("FR-009.1 · a semana corrida do curso — toda semana conta", () => {
  it("a semana do início é a 1, nunca a 0", () => {
    const s = semanaDoCurso({ ...CAPFR, semana: semana(2026, 15) });
    expect(s.numero).toBe(1);
  });

  it("⚠️ O CASO QUE DISCRIMINA: semana vazia no meio CONSOME número (o inverso da convenção CRONOS)", () => {
    // Não há lançamento nenhum na entrada: a conta é de calendário, e a 3ª semana é a 3, com ou sem aula.
    const s = semanaDoCurso({ ...CAPFR, semana: semana(2026, 17) });
    expect(s.numero).toBe(3);
  });

  it("a forma medida da C-Ap-FR 2026: a semana de 12/10 é a 28 de 37", () => {
    const s = semanaDoCurso({ ...CAPFR, semana: semana(2026, 42) });
    expect(s).toMatchObject({ numero: 28, total: 37, motivo: null });
    expect(rotuloDaSemanaDoCurso(s)).toBe("Semana 28 de 37");
  });

  it("início numa quinta-feira: a semana dele é a 1, e a seguinte é a 2", () => {
    const quinta = {
      dataInicio: "2026-03-05",
      dataTermino: "2026-04-30",
      duracaoSemanasDoCurso: 9,
    };
    expect(semanaDoCurso({ ...quinta, semana: semana(2026, 10) }).numero).toBe(1);
    expect(semanaDoCurso({ ...quinta, semana: semana(2026, 11) }).numero).toBe(2);
  });

  it("a virada do ano não reinicia a conta: de 14/12/2026 a 04/01/2027 são as semanas 1 a 4", () => {
    const virada = {
      dataInicio: "2026-12-14",
      dataTermino: "2027-02-26",
      duracaoSemanasDoCurso: 11,
    };
    expect(semanaDoCurso({ ...virada, semana: semana(2026, 51) }).numero).toBe(1);
    expect(semanaDoCurso({ ...virada, semana: semana(2026, 53) }).numero).toBe(3);
    expect(semanaDoCurso({ ...virada, semana: semana(2027, 1) }).numero).toBe(4);
  });

  it("FR-009.8 · na semipresencial a conta começa no início da TURMA, não da etapa presencial", () => {
    // C-ApA-AuxNav T2: início 03/08 (semana 32), etapa presencial a partir de 12/10 (semana 42).
    const aux = { dataInicio: "2026-08-03", dataTermino: "2026-10-30", duracaoSemanasDoCurso: 13 };
    expect(rotuloDaSemanaDoCurso(semanaDoCurso({ ...aux, semana: semana(2026, 42) }))).toBe(
      "Semana 11 de 13",
    );
  });
});

describe("FR-009.3 · o T", () => {
  it("é a duração do curso quando a turma cabe nela", () => {
    const curta = {
      dataInicio: "2026-04-06",
      dataTermino: "2026-11-27",
      duracaoSemanasDoCurso: 35,
    };
    expect(semanaDoCurso({ ...curta, semana: semana(2026, 20) }).total).toBe(35);
  });

  it("é a semana da turma quando a turma é MAIS LONGA que o curso (37 × 35 → 37)", () => {
    expect(semanaDoCurso({ ...CAPFR, semana: semana(2026, 20) }).total).toBe(37);
  });

  it("é a semana da turma quando o curso não tem duração", () => {
    const semDuracao = { ...CAPFR, duracaoSemanasDoCurso: null };
    expect(semanaDoCurso({ ...semDuracao, semana: semana(2026, 20) }).total).toBe(37);
  });

  it("⚠️ sem duração no curso E sem término na turma: «Semana N», com aviso de cadastro", () => {
    const s = semanaDoCurso({
      dataInicio: "2026-04-06",
      dataTermino: null,
      duracaoSemanasDoCurso: null,
      semana: semana(2026, 20),
    });
    expect(s).toMatchObject({ numero: 6, total: null, motivo: null, aviso: AVISO_SEM_TOTAL });
    expect(rotuloDaSemanaDoCurso(s)).toBe("Semana 6");
  });

  it("⚠️ N NUNCA passa de T: depois do término não há semana, há motivo", () => {
    const s = semanaDoCurso({ ...CAPFR, semana: semana(2026, 52) });
    expect(s.numero).toBeNull();
    expect(s.motivo).toBe(MOTIVO_DEPOIS_DO_TERMINO);
    expect(rotuloDaSemanaDoCurso(s)).toBe("—");
  });

  it("⚠️ e sem término, mas com duração, a semana além da duração também não existe", () => {
    const s = semanaDoCurso({
      dataInicio: "2026-04-06",
      dataTermino: null,
      duracaoSemanasDoCurso: 35,
      semana: semana(2026, 51),
    });
    expect(s.numero).toBeNull();
    expect(s.motivo).toBe(MOTIVO_DEPOIS_DO_TERMINO);
  });
});

describe("FR-009.6 · fora da janela: nulo com motivo, nunca zero", () => {
  it("semana anterior ao início", () => {
    const s = semanaDoCurso({ ...CAPFR, semana: semana(2026, 14) });
    expect(s).toMatchObject({ numero: null, motivo: MOTIVO_ANTES_DO_INICIO });
    expect(rotuloDaSemanaDoCurso(s)).toBe("—");
  });

  it("turma sem data de início", () => {
    const s = semanaDoCurso({ ...CAPFR, dataInicio: null, semana: semana(2026, 20) });
    expect(s).toMatchObject({ numero: null, motivo: MOTIVO_SEM_DATA_DE_INICIO });
  });

  it("semana que não existe no ano (0, 54, fracionária) não vira número", () => {
    for (const numero of [0, 54, 11.5]) {
      expect(
        semanaDoCurso({ ...CAPFR, semana: semana(2026, numero) }).numero,
        String(numero),
      ).toBeNull();
    }
  });
});

describe("FR-009.7 · o aviso de duração da ficha da turma", () => {
  it("só quando a turma é mais longa que o curso", () => {
    expect(avisoDeDuracao(CAPFR)).toBe("A turma tem 37 semanas e o curso, 35.");
    expect(
      avisoDeDuracao({
        dataInicio: "2026-04-06",
        dataTermino: "2026-11-27",
        duracaoSemanasDoCurso: 35,
      }),
    ).toBeNull();
  });

  it("sem duração, sem início ou sem término, não há o que comparar", () => {
    expect(avisoDeDuracao({ ...CAPFR, duracaoSemanasDoCurso: null })).toBeNull();
    expect(avisoDeDuracao({ ...CAPFR, dataInicio: null })).toBeNull();
    expect(avisoDeDuracao({ ...CAPFR, dataTermino: null })).toBeNull();
  });
});

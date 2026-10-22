/**
 * O currículo na criação e na edição da turma — spec 021, Bloco 6, RC-4.
 *
 * > *"RC-4 · A turma escolhe o currículo. Ao criar uma turma, escolhe-se qual currículo ela segue (vigente ou futuro). O
 * > padrão é o currículo vigente na data de início da turma. (…) A troca só é possível enquanto a turma não tem
 * > lançamento."*
 *
 * ⚠️ VAZIO É "O PADRÃO", e o padrão é do BANCO (`app.curriculo_padrao_da_turma`): a chave não vai, e o gatilho escolhe o
 *    vigente na data de início. Mandar nulo faria o banco gravar nulo — e a turma sem currículo é recusada.
 */
import { describe, expect, it } from "vitest";

import { esquemaDeTurma, esquemaDeEdicaoDaTurma } from "@/lib/validacao/turma";

const CURRICULO = "8d2e1f0a-3b4c-4d5e-8f60-718293a4b5c6";
const turma = {
  ano_letivo: 2027,
  status: "planejada",
  modalidade: "presencial",
  data_inicio: "2027-02-01",
  data_termino: "2027-03-01",
};

describe("RC-4 · o currículo da turma no formulário", () => {
  it("ausente ou vazio, NÃO vai ao banco — o padrão é o vigente na data de início, escolhido pelo banco", () => {
    for (const entrada of [turma, { ...turma, curriculo_id: "" }]) {
      const r = esquemaDeTurma.safeParse(entrada);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.curriculo_id).toBeUndefined();
    }
  });

  it("um id é o currículo escolhido, na criação e na edição", () => {
    const criada = esquemaDeTurma.safeParse({ ...turma, curriculo_id: CURRICULO });
    const editada = esquemaDeEdicaoDaTurma.safeParse({ ...turma, curriculo_id: CURRICULO });
    expect(criada.success && criada.data.curriculo_id).toBe(CURRICULO);
    expect(editada.success && editada.data.curriculo_id).toBe(CURRICULO);
  });

  it("recusa o que não é id, nomeando o campo", () => {
    const r = esquemaDeTurma.safeParse({ ...turma, curriculo_id: "Currículo 2" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain("Currículo");
  });
});

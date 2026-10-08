/**
 * O aviso de sobreposição dentro da turma (item 2 do comando de correções do DSA, 08/10/2026).
 * Alerta, nunca bloqueio — o que se prova aqui é QUANDO ele sai e o que ele diz.
 */
import { describe, expect, it } from "vitest";

import { avisoDeSobreposicao, sobreposicoesNaTurma } from "@/lib/dominio/dsa/sobreposicao";

const SEXTA = "2026-04-10";
/* Um bloco do 1º ao 2º tempo e o vizinho no 3º e 4º — o padrão medido no remoto (314 casos). */
const OCUPACOES = [
  { fatoId: "a", data: SEXTA, taInicial: 1, taFinal: 2 },
  { fatoId: "b", data: SEXTA, taInicial: 3, taFinal: 4 },
];

describe("sobreposicoesNaTurma", () => {
  it("⚠️ aumentar o bloco para dentro do vizinho colide com o vizinho — e não consigo mesmo", () => {
    const colididos = sobreposicoesNaTurma(
      { fatoId: "a", data: SEXTA, taInicial: 1, tempos: 3 },
      OCUPACOES,
    );
    expect(colididos.map((o) => o.fatoId)).toEqual(["b"]);
  });

  it("encostar no vizinho não é colidir (intervalo fechado: o 2º termina onde o 3º começa)", () => {
    expect(
      sobreposicoesNaTurma({ fatoId: "a", data: SEXTA, taInicial: 1, tempos: 2 }, OCUPACOES),
    ).toEqual([]);
  });

  it("outro dia não colide, mesmo nos mesmos tempos", () => {
    expect(
      sobreposicoesNaTurma({ data: "2026-04-09", taInicial: 1, tempos: 4 }, OCUPACOES),
    ).toEqual([]);
  });
});

describe("avisoDeSobreposicao", () => {
  it("sem colisão, nenhum aviso", () => {
    expect(avisoDeSobreposicao({ data: SEXTA, taInicial: 5, tempos: 2 }, OCUPACOES)).toBeNull();
  });

  it("nomeia o tempo em comum, para a pessoa achar o outro bloco na grade", () => {
    expect(
      avisoDeSobreposicao({ fatoId: "a", data: SEXTA, taInicial: 1, tempos: 3 }, OCUPACOES),
    ).toBe(
      "Em 10/04/2026, o 3º tempo já tinha outro lançamento desta turma. Os dois ficam gravados, e na grade o que não couber sai em «fora da grade», abaixo do dia. Diminua um dos dois se não era isso.",
    );
  });

  it("vários tempos em comum saem em lista", () => {
    const aviso = avisoDeSobreposicao({ data: SEXTA, taInicial: 2, tempos: 3 }, OCUPACOES);
    expect(aviso).toContain("os tempos 2º, 3º, 4º já tinham outro lançamento");
  });
});

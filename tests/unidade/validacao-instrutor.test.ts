/**
 * `RN-INST-03`, `FR-005` da spec 006 — o esquema do cadastro de instrutor.
 *
 * ⚠️ ESTE ESQUEMA NÃO É A GARANTIA. Quem garante que cadastro incompleto não entra é o `CHECK` do
 * banco (`095_obrigatorios_e_codigo_instrutor.sql`), porque o `FR-006` exige a recusa por qualquer
 * caminho. O esquema existe para a Server Action recusar cedo, na primeira linha, e dizer **qual**
 * campo falta — o que o erro do banco não diz a quem usa a tela.
 *
 * ⚠️ BRANCO É AUSÊNCIA. Os casos só com espaços são metade do teste, e são a metade que um `min(1)`
 * sem `trim` deixaria passar.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDeCriacaoDeInstrutor,
  esquemaDeEdicaoDeInstrutor,
  OBRIGATORIOS_DO_INSTRUTOR,
} from "@/lib/validacao/instrutor";

const VALIDO = {
  posto_graduacao: "CT",
  esp_hab_obs: "-EF",
  nome_completo: "Fulano de Tal",
  categoria: "Militar",
  om: "CIAARA",
};

describe("`FR-005` · os cinco obrigatórios", () => {
  it("são exatamente os cinco do `RN-INST-03`", () => {
    expect(OBRIGATORIOS_DO_INSTRUTOR.map((o) => o.campo)).toEqual([
      "posto_graduacao",
      "esp_hab_obs",
      "nome_completo",
      "categoria",
      "om",
    ]);
  });

  it("controle positivo: os cinco preenchidos passam", () => {
    expect(esquemaDeCriacaoDeInstrutor.safeParse({ funcional: VALIDO }).success).toBe(true);
  });

  it.each(OBRIGATORIOS_DO_INSTRUTOR)("$campo vazio é recusado, e a mensagem diz qual", (o) => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({ funcional: { ...VALIDO, [o.campo]: "" } });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(o.mensagem);
  });

  it.each(OBRIGATORIOS_DO_INSTRUTOR)("$campo só com espaços é recusado igual", (o) => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({ funcional: { ...VALIDO, [o.campo]: "   " } });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(o.mensagem);
  });

  it.each(OBRIGATORIOS_DO_INSTRUTOR)("$campo ausente é recusado igual", (o) => {
    const semCampo: Record<string, string> = { ...VALIDO };
    delete semCampo[o.campo];
    const r = esquemaDeCriacaoDeInstrutor.safeParse({ funcional: semCampo });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(o.mensagem);
  });

  it("os valores saem aparados — o banco não recebe espaço em volta", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({
      funcional: { ...VALIDO, nome_completo: "  Fulano de Tal  " },
    });
    expect(r.success && r.data.funcional.nome_completo).toBe("Fulano de Tal");
  });
});

describe("`FR-015` · nenhum campo de carga horária é aceito", () => {
  it("o esquema não conhece coluna de carga horária", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({
      funcional: { ...VALIDO, ta_ministrado_ano: 40, carga_horaria: 12 },
    });
    expect(r.success).toBe(true);
    const saida = r.success ? (r.data.funcional as Record<string, unknown>) : {};
    expect(saida).not.toHaveProperty("ta_ministrado_ano");
    expect(saida).not.toHaveProperty("carga_horaria");
  });
});

describe("`FR-032` · dado pessoal viaja separado do funcional", () => {
  it("o bloco funcional descarta coluna de identificação civil", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({ funcional: { ...VALIDO, cpf: "123" } });
    const saida = r.success ? (r.data.funcional as Record<string, unknown>) : {};
    expect(saida).not.toHaveProperty("cpf");
  });

  it("a edição exige o id do instrutor", () => {
    expect(esquemaDeEdicaoDeInstrutor.safeParse({ funcional: VALIDO }).success).toBe(false);
    expect(
      esquemaDeEdicaoDeInstrutor.safeParse({
        id: "aaaa0000-0000-0000-0000-000000000001",
        funcional: VALIDO,
      }).success,
    ).toBe(true);
  });
});

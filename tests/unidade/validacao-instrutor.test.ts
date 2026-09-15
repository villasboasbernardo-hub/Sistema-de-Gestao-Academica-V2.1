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
  esquemaDeDadosPessoais,
  esquemaDeEdicaoDeInstrutor,
  esquemaDeSituacao,
  ESPECIALIDADE_DE_MILITAR,
  ESPECIALIDADE_EM_BRANCO,
  OBRIGATORIOS_DO_INSTRUTOR,
} from "@/lib/validacao/instrutor";

const VALIDO = {
  posto_graduacao: "CT",
  esp_hab_obs: "-EF",
  nome_completo: "Fulano de Tal",
  categoria: "Militar",
  om: "CIAARA",
};

describe("`RN-INST-03` delimitado em 15/09/2026 · quatro de todo instrutor e a especialidade de militar", () => {
  it("os de todo instrutor são exatamente quatro — a especialidade é regra à parte, de militar", () => {
    expect(OBRIGATORIOS_DO_INSTRUTOR.map((o) => o.campo)).toEqual([
      "posto_graduacao",
      "nome_completo",
      "categoria",
      "om",
    ]);
  });

  it("cadastro novo de militar sem especialidade é recusado, com a mensagem própria", () => {
    const vazia = esquemaDeCriacaoDeInstrutor.safeParse({
      funcional: { ...VALIDO, esp_hab_obs: "" },
    });
    expect(vazia.success).toBe(false);
    expect(vazia.error?.issues[0]?.message).toBe(ESPECIALIDADE_DE_MILITAR);
    expect(vazia.error?.issues[0]?.path).toEqual(["funcional", "esp_hab_obs"]);
    const semCampo: Record<string, string> = { ...VALIDO };
    delete semCampo.esp_hab_obs;
    expect(esquemaDeCriacaoDeInstrutor.safeParse({ funcional: semCampo }).success).toBe(false);
  });

  it("cadastro novo de civil (SC, SCNS) sem especialidade passa, e grava nulo", () => {
    for (const posto of ["SC", "SCNS"]) {
      const r = esquemaDeCriacaoDeInstrutor.safeParse({
        funcional: { ...VALIDO, posto_graduacao: posto, categoria: "SCNS", esp_hab_obs: "" },
      });
      expect(r.success && r.data.funcional.esp_hab_obs).toBeNull();
    }
  });

  it("edição de militar sem especialidade passa, e grava nulo — os 15 da base real salvam a ficha", () => {
    const r = esquemaDeEdicaoDeInstrutor.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      funcional: { ...VALIDO, esp_hab_obs: "" },
    });
    expect(r.success && r.data.funcional.esp_hab_obs).toBeNull();
  });

  it("especialidade só com espaços continua recusada, com a mensagem própria", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({
      funcional: { ...VALIDO, esp_hab_obs: "   " },
    });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(ESPECIALIDADE_EM_BRANCO);
  });

  it("especialidade preenchida sai aparada", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({
      funcional: { ...VALIDO, esp_hab_obs: "  -EF " },
    });
    expect(r.success && r.data.funcional.esp_hab_obs).toBe("-EF");
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

describe("`FR-008` · a situação vem da ação, não do cliente", () => {
  const id = "0b0e5a4c-1111-4222-8333-444455556666";

  it("aceita só o id, e descarta um status mandado junto", () => {
    const r = esquemaDeSituacao.safeParse({ id, status: "ativo" });
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({ id });
  });

  it("recusa id que não é identificador", () => {
    const r = esquemaDeSituacao.safeParse({ id: "12" });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0]?.message).toBe("Instrutor inválido.");
  });
});

describe("`FR-024` · máscara: valida os dígitos, grava o formato canônico", () => {
  it("CPF digitado só com dígitos é gravado mascarado", () => {
    const r = esquemaDeDadosPessoais.safeParse({ cpf: "12345678901" });
    expect(r.success && r.data.cpf).toBe("123.456.789-01");
  });

  it("CPF com dígitos a menos é recusado, e a mensagem diz quantos", () => {
    const r = esquemaDeDadosPessoais.safeParse({ cpf: "123.456" });
    expect(!r.success && r.error.issues[0]?.message).toBe("O CPF deve ter 11 dígitos.");
  });

  it("telefone aceita 10 e 11 dígitos; RETELMA aceita 8 e 10", () => {
    const r = esquemaDeDadosPessoais.safeParse({
      telefone: "(21) 98765-4321",
      retelma: "12345678",
      endereco_cep: "12345678",
    });
    expect(r.success && [r.data.telefone, r.data.retelma, r.data.endereco_cep]).toEqual([
      "(21) 98765-4321",
      "1234-5678",
      "12345-678",
    ]);
  });

  it("campo com máscara vazio vira null, não string em branco", () => {
    const r = esquemaDeDadosPessoais.safeParse({ cpf: "", telefone: "   " });
    expect(r.success && [r.data.cpf, r.data.telefone]).toEqual([null, null]);
  });

  it("Estado só aceita UF; vazio vira null", () => {
    expect(esquemaDeDadosPessoais.safeParse({ endereco_estado: "RJ" }).success).toBe(true);
    expect(esquemaDeDadosPessoais.safeParse({ endereco_estado: "XX" }).success).toBe(false);
    const vazio = esquemaDeDadosPessoais.safeParse({ endereco_estado: "" });
    expect(vazio.success && vazio.data.endereco_estado).toBeNull();
  });

  it("NIP no bloco funcional segue o mesmo caminho", () => {
    const r = esquemaDeCriacaoDeInstrutor.safeParse({ funcional: { ...VALIDO, nip: "12345678" } });
    expect(r.success && r.data.funcional.nip).toBe("12.3456.78");
  });
});

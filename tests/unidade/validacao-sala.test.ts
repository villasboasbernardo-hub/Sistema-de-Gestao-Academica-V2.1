/**
 * `FR-029.5` / `FR-029.6` · a validação de entrada da sala.
 *
 * ⚠️ **NÃO HÁ CAMPO DE RENOMEAR, E A AUSÊNCIA É COMPORTAMENTO PRETENDIDO** (`FR-029.5`). O nome da
 * sala é o valor gravado em `turmas.sala_alocada`; renomeá-lo deixaria as turmas apontando para um
 * nome que não existe mais. Sala errada se desativa e se acrescenta outra.
 */
import { describe, expect, it } from "vitest";

import { esquemaDeSala, esquemaDeSituacaoDaSala, NATUREZAS_DE_SALA } from "@/lib/validacao/sala";

describe("`FR-029.6` · nome e natureza", () => {
  it("a sala completa passa", () => {
    expect(esquemaDeSala.safeParse({ valor: "Sala 09", natureza: "fisica" }).success).toBe(true);
  });

  it("nome vazio ou só espaços é recusado", () => {
    expect(esquemaDeSala.safeParse({ valor: "", natureza: "fisica" }).success).toBe(false);
    expect(esquemaDeSala.safeParse({ valor: "  ", natureza: "fisica" }).success).toBe(false);
  });

  it("⚠️ natureza AUSENTE é recusada — não há padrão silencioso", () => {
    const r = esquemaDeSala.safeParse({ valor: "Sala 09" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain("física ou ambiente virtual");
  });

  it("as duas naturezas, e só elas", () => {
    for (const n of NATUREZAS_DE_SALA) {
      expect(esquemaDeSala.safeParse({ valor: "X", natureza: n }).success, n).toBe(true);
    }
    expect(esquemaDeSala.safeParse({ valor: "X", natureza: "hibrida" }).success).toBe(false);
  });
});

describe("⚠️ nenhum caminho de renomear (`FR-029.5`)", () => {
  it("o esquema não tem campo de nome novo, e descarta o que vier", () => {
    const r = esquemaDeSala.safeParse({
      valor: "Sala 09",
      natureza: "fisica",
      valor_novo: "Sala 10",
      novo_nome: "Sala 10",
    });
    expect(r.success).toBe(true);
    if (r.success) expect([...Object.keys(r.data)].sort()).toEqual(["natureza", "valor"]);
  });

  it("a situação viaja só com o nome — nada além dele", () => {
    const r = esquemaDeSituacaoDaSala.safeParse({
      valor: "Sala 04",
      ativo: false,
      natureza: "virtual",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).toEqual(["valor"]);
  });
});

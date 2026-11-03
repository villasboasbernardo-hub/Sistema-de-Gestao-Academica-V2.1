/**
 * Bloco 18 (spec 033), RA-1 · FR-001.3 — a validação de entrada do catálogo de tipos de atividade.
 *
 * ⚠️ **A CHAVE NÃO SE EDITA, E A AUSÊNCIA É COMPORTAMENTO PRETENDIDO** (decisão 3 da conferência do passo 0): o esquema
 *    da edição não tem `valor` — o que se manda é o rótulo e a classificação.
 */
import { describe, expect, it } from "vitest";

import {
  esquemaDaEdicaoDoTipo,
  esquemaDaSituacaoDoTipo,
  esquemaDoTipoNovo,
  TAMANHO_MAXIMO_DO_NOME_DO_TIPO,
} from "@/lib/validacao/tipo-de-atividade";

const ID = "2d1f258f-9cb7-44d1-8525-a14f09f1bd84";

describe("Novo tipo · nome e classificação", () => {
  it("o tipo completo passa, com o nome aparado e sem espaço repetido", () => {
    const r = esquemaDoTipoNovo.safeParse({ rotulo: "  Visita   de estudo ", classificacao: "AEC" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rotulo).toBe("Visita de estudo");
  });

  it("nome vazio, só espaços ou longo demais é recusado", () => {
    expect(esquemaDoTipoNovo.safeParse({ rotulo: "", classificacao: "AEC" }).success).toBe(false);
    expect(esquemaDoTipoNovo.safeParse({ rotulo: "   ", classificacao: "AEC" }).success).toBe(false);
    expect(
      esquemaDoTipoNovo.safeParse({
        rotulo: "x".repeat(TAMANHO_MAXIMO_DO_NOME_DO_TIPO + 1),
        classificacao: "AEC",
      }).success,
    ).toBe(false);
  });

  it("⚠️ classificação AUSENTE é recusada — não há padrão silencioso", () => {
    const r = esquemaDoTipoNovo.safeParse({ rotulo: "Visita de estudo" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toContain("AEC, TAD ou TR");
  });

  it("⚠️ AEC, TAD e TR, e só elas: Estudo Individual, Apoio Individualizado e CHD não se escolhem aqui", () => {
    for (const c of ["AEC", "TAD", "TR"]) {
      expect(esquemaDoTipoNovo.safeParse({ rotulo: "X", classificacao: c }).success, c).toBe(true);
    }
    for (const c of ["Estudo_Individual", "Apoio_Individualizado", "CHD", ""]) {
      expect(esquemaDoTipoNovo.safeParse({ rotulo: "X", classificacao: c }).success, c).toBe(false);
    }
  });
});

describe("Editar · o rótulo e a classificação, nunca a chave", () => {
  it("a edição completa passa", () => {
    expect(esquemaDaEdicaoDoTipo.safeParse({ id: ID, rotulo: "Palestra", classificacao: "TAD" }).success).toBe(true);
  });

  it("⚠️ o esquema não tem campo de chave, e descarta o que vier", () => {
    const r = esquemaDaEdicaoDoTipo.safeParse({
      id: ID,
      rotulo: "Palestra",
      classificacao: "AEC",
      valor: "Outro valor",
    });
    expect(r.success).toBe(true);
    if (r.success) expect("valor" in r.data).toBe(false);
  });

  it("id que não é uuid é recusado", () => {
    expect(esquemaDaEdicaoDoTipo.safeParse({ id: "x", rotulo: "Palestra", classificacao: "AEC" }).success).toBe(false);
  });

  it("desativar e reativar mandam só o id", () => {
    const r = esquemaDaSituacaoDoTipo.safeParse({ id: ID, rotulo: "viajaria junto" });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data)).toEqual(["id"]);
  });
});

/**
 * `RN-RESP-1` (emenda de 15/10/2026 à spec 014) — quem responde por cada papel do lançamento: aula e aplicador pedem o
 * instrutor do cadastro; fiscal, quem conduz a vista e toda atividade aceitam o «outro responsável (nome livre)».
 *
 * ⚠️ A habilitação NÃO é decidida em `responsavel.ts`: ela sai de `EXIGE_HABILITACAO` e `AVISA_SEM_HABILITACAO`. O
 *    último caso prova isso — mudar a tabela de `habilitacao.ts` muda a regra do responsável, sem segunda conta.
 */
import { describe, expect, it } from "vitest";

import { CATEGORIAS_DE_ATIVIDADE } from "@/lib/dominio/categoria-pelo-tipo";
import { AVISA_SEM_HABILITACAO, EXIGE_HABILITACAO } from "@/lib/dominio/habilitacao";
import {
  FRASE_SEM_NOME_LIVRE,
  ROTULO_NOME_LIVRE,
  recusaDoNomeLivre,
  regraDoResponsavel,
} from "@/lib/dominio/responsavel";

describe("RN-RESP-1 · a regra de cada papel", () => {
  it("aula: instrutor do cadastro obrigatório, sem nome livre, habilitação exigida", () => {
    expect(regraDoResponsavel({ tipo: "aula" })).toEqual({
      instrutorDoCadastro: "obrigatorio",
      nomeLivre: false,
      habilitacao: "exige",
    });
  });

  it("aplicador da prova: obrigatório, sem nome livre, e a habilitação é AVISO (D-AV-3), não recusa", () => {
    expect(regraDoResponsavel({ tipo: "avaliacao", papel: "aplicador" })).toEqual({
      instrutorDoCadastro: "obrigatorio",
      nomeLivre: false,
      habilitacao: "aviso",
    });
  });

  it("fiscal: cadastro OU nome livre, sem habilitação (`RN-INST-01` delimitada)", () => {
    expect(regraDoResponsavel({ tipo: "avaliacao", papel: "fiscal" })).toEqual({
      instrutorDoCadastro: "opcional",
      nomeLivre: true,
      habilitacao: "nao",
    });
  });

  it("quem conduz a vista: cadastro OU nome livre, sem habilitação", () => {
    expect(regraDoResponsavel({ tipo: "vista" })).toEqual({
      instrutorDoCadastro: "opcional",
      nomeLivre: true,
      habilitacao: "nao",
    });
  });

  it("toda categoria de atividade — AEC, TAD, TR, Estudo Individual e Apoio Individualizado — aceita nome livre", () => {
    for (const categoria of CATEGORIAS_DE_ATIVIDADE) {
      expect(regraDoResponsavel({ tipo: "atividade", categoria }), categoria).toEqual({
        instrutorDoCadastro: "opcional",
        nomeLivre: true,
        habilitacao: "nao",
      });
    }
  });

  it("a atividade de categoria desconhecida (o cartão de edição) vale o que todas dizem em comum", () => {
    expect(regraDoResponsavel({ tipo: "atividade", categoria: null }).nomeLivre).toBe(true);
  });

  it("o rótulo do campo livre é um só", () => {
    expect(ROTULO_NOME_LIVRE).toBe("Outro responsável (nome livre)");
  });
});

describe("RN-RESP-1 · a habilitação vem de `habilitacao.ts`, um ponto só", () => {
  it("exige ⇔ EXIGE_HABILITACAO; aviso ⇔ AVISA_SEM_HABILITACAO — para cada papel com atuação", () => {
    const casos = [
      [{ tipo: "aula" } as const, "ministrar"],
      [{ tipo: "avaliacao", papel: "aplicador" } as const, "avaliacao"],
      [{ tipo: "vista" } as const, "vista_de_prova"],
    ] as const;
    for (const [lancamento, atuacao] of casos) {
      const esperado = EXIGE_HABILITACAO[atuacao]
        ? "exige"
        : AVISA_SEM_HABILITACAO[atuacao]
          ? "aviso"
          : "nao";
      expect(regraDoResponsavel(lancamento).habilitacao, atuacao).toBe(esperado);
    }
  });

  it("AVISA_SEM_HABILITACAO decide o aviso do aplicador — e só dele", () => {
    expect(AVISA_SEM_HABILITACAO).toEqual({
      ministrar: false,
      responsavel: false,
      avaliacao: true,
      vista_de_prova: false,
    });
  });
});

/*
 * ⚠️ `recusaDoNomeLivre` é a função que a Server Action (`lancar` e a edição) chama — a regra deixa de morar só na
 *    tela. Hoje toda categoria de atividade aceita nome livre, então o caso «categoria que recusa» se prova com a
 *    regra de aula, a do aplicador e uma regra escrita aqui com `nomeLivre: false`.
 */
describe("RN-RESP-1 · o servidor recusa o nome livre onde a regra não o aceita", () => {
  it("regra com nomeLivre=false + nome escrito → a frase da recusa", () => {
    expect(recusaDoNomeLivre({ nomeLivre: false }, "DOEP")).toBe(FRASE_SEM_NOME_LIVRE);
  });

  it("aula e aplicador recusam; fiscal e vista aceitam", () => {
    expect(recusaDoNomeLivre(regraDoResponsavel({ tipo: "aula" }), "Fulano")).toBe(
      FRASE_SEM_NOME_LIVRE,
    );
    expect(
      recusaDoNomeLivre(regraDoResponsavel({ tipo: "avaliacao", papel: "aplicador" }), "Fulano"),
    ).toBe(FRASE_SEM_NOME_LIVRE);
    expect(
      recusaDoNomeLivre(regraDoResponsavel({ tipo: "avaliacao", papel: "fiscal" }), "Fulano"),
    ).toBeNull();
    expect(recusaDoNomeLivre(regraDoResponsavel({ tipo: "vista" }), "Fulano")).toBeNull();
  });

  it("toda categoria de atividade aceita hoje — o lançamento da tela não muda", () => {
    for (const categoria of CATEGORIAS_DE_ATIVIDADE) {
      expect(
        recusaDoNomeLivre(regraDoResponsavel({ tipo: "atividade", categoria }), "DOEP"),
        categoria,
      ).toBeNull();
    }
  });

  it("sem nome (nulo, ausente, vazio ou só espaço) nunca recusa — nem onde o nome livre é proibido", () => {
    for (const nome of [null, undefined, "", "   "]) {
      expect(recusaDoNomeLivre({ nomeLivre: false }, nome), String(nome)).toBeNull();
    }
  });
});

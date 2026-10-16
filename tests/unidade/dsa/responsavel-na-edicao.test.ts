/**
 * `responsavelNaEdicao` (`RN-RESP-1`, emenda de 15/10/2026 à spec 014): as colunas de quem responde quando um lançamento
 * do DSA é EDITADO — e a recusa do nome livre onde o papel não o aceita.
 *
 * ⚠️ **O CASO QUE ESTE ARQUIVO EXISTE PARA PROVAR:** quem chama o endpoint SÓ com `instrutorId` numa atividade (sem
 *    passar pelo cartão, que manda os dois campos) tem de levar `responsavel_externo = null` junto — senão o
 *    `CHECK ativ_responsavel_exclusivo` recusa com `23514`. O caso de ponta a ponta não o prova: o cartão já manda
 *    `null`, e ele passaria igual com a ação sem o zeramento.
 * ⚠️ **E A AÇÃO USA A FUNÇÃO** — a segunda metade lê `lib/acoes/dsa.ts` sem comentário (regra 9.1.1): uma cópia do
 *    mapeamento escrita de novo na ação faria esta prova testar código que ninguém chama.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CATEGORIAS_DE_ATIVIDADE } from "@/lib/dominio/categoria-pelo-tipo";
import { responsavelNaEdicao } from "@/lib/dominio/dsa/responsavel-na-edicao";
import { FRASE_SEM_NOME_LIVRE } from "@/lib/dominio/responsavel";

const ID = "11111111-1111-4111-8111-111111111111";

describe("RN-RESP-1 · as colunas de quem responde na edição", () => {
  it("atividade, só com instrutorId (quem chama o endpoint direto): o nome livre vai a NULL junto", () => {
    expect(
      responsavelNaEdicao({ origem: "atividade_nao_letiva", categoria: "AEC", instrutorId: ID }),
    ).toEqual({ ok: true, colunas: { instrutor_id: ID, responsavel_externo: null } });
  });

  it("atividade, só com o nome livre: o instrutor do cadastro vai a NULL junto", () => {
    expect(
      responsavelNaEdicao({
        origem: "atividade_nao_letiva",
        categoria: "TAD",
        responsavelExterno: "DOEP",
      }),
    ).toEqual({ ok: true, colunas: { responsavel_externo: "DOEP", instrutor_id: null } });
  });

  it("atividade, troca pelo cartão (o novo e o antigo apagado): o mesmo par, sem contradição", () => {
    expect(
      responsavelNaEdicao({
        origem: "atividade_nao_letiva",
        categoria: "AEC",
        instrutorId: null,
        responsavelExterno: "CIAARA-30",
      }),
    ).toEqual({ ok: true, colunas: { instrutor_id: null, responsavel_externo: "CIAARA-30" } });
    expect(
      responsavelNaEdicao({
        origem: "atividade_nao_letiva",
        categoria: "AEC",
        instrutorId: ID,
        responsavelExterno: null,
      }),
    ).toEqual({ ok: true, colunas: { instrutor_id: ID, responsavel_externo: null } });
  });

  it("atividade, tirar o instrutor (null) não inventa nome livre: só apaga", () => {
    expect(
      responsavelNaEdicao({ origem: "atividade_nao_letiva", categoria: "TR", instrutorId: null }),
    ).toEqual({ ok: true, colunas: { instrutor_id: null } });
  });

  it("quem edita só o horário (nenhum campo de responsável mandado): NENHUMA coluna de responsável, em origem nenhuma", () => {
    for (const origem of ["aula", "avaliacao", "vista_prova", "atividade_nao_letiva"] as const) {
      expect(
        responsavelNaEdicao({
          origem,
          categoria: origem === "atividade_nao_letiva" ? "AEC" : null,
        }),
        origem,
      ).toEqual({ ok: true, colunas: {} });
    }
  });

  it("aula: instrutor_id; avaliação: instrutor_responsavel_id (o aplicador)", () => {
    expect(responsavelNaEdicao({ origem: "aula", categoria: null, instrutorId: ID })).toEqual({
      ok: true,
      colunas: { instrutor_id: ID },
    });
    expect(responsavelNaEdicao({ origem: "avaliacao", categoria: null, instrutorId: ID })).toEqual({
      ok: true,
      colunas: { instrutor_responsavel_id: ID },
    });
  });

  it("vista: trocar quem conduz pelo cadastro apaga o nome de fora (FR-043)", () => {
    expect(
      responsavelNaEdicao({ origem: "vista_prova", categoria: null, instrutorId: ID }),
    ).toEqual({ ok: true, colunas: { conduz_instrutor_id: ID, conduz_nome_externo: null } });
  });

  it("aula e aplicador com nome livre: RECUSA no servidor (o papel pede o cadastro), sem coluna nenhuma", () => {
    for (const origem of ["aula", "avaliacao"] as const) {
      expect(
        responsavelNaEdicao({ origem, categoria: null, responsavelExterno: "Fulano de fora" }),
        origem,
      ).toEqual({ ok: false, mensagem: FRASE_SEM_NOME_LIVRE, campo: "responsavelExterno" });
    }
  });

  it("toda categoria de atividade aceita o nome livre hoje (o comportamento não muda)", () => {
    for (const categoria of CATEGORIAS_DE_ATIVIDADE) {
      expect(
        responsavelNaEdicao({
          origem: "atividade_nao_letiva",
          categoria,
          responsavelExterno: "DOEP",
        }).ok,
        categoria,
      ).toBe(true);
    }
  });
});

/** O código TypeScript sem comentários — mede o que o arquivo FAZ, não o que ele diz (regra 9.1.1). */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** O corpo de uma função de nível de topo: da assinatura até o `}` na coluna 0. */
function corpoDe(codigo: string, assinatura: string): string {
  const inicio = codigo.indexOf(assinatura);
  if (inicio < 0) return "";
  const fim = codigo.indexOf("\n}\n", inicio);
  return codigo.slice(inicio, fim < 0 ? undefined : fim);
}

const ACOES = semComentarios(readFileSync(resolve(process.cwd(), "lib/acoes/dsa.ts"), "utf8"));

describe("RN-RESP-1 e D-AV-3 · a Server Action usa as regras (lido sem comentário)", () => {
  const atualizar = corpoDe(ACOES, "async function aplicarAtualizacao(");
  const lancar = corpoDe(ACOES, "export async function lancar(");

  it("controle positivo: a varredura acha as duas funções da ação", () => {
    expect(atualizar).toContain("lerFato(");
    expect(lancar).toContain("esquemaDoBloco.safeParse(");
  });

  it("a edição decide as colunas de responsável por responsavelNaEdicao, sem segunda cópia do zeramento", () => {
    expect(atualizar).toMatch(/responsavelNaEdicao\(/);
    expect(atualizar).not.toMatch(/campos\[\s*["']responsavel_externo["']\s*\]/);
    expect(atualizar).not.toMatch(/campos\[\s*["']conduz_nome_externo["']\s*\]/);
  });

  it("o lançamento de atividade confere o nome livre pela regra da categoria (recusaDoNomeLivre)", () => {
    expect(lancar).toMatch(
      /recusaDoNomeLivre\(\s*regraDoResponsavel\(\s*\{\s*tipo:\s*"atividade",\s*categoria:/,
    );
  });

  it("D-AV-3 na edição: trocar o aplicador chama avisoDoAplicador e o aviso chega à resposta", () => {
    expect(atualizar).toMatch(/avisoDoAplicador\(/);
    expect(atualizar).toMatch(/avisoDaTroca/);
  });

  it("controle positivo: o detector de cópia reprova o zeramento escrito de novo na ação", () => {
    const copia = `if (a.instrutorId !== null) campos["responsavel_externo"] = null;`;
    expect(copia).toMatch(/campos\[\s*["']responsavel_externo["']\s*\]/);
  });
});

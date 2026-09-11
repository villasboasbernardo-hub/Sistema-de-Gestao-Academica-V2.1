/**
 * O contrato de parâmetros é completo e rastreável (`SC-007`, `FR-001` a `FR-005`).
 *
 * ⚠️ ESTE ARQUIVO NÃO TESTA COMPORTAMENTO: testa o **contrato em si**. É a diferença entre uma
 * tabela que descreve intenção e um contrato que alguém é obrigado a seguir — e a tabela do
 * documento 25 §1.3 existia desde a Fase 2 sem que requisito nenhum a citasse.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CLASSIFICACOES,
  CONTRATO,
  LIMITE_DE_FREQUENCIA_MS,
  MODALIDADES,
  parametrosDaRota,
  type Parametro,
  type Rota,
} from "@/lib/navegacao/contrato";
import { Constants } from "@/lib/tipos/database";

const ROTAS = Object.keys(CONTRATO) as Rota[];
const TODOS: readonly Parametro[] = ROTAS.flatMap((r) => parametrosDaRota(r));

describe("`SC-007` · todo parâmetro traz os cinco campos", () => {
  it("há parâmetro para testar — controle positivo", () => {
    // Sem isto, um contrato vazio passaria em tudo abaixo e pareceria cumprido por ausência.
    expect(TODOS.length).toBeGreaterThan(0);
  });

  it.each(TODOS)("$nome tem nome, tipo, padrão, histórico e aviso ao servidor", (p) => {
    expect(p.nome, "nome vazio").not.toBe("");
    expect(["texto", "inteiro", "escolha", "lista"]).toContain(p.tipo);
    expect(
      p.padrao,
      "padrão ausente — sem ele não há como saber quando o parâmetro some da URL",
    ).toBeDefined();
    expect(["empilha", "substitui"]).toContain(p.historico);
    expect(typeof p.avisaServidor, "o campo cujo erro é silencioso não pode ficar implícito").toBe(
      "boolean",
    );
  });

  it("o nome é `snake_case` curto, sem acento", () => {
    const fora = TODOS.filter((p) => !/^[a-z][a-z0-9_]*$/.test(p.nome)).map((p) => p.nome);
    expect(fora, `nomes fora da convenção: ${fora.join(", ")}`).toEqual([]);
  });

  it("parâmetro de escolha declara as opções, e o padrão não precisa estar entre elas", () => {
    // ⚠️ O padrão é o "todas": ele significa **sem recorte**, e não uma das opções.
    for (const p of TODOS.filter((x) => x.tipo === "escolha")) {
      expect(p.tipo === "escolha" && p.opcoes.length, `${p.nome} sem opções`).toBeGreaterThan(0);
    }
  });
});

describe("Princípio VIII · toda rota aponta para um requisito que existe", () => {
  const requisitos = readFileSync(
    resolve(process.cwd(), "docs/fase-1/02-Requisitos-Funcionais.md"),
    "utf8",
  );

  it.each(ROTAS)("a origem de %s é um `RF-` do documento 02", (rota) => {
    const origem = CONTRATO[rota].origem;
    expect(origem, `${rota} sem origem declarada`).toMatch(/^RF-/);
    expect(
      requisitos.includes(origem),
      `${rota} aponta para ${origem}, que não existe no documento 02`,
    ).toBe(true);
  });
});

describe("`FR-004` · a política de histórico não é implícita", () => {
  it("parâmetro que troca CONTEXTO empilha", () => {
    // ⚠️ O padrão da biblioteca é SUBSTITUIR — medido em 11/09/2026. Um parâmetro de contexto que
    // esquecesse isto deixaria o botão voltar sem nada para desfazer, com a URL correta.
    const contexto = parametrosDaRota("/inicio");
    expect(contexto.every((p) => p.historico === "empilha")).toBe(true);
  });

  it("o limite de frequência tem número, e ele vive no contrato", () => {
    // ⚠️ Ele morava num EXEMPLO DE CÓDIGO do documento 25 §1.5 — e valor que mora em exemplo é
    // valor que a próxima tela escolhe de novo.
    expect(LIMITE_DE_FREQUENCIA_MS).toBe(300);
  });
});

describe("`FR-037.1` · nenhum parâmetro de paginação, e é recusa declarada", () => {
  it("o contrato não tem página, tamanho de página nem deslocamento", () => {
    const proibidos = ["pagina", "page", "por_pagina", "tamanho", "offset", "limite"];
    const achados = TODOS.filter((p) => proibidos.includes(p.nome)).map((p) => p.nome);
    expect(
      achados,
      `paginação entrou no contrato: ${achados.join(", ")}. A fatia (b) decidiu por medição que a ` +
        `tabela renderiza todas as linhas, e reabrir isso exige medição na mão.`,
    ).toEqual([]);
  });
});

describe("`FR-001.1` · a emenda ao documento 25 foi aplicada nos DOIS lugares", () => {
  it("o contrato tem classificação e modalidade na tela inicial", () => {
    const nomes = parametrosDaRota("/inicio").map((p) => p.nome);
    expect(nomes).toEqual(["classificacao", "modalidade"]);
  });

  it("o documento 25 §1.3 traz os dois", () => {
    /*
     * ⚠️ É A INVARIANTE QUE IMPEDE OS DOIS PONTOS DE VERDADE DE DIVERGIREM. A tabela listava só
     * `classificacao`, e o `RF-INI-02` — que é **[PRESERVADO]** — escreve os dois na própria nota
     * de mecanismo. Sem este caso, a emenda envelheceria sem ninguém conferir, que é exatamente o
     * que aconteceu com as sete anotações de contraste do documento 23.
     */
    const doc = readFileSync(
      resolve(process.cwd(), "docs/fase-2/25-Camada-de-Dados-e-Estado.md"),
      "utf8",
    );
    const linha = doc.split(/\r?\n/).find((l) => l.includes("| `/inicio` |"));
    expect(linha, "a linha da tela inicial sumiu da tabela do documento 25").toBeDefined();
    expect(linha).toContain("classificacao");
    expect(linha).toContain("modalidade");
  });
});

describe("`RF-INI-02` · o domínio do filtro é o domínio do BANCO, não uma lista à mão", () => {
  /*
   * ⚠️ ESTE BLOCO NASCEU DE UM DEFEITO MEDIDO EM 11/09/2026. A primeira versão do contrato listava
   * três classificações; a coluna `cursos.classificacao` aceita **sete**. O efeito seria do pior
   * tipo: um link filtrando por `estagio_qualificacao` seria degradado para "todas" pelo `FR-006`, a
   * tela abriria cheia, e não haveria erro nenhum para ver — só um recorte que não pegou.
   *
   * ⚠️ E A TABELA DO DOCUMENTO 25 ESCONDIA A DIVERGÊNCIA porque anotava o tipo como **texto**: texto
   * não tem domínio do qual estar fora. Foi a emenda para **escolha** que criou a pergunta certa.
   */
  it("classificação oferece exatamente o enum do banco", () => {
    expect([...CLASSIFICACOES]).toEqual([...Constants.public.Enums.escopo_curso]);
  });

  it("modalidade oferece exatamente o enum do banco", () => {
    expect([...MODALIDADES]).toEqual([...Constants.public.Enums.modalidade_ensino]);
  });

  it("⚠️ e o contrato não encolhe o domínio — nenhum valor do banco fica de fora", () => {
    // Escrever a lista à mão é justamente como ela encolhe: alguém copia os valores que conhece.
    // `pnpm db:tipos` mantém o outro lado em dia, e o CI reprova se ele divergir do schema.
    const nomes = parametrosDaRota("/inicio").map((p) => p.nome);
    expect(nomes).toEqual(["classificacao", "modalidade"]);
    for (const p of parametrosDaRota("/inicio")) {
      expect(p.tipo, `${p.nome} voltou a ser texto — texto não tem domínio`).toBe("escolha");
    }
  });
});

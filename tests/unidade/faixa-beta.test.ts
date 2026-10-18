/**
 * A faixa Beta — FR-001.1 e FR-001.4 da spec 016 (item 1.1 do plano de correções).
 *
 * > *"Faixa fina e fixa no topo de todas as telas, inclusive login, em todos os ambientes, não
 * > fechável: «Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão
 * > Acadêmica»."* — item 1.1, decisão de Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O DA PRODUCTION.** Hoje a faixa some lá; a regra nova a mostra, e
 * mostra **só** o texto Beta — e o mesmo vale para variável ausente ou desconhecida (NQ-3, 17/10/2026):
 * `ambienteAtual()` trata ausente como `local`, e usar aquela leitura aqui faria a Production dizer
 * *"ambiente local"* sempre que a variável faltasse.
 */
import { afterEach, describe, expect, it } from "vitest";

import { ambienteDeclarado, textoDaFaixa, TEXTO_DA_FAIXA_BETA } from "@/lib/ambiente";

const ORIGINAL = process.env.NEXT_PUBLIC_AMBIENTE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_AMBIENTE;
  else process.env.NEXT_PUBLIC_AMBIENTE = ORIGINAL;
});

describe("faixa Beta — o texto (FR-001.1)", () => {
  it("é exatamente o texto decidido", () => {
    expect(TEXTO_DA_FAIXA_BETA).toBe(
      "Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão Acadêmica",
    );
  });

  it("em Production mostra só o texto Beta", () => {
    expect(textoDaFaixa("producao", 0)).toBe(TEXTO_DA_FAIXA_BETA);
  });

  it("acrescenta o ambiente local e a pré-visualização", () => {
    expect(textoDaFaixa("local", 0)).toBe(`${TEXTO_DA_FAIXA_BETA} · ambiente local`);
    expect(textoDaFaixa("preview", 0)).toBe(`${TEXTO_DA_FAIXA_BETA} · pré-visualização`);
  });

  it("sem ambiente declarado, só o texto Beta (NQ-3)", () => {
    expect(textoDaFaixa(null, 0)).toBe(TEXTO_DA_FAIXA_BETA);
  });

  it("preserva o aviso de variável por preencher", () => {
    expect(textoDaFaixa("preview", 2)).toBe(
      `${TEXTO_DA_FAIXA_BETA} · pré-visualização · 2 variável(is) de ambiente por preencher`,
    );
  });
});

describe("faixa Beta — o ambiente DECLARADO (FR-001.4)", () => {
  it("reconhece os três valores", () => {
    for (const valor of ["local", "preview", "producao"] as const) {
      process.env.NEXT_PUBLIC_AMBIENTE = valor;
      expect(ambienteDeclarado()).toBe(valor);
    }
  });

  it("ausente é nulo, e não `local`", () => {
    delete process.env.NEXT_PUBLIC_AMBIENTE;
    expect(ambienteDeclarado()).toBeNull();
  });

  it("desconhecido é nulo, e não `local`", () => {
    process.env.NEXT_PUBLIC_AMBIENTE = "homologacao";
    expect(ambienteDeclarado()).toBeNull();
  });

  it("com Production declarada, o texto não fala de ambiente", () => {
    process.env.NEXT_PUBLIC_AMBIENTE = "producao";
    expect(textoDaFaixa(ambienteDeclarado(), 0)).toBe(TEXTO_DA_FAIXA_BETA);
  });
});

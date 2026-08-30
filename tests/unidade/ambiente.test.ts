/**
 * Suíte de UNIDADE — roda vazia nesta fatia, por FR-011.
 *
 * "Suíte que roda vazia hoje é suíte que ninguém precisa configurar sob pressão amanhã, no meio de
 * um épico com prazo" (documento 10 §6.5). Quando as ~40 regras RN- chegarem a lib/dominio/, o
 * arnês já existe.
 *
 * O que há aqui de verdade: a degradação segura de lib/ambiente.ts (FR-003, RN-DEG-01).
 */
import { afterEach, describe, expect, it } from "vitest";

import { ambienteAtual, conferirAmbiente, mensagemDeConfiguracaoIncompleta } from "@/lib/ambiente";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("lib/ambiente — degradação segura (FR-003, RN-DEG-01)", () => {
  it("aponta QUAL variável falta, em vez de lançar exceção crua", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const faltas = conferirAmbiente();

    expect(faltas.map((f) => f.variavel)).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
    expect(mensagemDeConfiguracaoIncompleta(faltas)).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("trata string vazia como ausente — `VAR=` no .env é o erro mais comum", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";

    expect(conferirAmbiente().map((f) => f.variavel)).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("não devolve mensagem quando está tudo configurado", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";

    expect(conferirAmbiente()).toHaveLength(0);
    expect(mensagemDeConfiguracaoIncompleta([])).toBeNull();
  });
});

describe("lib/ambiente — rótulo de ambiente (FR-017, FR-022.2)", () => {
  it("cai em `local` quando o rótulo é desconhecido — o padrão seguro", () => {
    process.env.NEXT_PUBLIC_AMBIENTE = "homologacao";
    expect(ambienteAtual()).toBe("local");
  });

  it("cai em `local` quando o rótulo não foi declarado", () => {
    delete process.env.NEXT_PUBLIC_AMBIENTE;
    expect(ambienteAtual()).toBe("local");
  });

  it("reconhece os três rótulos previstos", () => {
    for (const rotulo of ["local", "preview", "producao"] as const) {
      process.env.NEXT_PUBLIC_AMBIENTE = rotulo;
      expect(ambienteAtual()).toBe(rotulo);
    }
  });
});

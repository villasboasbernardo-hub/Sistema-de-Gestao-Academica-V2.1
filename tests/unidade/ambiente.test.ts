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

import {
  ambienteAtual,
  conferirAmbiente,
  mensagemDeConfiguracaoIncompleta,
  urlDaAplicacao,
} from "@/lib/ambiente";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("lib/ambiente — degradação segura (FR-003, RN-DEG-01)", () => {
  it("aponta QUAL variável falta, em vez de lançar exceção crua", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_URL_APLICACAO;

    const faltas = conferirAmbiente();

    expect(faltas.map((f) => f.variavel)).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_URL_APLICACAO",
    ]);
    expect(mensagemDeConfiguracaoIncompleta(faltas)).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("trata string vazia como ausente — `VAR=` no .env é o erro mais comum", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "   ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    process.env.NEXT_PUBLIC_URL_APLICACAO = "http://localhost:3000";

    expect(conferirAmbiente().map((f) => f.variavel)).toEqual(["NEXT_PUBLIC_SUPABASE_URL"]);
  });

  it("não devolve mensagem quando está tudo configurado", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    process.env.NEXT_PUBLIC_URL_APLICACAO = "http://localhost:3000";

    expect(conferirAmbiente()).toHaveLength(0);
    expect(mensagemDeConfiguracaoIncompleta([])).toBeNull();
  });

  // ⚠️ A URL da aplicação entrou na lista de obrigatórias no Épico 3, e não por capricho: é ela
  // que monta os links de convite e de recuperação. Errada, o fluxo INTEIRO funciona — o convite
  // sai, chega, e a pessoa define senha no ambiente errado. Nenhum teste de percurso pega isso,
  // porque nada falha. Faltando, o middleware nega a rota protegida (FR-005.1) em vez de deixar o
  // sistema montar links para lugar nenhum.
  it("exige a URL da aplicação — link de convite para o ambiente errado não falha em lugar nenhum", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    delete process.env.NEXT_PUBLIC_URL_APLICACAO;

    expect(conferirAmbiente().map((f) => f.variavel)).toEqual(["NEXT_PUBLIC_URL_APLICACAO"]);
  });
});

describe("lib/ambiente — URL canônica da aplicação (FR-033)", () => {
  it("tira a barra final, para quem monta o caminho não produzir `//convite`", () => {
    process.env.NEXT_PUBLIC_URL_APLICACAO = "https://exemplo.app/";
    expect(urlDaAplicacao()).toBe("https://exemplo.app");
  });

  it("tira mais de uma barra final também", () => {
    process.env.NEXT_PUBLIC_URL_APLICACAO = "https://exemplo.app///";
    expect(urlDaAplicacao()).toBe("https://exemplo.app");
  });

  it("recusa com mensagem legível quando não está configurada", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave";
    delete process.env.NEXT_PUBLIC_URL_APLICACAO;

    expect(() => urlDaAplicacao()).toThrowError(/NEXT_PUBLIC_URL_APLICACAO/);
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

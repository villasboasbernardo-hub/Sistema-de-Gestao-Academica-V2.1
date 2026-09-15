/**
 * `FR-024` da spec 006 — as máscaras, com os casos literais da v2.0.
 *
 * ⚠️ O `FR-013` CITADO É O DA SPEC 016 DA v2.0 (NIP), NÃO O DESTA SPEC — onde `FR-013` é a ausência de
 * edição em linha. Os casos de CPF, CEP, telefone e RETELMA são os cenários da US4 da spec 025 da v2.0.
 */
import { describe, expect, it } from "vitest";

import {
  limparMascara,
  mascararCep,
  mascararCpf,
  mascararNip,
  mascararRetelma,
  mascararTelefone,
} from "@/lib/formato/mascaras";

describe("NIP · `00.0000.00` (spec 016 da v2.0, FR-013)", () => {
  it("oito dígitos formatam por inteiro", () => {
    expect(mascararNip("12345678")).toBe("12.3456.78");
  });
  it("enquanto se digita, formata só o que há, sem inventar zero", () => {
    expect(mascararNip("123")).toBe("12.3");
  });
  it("dígito além do oitavo e letra são descartados", () => {
    expect(mascararNip("12a345678999")).toBe("12.3456.78");
  });
});

describe("CPF, CEP, telefone e RETELMA (spec 025 da v2.0, US4)", () => {
  it("CPF `12345678901` → `123.456.789-01`", () => {
    expect(mascararCpf("12345678901")).toBe("123.456.789-01");
  });
  it("CEP `12345678` → `12345-678`", () => {
    expect(mascararCep("12345678")).toBe("12345-678");
  });
  it("telefone com 11 dígitos → `(00) 00000-0000`", () => {
    expect(mascararTelefone("21987654321")).toBe("(21) 98765-4321");
  });
  it("telefone com 10 dígitos → `(00) 0000-0000`", () => {
    expect(mascararTelefone("2132165432")).toBe("(21) 3216-5432");
  });
  it("RETELMA com 10 dígitos → `(00) 0000-0000`", () => {
    expect(mascararRetelma("8112345678")).toBe("(81) 1234-5678");
  });
  it("RETELMA com 8 dígitos → `0000-0000`, sem o prefixo", () => {
    expect(mascararRetelma("12345678")).toBe("1234-5678");
  });
});

describe("limpeza · devolve só os dígitos", () => {
  it("tira pontuação, espaço e parêntese", () => {
    expect(limparMascara("(21) 98765-4321")).toBe("21987654321");
    expect(limparMascara("123.456.789-01")).toBe("12345678901");
  });
  it("máscara sobre valor já mascarado não duplica pontuação", () => {
    expect(mascararCpf("123.456.789-01")).toBe("123.456.789-01");
  });
});

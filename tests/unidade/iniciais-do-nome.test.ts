/**
 * `FR-010` e `FR-011` — as iniciais do avatar.
 *
 * ⚠️ **O CASO QUE DISCRIMINA é o par `"Ana"` / `"Ana Paula"`.** Uma regra que devolvesse sempre a
 * primeira letra passaria em quase tudo aqui e falharia só nele — e é justamente o par que uma
 * listagem de usuários mostra lado a lado.
 */
import { describe, expect, it } from "vitest";

import { iniciaisDoNome } from "@/lib/dominio/iniciais-do-nome";

describe("`FR-010` · as iniciais do avatar", () => {
  it("nome de duas palavras dá as duas iniciais", () => {
    expect(iniciaisDoNome("Bernardo Villas")).toBe("BV");
  });

  it("⚠️ preposição NÃO conta — `Maria de Souza` é `MS`, nunca `MD`", () => {
    expect(iniciaisDoNome("Maria de Souza")).toBe("MS");
    expect(iniciaisDoNome("João da Silva")).toBe("JS");
    expect(iniciaisDoNome("Ana dos Santos")).toBe("AS");
    expect(iniciaisDoNome("Pedro e Paulo")).toBe("PP");
  });

  it("⚠️ e a ligação sai só quando é palavra inteira — `Demétrio` mantém o `De`", () => {
    expect(iniciaisDoNome("Demétrio Alves")).toBe("DA");
  });

  it("⚠️ a comparação ignora acento e caixa, porque o cadastro real traz as três grafias", () => {
    expect(iniciaisDoNome("Maria DE Souza")).toBe("MS");
    expect(iniciaisDoNome("Maria De Souza")).toBe("MS");
  });

  it("nome longo usa a PRIMEIRA e a ÚLTIMA, não as duas primeiras", () => {
    expect(iniciaisDoNome("Maria Fernanda Souza")).toBe("MS");
    expect(iniciaisDoNome("Ana Clara de Oliveira Lima")).toBe("AL");
  });

  it("⚠️ O CASO QUE DISCRIMINA · nome de UMA palavra dá UMA inicial, e não a letra repetida", () => {
    expect(iniciaisDoNome("Ana")).toBe("A");
    // Se a regra repetisse a letra, os dois dariam `AA` e as duas contas ficariam indistinguíveis
    // na listagem — que é exatamente onde o avatar aparece lado a lado.
    expect(iniciaisDoNome("Ana")).not.toBe(iniciaisDoNome("Ana Paula"));
  });

  it("nome vazio, só espaço, nulo ou indefinido devolve vazio sem estourar", () => {
    expect(iniciaisDoNome("")).toBe("");
    expect(iniciaisDoNome("   ")).toBe("");
    expect(iniciaisDoNome(null)).toBe("");
    expect(iniciaisDoNome(undefined)).toBe("");
  });

  it("⚠️ nome só de ligação devolve vazio — não sobra parte para inicial nenhuma", () => {
    expect(iniciaisDoNome("de da do")).toBe("");
  });

  it("a saída é sempre maiúscula, venha o nome como vier", () => {
    expect(iniciaisDoNome("bernardo villas")).toBe("BV");
  });
});

/**
 * `RF-INSTR-15` — apresentação padronizada do nome de instrutor (`FR-012`).
 *
 * ⚠️ OS QUATRO CASOS SÃO O PORTE DOS CASOS DA SPEC 020 DA v2.0, e não invenção desta fatia. Lá o
 * algoritmo foi corrigido porque o destaque **falhava em silêncio** quando as palavras do nome de
 * guerra não eram contíguas — e falha silenciosa só se pega com o caso escrito.
 */
import { describe, expect, it } from "vitest";

import {
  fragmentosDoNome,
  nomeEmTexto,
  type InstrutorParaExibir,
} from "@/lib/dominio/nome-instrutor";

/** O texto de tudo que saiu em negrito, na ordem. */
const destacados = (i: InstrutorParaExibir) =>
  fragmentosDoNome(i)
    .filter((f) => f.destacado)
    .map((f) => f.texto);

const instrutor = (campos: Partial<InstrutorParaExibir>): InstrutorParaExibir => ({
  id: "INS-000001",
  pg: "CT",
  especialidade: "EF",
  nomeCompleto: "João da Silva Pereira",
  nomeDeGuerra: "Silva",
  ...campos,
});

describe("o formato — P/G Especialidade/Habilitação Nome COMPLETO", () => {
  it("traz o nome completo, não o nome de guerra", () => {
    // ⚠️ É O ACHADO P-1 VIRADO EM TESTE. A compressão para "P/G Especialidade Nome de Guerra"
    // circulou em três documentos e descarta o nome completo. Se alguém a reintroduzir, este caso
    // reprova antes de a tela existir.
    expect(nomeEmTexto(instrutor({}))).toBe("CT EF João da Silva Pereira");
  });

  it("sem especialidade, degrada SEM espaço duplo", () => {
    expect(nomeEmTexto(instrutor({ especialidade: null }))).toBe("CT João da Silva Pereira");
  });

  it("especialidade em branco vale o mesmo que ausente", () => {
    expect(nomeEmTexto(instrutor({ especialidade: "   " }))).toBe("CT João da Silva Pereira");
  });
});

describe("o destaque do nome de guerra — os quatro casos da spec 020", () => {
  it("1 · nome de guerra contíguo de duas palavras: duas marcações adjacentes", () => {
    // ⚠️ DUAS MARCAÇÕES, NÃO UMA, e isso foi decidido e aceito na spec 020: é consequência direta
    // do algoritmo por palavra, e é visualmente idêntico — as mesmas duas palavras em negrito,
    // lado a lado. Só a estrutura muda.
    const i = instrutor({
      nomeCompleto: "Bernardo Antônio Ricardo Nunes Guimarães",
      nomeDeGuerra: "Nunes Guimarães",
    });
    expect(destacados(i)).toEqual(["Nunes", "Guimarães"]);
  });

  it("2 · palavras NÃO contíguas: cada fragmento recebe destaque", () => {
    // É o defeito que a spec 020 existiu para corrigir. O algoritmo antigo exigia substring
    // contíguo e não destacava nada — sem erro, sem aviso.
    const i = instrutor({
      nomeCompleto: "Guilherme Pires Black Pereira",
      nomeDeGuerra: "Guilherme Black",
    });
    expect(destacados(i)).toEqual(["Guilherme", "Black"]);
  });

  it("3 · palavra sem correspondência: sem destaque e SEM exceção", () => {
    const i = instrutor({
      nomeCompleto: "Guilherme Pires Black Pereira",
      nomeDeGuerra: "Guilherme Wilson",
    });
    expect(() => fragmentosDoNome(i)).not.toThrow();
    expect(destacados(i)).toEqual(["Guilherme"]);
  });

  it("4 · sem nome de guerra: nada destacado, e nenhum espaço sobrando", () => {
    const i = instrutor({ nomeDeGuerra: null });
    expect(destacados(i)).toEqual([]);
    expect(nomeEmTexto(i)).toBe("CT EF João da Silva Pereira");
  });
});

describe("o que a fronteira de palavra tem de acertar", () => {
  it("nome ACENTUADO é destacado — a armadilha que custou a primeira implementação", () => {
    // ⚠️ `\b` do JavaScript é definido sobre `\w`, que é só ASCII: depois de um caractere acentuado
    // não há transição, logo não há fronteira, logo não há destaque. Num domínio de nomes
    // brasileiros isso é a maioria dos casos. A fronteira aqui é a Unicode.
    const i = instrutor({ nomeCompleto: "José Antônio Müller", nomeDeGuerra: "José" });
    expect(destacados(i)).toEqual(["José"]);
  });

  it("não destaca palavra DENTRO de outra palavra", () => {
    // "Ana" não pode acender dentro de "Anacleto" — é o efeito colateral que a busca por substring
    // cru teria, e o motivo de a spec 020 exigir delimitador de palavra.
    const i = instrutor({ nomeCompleto: "Anacleto Ribeiro", nomeDeGuerra: "Ana" });
    expect(destacados(i)).toEqual([]);
  });

  it("palavra repetida no nome completo: TODAS as ocorrências acendem", () => {
    const i = instrutor({ nomeCompleto: "Silva Souza Silva", nomeDeGuerra: "Silva" });
    expect(destacados(i)).toEqual(["Silva", "Silva"]);
  });

  it("caixa diferente não impede o destaque", () => {
    const i = instrutor({ nomeCompleto: "João da SILVA Pereira", nomeDeGuerra: "silva" });
    expect(destacados(i)).toEqual(["SILVA"]);
  });

  it("a capitalização do NOME COMPLETO é preservada, não a do nome de guerra", () => {
    // O que aparece na tela é o nome como está cadastrado. O nome de guerra só diz o que marcar.
    const i = instrutor({ nomeCompleto: "João da SILVA Pereira", nomeDeGuerra: "silva" });
    expect(nomeEmTexto(i)).toBe("CT EF João da SILVA Pereira");
  });

  it("espaço duplo no nome de guerra não gera palavra vazia", () => {
    const i = instrutor({
      nomeCompleto: "Guilherme Pires Black Pereira",
      nomeDeGuerra: "Guilherme  Black",
    });
    expect(destacados(i)).toEqual(["Guilherme", "Black"]);
  });

  it("caractere especial no nome de guerra não vira expressão regular", () => {
    // Sem escape, um parêntese ou um ponto quebraria a expressão — ou, pior, casaria demais.
    const i = instrutor({ nomeCompleto: "Ana D. Souza", nomeDeGuerra: "D." });
    expect(() => fragmentosDoNome(i)).not.toThrow();
    expect(destacados(i)).toEqual(["D."]);
  });
});

describe("a soma dos fragmentos é sempre o nome inteiro", () => {
  // ⚠️ A INVARIANTE QUE IMPEDE O PIOR DEFEITO POSSÍVEL: um erro de índice que engolisse um pedaço
  // do nome não seria notado por nenhum dos casos acima, porque todos olham só o que foi
  // destacado. Aqui o que se mede é que nada se perdeu pelo caminho.
  const casos: InstrutorParaExibir[] = [
    instrutor({}),
    instrutor({ nomeDeGuerra: null, especialidade: null }),
    instrutor({ nomeCompleto: "Silva Souza Silva", nomeDeGuerra: "Silva Souza" }),
    instrutor({ nomeCompleto: "Guilherme Pires Black Pereira", nomeDeGuerra: "Guilherme Black" }),
    instrutor({ nomeCompleto: "José Antônio Müller", nomeDeGuerra: "Müller José" }),
  ];

  it.each(casos)("reconstrói $nomeCompleto sem perder nem repetir", (i) => {
    const prefixo = [i.pg, i.especialidade?.trim()].filter(Boolean).join(" ");
    expect(nomeEmTexto(i)).toBe(`${prefixo} ${i.nomeCompleto}`);
  });
});

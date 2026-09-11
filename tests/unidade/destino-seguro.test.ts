/**
 * O destino de retorno após a autenticação (`FR-042`, `SC-019`).
 *
 * ⚠️ ESTE ARQUIVO EXISTE POR CAUSA DE UM DEFEITO REAL, encontrado em 11/09/2026 lendo código que já
 * estava mesclado na `main`. A guarda era `destino.startsWith("/")`, e o primeiro caso abaixo passa
 * por ela — **um endereço com duas barras começa com barra**.
 *
 * ⚠️ E O CONTROLE POSITIVO É METADE DO VALOR. Uma guarda que recusasse tudo passaria em todos os
 * casos hostis e quebraria o retorno legítimo, que é a única razão de o parâmetro existir.
 */
import { describe, expect, it } from "vitest";

import { caminhoDeRetorno, conferirDestino, DESTINO_PADRAO } from "@/lib/navegacao/destino-seguro";

const ORIGEM = "https://ciaara.exemplo";

describe("`FR-042` · destino para FORA da aplicação é recusado", () => {
  it("relativo ao protocolo — o caso que a guarda anterior deixava passar", () => {
    // ⚠️ `//outro-dominio` começa com barra, e o navegador o resolve para outro host mantendo só o
    // esquema. É a forma que funciona, e é a que ninguém testa.
    const r = conferirDestino("//ciaara-falso.exemplo", ORIGEM);
    expect(r.aceito).toBe(false);
    expect(r.aceito === false && r.motivo).toBe("externo");
  });

  it("com contrabarra — a mesma família, outra escrita", () => {
    const r = conferirDestino("/\\ciaara-falso.exemplo", ORIGEM);
    expect(r.aceito, "a contrabarra é normalizada para barra em endereço comum").toBe(false);
  });

  it("absoluto de outro domínio", () => {
    expect(conferirDestino("https://ciaara-falso.exemplo/inicio", ORIGEM).aceito).toBe(false);
  });

  it("esquema próprio não vira navegação", () => {
    // Resolve para origem nula, então cai na mesma comparação — sem precisar prever o esquema.
    expect(conferirDestino("javascript:alert(1)", ORIGEM).aceito).toBe(false);
  });

  it("o mesmo host em OUTRO esquema também é outra origem", () => {
    expect(conferirDestino("http://ciaara.exemplo/inicio", ORIGEM).aceito).toBe(false);
  });

  it("a recusa DIZ o motivo, em vez de devolver o padrão em silêncio", () => {
    // ⚠️ É por isso que o retorno é união discriminada: quem chama não consegue ignorar.
    const r = conferirDestino("//ciaara-falso.exemplo", ORIGEM);
    expect(r).toHaveProperty("motivo");
  });
});

describe("controle positivo · o retorno legítimo PRECISA passar", () => {
  it("caminho interno simples", () => {
    const r = conferirDestino("/inicio", ORIGEM);
    expect(r.aceito).toBe(true);
    expect(r.aceito === true && r.caminho).toBe("/inicio");
  });

  it("caminho interno COM os parâmetros — é o `FR-027` inteiro", () => {
    // ⚠️ Preservar os parâmetros através do login é o requisito; esta linha garante que a guarda
    // não os come pelo caminho.
    const r = conferirDestino("/turmas/TUR-000012/dsa?semana=12&ano=2026", ORIGEM);
    expect(r.aceito === true && r.caminho).toBe("/turmas/TUR-000012/dsa?semana=12&ano=2026");
  });

  it("absoluto da PRÓPRIA origem é aceito, e volta relativo", () => {
    const r = conferirDestino(`${ORIGEM}/instrutores?posto=CT`, ORIGEM);
    expect(r.aceito === true && r.caminho).toBe("/instrutores?posto=CT");
  });

  it("o fragmento sobrevive", () => {
    const r = conferirDestino("/estilo#contraste", ORIGEM);
    expect(r.aceito === true && r.caminho).toBe("/estilo#contraste");
  });
});

describe("ausência e lixo — nem ataque, nem descuido de link", () => {
  it.each([null, undefined, "", "   "])("%s não é destino, e é dito como tal", (entrada) => {
    const r = conferirDestino(entrada, ORIGEM);
    expect(r.aceito).toBe(false);
    expect(r.aceito === false && r.motivo).toBe("ausente");
  });

  it("`caminhoDeRetorno` devolve o padrão em qualquer recusa", () => {
    expect(caminhoDeRetorno("//ciaara-falso.exemplo", ORIGEM)).toBe(DESTINO_PADRAO);
    expect(caminhoDeRetorno(null, ORIGEM)).toBe(DESTINO_PADRAO);
    expect(caminhoDeRetorno("/inicio", ORIGEM)).toBe("/inicio");
  });
});

describe("a guarda antiga reprovaria aqui — e é o ponto", () => {
  it('`startsWith("/")` aceitaria o que esta função recusa', () => {
    /*
     * ⚠️ ESTE CASO NÃO TESTA O CÓDIGO NOVO: testa a PREMISSA do requisito. Ele registra, de forma
     * executável, por que a guarda anterior não bastava — e se algum dia alguém a repuser achando
     * que é equivalente, este caso mostra que não é.
     */
    const hostil = "//ciaara-falso.exemplo";
    expect(hostil.startsWith("/"), "a guarda antiga aceitava").toBe(true);
    expect(conferirDestino(hostil, ORIGEM).aceito, "a guarda nova recusa").toBe(false);
  });
});

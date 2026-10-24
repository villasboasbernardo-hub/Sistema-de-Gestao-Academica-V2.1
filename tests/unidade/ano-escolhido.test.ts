/**
 * O ano escolhido — RT-6 do Bloco 10 (spec 025, D-24 a D-27).
 *
 * > *"Seletor de ano aceita qualquer ano, padrão = ano da data atual, todos os módulos mostram só o ano selecionado,
 * > virada automática."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **TRÊS ORIGENS, NESTA ORDEM**: o `?ano=` do link, o ano guardado no navegador e o ano de hoje em São Paulo. O link
 *    vale mais que o guardado (um endereço compartilhado mostra o que diz), e o guardado mais que o relógio.
 * ⚠️ **QUALQUER ANO DO DOMÍNIO DO BANCO**: as colunas de ano aceitam de 2020 a 2099; fora disso o valor é descartado e a
 *    tela cai no padrão, como todo parâmetro fora do contrato (`RF-NAV-01`).
 */
import { describe, expect, it } from "vitest";

import {
  ANO_MAXIMO,
  ANO_MINIMO,
  anoDaTela,
  anoValido,
  curriculoDeReferencia,
  expiracaoDaEscolha,
  opcoesDeAno,
} from "@/lib/dominio/ano-escolhido";
import { COOKIE_DO_ANO, cookieDoAno } from "@/lib/navegacao/cookie-do-ano";

describe("RT-6 · o ano válido é o do domínio do banco", () => {
  it("aceita quatro dígitos entre o mínimo e o máximo", () => {
    expect(anoValido(String(ANO_MINIMO))).toBe(ANO_MINIMO);
    expect(anoValido(" 2031 ")).toBe(2031);
    expect(anoValido(String(ANO_MAXIMO))).toBe(ANO_MAXIMO);
  });

  it("recusa o que não é ano do banco", () => {
    expect(anoValido(String(ANO_MINIMO - 1))).toBeNull();
    expect(anoValido(String(ANO_MAXIMO + 1))).toBeNull();
    expect(anoValido("123")).toBeNull();
    expect(anoValido("20a6")).toBeNull();
    expect(anoValido("")).toBeNull();
    expect(anoValido(null)).toBeNull();
    expect(anoValido(undefined)).toBeNull();
  });
});

describe("RT-6 · a origem do ano da tela", () => {
  const hoje = "2026-10-24";

  it("sem link e sem escolha: o ano de hoje", () => {
    expect(anoDaTela("", undefined, hoje)).toEqual({ ano: 2026, origem: "hoje" });
  });

  it("a escolha guardada vale em todo módulo", () => {
    expect(anoDaTela("", "2027", hoje)).toEqual({ ano: 2027, origem: "guardado" });
  });

  it("o link vale mais que a escolha guardada", () => {
    expect(anoDaTela("2025", "2027", hoje)).toEqual({ ano: 2025, origem: "url" });
  });

  it("valor estragado no link ou no navegador cai no próximo da ordem", () => {
    expect(anoDaTela("abc", "2027", hoje)).toEqual({ ano: 2027, origem: "guardado" });
    expect(anoDaTela("", "lixo", hoje)).toEqual({ ano: 2026, origem: "hoje" });
    expect(anoDaTela("1999", "", hoje)).toEqual({ ano: 2026, origem: "hoje" });
  });

  it("guardado igual ao de hoje é o padrão, não uma escolha", () => {
    expect(anoDaTela("", "2026", hoje)).toEqual({ ano: 2026, origem: "hoje" });
  });
});

describe("RT-6 · as opções do seletor: qualquer ano, não só os que têm dado", () => {
  it("do mínimo do banco ao ano de hoje + 10, do mais novo ao mais velho", () => {
    const opcoes = opcoesDeAno(2026, 2026);
    expect(opcoes[0]).toBe(2036);
    expect(opcoes.at(-1)).toBe(ANO_MINIMO);
    expect(opcoes).toHaveLength(2036 - ANO_MINIMO + 1);
    expect(opcoes).toContain(2031);
  });

  it("o ano escolhido além da faixa entra, para o seletor mostrá-lo", () => {
    const opcoes = opcoesDeAno(2026, 2050);
    expect(opcoes[0]).toBe(2050);
    expect(new Set(opcoes).size).toBe(opcoes.length);
  });

  it("a faixa anda com o relógio: em 2027 vai até 2037", () => {
    expect(opcoesDeAno(2027, 2027)[0]).toBe(2037);
  });
});

describe("RT-6 · a escolha expira na virada do ano de São Paulo", () => {
  it("vale até 01/01 do ano seguinte à meia-noite de São Paulo (03:00 UTC)", () => {
    expect(expiracaoDaEscolha("2026-10-24").toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(expiracaoDaEscolha("2026-12-31").toISOString()).toBe("2027-01-01T03:00:00.000Z");
    expect(expiracaoDaEscolha("2027-01-01").toISOString()).toBe("2028-01-01T03:00:00.000Z");
  });
});

describe("D-24 · o cookie do ano vale em toda tela e some na virada", () => {
  const expira = new Date("2027-01-01T03:00:00.000Z");

  it("grava o ano com caminho raiz e a expiração da virada", () => {
    const linha = cookieDoAno(2027, expira, false);
    expect(linha).toContain(`${COOKIE_DO_ANO}=2027`);
    expect(linha).toContain("path=/");
    expect(linha).toContain("expires=Fri, 01 Jan 2027 03:00:00 GMT");
    expect(linha).not.toContain("secure");
  });

  it("escolher o ano de hoje apaga a escolha", () => {
    expect(cookieDoAno(null, expira, true)).toBe(
      `${COOKIE_DO_ANO}=; path=/; max-age=0; samesite=lax; secure`,
    );
  });
});

describe("D-27 · a data com que se escolhe o currículo vigente no ano", () => {
  it("no ano de hoje, hoje", () => {
    expect(curriculoDeReferencia(2026, "2026-10-24")).toBe("2026-10-24");
  });

  it("nos outros anos, 1º de janeiro do ano escolhido", () => {
    expect(curriculoDeReferencia(2027, "2026-10-24")).toBe("2027-01-01");
    expect(curriculoDeReferencia(2025, "2026-10-24")).toBe("2025-01-01");
  });
});

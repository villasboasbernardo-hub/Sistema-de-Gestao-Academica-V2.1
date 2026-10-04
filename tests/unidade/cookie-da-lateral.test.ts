/**
 * O cookie da lateral (`FR-005`, `FR-010` da spec 012; decisão `D-NAV-2`).
 *
 * ⚠️ **A GRAFIA DO COOKIE É CONTRATO, E CADA ATRIBUTO QUE FALTA FALHA DE UM JEITO DIFERENTE —
 * nenhum deles com erro na tela.** Sem `path=/`, fixar numa tela não vale na seguinte. Com `secure`
 * fixo, o navegador **descarta em silêncio** no `http://localhost` e o sintoma é *"fixar não funciona
 * nesta máquina"*. Sem `max-age`, a preferência morre ao fechar o navegador. São três defeitos que só
 * aparecem para quem usa, e por isso são medidos aqui.
 */
import { describe, expect, it } from "vitest";

import {
  COOKIE_DA_LATERAL,
  cookieDaLateral,
  LATERAL_FIXADA,
  LATERAL_RECOLHIDA,
  lateralFixadaNoCookie,
} from "@/lib/navegacao/lateral";

describe("`FR-010` · o estado inicial sai do cookie, e o padrão é o seguro", () => {
  it("só o valor exato de `fixada` liga a lateral", () => {
    expect(lateralFixadaNoCookie(LATERAL_FIXADA)).toBe(true);
    expect(lateralFixadaNoCookie(LATERAL_RECOLHIDA)).toBe(false);
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA: valor estragado NÃO abre a lateral de ninguém.** Uma leitura
   *    escrita como `valor !== "recolhida"` passaria nos dois casos acima e **reprovaria aqui** —
   *    cookie truncado, vazio ou de outra versão ligaria o estado expandido.
   */
  it.each([undefined, null, "", "FIXADA", "fixado", "1", "true", "recolhid"])(
    "`%s` vale recolhida",
    (valor) => {
      expect(lateralFixadaNoCookie(valor)).toBe(false);
    },
  );
});

describe("`FR-005` · a linha gravada no navegador", () => {
  it("fixada: nome, valor, caminho da raiz, validade longa e `samesite`", () => {
    const linha = cookieDaLateral(true, false);

    expect(linha).toContain(`${COOKIE_DA_LATERAL}=${LATERAL_FIXADA}`);
    expect(linha, "sem `path=/` a preferência não atravessa as telas").toContain("path=/");
    expect(linha, "sem validade a preferência morre ao fechar o navegador").toMatch(
      /max-age=\d{7,}/,
    );
    expect(linha).toContain("samesite=lax");
  });

  it("recolhida grava o valor contrário, e a volta é redonda", () => {
    const linha = cookieDaLateral(false, false);
    expect(linha).toContain(`${COOKIE_DA_LATERAL}=${LATERAL_RECOLHIDA}`);

    const valor = linha.split(";")[0]?.split("=")[1];
    expect(lateralFixadaNoCookie(valor)).toBe(false);
    expect(lateralFixadaNoCookie(cookieDaLateral(true, false).split(";")[0]?.split("=")[1])).toBe(
      true,
    );
  });

  it("⚠️ `secure` entra SÓ em conexão segura — fixá-lo mataria o cookie no desenvolvimento", () => {
    expect(cookieDaLateral(true, true)).toContain("secure");
    expect(
      cookieDaLateral(true, false),
      "`secure` em `http` faz o navegador descartar o cookie sem avisar",
    ).not.toContain("secure");
  });
});

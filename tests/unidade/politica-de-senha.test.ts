/**
 * `FR-031` e `FR-032` — a política de senha, e a frase que a explica.
 *
 * ⚠️ **O CASO QUE DISCRIMINA é a FRASE, não o veredito.** Uma política que devolvesse só
 * `true`/`false` passaria em quase tudo aqui — e a tela voltaria a mostrar *"inválida"*, ou pior, a
 * recusa da plataforma em inglês. O que este módulo entrega, e que o servidor não entrega, é a
 * explicação em português **antes** de a pessoa errar.
 *
 * ⚠️ **E ele NÃO é a garantia**: o mínimo real é o do servidor de autenticação, provado pelo caminho
 * de verdade em `tests/invariantes/rls/politica-de-senha.test.ts`. Aqui se prova a explicação.
 */
import { describe, expect, it } from "vitest";

import {
  COMPRIMENTO_DA_SENHA_GERADA,
  MINIMO_DE_CARACTERES,
  conferirConfirmacao,
  conferirSenha,
  regraDaSenhaEmPortugues,
} from "@/lib/dominio/politica-de-senha";

describe("`FR-031` · o mínimo, e a fronteira exata", () => {
  it("⚠️ o mínimo é 12 — o mesmo de `minimum_password_length` no `config.toml`", () => {
    expect(MINIMO_DE_CARACTERES).toBe(12);
  });

  it("11 caracteres é recusado e 12 é aceito — a fronteira, nos dois lados", () => {
    expect(conferirSenha("a".repeat(11)).aceita).toBe(false);
    expect(conferirSenha("a".repeat(12)).aceita).toBe(true);
  });

  it("⚠️ a senha GERADA nasce acima do mínimo, não nele", () => {
    expect(COMPRIMENTO_DA_SENHA_GERADA).toBeGreaterThan(MINIMO_DE_CARACTERES);
  });

  it("senha vazia, nula ou indefinida é recusada sem estourar", () => {
    for (const valor of ["", null, undefined]) {
      expect(conferirSenha(valor).aceita).toBe(false);
    }
  });

  it("⚠️ espaço nas pontas NÃO é cortado — espaço é caractere válido de senha", () => {
    // 12 caracteres, dois deles espaço. Cortar faria a tela aceitar algo que o servidor recebe
    // diferente do que a pessoa digitou.
    expect(conferirSenha(" senha1234 ").aceita).toBe(false); // 11 sem os espaços? não: tem 11
    expect(conferirSenha(" senha12345 ").aceita).toBe(true); // 12 contando os espaços
  });
});

describe("`FR-032` · O CASO QUE DISCRIMINA — a explicação, não só o veredito", () => {
  it("a recusa por tamanho traz a REGRA, e não a palavra `inválida`", () => {
    const veredito = conferirSenha("curta");
    expect(veredito.aceita).toBe(false);
    if (veredito.aceita) return;
    expect(veredito.motivo).toContain("12");
    expect(veredito.motivo.toLowerCase()).not.toContain("inválid");
  });

  it("⚠️ nenhuma recusa vem vazia — recusa sem motivo é a que a tela não sabe mostrar", () => {
    for (const valor of ["", "abc", null]) {
      const v = conferirSenha(valor);
      if (!v.aceita) expect(v.motivo.trim().length).toBeGreaterThan(0);
    }
  });

  it("a regra é dizível ANTES de a pessoa digitar", () => {
    expect(regraDaSenhaEmPortugues()).toContain("12");
  });

  it("⚠️ a explicação está em PORTUGUÊS — nada da recusa estrangeira da plataforma", () => {
    const veredito = conferirSenha("curta");
    if (veredito.aceita) return;
    expect(veredito.motivo).not.toMatch(/password|characters|should be/i);
  });
});

describe("`FR-030` · as duas digitações", () => {
  it("diferentes é recusado, e o motivo fala DISSO, não de tamanho", () => {
    const v = conferirConfirmacao("senha123456789", "senha987654321");
    expect(v.aceita).toBe(false);
    if (v.aceita) return;
    expect(v.motivo).toContain("coincidem");
    expect(v.motivo).not.toContain("12");
  });

  it("⚠️ a divergência é conferida ANTES do tamanho — quem errou a segunda precisa saber disso", () => {
    // As duas são curtas E diferentes. O motivo tem de ser a divergência.
    const v = conferirConfirmacao("abc", "xyz");
    if (v.aceita) return;
    expect(v.motivo).toContain("coincidem");
  });

  it("iguais e válidas é aceito; iguais e curtas cai na regra de tamanho", () => {
    expect(conferirConfirmacao("senha12345678", "senha12345678").aceita).toBe(true);
    const curta = conferirConfirmacao("abcabc", "abcabc");
    expect(curta.aceita).toBe(false);
    if (!curta.aceita) expect(curta.motivo).toContain("12");
  });
});

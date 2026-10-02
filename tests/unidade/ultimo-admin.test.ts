/**
 * `FR-041` a `FR-043` · a regra do último Admin e a da própria conta.
 *
 * ⚠️ **O CASO QUE DISCRIMINA É O PAR DE CONTAGENS**: com **um** Admin ativo as três ações são
 * recusadas; com **dois**, as três são permitidas. Um teste só com um Admin daria o mesmo veredito
 * se a função recusasse **sempre** — e um só com dois, se ela permitisse sempre.
 *
 * ⚠️ **E HÁ UM SEGUNDO CASO QUE DISCRIMINA, o de `rebaixar`:** ele é a ação que uma regra escrita
 * sobre `status` deixaria passar, porque rebaixar não desativa ninguém — deixa a conta ativa e o
 * sistema sem Admin.
 */
import { describe, expect, it } from "vitest";

import {
  type AcaoSobreAdmin,
  podeMexerNaPropriaConta,
  podeMexerNoAdmin,
  vereditoSobreConta,
} from "@/lib/dominio/ultimo-admin";

const AS_TRES: readonly AcaoSobreAdmin[] = ["rebaixar", "desativar", "excluir"];

const EU = "11111111-1111-1111-1111-111111111111";
const OUTRO_ADMIN = "22222222-2222-2222-2222-222222222222";
const OPERADOR = "33333333-3333-3333-3333-333333333333";

describe("`FR-042` · pelo menos um Admin ativo", () => {
  it("⚠️ O CASO QUE DISCRIMINA · com UM admin ativo, as três ações sobre ele são recusadas", () => {
    for (const acao of AS_TRES) {
      const veredito = podeMexerNoAdmin(acao, EU, [{ id: EU }]);
      expect(veredito.permitido, `\`${acao}\` passou com um admin só`).toBe(false);
      if (!veredito.permitido) {
        // A frase diz O QUE FAZER, não só que não deu — é o que separa explicar de castigar.
        expect(veredito.motivo).toContain("último Administrador ativo");
        expect(veredito.motivo).toContain("Promova outra conta");
      }
    }
  });

  it("⚠️ O CASO QUE DISCRIMINA · com DOIS admins ativos, as três são permitidas", () => {
    for (const acao of AS_TRES) {
      expect(
        podeMexerNoAdmin(acao, EU, [{ id: EU }, { id: OUTRO_ADMIN }]).permitido,
        `\`${acao}\` foi barrada com dois admins`,
      ).toBe(true);
    }
  });

  it("conta que NÃO é admin ativo não tem nada a proteger — a regra não se aplica", () => {
    for (const acao of AS_TRES) {
      expect(podeMexerNoAdmin(acao, OPERADOR, [{ id: EU }]).permitido).toBe(true);
    }
  });

  it("lista vazia de admins: a conta alvo não está nela, então a regra não bloqueia", () => {
    // ⚠️ Zero admins ativos é estado que o gatilho do banco não deixa acontecer. Se acontecer, esta
    //    função não é o lugar de consertar — e travar tudo aqui impediria a tela de PROMOVER alguém.
    expect(podeMexerNoAdmin("rebaixar", EU, []).permitido).toBe(true);
  });
});

describe("`FR-041` · ninguém mexe na própria conta", () => {
  it("as três ações sobre a própria conta são recusadas", () => {
    for (const acao of AS_TRES) {
      const veredito = podeMexerNaPropriaConta(acao, EU, EU);
      expect(veredito.permitido, `\`${acao}\` passou sobre a própria conta`).toBe(false);
      if (!veredito.permitido) expect(veredito.motivo).toContain("sua própria conta");
    }
  });

  it("sobre outra conta, ela não opina", () => {
    for (const acao of AS_TRES) {
      expect(podeMexerNaPropriaConta(acao, OUTRO_ADMIN, EU).permitido).toBe(true);
    }
  });

  it("⚠️ O CASO QUE DISCRIMINA das DUAS regras · com dois admins, a própria conta AINDA é intocável", () => {
    const adminsAtivos = [{ id: EU }, { id: OUTRO_ADMIN }];

    // A contagem da FR-042 libera...
    expect(podeMexerNoAdmin("rebaixar", EU, adminsAtivos).permitido).toBe(true);
    // ...e a FR-041 continua proibindo. Sem este caso, confundir as duas abriria o buraco de um
    // Admin se despromovendo por engano.
    const veredito = vereditoSobreConta("rebaixar", EU, EU, adminsAtivos);
    expect(veredito.permitido).toBe(false);
    if (!veredito.permitido) expect(veredito.motivo).toContain("sua própria conta");
  });

  it("⚠️ a ordem das duas regras é a que dá a frase ACIONÁVEL", () => {
    // Admin único tentando se rebaixar viola as duas. A frase útil é a da própria conta: mandar
    // promover alguém o deixaria fazer uma promoção para seguir não podendo se rebaixar.
    const veredito = vereditoSobreConta("rebaixar", EU, EU, [{ id: EU }]);
    expect(veredito.permitido).toBe(false);
    if (!veredito.permitido) {
      expect(veredito.motivo).toContain("sua própria conta");
      expect(veredito.motivo).not.toContain("último Administrador");
    }
  });

  it("o veredito combinado permite o caminho legítimo: outro admin, havendo dois", () => {
    expect(
      vereditoSobreConta("desativar", OUTRO_ADMIN, EU, [{ id: EU }, { id: OUTRO_ADMIN }]).permitido,
    ).toBe(true);
  });
});

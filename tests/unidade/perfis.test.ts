/**
 * `FR-005` e `FR-040.1` — os nove perfis em português, agrupados por divisão (D-1).
 *
 * ⚠️ **A GUARDA VALE NOS DOIS SENTIDOS, e só uma delas o compilador dá.** `Record<Perfil, …>` já
 * impede **perfil no enum e sem rótulo**: acrescentar um valor ao banco e regenerar o contrato faz
 * o módulo parar de compilar. O que ele **não** pega é o contrário — perfil **removido do enum** e
 * deixado aqui, que ficaria traduzido para sempre, sem erro em lugar nenhum.
 *
 * ⚠️ **A lista do enum é lida do contrato GERADO**, `Constants.public.Enums`, nunca escrita à mão:
 * lista à mão envelhece exatamente quando o enum muda, que é o único momento em que ela importa.
 */
import { describe, expect, it } from "vitest";

import {
  DIVISOES,
  divisaoDoPerfil,
  perfisDeclarados,
  perfisPorDivisao,
  rotuloDoPerfil,
  type Perfil,
} from "@/lib/dominio/perfis";
import { Constants } from "@/lib/tipos/database";

const NO_ENUM = Constants.public.Enums.perfil_usuario;

describe("`FR-005` · os perfis declarados e o enum do banco não divergem", () => {
  it("há nove perfis no enum — controle positivo, para a varredura não medir uma lista vazia", () => {
    expect(NO_ENUM.length).toBe(9);
  });

  it("todo perfil do enum tem rótulo declarado", () => {
    const semRotulo = NO_ENUM.filter((p) => !perfisDeclarados().includes(p));
    expect(
      semRotulo,
      `perfil no enum e sem rótulo: ${semRotulo.join(", ")}. Acrescente em lib/dominio/perfis.ts.`,
    ).toEqual([]);
  });

  it("⚠️ e todo perfil declarado ainda existe no enum — é o sentido que o compilador NÃO pega", () => {
    const sumidos = perfisDeclarados().filter((p) => !NO_ENUM.includes(p));
    expect(
      sumidos,
      `declarado e fora do enum: ${sumidos.join(", ")}. Ele foi removido do banco e ficaria ` +
        `traduzido para sempre.`,
    ).toEqual([]);
  });
});

describe("`FR-005` · o rótulo em português", () => {
  it("traduz o valor cru que hoje aparece no cabeçalho", () => {
    expect(rotuloDoPerfil("encarregado_administracao_academica")).toBe(
      "Encarregado da Administração Acadêmica",
    );
    expect(rotuloDoPerfil("admin")).toBe("Administrador do sistema");
  });

  it("⚠️ nenhum rótulo é o próprio valor cru — senão a tradução existiria sem traduzir", () => {
    const naoTraduzidos = perfisDeclarados().filter((p) => rotuloDoPerfil(p) === p);
    expect(naoTraduzidos).toEqual([]);
  });

  it("⚠️ nenhum rótulo tem sublinhado — é o sinal de que o valor do banco vazou para a tela", () => {
    const comSublinhado = perfisDeclarados().filter((p) => rotuloDoPerfil(p).includes("_"));
    expect(comSublinhado).toEqual([]);
  });

  it("valor desconhecido volta como veio, e nulo vira travessão (`RN-DEG-01`)", () => {
    expect(rotuloDoPerfil("perfil_que_nao_existe")).toBe("perfil_que_nao_existe");
    expect(rotuloDoPerfil(null)).toBe("—");
    expect(rotuloDoPerfil(undefined)).toBe("—");
    expect(rotuloDoPerfil("")).toBe("—");
  });
});

describe("`FR-040.1` · o agrupamento por divisão", () => {
  it("os nove aparecem no agrupamento, sem sobrar nem faltar", () => {
    const agrupados = perfisPorDivisao().flatMap((g) => g.perfis.map((p) => p.valor));
    expect(agrupados.length).toBe(9);
    expect([...agrupados].sort()).toEqual([...NO_ENUM].sort());
  });

  it("⚠️ nenhum perfil aparece em duas divisões — a escolha ficaria ambígua", () => {
    const agrupados = perfisPorDivisao().flatMap((g) => g.perfis.map((p) => p.valor));
    expect(new Set(agrupados).size).toBe(agrupados.length);
  });

  it("as divisões saem na ordem declarada, e nenhuma vem vazia", () => {
    const divisoes = perfisPorDivisao().map((g) => g.divisao);
    expect(divisoes).toEqual(DIVISOES.filter((d) => divisoes.includes(d)));
    expect(perfisPorDivisao().every((g) => g.perfis.length > 0)).toBe(true);
  });

  it("⚠️ `admin` fica na divisão TÉCNICO — ele é papel técnico, sem cargo regimental", () => {
    expect(divisaoDoPerfil("admin" satisfies Perfil)).toBe("Técnico");
  });

  it("os dois da CIAARA-11 ficam juntos", () => {
    const grupo = perfisPorDivisao().find((g) => g.divisao.startsWith("CIAARA-11"));
    expect(grupo?.perfis.map((p) => p.valor).sort()).toEqual([
      "ajudante_administracao_academica",
      "encarregado_administracao_academica",
    ]);
  });
});

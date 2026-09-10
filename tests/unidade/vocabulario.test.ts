/**
 * Invariantes do vocabulário visual (`FR-001` a `FR-003`, `SC-002`, `SC-010`).
 *
 * ⚠️ ESTAS SÃO AS INVARIANTES DESTA FATIA, e fazem aqui o papel que o pgTAP e a RLS fizeram nos
 * Épicos 1 a 3: dizem o que NÃO PODE acontecer, e reprovam quando acontece. Uma fatia sem regra de
 * negócio e sem banco continua tendo o que provar.
 */
import { describe, expect, it } from "vitest";

import { claro, escuro, exposicao, papeisDeCor } from "@/lib/design/ler-globals";
import { PAPEIS, RECONCILIACAO } from "@/lib/design/vocabulario";

describe("I-1 · todo papel existe nos DOIS temas", () => {
  it("nenhum papel do tema claro falta no noturno", () => {
    const faltando = [...papeisDeCor(claro()).keys()].filter((n) => !escuro().has(n));
    expect(
      faltando,
      `papéis declarados só no tema claro — congelariam no escuro: ${faltando.join(", ")}`,
    ).toEqual([]);
  });

  it("nenhum papel do noturno falta no claro", () => {
    const faltando = [...papeisDeCor(escuro()).keys()].filter((n) => !claro().has(n));
    expect(faltando, `papéis declarados só no noturno: ${faltando.join(", ")}`).toEqual([]);
  });
});

describe("I-1b · o arquivo e a lista fechada não divergem", () => {
  it("todo papel da lista existe no ponto único", () => {
    const noArquivo = claro();
    const ausentes = PAPEIS.filter((n) => !noArquivo.has(n));
    expect(
      ausentes,
      `a lista de tests/unidade/vocabulario.fixture.ts promete papéis que app/globals.css não ` +
        `declara: ${ausentes.join(", ")}`,
    ).toEqual([]);
  });

  it("todo papel do ponto único está na lista — senão entraria sem ser auditado", () => {
    const sobrando = [...papeisDeCor(claro()).keys()].filter((n) => !PAPEIS.includes(n));
    expect(
      sobrando,
      `app/globals.css declara papéis que a lista não conhece, e por isso NÃO SÃO AUDITADOS: ` +
        `${sobrando.join(", ")}. Acrescente-os a vocabulario.fixture.ts e à vitrine.`,
    ).toEqual([]);
  });

  it("todo papel é exposto como utilitário — senão não chega a nenhuma tela", () => {
    const exposto = exposicao();
    const naoExpostos = PAPEIS.filter((n) => !exposto.has(`color-${n}`));
    expect(
      naoExpostos,
      `papéis sem \`--color-…\` no bloco de exposição: ${naoExpostos.join(", ")}. ` +
        `Sem isso o utilitário não existe, e quem precisar da cor vai escrevê-la à mão.`,
    ).toEqual([]);
  });
});

describe("I-4 · nenhuma variável de terceiro sem par (`SC-010`)", () => {
  it("toda variável do de-para aponta para um papel que existe", () => {
    const papeis = new Set(PAPEIS);
    const orfas = Object.entries(RECONCILIACAO)
      .filter(([, destino]) => !papeis.has(destino))
      .map(([origem, destino]) => `${origem} → ${destino}`);
    expect(orfas, `o de-para aponta para papel inexistente: ${orfas.join(", ")}`).toEqual([]);
  });

  it("`destructive` aponta para conflito, NÃO para atrasado", () => {
    // ⚠️ Vermelho é conflito, que exige ação; amarelo é aviso de atraso. Trocar os dois não
    // acusaria erro nenhum e faria um botão de desativar parecer aviso de atraso.
    expect(RECONCILIACAO["destructive"]).toBe("conflito-tinta");
  });
});

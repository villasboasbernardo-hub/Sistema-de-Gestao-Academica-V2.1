/**
 * Auditoria de contraste AA (`FR-011`, `FR-012`, `SC-005`).
 *
 * ⚠️ ELA PERCORRE A LISTA FECHADA, NÃO O ARQUIVO DE ESTILO. Se lesse o arquivo, um par novo
 * entraria sem ser auditado e ninguém saberia. A parceria com `vocabulario.test.ts` é o que fecha:
 * lá se prova que arquivo e lista não divergem; aqui se mede o que a lista promete.
 *
 * ⚠️ A FALHA NOMEIA O PAR E A RAZÃO OBSERVADA. Verificação que diz só "reprovou" obriga a refazer
 * a conta à mão para descobrir onde — é a lição do CHK008 da spec 004.
 */
import { describe, expect, it } from "vitest";

import { claro, escuro } from "@/lib/design/ler-globals";
import { ISENTOS, PARES, PENDENTES, razao } from "@/lib/design/vocabulario";

const TEMAS = [
  { nome: "claro", papeis: claro() },
  { nome: "noturno", papeis: escuro() },
] as const;

describe.each(TEMAS)("contraste AA — tema $nome", ({ nome, papeis }) => {
  it.each(PARES)("$id · $frente sobre $fundo — $proposito", (par) => {
    const frente = papeis.get(par.frente);
    const fundo = papeis.get(par.fundo);

    expect(frente, `token \`--${par.frente}\` ausente no tema ${nome}`).toBeDefined();
    expect(fundo, `token \`--${par.fundo}\` ausente no tema ${nome}`).toBeDefined();

    const medida = razao(frente as string, fundo as string);

    // ⚠️ UMA CASA DECIMAL, por decisão de Bernardo de 09/09/2026: `--texto-tenue` mede 4,49 e
    // passa. Meio centésimo não é diferença que olho algum distinga, e limite que reprova por isso
    // vira ruído — que é como limite acaba desligado.
    expect(
      Number(medida.toFixed(1)),
      `${par.id} REPROVA no tema ${nome}: \`--${par.frente}\` (${frente}) sobre ` +
        `\`--${par.fundo}\` (${fundo}) mede ${medida.toFixed(2)}:1, e o limite é ` +
        `${par.limite}:1. Ajuste o token em app/globals.css — não o limite.`,
    ).toBeGreaterThanOrEqual(par.limite);
  });
});

describe("as isenções são declaradas, não presumidas (`SC-005`)", () => {
  // ⚠️ Isenção sem motivo escrito é a mesma coisa que limite afrouxado em silêncio. Este teste
  // existe para que a diferença continue existindo depois que ninguém lembrar da conversa.
  it.each(ISENTOS)("$id · $par — isento com motivo", (isento) => {
    expect(isento.motivo.length, `${isento.id} está isento sem motivo escrito`).toBeGreaterThan(40);
  });

  it("nenhum par isento aparece também entre os auditados", () => {
    const auditados = new Set(PARES.map((p) => p.id));
    const duplos = ISENTOS.filter((i) => auditados.has(i.id)).map((i) => i.id);
    expect(duplos, `pares em duas categorias ao mesmo tempo: ${duplos.join(", ")}`).toEqual([]);
  });
});

describe("os pendentes continuam visíveis — não viraram isentos", () => {
  // ⚠️ A categoria existe para que `--borda-forte` NÃO seja chamada de decorativa. Ela é o traço
  // que identifica um campo, e o campo é das fatias (b) e (c). Este teste é o lembrete que
  // sobrevive à sessão em que a decisão foi tomada.
  it.each(PENDENTES)("$id · $par — pendente, resolve em: $resolve", (p) => {
    expect(p.medido, `${p.id} pendente sem medição registrada`).toMatch(/\d/);
    expect(p.resolve.length, `${p.id} pendente sem dono`).toBeGreaterThan(10);
  });
});

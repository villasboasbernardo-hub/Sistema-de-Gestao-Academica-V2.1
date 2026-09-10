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

import { claro, escuro } from "./ler-globals";
import { PARES } from "./vocabulario.fixture";

/** Luminância relativa da sRGB, conforme a WCAG 2.x. */
function luminancia(hex: string): number {
  const n = hex.replace("#", "");
  const largo = n.length === 3 ? [...n].map((c) => c + c).join("") : n;
  const canais = [0, 2, 4].map((i) => parseInt(largo.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

/** Razão de contraste entre duas cores, de 1:1 a 21:1. */
export function razao(frente: string, fundo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const [claro_, escuro_] = a > b ? [a, b] : [b, a];
  return ((claro_ as number) + 0.05) / ((escuro_ as number) + 0.05);
}

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

    expect(
      Number(medida.toFixed(2)),
      `${par.id} REPROVA no tema ${nome}: \`--${par.frente}\` (${frente}) sobre ` +
        `\`--${par.fundo}\` (${fundo}) mede ${medida.toFixed(2)}:1, e o limite é ` +
        `${par.limite}:1. Ajuste o token em app/globals.css — não o limite.`,
    ).toBeGreaterThanOrEqual(par.limite);
  });
});

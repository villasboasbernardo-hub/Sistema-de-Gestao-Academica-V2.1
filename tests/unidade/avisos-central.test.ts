/**
 * Spec 022 (Bloco 7), FR-004 — a central de avisos: chave estável, módulos, agrupamento e "não visto".
 *
 * > *"SININHO DE AVISOS no cabeçalho (…): número de avisos, pulso sutil (…) enquanto houver aviso não visto (…), para
 * > ao abrir; volta só com aviso novo ("visto" no navegador, sem banco). Clique leva a uma página só de avisos,
 * > agrupados por módulo, cada um com link para onde se resolve."* — Bernardo Villas Boas, 22/10/2026
 */
import { describe, expect, it } from "vitest";

import {
  agruparPorModulo,
  chaveDoAviso,
  haAvisoNovo,
  juntarVistas,
  naoVistos,
  rotuloDoSininho,
  type Aviso,
} from "@/lib/dominio/avisos/central";

const aviso = (modulo: Aviso["modulo"], tipo: string, sujeito: string): Aviso => ({
  chave: chaveDoAviso(modulo, tipo, sujeito),
  modulo,
  titulo: `${tipo} ${sujeito}`,
  detalhe: null,
  destino: `/x/${sujeito}`,
});

describe("chaveDoAviso", () => {
  it("é módulo:tipo:sujeito — a mesma para o mesmo aviso, outra para outro sujeito", () => {
    expect(chaveDoAviso("turmas", "sem_janela", "CAHO 2026")).toBe("turmas:sem_janela:CAHO 2026");
    expect(chaveDoAviso("turmas", "sem_janela", "CAHO 2026")).not.toBe(
      chaveDoAviso("turmas", "sem_janela", "CAHO 2027"),
    );
  });
});

describe("agruparPorModulo", () => {
  it("na ordem dos módulos, só os que têm aviso, mantendo a ordem de chegada dentro de cada um", () => {
    const grupos = agruparPorModulo([
      aviso("instrutores", "sem_nip", "12"),
      aviso("cursos", "sem_proposito", "CAHO"),
      aviso("instrutores", "sem_nip", "3"),
      aviso("turmas", "sem_janela", "C-Ap-FR 2026"),
    ]);
    expect(grupos.map((g) => g.modulo)).toEqual(["cursos", "turmas", "instrutores"]);
    expect(grupos.map((g) => g.rotulo)).toEqual(["Cursos", "Turmas", "Instrutores"]);
    expect(grupos[2]?.avisos.map((a) => a.chave)).toEqual([
      "instrutores:sem_nip:12",
      "instrutores:sem_nip:3",
    ]);
  });

  it("sem aviso, nenhum grupo", () => {
    expect(agruparPorModulo([])).toEqual([]);
  });
});

describe("não visto", () => {
  it("o que está no resumo e não está entre as vistas", () => {
    expect(naoVistos(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
    expect(haAvisoNovo(["a", "b"], ["a", "b", "z"])).toBe(false);
    expect(haAvisoNovo(["a", "b"], ["a"])).toBe(true);
  });

  it("aviso que se resolveu e voltou é novo de novo só se saiu das vistas — as vistas guardam as últimas chaves", () => {
    const vistas = juntarVistas(["a", "b"], ["c"], 3);
    expect(vistas).toEqual(["a", "b", "c"]);
    expect(juntarVistas(vistas, ["d"], 3)).toEqual(["b", "c", "d"]);
    // Repetir a chave não duplica.
    expect(juntarVistas(["a", "b"], ["a"], 3)).toEqual(["b", "a"]);
  });
});

describe("rotuloDoSininho", () => {
  it("diz o número e se há aviso novo — o pulso nunca é a única via", () => {
    expect(rotuloDoSininho(0, false)).toBe("Avisos: nenhum");
    expect(rotuloDoSininho(1, false)).toBe("Avisos: 1");
    expect(rotuloDoSininho(7, true)).toBe("Avisos: 7, com aviso novo");
  });
});

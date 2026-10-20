/**
 * Spec 018 (Bloco 3), FR-002 — **o curso não mostra acompanhamento de turma em aba nenhuma**.
 *
 * > *"O curso NÃO mostra acompanhamento de turma em aba nenhuma: só o previsto no currículo. Achado do Bloco 2: a
 * > aba Avaliações do curso mostra o cumprido da turma — tirar."* — Bernardo Villas Boas, 19/10/2026
 *
 * ⚠️ **A GUARDA LÊ O CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): o cabeçalho da aba EXPLICA que o cumprido saiu, e contar
 *    a explicação como uso ensinaria a apagar a documentação.
 * ⚠️ **O CASO QUE DISCRIMINA** é a versão de antes: ela reaproveitava `AvaliacoesDaTurma` (o quadro da ficha, com o
 *    *"X de Y aplicadas"*, a situação e a projeção) e lia com a turma da Grade. As duas formas reprovam aqui.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const PASTA = resolve(process.cwd(), "app/(app)/cursos/[curso]");

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

const ler = (arquivo: string) => semComentario(readFileSync(resolve(PASTA, arquivo), "utf8"));

describe("FR-002 da spec 018 · a aba Avaliações do curso é só o previsto", () => {
  it("não reaproveita o quadro da TURMA nem desenha cumprido, situação ou projeção", () => {
    const aba = ler("AbaAvaliacoes.tsx");
    expect(aba, "a aba voltou a montar o quadro da ficha da turma").not.toMatch(
      /AvaliacoesDaTurma/,
    );
    for (const marca of ["aplicadas", "projecao", "semItem", "Situacao", "alemDoPrevisto"]) {
      expect(
        aba,
        `a aba do curso voltou a desenhar «${marca}», que é acompanhamento de turma`,
      ).not.toContain(marca);
    }
  });

  it("a página lê as avaliações do curso SEM turma", () => {
    const pagina = ler("page.tsx");
    const chamadas = [...pagina.matchAll(/lerAvaliacoesDoCurso\(\{([^}]*)\}/g)].map(
      (m) => m[1] ?? "",
    );
    expect(chamadas, "a página deixou de ler as avaliações do curso").not.toHaveLength(0);
    for (const c of chamadas)
      expect(c, "a leitura do curso voltou a pedir uma turma").toMatch(/turmaCodigo:\s*null/);
  });

  it("controle positivo: a aba da TURMA continua desenhando o cumprido (a varredura enxerga)", () => {
    const daTurma = semComentario(
      readFileSync(
        resolve(process.cwd(), "app/(app)/turmas/[turma]/AvaliacoesDaTurma.tsx"),
        "utf8",
      ),
    );
    expect(daTurma).toContain("aplicadas");
    expect(daTurma).toContain("projecao");
  });
});

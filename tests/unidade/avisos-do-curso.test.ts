/**
 * `FR-010` · os avisos de qualidade de cadastro do curso — **lista aberta**, nenhum bloqueia.
 *
 * ⚠️ **TIPO COM CONTAGEM ZERO NÃO APARECE.** O quadro do curso mostra só o que de fato ocorre; sem
 * aviso nenhum, ele diz isso em vez de ficar vazio (`FR-010`).
 *
 * Retrato da base, medido em 16/09/2026: `sem_duracao_semanas` **12**, `sem_proposito` **10**,
 * `acima_do_limite` **0**.
 *
 * Origem: `FR-010` da spec 009, `SC-014`, contrato de escritas §3.
 */
import { describe, expect, it } from "vitest";

import { avisosDoCurso, type CursoParaAvisos } from "@/lib/dominio/avisos-do-curso";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";

const curso = (p: Partial<CursoParaAvisos> = {}): CursoParaAvisos => ({
  duracaoSemanas: 24,
  proposito: "Habilitar a exercer a função prevista.",
  limiteTurmasAno: 2,
  ...p,
});

const t = (ano: number, status: string): TurmaParaLimite => ({ ano, status });
const chaves = (avisos: readonly { chave: string }[]) => avisos.map((a) => a.chave);

describe("`FR-010` · curso completo não gera aviso nenhum", () => {
  it("nada a avisar", () => {
    expect(avisosDoCurso(curso(), [t(2026, "ativa")])).toEqual([]);
  });
});

describe("`sem_duracao_semanas`", () => {
  it("dispara com a duração em semanas vazia", () => {
    expect(chaves(avisosDoCurso(curso({ duracaoSemanas: null }), []))).toContain(
      "sem_duracao_semanas",
    );
  });

  it("⚠️ não dispara com duração informada, nem com zero — zero é valor, não ausência", () => {
    expect(chaves(avisosDoCurso(curso({ duracaoSemanas: 24 }), []))).not.toContain(
      "sem_duracao_semanas",
    );
    expect(chaves(avisosDoCurso(curso({ duracaoSemanas: 0 }), []))).not.toContain(
      "sem_duracao_semanas",
    );
  });
});

describe("`sem_proposito`", () => {
  it("dispara com o propósito vazio", () => {
    expect(chaves(avisosDoCurso(curso({ proposito: null }), []))).toContain("sem_proposito");
    expect(chaves(avisosDoCurso(curso({ proposito: "" }), []))).toContain("sem_proposito");
  });

  it("⚠️ e dispara também com SÓ ESPAÇOS — o contrato é explícito", () => {
    // Um campo com três espaços parece preenchido em toda listagem e não diz nada a ninguém.
    expect(chaves(avisosDoCurso(curso({ proposito: "   " }), []))).toContain("sem_proposito");
  });
});

describe("`acima_do_limite`", () => {
  it("dispara por ano, com a mensagem do quadro", () => {
    const avisos = avisosDoCurso(curso({ limiteTurmasAno: 1 }), [
      t(2026, "ativa"),
      t(2026, "planejada"),
      t(2027, "ativa"),
    ]);
    const acima = avisos.filter((a) => a.chave === "acima_do_limite");
    expect(acima).toHaveLength(1);
    expect(acima[0]?.detalhe).toBe("2026: 2 turmas, limite 1");
  });

  it("um aviso por ano afetado", () => {
    const avisos = avisosDoCurso(curso({ limiteTurmasAno: 1 }), [
      t(2026, "ativa"),
      t(2026, "ativa"),
      t(2027, "ativa"),
      t(2027, "ativa"),
    ]);
    expect(avisos.filter((a) => a.chave === "acima_do_limite")).toHaveLength(2);
  });

  it("⚠️ turma cancelada não empurra o curso acima do limite", () => {
    const avisos = avisosDoCurso(curso({ limiteTurmasAno: 1 }), [
      t(2026, "ativa"),
      t(2026, "cancelada"),
    ]);
    expect(chaves(avisos)).not.toContain("acima_do_limite");
  });

  it("curso sem limite informado nunca fica acima dele", () => {
    const avisos = avisosDoCurso(curso({ limiteTurmasAno: null }), [
      t(2026, "ativa"),
      t(2026, "ativa"),
    ]);
    expect(chaves(avisos)).not.toContain("acima_do_limite");
  });
});

describe("⚠️ a lista é ABERTA, mas o que sai dela é só o que ocorre", () => {
  it("os três tipos podem sair juntos", () => {
    const avisos = avisosDoCurso(
      curso({ duracaoSemanas: null, proposito: " ", limiteTurmasAno: 1 }),
      [t(2026, "ativa"), t(2026, "ativa")],
    );
    expect(chaves(avisos)).toEqual(["sem_duracao_semanas", "sem_proposito", "acima_do_limite"]);
  });

  it("todo aviso tem título legível — o quadro mostra o título, não a chave", () => {
    const avisos = avisosDoCurso(curso({ duracaoSemanas: null, proposito: null }), []);
    for (const a of avisos) {
      expect(a.titulo.length).toBeGreaterThan(5);
      expect(a.titulo).not.toContain("_");
    }
  });
});

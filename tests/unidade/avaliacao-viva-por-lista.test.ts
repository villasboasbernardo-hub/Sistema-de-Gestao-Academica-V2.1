/**
 * `FR-048` (spec 014) — toda leitura de avaliação viva usa a LISTA POSITIVA de status.
 *
 * ⚠️ Varre `app/`, `lib/` e `components/` SEM COMENTÁRIO (regra 9.1.1) e reprova `neq("status",
 *    "cancelada")` em qualquer arquivo que leia `avaliacoes`. Com controle positivo: a lista nova tem de
 *    ser encontrada, e a varredura acusa o filtro antigo numa fonte sintética.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { STATUS_DE_AVALIACAO_VIVA } from "@/lib/dominio/avaliacao-viva";

const RAIZ = process.cwd();
const ANTIGO = /\.neq\(\s*["']status["']\s*,\s*["']cancelada["']\s*\)/;

function fontes(pasta: string): string[] {
  return readdirSync(resolve(RAIZ, pasta)).flatMap((nome) => {
    const completo = join(resolve(RAIZ, pasta), nome);
    if (statSync(completo).isDirectory()) return fontes(relative(RAIZ, completo));
    return /\.(ts|tsx)$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

const semComentario = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const arquivos = () =>
  ["app", "lib", "components"].flatMap(fontes).map((caminho) => ({
    caminho,
    codigo: semComentario(readFileSync(resolve(RAIZ, caminho), "utf8")),
  }));

describe("avaliação viva por lista positiva (FR-048)", () => {
  it("a lista é exatamente os quatro status vivos — sem a cancelada", () => {
    expect([...STATUS_DE_AVALIACAO_VIVA]).toEqual([
      "pendente",
      "em_andamento",
      "concluida",
      "atrasada",
    ]);
  });

  it("nenhuma leitura de avaliações filtra por neq('cancelada')", () => {
    const antigos = arquivos()
      .filter((a) => /from\(\s*["']avaliacoes["']\s*\)/.test(a.codigo) && ANTIGO.test(a.codigo))
      .map((a) => a.caminho);
    expect(antigos).toEqual([]);
  });

  it("controle positivo: a lista nova é usada, e a varredura pega o filtro antigo", () => {
    const usam = arquivos().filter((a) => a.codigo.includes("STATUS_DE_AVALIACAO_VIVA")).length;
    expect(usam).toBeGreaterThanOrEqual(3);
    expect(ANTIGO.test('x.from("avaliacoes").neq("status", "cancelada")')).toBe(true);
  });
});

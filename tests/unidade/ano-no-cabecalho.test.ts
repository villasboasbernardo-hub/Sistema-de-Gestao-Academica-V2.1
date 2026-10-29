/**
 * Bloco 15 (spec 030), item 3 — **o ano no cabeçalho** (RT-6 emendada em 29/10/2026).
 *
 * > *"um seletor de ano só, na barra superior, junto do sininho e do tema claro/escuro, valendo para o sistema todo
 * > (mesmo cookie e ?ano= da D-24). Remover os seletores das páginas."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **AS VARREDURAS LEEM CÓDIGO SEM COMENTÁRIO** (regra 9.1.1): a frase *"o `SeletorDeAno` saiu desta página"* num
 *    comentário não é uso.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { rotaComAnoDoCaminho } from "@/lib/navegacao/contrato";

const RAIZ = path.resolve(__dirname, "../..");

/** O texto sem comentários de linha e de bloco (uma aproximação suficiente para TSX desta base). */
function semComentario(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

function arquivosTsx(dir: string): string[] {
  return fs
    .readdirSync(path.join(RAIZ, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => path.relative(RAIZ, path.join(e.parentPath, e.name)).replaceAll("\\", "/"));
}

describe("rotaComAnoDoCaminho — a rota do contrato que tem o ano do RT-6", () => {
  it("as páginas com ano: Início, Turmas, Instrutores, Cursos, Atividades, a página do curso e a ficha do instrutor", () => {
    expect(rotaComAnoDoCaminho("/inicio")).toBe("/inicio");
    expect(rotaComAnoDoCaminho("/turmas")).toBe("/turmas");
    expect(rotaComAnoDoCaminho("/instrutores")).toBe("/instrutores");
    expect(rotaComAnoDoCaminho("/cursos")).toBe("/cursos");
    expect(rotaComAnoDoCaminho("/atividades")).toBe("/atividades");
    expect(rotaComAnoDoCaminho("/cursos/C-Ap-HN")).toBe("/cursos/[curso]");
    expect(rotaComAnoDoCaminho("/instrutores/12")).toBe("/instrutores/[codigo]");
  });

  it("⚠️ o `ano` do DSA é a semana ISO, não o ano escolhido: o seletor não o toca", () => {
    expect(rotaComAnoDoCaminho("/turmas/C-Ap-HN%202026/dsa")).toBeNull();
  });

  it("página sem ano no endereço: nenhuma rota (a escolha só vai para o cookie)", () => {
    expect(rotaComAnoDoCaminho("/turmas/C-Ap-HN%202026")).toBeNull();
    expect(rotaComAnoDoCaminho("/admin/usuarios")).toBeNull();
    expect(rotaComAnoDoCaminho("/")).toBeNull();
  });
});

describe("FR-003 · um seletor de ano só, no cabeçalho", () => {
  it("⚠️ nenhuma página de `app/(app)` desenha seletor de ano próprio", () => {
    const comSeletor = arquivosTsx("app/(app)").filter((a) =>
      /<SeletorDeAno\b/.test(semComentario(fs.readFileSync(path.join(RAIZ, a), "utf8"))),
    );
    expect(comSeletor, `seletor de ano fora do cabeçalho:\n${comSeletor.join("\n")}`).toEqual([]);
  });

  it("controle positivo: o cabeçalho do sistema desenha o seletor, uma vez", () => {
    const cabecalho = semComentario(
      fs.readFileSync(path.join(RAIZ, "components/casca/cabecalho-do-app.tsx"), "utf8"),
    );
    expect(cabecalho.match(/<SeletorDeAno\b/g) ?? []).toHaveLength(1);
  });
});

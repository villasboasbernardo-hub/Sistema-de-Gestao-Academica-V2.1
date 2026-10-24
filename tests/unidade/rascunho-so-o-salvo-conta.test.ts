/**
 * **RP-8 — o que conta é o salvo** (spec 024, Bloco 9; SC-006).
 *
 * > *"Toda view e função que soma ou cruza lançamentos lê só o salvo. (…) uma guarda reprova leitura nova sem o filtro."*
 * > — `docs/correcoes/regras-da-publicacao-do-dsa.md`, RP-8 (Bernardo Villas Boas, 23/10/2026)
 *
 * ⚠️ **O MODO DE FALHA É SILENCIOSO**: uma leitura nova de lançamento sem o filtro somaria o rascunho — o andamento, o
 *    saldo ou o papel mudariam antes de alguém salvar, sem erro nenhum. Esta varredura lê o código SEM comentário (regra
 *    9.1.1) e exige, em toda cadeia `.from("<tabela de lançamento>")` que faz `.select(`, a palavra `salvo`.
 * ⚠️ **A LISTA NOMINAL É CURTA E TEM MOTIVO**: só quem vê o rascunho DE PROPÓSITO (a tela e as ações do DSA, que montam
 *    a grade com ele por cima) ou quem lê um registro por id para mexer nele. O lado do banco é o pgTAP `148`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const TABELAS = [
  "registros_aula",
  "avaliacoes",
  "atividades_nao_letivas",
  "vistas_de_avaliacao",
  "sessoes_de_aplicacao",
];

/** Quem vê o rascunho de propósito, ou lê um registro por id para mexer nele. */
const LISTA_NOMINAL: Readonly<Record<string, string>> = {
  "lib/acoes/dsa.ts":
    "as ações do DSA leem o fato por id (lerFato), o Apoio e o Estudo Individual já lançados e o número da próxima sessão — tudo na grade com o rascunho por cima (RP-0)",
  "lib/acoes/juntar-sessao.ts":
    "lê a avaliação por id para juntar a sessão (escrita da tela de avaliações)",
};

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * Cada cadeia que começa num `.from("<tabela>")`, até o fim do comando: `;`, a próxima `.from(`, o `.range(` da leitura
 * paginada ou o fecho de um `Promise.all` (`])` sozinho na linha — o `])` de `.in("status", [...])` não fecha nada).
 */
export function leiturasSemSalvo(codigo: string): string[] {
  const achadas: string[] = [];
  const re = new RegExp(
    `\\.from\\(\\s*(?:["'\`])(${TABELAS.join("|")})(?:["'\`])\\s*(?:as [^)]*)?\\)`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(codigo)) !== null) {
    const resto = codigo.slice(m.index + m[0].length);
    const fim = resto.search(/;|\.from\(|\.range\(|\n\s*\]\)/);
    const cadeia = resto.slice(0, fim === -1 ? 800 : Math.min(fim, 800));
    if (!/\.select\(/.test(cadeia)) continue;
    if (/\.(insert|update)\(/.test(cadeia)) continue;
    // O filtro tem de ser da PRÓPRIA tabela: `.eq("vistas_de_avaliacao.salvo", …)` filtra a embutida, não esta.
    if (!/\.(eq|in|is)\(\s*["'`]salvo["'`]/.test(cadeia))
      achadas.push(`${m[1]}: ${cadeia.slice(0, 70).replace(/\s+/g, " ")}`);
  }
  return achadas;
}

describe("RP-8 · toda leitura de lançamento filtra o salvo", () => {
  const todos = ["app", "lib", "components"].flatMap((d) => arquivos(resolve(RAIZ, d)));

  it("nenhuma leitura sem `salvo`, fora da lista nominal", () => {
    const faltando = todos.flatMap((caminho) => {
      const rel = relative(RAIZ, caminho).replaceAll("\\", "/");
      if (rel in LISTA_NOMINAL) return [];
      return leiturasSemSalvo(semComentarios(readFileSync(caminho, "utf8"))).map(
        (l) => `${rel} — ${l}`,
      );
    });
    expect(faltando, faltando.join("\n")).toEqual([]);
  });

  it("controle positivo: a varredura acusa a leitura sem o filtro e aceita a com ele", () => {
    expect(
      leiturasSemSalvo(`supabase.from("registros_aula").select("id").eq("status", "ativo");`),
    ).toHaveLength(1);
    expect(
      leiturasSemSalvo(`supabase.from("registros_aula").select("id").eq("salvo", true);`),
    ).toHaveLength(0);
    expect(
      leiturasSemSalvo(`supabase.from("avaliacoes").update({ a: 1 }).select("id");`),
    ).toHaveLength(0);
    // ⚠️ A primeira versão aceitava a palavra em qualquer lugar da cadeia e deixou passar o defeito deliberado.
    expect(
      leiturasSemSalvo(
        `supabase.from("avaliacoes").select("id, vistas_de_avaliacao(id)").eq("vistas_de_avaliacao.salvo", true);`,
      ),
      "o filtro da embutida não vale pela tabela da cadeia",
    ).toHaveLength(1);
  });

  it("controle positivo: a lista nominal aponta arquivos que existem", () => {
    for (const arquivo of Object.keys(LISTA_NOMINAL)) {
      expect(() => statSync(resolve(RAIZ, arquivo)), arquivo).not.toThrow();
    }
  });
});

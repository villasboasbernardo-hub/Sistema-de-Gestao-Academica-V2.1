/**
 * RC-1 (Bernardo Villas Boas, 21/10/2026) — as colunas do curso que foram para o currículo ficam no banco,
 * `[APOSENTADA — v2.1]`, e NINGUÉM as lê nem as grava pela aplicação: o valor que vale é o do currículo.
 *
 * > *"A coluna que vai para o currículo não é apagada de `cursos`: o currículo 1 recebe o valor, os leitores passam a
 * > ler do currículo, e a coluna antiga fica comentada `[APOSENTADA — v2.1]`."*
 *
 * ⚠️ POR QUE UMA GUARDA: uma tela que voltasse a ler `cursos.proposito` mostraria o valor de 21/10/2026 para sempre —
 *    certo no dia, errado depois da primeira edição, e sem erro nenhum.
 * ⚠️ Lê CÓDIGO SEM COMENTÁRIO (regra 9.1.1): o que menciona a coluna para dizer que ela aposentou não é leitor.
 * ⚠️ O embutido de currículos dentro do `select` de `cursos` (`curriculos!…(proposito, …)`) é leitura DO CURRÍCULO, e
 *    sai antes da conferência. Com CONTROLE POSITIVO: a varredura acha a leitura proibida quando ela existe.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = join(__dirname, "..", "..");
const PASTAS = ["app", "lib", "components"];
const FORA = new Set(["lib/tipos/database.ts"]);
const APOSENTADAS = [
  "proposito",
  "duracao_semanas",
  "duracao_dias",
  "curriculo_modelo",
  "curriculo_pdf_em",
];

function arquivos(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta)).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(join(RAIZ, caminho)).isDirectory()) return arquivos(caminho);
    return /\.(ts|tsx)$/.test(nome)
      ? [relative(RAIZ, join(RAIZ, caminho)).replace(/\\/g, "/")]
      : [];
  });
}

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

/** Tira os embutidos `nome(…)` de uma lista de colunas do PostgREST: o que está dentro é de OUTRA tabela. */
function semEmbutidos(colunas: string): string {
  let anterior = "";
  let atual = colunas;
  while (anterior !== atual) {
    anterior = atual;
    atual = atual.replace(/[\w:!]+\([^()]*\)/g, " ");
  }
  return atual;
}

/** As leituras e gravações de `cursos` que tocam coluna aposentada: `from("cursos")` seguido de select/update. */
function violacoes(fonte: string): string[] {
  const achados: string[] = [];
  const codigo = semComentarios(fonte);
  const consulta = /\.from\(\s*["']cursos["']\s*\)([\s\S]{0,600}?)(?=\.from\(|;\s*$|\n\s*\n)/gm;
  for (const m of codigo.matchAll(consulta)) {
    const trecho = m[1] ?? "";
    const select = /\.select\(\s*(["'`])([\s\S]*?)\1/.exec(trecho);
    if (select) {
      const colunas = semEmbutidos(select[2] ?? "");
      for (const c of APOSENTADAS)
        if (new RegExp(`\\b${c}\\b`).test(colunas)) achados.push(`select ${c}`);
    }
    const update = /\.update\(\s*\{([\s\S]*?)\}\s*\)/.exec(trecho);
    if (update) {
      for (const c of APOSENTADAS) {
        if (new RegExp(`\\b${c}\\s*:`).test(update[1] ?? "")) achados.push(`update ${c}`);
      }
    }
  }
  /*
   * A terceira regra: toda lista de colunas DO CURSO escrita como texto (as constantes `COLUNAS_*`), reconhecida por
   * `nome_curso` — a coluna que só o curso (e as views que o repetem) têm.
   */
  for (const m of codigo.matchAll(/"([^"\n]*\bnome_curso\b[^"\n]*)"/g)) {
    const colunas = semEmbutidos(m[1] ?? "");
    for (const c of APOSENTADAS) {
      if (new RegExp(`\\b${c}\\b`).test(colunas)) achados.push(`colunas ${c}`);
    }
  }
  return achados;
}

describe("RC-1 · ninguém lê nem grava as colunas aposentadas do curso", () => {
  it("controle positivo: a varredura acha a leitura e a gravação proibidas quando elas existem", () => {
    expect(violacoes(`await s.from("cursos").select("id, proposito").eq("id", x);`)).toEqual([
      "select proposito",
    ]);
    expect(
      violacoes(`await s.from("cursos").update({ curriculo_pdf_em: agora }).eq("id", x);`),
    ).toEqual(["update curriculo_pdf_em"]);
    expect(
      violacoes(
        `await s.from("cursos").select("id, curriculos:curriculos!curriculos_curso_id_fkey(id, proposito)");`,
      ),
    ).toEqual([]);
    expect(violacoes(`export const COLUNAS = "id, codigo, nome_curso, duracao_dias";`)).toEqual([
      "colunas duracao_dias",
    ]);
  });

  it("nenhum arquivo de app/, lib/ ou components/ toca as cinco colunas pelo curso", () => {
    const encontrados = PASTAS.flatMap(arquivos)
      .filter((a) => !FORA.has(a))
      .flatMap((a) => violacoes(readFileSync(join(RAIZ, a), "utf8")).map((v) => `${a}: ${v}`));
    expect(encontrados).toEqual([]);
  });
});

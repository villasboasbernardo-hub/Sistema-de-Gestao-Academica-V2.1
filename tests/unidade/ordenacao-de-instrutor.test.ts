/**
 * `SC-001` da spec 006 — **toda** lista de instrutor sai em antiguidade, contada uma a uma.
 *
 * > *"Toda lista, seletor (`<select>`) ou filtro de instrutores, em qualquer tela do sistema, deve
 * > ser ordenado por antiguidade crescente — sem exceção. **Risco: Alto**."* — documento 04, `RN-ANT-01`
 *
 * ⚠️ É VARREDURA, NÃO AMOSTRA. A regra é transversal e fácil de esquecer numa tela nova; um teste que
 * olhasse uma tela escolhida provaria só aquela tela.
 *
 * ⚠️ DUAS PORTAS, E ESTE ARQUIVO VIGIA AS DUAS:
 *   1. **a consulta** — toda leitura de lista em `vw_instrutores` ou `instrutores` pede
 *      `ordem_antiguidade`, ou passa pela montagem que a pede;
 *   2. **a memória** — todo arquivo que fala de instrutor e reordena com `.sort(` usa a função de
 *      domínio. O seletor único já tem teste próprio (`seletor-unico.test.ts`).
 *
 * ⚠️ A VARREDURA LÊ CÓDIGO SEM COMENTÁRIO. Três verificações da fatia (b) reprovaram lendo a própria
 * documentação como violação, e um teste que confunde a frase que promete a ausência com a violação
 * ensina a apagar a documentação para ficar verde.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const DIRETORIOS = ["app", "components", "lib"];

/** Quem implementa a ordenação, e por isso reordena em memória por definição. */
const IMPLEMENTADORES = new Set(["lib/dominio/antiguidade.ts"]);

function semComentario(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function arquivos(pasta: string): string[] {
  const caminho = resolve(RAIZ, pasta);
  return readdirSync(caminho).flatMap((nome) => {
    const completo = join(caminho, nome);
    if (statSync(completo).isDirectory()) return arquivos(relative(RAIZ, completo));
    return /\.(ts|tsx)$/.test(nome) ? [relative(RAIZ, completo).replaceAll("\\", "/")] : [];
  });
}

/**
 * As leituras de instrutor que não pedem antiguidade.
 *
 * Uma leitura está em ordem quando o seu comando: pede `ordem_antiguidade`; ou entrega a consulta à
 * montagem que a pede; ou lê **uma** linha (`single`, `maybeSingle`); ou é escrita.
 */
function leiturasSemAntiguidade(codigo: string): string[] {
  const achados: string[] = [];
  const padrao = /\.from\(\s*["'](vw_instrutores|instrutores)["']\s*\)/g;
  for (const casamento of codigo.matchAll(padrao)) {
    const indice = casamento.index ?? 0;
    const inicio = codigo.lastIndexOf(";", indice) + 1;
    const fimBruto = codigo.indexOf(";", indice);
    const comando = codigo.slice(inicio, fimBruto === -1 ? codigo.length : fimBruto);
    const emOrdem =
      comando.includes("ordem_antiguidade") ||
      comando.includes("montarConsultaDeInstrutores(") ||
      /\.(single|maybeSingle)\(/.test(comando) ||
      /\.(insert|update|upsert)\(/.test(comando);
    if (!emOrdem) achados.push(comando.trim().slice(0, 120));
  }
  return achados;
}

/**
 * O arquivo reordena instrutor em memória sem passar pelo domínio?
 *
 * ⚠️ O CRITÉRIO É O COMANDO, NÃO O ARQUIVO. Um arquivo que menciona instrutor e ordena outra coisa —
 * os trechos do nome em `nome-instrutor.ts`, as entradas do menu — não viola nada. A primeira versão
 * olhava o arquivo inteiro e apontou os dois; falso positivo ensina a desligar a varredura.
 */
function reordenaSemDominio(codigo: string): boolean {
  if (/ordenarPorAntiguidade|pesoAntiguidade/.test(codigo)) return false;
  for (const casamento of codigo.matchAll(/\.sort\(/g)) {
    const indice = casamento.index ?? 0;
    const inicio = Math.max(codigo.lastIndexOf(";", indice), codigo.lastIndexOf("{", indice)) + 1;
    const fimBruto = codigo.indexOf(";", indice);
    const comando = codigo.slice(inicio, fimBruto === -1 ? codigo.length : fimBruto);
    if (/instrutor/i.test(comando)) return true;
  }
  return false;
}

describe("`SC-001` · a varredura reconhece a violação — controle positivo", () => {
  it("uma leitura de lista sem antiguidade é apontada", () => {
    const violacao = 'const r = await supabase.from("vw_instrutores").select("id, nome_completo");';
    expect(leiturasSemAntiguidade(violacao)).toHaveLength(1);
  });

  it("a mesma leitura pedindo antiguidade, ou de uma linha só, passa", () => {
    const certo =
      'const a = await s.from("vw_instrutores").select("id").order("ordem_antiguidade");' +
      'const b = await s.from("vw_instrutores").select("id").eq("codigo", c).maybeSingle();' +
      'const d = montarConsultaDeInstrutores(s.from("vw_instrutores").select(C), p);' +
      'const e = await s.from("instrutores").update({ nome_guerra: n }).eq("id", i);';
    expect(leiturasSemAntiguidade(certo)).toEqual([]);
  });

  it("reordenar instrutor com `.sort(` sem a função de domínio é apontado", () => {
    expect(
      reordenaSemDominio("instrutores.slice().sort((a, b) => a.nome.localeCompare(b.nome))"),
    ).toBe(true);
    expect(
      reordenaSemDominio("const { ordenados } = ordenarPorAntiguidade(instrutores, e); x.sort()"),
    ).toBe(false);
  });

  it('⚠️ comentário que fala de `.from("vw_instrutores")` não é leitura', () => {
    const soComentario =
      '/* nunca faça .from("vw_instrutores").select("*") sem ordem */ const x = 1;';
    expect(leiturasSemAntiguidade(semComentario(soComentario))).toEqual([]);
  });
});

describe("`SC-001` · toda lista de instrutor do repositório, uma a uma", () => {
  const todos = DIRETORIOS.flatMap(arquivos).map((arquivo) => ({
    arquivo,
    codigo: semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8")),
  }));

  it("há código para varrer — controle positivo da própria varredura", () => {
    expect(todos.length).toBeGreaterThan(50);
  });

  it("nenhuma leitura de lista de instrutor deixa de pedir a antiguidade ao banco", () => {
    const violacoes = todos.flatMap(({ arquivo, codigo }) =>
      leiturasSemAntiguidade(codigo).map((comando) => `${arquivo}: ${comando}`),
    );
    expect(
      violacoes,
      `leitura de instrutor sem antiguidade — use montarConsultaDeInstrutores ou .order("ordem_antiguidade"):\n${violacoes.join("\n")}`,
    ).toEqual([]);
  });

  it("nenhum arquivo reordena instrutor em memória sem a função de domínio", () => {
    const violacoes = todos
      .filter(({ arquivo }) => !IMPLEMENTADORES.has(arquivo))
      .filter(({ codigo }) => reordenaSemDominio(codigo))
      .map(({ arquivo }) => arquivo);
    expect(
      violacoes,
      `reordena instrutor sem ordenarPorAntiguidade: ${violacoes.join(", ")}`,
    ).toEqual([]);
  });
});

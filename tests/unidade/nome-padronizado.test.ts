/**
 * `SC-005` da spec 006 — todo nome de instrutor exibido passa pelo formato padrão, e por um só lugar.
 *
 * > *"O nome MUST aparecer no formato `P/G Especialidade/Habilitação Nome Completo`, com o nome ou
 * > nomes de guerra em negrito, em toda tela."* — `FR-019` · *"A montagem do nome MUST vir de função
 * > pura de domínio, e MUST ser exibida por um único componente — não remontada em cada tela."*
 * > — `FR-020`
 *
 * ⚠️ O QUE A VARREDURA PROCURA É A **EXIBIÇÃO CRUA** de um campo de nome: `nome_completo`,
 * `nomeCompleto`, `nome_guerra` ou `nomeDeGuerra` escritos direto como filho de JSX, dentro de texto
 * interpolado ou em atributo que vira texto na tela (`title`, `aria-label`, `alt`, `detalhe`,
 * `titulo`, `rotulo`). Passar o campo como propriedade de `NomeInstrutor` é o caminho certo e não
 * casa com nenhum desses três moldes.
 *
 * ⚠️ LER O CAMPO NÃO É EXIBI-LO. A tabela ordena por `nomeCompleto`, a consulta o seleciona, a ação o
 * grava; nenhum desses é nome na tela, e a varredura não os aponta. E o valor do campo "Nome de
 * guerra" na ficha é um dado do cadastro, não o nome da pessoa.
 *
 * ⚠️ CÓDIGO SEM COMENTÁRIO, como toda varredura desta fatia.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();

/** Quem monta o nome — a exceção por definição. */
const IMPLEMENTADORES = new Set(["components/ciaara/nome-instrutor.tsx"]);

const CAMPO_DE_NOME = String.raw`\b(?:nome_completo|nomeCompleto|nome_guerra|nomeDeGuerra)\b`;

const MOLDES_DE_EXIBICAO = [
  // filho de JSX: `>{i.nome_completo}` ou `> {x.nomeCompleto}`
  new RegExp(String.raw`>\s*\{[^{}]*${CAMPO_DE_NOME}[^{}]*\}`),
  // texto interpolado: `${i.nome_completo}`
  new RegExp(String.raw`\$\{[^{}]*${CAMPO_DE_NOME}[^{}]*\}`),
  // atributo que vira texto: `title={i.nome_completo}`
  new RegExp(
    String.raw`\b(?:title|aria-label|alt|detalhe|titulo|rotulo)=\{[^{}]*${CAMPO_DE_NOME}[^{}]*\}`,
  ),
];

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

function exibeNomeCru(codigo: string): boolean {
  return MOLDES_DE_EXIBICAO.some((molde) => molde.test(codigo));
}

const TODOS = [...arquivos("app"), ...arquivos("components")].map((arquivo) => ({
  arquivo,
  codigo: semComentario(readFileSync(resolve(RAIZ, arquivo), "utf8")),
}));

describe("`SC-005` · nenhum nome de instrutor exibido fora do formato padrão", () => {
  it("nenhum arquivo de tela exibe campo de nome cru", () => {
    const violacoes = TODOS.filter(
      ({ arquivo, codigo }) => !IMPLEMENTADORES.has(arquivo) && exibeNomeCru(codigo),
    ).map(({ arquivo }) => arquivo);
    expect(
      violacoes,
      `nome de instrutor exibido sem NomeInstrutor/nomeEmTexto: ${violacoes.join(", ")}. ` +
        `O formato é do RF-INSTR-15, e montá-lo em cada tela é como uma tela nova esquece o negrito.`,
    ).toEqual([]);
  });
});

describe("controle positivo — a varredura enxerga o que diz enxergar", () => {
  it("há código para varrer, e as telas de instrutor usam o componente", () => {
    expect(TODOS.length).toBeGreaterThan(50);
    const usam = TODOS.filter(({ codigo }) => codigo.includes("<NomeInstrutor")).map(
      (t) => t.arquivo,
    );
    expect(usam).toContain("app/(app)/instrutores/TabelaDeInstrutores.tsx");
  });

  it("os três moldes de exibição crua são apontados", () => {
    expect(exibeNomeCru("<td>{linha.nome_completo}</td>")).toBe(true);
    expect(exibeNomeCru("const t = `Instrutor ${i.nomeCompleto}`;")).toBe(true);
    expect(exibeNomeCru("<span title={i.nome_guerra}>x</span>")).toBe(true);
  });

  it("passar o nome ao componente, ordenar por ele e ler do banco não são exibição", () => {
    expect(
      exibeNomeCru("<NomeInstrutor instrutor={{ id: l.id, nomeCompleto: l.nomeCompleto }} />"),
    ).toBe(false);
    expect(exibeNomeCru("valor: (l) => l.nomeCompleto,")).toBe(false);
    expect(exibeNomeCru('supabase.from("vw_instrutores").select("nome_completo")')).toBe(false);
  });
});

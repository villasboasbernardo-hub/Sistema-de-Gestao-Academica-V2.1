/**
 * `RF-EXTRA-01` · `RN-EVT-01` · `FR-010` (spec 014) — a categoria vem do tipo. E `FR-002` da spec 029: o «O que é»
 * opcional só no Estudo Individual.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORIAS_DE_ATIVIDADE,
  descricaoObrigatoria,
  recusaDaDescricaoNaEdicao,
  recusaPelaCategoria,
  categoriaPeloTipo,
  foraDaCht,
  tiposOferecidos,
  type TipoDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";

const tipo = (
  valor: string,
  metadados: TipoDeAtividade["metadados"],
  ativo = true,
): TipoDeAtividade => ({
  id: valor,
  valor,
  ativo,
  metadados,
});

describe("categoriaPeloTipo", () => {
  it("tipo com categoria → a categoria", () => {
    expect(categoriaPeloTipo(tipo("Palestra", { categoria: "AEC" }))).toBe("AEC");
    expect(categoriaPeloTipo(tipo("Monitoria", { categoria: "Apoio_Individualizado" }))).toBe(
      "Apoio_Individualizado",
    );
  });

  it("sem categoria, ou de uso aula, não é oferecido", () => {
    expect(categoriaPeloTipo(tipo("Aula", { uso: "aula" }))).toBeNull();
    expect(categoriaPeloTipo(tipo("Licença", {}))).toBeNull();
    expect(categoriaPeloTipo(tipo("X", null))).toBeNull();
    expect(categoriaPeloTipo(tipo("Y", { categoria: "CHD" }))).toBeNull();
  });

  it("trocar a categoria do tipo muda o resultado (o número não está no código)", () => {
    expect(categoriaPeloTipo(tipo("Recepção", { categoria: "TAD" }))).toBe("TAD");
    expect(categoriaPeloTipo(tipo("Recepção", { categoria: "AEC" }))).toBe("AEC");
  });

  it("a oferta tira os inativos e os sem categoria", () => {
    const lista = [
      tipo("Palestra", { categoria: "AEC" }),
      tipo("Aula", { uso: "aula" }),
      tipo("Licença de Pagamento", {}, false),
      tipo("Antigo", { categoria: "TAD" }, false),
    ];
    expect(tiposOferecidos(lista).map((t) => t.valor)).toEqual(["Palestra"]);
  });

  it("EI e Apoio ficam fora da CHT; AEC, TAD e TR dentro", () => {
    expect(foraDaCht("Estudo_Individual")).toBe(true);
    expect(foraDaCht("Apoio_Individualizado")).toBe(true);
    expect(["AEC", "TAD", "TR"].map((c) => foraDaCht(c as "AEC"))).toEqual([false, false, false]);
  });
});

describe("spec 014, FR-011 · as regras que dependem da categoria (`recusaPelaCategoria`)", () => {
  /* A descrição escrita: os casos abaixo medem as OUTRAS regras, e a falta dela não pode ser o motivo da recusa. */
  const base = {
    turmaId: "t",
    disciplinaId: null,
    quantidadeAlunos: null,
    descricao: "Palestra de segurança",
  } as const;

  it("disciplina em TAD é recusada — só a AEC leva disciplina; na AEC passa", () => {
    expect(recusaPelaCategoria({ ...base, categoria: "TAD", disciplinaId: "d" })?.mensagem).toBe(
      "Só a AEC leva disciplina.",
    );
    expect(recusaPelaCategoria({ ...base, categoria: "AEC", disciplinaId: "d" })).toBeNull();
  });

  it("`V-5` · Estudo Individual GLOBAL é recusado; de turma, aceito", () => {
    expect(
      recusaPelaCategoria({ ...base, categoria: "Estudo_Individual", turmaId: null })?.mensagem,
    ).toContain("sempre de uma turma");
    expect(recusaPelaCategoria({ ...base, categoria: "Estudo_Individual" })).toBeNull();
  });

  it("FR-020 · quantidade de alunos só no Apoio", () => {
    expect(recusaPelaCategoria({ ...base, categoria: "TAD", quantidadeAlunos: 3 })?.campo).toBe(
      "quantidadeAlunos",
    );
    expect(
      recusaPelaCategoria({ ...base, categoria: "Apoio_Individualizado", quantidadeAlunos: 3 }),
    ).toBeNull();
  });
});

/*
 * ⚠️ **FR-002 da spec 029 (Bloco 14, item 2) · O «O QUE É» É OPCIONAL SÓ NO ESTUDO INDIVIDUAL** *(decisão de Bernardo
 *    Villas Boas, 27/10/2026; D-5 a D-7)*. Nas demais categorias ele continua obrigatório, e a regra mora AQUI porque
 *    depende da categoria — que sai do tipo e o esquema não conhece. O Zod passa a só aparar (vazio vira nulo), e o
 *    banco tem o `CHECK` irmão, `ativ_descricao_fora_do_estudo_individual` (pgTAP `153`).
 * ⚠️ **O CASO QUE VIRA AQUI É A RECUSA FORA DO EI**: até a spec 029 quem recusava a descrição vazia era o Zod, para
 *    toda categoria, e esta função a ignorava. O EI sem descrição aceito é o controle de que a regra nova não o pega.
 */
describe("spec 029, FR-002 · o «O que é» só é opcional no Estudo Individual", () => {
  const sem = {
    turmaId: "t",
    disciplinaId: null,
    quantidadeAlunos: null,
    descricao: null,
  } as const;
  const foraDoEi = CATEGORIAS_DE_ATIVIDADE.filter((c) => c !== "Estudo_Individual");

  it("`descricaoObrigatoria` é falsa só no Estudo Individual", () => {
    expect(descricaoObrigatoria("Estudo_Individual")).toBe(false);
    expect(foraDoEi.map((c) => [c, descricaoObrigatoria(c)])).toEqual([
      ["AEC", true],
      ["TAD", true],
      ["TR", true],
      ["Apoio_Individualizado", true],
    ]);
  });

  it("Estudo Individual SEM descrição é aceito (D-5: grava nulo)", () => {
    expect(recusaPelaCategoria({ ...sem, categoria: "Estudo_Individual" })).toBeNull();
  });

  it("⚠️ AEC, TAD, TR e Apoio sem descrição são recusados, no campo «descricao», com a frase de sempre", () => {
    expect(foraDoEi.map((c) => [c, recusaPelaCategoria({ ...sem, categoria: c })])).toEqual(
      foraDoEi.map((c) => [c, { campo: "descricao", mensagem: "Escreva o que é a atividade." }]),
    );
  });

  it("controle: com a descrição escrita, nenhuma categoria é recusada por ela", () => {
    expect(
      CATEGORIAS_DE_ATIVIDADE.map((c) =>
        recusaPelaCategoria({ ...sem, categoria: c, descricao: "Leitura dirigida" }),
      ),
    ).toEqual(CATEGORIAS_DE_ATIVIDADE.map(() => null));
  });
});

/*
 * ⚠️ **FR-002.1 da spec 029 diz «ao lançar OU EDITAR»: a EDIÇÃO que apaga o «O que é»** (achado 11 da revisão
 *    adversarial do Bloco 14). O cartão manda `conteudo: null` quando a pessoa limpa o campo; no Estudo Individual isso
 *    grava nulo (D-5), e nas demais categorias a ação recusa com a MESMA frase do lançar — antes do `CHECK`
 *    `ativ_descricao_fora_do_estudo_individual`, que traduzido diria outra frase.
 * ⚠️ **OS DOIS SENTIDOS VIRAM AQUI**: sem a regra, a AEC apagada passa (e quem recusa é o banco, com outra frase); com a
 *    regra sem a condição da categoria, o EI apagado é recusado. `undefined` («não mandou») e o texto escrito são o
 *    controle de que a edição de outro campo nunca tropeça nesta regra.
 */
describe("spec 029, FR-002 · apagar o «O que é» na EDIÇÃO (`recusaDaDescricaoNaEdicao`)", () => {
  const foraDoEi = CATEGORIAS_DE_ATIVIDADE.filter((c) => c !== "Estudo_Individual");

  it("⚠️ Estudo Individual: apagar o «O que é» é aceito (D-5: grava nulo)", () => {
    expect(
      recusaDaDescricaoNaEdicao({ categoria: "Estudo_Individual", conteudo: null }),
    ).toBeNull();
  });

  it("⚠️ AEC, TAD, TR e Apoio: apagar é recusado, no campo «conteudo», com a frase do lançar", () => {
    expect(
      foraDoEi.map((c) => [c, recusaDaDescricaoNaEdicao({ categoria: c, conteudo: null })]),
    ).toEqual(
      foraDoEi.map((c) => [c, { campo: "conteudo", mensagem: "Escreva o que é a atividade." }]),
    );
  });

  it("só de espaços é o mesmo que apagado — fora do EI, recusa; no EI, aceita", () => {
    expect(recusaDaDescricaoNaEdicao({ categoria: "AEC", conteudo: "   " })?.campo).toBe(
      "conteudo",
    );
    expect(
      recusaDaDescricaoNaEdicao({ categoria: "Estudo_Individual", conteudo: "   " }),
    ).toBeNull();
  });

  it("controle: não mandar o campo, ou mandar texto, não recusa em categoria nenhuma", () => {
    expect(
      CATEGORIAS_DE_ATIVIDADE.flatMap((c) => [
        recusaDaDescricaoNaEdicao({ categoria: c, conteudo: undefined }),
        recusaDaDescricaoNaEdicao({ categoria: c, conteudo: "Leitura dirigida" }),
      ]),
    ).toEqual(CATEGORIAS_DE_ATIVIDADE.flatMap(() => [null, null]));
  });

  it("controle: fora da atividade (categoria nula — aula, avaliação), a regra não se aplica", () => {
    expect(recusaDaDescricaoNaEdicao({ categoria: null, conteudo: null })).toBeNull();
  });
});

/*
 * A LIGAÇÃO, lida sem comentário (regra 9.1.1): a Server Action da edição chama a regra pura com a categoria da LINHA e
 * não guarda uma segunda cópia da condição. O clique fica no e2e `dsa-estudo-individual-sem-descricao.spec.ts`.
 */
describe("spec 029, FR-002 · `aplicarAtualizacao` usa `recusaDaDescricaoNaEdicao` (lido sem comentário)", () => {
  const semComentarios = (fonte: string): string =>
    fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const acoes = semComentarios(readFileSync(resolve(process.cwd(), "lib/acoes/dsa.ts"), "utf8"));
  const inicio = acoes.indexOf("async function aplicarAtualizacao(");
  const corpo = inicio < 0 ? "" : acoes.slice(inicio, acoes.indexOf("\n}\n", inicio));

  it("controle positivo: a varredura acha a função da edição", () => {
    expect(corpo).toContain("lerFato(");
  });

  it("a edição recusa pela função pura, e não por uma segunda cópia de `descricaoObrigatoria`", () => {
    expect(corpo).toMatch(/recusaDaDescricaoNaEdicao\(\s*\{\s*categoria:/);
    expect(corpo).not.toMatch(/descricaoObrigatoria\(/);
  });
});

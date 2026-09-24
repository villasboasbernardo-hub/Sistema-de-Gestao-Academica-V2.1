/**
 * `FR-003` · as cinco classificações de curso, na ordem do Glossário.
 *
 * ⚠️ **A ORDEM É DADO NORMATIVO, NÃO ESTÉTICA.** Ela é a do Glossário e da v1.0 — *"Regular ·
 * Expedito · Especial · Aperfeiçoamento Avançado · Estágio de Qualificação"* (Q-08, 16/09/2026) — e
 * **não** é a ordem do `ENUM` do banco, que é a de criação do tipo. Derivar a lista de `Constants`
 * daria cinco valores certos na ordem errada, e a tela pareceria funcionar.
 *
 * ⚠️ **E A RELAÇÃO COM O TIPO DO BANCO É DE SUBCONJUNTO, nas duas direções.** Se o `ENUM` ganhar um
 * valor, esta lista precisa decidir se ele agrupa; se perder um, esta lista quebra. Por isso o caso
 * compara com `Constants` em vez de repetir os cinco textos — repetição não envelhece junto.
 *
 * Origem: `FR-003` da spec 009, D-19.
 */
import { describe, expect, it } from "vitest";

import {
  CLASSIFICACOES_DE_CURSO,
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";
import { CLASSIFICACOES_DE_CURSO_NA_BARRA } from "@/lib/constantes/instrutor";
import { Constants } from "@/lib/tipos/database";

const DO_BANCO: readonly string[] = Constants.public.Enums.escopo_curso;

describe("`FR-003` · são cinco, e nesta ordem", () => {
  it("a ordem é a do Glossário, e não a do `ENUM`", () => {
    expect(CLASSIFICACOES_DE_CURSO).toEqual([
      "regular",
      "expedito",
      "especial",
      "aperfeicoamento_avancado",
      "estagio_qualificacao",
    ]);
  });

  it("⚠️ e ela DIFERE da ordem do `ENUM` — é o que torna a lista necessária", () => {
    // Se um dia as duas coincidirem, este caso reprova e alguém decide se a lista ainda tem razão
    // de existir. Uma lista que só repete a fonte é dívida, não garantia.
    const noBanco = DO_BANCO.filter((c) =>
      (CLASSIFICACOES_DE_CURSO as readonly string[]).includes(c),
    );
    expect(
      noBanco,
      "a ordem do ENUM passou a coincidir com a do Glossário: a lista virou repetição",
    ).not.toEqual([...CLASSIFICACOES_DE_CURSO]);
  });

  it("toda classificação existe no tipo `escopo_curso` do banco", () => {
    const forasteiras = CLASSIFICACOES_DE_CURSO.filter((c) => !DO_BANCO.includes(c));
    expect(
      forasteiras,
      `classificação que a coluna não aceita: ${forasteiras.join(", ")}. A tela ofereceria um ` +
        `filtro que devolve vazio para sempre.`,
    ).toEqual([]);
  });

  it("⚠️ `geral` e `ead_semipresencial` ficam de fora, e os dois por motivos diferentes", () => {
    // `geral` é sentinela de escopo, não curso (achado 4 do Épico 2); `ead_semipresencial` é
    // recusado pelo banco desde o `FR-003.1`, porque um curso com esse valor ficaria invisível
    // para TODOS os Operadores — o recorte deles é `classificacao = escopo`.
    expect(CLASSIFICACOES_DE_CURSO).not.toContain("geral");
    expect(CLASSIFICACOES_DE_CURSO).not.toContain("ead_semipresencial");
  });

  it("⚠️ e são os ÚNICOS dois de fora — o resto do tipo agrupa", () => {
    const deFora = DO_BANCO.filter(
      (c) => !(CLASSIFICACOES_DE_CURSO as readonly string[]).includes(c),
    );
    expect(
      [...deFora].sort(),
      "o tipo do banco ganhou valor que nenhum grupo do catálogo mostra",
    ).toEqual(["ead_semipresencial", "geral"]);
  });

  it("não há repetida", () => {
    expect(new Set(CLASSIFICACOES_DE_CURSO).size).toBe(CLASSIFICACOES_DE_CURSO.length);
  });
});

describe("cada uma tem rótulo de tela, e ele não é o valor do banco", () => {
  it("⚠️ os cinco rótulos são os do documento 07, e não a listagem abreviada do `FR-003`", () => {
    // O `FR-003` escreve "Regular · Expedito · Especial · Aperfeiçoamento Avançado · Estágio de
    // Qualificação" para dizer a ORDEM. O vocabulário é o do Glossário, linha 132, e a Divisão diz
    // "Curso Regular".
    expect(ROTULO_DA_CLASSIFICACAO).toEqual({
      regular: "Curso Regular",
      expedito: "Curso Expedito",
      especial: "Curso Especial",
      aperfeicoamento_avancado: "Curso de Aperfeiçoamento Avançado",
      estagio_qualificacao: "Estágio de Qualificação",
    });
  });

  it("⚠️ a barra de filtros de `/instrutores` usa ESTA lista — não uma segunda cópia", () => {
    // A duplicação existia desde a spec 006 e ia virar tripla nesta fatia, com rótulo divergente.
    expect(CLASSIFICACOES_DE_CURSO_NA_BARRA.map((c) => c.valor)).toEqual([
      ...CLASSIFICACOES_DE_CURSO,
    ]);
    for (const c of CLASSIFICACOES_DE_CURSO_NA_BARRA) {
      expect(c.rotulo).toBe(ROTULO_DA_CLASSIFICACAO[c.valor]);
    }
  });

  it("⚠️ nenhum rótulo é o próprio valor em `snake_case` — isso seria schema vazando para a tela", () => {
    for (const c of CLASSIFICACOES_DE_CURSO) {
      expect(ROTULO_DA_CLASSIFICACAO[c], `${c} sem rótulo próprio`).not.toBe(c);
      expect(ROTULO_DA_CLASSIFICACAO[c]).not.toContain("_");
    }
  });

  it("toda classificação tem rótulo — a lista não envelhece pela metade", () => {
    const semRotulo = CLASSIFICACOES_DE_CURSO.filter((c) => !ROTULO_DA_CLASSIFICACAO[c]);
    expect(semRotulo).toEqual([]);
  });
});

describe("`ehClassificacaoDeCurso` é o porteiro do que vem da URL", () => {
  it("aceita as cinco", () => {
    for (const c of CLASSIFICACOES_DE_CURSO) expect(ehClassificacaoDeCurso(c)).toBe(true);
  });

  it("⚠️ recusa `geral`, `ead_semipresencial` e lixo — e é o que evita o vazio sem explicação", () => {
    for (const v of ["geral", "ead_semipresencial", "", "Regular", "regular ", "qualquer"]) {
      expect(ehClassificacaoDeCurso(v), `${JSON.stringify(v)} passou pelo porteiro`).toBe(false);
    }
  });
});

/**
 * `FR-013` · `FR-014` · `FR-015` · `SC-009` — a cascata do pré-preenchimento do lançamento.
 *
 * ⚠️ **O CASO QUE IMPORTA MAIS É O MEDIDO, e ele não é o primeiro degrau:** no banco **remoto**
 * (lido só por leitura em **05/10/2026**, registrado em `estado-atual.md` §5),
 * **`turma_disciplina_unidade` tem 0 linhas** e **`turma_disciplina_instrutor` tem 99**. Então o
 * caminho que a operação vai percorrer todo dia é o **segundo** degrau, com `porUnidade` **vazio** —
 * e é por isso que ele tem caso próprio, em vez de ficar implícito nos outros.
 *
 * ⚠️ **OS IDENTIFICADORES SÃO SINTÉTICOS E LEGÍVEIS DE PROPÓSITO.** No banco são `uuid`; o módulo os
 * trata como texto opaco, e nomes legíveis são o que faz a leitura do caso dizer qual degrau venceu.
 * **Nenhum deles é id de linha real**, e nenhum número deste arquivo é medição de curso.
 */

import { describe, expect, it } from "vitest";

import {
  frasePara,
  preencherLancamento,
  type AtribuicaoPorDisciplina,
  type AtribuicaoPorUnidade,
} from "@/lib/dominio/dsa/pre-preenchimento";

const DISCIPLINA = "disciplina-navegacao";
const OUTRA_DISCIPLINA = "disciplina-meteorologia";
const UE = "ue-cartas-nauticas";
const OUTRA_UE = "ue-mares";

const INSTRUTOR_DA_UE = "instrutor-da-ue";
const INSTRUTOR_DA_DISCIPLINA = "instrutor-da-disciplina";

const POR_UE: readonly AtribuicaoPorUnidade[] = [
  { unidadeEnsinoId: OUTRA_UE, instrutorId: "instrutor-de-outra-ue" },
  { unidadeEnsinoId: UE, instrutorId: INSTRUTOR_DA_UE },
];

const POR_DISCIPLINA: readonly AtribuicaoPorDisciplina[] = [
  { disciplinaId: OUTRA_DISCIPLINA, instrutorId: "instrutor-de-outra-disciplina" },
  { disciplinaId: DISCIPLINA, instrutorId: INSTRUTOR_DA_DISCIPLINA },
];

/** O formulário aberto na disciplina e na UE do caso, com o cadastro todo preenchido. */
function preencher(
  ajustes: Partial<Parameters<typeof preencherLancamento>[0]> = {},
): ReturnType<typeof preencherLancamento> {
  return preencherLancamento({
    disciplinaId: DISCIPLINA,
    unidadeEnsinoId: UE,
    porUnidade: POR_UE,
    porDisciplina: POR_DISCIPLINA,
    tecnicaSugerida: "Exposição Oral",
    topico: "Agulha magnética: desvio e rumo",
    salaDaTurma: "Sala 3",
    ...ajustes,
  });
}

describe("`FR-014` · a cascata do instrutor, degrau por degrau", () => {
  it("com atribuição por UE E por disciplina, vence a POR UE — a mais específica", () => {
    const p = preencher();

    expect(p.instrutorId).toBe(INSTRUTOR_DA_UE);
    expect(p.motivoDoInstrutorVazio).toBeNull();
    expect(frasePara(p.motivoDoInstrutorVazio)).toBeNull();
  });

  it("só com a atribuição por disciplina, vem ela", () => {
    const p = preencher({ porUnidade: [] });

    expect(p.instrutorId).toBe(INSTRUTOR_DA_DISCIPLINA);
    expect(p.motivoDoInstrutorVazio).toBeNull();
  });

  it("com NENHUMA atribuição, o campo abre vazio COM motivo e COM frase", () => {
    const p = preencher({ porUnidade: [], porDisciplina: [] });

    expect(p.instrutorId).toBeNull();
    expect(p.motivoDoInstrutorVazio).toBe("sem_atribuicao_na_turma");

    // ⚠️ Campo vazio e MUDO se lê como tela quebrada — a frase diz onde se atribui (`RN-DEG-01`).
    const frase = frasePara(p.motivoDoInstrutorVazio);
    expect(frase).toContain("não tem instrutor atribuído nesta turma");
    expect(frase).toContain("Instrutores nesta turma");
  });

  it("UE NULA (aula sem UE, `Q-1`) pula o primeiro degrau e usa a por disciplina", () => {
    const p = preencher({ unidadeEnsinoId: null });

    expect(p.instrutorId).toBe(INSTRUTOR_DA_DISCIPLINA);
    expect(p.motivoDoInstrutorVazio).toBeNull();
  });

  it("atribuição por UE de OUTRA UE é ignorada — não vira instrutor plausível e errado", () => {
    const p = preencher({
      unidadeEnsinoId: UE,
      porUnidade: [{ unidadeEnsinoId: OUTRA_UE, instrutorId: "instrutor-de-outra-ue" }],
    });

    expect(p.instrutorId).toBe(INSTRUTOR_DA_DISCIPLINA);
  });

  it("atribuição por OUTRA DISCIPLINA é ignorada, e o campo cai no terceiro degrau", () => {
    const p = preencher({
      porUnidade: [],
      porDisciplina: [
        { disciplinaId: OUTRA_DISCIPLINA, instrutorId: "instrutor-de-outra-disciplina" },
      ],
    });

    expect(p.instrutorId).toBeNull();
    expect(p.motivoDoInstrutorVazio).toBe("sem_atribuicao_na_turma");
  });

  it("UE nula com `porUnidade` cheio NÃO casa com a primeira linha da lista", () => {
    const p = preencher({ unidadeEnsinoId: null, porDisciplina: [] });

    // ⚠️ Varrer `porUnidade` sem id de UE pegaria `instrutor-de-outra-ue`: plausível e errado.
    expect(p.instrutorId).toBeNull();
    expect(p.motivoDoInstrutorVazio).toBe("sem_atribuicao_na_turma");
  });
});

describe("`FR-014` · o caso MEDIDO: o primeiro degrau está vazio no remoto", () => {
  it("`porUnidade` vazio (0 linhas, como no remoto hoje) funciona pelo SEGUNDO degrau", () => {
    const p = preencher({ porUnidade: [] });

    // ⚠️ 0 linhas em `turma_disciplina_unidade` e 99 em `turma_disciplina_instrutor` (05/10/2026).
    expect(p.instrutorId).toBe(INSTRUTOR_DA_DISCIPLINA);
    expect(p.motivoDoInstrutorVazio).toBeNull();
    // E o resto do formulário chega preenchido do mesmo jeito — o degrau vazio não contamina nada.
    expect(p.tecnica).toBe("Exposição Oral");
    expect(p.local).toBe("Sala 3");
    expect(p.conteudo).toBe("Agulha magnética: desvio e rumo");
  });

  it("CONTROLE NEGATIVO — com o primeiro degrau POVOADO, o veredito muda", () => {
    const comUe = preencher();
    const semUe = preencher({ porUnidade: [] });

    // Se os dois dessem o mesmo instrutor, o degrau 1 não estaria sendo exercitado por caso nenhum.
    expect(comUe.instrutorId).not.toBe(semUe.instrutorId);
  });
});

describe("`Q-9` · mais de uma atribuição para a mesma UE — vem a primeira da lista recebida", () => {
  it("o rateio em cinco casos dá vários instrutores; o lançamento tem um", () => {
    const p = preencher({
      porUnidade: [
        { unidadeEnsinoId: UE, instrutorId: "instrutor-mais-antigo" },
        { unidadeEnsinoId: UE, instrutorId: "instrutor-mais-moderno" },
      ],
    });

    // ⚠️ A ORDEM É DO CHAMADOR (`RN-ANT-01`): este módulo não reordena lista de instrutor.
    expect(p.instrutorId).toBe("instrutor-mais-antigo");
    expect(p.motivoDoInstrutorVazio).toBeNull();
  });
});

describe("`RN-DEG-01` · ausência sai `null`, e nada inventa valor", () => {
  it("técnica, sala e tópico nulos saem os TRÊS `null`, sem inventar nada", () => {
    const p = preencher({ tecnicaSugerida: null, topico: null, salaDaTurma: null });

    expect(p.tecnica).toBeNull();
    // ⚠️ Em especial: NÃO inventa sala. Sala inventada é gravada e sai no DSA assinado.
    expect(p.local).toBeNull();
    expect(p.conteudo).toBeNull();
    // O instrutor, que tem cadastro, continua vindo — a ausência de um campo não zera os outros.
    expect(p.instrutorId).toBe(INSTRUTOR_DA_UE);
  });

  it('branco do cadastro é AUSÊNCIA, não valor — `""` e espaços saem `null`', () => {
    const p = preencher({ tecnicaSugerida: "", topico: "   ", salaDaTurma: "" });

    expect(p.tecnica).toBeNull();
    expect(p.conteudo).toBeNull();
    expect(p.local).toBeNull();
  });

  it("atribuição com instrutor em branco NÃO conta como atribuição — cai no degrau seguinte", () => {
    const p = preencher({ porUnidade: [{ unidadeEnsinoId: UE, instrutorId: "  " }] });

    expect(p.instrutorId).toBe(INSTRUTOR_DA_DISCIPLINA);
  });

  it("`frasePara(null)` devolve `null` — ausência de motivo não tem frase", () => {
    expect(frasePara(null)).toBeNull();
  });
});

describe("`Q-1` · o que vem da UE só vem quando há UE escolhida", () => {
  it("aula SEM UE abre conteúdo e técnica vazios, mesmo com tópico herdado na entrada", () => {
    const p = preencher({ unidadeEnsinoId: null });

    /*
     * ⚠️ O `CHECK` da `Q-1` exige CONTEÚDO em aula sem UE — um tópico que sobrou da UE anterior o
     *    satisfaria, gravando conteúdo de uma UE que não está no lançamento, sem erro nenhum.
     */
    expect(p.conteudo).toBeNull();
    expect(p.tecnica).toBeNull();
  });

  it("CONTROLE POSITIVO — com UE, os dois vêm do catálogo", () => {
    const p = preencher();

    expect(p.conteudo).toBe("Agulha magnética: desvio e rumo");
    expect(p.tecnica).toBe("Exposição Oral");
  });

  it("a SALA não passa por essa guarda — ela é da turma, e vale com UE ou sem ela", () => {
    const p = preencher({ unidadeEnsinoId: null });

    expect(p.local).toBe("Sala 3");
  });
});

describe("`FR-015` · o módulo SÓ SUGERE — não há caminho de volta ao cadastro", () => {
  it("a saída tem exatamente os cinco campos do formulário, e nenhum id de cadastro a mais", () => {
    const p = preencher();

    /*
     * ⚠️ É O `D-4` DA PLANILHA MORRENDO NA FORMA DO TIPO: lá instrutor, local e técnica são atributo
     *    DO ITEM do catálogo, e trocar um reescreve todo DSA passado. Aqui a função devolve valores
     *    para a LINHA do lançamento — sem id de UE, de disciplina ou de atribuição por onde a
     *    gravação pudesse voltar ao cadastro.
     */
    expect(Object.keys(p).sort()).toEqual([
      "conteudo",
      "instrutorId",
      "local",
      "motivoDoInstrutorVazio",
      "tecnica",
    ]);
  });

  it("chamar duas vezes com a mesma entrada não muda nada — a função é pura", () => {
    expect(preencher()).toEqual(preencher());
  });
});

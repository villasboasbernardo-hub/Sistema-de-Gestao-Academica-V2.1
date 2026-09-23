/**
 * `FR-006` / `FR-031.4` · a leitura da página do curso.
 *
 * ⚠️ **`?turma=` DE OUTRO CURSO OU INEXISTENTE NÃO PODE SUMIR EM SILÊNCIO.** Ele degrada para a
 * pré-seleção **com aviso**: a pessoa colou um link e precisa saber que está vendo outra coisa. Sem
 * o aviso, ela lê a tela como se fosse a turma que pediu.
 *
 * ⚠️ **A MENSAGEM DE "NÃO ENCONTRADO" DEPENDE DO PERFIL**, e essa é a regra inteira: para quem
 * alcança tudo, o curso não existe; para quem tem recorte, ele pode existir e estar fora do alcance.
 * Dizer "não existe" a quem só não alcança é afirmar sobre o que a consulta dele não pode ver.
 *
 * Origem: `FR-006`, `FR-012`, `FR-031.4` da spec 009, research R-9.
 */
import { describe, expect, it } from "vitest";

import {
  COLUNAS_DA_PAGINA_DO_CURSO,
  mensagemDeCursoNaoEncontrado,
  resolverTurmaSelecionada,
} from "@/app/(app)/cursos/[curso]/consulta";
import type { TurmaParaSelecao } from "@/lib/dominio/pre-selecao-de-turma";

const HOJE = "2026-09-23";

const turma = (
  codigo: string,
  dataInicio: string | null,
  dataTermino: string | null,
  status = "planejada",
): TurmaParaSelecao => ({ codigo, dataInicio, dataTermino, status });

const DUAS: readonly TurmaParaSelecao[] = [
  turma("C-Ap-FR T1 2026", "2026-02-02", "2026-06-30", "concluida"),
  turma("C-Ap-FR T2 2026", "2026-08-03", "2026-12-11", "ativa"),
];

describe("`FR-006.1` · sem `?turma=`, vale a pré-seleção", () => {
  it("escolhe pela janela, e não avisa nada", () => {
    expect(resolverTurmaSelecionada(DUAS, "", HOJE)).toEqual({
      codigo: "C-Ap-FR T2 2026",
      aviso: null,
    });
  });

  it("curso sem turma nenhuma abre sem seleção, e sem aviso", () => {
    expect(resolverTurmaSelecionada([], "", HOJE)).toEqual({ codigo: null, aviso: null });
  });
});

describe("`?turma=` explícito", () => {
  it("⚠️ é respeitado, e NUNCA sobrescrito pela pré-seleção", () => {
    // A pré-seleção escolheria a T2. O link pediu a T1, e é a T1 que abre — senão o link
    // compartilhado mostra outra coisa a quem o recebe.
    expect(resolverTurmaSelecionada(DUAS, "C-Ap-FR T1 2026", HOJE)).toEqual({
      codigo: "C-Ap-FR T1 2026",
      aviso: null,
    });
  });

  it("vale mesmo para turma `cancelada` — o veto é da pré-seleção, não da escolha explícita", () => {
    const lista = [turma("C-Ap-FR T1 2026", "2026-02-02", "2026-06-30", "cancelada"), ...DUAS];
    expect(resolverTurmaSelecionada(lista, "C-Ap-FR T1 2026", HOJE).codigo).toBe("C-Ap-FR T1 2026");
  });

  it("⚠️ chega JÁ DECODIFICADO do `searchParams` — a função não decodifica nada", () => {
    /*
     * O `+` do `nuqs` e o `%20` do vínculo já viraram espaço antes de chegar aqui. Quem decodificava
     * de novo (até 23/09/2026) destruiria qualquer código que viesse a conter `%`.
     */
    expect(resolverTurmaSelecionada(DUAS, "C-Ap-FR T2 2026", HOJE)).toEqual({
      codigo: "C-Ap-FR T2 2026",
      aviso: null,
    });

    /*
     * ⚠️ O QUE DISCRIMINA É O AVISO, e não o código: `%20…` degrada para a pré-seleção, que por
     * acaso é a mesma turma. Com decodificação manual, ele seria ENCONTRADO e o aviso viria nulo.
     */
    const comEscape = resolverTurmaSelecionada(DUAS, "C-Ap-FR%20T2%202026", HOJE);
    expect(comEscape.aviso, "ainda decodifica o parâmetro de consulta à mão").not.toBeNull();
  });
});

describe("`?turma=` que não serve degrada COM AVISO", () => {
  it("turma de outro curso cai na pré-seleção e avisa", () => {
    const r = resolverTurmaSelecionada(DUAS, "CAHO 2026", HOJE);
    expect(r.codigo).toBe("C-Ap-FR T2 2026");
    expect(r.aviso).toContain("CAHO 2026");
    expect(r.aviso).toContain("não é deste curso");
  });

  it("turma inexistente cai na pré-seleção e avisa", () => {
    const r = resolverTurmaSelecionada(DUAS, "C-Ap-FR T9 2099", HOJE);
    expect(r.codigo).toBe("C-Ap-FR T2 2026");
    expect(r.aviso).not.toBeNull();
  });

  it("⚠️ e o aviso existe mesmo quando não há para onde degradar", () => {
    // Sem turma nenhuma, a tela abre vazia. Se o aviso sumisse aqui, o link errado ficaria
    // indistinguível de um curso que de fato não tem turma.
    const r = resolverTurmaSelecionada([], "C-Ap-FR T9 2099", HOJE);
    expect(r.codigo).toBeNull();
    expect(r.aviso).not.toBeNull();
  });

  it("`?turma=` vazio não é erro, e não avisa", () => {
    expect(resolverTurmaSelecionada(DUAS, "", HOJE).aviso).toBeNull();
    expect(resolverTurmaSelecionada(DUAS, "   ", HOJE).aviso).toBeNull();
  });
});

describe("`FR-031.4` · a mensagem de não encontrado depende do perfil", () => {
  it("alcance total: o curso não existe, e a frase diz isso", () => {
    const m = mensagemDeCursoNaoEncontrado("C-Ap-XX", "todos");
    expect(m).toContain("C-Ap-XX");
    expect(m).toContain("não encontrado");
    expect(m).not.toContain("alcance");
  });

  it("⚠️ recorte: a frase acrescenta 'ou fora do seu alcance' — e é o caso que discrimina", () => {
    const m = mensagemDeCursoNaoEncontrado("C-Ap-XX", "recortado");
    expect(m).toContain("fora do seu alcance");
  });

  it("⚠️ as duas são diferentes para a MESMA sigla — não saber não vira afirmação", () => {
    expect(mensagemDeCursoNaoEncontrado("C-Ap-XX", "todos")).not.toBe(
      mensagemDeCursoNaoEncontrado("C-Ap-XX", "recortado"),
    );
  });
});

describe("as colunas pedidas", () => {
  it("trazem o que o cabeçalho e o quadro de avisos precisam", () => {
    for (const coluna of [
      "codigo",
      "nome_curso",
      "classificacao",
      "modalidade",
      "proposito",
      "duracao_dias",
      "duracao_semanas",
      "limite_turmas_ano",
      "status",
    ]) {
      expect(COLUNAS_DA_PAGINA_DO_CURSO, `${coluna} não é pedida`).toContain(coluna);
    }
  });

  it("⚠️ e NÃO pedem `select *`", () => {
    expect(COLUNAS_DA_PAGINA_DO_CURSO).not.toContain("*");
  });
});

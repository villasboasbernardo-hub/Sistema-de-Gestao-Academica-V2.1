/**
 * As assinaturas do DSA **editáveis só para a impressão** (item 4 da conferência do PR #40, decisão
 * de Bernardo Villas Boas, 08/10/2026) e a saída da marca «lançado à frente» da tela (item 3).
 *
 * > *"O que foi editado vai para a IMPRESSÃO. NÃO grava no cadastro nem no banco."*
 *
 * ⚠️ **O CAMINHO DA EDIÇÃO É O ENDEREÇO DO BOTÃO**, então o que se prova aqui é a ida e a volta:
 * `enderecoDaImpressaoDoDsa` escreve, `URLSearchParams` (o que o servidor usa) lê, e
 * `edicaoDaImpressaoDoDsa` devolve **o mesmo texto** — com espaço, acento, `&`, `#`, `+` e `%`, que
 * são onde a codificação erra. O clique se prova em `tests/e2e/dsa-imprimir.spec.ts`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BotaoImprimir,
  EdicaoDasAssinaturasNaTela,
  RubricaEditavel,
} from "@/app/(app)/turmas/[turma]/dsa/AssinaturasEditaveis";
import {
  LIMITE_DO_CAMPO,
  rubricaComEdicao,
  rubricaResolvida,
  type EdicaoDasAssinaturas,
} from "@/lib/dominio/dsa/assinatura-editada";
import type { Assinatura } from "@/lib/dominio/dsa/assinaturas";
import {
  edicaoDaImpressaoDoDsa,
  enderecoDaImpressaoDoDsa,
  PARAMETRO_DA_ASSINATURA,
} from "@/lib/navegacao/endereco-de-turma";

const FIXA: Assinatura = {
  papel: "encarregado_divisao",
  funcaoDescricao: "Encarregado da Divisão",
  nomeCompleto: "FULANO DE TAL",
  postoGraduacao: "CC",
  especialidade: null,
  postoPorExtenso: "Capitão de Corveta",
  resolvePeloUsuarioLogado: false,
};

const DINAMICA: Assinatura = {
  papel: "elaborador",
  funcaoDescricao: "Auxiliar da Divisão",
  nomeCompleto: null,
  postoGraduacao: null,
  especialidade: null,
  postoPorExtenso: "",
  resolvePeloUsuarioLogado: true,
};

/** O que o servidor do `/print/dsa` recebe em `searchParams`, a partir do `href`. */
function consultaDe(href: string): Record<string, string> {
  return Object.fromEntries(new URL(href, "http://x").searchParams);
}

describe("a rubrica resolvida, em texto — a MESMA para a tela e o papel", () => {
  it("modo fixo: nome completo, posto por extenso e função", () => {
    expect(rubricaResolvida(FIXA, "QUEM IMPRIME")).toEqual({
      nome: "FULANO DE TAL",
      posto: "Capitão de Corveta",
      funcao: "Encarregado da Divisão",
    });
  });

  it("modo dinâmico: assina quem imprime, sem posto (`Q-14`)", () => {
    expect(rubricaResolvida(DINAMICA, "QUEM IMPRIME")).toEqual({
      nome: "QUEM IMPRIME",
      posto: "",
      funcao: "Auxiliar da Divisão",
    });
  });

  it("sem responsável vigente, `null` — a linha sai em branco", () => {
    expect(rubricaResolvida(null, "QUEM IMPRIME")).toBeNull();
  });
});

describe("a edição vai por cima, campo a campo", () => {
  const resolvida = rubricaResolvida(FIXA, null);

  it("sem edição, é a resolvida — e campo ausente não é edição", () => {
    expect(rubricaComEdicao(resolvida, undefined)).toBe(resolvida);
    expect(rubricaComEdicao(resolvida, {})).toBe(resolvida);
  });

  it("o campo editado troca; os outros ficam", () => {
    expect(rubricaComEdicao(resolvida, { nome: "OUTRO NOME" })).toEqual({
      nome: "OUTRO NOME",
      posto: "Capitão de Corveta",
      funcao: "Encarregado da Divisão",
    });
  });

  it("⚠️ campo editado para vazio SAI vazio — apagar também é editar", () => {
    expect(rubricaComEdicao(resolvida, { posto: "" })?.posto).toBe("");
  });

  it("⚠️ o caso que discrimina: lado SEM responsável ganha rubrica quando editado", () => {
    // É o "a pessoa não está cadastrada" do pedido — antes, a linha sairia em branco sempre.
    expect(rubricaComEdicao(null, { nome: "SUBSTITUTO" })).toEqual({
      nome: "SUBSTITUTO",
      posto: "",
      funcao: "",
    });
  });

  it("tudo apagado volta a ser linha em branco", () => {
    expect(rubricaComEdicao(resolvida, { nome: "", posto: "", funcao: "" })).toBeNull();
  });

  it("pontas sem espaço e no máximo o limite", () => {
    const longo = "A".repeat(LIMITE_DO_CAMPO + 50);
    expect(rubricaComEdicao(resolvida, { nome: `  ${longo}  ` })?.nome).toHaveLength(
      LIMITE_DO_CAMPO,
    );
  });
});

describe("o endereço da impressão leva a edição, e só ela", () => {
  const recorte = { semana: 41, ano: 2026 } as const;

  it("sem edição, o endereço é o de sempre — nenhum parâmetro de assinatura", () => {
    const href = enderecoDaImpressaoDoDsa("C-Ap-FR T1 2026", recorte);
    expect(href).toBe("/print/dsa?turma=C-Ap-FR+T1+2026&semana=41&ano=2026");
    expect(edicaoDaImpressaoDoDsa(consultaDe(href))).toEqual({});
  });

  it("⚠️ ida e volta com os caracteres que quebram codificação", () => {
    const edicao: EdicaoDasAssinaturas = {
      esquerda: { nome: "JOÃO & MARIA #1 + 50% ção", posto: "Primeiro-Tenente (RM2-T)" },
      direita: { funcao: "" },
    };
    const href = enderecoDaImpressaoDoDsa("C-Ap-FR T1 2026", { ...recorte, assinaturas: edicao });
    const lida = edicaoDaImpressaoDoDsa(consultaDe(href));
    expect(lida).toEqual(edicao);
    // E os parâmetros de sempre continuam intactos ao lado deles.
    expect(consultaDe(href).turma).toBe("C-Ap-FR T1 2026");
    expect(consultaDe(href).semana).toBe("41");
  });

  it("o servidor corta o que chega maior que o limite, mesmo por endereço montado à mão", () => {
    const lida = edicaoDaImpressaoDoDsa({
      [PARAMETRO_DA_ASSINATURA.direita.nome]: "B".repeat(500),
    });
    expect(lida.direita?.nome).toHaveLength(LIMITE_DO_CAMPO);
  });

  it("parâmetro repetido: vale o primeiro", () => {
    const lida = edicaoDaImpressaoDoDsa({
      [PARAMETRO_DA_ASSINATURA.esquerda.nome]: ["UM", "DOIS"],
    });
    expect(lida.esquerda?.nome).toBe("UM");
  });
});

describe("a folha da tela, desenhada", () => {
  it("sem edição: a prévia é a resolvida e o Imprimir vai ao endereço de sempre", () => {
    const html = renderToStaticMarkup(
      createElement(
        EdicaoDasAssinaturasNaTela,
        null,
        createElement(BotaoImprimir, { codigo: "T 1", semana: 41, ano: 2026, sabado: false }),
        createElement(RubricaEditavel, {
          lado: "direita",
          titulo: "assinatura à direita",
          resolvida: rubricaResolvida(FIXA, null),
        }),
      ),
    );
    expect(html).toContain('href="/print/dsa?turma=T+1&amp;semana=41&amp;ano=2026"');
    expect(html).toContain('data-assinatura-editada="nao"');
    expect(html).toContain("Capitão de Corveta FULANO DE TAL");
    expect(html).toContain("Editar para esta impressão");
  });
});

describe("item 3 · o «lançado à frente» saiu da TELA e do PAPEL", () => {
  const semComentario = (fonte: string) =>
    fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
  const ler = (caminho: string) =>
    semComentario(readFileSync(resolve(process.cwd(), caminho), "utf8"));

  it("a grade e o rodapé da tela não escrevem a marca", () => {
    expect(ler("components/ciaara/grade-dsa.tsx")).not.toMatch(
      /lançad[oa]s? à frente|lancadoAFrente/,
    );
    expect(ler("app/(app)/turmas/[turma]/dsa/DocumentoNaTela.tsx")).not.toMatch(
      /aFrente|ainda não chegaram/,
    );
  });

  it("⚠️ e o papel também não — tela e papel iguais (dúvida 2 do PR #40)", () => {
    expect(ler("app/print/dsa/DocumentoDoDsa.tsx")).not.toMatch(/dsa-a-frente|ainda não chegaram/);
  });

  it("controle positivo: a varredura enxerga o arquivo — ele escreve a nota do Estudo Individual", () => {
    expect(ler("app/print/dsa/DocumentoDoDsa.tsx")).toContain('data-slot="dsa-nota-do-ei"');
  });
});

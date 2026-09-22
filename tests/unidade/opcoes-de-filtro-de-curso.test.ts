/**
 * A ordem e a marca das opções de curso do filtro de instrutores (`FR-017.10` da spec 009).
 *
 * ⚠️ **ESTA REGRA NASCEU DE UMA MUDANÇA DE BANCO, E NÃO DE UM PEDIDO DE TELA.** Até a migration 7 da
 * fatia (a) do Épico 5, `app.cursos_do_usuario()` filtrava `status = 'ativo'` e curso inativo nunca
 * chegava ao filtro. A migration tirou esse filtro de propósito (`FR-017.1`: desativar tira de
 * OFERTA, não de VISTA), e a decisão registrada é que aqui o curso arquivado **continua aparecendo**
 * — filtrar instrutor por curso arquivado é consulta sobre histórico —, mas **no fim e marcado**.
 *
 * ⚠️ **E É POR ISSO QUE O TESTE DE UNIDADE EXISTE**: a prova de ponta a ponta mede a tela com UM
 * curso inativo, e não consegue distinguir "os inativos vão para o fim" de "este curso foi para o
 * fim". A ordenação só se observa com vários, em ordem embaralhada na entrada.
 */
import { describe, expect, it } from "vitest";

import { opcoesDosFiltros } from "@/app/(app)/instrutores/opcoes";

const SEM_ESCALA = { ordem: new Map<string, number>() } as never;

const so = (cursos: readonly { codigo: string; status?: string | null }[]) =>
  opcoesDosFiltros([], cursos, SEM_ESCALA).curso;

describe("`FR-017.10` · curso inativo no filtro: presente, no fim e marcado", () => {
  it("os ativos vêm primeiro, em ordem de sigla, com o rótulo igual ao valor", () => {
    const opcoes = so([
      { codigo: "C-Exp-BATI", status: "ativo" },
      { codigo: "C-Ap-FR", status: "ativo" },
    ]);
    expect(opcoes).toEqual([
      { valor: "C-Ap-FR", rotulo: "C-Ap-FR" },
      { valor: "C-Exp-BATI", rotulo: "C-Exp-BATI" },
    ]);
  });

  it("⚠️ o inativo NÃO some — ele entra, no fim, e marcado", () => {
    const opcoes = so([
      { codigo: "C-Ap-FR", status: "ativo" },
      { codigo: "C-Esp-ALH", status: "inativo" },
    ]);
    expect(opcoes.map((o) => o.valor)).toContain("C-Esp-ALH");
    expect(opcoes.at(-1)).toEqual({ valor: "C-Esp-ALH", rotulo: "C-Esp-ALH — inativo" });
  });

  it("⚠️ VÁRIOS de cada, embaralhados: todo inativo fica depois de todo ativo", () => {
    /*
     * A entrada vem propositalmente fora de ordem e alternando situação. Uma implementação que só
     * empurrasse "o último inativo" para o fim, ou que confiasse no `order("codigo")` do banco,
     * passa nos dois casos acima e reprova aqui.
     */
    const opcoes = so([
      { codigo: "C-Esp-Z", status: "inativo" },
      { codigo: "C-Ap-M", status: "ativo" },
      { codigo: "C-Esp-A", status: "inativo" },
      { codigo: "C-Ap-B", status: "ativo" },
    ]);
    expect(opcoes.map((o) => o.valor)).toEqual(["C-Ap-B", "C-Ap-M", "C-Esp-A", "C-Esp-Z"]);
    expect(opcoes.map((o) => o.rotulo.includes("— inativo"))).toEqual([false, false, true, true]);
  });

  it("curso sem `status` informado é tratado como ativo — degradação segura", () => {
    /*
     * `RN-DEG-01`: a coluna é opcional no tipo porque há telas que não a consultam. Quem não a manda
     * recebe o comportamento de antes, em vez de ver todos os cursos marcados como inativos.
     */
    const opcoes = so([{ codigo: "C-Ap-HN" }]);
    expect(opcoes).toEqual([{ valor: "C-Ap-HN", rotulo: "C-Ap-HN" }]);
  });
});

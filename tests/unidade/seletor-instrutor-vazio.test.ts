/**
 * FR-006 (spec 029, Bloco 14, item 6 — `PEND-026-2`): o seletor de instrutor **vazio** diz o motivo certo.
 *
 * > *"O `SeletorInstrutor` exige de quem chama o motivo do vazio: **«você não vê»** (perfil sem `instrutores.ler`,
 * > frase do componente) ou **«não há»** com a frase do chamador — disciplina sem habilitado, ninguém atribuído,
 * > escolha a disciplina."* — spec 029, FR-006.1
 *
 * ⚠️ **A PREMISSA DA PENDÊNCIA ESTAVA INVERTIDA**, medido na `main` `07d84c3`: `motivoDoVazio` tinha padrão `sem-dado` e
 *    nenhum chamador passava outro valor. *"O seu perfil não os alcança"* nunca aparecia; todo vazio dizia *"Nada
 *    cadastrado ainda"*, inclusive o que vem de FILTRO (disciplina sem habilitado no TA fora do DSA, ninguém atribuído
 *    no rateio por UE) — e havia instrutor cadastrado.
 * ⚠️ **`vazio` É OBRIGATÓRIA** (plan.md §4), pela razão do `motivo` do `EstadoVazio`: o `tsc` cobra a declaração em todo
 *    chamador. O último caso prova isso no TIPO (`@ts-expect-error`), que o Vitest não confere: quem confere é o `tsc`.
 * ⚠️ **COMPACTO** (D-15): dentro de formulário e de diálogo, uma frase `role="status"` com `data-motivo` — não a caixa
 *    de página do `EstadoVazio` (`data-slot="estado-vazio"`, tracejada), repetida por UE no rateio.
 * ⚠️ Como em `tabela-densa-controlada.test.ts`: a leitura se prova aqui, com a renderização de servidor do próprio
 *    React; o clique, em `tests/e2e/ta-fora-do-dsa.spec.ts`.
 */
import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SeletorInstrutor,
  type SeletorInstrutorProps,
} from "@/components/ciaara/seletor-instrutor";
import type { EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";

const ESCALA: EscalaDeAntiguidade = { CT: 10, "1T": 9 };

/** A frase do «não há» que o TA fora do DSA passa — a da D-32, escrita aqui por extenso (o dono é do domínio). */
const SEM_HABILITADO =
  "Nenhum instrutor habilitado nesta disciplina. A habilitação é feita na ficha do instrutor.";
const VOCE_NAO_VE = "o seu perfil não os alcança";

/** O título da caixa de página do `EstadoVazio` — o que a tela dizia quando o vazio vinha de filtro. */
const NADA_CADASTRADO = "Nada cadastrado ainda";
/** O detalhe genérico de antes, que não dizia motivo nenhum. */
const DETALHE_GENERICO = "Nenhum instrutor disponível para escolher.";

function desenhar(extra: Partial<SeletorInstrutorProps>): string {
  return renderToStaticMarkup(
    createElement(SeletorInstrutor, {
      instrutores: [],
      escala: ESCALA,
      aoMudar: () => undefined,
      rotulo: "Instrutor do TA fora do DSA",
      vazio: { motivo: "sem-dado", detalhe: SEM_HABILITADO },
      ...extra,
    }),
  );
}

const vezes = (marcacao: string, trecho: string) => marcacao.split(trecho).length - 1;

describe("FR-006.1 · «não há»: a frase é a de quem chama, e o vazio deixa de dizer «Nada cadastrado ainda»", () => {
  it("disciplina sem habilitado: a frase da habilitação, e nunca «Nada cadastrado ainda»", () => {
    const html = desenhar({ vazio: { motivo: "sem-dado", detalhe: SEM_HABILITADO } });
    expect(html, "o vazio não disse o motivo do chamador").toContain(
      "Nenhum instrutor habilitado nesta disciplina",
    );
    expect(html, "o vazio de FILTRO ainda diz que não há cadastro").not.toContain(NADA_CADASTRADO);
    expect(html, "o detalhe genérico, sem motivo, continua").not.toContain(DETALHE_GENERICO);
    expect(html).toContain('data-motivo="sem-dado"');
    expect(html, "o «não há» não pode dizer o «você não vê»").not.toContain(VOCE_NAO_VE);
  });

  it("a ação do chamador (o caminho clicável) sai junto da frase", () => {
    const html = desenhar({
      vazio: {
        motivo: "sem-dado",
        detalhe: SEM_HABILITADO,
        acao: createElement("a", { href: "/instrutores" }, "abrir a lista de instrutores"),
      },
    });
    expect(html).toContain('href="/instrutores"');
    expect(html).toContain("abrir a lista de instrutores");
  });
});

describe("FR-006.1 · «você não vê»: a frase é do componente, e ela finalmente aparece", () => {
  it('sem `instrutores.ler`: «o seu perfil não os alcança», com `data-motivo="sem-permissao"`', () => {
    const html = desenhar({ vazio: { motivo: "sem-permissao" } });
    expect(html, "a frase do «você não vê» não aparece — era o defeito medido").toContain(
      VOCE_NAO_VE,
    );
    expect(html).toContain('data-motivo="sem-permissao"');
    expect(html).not.toContain(NADA_CADASTRADO);
    expect(html, "o «você não vê» não pode dizer o «não há» do chamador").not.toContain(
      "Nenhum instrutor habilitado",
    );
  });
});

describe("DoD 8 · o caso que discrimina: a MESMA lista vazia, dois motivos, duas frases", () => {
  it("só o motivo muda — e o que a tela diz muda com ele", () => {
    const naoHa = desenhar({ vazio: { motivo: "sem-dado", detalhe: SEM_HABILITADO } });
    const voceNaoVe = desenhar({ vazio: { motivo: "sem-permissao" } });
    expect(naoHa, "os dois motivos dão o MESMO vazio: o motivo não chega à tela").not.toBe(
      voceNaoVe,
    );
    expect(naoHa).toContain("Nenhum instrutor habilitado nesta disciplina");
    expect(naoHa).not.toContain(VOCE_NAO_VE);
    expect(voceNaoVe).toContain(VOCE_NAO_VE);
    expect(voceNaoVe).not.toContain("Nenhum instrutor habilitado nesta disciplina");
  });
});

describe('D-15 · o vazio é COMPACTO: uma frase com `role="status"` e `data-motivo`, não a caixa de página', () => {
  it.each([
    ["«não há»", { motivo: "sem-dado", detalhe: SEM_HABILITADO }],
    ["«você não vê»", { motivo: "sem-permissao" }],
  ] as const)("%s", (_, vazio) => {
    const html = desenhar({ vazio });
    expect(vezes(html, 'role="status"'), "o vazio não se anuncia (ou se anuncia duas vezes)").toBe(
      1,
    );
    expect(html).toContain(`data-motivo="${vazio.motivo}"`);
    expect(html, "a caixa de página do EstadoVazio dentro do campo").not.toContain(
      'data-slot="estado-vazio"',
    );
    expect(html, "a caixa tracejada de página dentro do campo").not.toContain("border-dashed");
    expect(html, "o título da caixa de «sem permissão»").not.toContain(
      "Você não tem acesso a este conteúdo",
    );
  });
});

describe("controle positivo · com instrutor na lista, o seletor é o de sempre e o `vazio` não aparece", () => {
  it("o gatilho de escolha, sem frase de vazio", () => {
    const html = desenhar({
      instrutores: [
        {
          id: "i-1",
          pg: "CT",
          especialidade: null,
          nomeCompleto: "Fulano de Tal",
          nomeDeGuerra: null,
        },
      ],
      vazio: { motivo: "sem-dado", detalhe: SEM_HABILITADO },
    });
    expect(html).toContain('data-slot="seletor-instrutor"');
    expect(html).not.toContain("data-motivo");
    expect(html).not.toContain("Nenhum instrutor habilitado nesta disciplina");
  });
});

describe("plan.md §4 · `vazio` é OBRIGATÓRIA e discriminada (provado pelo `tsc`)", () => {
  it("sem `vazio`, no «não há» sem frase e no «você não vê» com frase, a chamada não compila", () => {
    // @ts-expect-error — sem `vazio`, não compila: o seletor não escolhe o motivo por padrão.
    const semVazio: SeletorInstrutorProps = { instrutores: [], escala: ESCALA, aoMudar: () => 0 };
    // @ts-expect-error — no «não há» a frase é de quem chama: sem `detalhe`, não compila.
    const naoHaSemFrase: SeletorInstrutorProps["vazio"] = { motivo: "sem-dado" };
    const voceNaoVeComFrase: SeletorInstrutorProps["vazio"] = {
      motivo: "sem-permissao",
      // @ts-expect-error — no «você não vê» a frase é do componente: quem chama não a escreve.
      detalhe: "frase do chamador",
    };
    expect([semVazio.instrutores, naoHaSemFrase, voceNaoVeComFrase]).toHaveLength(3);
  });
});

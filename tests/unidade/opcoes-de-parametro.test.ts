/**
 * As opções da biblioteca saem do contrato, e não da tela (`FR-002`, `FR-004`, `FR-004.1`,
 * `FR-005`, `FR-045`).
 *
 * ⚠️ ESTES SÃO OS QUATRO ERROS QUE NÃO QUEBRAM NADA. Cada caso aqui corresponde a uma opção que, se
 * esquecida, deixa a tela funcionando e o comportamento errado: o botão voltar sem efeito, o número
 * velho na tela, a URL suja no link compartilhado, oito idas ao servidor por palavra digitada.
 * Nenhum deles aparece na checagem de tipos, e todos sobrevivem a uma revisão de código atenta.
 *
 * ⚠️ O GANCHO EM SI NÃO É TESTADO AQUI — ele precisa de navegador, e quem o exercita é a suíte de
 * ponta a ponta. O que se testa aqui é a **derivação**, que é onde a decisão mora.
 */
import { describe, expect, it } from "vitest";

import {
  descritor,
  parametrosDaImpressaoDe,
  parametrosDaRota,
  CONTRATO,
} from "@/lib/navegacao/contrato";
import { opcoesDoParametro } from "@/lib/navegacao/usar-parametro";

describe("`FR-004` · o histórico vem do descritor, não da chamada", () => {
  it("contexto empilha", () => {
    expect(opcoesDoParametro(descritor("/inicio", "classificacao")).history).toBe("push");
  });

  it("refino substitui", () => {
    expect(opcoesDoParametro(descritor("/estilo", "categoria")).history).toBe("replace");
  });

  it("⚠️ o padrão da biblioteca é SUBSTITUIR, e por isso `empilha` precisa ser explícito", () => {
    // Sem este caso, alguém "simplificaria" a derivação omitindo `history` e a tela de contexto
    // perderia o botão voltar sem que nenhum tipo, lint ou teste de URL reclamasse.
    const contexto = opcoesDoParametro(descritor("/estilo", "demo"));
    expect(contexto.history).toBe("push");
    expect(contexto.history).not.toBe(undefined);
  });
});

describe("`FR-004.1` · `shallow` é o aviso ao servidor, INVERTIDO", () => {
  it("quem alimenta consulta avisa o servidor", () => {
    expect(opcoesDoParametro(descritor("/inicio", "modalidade")).shallow).toBe(false);
  });

  it("quem é puramente visual não avisa", () => {
    expect(opcoesDoParametro(descritor("/estilo", "demo")).shallow).toBe(true);
  });

  it("⚠️ nenhum parâmetro tem `shallow` igual a `avisaServidor` — seria o erro silencioso", () => {
    // Copiar em vez de inverter dá uma URL certa com consulta velha. O nome da opção convida ao erro.
    for (const rota of Object.keys(CONTRATO) as (keyof typeof CONTRATO)[]) {
      for (const p of parametrosDaRota(rota)) {
        expect(opcoesDoParametro(p).shallow, `${p.nome} copiou em vez de inverter`).toBe(
          !p.avisaServidor,
        );
      }
    }
  });
});

describe("`FR-002` · o padrão some da URL", () => {
  it("todo parâmetro do contrato limpa no padrão", () => {
    for (const rota of Object.keys(CONTRATO) as (keyof typeof CONTRATO)[]) {
      for (const p of parametrosDaRota(rota)) {
        expect(opcoesDoParametro(p).clearOnDefault, `${p.nome} deixaria lixo na URL`).toBe(true);
      }
    }
  });
});

describe("`FR-005` · o limite de frequência só existe onde foi declarado", () => {
  it("a busca tem limite", () => {
    expect(opcoesDoParametro(descritor("/estilo", "busca")).limitUrlUpdates).toBeDefined();
  });

  it("um filtro de escolha não tem — clicar não é digitar", () => {
    expect(opcoesDoParametro(descritor("/estilo", "categoria")).limitUrlUpdates).toBeUndefined();
  });
});

describe("`FR-045` · a transição só vai para quem tem espera a mostrar", () => {
  const nada = () => {};

  it("com transição entregue, ela aparece nas opções", () => {
    expect(opcoesDoParametro(descritor("/inicio", "classificacao"), nada).startTransition).toBe(
      nada,
    );
  });

  it("sem transição entregue, a chave nem existe", () => {
    // ⚠️ `exactOptionalPropertyTypes` está ligado: entregar `undefined` não é o mesmo que omitir.
    expect("startTransition" in opcoesDoParametro(descritor("/inicio", "classificacao"))).toBe(
      false,
    );
  });
});

describe("`FR-035` · a rota de impressão herda, e nenhuma existe ainda", () => {
  it("o contrato não declara rota de impressão alguma — é reserva, não implementação", () => {
    const impressao = Object.keys(CONTRATO).filter((r) => r.startsWith("/print"));
    expect(impressao, `rota de impressão entrou cedo: ${impressao.join(", ")}`).toEqual([]);
  });

  it("a herança é delegação pura: nada é traduzido nem recortado", () => {
    expect(parametrosDaImpressaoDe("/inicio")).toEqual(parametrosDaRota("/inicio"));
    expect(parametrosDaImpressaoDe("/estilo")).toEqual(parametrosDaRota("/estilo"));
  });
});

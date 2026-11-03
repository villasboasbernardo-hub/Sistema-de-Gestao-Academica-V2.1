/**
 * Bloco 18 (spec 033), RA-1 · FR-001.3 e FR-001.4 — o catálogo de tipos de atividade na Administração: o que aparece,
 * o que se edita, quantos lançamentos mudam quando a classificação padrão muda, e o *Excluir* indisponível.
 *
 * > *"Catálogo de tipos de atividade (lista do sistema, Admin edita) (…) Cada tipo tem classificação PADRÃO
 * > (AEC/TAD/TR), que o operador pode trocar no lançamento."* — Bernardo Villas Boas, 03/11/2026 (RA-1)
 *
 * O caso que discrimina (DoD 8): o lançamento com «Conta como» AEC/TAD/TR escolhido NÃO entra no «mudam» — é a linha que
 * a M2 passou a pular em `app.recategorizar_pelo_tipo`; sem a escolha, ele entraria.
 */
import { describe, expect, it } from "vitest";

import {
  contagemDoTipo,
  contagemPorTipo,
  dicaDoExcluirDoTipo,
  DICA_DO_EXCLUIR_COM_LANCAMENTO,
  DICA_DO_EXCLUIR_SEM_LANCAMENTO,
  efeitoDaTroca,
  ehClassificacaoDoCatalogo,
  fraseDoEfeito,
  proximaOrdem,
  tipoComOMesmoNome,
  tiposDoCatalogo,
  type LinhaDoCatalogo,
} from "@/lib/dominio/atividades/catalogo-de-tipos";

const linha = (parcial: Partial<LinhaDoCatalogo> & Pick<LinhaDoCatalogo, "id" | "valor">): LinhaDoCatalogo => ({
  rotulo: parcial.valor,
  ativo: true,
  ordem: 0,
  metadados: { categoria: "AEC" },
  ...parcial,
});

describe("RA-1 · o que o catálogo mostra", () => {
  const linhas: LinhaDoCatalogo[] = [
    linha({ id: "a", valor: "Aula Teórica", ordem: 900, metadados: { uso: "aula" } }),
    linha({ id: "b", valor: "Licença de Pagamento", ordem: 11, metadados: {}, ativo: false }),
    linha({ id: "c", valor: "Palestra", ordem: 5 }),
    linha({
      id: "d",
      valor: "Atividade Extracurricular",
      rotulo: "Atividade Extraclasse",
      ordem: 6,
    }),
    linha({ id: "e", valor: "Monitoria", ordem: 920, metadados: { categoria: "Apoio_Individualizado" } }),
    linha({ id: "f", valor: "Estudo Individual", ordem: 919, metadados: { categoria: "Estudo_Individual" } }),
    linha({ id: "g", valor: "Tempo Reserva", ordem: 10, metadados: { categoria: "TR" }, ativo: false }),
  ];

  it("só os tipos DE ATIVIDADE: os de aula e os sem categoria ficam fora", () => {
    expect(tiposDoCatalogo(linhas).map((t) => t.valor)).toEqual([
      "Palestra",
      "Atividade Extracurricular",
      "Tempo Reserva",
      "Estudo Individual",
      "Monitoria",
    ]);
  });

  it("o rótulo na tela, com a chave ao lado quando difere (decisão 4)", () => {
    const extraclasse = tiposDoCatalogo(linhas).find((t) => t.id === "d");
    expect(extraclasse?.rotulo).toBe("Atividade Extraclasse");
    expect(extraclasse?.chaveDiferente).toBe(true);
    expect(tiposDoCatalogo(linhas).find((t) => t.id === "c")?.chaveDiferente).toBe(false);
  });

  it("⚠️ Estudo Individual e Apoio Individualizado aparecem SÓ PARA LER (decisão 2); AEC, TAD e TR se editam", () => {
    const porId = new Map(tiposDoCatalogo(linhas).map((t) => [t.id, t]));
    expect(porId.get("c")?.editavel).toBe(true);
    expect(porId.get("g")?.editavel).toBe(true);
    expect(porId.get("e")?.editavel).toBe(false);
    expect(porId.get("f")?.editavel).toBe(false);
  });

  it("o desativado continua na lista (regra 4: desativar não é sumir)", () => {
    expect(tiposDoCatalogo(linhas).find((t) => t.id === "g")?.ativo).toBe(false);
  });

  it("as classificações do catálogo são AEC, TAD e TR, e só elas", () => {
    expect(["AEC", "TAD", "TR"].every((c) => ehClassificacaoDoCatalogo(c))).toBe(true);
    expect(ehClassificacaoDoCatalogo("Estudo_Individual")).toBe(false);
    expect(ehClassificacaoDoCatalogo("CHD")).toBe(false);
    expect(ehClassificacaoDoCatalogo(null)).toBe(false);
  });
});

describe("FR-001.3 · quantos lançamentos mudam quando a classificação padrão muda", () => {
  const contagens = contagemPorTipo([
    { tipoId: "p", contaComo: null },
    { tipoId: "p", contaComo: null },
    { tipoId: "p", contaComo: "CHD" },
    { tipoId: "p", contaComo: "TAD" },
    { tipoId: "q", contaComo: null },
    { tipoId: null, contaComo: null },
  ]);

  it("a contagem separa quem segue o tipo, o «TA da disciplina» e quem escolheu", () => {
    expect(contagemDoTipo(contagens, "p")).toEqual({
      total: 4,
      seguemOTipo: 2,
      taDaDisciplina: 1,
      comEscolha: 1,
    });
    expect(contagemDoTipo(contagens, "q").total).toBe(1);
    expect(contagemDoTipo(contagens, "sem-lancamento")).toEqual({
      total: 0,
      seguemOTipo: 0,
      taDaDisciplina: 0,
      comEscolha: 0,
    });
  });

  it("⚠️ o caso que discrimina: o «Conta como» escolhido NÃO muda — é a linha que o gatilho pula", () => {
    const efeito = efeitoDaTroca("AEC", "TAD", contagemDoTipo(contagens, "p"));
    expect(efeito).toEqual({ mudam: 2, taDaDisciplina: 1, ficamPelaEscolha: 1 });
  });

  it("sem troca de classificação, nada muda (o gatilho não roda)", () => {
    expect(efeitoDaTroca("AEC", "AEC", contagemDoTipo(contagens, "p"))).toBeNull();
    expect(fraseDoEfeito("AEC", "AEC", contagemDoTipo(contagens, "p"))).toContain("nenhum lançamento é tocado");
  });

  it("a frase do diálogo diz os números, antes de gravar", () => {
    const frase = fraseDoEfeito("AEC", "TAD", contagemDoTipo(contagens, "p"));
    expect(frase).toContain("2 lançamentos passam de AEC para TAD.");
    expect(frase).toContain("1 lançamento com «Conta como» TA da disciplina continua na CHD.");
    expect(frase).toContain("1 lançamento com «Conta como» escolhido no lançamento fica como está.");
    expect(fraseDoEfeito("TR", "AEC", contagemDoTipo(contagens, "q"))).toBe("1 lançamento passa de TR para AEC.");
  });

  it("tipo sem lançamento: a frase diz que nada muda", () => {
    expect(fraseDoEfeito("TAD", "TR", contagemDoTipo(contagens, "sem-lancamento"))).toBe(
      "Nenhum lançamento muda de categoria: este tipo não tem lançamento ativo.",
    );
  });

  it("⚠️ contagem que não pôde ser lida não vira zero (gotcha 4)", () => {
    const frase = fraseDoEfeito("AEC", "TR", null);
    expect(frase).toContain("Não foi possível contar");
    expect(frase).not.toContain("Nenhum lançamento");
  });
});

describe("FR-001.4 · Excluir indisponível, com o motivo (regra 4)", () => {
  it("com lançamento: «tem registros: use Desativar»", () => {
    expect(dicaDoExcluirDoTipo(3)).toBe(DICA_DO_EXCLUIR_COM_LANCAMENTO);
    expect(DICA_DO_EXCLUIR_COM_LANCAMENTO).toBe("tem registros: use Desativar");
  });

  it("sem lançamento: não há exceção à regra 4 para o catálogo", () => {
    expect(dicaDoExcluirDoTipo(0)).toBe(DICA_DO_EXCLUIR_SEM_LANCAMENTO);
    expect(DICA_DO_EXCLUIR_SEM_LANCAMENTO).toBe("sem exceção à regra 4: use Desativar");
  });

  it("⚠️ sem contagem, a dica NÃO afirma que há registro (nem que não há): vale a regra 4", () => {
    expect(dicaDoExcluirDoTipo(null)).toBe(DICA_DO_EXCLUIR_SEM_LANCAMENTO);
  });
});

describe("Novo tipo · a ordem e o nome repetido", () => {
  it("a ordem vai para o fim da lista", () => {
    expect(proximaOrdem([1, 900, 939, 5])).toBe(940);
    expect(proximaOrdem([])).toBe(1);
    expect(proximaOrdem([32_767])).toBe(32_767);
  });

  it("o nome repetido se acha sem acento, sem caixa e pelo rótulo também", () => {
    const tipos = [
      { valor: "Palestra", rotulo: "Palestra" },
      { valor: "Atividade Extracurricular", rotulo: "Atividade Extraclasse" },
      { valor: "Reforço", rotulo: null },
    ];
    expect(tipoComOMesmoNome("  palestra ", tipos)?.valor).toBe("Palestra");
    expect(tipoComOMesmoNome("atividade  extraclasse", tipos)?.valor).toBe("Atividade Extracurricular");
    expect(tipoComOMesmoNome("REFORCO", tipos)?.valor).toBe("Reforço");
    expect(tipoComOMesmoNome("Visita de estudo", tipos)).toBeNull();
  });
});

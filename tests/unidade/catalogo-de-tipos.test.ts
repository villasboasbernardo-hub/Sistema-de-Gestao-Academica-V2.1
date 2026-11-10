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
  impedimentoDaTroca,
  proximaOrdem,
  tipoComOMesmoNome,
  tiposDoCatalogo,
  type LinhaDoCatalogo,
} from "@/lib/dominio/atividades/catalogo-de-tipos";

const linha = (
  parcial: Partial<LinhaDoCatalogo> & Pick<LinhaDoCatalogo, "id" | "valor">,
): LinhaDoCatalogo => ({
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
    linha({
      id: "e",
      valor: "Monitoria",
      ordem: 920,
      metadados: { categoria: "Apoio_Individualizado" },
    }),
    linha({
      id: "f",
      valor: "Estudo Individual",
      ordem: 919,
      metadados: { categoria: "Estudo_Individual" },
    }),
    linha({
      id: "g",
      valor: "Tempo Reserva",
      ordem: 10,
      metadados: { categoria: "TR" },
      ativo: false,
    }),
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
      emTurmaArquivada: 0,
      comDisciplina: 0,
    });
    expect(contagemDoTipo(contagens, "q").total).toBe(1);
    expect(contagemDoTipo(contagens, "sem-lancamento")).toEqual({
      total: 0,
      seguemOTipo: 0,
      taDaDisciplina: 0,
      comEscolha: 0,
      emTurmaArquivada: 0,
      comDisciplina: 0,
    });
  });

  it("⚠️ o caso que discrimina: o «Conta como» escolhido NÃO muda — é a linha que o gatilho pula", () => {
    const efeito = efeitoDaTroca("AEC", "TAD", contagemDoTipo(contagens, "p"));
    expect(efeito).toEqual({
      mudam: 2,
      taDaDisciplina: 1,
      ficamPelaEscolha: 1,
      ficamNaArquivada: 0,
    });
  });

  it("sem troca de classificação, nada muda (o gatilho não roda)", () => {
    expect(efeitoDaTroca("AEC", "AEC", contagemDoTipo(contagens, "p"))).toBeNull();
    expect(fraseDoEfeito("AEC", "AEC", contagemDoTipo(contagens, "p"))).toContain(
      "nenhum lançamento é tocado",
    );
  });

  it("a frase do diálogo diz os números, antes de gravar", () => {
    const frase = fraseDoEfeito("AEC", "TAD", contagemDoTipo(contagens, "p"));
    expect(frase).toContain("2 lançamentos passam de AEC para TAD.");
    expect(frase).toContain("1 lançamento com «Conta como» TA da disciplina continua na CHD.");
    expect(frase).toContain(
      "1 lançamento com «Conta como» escolhido no lançamento fica como está.",
    );
    expect(fraseDoEfeito("TR", "AEC", contagemDoTipo(contagens, "q"))).toBe(
      "1 lançamento passa de TR para AEC.",
    );
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

describe("FR-001.3 · a turma ARQUIVADA fica como está (RT-8; achado da revisão)", () => {
  const contagens = contagemPorTipo([
    { tipoId: "p", contaComo: null },
    { tipoId: "p", contaComo: null, turmaArquivada: true },
    { tipoId: "p", contaComo: "CHD", turmaArquivada: true },
    { tipoId: "p", contaComo: "TAD", turmaArquivada: true },
    { tipoId: "p", contaComo: "CHD" },
  ]);

  it("⚠️ o caso que discrimina: a linha de turma arquivada NÃO entra no «mudam» — a recategorização a pula", () => {
    const c = contagemDoTipo(contagens, "p");
    expect(c.total).toBe(5);
    expect(c.seguemOTipo).toBe(1);
    expect(c.taDaDisciplina).toBe(1);
    expect(c.comEscolha).toBe(0);
    expect(c.emTurmaArquivada).toBe(3);
    expect(efeitoDaTroca("AEC", "TR", c)).toEqual({
      mudam: 1,
      taDaDisciplina: 1,
      ficamPelaEscolha: 0,
      ficamNaArquivada: 3,
    });
  });

  it("o diálogo diz à parte os que ficam na turma arquivada", () => {
    const frase = fraseDoEfeito("AEC", "TR", contagemDoTipo(contagens, "p"));
    expect(frase).toContain("1 lançamento passa de AEC para TR.");
    expect(frase).toContain("3 lançamentos em turma arquivada ficam como estão.");
  });

  it("tipo só com lançamento em turma arquivada: o diálogo NÃO diz «não tem lançamento ativo»", () => {
    const so = contagemPorTipo([{ tipoId: "x", contaComo: null, turmaArquivada: true }]);
    const frase = fraseDoEfeito("AEC", "TAD", contagemDoTipo(so, "x"));
    expect(frase).not.toContain("não tem lançamento ativo");
    expect(frase).toContain("1 lançamento em turma arquivada fica como está.");
  });
});

describe("FR-001.3 · os lançamentos com disciplina e o rascunho na contagem (achados da revisão)", () => {
  it("conta quem segue o tipo E tem disciplina, fora da turma arquivada — o que o CHECK recusaria", () => {
    const c = contagemDoTipo(
      contagemPorTipo([
        { tipoId: "p", contaComo: null, id: "a", comDisciplina: true },
        { tipoId: "p", contaComo: null, id: "b", comDisciplina: false },
        // «TA da disciplina» pode ter disciplina: o CHECK a aceita.
        { tipoId: "p", contaComo: "CHD", id: "c", comDisciplina: true },
        // A escolha AEC fica AEC: o gatilho a pula.
        { tipoId: "p", contaComo: "AEC", id: "d", comDisciplina: true },
        // A da turma arquivada o gatilho também pula.
        { tipoId: "p", contaComo: null, id: "e", comDisciplina: true, turmaArquivada: true },
      ]),
      "p",
    );
    expect(c.comDisciplina).toBe(1);
  });

  it("⚠️ o rascunho entra no impedimento (o gatilho o toca), mas não no total nem no «mudam» (RP-8)", () => {
    const c = contagemDoTipo(
      contagemPorTipo([
        { tipoId: "p", contaComo: null, id: "salvo", comDisciplina: true },
        // A sombra do rascunho do MESMO lançamento: não soma duas vezes.
        {
          tipoId: "p",
          contaComo: null,
          id: "sombra",
          comDisciplina: true,
          salvo: false,
          rascunhoDe: "salvo",
        },
        // Um rascunho NOVO (sem salvo de que seja sombra): é outro lançamento.
        { tipoId: "p", contaComo: null, id: "novo", comDisciplina: true, salvo: false },
      ]),
      "p",
    );
    expect(c.comDisciplina).toBe(2);
    expect(c.total).toBe(1);
    expect(c.seguemOTipo).toBe(1);
  });

  it("tipo só com rascunho: o total é zero, mas o impedimento aparece", () => {
    const c = contagemDoTipo(
      contagemPorTipo([
        { tipoId: "r", contaComo: null, id: "x", comDisciplina: true, salvo: false },
      ]),
      "r",
    );
    expect(c.total).toBe(0);
    expect(c.comDisciplina).toBe(1);
  });
});

describe("FR-001.3 · o que IMPEDE a troca da classificação (achados da revisão)", () => {
  const nada = { previstasAtivas: 0, comDisciplina: 0 };

  it("sem troca, nada impede", () => {
    expect(impedimentoDaTroca("AEC", "AEC", { previstasAtivas: 3, comDisciplina: 2 })).toBeNull();
  });

  it("sem previstas nem lançamento com disciplina, a troca vai ao banco", () => {
    expect(impedimentoDaTroca("AEC", "TAD", nada)).toBeNull();
    expect(impedimentoDaTroca("TAD", "TR", nada)).toBeNull();
  });

  it("⚠️ AEC prevista ATIVA com o tipo: tirar o tipo da AEC é recusado, com a contagem e os cursos", () => {
    const frase = impedimentoDaTroca("AEC", "TAD", {
      previstasAtivas: 4,
      cursosDasPrevistas: ["C-Ap-HN", "CAHO", "C-Ap-HN", "C-Ap-FR", "C-Esp-ME", ""],
      comDisciplina: 0,
    });
    expect(frase).toContain("Este tipo é usado por 4 AEC previstas ativas de currículo");
    // Os nomes, sem repetir e sem o vazio, até três — e «e mais N».
    expect(frase).toContain("e mais 1)");
    expect(frase).toContain("Editar curso → Currículo → Atividades e limites");
  });

  it("uma prevista só: a frase no singular", () => {
    const frase = impedimentoDaTroca("AEC", "TR", { previstasAtivas: 1, comDisciplina: 0 });
    expect(frase).toContain("Este tipo é usado por 1 AEC prevista ativa de currículo,");
    expect(frase).toContain("troque o tipo dela ou desative-a");
  });

  it("⚠️ o caso que discrimina: a prevista só impede a troca que TIRA o tipo da AEC (TAD → TR passa, TR → AEC também)", () => {
    expect(impedimentoDaTroca("TAD", "TR", { previstasAtivas: 2, comDisciplina: 0 })).toBeNull();
    expect(impedimentoDaTroca("TR", "AEC", { previstasAtivas: 2, comDisciplina: 0 })).toBeNull();
  });

  it("⚠️ lançamento que segue o tipo com disciplina: a troca para fora da AEC é recusada, dizendo onde procurar", () => {
    const frase = impedimentoDaTroca("AEC", "TAD", {
      previstasAtivas: 0,
      comDisciplina: 2,
      exemploComDisciplina: { turma: "C-Ap-HN 2048", data: "2048-05-10" },
    });
    expect(frase).toContain(
      "2 lançamentos deste tipo (contando os rascunhos) têm disciplina e seguem",
    );
    expect(frase).toContain("(por exemplo, C-Ap-HN 2048 em 10/05/2048)");
    expect(frase).toContain("troque o «Conta como» para TA da disciplina");
  });

  it("a troca PARA a AEC não esbarra na disciplina (a AEC a aceita)", () => {
    expect(impedimentoDaTroca("TAD", "AEC", { previstasAtivas: 0, comDisciplina: 5 })).toBeNull();
  });

  it("os dois impedimentos juntos saem numa frase só", () => {
    const frase = impedimentoDaTroca("AEC", "TR", { previstasAtivas: 1, comDisciplina: 1 });
    expect(frase).toContain("AEC prevista ativa");
    expect(frase).toContain(
      "1 lançamento deste tipo (contando os rascunhos) tem disciplina e segue",
    );
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
    expect(tipoComOMesmoNome("atividade  extraclasse", tipos)?.valor).toBe(
      "Atividade Extracurricular",
    );
    expect(tipoComOMesmoNome("REFORCO", tipos)?.valor).toBe("Reforço");
    expect(tipoComOMesmoNome("Visita de estudo", tipos)).toBeNull();
  });
});

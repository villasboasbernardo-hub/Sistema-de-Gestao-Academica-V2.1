/**
 * A exclusão permanente de turma e de linha do calendário — D-COR-6 (spec 025, D-10 a D-13).
 *
 * > *"Excluir turma e Excluir feriado só habilitados sem semana salva/publicada ligada; com registros, ícone
 * > desabilitado com dica 'tem registros: use Arquivar/Desativar'."* — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **QUEM DECIDE É O BANCO** (`app.impedimentos_de_exclusao_da_turma`, `…_do_feriado`): aqui só se escreve a dica e o
 *    motivo a partir das chaves que ele devolve, e se lê a recusa `23503`.
 * ⚠️ **SEM RESPOSTA DO BANCO, NUNCA LIBERADA** (`RN-DEG-01`): a falta de leitura não é "não tem registro".
 */
import { describe, expect, it } from "vitest";

import { estadoDaExclusaoDoFeriado } from "@/lib/dominio/exclusao-de-feriado";
import { chavesDaRecusaDaTurma, estadoDaExclusaoDaTurma } from "@/lib/dominio/exclusao-de-turma";
import {
  codigoConfere,
  DICA_SEM_LEITURA,
  estadosPorRegistro,
} from "@/lib/dominio/exclusao-permanente";
import {
  enderecoDaEdicaoDoCurso,
  enderecoDaEdicaoDaTurma,
} from "@/lib/navegacao/endereco-de-turma";

describe("D-COR-6 · a turma", () => {
  it("sem registro, a exclusão fica liberada e sem dica de impedimento", () => {
    expect(estadoDaExclusaoDaTurma([])).toEqual({ liberada: true, dica: null, detalhe: null });
  });

  it("com registro, desabilitada com a dica do pedido e o que prende", () => {
    const estado = estadoDaExclusaoDaTurma(["aula_lancada", "semana_do_dsa"]);
    expect(estado.liberada).toBe(false);
    expect(estado.dica).toBe("tem registros: use Arquivar");
    expect(estado.detalhe).toBe("Tem aula lançada e semana do DSA salva ou publicada.");
  });

  it("sem resposta do banco, desabilitada — nunca liberada", () => {
    expect(estadoDaExclusaoDaTurma(null)).toEqual({
      liberada: false,
      dica: DICA_SEM_LEITURA,
      detalhe: null,
    });
  });

  it("a tabela que a rede de segurança devolve sai pelo nome dela, e a desconhecida não some", () => {
    expect(estadoDaExclusaoDaTurma(["sessoes_de_aplicacao"]).detalhe).toBe(
      "Tem sessão de aplicação.",
    );
    expect(estadoDaExclusaoDaTurma(["coisa_nova"]).detalhe).toBe("Tem registro em coisa_nova.");
  });

  it("lê as chaves da recusa 23503 do banco", () => {
    expect(chavesDaRecusaDaTurma("turma_com_historico: aula_lancada, previsto")).toEqual([
      "aula_lancada",
      "previsto",
    ]);
    expect(chavesDaRecusaDaTurma("outra coisa")).toEqual([]);
  });
});

describe("D-COR-6 · a linha do calendário", () => {
  it("com semana salva ou publicada, a dica manda desativar", () => {
    const estado = estadoDaExclusaoDoFeriado(["semana_do_dsa_salva_ou_publicada"]);
    expect(estado.liberada).toBe(false);
    expect(estado.dica).toBe("tem registros: use Desativar");
    expect(estado.detalhe).toBe("Tem semana do DSA salva ou publicada nesta data.");
  });

  it("sem impedimento, liberada", () => {
    expect(estadoDaExclusaoDoFeriado([]).liberada).toBe(true);
  });
});

describe("D-12 · o código digitado confere", () => {
  it("só exatamente o código, sem espaço à volta", () => {
    expect(codigoConfere(" FER-000024 ", "FER-000024")).toBe(true);
    expect(codigoConfere("FER-00002", "FER-000024")).toBe(false);
    expect(codigoConfere("", "")).toBe(false);
  });
});

describe("D-13 · o estado de cada registro da lista, pela resposta em lote", () => {
  it("cada linha vira o estado da função do cadastro, pelo id", () => {
    const estados = estadosPorRegistro(
      [
        { registro_id: "a", impedimentos: [] },
        { registro_id: "b", impedimentos: ["aula_lancada"] },
        { registro_id: "c", impedimentos: null },
      ],
      estadoDaExclusaoDaTurma,
    );
    expect(estados.a?.liberada).toBe(true);
    expect(estados.b).toEqual({
      liberada: false,
      dica: "tem registros: use Arquivar",
      detalhe: "Tem aula lançada.",
    });
    // Linha que veio sem lista é tratada como lista vazia — é o banco dizendo "nada prende".
    expect(estados.c?.liberada).toBe(true);
  });

  it("⚠️ sem resposta do banco, mapa vazio: a tela não acha o id e desabilita (nunca libera)", () => {
    expect(estadosPorRegistro(null, estadoDaExclusaoDaTurma)).toEqual({});
  });
});

describe("D-1 e D-28 · os endereços de edição", () => {
  it("Editar turma é página própria, com o código codificado", () => {
    expect(enderecoDaEdicaoDaTurma("C-Ap-FR 2026")).toBe("/turmas/C-Ap-FR%202026/editar");
  });

  it("Editar curso: sem currículo nem parte, a aba Cadastro; com eles, a aba Currículo", () => {
    expect(enderecoDaEdicaoDoCurso("CAHO")).toBe("/cursos/CAHO/editar");
    expect(enderecoDaEdicaoDoCurso("CAHO", 2, "disciplinas")).toBe(
      "/cursos/CAHO/editar?curriculo=2&aba=curriculo&parte=disciplinas",
    );
    expect(enderecoDaEdicaoDoCurso("CAHO", undefined, "horarios")).toBe(
      "/cursos/CAHO/editar?aba=curriculo&parte=horarios",
    );
  });
});

/**
 * Spec 022 (Bloco 7), FR-004.3 e FR-004.4 — **nenhum aviso dos quadros que saíram se perde**: cada saída dos predicados
 * de hoje vira um aviso, no módulo certo, com o link de onde ele se resolve (a tabela da §6 da spec).
 *
 * > *"Os quadros de aviso das páginas saem (sem perder nenhum aviso: liste os que existem hoje e onde passam a
 * > aparecer)."* — Bernardo Villas Boas, 22/10/2026
 */
import { describe, expect, it } from "vitest";

import { montarAvisos, type EntradaDaCentral } from "@/app/(app)/avisos/montar";

const VAZIA: EntradaDaCentral = {
  cursos: [],
  tetos: [],
  atrasadas: [],
  vistas: [],
  doPainel: [],
  daFicha: [],
  doCadastro: [],
  doInstrutor: [],
};

const um = (parcial: Partial<EntradaDaCentral>) => montarAvisos({ ...VAZIA, ...parcial });

describe("§6 · cada quadro de hoje, um módulo e um link", () => {
  it("avisos do curso → Cursos; os do currículo levam a Editar curso, o do limite à aba Turmas", () => {
    const avisos = um({
      cursos: [
        {
          sigla: "CAHO",
          avisos: [
            { chave: "sem_proposito", titulo: "Propósito do curso não informado" },
            {
              chave: "acima_do_limite",
              titulo: "Turmas acima do limite do ano",
              detalhe: "2026: 3 de 2",
            },
          ],
        },
      ],
    });
    expect(avisos.map((a) => [a.modulo, a.titulo, a.destino])).toEqual([
      ["cursos", "CAHO: Propósito do curso não informado", "/cursos/CAHO/editar"],
      ["cursos", "CAHO: Turmas acima do limite do ano", "/cursos/CAHO?aba=turmas"],
    ]);
    expect(avisos[1]?.detalhe).toBe("2026: 3 de 2");
  });

  it("teto excedido e em atraso → Turmas, na ficha da turma", () => {
    const avisos = um({
      tetos: [
        {
          turmaCodigo: "CAHO 2026",
          categoria: "aec",
          alerta: "acima_do_maximo",
          cumprido: 40,
          referencia: 30,
        },
      ],
      atrasadas: ["C-Ap-FR 2026"],
    });
    expect(avisos.map((a) => [a.modulo, a.destino])).toEqual([
      ["turmas", "/turmas/CAHO%202026"],
      ["turmas", "/turmas/C-Ap-FR%202026"],
    ]);
    expect(avisos[0]?.titulo).toBe("CAHO 2026: teto de AEC excedido");
    expect(avisos[0]?.detalhe).not.toBeNull();
    expect(avisos[1]?.titulo).toBe("C-Ap-FR 2026: em atraso");
  });

  it("vista atrasada → Avaliações, na aba Avaliações da turma", () => {
    const [aviso] = um({
      vistas: [
        {
          id: "av-1",
          turma: "CAHO 2026",
          disciplina: "CAHO-01",
          tipo: "PM 1",
          aplicacao: "2026-10-01",
          tipoDoAlerta: "atrasada",
          venceEm: "2026-10-08",
        },
      ],
    });
    expect(aviso?.modulo).toBe("avaliacoes");
    expect(aviso?.destino).toBe("/turmas/CAHO%202026?aba=avaliacoes#abas-da-turma");
    expect(aviso?.detalhe).toContain("01/10/2026");
  });

  it("o que falta nas turmas → Turmas: a janela na ficha, o instrutor nas disciplinas, o conflito no DSA", () => {
    const avisos = um({
      doPainel: [
        { tipo: "sem_janela", turmaCodigo: "T1 2026", detalhe: "início ou término sem data" },
        { tipo: "sem_instrutor", turmaCodigo: "T1 2026", detalhe: "2 disciplinas" },
        { tipo: "conflito", turmaCodigo: "T1 2026", detalhe: "com T2 2026" },
      ],
    });
    expect(avisos.map((a) => a.destino)).toEqual([
      "/turmas/T1%202026",
      "/turmas/T1%202026#disciplinas",
      "/turmas/T1%202026/dsa",
    ]);
  });

  it("avisos de cadastro da turma e do instrutor, e os alertas da ficha do instrutor", () => {
    const avisos = um({
      daFicha: [
        { turmaCodigo: "T1 2026", avisos: [{ chave: "sem_sala", titulo: "Sala não alocada" }] },
      ],
      doCadastro: [
        {
          chave: "sem-nip",
          titulo: "Instrutor sem NIP",
          instrutores: [{ codigo: "15", nome: "Fulano" }],
        },
        { chave: "obrigatorio-pendente", titulo: "Campo obrigatório pendente", instrutores: [] },
      ],
      doInstrutor: [
        {
          codigo: "15",
          nome: "Fulano",
          capacitacaoACorrigir: "curso antigo",
          alertas: [
            {
              chave: "fora-da-faixa",
              titulo: "Carga semanal prevista fora da faixa do regime",
              detalhes: ["Semana 10/2026: 30 h, acima da faixa de 16 a 24 h."],
            },
          ],
        },
      ],
    });
    expect(avisos.map((a) => [a.modulo, a.chave, a.destino])).toEqual([
      ["turmas", "turmas:sem_sala:T1 2026", "/turmas/T1%202026"],
      ["instrutores", "instrutores:sem-nip:15", "/instrutores/15"],
      ["instrutores", "instrutores:fora-da-faixa:15", "/instrutores/15"],
      ["instrutores", "instrutores:capacitacao_a_corrigir:15", "/instrutores/15"],
    ]);
  });
});

describe("o mesmo fato, um aviso só", () => {
  it("a janela incompleta dita pelo painel e pela ficha da turma aparece uma vez", () => {
    const avisos = um({
      doPainel: [
        { tipo: "sem_janela", turmaCodigo: "T1 2026", detalhe: "início ou término sem data" },
      ],
      daFicha: [
        {
          turmaCodigo: "T1 2026",
          avisos: [
            { chave: "sem_janela", titulo: "Janela de datas incompleta" },
            { chave: "sem_sala", titulo: "Sala não alocada" },
          ],
        },
      ],
    });
    expect(avisos.map((a) => a.chave)).toEqual([
      "turmas:sem_janela:T1 2026",
      "turmas:sem_sala:T1 2026",
    ]);
  });

  it("sem aviso, lista vazia", () => {
    expect(montarAvisos(VAZIA)).toEqual([]);
  });
});

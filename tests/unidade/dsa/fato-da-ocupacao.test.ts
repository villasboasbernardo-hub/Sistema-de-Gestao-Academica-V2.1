/**
 * `RF-DSA-06` · `RF-PDF-01` · `RN-AVAL-02` — o que cada fato da semana **diz de si**, na grade e no
 * papel: a vista de prova, o título da prova, o responsável de fora do cadastro e a CH do rodapé.
 *
 * ⚠️ **AS QUATRO DIFERENÇAS FORAM MEDIDAS NA CARGA PILOTO do `C-Exp-Obs-ME 2026`, em 06/10/2026**,
 * comparando o que o sistema imprimia com o DSA assinado da planilha de controle:
 *
 * 1. a **vista de prova** saía como *"Prova Escrita"* com T/E *"PM"* — nada a distinguia da
 *    aplicação, na grade ou no papel;
 * 2. o **responsável externo** de uma atividade (*"DOEP"*, *"MONITORIA / DOEP"*) estava gravado e a
 *    coluna Instrutor saía **vazia**;
 * 3. o **rodapé impresso** trazia a CH cumprida do **total** da turma em toda semana (50 e 65 nas
 *    quatro), enquanto o painel da grade já cortava pela semana (18/15 · 35/33 · 45/40 · 50/65);
 * 4. o **tópico da prova** sai do `conteudo_resumo` quando há, e do tipo quando não há.
 *
 * ⚠️ **ESTE ARQUIVO PASSA PELO MAPEADOR REAL** (`fatoDaOcupacao`), com o mapa de conteúdos no
 * formato que a leitura entrega — testar só as funções de rótulo provaria que elas existem, não que
 * a grade e o papel as recebem.
 */

import { describe, expect, it } from "vitest";

import {
  execucaoAteASemana,
  fatoDaOcupacao,
  type LinhaDaOcupacao,
} from "@/app/(app)/turmas/[turma]/dsa/consulta";
import {
  conteudoDaAvaliacao,
  responsavelDoFato,
  rotuloDaVistaDeProva,
  tecnicaDaVistaDeProva,
} from "@/lib/dominio/dsa/rotulos";

const PROVA = "PROVA ESCRITA OBJETIVA DE OBSERVAÇÃO METEOROLÓGICA I";

function linha(ajustes: Partial<LinhaDaOcupacao> = {}): LinhaDaOcupacao {
  return {
    turma_id: "turma-1",
    data: "2026-10-08",
    ta_inicial: 5,
    tempos_consumidos: 1,
    origem: "avaliacao",
    fato_id: "aval-1",
    disciplina_id: "disc-1",
    instrutor_id: "instr-1",
    fiscal_id: null,
    local: "Sala 02",
    herdado: false,
    ...ajustes,
  };
}

const NOMES = {
  disciplinas: new Map([["disc-1", "I"]]),
  instrutores: new Map([["instr-1", "1ºTen (RM2-T) FULANA DE TAL"]]),
  conteudos: new Map([
    [
      "aval-1",
      {
        conteudo: PROVA,
        tecnica: "Prova Mista",
        aplicadaEm: "24/09/2026",
        tecnicaDaVista: "Exposição Oral",
      },
    ],
    ["ativ-1", { conteudo: "DOEP", tecnica: "Palestra", externo: "DOEP" }],
    ["ativ-2", { conteudo: "VISITA AO CEFET", tecnica: "Visita Técnica", externo: null }],
  ]),
};

describe("a vista de prova se distingue da aplicação — `RN-AVAL-02`", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA.** Aplicação e vista são o MESMO fato (a mesma linha de
   * `avaliacoes`), então chegam com o mesmo `fato_id` e o mesmo conteúdo — e era por isso que as
   * duas saíam iguais. O que as separa é a `origem` da linha da ocupação.
   */
  it("a VISTA sai rotulada, com a referência da prova e a data da aplicação", () => {
    const vista = fatoDaOcupacao(linha({ origem: "vista_prova" }), NOMES);
    expect(vista.conteudo).toBe(`VISTA DE PROVA — ${PROVA} (aplicada em 24/09/2026)`);
  });

  it("a VISTA leva a técnica da vista (EO), não a da prova (PM)", () => {
    const vista = fatoDaOcupacao(linha({ origem: "vista_prova" }), NOMES);
    expect(vista.tecnica).toBe("Exposição Oral");
  });

  /* ⚠️ O controle positivo: a APLICAÇÃO continua com o título e a técnica dela. */
  it("a APLICAÇÃO não muda: título da prova e técnica da prova", () => {
    const aplicacao = fatoDaOcupacao(linha({ origem: "avaliacao", data: "2026-09-24" }), NOMES);
    expect(aplicacao.conteudo).toBe(PROVA);
    expect(aplicacao.tecnica).toBe("Prova Mista");
  });

  it("sem a data da aplicação, o rótulo sai sem o parêntese — nunca com `null` dentro", () => {
    expect(rotuloDaVistaDeProva({ prova: PROVA, aplicadaEm: null })).toBe(
      `VISTA DE PROVA — ${PROVA}`,
    );
    expect(rotuloDaVistaDeProva({ prova: null, aplicadaEm: null })).toBe("VISTA DE PROVA");
  });

  it("a técnica da vista é a do catálogo cuja sigla é EO; sem ela no catálogo, vazio", () => {
    const catalogo = [
      { nome: "Prova Mista", sigla: "PM" },
      { nome: "Exposição Oral", sigla: "EO" },
    ];
    expect(tecnicaDaVistaDeProva(catalogo)).toBe("Exposição Oral");
    expect(tecnicaDaVistaDeProva([{ nome: "Prova Mista", sigla: "PM" }])).toBeNull();
  });
});

describe("o tópico da prova: o `conteudo_resumo` quando há; senão o tipo", () => {
  it("com título gravado, imprime o título", () => {
    expect(conteudoDaAvaliacao(PROVA, "Prova Escrita")).toBe(PROVA);
  });

  it("sem título, imprime o tipo", () => {
    expect(conteudoDaAvaliacao(null, "Prova Escrita")).toBe("Prova Escrita");
  });

  /* ⚠️ O caso que o `??` deixava passar: texto só de espaços é ausência, e não título. */
  it("título em branco é ausência: cai no tipo, em vez de imprimir uma célula vazia", () => {
    expect(conteudoDaAvaliacao("   ", "Prova Escrita")).toBe("Prova Escrita");
  });

  it("sem título e sem tipo, nulo — o papel decide o vazio", () => {
    expect(conteudoDaAvaliacao(null, null)).toBeNull();
  });
});

describe("o responsável de fora do cadastro aparece na coluna do instrutor", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA.** A view da ocupação não traz `responsavel_externo` (ele é texto
   * livre, não participa de conflito); a leitura o busca na tabela e o entrega no mapa. Sem isso a
   * atividade conduzida por alguém de fora saía sem responsável nenhum.
   */
  it("atividade SEM instrutor e COM responsável externo mostra o externo", () => {
    const fato = fatoDaOcupacao(
      linha({
        origem: "atividade_nao_letiva",
        fato_id: "ativ-1",
        instrutor_id: null,
        disciplina_id: null,
      }),
      NOMES,
    );
    expect(fato.instrutor).toBe("DOEP");
  });

  it("atividade sem instrutor e sem externo continua sem responsável", () => {
    const fato = fatoDaOcupacao(
      linha({
        origem: "atividade_nao_letiva",
        fato_id: "ativ-2",
        instrutor_id: null,
        disciplina_id: null,
      }),
      NOMES,
    );
    expect(fato.instrutor).toBeNull();
  });

  /* ⚠️ O banco proíbe os dois juntos (`ativ_responsavel_exclusivo`); se chegarem, vale o cadastro. */
  it("havendo instrutor, é ele que aparece", () => {
    expect(responsavelDoFato("1ºTen FULANA", "DOEP")).toBe("1ºTen FULANA");
    expect(responsavelDoFato(null, "  ")).toBeNull();
  });
});

describe("a CH cumprida do rodapé é a ACUMULADA ATÉ A SEMANA — `RN-CRONOS-03`", () => {
  const EXECUCAO = [
    { disciplinaId: "disc-1", codigo: "I", nome: "Observação I", prevista: 50, cumprida: 50 },
    { disciplinaId: "disc-2", codigo: "II", nome: "Observação II", prevista: 65, cumprida: 65 },
  ];
  const OCUPACAO = [
    { fatoId: "a", data: "2026-09-14", disciplinaId: "disc-1", ta: 18 },
    { fatoId: "b", data: "2026-09-16", disciplinaId: "disc-2", ta: 15 },
    { fatoId: "c", data: "2026-09-22", disciplinaId: "disc-1", ta: 17 },
    { fatoId: "d", data: "2026-10-07", disciplinaId: "disc-2", ta: 50 },
  ];

  /*
   * ⚠️ **O CASO QUE DISCRIMINA: a view diz 50 e 65 (o total), e a semana de 14 a 18/09 fechou em
   * 18 e 15.** O rodapé e o painel da grade saem do MESMO cálculo (`quadroDaDisciplina`), então o
   * papel não pode mais discordar da tela.
   */
  it("na primeira semana, sai o que foi lançado até o fim dela — não o total da turma", () => {
    const ate = execucaoAteASemana({
      execucao: EXECUCAO,
      ocupacao: OCUPACAO,
      ateODia: "2026-09-18",
    });
    expect(ate.map((d) => [d.codigo, d.prevista, d.cumprida])).toEqual([
      ["I", 50, 18],
      ["II", 65, 15],
    ]);
  });

  it("na segunda semana acumula a primeira; o que vem depois do corte fica de fora", () => {
    const ate = execucaoAteASemana({
      execucao: EXECUCAO,
      ocupacao: OCUPACAO,
      ateODia: "2026-09-25",
    });
    expect(ate.map((d) => d.cumprida)).toEqual([35, 15]);
  });

  /* ⚠️ `Q-2`: o único corte é o da semana do documento. Lançamento futuro DENTRO dela conta. */
  it("o corte é o fim da semana, nunca «hoje»", () => {
    const ate = execucaoAteASemana({
      execucao: EXECUCAO,
      ocupacao: OCUPACAO,
      ateODia: "2026-10-09",
    });
    expect(ate.map((d) => d.cumprida)).toEqual([35, 65]);
  });
});

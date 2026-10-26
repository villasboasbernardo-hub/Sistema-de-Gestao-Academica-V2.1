/**
 * `RF-PDF-01` · `RF-DSA-06` · `SC-011` · `SC-013` · `SC-014` · `FR-039` — o documento impresso.
 *
 * ⚠️ **ESTE ARQUIVO PROVA AS QUATRO REGRAS DO PAPEL SEM SUBIR NAVEGADOR, e é por isso que o módulo
 * existe separado da rota.** Três delas são defeitos medidos na planilha (`D-2`, `D-3`, `D-5`), e um
 * teste de ponta a ponta sobre o PDF diria *"cabe em uma página"* sem dizer **por quê**.
 *
 * ⚠️ **A SEMANA VEM DE `montarSemana` COM A G45 REAL, não de um `DiaDaGrade` escrito à mão.** O
 * bloco que atravessa o almoço só existe se a quebra vier de `trechosDoBloco` — montar o dia à mão
 * provaria que o módulo copia dois trechos, não que a quebra acontece.
 */

import { describe, expect, it } from "vitest";

import type { MarcaDeConflito } from "@/lib/dominio/dsa/conflitos";
import { MOTIVO_NO_MESMO_TA, montarSemana, type FatoDaSemana } from "@/lib/dominio/dsa/grade";
import { gradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { relogioDoCatalogo, relogioDoRegime } from "@/lib/dominio/dsa/horario-do-bloco";
import { camposDoEstudoIndividual, LOCAL_DO_ESTUDO_INDIVIDUAL } from "@/lib/dominio/dsa/rotulos";
import {
  avisosAntesDeImprimir,
  diaImpresso,
  documentoImpresso,
  legendaDeTecnicas,
  siglaOuExtenso,
  tabelaDeCh,
  textoDoPapel,
  SIGLA_DO_ESTUDO_INDIVIDUAL,
  TEXTO_DO_ESTUDO_INDIVIDUAL,
  type TecnicaDoCatalogo,
} from "@/lib/dominio/dsa/impressao";

import { G45 } from "./relogio-real";

const SEMANA = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"] as const;
const HOJE = "2026-10-06";
const SEM_MARCAS: ReadonlyMap<string, MarcaDeConflito> = new Map();
const SEM_EI: ReadonlySet<string> = new Set();

/** O catálogo como `config_listas.metodologias` o entrega: 3 com sigla, 1 sem (`T040`). */
const TECNICAS: readonly TecnicaDoCatalogo[] = [
  { nome: "Exposição Oral", sigla: "EO" },
  { nome: "Aula Prática", sigla: "AP" },
  { nome: "Estudo Individual", sigla: SIGLA_DO_ESTUDO_INDIVIDUAL },
  { nome: "Estudo Dirigido", sigla: null },
];

function fato(ajustes: Partial<FatoDaSemana> = {}): FatoDaSemana {
  return {
    fatoId: "fato-1",
    origem: "aula",
    data: "2026-10-05",
    taInicial: 1,
    tempos: 2,
    herdado: false,
    disciplina: "II",
    conteudo: "UE 3 — Navegação costeira",
    tecnica: "Exposição Oral",
    instrutor: "1ºTEN SILVA",
    local: "Sala 03",
    ...ajustes,
  };
}

function montar(ajustes: Partial<Parameters<typeof montarSemana>[0]> = {}) {
  return montarSemana({
    dias: [...SEMANA],
    relogio: relogioDoRegime(G45),
    temposDeclarados: G45.regimeTempos,
    fatos: [],
    feriados: [],
    marcas: SEM_MARCAS,
    hoje: HOJE,
    sabadoAberto: false,
    ...ajustes,
  });
}

function primeiroDia(ajustes: Partial<Parameters<typeof montarSemana>[0]> = {}) {
  const semana = montar(ajustes);
  const dia = semana.dias[0];
  if (dia === undefined) throw new Error("a semana saiu sem dias");
  return diaImpresso(dia, {
    relogio: semana.relogio,
    tecnicas: TECNICAS,
    idsDeEstudoIndividual: SEM_EI,
  });
}

describe("`SC-011` · o bloco que atravessa o almoço — o `D-3` da planilha", () => {
  /*
   * ⚠️ **O CASO QUE DISCRIMINA.** Na G45 o almoço fica entre o 5º e o 6º TA; um bloco de 4 TA a
   * partir do 4º atravessa. A planilha imprimia *"09:30 as 13:50"*, um horário contínuo que inclui
   * o almoço — 64 ocorrências no CAHO e 50 no C-Espc-FR.
   */
  it("sai com DUAS linhas de HORÁRIO, e o almoço não entra em nenhuma", () => {
    const dia = primeiroDia({ fatos: [fato({ taInicial: 4, tempos: 4 })] });
    const linha = dia.linhas[0];
    expect(linha?.trechos).toHaveLength(2);
    expect(linha?.trechos[0]).toEqual({ inicio: "10:20", fim: "11:55", periodo: "manha" });
    expect(linha?.trechos[1]).toEqual({ inicio: "13:05", fim: "14:40", periodo: "tarde" });
  });

  it("bloco que não atravessa sai com UMA linha só", () => {
    const dia = primeiroDia({ fatos: [fato({ taInicial: 1, tempos: 3 })] });
    expect(dia.linhas[0]?.trechos).toHaveLength(1);
    expect(dia.linhas[0]?.trechos[0]).toEqual({ inicio: "07:50", fim: "10:15", periodo: "manha" });
  });
});

describe("a linha fixa `ESTUDO INDIVIDUAL · EI` — `praticas-da-planilha.md` §1.2", () => {
  it("é a ÚLTIMA linha do dia, sem instrutor, mesmo num dia sem lançamento nenhum", () => {
    const dia = primeiroDia();
    expect(dia.linhas).toHaveLength(1);
    const ei = dia.linhas[0];
    expect(ei?.conteudo).toBe(TEXTO_DO_ESTUDO_INDIVIDUAL);
    expect(ei?.te).toBe(SIGLA_DO_ESTUDO_INDIVIDUAL);
    expect(ei?.instrutor).toBe("");
    expect(ei?.estudoIndividual).toBe(true);
  });

  /*
   * RD-2 (Bloco 11): «sempre no ÚLTIMO tempo do regime, nunca no primeiro» — substitui a D-4 (o TA seguinte ao último
   * lançado). Na G45 (regime de 8), com 4 TA lançados o EI vai ao 8º, e não ao 5º (D-8 da spec 026).
   */
  it("RD-2 · com 4 TA lançados num regime de 8, o EI no 8º — e não no 5º (a D-4)", () => {
    const dia = primeiroDia({ fatos: [fato({ taInicial: 1, tempos: 4 })] });
    const ei = dia.linhas[dia.linhas.length - 1];
    expect(ei?.taInicial).toBe(G45.regimeTempos);
    const oitavo = relogioDoRegime(G45)?.tempos.find((t) => t.numero === G45.regimeTempos);
    expect(ei?.trechos[0]).toEqual({
      inicio: oitavo?.inicio,
      fim: oitavo?.fim,
      periodo: oitavo?.periodo,
    });
  });

  it("RD-2 · ⚠️ o caso que discrimina: dia SEM lançamento — o EI no último tempo do regime, e não no 1º", () => {
    const dia = primeiroDia();
    expect(dia.linhas[0]?.taInicial).toBe(G45.regimeTempos);
  });

  /*
   * ⚠️ **ESTE É O CASO QUE JUSTIFICA O `idsDeEstudoIndividual`.** Sem ele o EI lançado apareceria
   * como linha comum **e** a linha fixa sairia depois: o dia teria Estudo Individual duas vezes, e
   * o papel somaria um TA que não existe.
   */
  it("o EI LANÇADO vira a linha fixa, em vez de somar-se a ela", () => {
    const semana = montar({
      fatos: [
        fato({ taInicial: 1, tempos: 4 }),
        fato({
          fatoId: "ei-lancado",
          origem: "atividade_nao_letiva",
          taInicial: 5,
          tempos: 1,
          disciplina: null,
          conteudo: "Estudo Individual",
          tecnica: "Estudo Individual",
          instrutor: "1ºTEN SILVA",
          local: "Sala 03",
        }),
      ],
    });
    const dia = semana.dias[0];
    if (dia === undefined) throw new Error("a semana saiu sem dias");
    const impresso = diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: new Set(["ei-lancado"]),
    });
    expect(impresso.linhas).toHaveLength(2);
    const ei = impresso.linhas[1];
    expect(ei?.chave).toBe("ei-lancado");
    expect(ei?.conteudo).toBe(TEXTO_DO_ESTUDO_INDIVIDUAL);
    /* ⚠️ O lançamento TEM instrutor, e o papel não o imprime — o documento assinado é assim. */
    expect(ei?.instrutor).toBe("");
  });

  it("`Q-16` · dia de feriado de dia inteiro sai como UMA faixa, e SEM a linha de EI", () => {
    const semana = montar({
      feriados: [{ data: "2026-10-05", descricao: "Dia das Crianças", impacto: "dia_inteiro" }],
    });
    const dia = semana.dias[0];
    if (dia === undefined) throw new Error("a semana saiu sem dias");
    const impresso = diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: SEM_EI,
    });
    expect(impresso.bloqueio).toBe("Dia das Crianças");
    expect(impresso.linhas).toHaveLength(0);
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA, medido na carga piloto do `C-Exp-Obs-ME 2026` em 06/10/2026.** O
   * dia 02/10 é licença de pagamento (dia inteiro) **e** tem um Estudo Individual lançado no 8º
   * tempo. A grade o mostrava; o papel devolvia **zero linhas** para o dia e o lançamento sumia sem
   * aviso nenhum — existia no banco, contava na CH e não estava no documento assinado.
   */
  it("dia bloqueado COM lançamento imprime o lançamento, abaixo da faixa do bloqueio", () => {
    const semana = montar({
      feriados: [{ data: "2026-10-05", descricao: "Licença de pagamento", impacto: "dia_inteiro" }],
      fatos: [
        fato({ fatoId: "aula-no-feriado", taInicial: 1, tempos: 2 }),
        fato({
          fatoId: "ei-no-feriado",
          origem: "atividade_nao_letiva",
          taInicial: 8,
          tempos: 1,
          disciplina: null,
          conteudo: "ESTUDO INDIVIDUAL",
          tecnica: "Estudo Individual",
          instrutor: null,
        }),
      ],
    });
    const dia = semana.dias[0];
    if (dia === undefined) throw new Error("a semana saiu sem dias");
    const impresso = diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: new Set(["ei-no-feriado"]),
    });
    expect(impresso.bloqueio).toBe("Licença de pagamento");
    expect(impresso.linhas.map((l) => l.chave)).toEqual(["aula-no-feriado", "ei-no-feriado"]);
    expect(impresso.linhas[1]?.estudoIndividual).toBe(true);
    expect(impresso.linhas[1]?.te).toBe(SIGLA_DO_ESTUDO_INDIVIDUAL);
  });

  /*
   * ⚠️ **O CASO QUE DISCRIMINA, medido em 06/10/2026 na carga do `C-Esp-ME 2026`.** Em 04/08 a
   * turma teve Estudo Individual do 1º ao 4º tempo E no 8º. O papel guardava UM Estudo Individual
   * por dia — o último lido — e o da manhã sumia: 4 TA lançados, contados e fora do documento.
   */
  it("⚠️ dois Estudos Individuais no mesmo dia saem os DOIS, e o último continua no pé", () => {
    const semana = montar({
      fatos: [
        fato({
          fatoId: "ei-da-manha",
          origem: "atividade_nao_letiva",
          taInicial: 1,
          tempos: 4,
          disciplina: null,
          conteudo: "ESTUDO INDIVIDUAL",
          tecnica: "Estudo Individual",
          instrutor: null,
        }),
        fato({ fatoId: "aula-da-tarde", taInicial: 6, tempos: 2 }),
        fato({
          fatoId: "ei-do-fim",
          origem: "atividade_nao_letiva",
          taInicial: 8,
          tempos: 1,
          disciplina: null,
          conteudo: "ESTUDO INDIVIDUAL",
          tecnica: "Estudo Individual",
          instrutor: null,
        }),
      ],
    });
    const dia = semana.dias[0];
    if (dia === undefined) throw new Error("a semana saiu sem dias");
    const impresso = diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: new Set(["ei-da-manha", "ei-do-fim"]),
    });
    expect(impresso.linhas.map((l) => l.chave)).toEqual([
      "ei-da-manha",
      "aula-da-tarde",
      "ei-do-fim",
    ]);
    expect(impresso.linhas[0]?.tempos).toBe(4);
    expect(impresso.linhas[0]?.te).toBe(SIGLA_DO_ESTUDO_INDIVIDUAL);
    expect(impresso.linhas[0]?.estudoIndividual).toBe(true);
  });

  /* ⚠️ O controle: só o que foi LANÇADO sai — a linha FIXA de EI continua fora do dia bloqueado. */
  it("dia bloqueado com lançamento e SEM Estudo Individual lançado não ganha a linha fixa", () => {
    const semana = montar({
      feriados: [{ data: "2026-10-05", descricao: "Licença de pagamento", impacto: "dia_inteiro" }],
      fatos: [fato({ fatoId: "aula-no-feriado", taInicial: 1, tempos: 2 })],
    });
    const dia = semana.dias[0];
    if (dia === undefined) throw new Error("a semana saiu sem dias");
    const impresso = diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: SEM_EI,
    });
    expect(impresso.linhas.map((l) => l.chave)).toEqual(["aula-no-feriado"]);
  });
});

describe("a coluna T/E da atividade não letiva — o subtipo não é técnica de ensino", () => {
  /*
   * ⚠️ **MEDIDO EM 06/10/2026:** a leitura entrega o SUBTIPO da atividade no campo da técnica (é o
   * rótulo que a grade mostra na célula), e o papel o imprimia na coluna T/E por extenso —
   * *"Administração"*, *"Palestra"*, *"Visita Técnica"*. `atividades_nao_letivas` não tem técnica de
   * ensino; o que a coluna comporta é a sigla **EI** no Estudo Individual, e vazio no resto.
   */
  it("atividade não letiva que não é Estudo Individual sai com T/E VAZIA", () => {
    const dia = primeiroDia({
      fatos: [
        fato({
          fatoId: "palestra",
          origem: "atividade_nao_letiva",
          disciplina: null,
          conteudo: "DOEP",
          tecnica: "Palestra",
          instrutor: "DOEP",
        }),
      ],
    });
    expect(dia.linhas[0]?.chave).toBe("palestra");
    expect(dia.linhas[0]?.te).toBe("");
    expect(dia.linhas[0]?.conteudo).toBe("DOEP");
  });

  /* ⚠️ E o subtipo não vaza para a legenda, que só traduz sigla usada na coluna. */
  it("o subtipo não entra na legenda, mesmo quando coincide com o nome de uma técnica", () => {
    const dias = documentoImpresso(
      montar({
        fatos: [
          fato({
            fatoId: "visita",
            origem: "atividade_nao_letiva",
            disciplina: null,
            conteudo: "VISITA",
            tecnica: "Aula Prática",
          }),
        ],
      }),
      { tecnicas: TECNICAS, idsDeEstudoIndividual: SEM_EI },
    );
    expect(legendaDeTecnicas(dias, TECNICAS).map((i) => i.sigla)).toEqual(["EI"]);
  });

  /* ⚠️ O controle positivo: a AULA continua imprimindo a sigla da técnica dela. */
  it("a aula não é afetada: continua com a sigla da técnica", () => {
    const dia = primeiroDia({ fatos: [fato({ tecnica: "Exposição Oral" })] });
    expect(dia.linhas[0]?.te).toBe("EO");
  });
});

describe("`SC-013` · nenhuma cadeia técnica chega ao papel", () => {
  it("`null`, `undefined`, `NaN` e vazio viram célula VAZIA", () => {
    expect(textoDoPapel(null)).toBe("");
    expect(textoDoPapel(undefined)).toBe("");
    expect(textoDoPapel("   ")).toBe("");
    /* ⚠️ As três que escapam de um `?? ""` ingênuo, porque já são texto. */
    expect(textoDoPapel("null")).toBe("");
    expect(textoDoPapel("undefined")).toBe("");
    expect(textoDoPapel("NaN")).toBe("");
    /* ⚠️ E a numérica: `String(NaN)` dá `"NaN"` — a família do `D-1`, 10.842 erros em cascata. */
    expect(textoDoPapel(Number.NaN)).toBe("");
    expect(textoDoPapel(Number.POSITIVE_INFINITY)).toBe("");
    expect(textoDoPapel(0)).toBe("0");
  });

  it("o fato sem disciplina, sem local e sem instrutor sai com as três células vazias", () => {
    const dia = primeiroDia({
      fatos: [fato({ disciplina: null, local: null, instrutor: null, conteudo: null })],
    });
    const linha = dia.linhas[0];
    expect(linha?.disciplina).toBe("");
    expect(linha?.local).toBe("");
    expect(linha?.instrutor).toBe("");
    expect(linha?.conteudo).toBe("");
  });
});

describe("`T040` · a sigla da T/E, e o nome por extenso quando não há sigla", () => {
  it("usa a sigla cadastrada", () => {
    expect(siglaOuExtenso("Exposição Oral", TECNICAS)).toBe("EO");
  });

  /* ⚠️ 13 das 22 ficam assim por decisão (§3.9) — inventar sigla é pior que uma coluna larga. */
  it("sem sigla, imprime o nome POR EXTENSO — `RN-DEG-01`", () => {
    expect(siglaOuExtenso("Estudo Dirigido", TECNICAS)).toBe("Estudo Dirigido");
  });

  it("técnica fora do catálogo imprime o que veio, não um vazio", () => {
    expect(siglaOuExtenso("Palestra da DOEP", TECNICAS)).toBe("Palestra da DOEP");
  });

  it("sem técnica, célula vazia", () => {
    expect(siglaOuExtenso(null, TECNICAS)).toBe("");
  });
});

describe("`SC-014` · o rodapé traz SÓ o que aparece na semana", () => {
  const EXECUCAO = [
    { codigo: "I", nome: "Navegação", prevista: 80, cumprida: 40 },
    { codigo: "II", nome: "Hidrografia", prevista: 60, cumprida: 12 },
    { codigo: "III", nome: "Meteorologia", prevista: 40, cumprida: 0 },
  ] as const;

  it("a tabela de CH lista as disciplinas da semana, e nenhuma outra", () => {
    const dias = documentoImpresso(montar({ fatos: [fato({ disciplina: "II" })] }), {
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: SEM_EI,
    });
    const tabela = tabelaDeCh(dias, EXECUCAO);
    expect(tabela.map((d) => d.codigo)).toEqual(["II"]);
    expect(tabela[0]?.cumprida).toBe(12);
  });

  /*
   * ⚠️ **A ORDEM É A NATURAL DO CÓDIGO, PELO VALOR DO ROMANO** (Bloco 2, spec 017, FR-008; regra de 08/10/2026): o
   *    `localeCompare` punha IV, IX, V, X — a ordem do texto, não a do currículo.
   */
  it("o quadro de CH ordena IV, V, IX, X pelo valor do romano, não pelo texto", () => {
    const codigos = ["IX", "IV", "X", "V"];
    const dias = [
      { linhas: codigos.map((disciplina) => ({ disciplina })) },
    ] as unknown as Parameters<typeof tabelaDeCh>[0];
    const execucao = codigos.map((codigo) => ({ codigo, nome: codigo, prevista: 10, cumprida: 0 }));
    expect(tabelaDeCh(dias, execucao).map((d) => d.codigo)).toEqual(["IV", "V", "IX", "X"]);
  });

  /* ⚠️ Vazio é vazio, e não é "todas" — o gotcha 4 aplicado ao papel. */
  it("semana sem lançamento devolve tabela VAZIA", () => {
    const dias = documentoImpresso(montar(), { tecnicas: TECNICAS, idsDeEstudoIndividual: SEM_EI });
    expect(tabelaDeCh(dias, EXECUCAO)).toHaveLength(0);
  });

  it("a legenda traz só as siglas usadas — e o EI entra, porque a linha fixa o usa", () => {
    const dias = documentoImpresso(montar({ fatos: [fato()] }), {
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: SEM_EI,
    });
    expect(legendaDeTecnicas(dias, TECNICAS).map((i) => i.sigla)).toEqual(["EI", "EO"]);
  });

  it("a técnica que imprimiu por extenso NÃO entra na legenda", () => {
    const dias = documentoImpresso(montar({ fatos: [fato({ tecnica: "Estudo Dirigido" })] }), {
      tecnicas: TECNICAS,
      idsDeEstudoIndividual: SEM_EI,
    });
    expect(legendaDeTecnicas(dias, TECNICAS).map((i) => i.sigla)).toEqual(["EI"]);
  });
});

describe("`FR-039` e `SC-015` · os avisos ficam na TELA, antes de imprimir", () => {
  const SEM_FALTA = {
    semanaDoCurso: { numero: 7, motivo: null, aviso: null },
    alunos: 24,
    semRelogio: false,
    semAssinaturaEsquerda: false,
    semAssinaturaDireita: false,
    linhasImpressas: 32,
  } as const;

  it("com tudo no lugar, nenhum aviso", () => {
    expect(avisosAntesDeImprimir(SEM_FALTA)).toHaveLength(0);
  });

  it("nomeia cada falta, e o motivo do número ausente vai na frase — `D-7`", () => {
    const avisos = avisosAntesDeImprimir({
      ...SEM_FALTA,
      semanaDoCurso: {
        numero: null,
        motivo: "a turma não tem data de início cadastrada.",
        aviso: null,
      },
      alunos: null,
      semRelogio: true,
      linhasImpressas: 0,
    });
    expect(avisos).toHaveLength(4);
    expect(avisos[0]).toContain("data de início");
    expect(avisos.join(" ")).toContain("efetivo da turma");
    expect(avisos.join(" ")).toContain("HORÁRIO sai em branco");
  });

  it("um lado sem assinatura nomeia QUAL lado; os dois saem numa frase só", () => {
    const esquerda = avisosAntesDeImprimir({ ...SEM_FALTA, semAssinaturaEsquerda: true });
    expect(esquerda).toHaveLength(1);
    expect(esquerda[0]).toContain("da esquerda");
    const ambas = avisosAntesDeImprimir({
      ...SEM_FALTA,
      semAssinaturaEsquerda: true,
      semAssinaturaDireita: true,
    });
    expect(ambas).toHaveLength(1);
    expect(ambas[0]).toContain("duas linhas");
  });
});

/**
 * ⚠️ **O EI NUNCA SAI SEM HORÁRIO QUANDO HÁ RELÓGIO** *(conferência visual de Bernardo Villas Boas,
 * 07/10/2026)*. Medido no CAHO 2026, semana 20–24/07: o catálogo CFG-H tem 9 tempos e, nos dias com
 * os 9 ocupados (palestra ou vista no 9º), a linha fixa ia para o 10º — que o catálogo não tem — e o
 * papel imprimia «ESTUDO INDIVIDUAL» sem horário. Varredura do ano inteiro: 38 linhas, todas no CAHO.
 * O DSA assinado desses dias NÃO traz Estudo Individual: sem tempo livre depois do último TA, não há EI
 * a oferecer, e a linha fixa não nasce.
 */
describe("a linha fixa de EI quando o relógio não tem o tempo seguinte", () => {
  const CATALOGO_9 = Array.from({ length: 9 }, (_, i) => ({
    tempoNumero: i + 1,
    periodo: (i < 5 ? "manha" : "tarde") as "manha" | "tarde",
    tipoTempo: "normal" as const,
    horaInicio: `${String(8 + i).padStart(2, "0")}:00`,
    horaFim: `${String(8 + i).padStart(2, "0")}:45`,
  }));

  it("⚠️ com os 9 tempos ocupados, o dia NÃO ganha um EI sem horário", () => {
    const dia = primeiroDia({
      relogio: relogioDoCatalogo(CATALOGO_9, 9),
      temposDeclarados: 9,
      fatos: [fato({ taInicial: 1, tempos: 9 })],
    });
    expect(dia.linhas.some((l) => l.estudoIndividual && l.trechos.length === 0)).toBe(false);
    expect(dia.linhas.some((l) => l.estudoIndividual)).toBe(false);
  });

  it("com o 9º livre, o EI nasce no 9º, com o horário do catálogo", () => {
    const dia = primeiroDia({
      relogio: relogioDoCatalogo(CATALOGO_9, 9),
      temposDeclarados: 9,
      fatos: [fato({ taInicial: 1, tempos: 8 })],
    });
    const ei = dia.linhas.at(-1);
    expect(ei?.estudoIndividual).toBe(true);
    expect(ei?.trechos).toEqual([{ inicio: "16:00", fim: "16:45", periodo: "tarde" }]);
  });
});

/**
 * ⚠️ **O LOCAL DO ESTUDO INDIVIDUAL É «Biblioteca»**, em todos os cursos e turmas *(decisão de
 * Bernardo Villas Boas, 07/10/2026, na conferência visual)* — no EI lançado pela planilha, no EI da
 * semana em um clique (`Q-7`) e na linha fixa que o papel imprime.
 */
describe("o local do Estudo Individual é a Biblioteca", () => {
  it("a constante é a da decisão", () => {
    expect(LOCAL_DO_ESTUDO_INDIVIDUAL).toBe("Biblioteca");
  });

  it("a linha fixa do EI sai com o local «Biblioteca»", () => {
    const ei = primeiroDia().linhas.at(-1);
    expect(ei?.estudoIndividual).toBe(true);
    expect(ei?.local).toBe("Biblioteca");
  });

  it("o EI da semana em um clique nasce com o local «Biblioteca»", () => {
    expect(camposDoEstudoIndividual("2026-10-05", 9)).toMatchObject({
      data: "2026-10-05",
      ta_inicial: 9,
      tempos_consumidos: 1,
      local: "Biblioteca",
      categoria_normativa: "Estudo_Individual",
    });
  });
});

/*
 * ⚠️ **FR-012.3 da spec 016 · O SEGUNDO NO MESMO TA SAI NO PAPEL, NA LISTA DE FORA DA GRADE.** Até
 * 17/10/2026 ele sumia: o papel lê as células, e a célula só tinha um.
 */
describe("FR-012.3 · dois lançamentos no mesmo TA, no papel", () => {
  const primeiro = fato({
    fatoId: "p1",
    codigo: "REG-000001",
    criadoEm: "2026-10-01T10:00:00Z",
    conteudo: "O lançado primeiro",
  });
  const segundo = fato({
    fatoId: "p2",
    codigo: "REG-000002",
    criadoEm: "2026-10-02T10:00:00Z",
    conteudo: "O lançado depois",
  });

  it("o primeiro fica na grade; o segundo, na lista de fora da grade, com o motivo", () => {
    const dia = primeiroDia({ fatos: [segundo, primeiro] });
    expect(dia.linhas.map((l) => l.conteudo)).toContain("O lançado primeiro");
    expect(dia.linhas.map((l) => l.conteudo)).not.toContain("O lançado depois");
    expect(dia.noMesmoTa?.map((l) => [l.conteudo, l.taInicial, l.tempos])).toEqual([
      ["O lançado depois", 1, 2],
    ]);
    const grade = gradeDoPapel([dia], relogioDoRegime(G45));
    expect(grade?.foraDaGrade.map((f) => [f.linha.conteudo, f.motivo])).toEqual([
      ["O lançado depois", MOTIVO_NO_MESMO_TA],
    ]);
    /* Os cartões: o primeiro, e a linha fixa de Estudo Individual do dia — o segundo, não. */
    const cartoes = grade?.cartoes.map((c) => c.linha.conteudo) ?? [];
    expect(cartoes).toContain("O lançado primeiro");
    expect(cartoes).not.toContain("O lançado depois");
  });

  it("controle: sem segundo no mesmo TA, nada vai para a lista", () => {
    const dia = primeiroDia({ fatos: [primeiro] });
    expect(dia.noMesmoTa).toBeUndefined();
  });
});

/**
 * Bloco 18 (spec 033, `FR-006.2`, `FR-006.4` e `FR-007.1`) — a regra da LISTA de atividades: os filtros, o vínculo, o
 * endereço do *Editar* e o que sai para as estatísticas (`lib/dominio/atividades/lista.ts`).
 *
 * ⚠️ **O CASO QUE DISCRIMINA (DoD 8) É O «TA DA DISCIPLINA»**: a linha que conta como CHD guarda a categoria do TIPO
 *    (AEC, numa Palestra) em `categoria_normativa`. O filtro de antes (`categoria = AEC`) a mostrava na AEC; o de agora a
 *    tira da AEC e a mostra só em «TA da disciplina» — a `RN-EVT-01` (*"AEC não conta para a CHD"*).
 */
import { describe, expect, it } from "vitest";

import {
  acimaDoMaximo,
  classificacaoDaLinha,
  disciplinasDasLinhas,
  FILTRO_VAZIO,
  filtrarAtividades,
  filtroDaUrl,
  haFiltro,
  paraBusca,
  paraEstatistica,
  passaNaClassificacao,
  passaNoFiltro,
  semanaParaEditar,
  vinculoDaLinha,
  type AtividadeDaLista,
  type FiltroDaLista,
} from "@/lib/dominio/atividades/lista";
import { tetosDasTurmas } from "@/lib/dominio/atividades/limites-das-turmas";

function linha(parcial: Partial<AtividadeDaLista> & { readonly codigo: string }): AtividadeDaLista {
  return {
    id: `id-${parcial.codigo}`,
    data: "2047-03-11",
    taInicial: 1,
    tempos: 2,
    categoria: "AEC",
    contaComo: null,
    tipoValor: "Palestra",
    tipoRotulo: "Palestra",
    turmaId: "t1",
    turmaCodigo: "CUR-X T1 2047",
    cursoCodigo: "CUR-X",
    descricao: "Atividade",
    alunos: null,
    responsavel: null,
    local: null,
    disciplinaCodigo: null,
    disciplinaCod: null,
    disciplinaRotulo: null,
    atividadePrevistaId: null,
    apoinstId: null,
    vinculoNome: null,
    ...parcial,
  };
}

const filtro = (parcial: Partial<FiltroDaLista>): FiltroDaLista => ({
  ...FILTRO_VAZIO,
  ...parcial,
});

/** A Palestra que conta como TA da disciplina: categoria do tipo (AEC) gravada, `conta_como = CHD`. */
const PALESTRA_CHD = linha({
  codigo: "A-CHD",
  contaComo: "CHD",
  disciplinaCodigo: "DIS-1",
  disciplinaRotulo: "I — Navegação",
});
const PALESTRA_AEC = linha({ codigo: "A-AEC" });
const PALESTRA_TAD = linha({ codigo: "A-TAD", categoria: "TAD", contaComo: "TAD" });
const ADMINISTRACAO = linha({
  codigo: "A-ADM",
  categoria: "TAD",
  tipoValor: "Administração",
  tipoRotulo: "Administração",
});
const MONITORIA = linha({
  codigo: "A-MON",
  categoria: "Apoio_Individualizado",
  tipoValor: "Monitoria",
  tipoRotulo: "Monitoria",
});

describe("a classificação é COMO a linha conta (RA-4)", () => {
  it("o «TA da disciplina» é CHD, e não a categoria do tipo", () => {
    expect(classificacaoDaLinha(PALESTRA_CHD)).toBe("CHD");
    expect(classificacaoDaLinha(PALESTRA_AEC)).toBe("AEC");
    expect(classificacaoDaLinha(PALESTRA_TAD)).toBe("TAD");
    expect(classificacaoDaLinha(MONITORIA)).toBe("Apoio_Individualizado");
  });

  it("caso que discrimina: a Palestra que conta como TA da disciplina SAI do filtro AEC e entra em «CHD»", () => {
    // O filtro de antes da spec 033 olhava só a categoria gravada — e a mostraria na AEC.
    expect(PALESTRA_CHD.categoria).toBe("AEC");
    expect(passaNaClassificacao(PALESTRA_CHD, "AEC")).toBe(false);
    expect(passaNaClassificacao(PALESTRA_CHD, "CHD")).toBe(true);
    // Controle positivo: a Palestra comum continua na AEC e fora do «CHD».
    expect(passaNaClassificacao(PALESTRA_AEC, "AEC")).toBe(true);
    expect(passaNaClassificacao(PALESTRA_AEC, "CHD")).toBe(false);
  });

  it("a Palestra trocada para TAD sai da AEC e entra na TAD (RA-1)", () => {
    expect(passaNaClassificacao(PALESTRA_TAD, "AEC")).toBe(false);
    expect(passaNaClassificacao(PALESTRA_TAD, "TAD")).toBe(true);
  });

  it("sem filtro, toda classificação passa", () => {
    for (const l of [PALESTRA_CHD, PALESTRA_AEC, PALESTRA_TAD, MONITORIA]) {
      expect(passaNaClassificacao(l, "")).toBe(true);
    }
  });

  it("o recorte por classificação divide as linhas sem perder nem repetir nenhuma", () => {
    const todas = [PALESTRA_CHD, PALESTRA_AEC, PALESTRA_TAD, ADMINISTRACAO, MONITORIA];
    const partes = ["AEC", "TAD", "TR", "CHD", "Apoio_Individualizado"].map((c) =>
      filtrarAtividades(todas, filtro({ categoria: c })).map((l) => l.codigo),
    );
    expect(partes.flat().sort()).toEqual(todas.map((l) => l.codigo).sort());
  });
});

describe("o vínculo (RA-3): do currículo = a AEC prevista OU a APOINST; avulsa = nenhum", () => {
  it("cada caso", () => {
    expect(vinculoDaLinha(linha({ codigo: "v1", atividadePrevistaId: "p1" }))).toBe("do_curriculo");
    expect(vinculoDaLinha(linha({ codigo: "v2", apoinstId: "ap1" }))).toBe("do_curriculo");
    expect(vinculoDaLinha(linha({ codigo: "v3" }))).toBe("avulsa");
  });

  it("o filtro separa as duas", () => {
    const todas = [
      linha({ codigo: "v1", atividadePrevistaId: "p1" }),
      linha({ codigo: "v2", apoinstId: "a" }),
      linha({ codigo: "v3" }),
    ];
    expect(
      filtrarAtividades(todas, filtro({ vinculo: "do_curriculo" })).map((l) => l.codigo),
    ).toEqual(["v1", "v2"]);
    expect(filtrarAtividades(todas, filtro({ vinculo: "avulsa" })).map((l) => l.codigo)).toEqual([
      "v3",
    ]);
  });
});

describe("os demais filtros", () => {
  it("o tipo compara pelo VALOR do catálogo, nunca pelo rótulo (decisão 4)", () => {
    const extraclasse = linha({
      codigo: "x1",
      tipoValor: "Atividade Extracurricular",
      tipoRotulo: "Atividade Extraclasse",
    });
    expect(passaNoFiltro(extraclasse, filtro({ tipo: "Atividade Extracurricular" }))).toBe(true);
    expect(passaNoFiltro(extraclasse, filtro({ tipo: "Atividade Extraclasse" }))).toBe(false);
    // Igualdade, não «contém»: «Palestra» não acha «Palestra técnica».
    expect(
      passaNoFiltro(
        linha({ codigo: "x2", tipoValor: "Palestra técnica" }),
        filtro({ tipo: "Palestra" }),
      ),
    ).toBe(false);
  });

  it("o responsável é texto contido no nome, sem maiúsculas nem acento", () => {
    const externo = linha({ codigo: "r1", responsavel: "Palestrante Convidado (OM Exemplo)" });
    expect(passaNoFiltro(externo, filtro({ responsavel: "convidado" }))).toBe(true);
    expect(passaNoFiltro(externo, filtro({ responsavel: "om exemplo" }))).toBe(true);
    expect(
      passaNoFiltro(
        linha({ codigo: "r2", responsavel: "Instrução Técnica" }),
        filtro({ responsavel: "instrucao" }),
      ),
    ).toBe(true);
    expect(passaNoFiltro(externo, filtro({ responsavel: "outro" }))).toBe(false);
    // A linha sem responsável não passa num filtro de responsável.
    expect(passaNoFiltro(linha({ codigo: "r3" }), filtro({ responsavel: "a" }))).toBe(false);
    expect(paraBusca("  Ação   Técnica ")).toBe("acao tecnica");
  });

  it("turma, curso, disciplina e o período (inclusivo)", () => {
    const l = linha({ codigo: "f1", disciplinaCodigo: "DIS-1", data: "2047-03-11" });
    expect(passaNoFiltro(l, filtro({ turma: "CUR-X T1 2047" }))).toBe(true);
    expect(passaNoFiltro(l, filtro({ turma: "CUR-X T2 2047" }))).toBe(false);
    expect(passaNoFiltro(l, filtro({ curso: "CUR-X" }))).toBe(true);
    expect(passaNoFiltro(l, filtro({ curso: "CUR-Y" }))).toBe(false);
    expect(passaNoFiltro(l, filtro({ disciplina: "DIS-1" }))).toBe(true);
    expect(passaNoFiltro(l, filtro({ disciplina: "DIS-2" }))).toBe(false);
    expect(passaNoFiltro(l, filtro({ de: "2047-03-11", ate: "2047-03-11" }))).toBe(true);
    expect(passaNoFiltro(l, filtro({ de: "2047-03-12" }))).toBe(false);
    expect(passaNoFiltro(l, filtro({ ate: "2047-03-10" }))).toBe(false);
  });

  it("a atividade de todas as turmas não passa num filtro de turma nem de curso", () => {
    const global = linha({ codigo: "g1", turmaId: null, turmaCodigo: null, cursoCodigo: null });
    expect(passaNoFiltro(global, FILTRO_VAZIO)).toBe(true);
    expect(passaNoFiltro(global, filtro({ turma: "CUR-X T1 2047" }))).toBe(false);
    expect(passaNoFiltro(global, filtro({ curso: "CUR-X" }))).toBe(false);
  });
});

describe("o filtro da URL", () => {
  it("lê as nove chaves; a data fora de ISO cai para vazia", () => {
    const f = filtroDaUrl({
      turma: " CUR-X T1 2047 ",
      categoria: "CHD",
      de: "11/03/2047",
      ate: "2047-03-31",
      vinculo: "avulsa",
    });
    expect(f).toEqual({
      ...FILTRO_VAZIO,
      turma: "CUR-X T1 2047",
      categoria: "CHD",
      ate: "2047-03-31",
      vinculo: "avulsa",
    });
  });

  it("sem nada, nenhum filtro (e a aba da turma, que não tem turma nem curso, também)", () => {
    expect(haFiltro(filtroDaUrl({}))).toBe(false);
    expect(haFiltro(filtroDaUrl({ aba: "atividades", ano: "2047" }))).toBe(false);
    expect(haFiltro(filtroDaUrl({ responsavel: "x" }))).toBe(true);
  });
});

describe("as opções de disciplina do filtro", () => {
  const disc = (codigo: string, valor: string, cod: string, nome: string, curso = "CUR-X") =>
    linha({
      codigo,
      disciplinaCodigo: valor,
      disciplinaCod: cod,
      disciplinaRotulo: `${cod} — ${nome}`,
      cursoCodigo: curso,
    });

  it("as que aparecem nas linhas, sem repetir, com o romano pelo VALOR (IV antes de IX, IX antes de X)", () => {
    const linhas = [
      disc("d1", "DIS-10", "X", "Décima"),
      disc("d2", "DIS-9", "IX", "Nona"),
      disc("d3", "DIS-4", "IV", "Quarta"),
      disc("d4", "DIS-4", "IV", "Quarta"),
      linha({ codigo: "d5" }),
    ];
    // Pela letra, «IV» < «IX» < «X» também — o caso que discrimina é «V» contra «IX»: pela letra, IX viria antes.
    linhas.push(disc("d6", "DIS-5", "V", "Quinta"));
    expect(disciplinasDasLinhas(linhas, false)).toEqual([
      { valor: "DIS-4", rotulo: "IV — Quarta" },
      { valor: "DIS-5", rotulo: "V — Quinta" },
      { valor: "DIS-9", rotulo: "IX — Nona" },
      { valor: "DIS-10", rotulo: "X — Décima" },
    ]);
  });

  it("no módulo, pelo curso e depois pelo código, com o curso no rótulo", () => {
    const linhas = [
      disc("d1", "B-2", "II", "Segunda", "CUR-B"),
      disc("d2", "A-9", "IX", "Nona", "CUR-A"),
      disc("d3", "A-1", "I", "Primeira", "CUR-A"),
    ];
    expect(disciplinasDasLinhas(linhas, true).map((o) => o.rotulo)).toEqual([
      "CUR-A · I — Primeira",
      "CUR-A · IX — Nona",
      "CUR-B · II — Segunda",
    ]);
  });
});

describe("a semana do *Editar* (o DSA da turma na semana do lançamento, `FR-006.4`)", () => {
  it("a semana ISO da data, com o ano ISO", () => {
    expect(semanaParaEditar("2047-03-11")).toEqual({ semana: 11, ano: 2047, sabado: false });
  });

  it("o sábado abre a coluna do sábado", () => {
    expect(semanaParaEditar("2047-03-16")).toEqual({ semana: 11, ano: 2047, sabado: true });
  });

  it("na virada do ano, o ano é o da SEMANA ISO, não o do calendário", () => {
    // 01/01/2027 é sexta-feira da semana 53 de 2026.
    expect(semanaParaEditar("2027-01-01")).toEqual({ semana: 53, ano: 2026, sabado: false });
  });

  it("o que não é data ISO não vira endereço", () => {
    expect(semanaParaEditar("11/03/2047")).toBeNull();
    expect(semanaParaEditar("")).toBeNull();
  });
});

describe("o que sai para as estatísticas", () => {
  it("o tipo sem valor vira «Sem tipo informado» e o TA ausente vira zero", () => {
    const e = paraEstatistica(
      linha({ codigo: "s1", tipoValor: null, tipoRotulo: null, tempos: null }),
    );
    expect(e.tipoValor).toBe("Sem tipo informado");
    expect(e.ta).toBe(0);
    expect(paraEstatistica(PALESTRA_CHD).contaComo).toBe("CHD");
  });
});

describe("as turmas acima do máximo — lidas do veredito de `tetosDaTurma` (SC-003)", () => {
  it("só a categoria acima do máximo, e a turma EAD nunca", () => {
    const tetos = tetosDasTurmas(
      [
        { id: "t1", codigo: "CUR-X T1 2047", ead: false },
        { id: "t2", codigo: "CUR-X T2 2047", ead: true },
      ],
      [
        {
          turma_id: "t1",
          categoria: "AEC",
          cumprido: 30,
          limite_declarado: 20,
          ch_curricular: 500,
          percentual_norma: 10,
        },
        {
          turma_id: "t1",
          categoria: "TAD",
          cumprido: 10,
          limite_declarado: null,
          ch_curricular: 500,
          percentual_norma: 5,
        },
        {
          turma_id: "t2",
          categoria: "AEC",
          cumprido: 999,
          limite_declarado: 1,
          ch_curricular: 500,
          percentual_norma: 10,
        },
      ],
      [],
    );
    expect(acimaDoMaximo(tetos)).toEqual([
      { turmaCodigo: "CUR-X T1 2047", categoria: "aec", cumprido: 30, maximo: 20 },
    ]);
  });

  it("o cumprido IGUAL ao máximo não é «acima» (o limite é inclusivo, como na ficha)", () => {
    const tetos = tetosDasTurmas(
      [{ id: "t1", codigo: "CUR-X T1 2047", ead: false }],
      [
        {
          turma_id: "t1",
          categoria: "TR",
          cumprido: 50,
          limite_declarado: null,
          ch_curricular: 500,
          percentual_norma: 10,
        },
      ],
      [],
    );
    expect(acimaDoMaximo(tetos)).toEqual([]);
  });
});

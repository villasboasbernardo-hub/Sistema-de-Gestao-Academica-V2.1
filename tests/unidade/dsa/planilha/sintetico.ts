/**
 * Uma turma sintética para os testes da planilha de contingência — **dado fictício**, nada real.
 *
 * ⚠️ **O PAPEL DE CADA SEMANA SAI DO DOMÍNIO DE VERDADE**: `montarSemana` + `documentoImpresso`, as
 * mesmas funções do `/print/dsa`. É contra elas que a planilha se compara — montar o papel à mão aqui
 * seria provar a planilha contra uma segunda implementação, que é o que a spec proíbe.
 */
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { montarSemana, type FatoDaSemana } from "@/lib/dominio/dsa/grade";
import { gradeDoPapel, type GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import { relogioDoRegime, type Relogio } from "@/lib/dominio/dsa/horario-do-bloco";
import {
  documentoImpresso,
  legendaDeTecnicas,
  tabelaDeCh,
  type DiaImpresso,
  type ExecucaoDaDisciplina,
  type ItemDaLegenda,
  type TecnicaDoCatalogo,
} from "@/lib/dominio/dsa/impressao";
import { numeroDoDsa } from "@/lib/dominio/dsa/numero-do-dsa";
import {
  chaveDoFato,
  type FatoDoInsumo,
  type InsumoDaPlanilha,
} from "@/lib/dominio/dsa/planilha/tipos";
import { semanasDaPlanilha } from "@/lib/dominio/dsa/planilha/semanas";

export const RELOGIO_A = relogioDoRegime({
  regimeTempos: 8,
  taDuracaoMin: 45,
  intervaloManhaMin: 5,
  intervaloTardeMin: 5,
  horaInicioManha: "07:50",
  horaInicioTarde: "13:00",
  configuracaoHorarioId: null,
}) as Relogio;

export const RELOGIO_B = relogioDoRegime({
  regimeTempos: 7,
  taDuracaoMin: 50,
  intervaloManhaMin: 10,
  intervaloTardeMin: 10,
  horaInicioManha: "08:10",
  horaInicioTarde: "13:10",
  configuracaoHorarioId: null,
}) as Relogio;

export const TECNICAS: readonly TecnicaDoCatalogo[] = [
  { nome: "Aula expositiva", sigla: "AE" },
  { nome: "Prova mista", sigla: "PM" },
  { nome: "Exposição oral", sigla: "EO" },
  { nome: "Estudo individual", sigla: "EI" },
  { nome: "Estudo dirigido", sigla: null },
];

export const DISCIPLINAS = [
  { id: "d1", codigo: "I", nome: "Navegação de teste", chPrevista: 40 },
  { id: "d2", codigo: "II", nome: "Meteorologia de teste", chPrevista: 30 },
  { id: "d9", codigo: "IX", nome: "Hidrografia de teste", chPrevista: 20 },
  { id: "d4", codigo: "IV", nome: "Cartografia de teste", chPrevista: 10 },
] as const;

export const UNIDADES = [
  {
    id: "u11",
    disciplinaId: "d1",
    numero: 1,
    topico: "Tópico I-1",
    chPrevista: 10,
    tecnicaSugerida: "Aula expositiva",
  },
  {
    id: "u12",
    disciplinaId: "d1",
    numero: 2,
    topico: "Tópico I-2",
    chPrevista: 10,
    tecnicaSugerida: null,
  },
  {
    id: "u21",
    disciplinaId: "d2",
    numero: 1,
    topico: "Tópico II-1",
    chPrevista: 15,
    tecnicaSugerida: "Estudo dirigido",
  },
  {
    id: "u91",
    disciplinaId: "d9",
    numero: 1,
    topico: "Tópico IX-1",
    chPrevista: 20,
    tecnicaSugerida: "Aula expositiva",
  },
] as const;

export const INSTRUTORES = [
  { id: "p1", nomeNoDsa: "CT Instrutor Alfa" },
  { id: "p2", nomeNoDsa: "CC Instrutor Bravo" },
] as const;

export type Lancamento = {
  readonly id: string;
  readonly dia: number;
  readonly ta: number | null;
  readonly tempos: number;
  readonly origem: FatoDaSemana["origem"];
  readonly disciplina: string | null;
  readonly ue?: number;
  readonly conteudo: string;
  readonly tecnica: string | null;
  readonly instrutor: string | null;
  readonly local: string | null;
  readonly categoria?: FatoDoInsumo["categoria"];
  readonly tipoAvaliacao?: string;
};

export type SemanaSintetica = {
  readonly numero: number;
  readonly relogio: Relogio | null;
  readonly lancamentos: readonly Lancamento[];
  readonly feriados?: readonly { readonly dia: number; readonly descricao: string }[];
};

export const ANO = 2026;
export const HOJE = "2026-04-08";

const aula = (
  id: string,
  dia: number,
  ta: number,
  tempos: number,
  disciplina: string,
  ue: number | null,
  extra: Partial<Lancamento> = {},
): Lancamento => ({
  id,
  dia,
  ta,
  tempos,
  origem: "aula",
  disciplina,
  ...(ue === null ? {} : { ue }),
  conteudo: ue === null ? "Conteúdo livre" : `Tópico ${disciplina}-${ue}`,
  tecnica: ue !== null && disciplina !== "II" ? "Aula expositiva" : null,
  instrutor: "CT Instrutor Alfa",
  local: "Sala 1",
  ...extra,
});

/** As semanas de referência — cada uma exercita um caso do papel. */
export const SEMANAS: readonly SemanaSintetica[] = [
  {
    /* Bloco que atravessa o almoço; dois lançamentos seguidos com a mesma chave; avaliação PM. */
    numero: 15,
    relogio: RELOGIO_A,
    lancamentos: [
      aula("a1", 0, 4, 3, "I", 1),
      aula("a2", 1, 1, 1, "I", 2, { conteudo: "Tópico I-2" }),
      aula("a3", 1, 2, 1, "I", 2, { conteudo: "Tópico I-2" }),
      aula("a4", 1, 3, 2, "II", 1, { tecnica: "Estudo dirigido", instrutor: "CC Instrutor Bravo" }),
      {
        id: "v1",
        dia: 2,
        ta: 1,
        tempos: 2,
        origem: "avaliacao",
        disciplina: "I",
        conteudo: "Prova",
        tecnica: "Prova mista",
        instrutor: "CT Instrutor Alfa",
        local: "Sala 1",
        tipoAvaliacao: "Prova",
      },
      aula("a5", 3, 1, 5, "IX", 1),
      {
        id: "n1",
        dia: 4,
        ta: 3,
        tempos: 1,
        origem: "atividade_nao_letiva",
        disciplina: null,
        conteudo: "Estudo individual",
        tecnica: null,
        instrutor: null,
        local: "Biblioteca",
        categoria: "Estudo_Individual",
      },
      aula("a6", 4, 1, 2, "II", null, { conteudo: "Aula sem UE" }),
    ],
  },
  {
    /* Semana sem aula, com feriado de dia inteiro e uma TAD. */
    numero: 16,
    relogio: RELOGIO_A,
    feriados: [{ dia: 2, descricao: "Feriado de teste" }],
    lancamentos: [
      {
        id: "n2",
        dia: 0,
        ta: 1,
        tempos: 2,
        origem: "atividade_nao_letiva",
        disciplina: null,
        conteudo: "Atividade de teste",
        tecnica: null,
        instrutor: null,
        local: null,
        categoria: "TAD",
      },
    ],
  },
  {
    /* Outro relógio; sábado lançado; sem posição; AEC com disciplina. */
    numero: 17,
    relogio: RELOGIO_B,
    lancamentos: [
      aula("a7", 0, 1, 2, "IV", null, { conteudo: "Aula sem UE IV" }),
      aula("a8", 5, 1, 2, "I", 1),
      aula("a9", 2, null as unknown as number, 2, "II", 1),
      {
        id: "n3",
        dia: 3,
        ta: 2,
        tempos: 1,
        origem: "atividade_nao_letiva",
        disciplina: "II",
        conteudo: "Visita técnica",
        tecnica: null,
        instrutor: null,
        local: "Externo",
        categoria: "AEC",
      },
    ],
  },
];

function fatoDaSemana(l: Lancamento, data: string): FatoDaSemana {
  return {
    fatoId: l.id,
    origem: l.origem,
    data,
    taInicial: l.ta,
    tempos: l.tempos,
    herdado: false,
    disciplina: l.disciplina,
    conteudo: l.conteudo,
    tecnica: l.tecnica,
    instrutor: l.instrutor,
    local: l.local,
  };
}

/** O papel da semana com os dias que o `/print/dsa` mostraria (sábado só com lançamento). */
export function papelDaSemana(
  s: SemanaSintetica,
  comSabado: boolean,
): {
  readonly dias: readonly DiaImpresso[];
  readonly grade: GradeDoPapel | null;
} {
  const seis = datasDaSemanaIso(ANO, s.numero).slice(0, 6);
  const dias = comSabado ? seis : seis.slice(0, 5);
  const fatos = s.lancamentos.map((l) => fatoDaSemana(l, seis[l.dia] ?? ""));
  const semana = montarSemana({
    dias,
    relogio: s.relogio,
    temposDeclarados: s.relogio?.temposDoRegime ?? 8,
    fatos: fatos.filter((f) => dias.includes(f.data)),
    feriados: (s.feriados ?? []).map((f) => ({
      data: seis[f.dia] ?? "",
      descricao: f.descricao,
      impacto: "dia_inteiro" as const,
    })),
    marcas: new Map(),
    hoje: HOJE,
    sabadoAberto: comSabado,
  });
  const idsDeEstudoIndividual = new Set(
    s.lancamentos.filter((l) => l.categoria === "Estudo_Individual").map((l) => l.id),
  );
  const impressos = documentoImpresso(semana, { tecnicas: TECNICAS, idsDeEstudoIndividual });
  return { dias: impressos, grade: gradeDoPapel(impressos, s.relogio) };
}

const todosOsLancamentos = () =>
  SEMANAS.flatMap((s) => {
    const seis = datasDaSemanaIso(ANO, s.numero).slice(0, 6);
    return s.lancamentos.map((l) => ({ ...l, data: seis[l.dia] ?? "", semana: s.numero }));
  });

export const DATA_INICIO = "2026-04-06";

export function numeroDaSemana(numero: number): number | null {
  return numeroDoDsa({
    datasComLancamento: todosOsLancamentos()
      .filter((l) => l.ta !== null && (l.origem === "aula" || l.origem === "avaliacao"))
      .map((l) => l.data),
    dataInicio: DATA_INICIO,
    semana: { ano: ANO, numero },
  });
}

/** A CH cumprida até o fim da semana, pela regra do sistema: todo fato com TA e disciplina. */
export function execucaoAte(numero: number): readonly ExecucaoDaDisciplina[] {
  const ultimo = datasDaSemanaIso(ANO, numero)[5] ?? "";
  return DISCIPLINAS.map((d) => ({
    codigo: d.codigo,
    nome: d.nome,
    prevista: d.chPrevista,
    cumprida: todosOsLancamentos()
      .filter(
        (l) =>
          l.ta !== null &&
          l.disciplina === d.codigo &&
          l.origem !== "atividade_nao_letiva" &&
          l.data <= ultimo,
      )
      .reduce((soma, l) => soma + l.tempos, 0),
  }));
}

export function rodapeDaSemana(s: SemanaSintetica): {
  readonly ch: readonly ExecucaoDaDisciplina[];
  readonly legenda: readonly ItemDaLegenda[];
} {
  const comSabado = s.lancamentos.some((l) => l.dia === 5);
  const { dias } = papelDaSemana(s, comSabado);
  return {
    ch: tabelaDeCh(dias, execucaoAte(s.numero)),
    legenda: legendaDeTecnicas(dias, TECNICAS),
  };
}

/** O insumo da planilha, montado como a rota o monta: o papel de cada semana com os seis dias. */
export function insumoSintetico(opcoes: { readonly temSabado?: boolean } = {}): InsumoDaPlanilha {
  const { semanas: dasSemanas, inicial } = semanasDaPlanilha({
    turma: {
      modalidade: "presencial",
      inicioEtapaPresencial: null,
      terminoEtapaPresencial: null,
      dataInicio: DATA_INICIO,
      dataTermino: "2026-04-24",
    },
    datasComLancamento: [],
    hoje: HOJE,
  });
  const fatos = new Map<string, FatoDoInsumo>();
  const semanas = dasSemanas.map((sp) => {
    const s = SEMANAS.find((x) => x.numero === sp.numero) as SemanaSintetica;
    const { dias } = papelDaSemana(s, true);
    for (const l of s.lancamentos) {
      const data = sp.seisDias[l.dia] ?? "";
      fatos.set(chaveDoFato(l.id, data, l.ta), {
        origem: l.origem,
        codigo: `COD-${l.id}`,
        disciplinaCodigo: l.disciplina,
        unidadeNumero: l.ue ?? null,
        tipoAvaliacao: l.tipoAvaliacao ?? null,
        categoria: l.categoria ?? null,
      });
    }
    return {
      semana: { ano: sp.ano, numero: sp.numero },
      rotulo: sp.rotulo,
      seisDias: sp.seisDias,
      relogio: s.relogio,
      dias,
      avisosDosDias: sp.seisDias.map(() => []),
      semPosicao: s.lancamentos
        .filter((l) => l.ta === null)
        .map((l) => ({
          fatoId: l.id,
          data: sp.seisDias[l.dia] ?? "",
          taInicial: null,
          tempos: l.tempos,
          disciplina: l.disciplina ?? "",
          conteudo: l.conteudo,
          local: l.local ?? "",
          te: "",
          instrutor: l.instrutor ?? "",
          motivo: "sem TA no sistema",
        })),
      numero: numeroDaSemana(sp.numero),
      alunos: 12,
      assinaturas: {
        esquerda: {
          nome: "Encarregado de Teste",
          posto: "Capitão-Tenente (T)",
          funcao: "Encarregado",
        },
        direita: { nome: "Chefe de Teste", posto: "", funcao: "Chefe" },
      },
    };
  });
  return {
    turma: {
      codigo: "C-TESTE 2026",
      curso: "C-TESTE",
      dataInicio: DATA_INICIO,
      salaAlocada: "Sala 1",
    },
    geradaEm: "2026-04-08T15:30:00.000Z",
    hoje: HOJE,
    /* O painel do sistema dizia «Atrasada» para II no dia da geração. */
    retrato: new Map([["II", "atrasada" as const]]),
    geradaPor: "Operador de Teste",
    semanas,
    semanaInicial: inicial,
    temSabado: opcoes.temSabado ?? true,
    fatos,
    disciplinas: DISCIPLINAS,
    unidades: UNIDADES,
    atribuicoesPorUe: [{ unidadeEnsinoId: "u21", instrutorId: "p2" }],
    atribuicoesPorDisciplina: [
      { disciplinaId: "d1", instrutorId: "p1" },
      { disciplinaId: "d2", instrutorId: "p1" },
    ],
    instrutores: INSTRUTORES,
    tecnicas: TECNICAS,
    tiposDeAvaliacao: ["Prova", "Trabalho"],
    tecnicaDaVista: "Exposição oral",
    foraDaPasta: [],
    avisos: [],
  };
}

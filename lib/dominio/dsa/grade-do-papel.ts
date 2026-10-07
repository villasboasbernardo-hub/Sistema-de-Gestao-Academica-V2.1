/**
 * `RF-PDF-01` · `RF-DSA-06` — a **grade** do DSA no modelo v4: dias em colunas, tempos em linhas,
 * intervalos e almoço entre eles, e cada lançamento como um **cartão** que ocupa os tempos dele.
 *
 * > Referência: `docs/referencias/dsa-modelo/DSA - Modelo v4.dc.html` *(modelo escolhido por
 * > Bernardo Villas Boas em 07/10/2026)*.
 *
 * ⚠️ **A GRADE NÃO É FIXA.** O modelo desenha 5 dias × 8 tempos; aqui as linhas saem do **relógio
 * vigente da turma** (catálogo ou regime: 7, 8 ou 9 tempos; 4 ou 5 de manhã; intervalos e almoço
 * reais, calculados das horas) e as colunas saem dos **dias da semana do documento** — com o sábado
 * quando ele existe. O número de linhas é o maior entre os tempos do regime e o último tempo
 * ocupado na semana, para que o Estudo Individual no tempo **excepcional** (CFG-F/G/H) tenha linha.
 *
 * ⚠️ **ISTO É SÓ ARRANJO, NENHUMA REGRA NOVA.** Quem decide o que entra no papel continua sendo
 * `documentoImpresso` (`impressao.ts`): esta função recebe os dias já impressos e o relógio e só diz
 * **onde** cada cartão vai. A tela e a rota `/print/dsa` montam a grade pela mesma chamada.
 *
 * ⚠️ **O BLOCO QUE ATRAVESSA O ALMOÇO VIRA DOIS CARTÕES** (`SC-011`, o `D-3` da planilha): um por
 * período, cada um com os TA dele — o almoço nunca fica dentro de um cartão.
 */
import type { DiaImpresso, LinhaImpressa } from "./impressao";
import { minutosEntre, type Periodo, type Relogio } from "./horario-do-bloco";

/** Uma faixa horizontal da grade, de cima para baixo. */
export type FaixaDaGrade =
  | {
      readonly tipo: "tempo";
      readonly numero: number;
      readonly inicio: string;
      readonly fim: string;
      readonly periodo: Periodo;
      /** Além do regime (o 9º da `RF-HOR-03.1`, o EI do catálogo). */
      readonly excepcional: boolean;
    }
  | { readonly tipo: "intervalo"; readonly minutos: number }
  | { readonly tipo: "almoco"; readonly inicio: string; readonly fim: string };

/** Uma coluna da grade — um dia do documento. */
export type ColunaDaGrade = {
  readonly data: string;
  /** `SEG` … `SÁB`. */
  readonly sigla: string;
  /** `DD/MM`. */
  readonly diaMes: string;
  /** A descrição do feriado de dia inteiro, ou `null`. */
  readonly bloqueio: string | null;
};

/** Como o cartão se apresenta — derivado da linha, nunca escolhido pela tela. */
export type TipoDeCartao = "aula" | "avaliacao" | "estudo" | "atividade";

/** Um cartão: um lançamento (ou a metade dele, de um lado do almoço) num dia. */
export type CartaoDaGrade = {
  /** Índice da coluna (0 = primeiro dia). */
  readonly coluna: number;
  /** Índices em `faixas`, **inclusivos** — sempre faixas do tipo `tempo`. */
  readonly faixaInicial: number;
  readonly faixaFinal: number;
  /** Os TA **desta parte** do lançamento. */
  readonly ta: number;
  /** 1 de 1, ou 1 e 2 de 2 quando atravessa o almoço. */
  readonly parte: number;
  readonly partes: number;
  readonly tipo: TipoDeCartao;
  readonly linha: LinhaImpressa;
};

export type GradeDoPapel = {
  readonly faixas: readonly FaixaDaGrade[];
  readonly colunas: readonly ColunaDaGrade[];
  readonly cartoes: readonly CartaoDaGrade[];
  /** Linha que não tem tempo no relógio (TA ausente ou fora dele) — vai para baixo da grade, nunca some. */
  readonly foraDaGrade: readonly { readonly coluna: number; readonly linha: LinhaImpressa }[];
};

/**
 * As técnicas que marcam **avaliação** no cartão (o destaque verde do modelo v4, que usa estas
 * três: prova mista, prova objetiva e prova prática). É só apresentação — a regra do que é
 * avaliação continua no banco.
 */
export const SIGLAS_DE_AVALIACAO: ReadonlySet<string> = new Set(["PM", "PO", "PP"]);

const SIGLAS_DOS_DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

function colunaDoDia(dia: DiaImpresso): ColunaDaGrade {
  const [ano, mes, d] = dia.data.split("-").map(Number);
  const semana = new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, d ?? 1)).getUTCDay();
  return {
    data: dia.data,
    sigla: SIGLAS_DOS_DIAS[semana] ?? "",
    diaMes: `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}`,
    bloqueio: dia.bloqueio,
  };
}

function tipoDoCartao(linha: LinhaImpressa): TipoDeCartao {
  if (linha.estudoIndividual) return "estudo";
  if (SIGLAS_DE_AVALIACAO.has(linha.te.trim().toUpperCase())) return "avaliacao";
  if (linha.disciplina === "") return "atividade";
  return "aula";
}

/**
 * A grade do documento. `null` quando não há relógio — sem horas não há linhas, e quem chama
 * degrada para a lista (`RN-DEG-01`).
 */
export function gradeDoPapel(
  dias: readonly DiaImpresso[],
  relogio: Relogio | null,
): GradeDoPapel | null {
  if (relogio === null || relogio.tempos.length === 0) return null;

  const ultimoOcupado = dias.reduce((maior, dia) => {
    for (const l of dia.linhas) {
      if (l.taInicial === null) continue;
      maior = Math.max(maior, l.taInicial + Math.max(1, l.tempos ?? 1) - 1);
    }
    return maior;
  }, 0);
  const quantos = Math.min(relogio.tempos.length, Math.max(relogio.temposDoRegime, ultimoOcupado));
  const tempos = [...relogio.tempos].sort((a, b) => a.numero - b.numero).slice(0, quantos);

  const faixas: FaixaDaGrade[] = [];
  const faixaDoTempo = new Map<number, number>();
  tempos.forEach((t, i) => {
    const anterior = tempos[i - 1];
    if (anterior !== undefined) {
      if (anterior.periodo !== t.periodo)
        faixas.push({ tipo: "almoco", inicio: anterior.fim, fim: t.inicio });
      else
        faixas.push({
          tipo: "intervalo",
          minutos: minutosEntre(anterior.fim, t.inicio),
        });
    }
    faixaDoTempo.set(t.numero, faixas.length);
    faixas.push({
      tipo: "tempo",
      numero: t.numero,
      inicio: t.inicio,
      fim: t.fim,
      periodo: t.periodo,
      excepcional: t.tipo === "excepcional" || t.numero > relogio.temposDoRegime,
    });
  });

  const periodoDe = new Map(tempos.map((t) => [t.numero, t.periodo] as const));
  const cartoes: CartaoDaGrade[] = [];
  const foraDaGrade: { coluna: number; linha: LinhaImpressa }[] = [];

  dias.forEach((dia, coluna) => {
    for (const linha of dia.linhas) {
      const inicio = linha.taInicial;
      const n = Math.max(1, linha.tempos ?? 1);
      if (inicio === null || !faixaDoTempo.has(inicio) || !faixaDoTempo.has(inicio + n - 1)) {
        foraDaGrade.push({ coluna, linha });
        continue;
      }
      // Agrupa os TA consecutivos do mesmo período: um grupo por lado do almoço.
      const grupos: number[][] = [];
      for (let ta = inicio; ta < inicio + n; ta++) {
        const ultimo = grupos[grupos.length - 1];
        const anterior = ultimo?.[ultimo.length - 1];
        if (
          ultimo !== undefined &&
          anterior !== undefined &&
          periodoDe.get(anterior) === periodoDe.get(ta)
        )
          ultimo.push(ta);
        else grupos.push([ta]);
      }
      grupos.forEach((grupo, i) => {
        cartoes.push({
          coluna,
          faixaInicial: faixaDoTempo.get(grupo[0] as number) as number,
          faixaFinal: faixaDoTempo.get(grupo[grupo.length - 1] as number) as number,
          ta: grupo.length,
          parte: i + 1,
          partes: grupos.length,
          tipo: tipoDoCartao(linha),
          linha,
        });
      });
    }
  });

  return { faixas, colunas: dias.map(colunaDoDia), cartoes, foraDaGrade };
}

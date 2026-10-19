/**
 * As semanas da planilha de contingência — `FR-030`, `FR-014`, `FR-022` e `DP-3` da spec 015.
 *
 * > *"A planilha MUST cobrir o ano inteiro da turma (`Q-3`): todas as semanas do período cadastrado,
 * > da semana da data de início à da data de término — inclusive as já passadas e as ainda sem
 * > lançamento —, ressalvado o `FR-014`."* — `FR-030`
 * > *"Turma semipresencial MUST cobrir só as semanas da etapa presencial quando a etapa está
 * > cadastrada; sem etapa, todas as semanas, com o aviso do sistema (`D-DSA-2`)."* — `FR-014`
 *
 * ⚠️ **A SEMANA ISO NÃO NASCE AQUI** (`RN-DIST-01`): ela é `semanaIsoDe`, e os dias são
 * `datasDaSemanaIso`. Calcular semana num segundo lugar é onde duas implementações discordariam —
 * na virada do ano.
 *
 * ⚠️ **TURMA SEM PERÍODO NÃO GANHA UM ANO INVENTADO** (`RN-DEG-01`): a planilha cobre da primeira à
 * última semana com lançamento, mais a corrente, e diz isso no topo.
 */
import { datasDaSemanaIso, semanaIsoDe } from "../../carga-semanal";
import { dataParaLeitura } from "../../../formato/data";
import { etapaDaSemana, type TurmaParaEtapa } from "../etapa-presencial";
import {
  rotuloDaSemanaDoCurso,
  semanaDoCurso,
  type JanelaDaSemanaDoCurso,
} from "../semana-do-curso";

import type { IdentidadeDaSemana } from "./tipos";

export type SemanaDaPasta = IdentidadeDaSemana & {
  /** `Semana 15 — 06/04 a 11/04/2026` — único na pasta; é o valor do seletor da IMPRESSÃO. */
  readonly rotulo: string;
  /** Segunda a sábado. */
  readonly seisDias: readonly string[];
};

export const AVISO_SEM_PERIODO =
  "A turma não tem data de início ou de término cadastrada: a planilha cobre da primeira à última semana com lançamento, mais a semana corrente.";
export const AVISO_SEM_ETAPA =
  "Turma semipresencial sem etapa presencial cadastrada: a planilha traz todas as semanas do período.";

const chave = (s: IdentidadeDaSemana) => s.ano * 100 + s.numero;

function semanasEntre(de: IdentidadeDaSemana, ate: IdentidadeDaSemana): IdentidadeDaSemana[] {
  const semanas: IdentidadeDaSemana[] = [];
  const primeiro = datasDaSemanaIso(de.ano, de.numero)[0];
  if (primeiro === undefined) return semanas;
  const dia = new Date(`${primeiro}T12:00:00Z`);
  for (let i = 0; i < 60 * 7 * 3; i += 7) {
    const s = semanaIsoDe(dia.toISOString().slice(0, 10));
    if (s === null || chave(s) > chave(ate)) break;
    semanas.push({ ano: s.ano, numero: s.numero });
    dia.setUTCDate(dia.getUTCDate() + 7);
  }
  return semanas;
}

/**
 * `Semana 28 de 37 — 12/10/2026 a 17/10/2026` (FR-009.5 e FR-005.1 da spec 016): a semana do curso, pela
 * função única, e as datas com o ano nas duas pontas. ⚠️ **A SEMANA ISO SAIU DO RÓTULO** — ele dizia
 * *"Semana 42 — 12/10 a 17/10/2026"*, uma terceira numeração. Fora da janela da turma, só as datas.
 */
function rotuloDa(
  s: IdentidadeDaSemana,
  seisDias: readonly string[],
  janela: JanelaDaSemanaDoCurso,
): string {
  const segunda = seisDias[0] ?? "";
  const sabado = seisDias[5] ?? segunda;
  const datas = `${dataParaLeitura(segunda)} a ${dataParaLeitura(sabado)}`;
  const semana = semanaDoCurso({ ...janela, semana: s });
  return semana.numero === null ? datas : `${rotuloDaSemanaDoCurso(semana)} — ${datas}`;
}

export function semanasDaPlanilha(entrada: {
  readonly turma: TurmaParaEtapa & {
    readonly dataInicio: string | null;
    readonly dataTermino: string | null;
    /** `cursos.duracao_semanas` — o T do rótulo (FR-009.3). */
    readonly duracaoSemanasDoCurso: number | null;
  };
  /** As datas com lançamento da turma — o piso e o teto quando falta o período. */
  readonly datasComLancamento: readonly string[];
  readonly hoje: string;
}): {
  readonly semanas: readonly SemanaDaPasta[];
  readonly inicial: number;
  readonly avisos: readonly string[];
} {
  const avisos: string[] = [];
  const hoje = semanaIsoDe(entrada.hoje);
  let de = entrada.turma.dataInicio ? semanaIsoDe(entrada.turma.dataInicio) : null;
  let ate = entrada.turma.dataTermino ? semanaIsoDe(entrada.turma.dataTermino) : null;

  if (de === null || ate === null) {
    avisos.push(AVISO_SEM_PERIODO);
    const semanasComLancamento = entrada.datasComLancamento
      .map(semanaIsoDe)
      .filter((s): s is NonNullable<typeof s> => s !== null);
    const todas = [...semanasComLancamento, ...(hoje ? [hoje] : [])].sort(
      (a, b) => chave(a) - chave(b),
    );
    de = todas[0] ?? null;
    ate = todas[todas.length - 1] ?? null;
  }
  if (de === null || ate === null) return { semanas: [], inicial: 0, avisos };

  let semanas = semanasEntre(de, ate).map((s) => {
    const seisDias = datasDaSemanaIso(s.ano, s.numero).slice(0, 6);
    return {
      ...s,
      seisDias,
      rotulo: rotuloDa(s, seisDias, {
        dataInicio: entrada.turma.dataInicio,
        dataTermino: entrada.turma.dataTermino,
        duracaoSemanasDoCurso: entrada.turma.duracaoSemanasDoCurso,
      }),
    };
  });

  if (entrada.turma.modalidade === "semipresencial") {
    const comEtapa = semanas.filter(
      (s) => etapaDaSemana(entrada.turma, s.seisDias).tipo !== "fora",
    );
    const semJanela = semanas.some(
      (s) => etapaDaSemana(entrada.turma, s.seisDias).tipo === "sem_janela",
    );
    if (semJanela) avisos.push(AVISO_SEM_ETAPA);
    semanas = comEtapa;
  }

  const indiceDeHoje = hoje === null ? -1 : semanas.findIndex((s) => chave(s) === chave(hoje));
  return { semanas, inicial: indiceDeHoje >= 0 ? indiceDeHoje : 0, avisos };
}

/** A turma tem lançamento em sábado em alguma semana do ano? (`DP-3`) */
export function temSabadoNoAno(datasComLancamento: readonly string[]): boolean {
  return datasComLancamento.some((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 6);
}

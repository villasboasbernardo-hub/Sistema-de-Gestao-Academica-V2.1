/**
 * `RF-DSA-06` · D-COR-1 — a **semana do curso**, "Semana N de T", no cabeçalho do DSA (tela, papel e
 * planilha). FR-009 da spec 016 (item 1.9 do plano de correções).
 *
 * > *"D-COR-1 — O número do DSA passa a ser a semana corrida do curso: a semana 1 é a que contém o início
 * > da turma, e dali em diante conta toda semana, com ou sem aula. O cabeçalho mostra «Semana N de T»,
 * > com T a duração do curso em semanas."* — Bernardo Villas Boas, 16/10/2026
 *
 * > *"T = cursos.duracao_semanas; se a turma for mais longa, T = semanas corridas da turma, e a ficha da
 * > turma mostra o aviso de cadastro «a turma tem N semanas e o curso, M». Nunca imprimir N > T. Sem
 * > duração no curso, T = semanas da turma."* — Q-1, Bernardo Villas Boas, 17/10/2026
 *
 * ⚠️ **ELE SUBSTITUI `numero-do-dsa.ts`, e a convenção que caiu está escrita aqui para não voltar.** Até
 * 17/10/2026 o "Nº do DSA" contava só as semanas COM lançamento (convenção da aba CRONOS, `Q-3` da spec
 * 013): uma semana sem aula não consumia número, e a C-Ap-FR 2026 saía *"Nº 26"* na semana corrida 28.
 * Bernardo autorizou a mudança nominalmente (D-COR-1, 16/10/2026). Agora o número é de **calendário**:
 * não depende de lançamento nenhum, e por isso este módulo nem os recebe.
 *
 * ⚠️ **A SEMANA ISO NÃO NASCE AQUI** (`RN-DIST-01`, ponto único): as segundas-feiras vêm de `semanaIsoDe`
 * e de `datasDaSemanaIso`, de `lib/dominio/carga-semanal.ts`, o único dono da aritmética de semana ISO.
 * O que se faz aqui é só a distância, em semanas, entre duas segundas-feiras — e a virada do ano sai
 * certa sem caso especial, porque a segunda da semana 1 de 2027 é uma data como outra qualquer.
 *
 * ⚠️ **NÃO HÁ "SEMANA 0" NEM N > T** (FR-009.3, FR-009.6): fora da janela da turma o número é `null`, com
 * o motivo escrito, e o papel imprime «—». ⚠️ **SEM T, O RÓTULO É "Semana N"**, com um aviso de cadastro
 * que não bloqueia nada (`RN-DEG-02`).
 *
 * ⚠️ **TypeScript puro** (Princípio II). Datas de calendário são `aaaa-mm-dd`, nunca `Date`.
 */
import { datasDaSemanaIso, semanaIsoDe, semanasDoAnoIso } from "@/lib/dominio/carga-semanal";
import type { IdentidadeDaSemana } from "@/lib/dominio/distribuicao-semanal";

/** A janela da turma e a duração do curso — o que a conta precisa, e nada de lançamento. */
export type JanelaDaSemanaDoCurso = {
  /** `turmas.data_inicio` — nulável no banco. */
  readonly dataInicio: string | null;
  /** `turmas.data_termino` — nulável no banco. */
  readonly dataTermino: string | null;
  /** `cursos.duracao_semanas` — 12 dos 24 cursos não a têm (medido em 17/10/2026). */
  readonly duracaoSemanasDoCurso: number | null;
};

export type EntradaDaSemanaDoCurso = JanelaDaSemanaDoCurso & {
  /** A semana pedida, como vem da URL (`?semana=&ano=`). */
  readonly semana: IdentidadeDaSemana;
};

export type SemanaDoCurso = {
  /** N — `null` quando a semana pedida não é do curso. */
  readonly numero: number | null;
  /** T — `null` quando não há como saber (sem duração e sem término). */
  readonly total: number | null;
  /** Por que não há número. Só quando `numero` é `null`. */
  readonly motivo: string | null;
  /** O aviso de cadastro que não impede o número — hoje, a falta do T. */
  readonly aviso: string | null;
};

/** O que o cabeçalho imprime quando não há semana do curso (FR-009.6). Nunca "Semana 0". */
export const SEMANA_AUSENTE_NO_CABECALHO = "—";

export const MOTIVO_SEM_DATA_DE_INICIO =
  "A turma não tem data de início — a semana do curso sai como «—» até que ela seja preenchida na ficha da turma.";

export const MOTIVO_ANTES_DO_INICIO =
  "Esta semana é anterior ao início da turma — ela não tem DSA, e o papel sai com «—».";

export const MOTIVO_DEPOIS_DO_TERMINO =
  "Esta semana é posterior à última semana da turma — ela não tem DSA, e o papel sai com «—».";

export const MOTIVO_SEMANA_INVALIDA = "Esta semana não existe no ano pedido.";

export const AVISO_SEM_TOTAL =
  "O curso não tem duração em semanas e a turma não tem data de término — o cabeçalho sai «Semana N», sem o total.";

const FORMATO_DE_DATA = /^\d{4}-\d{2}-\d{2}$/;
const DIA_MS = 86_400_000;

function dataDeCalendario(valor: string | null): string | null {
  if (valor === null) return null;
  const limpo = valor.trim();
  return FORMATO_DE_DATA.test(limpo) ? limpo : null;
}

/** Dias entre duas datas `aaaa-mm-dd` — aritmética de calendário em UTC, sem fuso. */
function diasEntre(de: string, ate: string): number {
  const dia = (d: string) => {
    const [a, m, n] = d.split("-").map(Number);
    return Date.UTC(a ?? 0, (m ?? 1) - 1, n ?? 1) / DIA_MS;
  };
  return Math.round(dia(ate) - dia(de));
}

/** A segunda-feira da semana que contém a data, pelo dono da semana ISO. */
function segundaDe(data: string | null): string | null {
  const limpa = dataDeCalendario(data);
  return limpa === null ? null : (semanaIsoDe(limpa)?.segunda ?? null);
}

/** A segunda-feira da semana pedida, ou `null` se a semana não existe no ano. */
function segundaDaSemanaPedida(semana: IdentidadeDaSemana): string | null {
  const ano = Number(semana.ano);
  const numero = Number(semana.numero);
  if (!Number.isInteger(ano) || !Number.isInteger(numero)) return null;
  if (numero < 1 || numero > semanasDoAnoIso(ano)) return null;
  return datasDaSemanaIso(ano, numero)[0] ?? null;
}

/** Quantas semanas corridas a turma tem — da semana do início à do término, inclusive. */
function semanasDaTurma(janela: JanelaDaSemanaDoCurso): number | null {
  const inicio = segundaDe(janela.dataInicio);
  const termino = segundaDe(janela.dataTermino);
  if (inicio === null || termino === null) return null;
  const semanas = diasEntre(inicio, termino) / 7 + 1;
  return semanas >= 1 ? semanas : null;
}

function duracaoValida(duracao: number | null): number | null {
  return duracao !== null && Number.isInteger(duracao) && duracao > 0 ? duracao : null;
}

/** O T da Q-1: a duração do curso, ou as semanas da turma quando ela é mais longa ou o curso não tem. */
function totalDe(janela: JanelaDaSemanaDoCurso): number | null {
  const duracao = duracaoValida(janela.duracaoSemanasDoCurso);
  const daTurma = semanasDaTurma(janela);
  if (duracao === null) return daTurma;
  return daTurma !== null && daTurma > duracao ? daTurma : duracao;
}

/**
 * A semana do curso da semana pedida (FR-009.1, FR-009.3, FR-009.6).
 *
 * ⚠️ **O LIMITE SUPERIOR É O MENOR DOS DOIS QUE EXISTIREM — o término da turma e o T** — e é ele que
 * garante N ≤ T: com término, a semana além dele não é da turma; sem término, a semana além da duração do
 * curso também não.
 */
export function semanaDoCurso(entrada: EntradaDaSemanaDoCurso): SemanaDoCurso {
  const total = totalDe(entrada);
  const inicio = segundaDe(entrada.dataInicio);
  if (inicio === null) {
    return { numero: null, total, motivo: MOTIVO_SEM_DATA_DE_INICIO, aviso: null };
  }
  const pedida = segundaDaSemanaPedida(entrada.semana);
  if (pedida === null) {
    return { numero: null, total, motivo: MOTIVO_SEMANA_INVALIDA, aviso: null };
  }
  const numero = diasEntre(inicio, pedida) / 7 + 1;
  if (numero < 1) return { numero: null, total, motivo: MOTIVO_ANTES_DO_INICIO, aviso: null };

  const daTurma = semanasDaTurma(entrada);
  const limite = daTurma ?? total;
  if (limite !== null && numero > limite) {
    return { numero: null, total, motivo: MOTIVO_DEPOIS_DO_TERMINO, aviso: null };
  }
  return { numero, total, motivo: null, aviso: total === null ? AVISO_SEM_TOTAL : null };
}

/** O valor sem a palavra "Semana": "N de T", "N" sem T, ou «—» sem semana. */
export function valorDaSemanaDoCurso(semana: SemanaDoCurso): string {
  if (semana.numero === null) return SEMANA_AUSENTE_NO_CABECALHO;
  return semana.total === null ? `${semana.numero}` : `${semana.numero} de ${semana.total}`;
}

/**
 * O rótulo solto — na navegação, no rodapé do papel e na planilha: "Semana N de T", "Semana N" sem T, ou
 * «—» sem semana (FR-009.2).
 */
export function rotuloDaSemanaDoCurso(semana: SemanaDoCurso): string {
  if (semana.numero === null) return SEMANA_AUSENTE_NO_CABECALHO;
  return `Semana ${valorDaSemanaDoCurso(semana)}`;
}

/** O rótulo do campo do cabeçalho, na tela e no papel. */
export const ROTULO_DO_CAMPO_DA_SEMANA = "Semana do curso";

/**
 * O campo do cabeçalho num rótulo só: "Semana do curso: N de T" (ajuste A da conferência do PR #68,
 * Bernardo Villas Boas, 18/10/2026).
 *
 * ⚠️ **O CAMPO NÃO REPETE A PALAVRA**: com o rótulo "Semana do curso" em cima e "Semana 28 de 37"
 * embaixo, o papel dizia "semana" duas vezes. Onde o rótulo vem solto, sem campo (navegação, rodapé,
 * planilha), continua `rotuloDaSemanaDoCurso`.
 */
export function campoDaSemanaDoCurso(semana: SemanaDoCurso): string {
  return `${ROTULO_DO_CAMPO_DA_SEMANA}: ${valorDaSemanaDoCurso(semana)}`;
}

/**
 * O aviso de cadastro da ficha da turma quando ela é mais longa que o curso (FR-009.7). `null` quando não.
 *
 * ⚠️ **AVISA, NÃO BLOQUEIA** (`RN-DEG-02`): a turma real pode ser mais longa por decisão da Divisão de
 * Ensino; o aviso existe para que o cadastro do curso seja conferido, e o DSA conta até o fim da turma.
 */
export function avisoDeDuracao(janela: JanelaDaSemanaDoCurso): string | null {
  const duracao = duracaoValida(janela.duracaoSemanasDoCurso);
  const daTurma = semanasDaTurma(janela);
  if (duracao === null || daTurma === null || daTurma <= duracao) return null;
  return `A turma tem ${daTurma} semanas e o curso, ${duracao}.`;
}

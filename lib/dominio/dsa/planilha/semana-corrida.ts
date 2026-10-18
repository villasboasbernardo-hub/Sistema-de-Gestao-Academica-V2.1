/**
 * A **semana do curso** da planilha de contingência, em fórmula — "Semana N de T" (FR-009.5 da spec
 * 016; D-COR-1 e Q-1). É a mesma regra de `semanaDoCurso` (`lib/dominio/dsa/semana-do-curso.ts`),
 * reexpressa no vocabulário do Excel 2007 (`DP-2` da spec 015), e a suíte prova uma contra a outra.
 *
 * > *"O número do DSA passa a ser a semana corrida do curso: a semana 1 é a que contém o início da
 * > turma, e dali em diante conta toda semana, com ou sem aula."* — D-COR-1, Bernardo Villas Boas,
 * > 16/10/2026
 *
 * ⚠️ **A SEGUNDA-FEIRA SAI DO SERIAL DA DATA**: no Excel e no Google, o serial 2 é uma segunda-feira, e
 * para toda data depois de 01/03/1900 os dois concordam — então a segunda da semana de `x` é
 * `x − MOD(x − 2; 7)`, e a distância entre duas segundas, dividida por 7, é exata. Não há semana ISO
 * na conta (ela só existia para a contagem antiga, a da aba CRONOS, que caiu com a D-COR-1).
 *
 * ⚠️ **AS ENTRADAS SÃO AS DO CATÁLOGO** (início, término e duração do curso, na BD DISCIPLINAS): quem
 * corrigir o início da turma ali vê a numeração inteira acompanhar, sem baixar a planilha de novo.
 */
import { concat, fn, num, op, txt, type Formula } from "../../../planilha/formula";
import { SEMANA_AUSENTE_NO_CABECALHO } from "../semana-do-curso";

const vazio = txt("");
const SE = (condicao: Formula, entao: Formula, senao: Formula) => fn("IF", condicao, entao, senao);
const igual = (a: Formula, b: Formula) => op(a, "=", b);

/** A segunda-feira da semana de uma data: `x − MOD(x − 2; 7)`. */
export function segundaDaData(data: Formula): Formula {
  return op(data, "-", fn("MOD", op(data, "-", num(2)), num(7)));
}

/** Quantas semanas cabem de uma segunda a outra, inclusive: `(fim − início) / 7 + 1`. */
function semanasEntre(de: Formula, ate: Formula): Formula {
  return op(op(op(ate, "-", de), "/", num(7)), "+", num(1));
}

/**
 * As semanas corridas da turma — do início ao término, inclusive —, ou vazio sem uma das datas
 * (`semanasDaTurma` de `semana-do-curso.ts`).
 */
export function formulaDasSemanasDaTurma(inicio: Formula, termino: Formula): Formula {
  const semanas = semanasEntre(segundaDaData(inicio), segundaDaData(termino));
  return SE(
    fn("AND", fn("ISNUMBER", inicio), fn("ISNUMBER", termino)),
    SE(op(semanas, ">=", num(1)), semanas, vazio),
    vazio,
  );
}

/**
 * O T da Q-1: a duração do curso; a semana da turma quando ela é mais longa ou o curso não tem duração;
 * vazio quando não há nenhum dos dois (`totalDe` de `semana-do-curso.ts`).
 */
export function formulaDoTotal(duracao: Formula, semanasDaTurma: Formula): Formula {
  const valida = SE(
    fn("ISNUMBER", duracao),
    SE(
      fn("AND", op(duracao, ">", num(0)), igual(fn("MOD", duracao, num(1)), num(0))),
      duracao,
      vazio,
    ),
    vazio,
  );
  return SE(
    igual(valida, vazio),
    semanasDaTurma,
    SE(
      igual(semanasDaTurma, vazio),
      valida,
      SE(op(semanasDaTurma, ">", valida), semanasDaTurma, valida),
    ),
  );
}

/** N, sem o limite: a distância da semana do início à semana mostrada, ou vazio sem início. */
export function formulaDaSemanaCorrida(segundaDaSemana: Formula, inicio: Formula): Formula {
  return SE(
    fn("ISNUMBER", inicio),
    semanasEntre(segundaDaData(inicio), segundaDaData(segundaDaSemana)),
    vazio,
  );
}

/**
 * O rótulo do cabeçalho: "Semana N de T", "Semana N" sem T, ou «—» fora da janela — antes do início,
 * depois do término ou, sem término, depois da duração do curso (`semanaDoCurso` +
 * `rotuloDaSemanaDoCurso`). ⚠️ **N NUNCA PASSA DE T** (FR-009.6).
 */
export function formulaDoRotuloDaSemana(
  semanaCorrida: Formula,
  semanasDaTurma: Formula,
  total: Formula,
): Formula {
  const limite = SE(igual(semanasDaTurma, vazio), total, semanasDaTurma);
  const rotulo = SE(
    igual(total, vazio),
    concat(txt("Semana "), semanaCorrida),
    concat(txt("Semana "), semanaCorrida, txt(" de "), total),
  );
  return SE(
    igual(semanaCorrida, vazio),
    txt(SEMANA_AUSENTE_NO_CABECALHO),
    SE(
      op(semanaCorrida, "<", num(1)),
      txt(SEMANA_AUSENTE_NO_CABECALHO),
      SE(
        igual(limite, vazio),
        rotulo,
        SE(op(semanaCorrida, ">", limite), txt(SEMANA_AUSENTE_NO_CABECALHO), rotulo),
      ),
    ),
  );
}

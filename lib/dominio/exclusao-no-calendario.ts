/**
 * O alerta de impacto de excluir uma linha do calendário — D-COR-7 (spec 027, Bloco 12).
 *
 * > *"No Calendário, excluir NÃO é bloqueado, nem com DSA publicado nem com aula no dia. O Admin exclui qualquer
 * > lançamento (feriado, licença administrativa, dia parado), ativo ou inativo, depois de um ALERTA que mostra o impacto
 * > e pede confirmação."* · *"Antes de excluir, um diálogo de alerta lista o impacto calculado na hora: turmas
 * > atingidas, aulas, atividades e avaliações lançadas naquele dia, semanas de DSA publicadas que contêm o dia, e se a
 * > data já passou. Botões "Cancelar" e "Excluir mesmo assim". Sem vínculo, o alerta só pede a confirmação."*
 * > — Bernardo Villas Boas, 26 e 27/10/2026
 *
 * ⚠️ **O ALERTA NÃO DECIDE NADA**: excluir nunca é bloqueado. Quem calcula o impacto é o banco
 *    (`app.impacto_da_exclusao_do_feriado`, a mesma lista de lançamentos que contam — RP-8); aqui só se monta o texto.
 * ⚠️ **A LINHA INATIVA NÃO ATINGE TURMA** (D-9): ela já não conta em nada, e excluí-la não muda dias úteis, saldo nem
 *    DSA. O que há no dia continua listado, para quem confere.
 * ⚠️ **"A DATA JÁ PASSOU" É ANTES DE HOJE EM SÃO PAULO** (D-7) — o hoje vem de quem chama (`hojeNaCiaara()`), nunca do
 *    relógio do servidor (D20).
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */
import { datasDaSemanaIso } from "./carga-semanal";
import { rotuloDaSemanaDoCurso, semanaDoCurso } from "./dsa/semana-do-curso";
import { emOrdemDeTurma } from "./ordem-de-cursos";
import { dataParaLeitura } from "@/lib/formato/data";

export type TurmaDoImpacto = {
  readonly codigo: string;
  readonly ano: number;
  readonly cursoCodigo: string;
  readonly cursoClassificacao: string | null;
  readonly duracaoSemanas: number | null;
  readonly dataInicio: string | null;
  readonly dataTermino: string | null;
  readonly aulas: number;
  readonly atividades: number;
  readonly avaliacoes: number;
  /** A última versão publicada da semana que contém o dia: 0 = original, N = ALT N; nulo = não publicada. */
  readonly versaoPublicada: number | null;
};

export type ImpactoDaExclusao = {
  readonly data: string;
  readonly situacao: "ativo" | "inativo";
  readonly impacto: "dia_inteiro" | "parcial" | "informativo";
  /** A linha vale para todas as turmas (sem turma escolhida). */
  readonly todas: boolean;
  readonly anoIso: number;
  readonly semanaIso: number;
  readonly atividadesGlobais: number;
  readonly turmas: readonly TurmaDoImpacto[];
};

export type LinhaDoResumo = { readonly turma: string; readonly texto: string };

export type ResumoDoImpacto = {
  readonly passou: boolean;
  readonly fraseDaData: string;
  /** As turmas em que o dia volta a ser útil (vazio na linha inativa). */
  readonly turmasAtingidas: readonly string[];
  /** Por turma, o que conta no dia — só as turmas com algum lançamento. */
  readonly lancamentos: readonly LinhaDoResumo[];
  readonly atividadesGlobais: string | null;
  /** Por turma, a semana do DSA publicada que contém o dia. */
  readonly publicadas: readonly LinhaDoResumo[];
  readonly avisoDaPublicacao: string | null;
  readonly efeito: string;
  /** Nada ligado: nenhuma turma atingida, nenhum lançamento no dia, nenhuma semana publicada (D-8). */
  readonly semVinculo: boolean;
  readonly rotuloConfirmar: "Excluir" | "Excluir mesmo assim";
};

const IMPACTOS = new Set(["dia_inteiro", "parcial", "informativo"]);

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function textoDosLancamentos(t: TurmaDoImpacto): string {
  return [
    t.aulas > 0 ? plural(t.aulas, "aula", "aulas") : null,
    t.atividades > 0 ? plural(t.atividades, "atividade", "atividades") : null,
    t.avaliacoes > 0 ? plural(t.avaliacoes, "avaliação", "avaliações") : null,
  ]
    .filter((p): p is string => p !== null)
    .join(" · ");
}

function textoDaPublicada(t: TurmaDoImpacto, impacto: ImpactoDaExclusao): string {
  const dias = datasDaSemanaIso(impacto.anoIso, impacto.semanaIso);
  const datas = `${dataParaLeitura(dias[0])} a ${dataParaLeitura(dias[4])}`;
  const semana = semanaDoCurso({
    dataInicio: t.dataInicio,
    dataTermino: t.dataTermino,
    duracaoSemanasDoCurso: t.duracaoSemanas,
    semana: { ano: impacto.anoIso, numero: impacto.semanaIso },
  });
  const versao = t.versaoPublicada === 0 ? "original" : `ALT ${t.versaoPublicada}`;
  return semana.numero === null
    ? `Semana de ${datas}, ${versao}`
    : `${rotuloDaSemanaDoCurso(semana)} (${datas}), ${versao}`;
}

function efeitoDe(impacto: ImpactoDaExclusao): string {
  const sai =
    "A linha sai do calendário (também da lista das desativadas) e fica na auditoria, com quem e quando.";
  if (impacto.situacao === "inativo") {
    return `${sai} Ela já está desativada: excluí-la não muda dias úteis, saldo nem DSA.`;
  }
  if (impacto.impacto === "dia_inteiro") {
    return `${sai} O dia volta a ser útil nas turmas atingidas: conta de novo na capacidade e no saldo, e o DSA deixa de marcá-lo.`;
  }
  return `${sai} Ela deixa de valer no calendário.`;
}

/** O texto do alerta a partir do impacto lido do banco. */
export function resumoDoImpacto(impacto: ImpactoDaExclusao, hoje: string): ResumoDoImpacto {
  const ordenadas = emOrdemDeTurma(impacto.turmas);
  const passou = impacto.data < hoje;
  const turmasAtingidas =
    impacto.situacao === "ativo" ? ordenadas.map((t) => t.codigo) : ([] as string[]);
  const lancamentos = ordenadas
    .map((t) => ({ turma: t.codigo, texto: textoDosLancamentos(t) }))
    .filter((l) => l.texto !== "");
  const publicadas = ordenadas
    .filter((t) => t.versaoPublicada !== null)
    .map((t) => ({ turma: t.codigo, texto: textoDaPublicada(t, impacto) }));
  const semVinculo =
    turmasAtingidas.length === 0 &&
    lancamentos.length === 0 &&
    impacto.atividadesGlobais === 0 &&
    publicadas.length === 0;
  return {
    passou,
    fraseDaData: `A data (${dataParaLeitura(impacto.data)}) ${passou ? "já passou" : "ainda não passou"}.`,
    turmasAtingidas,
    lancamentos,
    atividadesGlobais:
      impacto.atividadesGlobais > 0
        ? `${plural(impacto.atividadesGlobais, "atividade", "atividades")} de todas as turmas`
        : null,
    publicadas,
    avisoDaPublicacao:
      publicadas.length > 0 && impacto.situacao === "ativo"
        ? "A versão publicada não muda e não é republicada: o DSA da semana passa a avisar «alterado desde a publicação»."
        : null,
    efeito: efeitoDe(impacto),
    semVinculo,
    rotuloConfirmar: semVinculo ? "Excluir" : "Excluir mesmo assim",
  };
}

function numero(valor: unknown): number | null {
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;
  if (typeof valor === "string" && valor.trim() !== "" && Number.isFinite(Number(valor))) {
    return Number(valor);
  }
  return null;
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" ? valor : null;
}

function turmaDoBanco(valor: unknown): TurmaDoImpacto | null {
  if (typeof valor !== "object" || valor === null) return null;
  const t = valor as Record<string, unknown>;
  const codigo = texto(t.codigo);
  const ano = numero(t.ano);
  if (codigo === null || ano === null) return null;
  return {
    codigo,
    ano,
    cursoCodigo: texto(t.curso_codigo) ?? "",
    cursoClassificacao: texto(t.curso_classificacao),
    duracaoSemanas: numero(t.duracao_semanas),
    dataInicio: texto(t.data_inicio),
    dataTermino: texto(t.data_termino),
    aulas: numero(t.aulas) ?? 0,
    atividades: numero(t.atividades) ?? 0,
    avaliacoes: numero(t.avaliacoes) ?? 0,
    versaoPublicada: numero(t.versao_publicada),
  };
}

/**
 * O `jsonb` de `impacto_da_exclusao_do_feriado` em nomes do domínio. Fora da forma esperada, `null` — a tela diz que não
 * conseguiu calcular, e não oferece excluir às cegas (FR-002.3, `RN-DEG-01`).
 */
export function impactoDoBanco(valor: unknown): ImpactoDaExclusao | null {
  if (typeof valor !== "object" || valor === null) return null;
  const v = valor as Record<string, unknown>;
  const data = texto(v.data);
  const situacao = texto(v.situacao);
  const impacto = texto(v.impacto);
  const anoIso = numero(v.ano_iso);
  const semanaIso = numero(v.semana_iso);
  if (
    data === null ||
    (situacao !== "ativo" && situacao !== "inativo") ||
    impacto === null ||
    !IMPACTOS.has(impacto) ||
    anoIso === null ||
    semanaIso === null ||
    !Array.isArray(v.turmas)
  ) {
    return null;
  }
  const turmas = v.turmas.map(turmaDoBanco);
  if (turmas.some((t) => t === null)) return null;
  return {
    data,
    situacao,
    impacto: impacto as ImpactoDaExclusao["impacto"],
    todas: v.todas === true,
    anoIso,
    semanaIso,
    atividadesGlobais: numero(v.atividades_globais) ?? 0,
    turmas: turmas as TurmaDoImpacto[],
  };
}

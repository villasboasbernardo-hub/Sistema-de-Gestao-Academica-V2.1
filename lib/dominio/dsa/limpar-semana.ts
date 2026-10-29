/**
 * RD-4 — **Limpar semana** (Bloco 11, spec 026).
 *
 * > *"Limpar semana apaga todos os lançamentos da semana com confirmação; em semana publicada só depois de Fazer
 * > alteração; usa a mesma exclusão do cartão, em lote, sem brigar com a trilha imutável."* — Bernardo Villas Boas,
 * > 26/10/2026 (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-4)
 *
 * ⚠️ **A MESMA EXCLUSÃO DO CARTÃO** (`camposDaExclusao`): a prova sai cancelada — e com ela as sessões e a vista, em
 *    qualquer semana —, e o resto sai inativo. Nada se apaga (regra 4); o que estava salvo vira rascunho de exclusão e só
 *    sai de vez no *Salvar minuta* (RP-0, D-18).
 * ⚠️ **SÓ O QUE É DA TURMA** (D-17): a atividade de **todas as turmas** (`turma_id` nulo) fica — o ponto único de escrita a
 *    altera NA HORA, e excluí-la tiraria a atividade de todas; a **parada** do Calendário (TR que bloqueia aula) também
 *    fica — ela se desfaz pelo Calendário ou pelo *Desfazer*.
 * ⚠️ **SEM REPETIR**: a sessão e a vista de uma prova que já sai inteira não viram operação de novo.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** As origens de um lançamento no DSA — as do cartão (`ORIGENS_DO_FATO`). */
export type OrigemDoLancamento =
  "aula" | "avaliacao" | "sessao_aplicacao" | "vista_prova" | "atividade_nao_letiva";

const ORIGENS: ReadonlySet<string> = new Set([
  "aula",
  "avaliacao",
  "sessao_aplicacao",
  "vista_prova",
  "atividade_nao_letiva",
]);

/** O que a exclusão grava — o cartão e o Limpar usam esta função, e só ela. */
export function camposDaExclusao(origem: OrigemDoLancamento): {
  readonly status: "cancelada" | "inativo";
} {
  return origem === "avaliacao" ? { status: "cancelada" } : { status: "inativo" };
}

/** Um lançamento da semana, como a releitura do servidor o entrega. */
export type LancamentoDaSemana = {
  readonly origem: string;
  /** O id do fato; na sessão e na vista, o da **avaliação**. */
  readonly fatoId: string;
  /** Na sessão de aplicação e na vista, o id da própria sessão. */
  readonly sessaoId: string | null;
  /** Nulo = a atividade de todas as turmas. */
  readonly turmaId: string | null;
  /** A TR que bloqueia aula (a parada do Calendário). */
  readonly bloqueiaAula: boolean;
};

/** As exclusões do Limpar: origem e o id que o cartão excluiria. */
export function lancamentosParaLimpar(
  lancamentos: readonly LancamentoDaSemana[],
): readonly { readonly origem: OrigemDoLancamento; readonly id: string }[] {
  const daTurma = lancamentos.filter(
    (l) => ORIGENS.has(l.origem) && l.turmaId !== null && !l.bloqueiaAula,
  );
  const provasQueSaem = new Set(
    daTurma.filter((l) => l.origem === "avaliacao").map((l) => l.fatoId),
  );
  const vistas = new Map<string, { origem: OrigemDoLancamento; id: string }>();
  for (const l of daTurma) {
    const origem = l.origem as OrigemDoLancamento;
    const sessao = origem === "sessao_aplicacao" || origem === "vista_prova";
    if (sessao && provasQueSaem.has(l.fatoId)) continue;
    const id = sessao && l.sessaoId ? l.sessaoId : l.fatoId;
    vistas.set(`${origem}|${id}`, { origem, id });
  }
  return [...vistas.values()];
}

/**
 * **Remover Estudo Individual da semana** (Bloco 15, spec 030, `FR-004.2`, D-11): as exclusões do Limpar, **só dos
 * Estudos Individuais** da turma.
 *
 * > *"o EI lançado automaticamente pode ser excluído pelo cartão (…) e por um ícone na barra 'Remover Estudo Individual
 * > da semana'. EI excluído NÃO volta sozinho: só pelo botão do EI da semana."* — Bernardo Villas Boas, 29/10/2026
 *
 * ⚠️ **A MESMA REGRA DO LIMPAR, FILTRADA** — quem diz quais fatos são EI é quem chama (a categoria normativa vive em
 *    `atividades_nao_letivas`, não na grade); a atividade de todas as turmas continua de fora, como no Limpar.
 */
export function estudosIndividuaisParaRemover(
  lancamentos: readonly LancamentoDaSemana[],
  idsDeEstudoIndividual: ReadonlySet<string>,
): readonly { readonly origem: OrigemDoLancamento; readonly id: string }[] {
  return lancamentosParaLimpar(lancamentos).filter(
    (x) => x.origem === "atividade_nao_letiva" && idsDeEstudoIndividual.has(x.id),
  );
}

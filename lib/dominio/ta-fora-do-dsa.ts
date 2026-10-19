/**
 * D-COR-3 — os TA FORA DO DSA, na execução da turma e da disciplina.
 *
 * > *"A turma pode registrar tempos de aula que **não** estão em DSA (atividade fora dos tempos convencionais, aula
 * > que virou EAD, histórico de curso antigo), com quantidade, disciplina, instrutor quando houver e **observação
 * > obrigatória**. Esses TA **somam** na CH executada e no saldo, e a tela mostra os dois separados: *"45 TA
 * > executados · 40 no DSA · 5 fora do DSA"*."* — decisão D-COR-3 de Bernardo Villas Boas, 16/10/2026
 *
 * ⚠️ **QUEM SOMA É O BANCO** (spec 017, M1): os TA fora do DSA entram nas três somas da CHD, e a "até hoje" os corta
 *    pela data deles. Este módulo só **separa** o total que já veio somado, para a tela dizer quanto é de cada lado.
 * ⚠️ **TypeScript puro** (Princípio II). Datas `aaaa-mm-dd`, comparadas como texto (a ordem ISO é a do calendário).
 */

export type RegistroForaDoDsa = {
  readonly data: string;
  readonly tempos: number;
  readonly status: string;
};

/** Os TA fora do DSA **ativos** com data até o dia (inclusive) — o mesmo corte da "até hoje" do banco (D-COR-2). */
export function foraDoDsaAte(registros: readonly RegistroForaDoDsa[], ate: string): number {
  return registros
    .filter((r) => r.status === "ativo" && r.data <= ate)
    .reduce((soma, r) => soma + r.tempos, 0);
}

export type ExecucaoSeparada = {
  readonly total: number;
  readonly noDsa: number;
  readonly foraDoDsa: number;
  /** *"45 TA executados · 40 no DSA · 5 fora do DSA"*; sem fora do DSA, só *"40 TA executados"*. */
  readonly texto: string;
};

const executados = (n: number) => `${n} TA ${n === 1 ? "executado" : "executados"}`;

/**
 * Separa o total executado (que já inclui o fora do DSA) nos dois lados.
 *
 * ⚠️ **"No DSA" nunca sai negativo**: se o fora do DSA vier maior que o total (leituras de momentos diferentes),
 *    o lado do DSA é 0 — número inventado seria pior que o zero.
 */
export function execucaoSeparada(entrada: {
  readonly total: number;
  readonly foraDoDsa: number;
}): ExecucaoSeparada {
  const { total, foraDoDsa } = entrada;
  const noDsa = Math.max(0, total - foraDoDsa);
  const texto =
    foraDoDsa > 0
      ? `${executados(total)} · ${noDsa} no DSA · ${foraDoDsa} fora do DSA`
      : executados(total);
  return { total, noDsa, foraDoDsa, texto };
}

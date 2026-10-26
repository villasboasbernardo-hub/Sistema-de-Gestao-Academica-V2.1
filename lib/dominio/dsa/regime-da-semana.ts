/**
 * RD-3 — **o regime de tempos da semana** (Bloco 11, spec 026).
 *
 * > *"Regime de tempos: padrão vem de Editar turma; no DSA, ícone de relógio abre diálogo 'Só esta semana' ou 'Desta
 * > semana em diante' (vira o padrão da turma dali para a frente); semanas salvas ou publicadas NUNCA mudam de regime (o
 * > regime fica gravado com a semana ao salvar)."* — Bernardo Villas Boas, 26/10/2026
 * > (`docs/correcoes/regras-do-dsa-lancamento.md`, RD-3)
 *
 * ⚠️ **A ORDEM DA RESOLUÇÃO**, do mais específico ao mais geral: o regime **gravado** com a semana (ao salvar) → o
 *    *"só esta semana"* → a vigência *"desta semana em diante"* da turma (a de maior segunda-feira ≤ a da semana) → o
 *    regime de *Editar turma* → o do curso (exceção > padrão, na data da semana). É o mesmo caminho para a tela, a prévia,
 *    o papel, a planilha e as ações (D-14).
 * ⚠️ **SEMANA SALVA** (D-11) é a que tem evento salvo ou publicação na trilha **ou** lançamento salvo — o que existe de
 *    antes do Bloco 9 nasceu salvo e sem evento; olhar só o evento deixaria essas semanas sem proteção.
 * ⚠️ **GENÉRICA NO REGIME** (`R`): o módulo não conhece a forma do relógio — quem chama decide o que é "um regime".
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import { semanaIsoDe } from "../carga-semanal";

/** De onde o regime da semana veio — o selo do diálogo diz. */
export type FonteDoRegime = "semana" | "so_esta_semana" | "desde" | "turma" | "curso";

/** O regime guardado para uma semana: gravado ao salvar, ou escolhido "só esta semana". */
export type RegistroDaSemana<R> = {
  readonly regime: R;
  readonly origem: "gravado" | "so_esta_semana";
};

/** Uma vigência "desta semana em diante" da turma; `regime` nulo = o do curso. */
export type VigenciaDaTurma<R> = {
  /** A segunda-feira da semana escolhida, `aaaa-mm-dd`. */
  readonly vigenteDe: string;
  readonly regime: R | null;
};

export function regimeDaSemana<R>(entrada: {
  /** A segunda-feira da semana, `aaaa-mm-dd`. */
  readonly segunda: string;
  readonly registro: RegistroDaSemana<R> | null;
  readonly vigenciasDaTurma: readonly VigenciaDaTurma<R>[];
  /** O regime de *Editar turma* (`turmas.regime_de_horario_id`), ou nulo. */
  readonly daTurma: R | null;
  /** O do curso na semana (exceção > padrão). */
  readonly doCurso: R | null;
}): { readonly regime: R | null; readonly fonte: FonteDoRegime } {
  const { registro, segunda } = entrada;
  if (registro !== null) {
    return {
      regime: registro.regime,
      fonte: registro.origem === "gravado" ? "semana" : "so_esta_semana",
    };
  }
  let desde: VigenciaDaTurma<R> | null = null;
  for (const v of entrada.vigenciasDaTurma) {
    if (v.vigenteDe <= segunda && (desde === null || v.vigenteDe >= desde.vigenteDe)) desde = v;
  }
  if (desde !== null) return { regime: desde.regime ?? entrada.doCurso, fonte: "desde" };
  if (entrada.daTurma !== null) return { regime: entrada.daTurma, fonte: "turma" };
  return { regime: entrada.doCurso, fonte: "curso" };
}

/** Os eventos da trilha que fazem a semana "salva". */
const EVENTOS_QUE_SALVAM: ReadonlySet<string> = new Set([
  "salvo",
  "publicado",
  "alteracao_publicada",
]);

/** A semana está salva (D-11): evento salvo ou publicação, ou lançamento salvo nela. */
export function semanaSalva(entrada: {
  readonly tiposDeEvento: readonly string[];
  readonly temLancamentoSalvo: boolean;
}): boolean {
  return entrada.temLancamentoSalvo || entrada.tiposDeEvento.some((t) => EVENTOS_QUE_SALVAM.has(t));
}

/**
 * As semanas salvas da semana do *"desde"* em diante — as que têm de ganhar o regime gravado **antes** de a vigência
 * valer, para nunca mudarem (FR-003.2). Sem repetir, em ordem.
 */
export function semanasSalvasAPartirDe(entrada: {
  /** A segunda-feira da semana do *"desde"*. */
  readonly segunda: string;
  readonly eventos: readonly {
    readonly ano: number;
    readonly semana: number;
    readonly tipo: string;
  }[];
  readonly datasDeLancamentoSalvo: readonly string[];
}): readonly { readonly ano: number; readonly semana: number }[] {
  const inicio = semanaIsoDe(entrada.segunda);
  if (inicio === null) return [];
  const chave = (ano: number, semana: number) => ano * 100 + semana;
  const desde = chave(inicio.ano, inicio.numero);
  const achadas = new Map<number, { ano: number; semana: number }>();
  for (const e of entrada.eventos) {
    if (EVENTOS_QUE_SALVAM.has(e.tipo) && chave(e.ano, e.semana) >= desde) {
      achadas.set(chave(e.ano, e.semana), { ano: e.ano, semana: e.semana });
    }
  }
  for (const data of entrada.datasDeLancamentoSalvo) {
    const s = semanaIsoDe(data);
    if (s !== null && chave(s.ano, s.numero) >= desde) {
      achadas.set(chave(s.ano, s.numero), { ano: s.ano, semana: s.numero });
    }
  }
  return [...achadas.entries()].sort(([a], [b]) => a - b).map(([, v]) => v);
}

/**
 * `FR-029.1` / `FR-029.4` — as salas: natureza, disponibilidade e uso.
 *
 * > *"A natureza física/virtual é lida de `metadados.ambiente_virtual`; **zero** comparações com o
 * > texto `'Moodle'` em código de regra (`SC-014.2`)."*
 * > — contrato de escritas §3, spec 009
 *
 * ⚠️ **A NATUREZA VEM DO METADADO, NUNCA DO NOME.** Comparar com `'Moodle'` funciona hoje e quebra na
 * segunda sala virtual que a Divisão criar — e quebra **em silêncio**, porque a sala continua na lista
 * e só a natureza sai errada. O metadado é o que alguém escolheu ao cadastrar.
 *
 * ⚠️ **A SALA ATUAL DA TURMA APARECE MESMO DESATIVADA** (`FR-029.4`). Desativar sala não reescreve o
 * passado: a turma que já a usa continua a usá-la, e o formulário precisa poder reenviá-la sem
 * trocar. Escondê-la faria a edição de qualquer campo da turma apagar a sala por acidente.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Uma sala como ela vem de `config_listas` (`lista = 'salas'`). */
export type Sala = {
  readonly valor: string;
  readonly ativo: boolean;
  /** `{ ambiente_virtual: boolean }` — o que decide a natureza. */
  readonly metadados: unknown;
};

export type NaturezaDeSala = "fisica" | "virtual";

/**
 * A natureza da sala, lida do metadado.
 *
 * ⚠️ **AUSÊNCIA DE METADADO É SALA FÍSICA**, e não erro. A maioria é física, e o `CHECK`
 * `config_listas_sala_com_natureza` já exige o metadado em linha nova — a tolerância aqui é para o
 * histórico, nunca para dado novo.
 */
export function naturezaDaSala(sala: Sala): NaturezaDeSala {
  const m = sala.metadados;
  if (typeof m === "object" && m !== null && "ambiente_virtual" in m) {
    return (m as { ambiente_virtual?: unknown }).ambiente_virtual === true ? "virtual" : "fisica";
  }
  return "fisica";
}

export const ROTULO_DA_NATUREZA: Readonly<Record<NaturezaDeSala, string>> = {
  fisica: "Física",
  virtual: "Ambiente virtual",
};

/**
 * As salas que o formulário de turma oferece.
 *
 * ⚠️ **AS ATIVAS, MAIS A ATUAL DA TURMA — mesmo que ela esteja desativada.** Sem a segunda metade,
 * editar o efetivo de uma turma cuja sala foi desativada apagaria a sala sem ninguém pedir.
 *
 * ⚠️ E a ordem é a do nome, para a lista não mudar de arranjo entre duas aberturas.
 */
export function salasParaEscolher(salas: readonly Sala[], atual: string | null): readonly Sala[] {
  const disponiveis = salas.filter((s) => s.ativo || (atual !== null && s.valor === atual));
  return [...disponiveis].sort((a, b) => a.valor.localeCompare(b.valor, "pt-BR"));
}

/** O mínimo que uma turma precisa trazer para se saber que sala ela ocupa. */
export type TurmaComSala = {
  readonly codigo: string;
  readonly sala: string | null;
};

/**
 * As turmas que referenciam uma sala — o que o diálogo de desativação lista (`FR-029.4`).
 *
 * ⚠️ **DESATIVAR SALA EM USO É PERMITIDO, e o diálogo só avisa.** É a mesma família do `RN-DEG-02`:
 * a Divisão sabe o que está fazendo, e bloquear obrigaria a mexer em turma antiga para arrumar a
 * lista de salas.
 *
 * Retrato da base, medido em 16/09/2026: `Sala 04` → **5**, `Moodle` → **6**,
 * `Laboratório de Informática` → **9**.
 */
export function turmasQueUsam(turmas: readonly TurmaComSala[], sala: string): readonly string[] {
  return turmas.filter((t) => t.sala === sala).map((t) => t.codigo);
}

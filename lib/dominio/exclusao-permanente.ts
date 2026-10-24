/**
 * O que a tela diz da exclusão permanente — a parte comum da turma e da linha do calendário (D-COR-6, spec 025).
 *
 * > *"Tudo que se cadastra tem Editar, Desativar/Reativar e Excluir (permanente, com alerta)."* — RT-2
 * > *"…com registros, ícone desabilitado com dica 'tem registros: use Arquivar/Desativar'."* — D-COR-6
 * > — Bernardo Villas Boas, 24/10/2026
 *
 * ⚠️ **QUEM DECIDE É O BANCO**: as funções `app.impedimentos_de_exclusao_*` dizem o que prende, e as `app.excluir_*`
 *    recusam com `23503`. Aqui só se monta a dica e o motivo — nenhuma regra de "pode ou não pode" vive só aqui.
 * ⚠️ **SEM RESPOSTA DO BANCO, NUNCA LIBERADA** (`RN-DEG-01`): a falha de leitura não pode virar "não tem registro".
 *
 * TypeScript puro: sem `next`, sem `react`, sem `supabase`.
 */

/** A dica do ícone quando a conferência dos registros falhou (D-13). */
export const DICA_SEM_LEITURA = "não foi possível conferir os registros";

/**
 * O nome, na tela, das tabelas que a **rede de segurança** devolve (`app.referencias_por_fk`, D-32): o que nenhuma
 * conferência nomeada pegou vem pelo nome da tabela. Tabela fora desta lista aparece como *"registro em <tabela>"* —
 * feio e correto; sumir faria a recusa não dizer o que prende.
 */
export const ROTULO_DA_TABELA: Readonly<Record<string, string>> = {
  registros_aula: "aula lançada",
  avaliacoes: "avaliação lançada",
  atividades_nao_letivas: "atividade lançada",
  dias_parados: "dia parado",
  ta_fora_do_dsa: "TA fora do DSA",
  vistas_de_avaliacao: "vista de avaliação",
  sessoes_de_aplicacao: "sessão de aplicação",
  dsa_eventos_da_semana: "semana do DSA salva ou publicada",
  turma_disciplina: "linha de turma",
  turma_disciplina_instrutor: "atribuição",
  turma_disciplina_unidade: "rateio por unidade de ensino",
  instrutor_disciplina: "vínculo de habilitação",
  avaliacoes_curriculo: "avaliação do currículo",
  avaliacoes_curriculo_turma: "avaliação do currículo arbitrada para a turma",
  previstos_proens_turma: "previsto do PROENS",
  planejamento_anual: "planejamento anual",
  feriado_turma: "feriado das turmas escolhidas",
  responsaveis_curso: "responsabilidade de curso",
  usuarios: "conta de acesso",
  turmas: "turma",
  unidades_ensino: "unidade de ensino",
  curriculos: "currículo",
  curso_regime_historico: "histórico do regime do curso",
};

/** O nome de uma chave: o da entidade, senão o da tabela da rede, senão *"registro em <chave>"*. */
export function rotuloDoImpedimento(
  chave: string,
  rotulos: Readonly<Record<string, string>>,
): string {
  return rotulos[chave] ?? ROTULO_DA_TABELA[chave] ?? `registro em ${chave}`;
}

export type EstadoDaExclusao = {
  /** O ícone abre a confirmação. */
  readonly liberada: boolean;
  /** A dica do ícone desabilitado; `null` quando liberada. */
  readonly dica: string | null;
  /** O que prende, numa frase — para o nome acessível e a recusa; `null` sem impedimento ou sem leitura. */
  readonly detalhe: string | null;
};

function juntar(itens: readonly string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/**
 * O estado do ícone a partir das chaves do banco.
 *
 * @param impedimentos as chaves (vazio = sem registro); `null` quando a leitura falhou.
 * @param rotulos o nome de cada chave; a desconhecida sai por `rotuloDoImpedimento` — nunca some em silêncio.
 * @param dicaComRegistros a dica do pedido: *"tem registros: use Arquivar"* ou *"…use Desativar"*.
 * @param sufixo o fim da frase do detalhe (ex.: *" nesta data"*).
 */
export function estadoDaExclusao(
  impedimentos: readonly string[] | null,
  rotulos: Readonly<Record<string, string>>,
  dicaComRegistros: string,
  sufixo = "",
): EstadoDaExclusao {
  if (impedimentos === null) return { liberada: false, dica: DICA_SEM_LEITURA, detalhe: null };
  if (impedimentos.length === 0) return { liberada: true, dica: null, detalhe: null };
  const nomes = impedimentos.map((chave) => rotuloDoImpedimento(chave, rotulos));
  return { liberada: false, dica: dicaComRegistros, detalhe: `Tem ${juntar(nomes)}${sufixo}.` };
}

/** As chaves da recusa `<prefixo> a, b` que o banco devolve com `23503`. */
export function chavesDaRecusa(mensagem: string, prefixo: string): readonly string[] {
  const inicio = mensagem.indexOf(prefixo);
  if (inicio < 0) return [];
  return mensagem
    .slice(inicio + prefixo.length)
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c !== "");
}

/** O código digitado libera a confirmação só quando é exatamente o do registro, sem espaço à volta (D-12). */
export function codigoConfere(digitado: string, codigo: string): boolean {
  return digitado.trim() !== "" && digitado.trim() === codigo;
}

/** Uma linha das funções de impedimentos em lote (`impedimentos_de_exclusao_das_turmas` e irmãs). */
export type ImpedimentosDoRegistro = {
  readonly registro_id: string;
  readonly impedimentos: readonly string[] | null;
};

/**
 * O estado do *Excluir* de cada registro de uma lista, pelo `id` — a resposta das funções em lote.
 *
 * ⚠️ **SEM RESPOSTA, MAPA VAZIO** (`null`, a leitura que falhou): a tela não acha o `id` e desenha o ícone desabilitado
 *    com `DICA_SEM_LEITURA` (D-13) — nunca liberado (`RN-DEG-01`).
 */
export function estadosPorRegistro(
  linhas: readonly ImpedimentosDoRegistro[] | null,
  estadoDe: (impedimentos: readonly string[]) => EstadoDaExclusao,
): Readonly<Record<string, EstadoDaExclusao>> {
  return Object.fromEntries(
    (linhas ?? []).map((l) => [l.registro_id, estadoDe(l.impedimentos ?? [])] as const),
  );
}

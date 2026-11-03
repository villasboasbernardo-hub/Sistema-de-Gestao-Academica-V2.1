/**
 * RA-4 (Bloco 18, spec 033) — o lançamento de ATIVIDADE no DSA: o «Conta como», a disciplina que ele pede, o vínculo
 * («Cumpre») e as opções que o formulário e o cartão de edição oferecem.
 *
 * > *"Lançamento de atividade no DSA ganha: tipo (RA-1), 'Conta como' (TA da disciplina escolhida / AEC / TAD / TR),
 * > vínculo opcional com uma AEC prevista ou uma APOINST planejada, Responsável/Palestrante (instrutor cadastrado OU
 * > texto livre com nome e OM para externo), Local (sala cadastrada OU texto livre). 'Conta como TA da disciplina' soma
 * > na CH da disciplina e do instrutor, como aula."* — `RA-4`, Bernardo Villas Boas, 03/11/2026
 *
 * ⚠️ **NULA É O PADRÃO DO TIPO** (FR-003.2, D-1 da spec 033): a escolha IGUAL à classificação do tipo grava NULO
 *    (`contaComoParaGravar`) — é o que deixa a recategorização do catálogo (`app.recategorizar_pelo_tipo`, que pula a
 *    linha com escolha) seguir valendo para quem não trocou nada. Só a troca de verdade fica gravada.
 * ⚠️ **A REGRA DA CATEGORIA É A DE `recusaPelaCategoria`** (`lib/dominio/categoria-pelo-tipo.ts`): este módulo não a
 *    reescreve — a edição a chama com o que muda, e o lançar a chama direto.
 * ⚠️ **O VÍNCULO É DE TURMA** (FR-003.3): a AEC prevista é do currículo da turma e a APOINST é da turma — a atividade de
 *    todas as turmas não cumpre nenhuma das duas (o banco tem o irmão, `ativ_vinculo_so_de_turma`), e o Estudo Individual
 *    e o Apoio Individualizado, que ficam fora da CHT, também não.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */
import {
  aceitaContaComo,
  categoriaEfetiva,
  CONTA_COMO,
  recusaPelaCategoria,
  ROTULO_DO_CONTA_COMO,
  type CategoriaDeAtividade,
  type ContaComo,
} from "@/lib/dominio/categoria-pelo-tipo";

export type Recusa = { readonly campo: string; readonly mensagem: string };

/** O que se grava em `conta_como`: a escolha igual ao padrão do tipo é NULA (nula = o padrão). */
export function contaComoParaGravar(
  categoriaDoTipo: CategoriaDeAtividade | null,
  escolhido: ContaComo | null,
): ContaComo | null {
  if (escolhido === null) return null;
  return categoriaDoTipo !== null && escolhido === categoriaDoTipo ? null : escolhido;
}

/**
 * As opções do «Conta como»: as quatro, na ordem da RA-4, nos tipos de AEC, TAD ou TR — e sem o «TA da disciplina» na
 * atividade de todas as turmas (ele exige a disciplina DA TURMA, `ativ_conta_como_chd_com_disciplina`).
 */
export function opcoesDeContaComo(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade | null;
  readonly global: boolean;
}): readonly { readonly valor: ContaComo; readonly rotulo: string }[] {
  if (!aceitaContaComo(entrada.categoriaDoTipo)) return [];
  return CONTA_COMO.filter((c) => !(entrada.global && c === "CHD")).map((c) => ({
    valor: c,
    rotulo: ROTULO_DO_CONTA_COMO[c],
  }));
}

/**
 * A atividade pede disciplina? **Obrigatória** no «TA da disciplina»; **opcional** quando a classificação que vale é a
 * AEC (item 1b de 08/10/2026); **nenhuma** nas demais e na atividade de todas as turmas.
 */
export function disciplinaNaAtividade(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade;
  readonly contaComo: ContaComo | null;
  readonly global: boolean;
}): "obrigatoria" | "opcional" | "nenhuma" {
  if (entrada.global) return "nenhuma";
  if (entrada.contaComo === "CHD") return "obrigatoria";
  return categoriaEfetiva(entrada.categoriaDoTipo, entrada.contaComo) === "AEC" ? "opcional" : "nenhuma";
}

/** O vínculo «Cumpre» cabe? Na atividade DE TURMA de AEC, TAD ou TR (FR-003.3). */
export function aceitaVinculo(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade | null;
  readonly global: boolean;
}): boolean {
  return !entrada.global && aceitaContaComo(entrada.categoriaDoTipo);
}

export const FRASE_DO_VINCULO_DUPLO = "A atividade cumpre uma AEC prevista OU uma APOINST, não as duas.";
export const FRASE_DO_VINCULO_GLOBAL =
  "A atividade de todas as turmas não cumpre AEC prevista nem APOINST de uma turma.";
export const FRASE_DO_VINCULO_FORA_DA_CHT =
  "O Estudo Individual e o Apoio Individualizado não cumprem AEC prevista nem APOINST.";

/** A recusa do vínculo — a mesma no lançar e na edição (o banco tem os irmãos: `ativ_um_vinculo`, `ativ_vinculo_so_de_turma`). */
export function recusaDoVinculo(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade | null;
  readonly turmaId: string | null;
  readonly atividadePrevistaId: string | null;
  readonly apoinstId: string | null;
}): Recusa | null {
  const campo = entrada.atividadePrevistaId !== null ? "atividadePrevistaId" : "apoinstId";
  if (entrada.atividadePrevistaId === null && entrada.apoinstId === null) return null;
  if (entrada.atividadePrevistaId !== null && entrada.apoinstId !== null) {
    return { campo: "apoinstId", mensagem: FRASE_DO_VINCULO_DUPLO };
  }
  if (entrada.turmaId === null) return { campo, mensagem: FRASE_DO_VINCULO_GLOBAL };
  if (!aceitaContaComo(entrada.categoriaDoTipo)) return { campo, mensagem: FRASE_DO_VINCULO_FORA_DA_CHT };
  return null;
}

/* ──────────────────────────────────────────────────────────── as opções do «Cumpre» */

/** Uma AEC prevista do currículo da turma, como o formulário a oferece. */
export type PrevistaParaVincular = {
  readonly id: string;
  readonly nome: string;
  readonly tipoRotulo: string;
  /** Nulo = o currículo não diz. */
  readonly taPrevistos: number | null;
  readonly taLancados: number;
  /** Cumprida por lançamento vinculado ou à mão (`ehCumprida`). */
  readonly cumprida: boolean;
  readonly disciplinaId: string | null;
};

/** Uma APOINST planejada ATIVA da turma. */
export type ApoinstParaVincular = {
  readonly id: string;
  readonly nome: string;
  readonly disciplinaCodigo: string;
  readonly taPrevistos: number;
  readonly taLancados: number;
};

const PREFIXO_DA_PREVISTA = "prevista:";
const PREFIXO_DA_APOINST = "apoinst:";

/**
 * As opções do «Cumpre (opcional)», num campo só: as AEC previstas (com *«(já cumprida)»* quando for) e as APOINST
 * planejadas. ⚠️ **A PREVISTA JÁ CUMPRIDA CONTINUA NA LISTA** — a palestra pode ter mais de uma sessão, e a marca diz o
 *    estado sem esconder a escolha (o padrão de `(já aplicada)` da avaliação do currículo).
 */
export function opcoesDeVinculo(
  previstas: readonly PrevistaParaVincular[],
  apoinst: readonly ApoinstParaVincular[],
): readonly { readonly valor: string; readonly rotulo: string }[] {
  const daPrevista = previstas.map((p) => {
    const ta = p.taPrevistos === null ? "" : ` — ${p.taPrevistos} TA`;
    const andamento =
      p.cumprida
        ? " (já cumprida)"
        : p.taLancados > 0 && p.taPrevistos !== null
          ? ` (${p.taLancados} de ${p.taPrevistos} TA lançados)`
          : "";
    const tipo = p.tipoRotulo === "" ? "" : ` · ${p.tipoRotulo}`;
    return { valor: `${PREFIXO_DA_PREVISTA}${p.id}`, rotulo: `AEC prevista: ${p.nome}${tipo}${ta}${andamento}` };
  });
  const daApoinst = apoinst.map((a) => {
    const disciplina = a.disciplinaCodigo === "" ? "" : ` — ${a.disciplinaCodigo}`;
    return {
      valor: `${PREFIXO_DA_APOINST}${a.id}`,
      rotulo: `APOINST: ${a.nome}${disciplina} (${a.taLancados} de ${a.taPrevistos} TA lançados)`,
    };
  });
  return [...daPrevista, ...daApoinst];
}

/** O valor da opção → as duas colunas (no máximo uma preenchida). Valor vazio ou desconhecido = sem vínculo. */
export function vinculoDaOpcao(valor: string): {
  readonly atividadePrevistaId: string | null;
  readonly apoinstId: string | null;
} {
  if (valor.startsWith(PREFIXO_DA_PREVISTA)) {
    return { atividadePrevistaId: valor.slice(PREFIXO_DA_PREVISTA.length) || null, apoinstId: null };
  }
  if (valor.startsWith(PREFIXO_DA_APOINST)) {
    return { atividadePrevistaId: null, apoinstId: valor.slice(PREFIXO_DA_APOINST.length) || null };
  }
  return { atividadePrevistaId: null, apoinstId: null };
}

/** As duas colunas → o valor da opção (o inverso de `vinculoDaOpcao`). */
export function opcaoDoVinculo(atividadePrevistaId: string | null, apoinstId: string | null): string {
  if (atividadePrevistaId !== null) return `${PREFIXO_DA_PREVISTA}${atividadePrevistaId}`;
  if (apoinstId !== null) return `${PREFIXO_DA_APOINST}${apoinstId}`;
  return "";
}

/* ──────────────────────────────────────────────────────────── a edição pelo cartão */

/**
 * O «O que é» já foi conferido por `recusaDaDescricaoNaEdicao` quando chega aqui: a edição da classificação não o lê,
 * e passa este marcador para `recusaPelaCategoria` só pular a conferência da descrição.
 */
const DESCRICAO_JA_CONFERIDA = "(conferida pela edição)";

export type ClassificacaoNaEdicao =
  | { readonly ok: true; readonly colunas: Readonly<Record<string, string | null>> }
  | ({ readonly ok: false } & Recusa);

/**
 * As colunas da classificação e do vínculo na EDIÇÃO de uma atividade — `conta_como`, `disciplina_id`,
 * `atividade_prevista_id` e `apoinst_id` —, e a recusa pela mesma regra do lançar.
 *
 * ⚠️ **`undefined` É «NÃO MANDOU», `null` É «APAGUE»** (a regra do esquema da edição): campo não mandado não vira coluna,
 *    e a conferência usa o GRAVADO no lugar dele — trocar só o «Conta como» de uma AEC com disciplina para TAD sem
 *    apagar a disciplina é recusado com *"Só a AEC e o «TA da disciplina» levam disciplina."*, antes do banco.
 * ⚠️ **UM VÍNCULO NO MÁXIMO, E O NOVO APAGA O OUTRO**: escolher uma APOINST numa atividade que cumpria uma AEC prevista
 *    manda as duas colunas — a nova e a antiga nula —, como o responsável faz com o instrutor e o nome livre.
 * ⚠️ **A CATEGORIA BASE É A DO TIPO**; sem tipo (linha antiga), a gravada — que então é a do tipo, porque sem tipo não
 *    há «Conta como» (`ativ_conta_como_com_tipo`).
 */
export function classificacaoNaEdicao(entrada: {
  readonly categoriaDoTipo: CategoriaDeAtividade | null;
  readonly categoriaGravada: CategoriaDeAtividade | null;
  readonly turmaId: string | null;
  readonly gravado: {
    readonly contaComo: ContaComo | null;
    readonly disciplinaId: string | null;
    readonly atividadePrevistaId: string | null;
    readonly apoinstId: string | null;
  };
  readonly contaComo?: ContaComo | null | undefined;
  readonly disciplinaId?: string | null | undefined;
  readonly atividadePrevistaId?: string | null | undefined;
  readonly apoinstId?: string | null | undefined;
}): ClassificacaoNaEdicao {
  const colunas: Record<string, string | null> = {};
  const base = entrada.categoriaDoTipo ?? entrada.categoriaGravada;

  const mexeNaClassificacao = entrada.contaComo !== undefined || entrada.disciplinaId !== undefined;
  if (mexeNaClassificacao && base !== null) {
    if (entrada.contaComo !== undefined && entrada.contaComo !== null && entrada.categoriaDoTipo === null) {
      return { ok: false, campo: "contaComo", mensagem: "Escolha o tipo da atividade antes de dizer como ela conta." };
    }
    const contaComo =
      entrada.contaComo === undefined
        ? entrada.gravado.contaComo
        : contaComoParaGravar(entrada.categoriaDoTipo, entrada.contaComo);
    const disciplinaId =
      entrada.disciplinaId === undefined ? entrada.gravado.disciplinaId : entrada.disciplinaId;
    const recusa = recusaPelaCategoria({
      categoria: base,
      turmaId: entrada.turmaId,
      disciplinaId,
      quantidadeAlunos: null,
      descricao: DESCRICAO_JA_CONFERIDA,
      contaComo,
    });
    if (recusa !== null) return { ok: false, ...recusa };
    if (entrada.contaComo !== undefined) colunas["conta_como"] = contaComo;
    if (entrada.disciplinaId !== undefined) colunas["disciplina_id"] = disciplinaId;
  }

  if (entrada.atividadePrevistaId !== undefined || entrada.apoinstId !== undefined) {
    let prevista =
      entrada.atividadePrevistaId === undefined ? entrada.gravado.atividadePrevistaId : entrada.atividadePrevistaId;
    let apoinst = entrada.apoinstId === undefined ? entrada.gravado.apoinstId : entrada.apoinstId;
    /* O novo apaga o outro: só um vínculo, sem contradição com o gravado. */
    if (entrada.atividadePrevistaId != null && entrada.apoinstId === undefined) apoinst = null;
    if (entrada.apoinstId != null && entrada.atividadePrevistaId === undefined) prevista = null;
    const recusa = recusaDoVinculo({
      categoriaDoTipo: base,
      turmaId: entrada.turmaId,
      atividadePrevistaId: prevista,
      apoinstId: apoinst,
    });
    if (recusa !== null) return { ok: false, ...recusa };
    if (prevista !== entrada.gravado.atividadePrevistaId || entrada.atividadePrevistaId !== undefined) {
      colunas["atividade_prevista_id"] = prevista;
    }
    if (apoinst !== entrada.gravado.apoinstId || entrada.apoinstId !== undefined) colunas["apoinst_id"] = apoinst;
  }
  return { ok: true, colunas };
}

/* ──────────────────────────────────────────────────────────── o que a tela recebe */

/**
 * As listas que SÓ o formulário de atividade usa — lidas pela página do DSA, nunca por `lerPeriodoDoDsa` (que a planilha
 * de contingência também chama e cujos erros RECUSAM a planilha).
 *
 * ⚠️ **«NÃO LI» E «VOCÊ NÃO VÊ» NÃO SÃO «NÃO HÁ»** (gotcha 4, RN-DEG-01): `avisoDasSalas` e `avisoDoVinculo` dizem a falha
 *    ou o recorte do perfil, e a tela os mostra no lugar do «nenhuma».
 */
export type OpcoesDaAtividade = {
  /** As salas de `config_listas.salas` (as ativas, mais a da turma), por `salasParaEscolher`. */
  readonly salas: readonly { readonly valor: string; readonly rotulo: string }[];
  readonly avisoDasSalas: string | null;
  /** As AEC previstas ATIVAS do currículo da turma, com a marca de cumprida. */
  readonly previstas: readonly PrevistaParaVincular[];
  /** As APOINST planejadas ATIVAS da turma. */
  readonly apoinst: readonly ApoinstParaVincular[];
  readonly avisoDoVinculo: string | null;
};

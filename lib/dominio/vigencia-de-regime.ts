/**
 * `FR-011`, `FR-019` a `FR-021.4` — o histórico de vigências de regime, e o que a tela oferece
 * sobre cada uma.
 *
 * > *"Vigência **sem lançamento que dependa dela** MUST poder ser corrigida por **uma única ação**,
 * > 'Corrigir esta vigência', que abre o formulário **pré-preenchido com os valores atuais** e, ao
 * > salvar, **cancela a anterior** e grava a sucessora numa mesma transação. […] Vigência **com
 * > lançamento que dependa dela** MUST NOT ser editada nem cancelada."*
 * > — `FR-021.1`, spec 009
 *
 * ⚠️ **QUEM DIZ SE HÁ LANÇAMENTO É O BANCO, NUNCA ESTE MÓDULO.** A regra do `FR-021.2` lê quatro
 * origens — aula, avaliação, vista de prova e atividade, esta última alcançando o curso por janela de
 * turma quando é global — e vive em `app.lancamentos_que_travam_vigencia`. Reimplementá-la aqui seria
 * **regra de negócio na UI**, que o BRIEF §2 proíbe, e duas cópias divergiriam na primeira tabela nova
 * que passasse a depender do regime. Aqui só se decide **o que a tela mostra** a partir do que o banco
 * respondeu.
 *
 * ⚠️ **CANCELADA NÃO SOME DO HISTÓRICO** (`FR-021.1`, A-5). Ela é o registro de que houve correção, e
 * escondê-la faria a correção parecer edição — exatamente o que o append-only existe para impedir.
 *
 * ⚠️ **NEM TODA VIGÊNCIA ATIVA É CORRIGÍVEL, E NENHUMA CANCELADA É.** Cancelar o que já está cancelado
 * não tem efeito, e o banco recusa com `vigencia_cancelada_imutavel`; oferecer a ação seria oferecer
 * uma recusa.
 *
 * Função pura: nada de `supabase`, `next` nem `react` (imposto por ESLint).
 */

/** Os dois tipos de regime que o `tipo_regime` do banco admite. */
export const TIPOS_DE_REGIME = ["padrao", "excecao"] as const;
export type TipoDeRegime = (typeof TIPOS_DE_REGIME)[number];

export const ROTULO_DO_TIPO_DE_REGIME: Readonly<Record<TipoDeRegime, string>> = {
  padrao: "Padrão",
  excecao: "Exceção",
};

/** Uma linha de `curso_regime_historico`, como a página a recebe. */
export type VigenciaDoHistorico = {
  readonly id: string;
  readonly codigo: string;
  readonly tipo: TipoDeRegime;
  /** `ativo` ou `cancelado` — nunca inferido de `NULL` (convenção de banco). */
  readonly status: string;
  readonly vigenteDe: string;
  readonly vigenteAte: string | null;
  readonly regimeTempos: number;
  readonly taDuracaoMin: number;
  readonly intervaloManhaMin: number;
  readonly intervaloTardeMin: number;
  readonly horaInicioManha: string | null;
  readonly horaInicioTarde: string | null;
  readonly limiteDiarioEadHoras: number | null;
  readonly fundamentoCurricular: string | null;
  readonly motivo: string | null;
};

/**
 * O primeiro lançamento que trava uma vigência, como `app.lancamentos_que_travam_vigencia` o emite.
 *
 * ⚠️ **AUSÊNCIA DE TRAVA É AUSÊNCIA DE LINHA**, e não um `false` — é assim que o banco responde, e
 * traduzi-lo para booleano aqui perderia o que a mensagem do `FR-021.4` precisa dizer.
 */
export type TravaDaVigencia = {
  readonly vigenciaId: string;
  /** `aula`, `avaliacao`, `vista_de_prova`, `atividade` ou `atividade_global`. */
  readonly tipo: string;
  readonly data: string;
  readonly turma: string | null;
  readonly atividade: string | null;
  readonly total: number;
  /** Qual ponta da janela da turma faltava, quando o alcance foi por janela incompleta. */
  readonly pontaAusente: string | null;
};

const ROTULO_DO_LANCAMENTO: Readonly<Record<string, string>> = {
  aula: "aula",
  avaliacao: "avaliação",
  vista_de_prova: "vista de prova",
  atividade: "atividade",
  atividade_global: "atividade de escopo global",
};

/**
 * O histórico de um tipo, **o mais recente primeiro** (`FR-021.2` da tela, A-5).
 *
 * ⚠️ **ORDENA POR `vigente_de`, E DESEMPATA PELO CÓDIGO.** Correção e sucessora podem nascer com o
 * mesmo `vigente_de` — é o caso normal do `FR-021.1` —, e sem desempate a lista trocaria de ordem
 * entre duas aberturas da mesma tela, sem nada ter mudado.
 *
 * ⚠️ **NÃO MUTA A LISTA QUE RECEBE.**
 */
export function historicoDoTipo(
  vigencias: readonly VigenciaDoHistorico[],
  tipo: TipoDeRegime,
): readonly VigenciaDoHistorico[] {
  return [...vigencias]
    .filter((v) => v.tipo === tipo)
    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe) || b.codigo.localeCompare(a.codigo));
}

/**
 * A vigência **vigente hoje** de um tipo (`FR-011`, `FR-043`).
 *
 * ⚠️ **HOJE É ARGUMENTO**, e não o relógio lido aqui dentro.
 *
 * ⚠️ **`vigente_ate` NULO É PONTA ABERTA, e a janela inclui as duas pontas** (`FR-021.5`) — a mesma
 * leitura que o banco faz com `vigente_ate + 1`.
 */
export function vigenteEm(
  vigencias: readonly VigenciaDoHistorico[],
  tipo: TipoDeRegime,
  hoje: string,
): VigenciaDoHistorico | null {
  const candidatas = historicoDoTipo(vigencias, tipo).filter(
    (v) =>
      v.status === "ativo" &&
      v.vigenteDe <= hoje &&
      (v.vigenteAte === null || v.vigenteAte >= hoje),
  );
  return candidatas[0] ?? null;
}

/**
 * A vigência pode receber a ação "Corrigir esta vigência"? (`FR-021.1`)
 *
 * ⚠️ **SÃO DUAS CONDIÇÕES, E A SEGUNDA É DO BANCO.** Ativa **e** sem trava. Oferecer a ação numa
 * travada não protegeria nada — o banco recusaria —, mas faria a pessoa descobrir o impedimento
 * **depois** de preencher o formulário inteiro.
 */
export function podeCorrigir(
  vigencia: VigenciaDoHistorico,
  travas: readonly TravaDaVigencia[],
): boolean {
  if (vigencia.status !== "ativo") return false;
  return !travas.some((t) => t.vigenciaId === vigencia.id);
}

/** A trava de uma vigência, se houver. */
export function travaDe(
  vigencia: VigenciaDoHistorico,
  travas: readonly TravaDaVigencia[],
): TravaDaVigencia | null {
  return travas.find((t) => t.vigenciaId === vigencia.id) ?? null;
}

/**
 * A frase que explica por que a vigência não se corrige (`FR-021.4`).
 *
 * ⚠️ **ELA DIZ O QUE IMPEDE **E** QUAL É O CAMINHO.** Sem o caminho, a pessoa fica sabendo que não
 * pode e não fica sabendo o que fazer — e o que fazer existe: registrar vigência nova a partir de uma
 * data posterior ao último lançamento.
 *
 * ⚠️ **E NUNCA O ERRO CRU DO BANCO** (`RN-DEG-01`).
 */
export function mensagemDaTrava(trava: TravaDaVigencia): string {
  const tipo = ROTULO_DO_LANCAMENTO[trava.tipo] ?? trava.tipo;
  const onde = trava.turma ? ` na turma ${trava.turma}` : "";
  const qual = trava.atividade ? ` (${trava.atividade})` : "";
  const quantos = trava.total > 1 ? ` São ${trava.total} lançamentos a partir dessa data.` : "";
  const ponta =
    trava.pontaAusente === null
      ? ""
      : ` A turma está sem ${trava.pontaAusente === "inicio" ? "data de início" : "data de término"}, e por isso a atividade a alcança.`;

  return (
    `Esta vigência não pode ser corrigida: já há ${tipo}${qual} de ${trava.data}${onde} que depende dela.` +
    `${quantos}${ponta} O caminho é registrar vigência nova a partir de uma data posterior ao último lançamento.`
  );
}

/** Como a vigência cancelada se apresenta no histórico (`FR-021.1`, A-5). */
export function marcaDaCancelada(vigencia: VigenciaDoHistorico): string | null {
  if (vigencia.status !== "cancelado") return null;
  const motivo = vigencia.motivo?.trim();
  return motivo ? `cancelada — ${motivo}` : "cancelada";
}

/** O que o formulário de correção abre preenchido (`FR-021.1`). */
export type ValoresDaVigencia = {
  readonly tipo_regime: string;
  readonly vigente_de: string;
  readonly regime_tempos: string;
  readonly ta_duracao_min: string;
  readonly intervalo_manha_min: string;
  readonly intervalo_tarde_min: string;
  readonly hora_inicio_manha: string;
  readonly hora_inicio_tarde: string;
  readonly limite_diario_ead_horas: string;
  readonly fundamento_curricular: string;
  readonly motivo: string;
};

/**
 * Os valores atuais da vigência, prontos para o formulário.
 *
 * ⚠️ **O `motivo` NÃO É COPIADO.** Ele explica **esta** correção, e herdar o texto da anterior faria a
 * nova nascer com a justificativa de outra mudança — um registro que parece preenchido e não é.
 *
 * ⚠️ **E `vigente_de` VEM JUNTO, apesar de imutável na linha existente** (`FR-020`): a sucessora é
 * linha **nova**, e o `FR-021.1` manda abrir o formulário com os valores atuais — inclusive a data,
 * que é o que a correção normalmente mantém.
 */
export function valoresDaVigencia(vigencia: VigenciaDoHistorico): ValoresDaVigencia {
  const texto = (v: string | number | null) => (v === null ? "" : String(v));
  return {
    tipo_regime: vigencia.tipo,
    vigente_de: vigencia.vigenteDe,
    regime_tempos: texto(vigencia.regimeTempos),
    ta_duracao_min: texto(vigencia.taDuracaoMin),
    intervalo_manha_min: texto(vigencia.intervaloManhaMin),
    intervalo_tarde_min: texto(vigencia.intervaloTardeMin),
    hora_inicio_manha: texto(vigencia.horaInicioManha),
    hora_inicio_tarde: texto(vigencia.horaInicioTarde),
    limite_diario_ead_horas: texto(vigencia.limiteDiarioEadHoras),
    fundamento_curricular: texto(vigencia.fundamentoCurricular),
    motivo: "",
  };
}

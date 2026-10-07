/**
 * A leitura da semana do DSA — **sem I/O, testável sem banco** (`RF-DSA-01`, `RF-DSA-02`).
 *
 * ⚠️ **NENHUMA REGRA DE DOMÍNIO MORA AQUI.** Quem monta a grade é `montarSemana()`, quem deriva o
 * relógio é `relogioDaSemana()`, e quem resolve a vigência é `vigenteEm()` — os três em
 * `lib/dominio/`. Este arquivo mapeia **linha do banco → tipo do domínio**, declara as colunas
 * lidas e escreve os endereços. É a fronteira, não o cálculo.
 *
 * ⚠️ **A RESOLUÇÃO DA VIGÊNCIA É A `vigenteEm` QUE JÁ EXISTE, e isso foi uma decisão, não um
 * atalho.** O banco tem `app.fn_regime_vigente(curso, data, tipo)` — mas ela vive em `app`, e **o
 * PostgREST não expõe esse schema** (medido na spec 011: `PGRST202`, que se lê como *"a função não
 * existe"* e significa *"não é alcançável pela interface de dados"*). As saídas eram três: criar um
 * invólucro em `public` (**migration nova**, que esta fatia não tem), reescrever a resolução aqui
 * (**segunda implementação** da `RN-2027-09`), ou usar a função pura que `lib/dominio/
 * vigencia-de-regime.ts` **já tem**, com a data como argumento e a mesma leitura de pontas que o
 * banco faz (`vigente_ate` nulo é ponta aberta, janela inclusiva nas duas). A terceira é a única
 * que não cria nem migration nem segunda verdade.
 */
import {
  type Relogio,
  type RegimeParaRelogio,
  type TempoDoCatalogo,
} from "@/lib/dominio/dsa/horario-do-bloco";
import type { FatoDaSemana } from "@/lib/dominio/dsa/grade";
import type { FeriadoDaSemana } from "@/lib/dominio/dsa/capacidade";
import { datasDaSemanaIso, semanaIsoDe, semanasDoAnoIso } from "@/lib/dominio/carga-semanal";
import {
  vigenteEm,
  type TipoDeRegime,
  type VigenciaDoHistorico,
} from "@/lib/dominio/vigencia-de-regime";
import {
  quadroDaDisciplina,
  type LancamentoParaSituacao,
  type QuadroDaDisciplina,
} from "@/lib/dominio/dsa/situacao";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDoDsa, ROTA_DO_DSA } from "@/lib/navegacao/endereco-de-turma";

/** Nunca `select *`. */
export const COLUNAS_DA_TURMA_DO_DSA =
  "id, codigo, turma, ano_letivo, status, modalidade, sala_alocada, alunos, curso_id, data_inicio";

export const COLUNAS_DA_OCUPACAO =
  "turma_id, data, ta_inicial, ta_final, tempos_consumidos, origem, fato_id, disciplina_id, instrutor_id, fiscal_id, local, herdado";

export const COLUNAS_DA_VIGENCIA =
  "id, codigo, tipo_regime, status, vigente_de, vigente_ate, regime_tempos, ta_duracao_min, intervalo_manha_min, intervalo_tarde_min, hora_inicio_manha, hora_inicio_tarde, limite_diario_ead_horas, fundamento_curricular, motivo, configuracao_horario_id";

export const COLUNAS_DO_FERIADO = "data, descricao, impacto";

/** ⚠️ As colunas reais de `horarios_tempos_aula`, medidas: `tempo_numero`, não `numero_ta`. */
export const COLUNAS_DO_CATALOGO = "tempo_numero, periodo, tipo_tempo, hora_inicio, hora_fim";

/**
 * A semana que a tela vai mostrar.
 *
 * ⚠️ **O `0` DOS DOIS PARÂMETROS É SENTINELA, E É AQUI QUE ELE VIRA DATA.** O contrato declara
 * `padrao: 0` porque *"a semana corrente"* é dinâmica e não cabe num literal — ver a nota da rota
 * em `lib/navegacao/contrato.ts`. Zero não é semana ISO (1..53) nem ano, então não se confunde com
 * valor digitado.
 *
 * ⚠️ **FORA DA FAIXA VOLTA AO PADRÃO **COM AVISO**, nunca em silêncio** (`RN-DEG-01`): a semana 60
 * de um ano de 52 não existe, e abrir a semana corrente sem dizer nada faria a pessoa achar que o
 * link estava certo. O número de semanas do ano sai de `semanasDoAnoIso` — **52 ou 53**, medido, e
 * não um `52` escrito à mão que esconderia a última semana de 2026 inteira.
 */
export function semanaEscolhida(entrada: {
  readonly semana: number;
  readonly ano: number;
  /** `aaaa-mm-dd` no fuso da CIAARA-11. */
  readonly hoje: string;
}): {
  readonly ano: number;
  readonly numero: number;
  readonly aviso: string | null;
} {
  const corrente = semanaIsoDe(entrada.hoje);
  const anoBase = entrada.ano === 0 ? (corrente?.ano ?? 0) : entrada.ano;
  const total = semanasDoAnoIso(anoBase);

  if (entrada.semana === 0) {
    return { ano: anoBase, numero: corrente?.numero ?? 1, aviso: null };
  }
  if (entrada.semana > total) {
    return {
      ano: anoBase,
      numero: corrente?.ano === anoBase ? (corrente?.numero ?? 1) : 1,
      aviso: `O ano ISO de ${anoBase} tem ${total} semanas; a ${entrada.semana} não existe.`,
    };
  }
  return { ano: anoBase, numero: entrada.semana, aviso: null };
}

/**
 * Os dias da semana na tela — cinco, ou **seis com o sábado**.
 *
 * ⚠️ **O SÁBADO ENTRA POR DOIS MOTIVOS INDEPENDENTES, e o segundo não é opcional**: porque o
 * operador o abriu (`?sabado=sim`, `Q-4`) **ou** porque há lançamento nele. Esconder um lançamento
 * gravado porque um parâmetro de tela está em `nao` seria esconder um fato — e a planilha vigente
 * do `C-Ap-HN` tem **oito** sábados lançados (medido).
 */
export function diasDaTela(entrada: {
  readonly ano: number;
  readonly numero: number;
  readonly sabadoPedido: boolean;
  /** As datas que têm algum lançamento, de qualquer origem. */
  readonly datasComLancamento: readonly string[];
}): { readonly dias: readonly string[]; readonly sabadoAberto: boolean } {
  const seis = datasDaSemanaIso(entrada.ano, entrada.numero);
  const sabado = seis[5];
  const temLancamentoNoSabado = sabado !== undefined && entrada.datasComLancamento.includes(sabado);
  const aberto = entrada.sabadoPedido || temLancamentoNoSabado;
  return { dias: aberto ? seis : seis.slice(0, 5), sabadoAberto: aberto };
}

/**
 * A vigência que vale na semana, **preservando o tipo concreto**.
 *
 * ⚠️ `vigenteEm` devolve `VigenciaDoHistorico`, e o DSA precisa de `configuracao_horario_id`, que
 * aquele tipo não tem. O invólucro **delega a regra** e só recupera a linha original — escrever o
 * filtro de novo aqui faria a `RN-2027-09` ter duas implementações.
 */
export function vigenciaDaSemana<T extends VigenciaDoHistorico>(
  vigencias: readonly T[],
  tipo: TipoDeRegime,
  data: string,
): T | null {
  const escolhida = vigenteEm(vigencias, tipo, data);
  return escolhida ? (vigencias.find((v) => v.id === escolhida.id) ?? null) : null;
}

/** Uma linha de `curso_regime_historico`, como o PostgREST a entrega. */
export type LinhaDeVigencia = {
  readonly id: string;
  readonly codigo: string;
  readonly tipo_regime: string;
  readonly status: string;
  readonly vigente_de: string;
  readonly vigente_ate: string | null;
  readonly regime_tempos: number;
  readonly ta_duracao_min: number;
  readonly intervalo_manha_min: number;
  readonly intervalo_tarde_min: number;
  readonly hora_inicio_manha: string | null;
  readonly hora_inicio_tarde: string | null;
  readonly limite_diario_ead_horas: number | null;
  readonly fundamento_curricular: string | null;
  readonly motivo: string | null;
  readonly configuracao_horario_id: string | null;
};

export type VigenciaComCatalogo = VigenciaDoHistorico & {
  readonly configuracaoHorarioId: string | null;
};

export function vigenciaDoBanco(linha: LinhaDeVigencia): VigenciaComCatalogo {
  return {
    id: linha.id,
    codigo: linha.codigo,
    tipo: linha.tipo_regime === "excecao" ? "excecao" : "padrao",
    status: linha.status,
    vigenteDe: linha.vigente_de,
    vigenteAte: linha.vigente_ate,
    regimeTempos: linha.regime_tempos,
    taDuracaoMin: linha.ta_duracao_min,
    intervaloManhaMin: linha.intervalo_manha_min,
    intervaloTardeMin: linha.intervalo_tarde_min,
    horaInicioManha: linha.hora_inicio_manha,
    horaInicioTarde: linha.hora_inicio_tarde,
    limiteDiarioEadHoras: linha.limite_diario_ead_horas,
    fundamentoCurricular: linha.fundamento_curricular,
    motivo: linha.motivo,
    configuracaoHorarioId: linha.configuracao_horario_id,
  };
}

/**
 * A vigência virada no formato que o relógio consome.
 *
 * ⚠️ `hora_inicio_manha` chega como `HH:MM:SS` do Postgres e o relógio espera `HH:MM` — o corte é
 * aqui, na fronteira, e não dentro do módulo puro, que não deve conhecer formato de banco.
 */
export function regimeParaRelogio(v: VigenciaComCatalogo): RegimeParaRelogio {
  const hhmm = (t: string | null) => (t === null ? null : t.slice(0, 5));
  return {
    regimeTempos: v.regimeTempos,
    taDuracaoMin: v.taDuracaoMin,
    intervaloManhaMin: v.intervaloManhaMin,
    intervaloTardeMin: v.intervaloTardeMin,
    horaInicioManha: hhmm(v.horaInicioManha),
    horaInicioTarde: hhmm(v.horaInicioTarde),
    configuracaoHorarioId: v.configuracaoHorarioId,
  };
}

/** Uma linha de `vw_ocupacao_ta`, como o PostgREST a entrega. */
export type LinhaDaOcupacao = {
  readonly turma_id: string | null;
  readonly data: string;
  readonly ta_inicial: number | null;
  readonly tempos_consumidos: number | null;
  readonly origem: string;
  readonly fato_id: string;
  readonly disciplina_id: string | null;
  readonly instrutor_id: string | null;
  readonly fiscal_id: string | null;
  readonly local: string | null;
  readonly herdado: boolean;
};

/**
 * A linha da view virada `FatoDaSemana`.
 *
 * ⚠️ **OS NOMES LEGÍVEIS CHEGAM POR MAPA, não por junção na view.** `vw_ocupacao_ta` entrega
 * `disciplina_id` e `instrutor_id`; o código da disciplina e o nome do instrutor vêm de duas
 * leituras próprias, feitas **na mesma rodada de `Promise.all`**. Juntá-los na view obrigaria a
 * recriá-la só para a tela, e a view é insumo do conflito e do Épico 12 também.
 */
export function fatoDaOcupacao(
  linha: LinhaDaOcupacao,
  nomes: {
    readonly disciplinas: ReadonlyMap<string, string>;
    readonly instrutores: ReadonlyMap<string, string>;
    readonly conteudos: ReadonlyMap<
      string,
      { readonly conteudo: string | null; readonly tecnica: string | null }
    >;
  },
): FatoDaSemana {
  const extra = nomes.conteudos.get(linha.fato_id);
  /*
   * ⚠️ O FISCAL ENTRA NA COLUNA DO INSTRUTOR COM `(FISCAL)`, que é como o documento assinado o
   * escreve (`RF-INSTR-15`, medido nos PDFs). Sem a marca, a coluna diria um nome que não é o de
   * quem ministrou.
   */
  const responsavel =
    linha.instrutor_id !== null
      ? (nomes.instrutores.get(linha.instrutor_id) ?? null)
      : linha.fiscal_id !== null
        ? `${nomes.instrutores.get(linha.fiscal_id) ?? ""} (FISCAL)`.trim()
        : null;
  return {
    fatoId: linha.fato_id,
    origem:
      linha.origem === "aula" ||
      linha.origem === "avaliacao" ||
      linha.origem === "vista_prova" ||
      linha.origem === "atividade_nao_letiva"
        ? linha.origem
        : "aula",
    data: linha.data,
    taInicial: linha.ta_inicial,
    tempos: linha.tempos_consumidos,
    herdado: linha.herdado,
    disciplina:
      linha.disciplina_id !== null ? (nomes.disciplinas.get(linha.disciplina_id) ?? null) : null,
    conteudo: extra?.conteudo ?? null,
    tecnica: extra?.tecnica ?? null,
    instrutor: responsavel,
    local: linha.local,
  };
}

/** Uma linha de `feriados`. */
export type LinhaDeFeriado = {
  readonly data: string;
  readonly descricao: string;
  readonly impacto: string;
};

export function feriadoDoBanco(linha: LinhaDeFeriado): FeriadoDaSemana {
  return {
    data: linha.data,
    descricao: linha.descricao,
    impacto:
      linha.impacto === "dia_inteiro" || linha.impacto === "parcial"
        ? linha.impacto
        : "informativo",
  };
}

/**
 * A turma é de **EAD puro**? (`Q-13`)
 *
 * ⚠️ Decisão de Bernardo Villas Boas, 05/10/2026: *"DSA não se aplica a EAD puro"*. Semipresencial
 * **tem** DSA — ele cobre só a semana presencial (`C-ApA-OcOp-PR-SP`, medido na planilha).
 */
export function ehEadPuro(modalidade: string | null): boolean {
  return modalidade === "ead";
}

/** O catálogo de horários da configuração, quando a vigência aponta para uma. */
export type LinhaDoCatalogo = {
  readonly tempo_numero: number;
  readonly hora_inicio: string;
  readonly hora_fim: string;
  readonly periodo: string;
  readonly tipo_tempo: string;
};

/**
 * ⚠️ `horaInicio` e `horaFim` vão **como vêm**: o tipo as declara *"armazenada, não derivada"*, e
 * o módulo puro aceita `HH:MM` ou `HH:MM:SS`. Cortar aqui seria decidir formato no lugar dele.
 */
export function tempoDoCatalogo(linha: LinhaDoCatalogo): TempoDoCatalogo {
  return {
    tempoNumero: linha.tempo_numero,
    horaInicio: linha.hora_inicio,
    horaFim: linha.hora_fim,
    periodo: linha.periodo === "tarde" ? "tarde" : "manha",
    tipoTempo: linha.tipo_tempo === "excepcional" ? "excepcional" : "normal",
  };
}

/**
 * O rótulo da semana no cabeçalho: `06/04/2026 a 10/04/2026`.
 *
 * ⚠️ **A DATA SAI DE `dataParaLeitura`, O PONTO ÚNICO — e a primeira versão disto cortava a string
 * ISO à mão.** `formato-de-data.test.ts` reprovou, e com razão: a spec 012 reduziu **quatro** donos
 * do formato de data a um, e um `slice(8, 10)` aqui seria o quinto. O rótulo ficou com o ano nas
 * duas pontas em vez de `DD/MM` — mais largo, e sem um segundo dono.
 */
export function rotuloDaSemana(dias: readonly string[]): string {
  const primeiro = dias[0];
  const ultimo = dias[dias.length - 1];
  if (primeiro === undefined || ultimo === undefined) return "";
  return `${dataParaLeitura(primeiro)} a ${dataParaLeitura(ultimo)}`;
}

/** Uma linha de `vw_disciplinas_execucao`, no mínimo que o quadro precisa. */
export type ExecucaoParaQuadro = {
  readonly disciplinaId: string;
  readonly codigo: string;
  readonly nome: string;
  readonly prevista: number;
};

/** Um Tempo de Aula ocupado, de `vw_ocupacao_ta`, **de qualquer data até o corte**. */
export type OcupacaoAcumulada = {
  readonly fatoId: string;
  readonly data: string;
  readonly disciplinaId: string | null;
  readonly ta: number;
};

/**
 * Os quadros de situação da semana — **composição, sem regra nova** (`RF-DSA-05`, `RN-CRONOS-03`).
 *
 * ⚠️ **QUEM DECIDE A SITUAÇÃO, O ACUMULADO E O «À FRENTE» É `quadroDaDisciplina`**, em
 * `lib/dominio/dsa/situacao.ts`, com teste ao lado. Aqui só se agrupa a ocupação por disciplina e
 * se repassa o corte. Reescrever a precedência dos quatro degraus faria a `RF-DSA-05` ter duas
 * implementações, e a segunda esqueceria que **conflitou vence concluída**.
 *
 * ⚠️ **A DISCIPLINA DE UM FATO VEM DA VIEW, que já a resolve pela UE** — `vw_ocupacao_ta` entrega
 * `disciplina_id` preenchido mesmo quando a coluna da aula é nula, porque a UE **é** a disciplina.
 * Resolver isso aqui seria a segunda tradução do mesmo caminho.
 *
 * ⚠️ **`emConflito` É O CONJUNTO DOS FATOS MARCADOS NA SEMANA ABERTA, e esse limite é DECLARADO:**
 * o conflito se calcula contra a ocupação das **outras turmas**, que `conflitos_da_semana` entrega
 * por janela de datas. Pedi-la para o período inteiro da turma seria comparar as 1.566 linhas da
 * base com alguns milhares de alheias **a cada abertura de tela** — e um conflito de março que
 * ninguém tratou não é mais acionável. Fica como dúvida registrada para o Bernardo.
 */
export function quadrosDaSemana(entrada: {
  readonly execucao: readonly ExecucaoParaQuadro[];
  readonly ocupacao: readonly OcupacaoAcumulada[];
  readonly emConflito: ReadonlySet<string>;
  /** O último dia da semana selecionada — o corte do acumulado. */
  readonly ateODia: string;
  /** Hoje — **só** marca o lançado à frente; não corta o cálculo (`Q-2`). */
  readonly hoje: string;
}): readonly (QuadroDaDisciplina & { readonly codigo: string; readonly nome: string })[] {
  const porDisciplina = new Map<string, LancamentoParaSituacao[]>();
  for (const o of entrada.ocupacao) {
    if (o.disciplinaId === null) continue;
    const lista = porDisciplina.get(o.disciplinaId) ?? [];
    lista.push({ data: o.data, ta: o.ta, temConflito: entrada.emConflito.has(o.fatoId) });
    porDisciplina.set(o.disciplinaId, lista);
  }

  return entrada.execucao.map((d) => ({
    ...quadroDaDisciplina({
      disciplina: {
        disciplinaId: d.disciplinaId,
        chPrevistaTempos: d.prevista,
        lancamentos: porDisciplina.get(d.disciplinaId) ?? [],
      },
      ateODia: entrada.ateODia,
      hoje: entrada.hoje,
    }),
    codigo: d.codigo,
    nome: d.nome,
  }));
}

/** Reexportados: quem monta endereço de turma é `lib/navegacao/endereco-de-turma.ts`, sempre. */
export { enderecoDoDsa, ROTA_DO_DSA };
export type { Relogio };

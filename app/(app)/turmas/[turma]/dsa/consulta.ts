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
import { responsavelDoFato, rotuloDaVistaDeProva } from "@/lib/dominio/dsa/rotulos";
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
  "id, codigo, turma, ano_letivo, status, modalidade, sala_alocada, alunos, curso_id, data_inicio, inicio_etapa_presencial, termino_etapa_presencial";

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
 * O que as três tabelas dizem de um fato e a view da ocupação não traz.
 *
 * ⚠️ **OS TRÊS ÚLTIMOS CAMPOS SÃO OPCIONAIS PORQUE SÓ UMA ORIGEM OS TEM:** `aplicadaEm` e
 * `tecnicaDaVista` são da avaliação (servem à vista de prova, que divide a linha com a aplicação), e
 * `externo` é da atividade não letiva (`responsavel_externo`, texto livre que a view não expõe por
 * não participar de conflito).
 */
export type ConteudoDoFato = {
  readonly conteudo: string | null;
  readonly tecnica: string | null;
  /** A data da APLICAÇÃO da prova, já em `DD/MM/AAAA` — a referência que o rótulo da vista leva. */
  readonly aplicadaEm?: string | null | undefined;
  /** O nome da técnica da vista (a do catálogo com sigla `EO`), ou nulo se o catálogo não a tem. */
  readonly tecnicaDaVista?: string | null | undefined;
  /** `atividades_nao_letivas.responsavel_externo`. */
  readonly externo?: string | null | undefined;
  /** `avaliacoes.nome_fiscal_externo` — o fiscal que não é do cadastro (`RN-INST-01`). */
  readonly fiscalExterno?: string | null | undefined;
  /**
   * `atividades_nao_letivas.disciplina_id` — a disciplina OPCIONAL da AEC (item 1b, 08/10/2026).
   * ⚠️ Ela vem da TABELA, e não da view: `vw_ocupacao_ta` não a expõe de propósito, porque a
   * disciplina da view alimenta o teto e a CH por disciplina, e AEC não é CHD.
   */
  readonly disciplinaId?: string | null | undefined;
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
    readonly conteudos: ReadonlyMap<string, ConteudoDoFato>;
  },
): FatoDaSemana {
  const extra = nomes.conteudos.get(linha.fato_id);
  /*
   * ⚠️ **A VISTA E A APLICAÇÃO SÃO A MESMA LINHA DE `avaliacoes`** (`RN-AVAL-02`): chegam com o
   * mesmo `fato_id`, e portanto com o mesmo conteúdo e a mesma técnica. Quem as separa é a
   * `origem` da ocupação — e sem usá-la aqui as duas saíam iguais na grade e no papel (medido em
   * 06/10/2026: a vista imprimia *"Prova Escrita"*, T/E *"PM"*).
   */
  const ehVista = linha.origem === "vista_prova";
  /*
   * ⚠️ O FISCAL ENTRA NA COLUNA DO INSTRUTOR COM `(FISCAL)`, que é como o documento assinado o
   * escreve (`RF-INSTR-15`, medido nos PDFs). Sem a marca, a coluna diria um nome que não é o de
   * quem ministrou.
   *
   * ⚠️ **NA APLICAÇÃO DA PROVA O FISCAL VEM PRIMEIRO; NA VISTA, O RESPONSÁVEL** — medido em
   * 06/10/2026 nas 19 provas do `C-Esp-ME 2026`: o DSA assinado traz o fiscal na linha da aplicação
   * e quem conduz a vista na linha da vista. As duas são a MESMA linha de `avaliacoes`, e o fiscal
   * só aparecia quando não havia responsável — ou seja, sumia de toda prova com os dois cadastrados.
   * Fora da aplicação a ordem não muda: quem ministra, e o fiscal só na falta dele.
   */
  const doCadastro = (id: string | null): string | null =>
    id === null ? null : (nomes.instrutores.get(id) ?? null);
  const nomeDoFiscal = doCadastro(linha.fiscal_id) ?? (extra?.fiscalExterno?.trim() || null);
  const fiscal = nomeDoFiscal === null ? null : `${nomeDoFiscal} (FISCAL)`;
  const ministrante = doCadastro(linha.instrutor_id);
  const responsavel =
    linha.origem === "avaliacao" ? (fiscal ?? ministrante) : (ministrante ?? fiscal);
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
    disciplina: (() => {
      /* A da view (aula, avaliação, vista); na falta, a da AEC, que só a tabela tem. */
      const id = linha.disciplina_id ?? extra?.disciplinaId ?? null;
      return id !== null ? (nomes.disciplinas.get(id) ?? null) : null;
    })(),
    conteudo: ehVista
      ? rotuloDaVistaDeProva({ prova: extra?.conteudo, aplicadaEm: extra?.aplicadaEm })
      : (extra?.conteudo ?? null),
    tecnica: ehVista ? (extra?.tecnicaDaVista ?? null) : (extra?.tecnica ?? null),
    /* ⚠️ Sem instrutor, entra o responsável de fora do cadastro — ver `responsavelDoFato`. */
    instrutor: responsavelDoFato(responsavel, extra?.externo),
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

/**
 * A tabela de CH do **rodapé impresso**, com a cumprida **acumulada até a semana do documento**
 * (`RN-CRONOS-03`, `RF-PDF-01`).
 *
 * ⚠️ **MEDIDO EM 06/10/2026, na carga piloto do `C-Exp-Obs-ME 2026`:** o papel imprimia o
 * `ta_executados` da view — o **total** da turma — em toda semana (50 e 65 nas quatro), enquanto o
 * painel da grade, na mesma semana, dizia 18 e 15. Um DSA da primeira semana reimpresso depois saía
 * dizendo que a disciplina estava concluída.
 *
 * ⚠️ **ELA NÃO CALCULA: REPASSA.** O acumulado é o de `quadrosDaSemana` — o MESMO número do painel
 * de situação —, que por sua vez sai de `quadroDaDisciplina`. O rodapé e a tela deixam de poder
 * discordar porque deixam de ter contas separadas.
 *
 * ⚠️ **O CORTE É O FIM DA SEMANA DO DOCUMENTO, NUNCA «HOJE»** (`Q-2`): o lançamento futuro dentro
 * da semana **conta**, e o rodapé já declara quantos TA estão à frente.
 */
export function execucaoAteASemana(entrada: {
  readonly execucao: readonly ExecucaoParaQuadro[];
  readonly ocupacao: readonly OcupacaoAcumulada[];
  /** O último dia da semana do documento. */
  readonly ateODia: string;
}): readonly {
  readonly codigo: string;
  readonly nome: string;
  readonly prevista: number;
  readonly cumprida: number;
}[] {
  return quadrosDaSemana({
    execucao: entrada.execucao,
    ocupacao: entrada.ocupacao,
    /* O rodapé não desenha conflito nem «à frente»: os dois campos não entram no que ele usa. */
    emConflito: new Set<string>(),
    ateODia: entrada.ateODia,
    hoje: entrada.ateODia,
  }).map((q) => ({
    codigo: q.codigo,
    nome: q.nome,
    prevista: q.chPrevista,
    cumprida: q.chAcumulada,
  }));
}

/** Uma UE do currículo do curso — `unidades_ensino`, só as ativas. */
export type UnidadeDoCurriculo = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly numero: number;
  readonly topico: string;
  readonly prevista: number;
};

/** O que a turma já lançou na UE, como `vw_unidades_ensino_execucao` o soma (sem data). */
export type ExecucaoDaUnidade = {
  readonly unidadeId: string;
  readonly lancada: number;
  /** `ta_saldo` da view — fica NEGATIVO quando a UE passa da prevista. */
  readonly saldo: number;
};

/** Uma aula ativa da turma, de qualquer data até o fim da semana aberta. */
export type AulaDaUnidade = {
  readonly unidadeId: string | null;
  /** Nulo em linha histórica — conta zero, o padrão da pasta para o que não foi medido. */
  readonly tempos: number | null;
};

/**
 * As unidades de ensino da turma — **todas as do currículo**, com dois números de lançado.
 *
 * ⚠️ **A LISTA PARTE DO CURRÍCULO, E A VIEW SÓ COMPLETA OS NÚMEROS** (medido no catálogo do banco
 * local em 08/10/2026, na definição de `vw_unidades_ensino_execucao`). A view agrupa por `r.turma_id`
 * de um `LEFT JOIN`: a UE que a turma ainda não deu sai com `turma_id` NULO, e a leitura filtrada pela
 * turma a descartava. Numa turma nova, o formulário não oferecia unidade NENHUMA, e a cascata do item 3
 * sairia vazia justamente na disciplina que ainda não começou.
 *
 * ⚠️ **SÃO DOIS LANÇADOS, E CADA TELA USA O SEU:**
 *   · `lancada`/`restante` — o da turma inteira, **sem data**: é o que o formulário mostra ao lado de
 *     cada UE, porque quem lança quer saber quanto resta dela, e não quanto restava na semana aberta;
 *   · `lancadaAteASemana` — o acumulado **até o fim da semana aberta**, o MESMO corte da linha da
 *     disciplina no painel de situação (`RN-CRONOS-03`, `Q-2`). Com cortes diferentes na mesma tabela,
 *     a semana 10 mostraria a disciplina *Aguardando início* com uma UE dela *Em andamento*.
 */
export function unidadesDaTurma(entrada: {
  readonly curriculo: readonly UnidadeDoCurriculo[];
  readonly execucao: readonly ExecucaoDaUnidade[];
  readonly aulasAteASemana: readonly AulaDaUnidade[];
}): readonly (UnidadeDoCurriculo & {
  readonly lancada: number;
  readonly restante: number;
  readonly lancadaAteASemana: number;
})[] {
  const execucao = new Map(entrada.execucao.map((e) => [e.unidadeId, e]));
  const ateASemana = new Map<string, number>();
  for (const a of entrada.aulasAteASemana) {
    if (a.unidadeId === null) continue;
    ateASemana.set(a.unidadeId, (ateASemana.get(a.unidadeId) ?? 0) + (a.tempos ?? 0));
  }
  return entrada.curriculo.map((u) => {
    const e = execucao.get(u.id);
    return {
      ...u,
      lancada: e?.lancada ?? 0,
      restante: e?.saldo ?? u.prevista,
      lancadaAteASemana: ateASemana.get(u.id) ?? 0,
    };
  });
}

/** Reexportados: quem monta endereço de turma é `lib/navegacao/endereco-de-turma.ts`, sempre. */
export { enderecoDoDsa, ROTA_DO_DSA };
export type { Relogio };

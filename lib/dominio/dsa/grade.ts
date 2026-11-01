/**
 * A grade da semana — `RF-DSA-03`, `RF-HOR-06`, `RN-EVT-02`, `RN-DEG-01`.
 *
 * > *"O sistema deve apresentar uma grade semanal por dia e Tempo de Aula (TA), mostrando disciplina
 * > (quando houver), conteúdo, técnica de ensino e instrutor de cada bloco lançado, incluindo
 * > atividades extraclasse e extracurriculares do período; o horário de início/término de cada Tempo
 * > de Aula deve ser visível, e a sala deve ser indicada uma vez por cabeçalho de dia/semana, não
 * > repetida em cada bloco."*
 * > — `RF-DSA-03`, documento 02 da Fase 1
 *
 * ⚠️ **ESTE MÓDULO COMPÕE, NÃO DECIDE.** O relógio é de `horario-do-bloco.ts`, a faixa "Sem posição"
 * é de `posicao-herdada.ts`, a capacidade é de `capacidade.ts` e as marcas de conflito vêm prontas de
 * `conflitos.ts`. Aqui só se monta a matriz `dia × TA` — e é de propósito: cada uma daquelas regras
 * tem **um** lugar, e reimplementar qualquer delas aqui seria o segundo lugar onde ela vive.
 *
 * ⚠️ **QUANTAS LINHAS A GRADE TEM, E POR QUE NÃO HÁ PADRÃO MÁGICO.** As linhas são
 * `max(TA do regime, TA declarados, maior TA lançado)`. Os dois primeiros vêm do cadastro; o
 * terceiro existe porque **um lançamento nunca pode ficar escondido**: se alguém lançou no 9º TA de
 * um curso cujo regime declara 8, a linha 9 aparece — com o TA marcado `excepcional` pelo relógio, o
 * que a `RF-HOR-03.1` manda tratar como **alerta**, não como erro. E quando os três são zero **não
 * há linha nenhuma**: a grade mostra só a faixa "Sem posição", em vez de inventar oito linhas que
 * cadastro nenhum autoriza (`RN-DEG-01`).
 *
 * ⚠️ **O DIA BLOQUEADO POR FERIADO AINDA MOSTRA O QUE FOI LANÇADO NELE.** Marcar o dia e esconder o
 * lançamento seria esconder um fato: se há aula gravada num feriado de dia inteiro, quem opera
 * precisa **ver** isso para corrigir. O bloqueio é do **dia** — ele desconta capacidade
 * (`RN-EVT-02`) e a tela o marca —, não dos lançamentos que caíram ali.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`.** Os fatos, os feriados, o relógio,
 * as marcas e `hoje` chegam por parâmetro.
 */

import { capacidadeDaSemana, type CapacidadeDaSemana } from "./capacidade";
import {
  motivoDoBloqueio,
  paradaQueCobre,
  type FeriadoDoCalendario,
  type ParadaDoDia,
} from "./dia-bloqueado";
import type { MarcaDeConflito } from "./conflitos";
import { tempoDeAula, trechosDoBloco, type Relogio, type Trecho } from "./horario-do-bloco";
import { motivoDaFaltaDePosicao, semPosicao, type OrigemDoFato } from "./posicao-herdada";

/**
 * Um fato da semana, como a consulta o entrega — de `vw_ocupacao_ta` e das três leituras da faixa.
 *
 * ⚠️ **ELE É DE EXIBIÇÃO, não de gravação.** O que se grava é o `Bloco` (`bloco.ts`); o que se
 * mostra traz os nomes já resolvidos, porque um módulo puro não junta tabela.
 */
export type FatoDaSemana = {
  readonly fatoId: string;
  readonly origem: OrigemDoFato;
  /** `aaaa-mm-dd`. */
  readonly data: string;
  readonly taInicial: number | null;
  readonly tempos: number | null;
  /** `origem_migracao_v1 != null && editado_em == null` — a coluna `herdado` da view. */
  readonly herdado: boolean;
  readonly disciplina: string | null;
  readonly conteudo: string | null;
  readonly tecnica: string | null;
  readonly instrutor: string | null;
  readonly local: string | null;
  /**
   * Apoio Individualizado (spec 014, A-6): convive com a aula no mesmo tempo **sem** conflito de
   * ocupação — quando divide o tempo com outro lançamento, vai para a faixa abaixo do dia, com o motivo.
   */
  readonly apoio?: boolean;
  /**
   * `criado_em` e `codigo` do lançamento — o desempate de dois lançamentos no mesmo TA (FR-012.3 da spec
   * 016). Opcionais porque só a leitura do banco os tem; sem eles, vale a ordem de chegada.
   */
  readonly criadoEm?: string | null;
  readonly codigo?: string | null;
  /**
   * O que está GRAVADO na linha, cru — é daqui que o cartão único se preenche (ajuste 2 do PR #40).
   *
   * ⚠️ **OS CAMPOS ACIMA SÃO DE EXIBIÇÃO, e reabrir o editor com eles regravava o que se mostra no
   * lugar do que se gravou**: na avaliação o tópico mostrado é o tipo quando o tópico está vazio, e
   * quem aparece é o fiscal antes do responsável. Opcional porque só a grade de edição o usa.
   */
  readonly gravado?: ValoresGravados;
  /**
   * Spec 024 (RP-0): o lançamento é RASCUNHO — guardado, visível só na tela do DSA, «não salvo», sem contar em nada.
   * Só a leitura da tela (`comRascunho`) o traz; o papel e a planilha nunca o veem.
   */
  readonly rascunho?: boolean;
};

/** Os valores gravados de um lançamento, sem nenhuma resolução para exibir. */
export type ValoresGravados = {
  readonly instrutorId: string | null;
  readonly unidadeEnsinoId: string | null;
  /** A da COLUNA `disciplina_id` (aula sem UE, AEC) — não a resolvida pela UE. */
  readonly disciplinaId: string | null;
  readonly conteudo: string | null;
  readonly tecnica: string | null;
  readonly local: string | null;
  /**
   * O «outro responsável (nome livre)» da ATIVIDADE (`responsavel_externo`, `RN-RESP-1`) — opcional porque só a
   * atividade o tem; ausente vale nulo.
   */
  readonly responsavelExterno?: string | null;
  /**
   * O instrumento da AVALIAÇÃO sem item do currículo (`avaliacoes.instrumento_id`, A2 do desenho de 15/10/2026) e o
   * item dela — opcionais porque só a avaliação (a 1ª sessão) os tem; ausentes valem nulo.
   */
  readonly instrumentoId?: string | null;
  readonly avaliacaoCurriculoId?: string | null;
  /** Os instrutores adicionais da AULA (Bloco 16, RD-9) — só a aula os tem; ausentes valem nenhum. */
  readonly instrutoresAdicionais?: readonly string[];
};

export type BlocoNaGrade = FatoDaSemana & {
  /** **Um ou dois** — o segundo existe quando o bloco atravessa o almoço (`SC-011`). */
  readonly trechos: readonly Trecho[];
  /** `data > hoje`. Conta nos indicadores e é **marcado** na tela (`Q-2`). */
  readonly lancadoAFrente: boolean;
  readonly conflito: MarcaDeConflito["conflito"];
  readonly alertaSala: boolean;
};

/** Um fato que não tem onde ser desenhado, **com o motivo escrito** (`RN-DEG-01`). */
export type FatoSemPosicao = {
  readonly fato: FatoDaSemana;
  readonly motivo: string;
};

export type EstadoDaCelula = "livre" | "ocupada" | "continuacao" | "bloqueada" | "sem_relogio";

export type Celula = {
  readonly dia: string;
  readonly ta: number;
  readonly estado: EstadoDaCelula;
  /** Só na célula **inicial** do bloco; nas de continuação é `null`. */
  readonly bloco: BlocoNaGrade | null;
  /** `HH:MM–HH:MM` do TA, ou `null` quando não há relógio. */
  readonly horario: Trecho | null;
};

export type DiaDaGrade = {
  readonly data: string;
  /** A descrição do feriado de dia inteiro, ou `null`. */
  readonly bloqueio: string | null;
  /** As paradas ativas do dia para esta turma (spec 014): para mostrar e para «Desfazer». */
  readonly paradas: readonly ParadaDoDia[];
  /** Feriado de impacto parcial ou informativo — aviso que **não** bloqueia (`RN-EVT-02`). */
  readonly avisos: readonly string[];
  readonly celulas: readonly Celula[];
  readonly semPosicao: readonly FatoSemPosicao[];
};

export type Semana = {
  readonly dias: readonly DiaDaGrade[];
  readonly relogio: Relogio | null;
  readonly linhas: number;
  readonly sabadoAberto: boolean;
  readonly capacidade: CapacidadeDaSemana | null;
};

/** O motivo de o Apoio sair da célula: ele divide o tempo com outro lançamento, e isso não é conflito. */
export const MOTIVO_DO_APOIO_NO_MESMO_TEMPO =
  "Apoio Individualizado, no mesmo tempo de outro lançamento da turma (não é conflito).";

/**
 * O motivo do segundo lançamento que começa no MESMO TA de outro (FR-012.3 da spec 016): ele sai da
 * célula e vai para «sem posição» — na tela, no papel e na planilha (`MOTIVO_SOBREPOSTO` dela é este).
 */
export const MOTIVO_NO_MESMO_TA = "no mesmo TA de outro lançamento";

/**
 * A ordem estável de dois lançamentos no mesmo TA: TA inicial, depois o criado antes, depois o código
 * (FR-012.3). ⚠️ **NUNCA O `fato_id`**: ele é um `uuid` novo a cada carga, e a escolha de quem ocupava a
 * célula mudava de uma carga para a outra com o mesmo dado (medido em 09/10/2026, spec 015).
 */
function antesNaGrade(a: FatoDaSemana, b: FatoDaSemana): number {
  const ta = (a.taInicial ?? 0) - (b.taInicial ?? 0);
  if (ta !== 0) return ta;
  const criado = (a.criadoEm ?? "").localeCompare(b.criadoEm ?? "");
  if (criado !== 0) return criado;
  return (a.codigo ?? "").localeCompare(b.codigo ?? "");
}

/** O Apoio divide algum TA com outro lançamento (não Apoio) posicionado no mesmo dia? */
function divideTempoComOutro(apoio: FatoDaSemana, fatos: readonly FatoDaSemana[]): boolean {
  if (apoio.taInicial === null || apoio.tempos === null) return false;
  const fim = apoio.taInicial + apoio.tempos - 1;
  return fatos.some(
    (f) =>
      f.fatoId !== apoio.fatoId &&
      f.apoio !== true &&
      f.data === apoio.data &&
      f.taInicial !== null &&
      f.tempos !== null &&
      f.taInicial <= fim &&
      f.taInicial + f.tempos - 1 >= (apoio.taInicial as number),
  );
}

/** A parada de PARTE do dia, como a grade e o papel a escrevem (`FR-027`). */
export function rotuloDaParadaParcial(p: ParadaDoDia): string {
  return `Parado — ${p.tipo}: ${p.motivo} (tempos ${p.taInicial} a ${(p.taInicial ?? 0) + (p.tempos ?? 1) - 1})`;
}

export function montarSemana(entrada: {
  /** As datas da semana, ISO, na ordem — cinco, ou seis com o sábado. */
  readonly dias: readonly string[];
  readonly relogio: Relogio | null;
  /** TA que o regime declara, para numerar as linhas quando não há relógio. */
  readonly temposDeclarados: number | null;
  readonly fatos: readonly FatoDaSemana[];
  readonly feriados: readonly FeriadoDoCalendario[];
  /** De `detectarConflitos` — vem pronto (`RN-CONF-01`). */
  readonly marcas: ReadonlyMap<string, MarcaDeConflito>;
  /** `aaaa-mm-dd` no fuso da CIAARA-11. */
  readonly hoje: string;
  readonly sabadoAberto: boolean;
  /** Spec 014: os dias parados e os TR bloqueantes; ausente = nenhum (as telas antigas). */
  readonly paradas?: readonly ParadaDoDia[];
  readonly turmaId?: string;
}): Semana {
  const { relogio, fatos, feriados, marcas, hoje } = entrada;

  /*
   * ⚠️ **QUAL DIA ESTÁ BLOQUEADO NÃO SE DECIDE AQUI** (`RN-EVT-04`): é `motivoDoBloqueio`, a mesma
   * função que faz `lancar` e `mover` recusarem aula no dia — a grade pinta exatamente o dia que a
   * Server Action recusa. Aqui só se juntam os AVISOS (impacto que não bloqueia, `RN-EVT-02`).
   */
  const avisosPorDia = new Map<string, string[]>();
  for (const feriado of feriados) {
    if (feriado.impacto === "dia_inteiro") continue;
    if (feriado.status !== undefined && feriado.status !== "ativo") continue;
    const lista = avisosPorDia.get(feriado.data) ?? [];
    lista.push(feriado.descricao);
    avisosPorDia.set(feriado.data, lista);
  }

  const posicionados: BlocoNaGrade[] = [];
  const faixaPorDia = new Map<string, FatoSemPosicao[]>();
  /* O primeiro de cada dia e TA, pela ordem estável — os outros vão para a faixa (FR-012.3). */
  const ocupado = new Set<string>();
  for (const fato of [...fatos].sort(antesNaGrade)) {
    const paraPosicao = {
      origem: fato.origem,
      herdado: fato.herdado,
      taInicial: fato.taInicial,
    };
    if (semPosicao(paraPosicao) || fato.taInicial === null || fato.tempos === null) {
      const lista = faixaPorDia.get(fato.data) ?? [];
      lista.push({
        fato,
        motivo: motivoDaFaltaDePosicao(paraPosicao) ?? "Sem posição na grade.",
      });
      faixaPorDia.set(fato.data, lista);
      continue;
    }
    if (fato.apoio === true && divideTempoComOutro(fato, fatos)) {
      const lista = faixaPorDia.get(fato.data) ?? [];
      lista.push({ fato, motivo: MOTIVO_DO_APOIO_NO_MESMO_TEMPO });
      faixaPorDia.set(fato.data, lista);
      continue;
    }
    const chaveDoInicio = `${fato.data}|${fato.taInicial}`;
    if (ocupado.has(chaveDoInicio)) {
      const lista = faixaPorDia.get(fato.data) ?? [];
      lista.push({ fato, motivo: MOTIVO_NO_MESMO_TA });
      faixaPorDia.set(fato.data, lista);
      continue;
    }
    ocupado.add(chaveDoInicio);
    const marca = marcas.get(fato.fatoId);
    posicionados.push({
      ...fato,
      trechos: relogio === null ? [] : trechosDoBloco(relogio, fato.taInicial, fato.tempos),
      lancadoAFrente: fato.data > hoje,
      conflito: marca?.conflito ?? null,
      alertaSala: marca?.alertaSala ?? false,
    });
  }

  const linhas = quantasLinhas(relogio, entrada.temposDeclarados, posicionados);

  const dias = entrada.dias.map((data): DiaDaGrade => {
    /*
     * ⚠️ **SPEC 014 (emenda D-AA-13): A PARADA TAMBÉM BLOQUEIA.** O dia parado inteiro bloqueia o dia,
     *    com tipo e motivo; a parada de parte do dia bloqueia só as células dos tempos dela. Qual parada
     *    cobre é decisão de `paradaQueCobre`, a mesma da recusa na Server Action.
     */
    const paradasDoDia = (entrada.paradas ?? []).filter(
      (p) =>
        p.data.slice(0, 10) === data &&
        (p.status === undefined || p.status === "ativo") &&
        (p.turmaId === null || p.turmaId === entrada.turmaId),
    );
    const paradaDoDiaInteiro = paradasDoDia.find((p) => p.taInicial === null || p.tempos === null);
    const bloqueio =
      motivoDoBloqueio(data, feriados) ??
      (paradaDoDiaInteiro
        ? `Parado — ${paradaDoDiaInteiro.tipo}: ${paradaDoDiaInteiro.motivo}`
        : null);
    const doDia = posicionados.filter((b) => b.data === data);
    const celulas: Celula[] = [];

    for (let ta = 1; ta <= linhas; ta += 1) {
      const inicia = doDia.find((b) => b.taInicial === ta);
      const cobre = doDia.find(
        (b) =>
          b.taInicial !== null &&
          b.tempos !== null &&
          ta > b.taInicial &&
          ta < b.taInicial + b.tempos,
      );
      const taDoRelogio = relogio === null ? undefined : tempoDeAula(relogio, ta);

      celulas.push({
        dia: data,
        ta,
        estado: estadoDa({
          relogio,
          bloqueio:
            bloqueio ??
            (entrada.turmaId !== undefined &&
            paradaQueCobre(paradasDoDia, {
              data,
              turmaId: entrada.turmaId,
              taInicial: ta,
              tempos: 1,
            })
              ? "parado"
              : null),
          inicia,
          cobre,
        }),
        bloco: inicia ?? null,
        horario:
          taDoRelogio === undefined
            ? null
            : { inicio: taDoRelogio.inicio, fim: taDoRelogio.fim, periodo: taDoRelogio.periodo },
      });
    }

    return {
      data,
      bloqueio,
      paradas: paradasDoDia,
      avisos: [
        ...(avisosPorDia.get(data) ?? []),
        ...paradasDoDia.filter((p) => p !== paradaDoDiaInteiro).map(rotuloDaParadaParcial),
      ],
      celulas,
      semPosicao: faixaPorDia.get(data) ?? [],
    };
  });

  return {
    dias,
    relogio,
    linhas,
    sabadoAberto: entrada.sabadoAberto,
    capacidade: capacidadeDaSemana({
      dias: entrada.dias,
      feriados,
      temposPorDia: relogio?.temposDoRegime ?? entrada.temposDeclarados,
    }),
  };
}

/**
 * O estado da célula.
 *
 * ⚠️ **A ORDEM IMPORTA, e `sem_relogio` vem PRIMEIRO.** Sem relógio não se sabe se a célula está
 * livre — a grade está mostrando TA numerados sem horário, e dizer "livre" ali afirmaria algo que
 * não se mediu. Depois vem o lançamento, porque um bloco gravado num dia de feriado **tem de
 * aparecer** (ver o cabeçalho). O bloqueio só pinta a célula **vazia** do dia bloqueado.
 */
function estadoDa(entrada: {
  readonly relogio: Relogio | null;
  readonly bloqueio: string | null;
  readonly inicia: BlocoNaGrade | undefined;
  readonly cobre: BlocoNaGrade | undefined;
}): EstadoDaCelula {
  if (entrada.relogio === null) return "sem_relogio";
  if (entrada.inicia !== undefined) return "ocupada";
  if (entrada.cobre !== undefined) return "continuacao";
  if (entrada.bloqueio !== null) return "bloqueada";
  return "livre";
}

/** `max(TA do regime, TA declarados, maior TA lançado)` — e **zero** quando os três faltam. */
function quantasLinhas(
  relogio: Relogio | null,
  temposDeclarados: number | null,
  posicionados: readonly BlocoNaGrade[],
): number {
  const maiorLancado = posicionados.reduce((maior, bloco) => {
    if (bloco.taInicial === null || bloco.tempos === null) return maior;
    return Math.max(maior, bloco.taInicial + bloco.tempos - 1);
  }, 0);
  return Math.max(relogio?.temposDoRegime ?? 0, temposDeclarados ?? 0, maiorLancado);
}

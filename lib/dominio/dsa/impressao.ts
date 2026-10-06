/**
 * O documento impresso do DSA, linha a linha — `RF-PDF-01`, `RF-DSA-06`, `RNF-COMP-01`,
 * `SC-011`, `SC-013`, `SC-014` (spec 013, PR 3).
 *
 * > *"Uma página A4 paisagem. […] Colunas: DIA (data e dia da semana, uma vez por dia) | HORÁRIO
 * > (início «as» fim do BLOCO) | DISCIPLINA (código) | `<n>` TA | UNIDADES DE ENSINO E TÓPICOS |
 * > LOCAL | T/E | INSTRUTOR/PROFESSOR. Última linha de cada dia, fixa: «ESTUDO INDIVIDUAL», T/E
 * > «EI», sem instrutor."*
 * > — `praticas-da-planilha.md` §1.2, medido nos **PDFs assinados** por Bernardo Villas Boas
 *
 * ⚠️ **ESTE MÓDULO EXISTE PARA QUE A ROTA DE IMPRESSÃO NÃO DECIDA NADA.** A `/print/dsa` é
 * servidor puro e sem casca; se a montagem das linhas morasse nela, as quatro regras abaixo só se
 * provariam subindo navegador — e três delas são justamente os defeitos que a planilha tem
 * (`D-3`, `D-5`, `D-6`). Aqui elas se provam com casos sintéticos.
 *
 * ⚠️ **AS QUATRO REGRAS QUE ELE CARREGA, e por que cada uma é regra e não formatação:**
 *
 * 1. **O bloco que atravessa o almoço sai em DUAS linhas de HORÁRIO** (`SC-011`) — corrige o `D-3`,
 *    medido **64 vezes no CAHO e 50 no C-Espc-FR**, onde 4 TA viravam *"09:30 as 13:50"*, um
 *    horário contínuo que inclui o almoço. ⚠️ **A quebra NÃO nasce aqui**: ela vem de
 *    `trechosDoBloco`, que é o ponto único do horário do bloco; este módulo **transporta os
 *    trechos** e o papel desenha um por linha. Dois lugares calculando a quebra discordariam no
 *    primeiro regime novo.
 * 2. **A linha `ESTUDO INDIVIDUAL · EI` é a ÚLTIMA de cada dia, sempre** — e quando há EI lançado,
 *    é ELE que vira essa linha, não uma linha comum mais a fixa. Sem isso o dia sairia com o EI
 *    duas vezes: uma no corpo e outra no pé do dia.
 * 3. **A tabela de CH e a legenda de T/E trazem SÓ o que aparece naquela semana** (`SC-014`) — é o
 *    que o documento assinado faz. Listar o currículo inteiro no pé de uma página A4 é o que não
 *    cabe, e é por isso que o corte é regra e não estética.
 * 4. **Nenhuma cadeia técnica chega ao papel** (`SC-013`): ausência é **célula vazia**, nunca
 *    `null`, `undefined`, `NaN` ou identificador. O `D-2` da planilha é exatamente isto do outro
 *    lado — `#REF!`, `#N/A` e *"ERROR! VRF BD DISCIPLINA"* na IMPRESSÃO de **10 das 15** planilhas.
 *
 * ⚠️ **O QUE ELE NÃO FAZ: formatar data e montar nome de instrutor.** `DD/MM/AAAA` é
 * `lib/formato/data.ts` (ponto único desde a spec 012, que reduziu quatro donos a um) e
 * `P/G Especialidade Nome` é `lib/dominio/nome-instrutor.ts` (`RF-INSTR-15`). As linhas chegam com
 * o nome **já montado** e saem com a data **ISO** — quem imprime formata.
 *
 * ⚠️ **TypeScript puro: sem `next`, sem `react`, sem `supabase`** (Princípio II, imposto por
 * ESLint). A semana, o relógio, as siglas e a execução chegam **por parâmetro**.
 */

import type { DiaDaGrade, Semana } from "./grade";
import { slotDoEstudoIndividual, tempoDeAula, type Relogio, type Trecho } from "./horario-do-bloco";

/** O texto fixo da última linha de cada dia, como o documento assinado o escreve. */
export const TEXTO_DO_ESTUDO_INDIVIDUAL = "ESTUDO INDIVIDUAL";

/** A sigla de T/E do Estudo Individual — a mesma que a `T040` pôs em `config_listas`. */
export const SIGLA_DO_ESTUDO_INDIVIDUAL = "EI";

/**
 * A nota de rodapé do documento oficial, **verbatim**, com o asterisco.
 *
 * ⚠️ **ELA É TEXTO DO DOCUMENTO, não da aplicação** (`RNF-COMP-01`): está assim nos PDFs assinados,
 * em caixa alta, e reescrevê-la "melhor" seria mudar um documento oficial da Marinha.
 */
export const NOTA_DO_ESTUDO_INDIVIDUAL =
  "*É FACULTADO AO ALUNO PERMANECER A BORDO PARA ESTUDO INDIVIDUAL.";

/**
 * O rótulo do campo de observação — a linha que sai **em branco** (`H8`, opção **a**).
 *
 * ⚠️ **NENHUM DOS PDFs MEDIDOS TEM ESTE CAMPO, e o `RF-DSA-06` e o `RF-PDF-01` o exigem
 * LITERALMENTE.** A divergência está registrada no `spec.md` §11 item 1. A decisão de Bernardo
 * Villas Boas (05/10/2026) foi satisfazer o requisito **[PRESERVADO]** com uma linha **vazia, para
 * escrever à mão** — o que não inventa conteúdo nem contraria o documento assinado.
 */
export const ROTULO_DE_OBSERVACOES = "OBSERVAÇÕES:";

/** Uma linha do corpo do documento — um bloco, ou a linha fixa do Estudo Individual. */
export type LinhaImpressa = {
  /** `fatoId`, ou `ei-<data>` na linha fixa. Chave de render, **nunca impressa** (`SC-013`). */
  readonly chave: string;
  /** **Um ou dois** — o segundo existe quando o bloco atravessa o almoço (`SC-011`). Vazio = sem relógio. */
  readonly trechos: readonly Trecho[];
  readonly taInicial: number | null;
  readonly tempos: number | null;
  /** O `cod_disciplina` (algarismo romano), ou vazio. */
  readonly disciplina: string;
  /** `UE <n> — <tópico>`, o `conteudo_resumo`, ou o tipo da avaliação. */
  readonly conteudo: string;
  readonly local: string;
  /** A **sigla** da técnica; sem sigla cadastrada, o nome **por extenso** (`RN-DEG-01`). */
  readonly te: string;
  readonly instrutor: string;
  readonly estudoIndividual: boolean;
  /**
   * `data > hoje` — o lançamento é de uma data que ainda não chegou (`Q-2`, `FR-028.1`).
   *
   * ⚠️ **ELE CONTA NA CH E POR ISSO TEM DE SER DITO.** O `D-5` da planilha é o avesso disto: *"a CH
   * cumprida é COUNTIF sobre a aba inteira — conta semana futura já planejada como cumprida"*. Aqui
   * o número é o mesmo, e a diferença é que o papel **declara** quanto dele ainda não aconteceu.
   */
  readonly lancadoAFrente: boolean;
};

/** Um dia do documento — ou a faixa única do feriado de dia inteiro (`Q-16`). */
export type DiaImpresso = {
  /** `aaaa-mm-dd` — quem formata é `dataParaLeitura` (ponto único). */
  readonly data: string;
  /** A descrição do feriado de dia inteiro; o dia sai como **uma** linha com ela. */
  readonly bloqueio: string | null;
  readonly linhas: readonly LinhaImpressa[];
};

/** Uma técnica de ensino do catálogo — `config_listas.metodologias`, com a sigla dos `metadados`. */
export type TecnicaDoCatalogo = {
  readonly nome: string;
  /** `metadados.sigla`. **Medido em 05/10/2026: 9 das 22 têm sigla** (`T040`). */
  readonly sigla: string | null;
};

/** Uma linha da tabela de CH do rodapé — de `vw_disciplinas_execucao`. */
export type ExecucaoDaDisciplina = {
  readonly codigo: string;
  readonly nome: string;
  readonly prevista: number;
  /** ⚠️ **SEM corte por data** (`Q-2`) — é o `ta_executados` da view, como ele é. */
  readonly cumprida: number;
};

/**
 * O que sai numa célula: o texto, ou **vazio** (`SC-013`).
 *
 * ⚠️ **`NaN` TAMBÉM É CADEIA TÉCNICA, e é a que escapa do `?? ""`.** `String(NaN)` dá `"NaN"`, que
 * passaria por qualquer conferência de nulo e chegaria ao papel com cara de dado. O `D-1` da
 * planilha é esta família inteira: **10.842 erros em cascata** de um `DATEVALUE` aplicado a número.
 */
export function textoDoPapel(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "";
  const limpo = valor.trim();
  if (limpo === "" || limpo === "null" || limpo === "undefined" || limpo === "NaN") return "";
  return limpo;
}

/**
 * A **sigla** da técnica, ou o nome **por extenso** quando ela não tem sigla cadastrada.
 *
 * ⚠️ **13 DAS 22 FICAM POR EXTENSO, POR DECISÃO** (`T040`, decisão de Bernardo §3.9): a coluna T/E
 * é estreita e o nome inteiro é largo — mas **inventar sigla é pior**, porque a mesma sigla de duas
 * letras muda de sentido entre planilhas (`FR` é feriado **ou** farol; `TR` é tempo reserva,
 * trabalho, visita, monitoria, DeCAT **ou** APOINST, medido em §1.3). Quem cadastra sigla é quem
 * administra a lista, e a coluna degrada legível (`RN-DEG-01`).
 */
export function siglaOuExtenso(
  tecnica: string | null,
  catalogo: readonly TecnicaDoCatalogo[],
): string {
  const nome = textoDoPapel(tecnica);
  if (nome === "") return "";
  const achada = catalogo.find((t) => t.nome === nome);
  const sigla = textoDoPapel(achada?.sigla);
  return sigla === "" ? nome : sigla;
}

/**
 * A linha fixa do Estudo Individual, para o dia que **não** tem EI lançado (`D-4`).
 *
 * ⚠️ **ELA APARECE MESMO SEM HORÁRIO, e isso é paridade.** O `D-9` da planilha registra *"linha do
 * 9º tempo sem horário no CAHO"* como defeito do documento histórico — aqui a ausência de relógio
 * (ou de TA lançado) deixa a célula de HORÁRIO **vazia**, e a linha continua, porque é ela que
 * carrega a promessa impressa no rodapé: *"é facultado ao aluno permanecer a bordo"*.
 */
function linhaFixaDoEstudoIndividual(
  data: string,
  ultimoTa: number | null,
  relogio: Relogio | null,
): LinhaImpressa {
  const slot = slotDoEstudoIndividual(ultimoTa);
  const tempo = relogio !== null && slot !== null ? tempoDeAula(relogio, slot) : undefined;
  const trechos: readonly Trecho[] =
    tempo === undefined ? [] : [{ inicio: tempo.inicio, fim: tempo.fim, periodo: tempo.periodo }];
  return {
    chave: `ei-${data}`,
    trechos,
    taInicial: slot,
    tempos: tempo === undefined ? null : 1,
    disciplina: "",
    conteudo: TEXTO_DO_ESTUDO_INDIVIDUAL,
    local: "",
    te: SIGLA_DO_ESTUDO_INDIVIDUAL,
    instrutor: "",
    estudoIndividual: true,
    /* A linha FIXA não é lançamento: ela não pode estar "à frente" de nada. */
    lancadoAFrente: false,
  };
}

/**
 * As linhas de **um** dia, na ordem dos TA, com a linha do Estudo Individual **no fim**.
 *
 * ⚠️ **O EI LANÇADO VIRA A LINHA FIXA, em vez de somar-se a ela** (regra 2 do topo). Quem diz quais
 * fatos são Estudo Individual é o chamador, por `idsDeEstudoIndividual` — a `categoria_normativa`
 * vive em `atividades_nao_letivas` e **não** está em `FatoDaSemana`, que é tipo de exibição.
 * Adivinhá-la pelo subtipo seria inventar: o subtipo é lista administrável.
 *
 * ⚠️ **FERIADO DE DIA INTEIRO DEVOLVE ZERO LINHAS e o `bloqueio` preenchido** (`Q-16`): o dia sai
 * como **uma** faixa com a descrição, e **sem** a linha de EI — não há Estudo Individual em dia que
 * não houve expediente.
 */
export function diaImpresso(
  dia: DiaDaGrade,
  entrada: {
    readonly relogio: Relogio | null;
    readonly tecnicas: readonly TecnicaDoCatalogo[];
    readonly idsDeEstudoIndividual: ReadonlySet<string>;
  },
): DiaImpresso {
  if (dia.bloqueio !== null) {
    return { data: dia.data, bloqueio: dia.bloqueio, linhas: [] };
  }

  const comuns: LinhaImpressa[] = [];
  let doEi: LinhaImpressa | null = null;
  let ultimoTa: number | null = null;

  for (const celula of dia.celulas) {
    const bloco = celula.bloco;
    if (bloco === null) continue;

    const ehEi = entrada.idsDeEstudoIndividual.has(bloco.fatoId);
    const linha: LinhaImpressa = {
      chave: bloco.fatoId,
      trechos: bloco.trechos,
      taInicial: bloco.taInicial,
      tempos: bloco.tempos,
      disciplina: textoDoPapel(bloco.disciplina),
      conteudo: textoDoPapel(bloco.conteudo),
      local: textoDoPapel(bloco.local),
      te: siglaOuExtenso(bloco.tecnica, entrada.tecnicas),
      instrutor: textoDoPapel(bloco.instrutor),
      estudoIndividual: ehEi,
      lancadoAFrente: bloco.lancadoAFrente,
    };

    if (ehEi) {
      /* ⚠️ O EI lançado **substitui** a linha fixa, e sai do corpo: ele é o pé do dia. */
      doEi = {
        ...linha,
        conteudo: TEXTO_DO_ESTUDO_INDIVIDUAL,
        te: SIGLA_DO_ESTUDO_INDIVIDUAL,
        /* ⚠️ **SEM INSTRUTOR, mesmo que o lançamento tenha um** — o documento assinado é assim. */
        instrutor: "",
      };
      continue;
    }

    comuns.push(linha);
    if (bloco.taInicial !== null) {
      const fim = bloco.taInicial + Math.max(1, bloco.tempos ?? 1) - 1;
      ultimoTa = ultimoTa === null ? fim : Math.max(ultimoTa, fim);
    }
  }

  const ei = doEi ?? linhaFixaDoEstudoIndividual(dia.data, ultimoTa, entrada.relogio);
  return { data: dia.data, bloqueio: null, linhas: [...comuns, ei] };
}

/** O corpo do documento: os dias da semana, na ordem, já impressos. */
export function documentoImpresso(
  semana: Semana,
  entrada: {
    readonly tecnicas: readonly TecnicaDoCatalogo[];
    readonly idsDeEstudoIndividual: ReadonlySet<string>;
  },
): readonly DiaImpresso[] {
  return semana.dias.map((dia) =>
    diaImpresso(dia, {
      relogio: semana.relogio,
      tecnicas: entrada.tecnicas,
      idsDeEstudoIndividual: entrada.idsDeEstudoIndividual,
    }),
  );
}

/**
 * A tabela de CH do rodapé — **só as disciplinas que aparecem naquela semana** (`SC-014`).
 *
 * ⚠️ **O CORTE É POR CÓDIGO IMPRESSO, não por disciplina da turma.** A turma tem 13 a 21
 * disciplinas; a semana mostra tipicamente 4 a 7. Listar todas no pé de uma A4 paisagem é o que
 * estoura a página, e caber em **uma** é asserção (`SC-001`).
 *
 * ⚠️ **SEMANA SEM LANÇAMENTO DEVOLVE LISTA VAZIA, e a tabela não sai** — vazio é vazio, e não é
 * "todas" (o gotcha 4 aplicado ao papel).
 */
export function tabelaDeCh(
  dias: readonly DiaImpresso[],
  execucao: readonly ExecucaoDaDisciplina[],
): readonly ExecucaoDaDisciplina[] {
  const codigos = new Set<string>();
  for (const dia of dias) {
    for (const linha of dia.linhas) {
      if (linha.disciplina !== "") codigos.add(linha.disciplina);
    }
  }
  return execucao
    .filter((d) => codigos.has(d.codigo))
    .slice()
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

/** Uma entrada da legenda: a sigla e o nome por extenso. */
export type ItemDaLegenda = {
  readonly sigla: string;
  readonly nome: string;
};

/**
 * A legenda `TÉCNICAS DE ENSINO` — **só as siglas usadas naquela semana** (`SC-014`).
 *
 * ⚠️ **A LINHA QUE IMPRIMIU POR EXTENSO NÃO ENTRA NA LEGENDA, e não é esquecimento:** legenda
 * existe para traduzir sigla, e o nome inteiro já está na coluna. Repeti-lo no rodapé gastaria a
 * largura de que a tabela de CH precisa.
 */
export function legendaDeTecnicas(
  dias: readonly DiaImpresso[],
  catalogo: readonly TecnicaDoCatalogo[],
): readonly ItemDaLegenda[] {
  const usadas = new Set<string>();
  for (const dia of dias) {
    for (const linha of dia.linhas) {
      if (linha.te !== "") usadas.add(linha.te);
    }
  }
  const itens: ItemDaLegenda[] = [];
  for (const tecnica of catalogo) {
    const sigla = textoDoPapel(tecnica.sigla);
    if (sigla !== "" && usadas.has(sigla)) itens.push({ sigla, nome: tecnica.nome });
  }
  return itens.slice().sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
}

/**
 * Quantos TA da semana estão **lançados à frente** (`Q-2`, `FR-028.1`).
 *
 * ⚠️ **ELE VAI NO RODAPÉ IMPRESSO, e não é aviso de tela.** Avisos ficam na grade, antes de
 * imprimir; isto é **conteúdo do documento**: quem assina a semana precisa saber quanto dela é
 * planejamento. ⚠️ **ZERO NÃO IMPRIME NADA** — uma linha dizendo *"0 TA à frente"* ocuparia a
 * largura que a tabela de CH precisa para dizer algo.
 */
export function taLancadoAFrente(dias: readonly DiaImpresso[]): number {
  let total = 0;
  for (const dia of dias) {
    for (const linha of dia.linhas) {
      if (linha.lancadoAFrente) total += linha.tempos ?? 0;
    }
  }
  return total;
}

/**
 * Os avisos de dado faltante — **na TELA, antes de imprimir** (`FR-039`, `SC-015`).
 *
 * ⚠️ **ELES NÃO VÃO PARA O PAPEL, e é por isso que esta função mora aqui e não na rota de
 * impressão.** O contrato é explícito: *"nenhum aviso; dado faltante vira aviso na tela da grade,
 * ao lado do botão Imprimir, ANTES de abrir a impressão"*. A rota de impressão recebe o que a tela
 * já validou — e o `D-2` da planilha é o que acontece quando o aviso vai junto: *"VERIFICAR Nº DE
 * TA"* saiu **impresso** em 10 das 15.
 *
 * ⚠️ **NENHUM DELES BLOQUEIA O BOTÃO** (`RN-DEG-02`): *"regra normativa vira alerta, nunca
 * bloqueio"*. Quem precisa do papel hoje imprime com o traço e corrige o cadastro depois.
 */
export function avisosAntesDeImprimir(entrada: {
  readonly numeroDoDsa: number | null;
  readonly motivoDoNumeroAusente: string | null;
  readonly alunos: number | null;
  readonly semRelogio: boolean;
  readonly semAssinaturaEsquerda: boolean;
  readonly semAssinaturaDireita: boolean;
  readonly linhasImpressas: number;
}): readonly string[] {
  const avisos: string[] = [];
  if (entrada.numeroDoDsa === null) {
    const motivo = entrada.motivoDoNumeroAusente ?? "não foi possível calculá-lo";
    avisos.push(`O número do DSA sai como “Nº —”: ${motivo}`);
  }
  if (entrada.alunos === null) {
    avisos.push(
      "O efetivo da turma não está cadastrado, então a linha do número de alunos não sai no rodapé.",
    );
  }
  if (entrada.semRelogio) {
    avisos.push(
      "Esta semana não tem regime de curso vigente, então a coluna HORÁRIO sai em branco.",
    );
  }
  if (entrada.semAssinaturaEsquerda && entrada.semAssinaturaDireita) {
    avisos.push(
      "Não há responsável vigente nesta data para nenhuma das duas assinaturas: as duas linhas saem em branco, para assinar à mão.",
    );
  } else if (entrada.semAssinaturaEsquerda || entrada.semAssinaturaDireita) {
    const lado = entrada.semAssinaturaEsquerda ? "da esquerda" : "da direita";
    avisos.push(
      `Não há responsável vigente nesta data para a assinatura ${lado}: a linha sai em branco, para assinar à mão.`,
    );
  }
  if (entrada.linhasImpressas === 0) {
    avisos.push(
      "Nenhum Tempo de Aula está lançado nesta semana: o documento sai com os dias e só a linha de Estudo Individual.",
    );
  }
  return avisos;
}

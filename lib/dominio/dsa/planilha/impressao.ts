/**
 * A aba IMPRESSÃO — o papel da semana escolhida (`FR-012`, `FR-013`, `FR-017`, `FR-022` a `FR-024`,
 * `contracts/planilha.md` §3 da spec 015).
 *
 * > *"A IMPRESSÃO MUST ter um seletor de semana — uma célula no topo, com a lista das semanas do ano
 * > da turma — e mostrar só a semana escolhida, em uma página A4 paisagem, no modelo v4 (dias ×
 * > tempos). Imprimir MUST ser escolher a semana e mandar imprimir."* — `FR-022`
 *
 * ⚠️ **NADA AQUI É CONSTANTE DA SEMANA.** Toda célula da grade lê a PREENCHIMENTO pela posição da
 * semana no seletor — `MATCH` na `LISTA_SEMANAS` e `INDEX` com a linha calculada, porque o bloco de
 * cada semana tem a mesma altura —, sem `INDIRECT` nem `OFFSET` (`FR-031`). Editar a entrada muda o
 * papel; escolher outra semana troca o papel inteiro.
 *
 * ⚠️ **O BLOCO SE AGRUPA POR COR, e a cor lê só esta aba** (R-7): a formatação condicional do Google
 * não faz borda e não lê outra aba; por isso as colunas de apoio ocultas, ao lado da área de
 * impressão, espelham o tipo, o tom e o início de cada célula. Cada célula casa com **uma** regra só —
 * o Google aplica a primeira que casa, e fundo e negrito em regras separadas se perderiam.
 *
 * ⚠️ **O TEXTO FIXO DO DOCUMENTO É O DO PAPEL** (`RNF-COMP-01`): a organização, a nota do Estudo
 * Individual e o rótulo das observações saem verbatim — uma suíte confere contra o `/print/dsa`.
 */
import {
  NOTA_DO_ESTUDO_INDIVIDUAL,
  ROTULO_DE_OBSERVACOES,
  SIGLA_DO_ESTUDO_INDIVIDUAL,
} from "../impressao";
import { LOCAL_DO_ESTUDO_INDIVIDUAL } from "../rotulos";
import { instanteComHoraParaLeitura } from "../../../formato/data";
import {
  concat,
  fn,
  intervalo,
  nome,
  num,
  op,
  ref,
  txt,
  type Formula,
} from "../../../planilha/formula";
import { definir, novaAba, type Aba, type Estilo } from "../../../planilha/pasta";
import {
  BARRA,
  COR_DA_REGUA,
  COR_DO_CABECALHO,
  COR_SOBRE_O_CABECALHO,
  COR_SUAVE,
  FUNDO,
  TITULO,
  type TipoDoCartao,
} from "../../../planilha/cores";

import {
  ABA,
  CONTEUDO_DO_ESTUDO_NO_CARTAO,
  NOME,
  P,
  PC,
  P_LINHAS_DO_CABECALHO,
  P_PRIMEIRA_LINHA,
} from "./layout";
import { DIAS_NA_ENTRADA, SIGLAS_DOS_DIAS, type GeometriaDaEntrada } from "./preenchimento";

/** O cabeçalho institucional — o mesmo texto fixo do `/print/dsa` (conferido por teste). */
export const SIGLA_DA_ORGANIZACAO = "CIAARA";
export const NOME_DA_ORGANIZACAO = "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO";
export const SUBTITULO_DO_DOCUMENTO = "Detalhe Semanal de Aulas";

export const INSTRUCAO_DA_IMPRESSAO =
  "Escolha a semana na célula ao lado e mande imprimir: a página sai em A4 paisagem. Edite a assinatura, os alunos e o ALT no cabeçalho da semana, na PREENCHIMENTO.";

/** O cartão da linha fixa de Estudo Individual — `linhaFixaDoEstudoIndividual`, numa célula. */
export const TEXTO_DO_ESTUDO_FIXO = `${CONTEUDO_DO_ESTUDO_NO_CARTAO}\n1 TA · ${LOCAL_DO_ESTUDO_INDIVIDUAL} · ${SIGLA_DO_ESTUDO_INDIVIDUAL}`;

const TIPOS: readonly TipoDoCartao[] = ["aula", "avaliacao", "estudo", "atividade"];

/* ------------------------------------------------------------------ geometria */

export type GeometriaDaImpressao = {
  readonly dias: number;
  readonly tempos: number;
  readonly ultimaColuna: number;
  /** A distância da célula da grade até o espelho dela, nas colunas de apoio. */
  readonly espelho: number;
  /** A primeira coluna de apoio por dia (4 por dia: tipo, tom, início, continua). */
  readonly apoioDoDia: (d: number) => number;
  /** A coluna das contas gerais (semana escolhida, linha do cabeçalho, relógio…). */
  readonly gerais: number;
  readonly linhaDoSeletor: number;
  readonly colunaDoSeletor: number;
  readonly linhaDoCabecalhoDosDias: number;
  readonly linhaDoTa: (t: number) => number;
  readonly linhaDoSeparador: (t: number) => number;
  readonly ultimaDaGrade: number;
  readonly listaSemPosicao: number;
  readonly listaDoSabado: number | null;
  readonly rodape: number;
  readonly linhasDoRodape: number;
  readonly observacoes: number;
  readonly assinaturas: number;
  readonly legendaDosTipos: number;
  readonly nota: number;
  readonly emitido: number;
};

export const faixaDoDia = (d: number) => 2 + 2 * d;
export const conteudoDoDia = (d: number) => 3 + 2 * d;

export function geometriaDaImpressao(entrada: {
  readonly temSabado: boolean;
  readonly tempos: number;
  readonly linhasSemPosicao: number;
  readonly disciplinas: number;
  readonly tecnicas: number;
}): GeometriaDaImpressao {
  const dias = entrada.temSabado ? 6 : 5;
  const ultimaColuna = 1 + 2 * dias;
  const espelho = ultimaColuna + 1;
  const inicioDoApoio = ultimaColuna + espelho + 2;
  const gerais = inicioDoApoio + 4 * DIAS_NA_ENTRADA;
  const linhaDoTa = (t: number) => 8 + 2 * (t - 1);
  const ultimaDaGrade = linhaDoTa(entrada.tempos);
  const listaSemPosicao = ultimaDaGrade + 2;
  const fimDaLista = listaSemPosicao + entrada.linhasSemPosicao;
  const listaDoSabado = entrada.temSabado ? null : fimDaLista + 1;
  const fimDasListas = listaDoSabado === null ? fimDaLista : listaDoSabado + entrada.tempos;
  const rodape = fimDasListas + 2;
  const linhasDoRodape = Math.max(1, entrada.disciplinas, entrada.tecnicas);
  const observacoes = rodape + linhasDoRodape + 2;
  const assinaturas = observacoes + 2;
  const legendaDosTipos = assinaturas + 4;
  return {
    dias,
    tempos: entrada.tempos,
    ultimaColuna,
    espelho,
    apoioDoDia: (d) => inicioDoApoio + 4 * d,
    gerais,
    linhaDoSeletor: 2,
    colunaDoSeletor: conteudoDoDia(0),
    linhaDoCabecalhoDosDias: 7,
    linhaDoTa,
    linhaDoSeparador: (t) => linhaDoTa(t) + 1,
    ultimaDaGrade,
    listaSemPosicao,
    listaDoSabado,
    rodape,
    linhasDoRodape,
    observacoes,
    assinaturas,
    legendaDosTipos,
    nota: legendaDosTipos + 1,
    emitido: legendaDosTipos + 2,
  };
}

/** As contas gerais, cada uma numa linha da coluna `gerais`. */
export const GERAL = {
  semana: 1,
  cabecalho: 2,
  relogio: 3,
  linhas: 4,
  temposDoRelogio: 5,
  temposDoRegime: 6,
  estudoFixo: 7,
  segunda: 8,
  ultimo: 9,
  chave: 10,
  fixosDeEstudo: 11,
} as const;

/** As contas por dia, na coluna `apoioDoDia(d)`. */
export const DIA = {
  primeira: 1,
  slot: 2,
  bloqueio: 3,
  data: 4,
  maior: 5,
  temLancamento: 6,
} as const;

/* ------------------------------------------------------------------ fórmulas */

const vazio = txt("");
const SE = (c: Formula, a: Formula, b: Formula) => fn("IF", c, a, b);
const igual = (a: Formula, b: Formula) => op(a, "=", b);
const QUEBRA = fn("CHAR", num(10));

const daEntrada = (coluna: number, g: GeometriaDaEntrada) =>
  intervalo({ linha: 1, coluna }, { linha: g.ultimaLinha, coluna }, ABA.preenchimento);
const naEntrada = (coluna: number, linha: Formula, g: GeometriaDaEntrada) =>
  fn("INDEX", daEntrada(coluna, g), linha);

/** `DD/MM/AAAA` de um número de série, sem `TEXT` (que depende do idioma do programa, R-4). */
export function dataPorExtenso(serie: Formula, comAno = true): Formula {
  const doisDigitos = (x: Formula) => fn("RIGHT", concat(txt("0"), x), num(2));
  const diaMes = concat(doisDigitos(fn("DAY", serie)), txt("/"), doisDigitos(fn("MONTH", serie)));
  return comAno ? concat(diaMes, txt("/"), fn("YEAR", serie)) : diaMes;
}

/** A aba IMPRESSÃO inteira. */
export function abaDeImpressao(entrada: {
  readonly entrada: GeometriaDaEntrada;
  readonly geometria: GeometriaDaImpressao;
  readonly turma: string;
  readonly curso: string;
  readonly geradaEm: string;
  readonly rotuloInicial: string;
}): Aba {
  const { entrada: ge, geometria: g } = entrada;
  const aba = novaAba(ABA.impressao);
  const geral = (n: number) => ref(n, g.gerais, { fixa: true });
  const doDia = (d: number, n: number) => ref(n, g.apoioDoDia(d), { fixa: true });
  const linhaDaEntrada = (d: number, t: number) => op(doDia(d, DIA.primeira), "+", num(t - 1));

  /* ---- topo e seletor */
  definir(aba, 1, 1, { valor: INSTRUCAO_DA_IMPRESSAO, estilo: { negrito: true } });
  definir(aba, g.linhaDoSeletor, 1, { valor: "Semana:", estilo: { negrito: true } });
  definir(aba, g.linhaDoSeletor, g.colunaDoSeletor, {
    valor: entrada.rotuloInicial,
    estilo: { negrito: true, fundo: COR_DA_REGUA },
  });
  aba.validacoes.push({
    intervalos: [
      {
        de: { linha: g.linhaDoSeletor, coluna: g.colunaDoSeletor },
        ate: { linha: g.linhaDoSeletor, coluna: g.colunaDoSeletor },
      },
    ],
    fonte: nome(NOME.listaSemanas),
  });

  /* ---- as contas gerais da semana escolhida */
  const seletor = ref(g.linhaDoSeletor, g.colunaDoSeletor, { fixa: true });
  definir(aba, GERAL.semana, g.gerais, {
    formula: fn("IFERROR", fn("MATCH", seletor, nome(NOME.listaSemanas), num(0)), num(1)),
  });
  definir(aba, GERAL.cabecalho, g.gerais, {
    formula: op(
      num(P_PRIMEIRA_LINHA),
      "+",
      op(op(geral(GERAL.semana), "-", num(1)), "*", num(ge.altura)),
    ),
  });
  const cabecalho = geral(GERAL.cabecalho);
  definir(aba, GERAL.relogio, g.gerais, {
    formula: concat(naEntrada(PC.relogio, cabecalho, ge), vazio),
  });
  const relogio = geral(GERAL.relogio);
  const doRelogio = (faixa: string, padrao: Formula) =>
    SE(
      igual(relogio, vazio),
      padrao,
      fn(
        "IFERROR",
        fn("INDEX", nome(faixa), fn("MATCH", relogio, nome(NOME.hRelId), num(0))),
        padrao,
      ),
    );
  definir(aba, GERAL.temposDoRelogio, g.gerais, {
    formula: doRelogio(NOME.hRelTempos, num(g.tempos)),
  });
  definir(aba, GERAL.temposDoRegime, g.gerais, {
    formula: doRelogio(NOME.hRelRegime, num(g.tempos)),
  });
  definir(aba, GERAL.estudoFixo, g.gerais, { valor: TEXTO_DO_ESTUDO_FIXO });
  definir(aba, GERAL.segunda, g.gerais, { formula: naEntrada(P.data, cabecalho, ge) });
  definir(aba, GERAL.chave, g.gerais, { formula: naEntrada(P.chaveDaSemana, cabecalho, ge) });

  /* ---- as contas por dia — os seis, inclusive o sábado sem coluna */
  for (let d = 0; d < DIAS_NA_ENTRADA; d += 1) {
    const c = g.apoioDoDia(d);
    definir(aba, DIA.primeira, c, {
      formula: op(cabecalho, "+", num(P_LINHAS_DO_CABECALHO + d * ge.tempos)),
    });
    const primeira = doDia(d, DIA.primeira);
    definir(aba, DIA.slot, c, { formula: naEntrada(P.slotDoEi, primeira, ge) });
    definir(aba, DIA.bloqueio, c, { formula: concat(naEntrada(P.bloqueio, primeira, ge), vazio) });
    definir(aba, DIA.data, c, { formula: naEntrada(P.data, primeira, ge) });
    definir(aba, DIA.maior, c, { formula: naEntrada(P.maxTaDoDia, primeira, ge) });
    definir(aba, DIA.temLancamento, c, { formula: naEntrada(P.temLancamento, primeira, ge) });
  }
  /* O último dia do papel: o sábado só quando ele tem lançamento (`diasDaTela`). */
  const sabadoComLancamento = ref(DIA.temLancamento, g.apoioDoDia(5), { fixa: true });
  definir(aba, GERAL.ultimo, g.gerais, {
    formula: op(geral(GERAL.segunda), "+", SE(igual(sabadoComLancamento, num(1)), num(5), num(4))),
  });
  definir(aba, GERAL.fixosDeEstudo, g.gerais, {
    formula: Array.from({ length: DIAS_NA_ENTRADA }, (_, d) =>
      SE(op(doDia(d, DIA.slot), ">", num(0)), num(1), num(0)),
    ).reduce((a, b) => op(a, "+", b)),
  });
  /* Quantas linhas o papel desta semana tem (`gradeDoPapel`): o regime, ou o último TA ocupado. */
  definir(aba, GERAL.linhas, g.gerais, {
    formula: SE(
      igual(relogio, vazio),
      num(g.tempos),
      fn(
        "MIN",
        num(g.tempos),
        geral(GERAL.temposDoRelogio),
        fn(
          "MAX",
          geral(GERAL.temposDoRegime),
          ...Array.from({ length: g.dias }, (_, d) => doDia(d, DIA.maior)),
        ),
      ),
    ),
  });
  const linhas = geral(GERAL.linhas);

  /* ---- o cabeçalho institucional e a identificação */
  const cabecalhoDoPapel: Estilo = {
    negrito: true,
    corDoTexto: COR_SOBRE_O_CABECALHO,
    fundo: COR_DO_CABECALHO,
  };
  for (let c = 1; c <= g.ultimaColuna; c += 1) definir(aba, 3, c, { estilo: cabecalhoDoPapel });
  definir(aba, 3, 1, {
    valor: `${SIGLA_DA_ORGANIZACAO} · ${NOME_DA_ORGANIZACAO}`,
    estilo: cabecalhoDoPapel,
  });
  definir(aba, 4, 1, {
    valor: entrada.curso,
    estilo: { negrito: true, tamanho: 14, corDoTexto: COR_DO_CABECALHO },
  });
  definir(aba, 5, 1, { valor: SUBTITULO_DO_DOCUMENTO, estilo: { corDoTexto: COR_SUAVE } });
  const numero = concat(naEntrada(PC.numero, cabecalho, ge), vazio);
  const alunos = naEntrada(PC.alunos, cabecalho, ge);
  const alt = concat(naEntrada(PC.alt, cabecalho, ge), vazio);
  const chave = geral(GERAL.chave);
  const numeroDaSemana = fn("MOD", chave, num(100));
  const identificacao: readonly [number, Formula][] = [
    [conteudoDoDia(0), txt(`Turma ${entrada.turma}`)],
    [
      conteudoDoDia(1),
      concat(
        txt("Semana "),
        numeroDaSemana,
        txt("/"),
        op(op(chave, "-", numeroDaSemana), "/", num(100)),
      ),
    ],
    [conteudoDoDia(2), concat(txt("DSA Nº "), numero)],
    [
      conteudoDoDia(3),
      concat(
        txt("Período "),
        dataPorExtenso(geral(GERAL.segunda)),
        txt(" a "),
        dataPorExtenso(geral(GERAL.ultimo)),
      ),
    ],
    [
      conteudoDoDia(4),
      concat(
        txt("ALT "),
        SE(igual(alt, vazio), txt("—"), alt),
        txt(" · Alunos "),
        SE(igual(alunos, vazio), txt("—"), alunos),
      ),
    ],
  ];
  for (const [c, formula] of identificacao) {
    definir(aba, 6, c, { formula, estilo: { negrito: true } });
  }

  /* ---- a grade */
  const cabecaDaGrade: Estilo = {
    negrito: true,
    corDoTexto: COR_SOBRE_O_CABECALHO,
    fundo: COR_DO_CABECALHO,
    horizontal: "center",
    quebra: true,
  };
  definir(aba, g.linhaDoCabecalhoDosDias, 1, { valor: "Horário", estilo: cabecaDaGrade });
  for (let d = 0; d < g.dias; d += 1) {
    definir(aba, g.linhaDoCabecalhoDosDias, faixaDoDia(d), { estilo: cabecaDaGrade });
    const bloqueio = doDia(d, DIA.bloqueio);
    definir(aba, g.linhaDoCabecalhoDosDias, conteudoDoDia(d), {
      formula: concat(
        txt(`${SIGLAS_DOS_DIAS[d]} `),
        dataPorExtenso(doDia(d, DIA.data), false),
        SE(igual(bloqueio, vazio), vazio, concat(QUEBRA, bloqueio)),
      ),
      estilo: cabecaDaGrade,
    });
  }

  const regua: Estilo = {
    fundo: COR_DA_REGUA,
    tamanho: 8,
    horizontal: "center",
    vertical: "center",
    quebra: true,
  };
  const conteudo: Estilo = { tamanho: 8, vertical: "top", quebra: true };
  /* As contas da régua, por TA, nas colunas gerais seguintes. */
  const R = {
    horario: 1,
    periodo: 2,
    inicio: 3,
    fim: 4,
    intervalo: 5,
    almoco: 7,
  } as const;
  const daRegua = (t: number, k: number) => ref(g.linhaDoTa(t), g.gerais + k, { fixa: true });
  const doRelogioPorTa = (faixa: string, t: number, padrao: Formula) =>
    SE(
      igual(relogio, vazio),
      padrao,
      fn(
        "IFERROR",
        fn(
          "INDEX",
          nome(faixa),
          fn("MATCH", concat(relogio, txt("|"), num(t)), nome(NOME.hChave), num(0)),
        ),
        padrao,
      ),
    );
  for (let t = 1; t <= g.tempos; t += 1) {
    const l = g.linhaDoTa(t);
    definir(aba, l, g.gerais + R.horario, {
      formula: concat(doRelogioPorTa(NOME.hHorario, t, vazio), vazio),
    });
    definir(aba, l, g.gerais + R.periodo, {
      formula: concat(doRelogioPorTa(NOME.hPeriodo, t, vazio), vazio),
    });
    definir(aba, l, g.gerais + R.inicio, {
      formula: concat(doRelogioPorTa(NOME.hInicio, t, vazio), vazio),
    });
    definir(aba, l, g.gerais + R.fim, {
      formula: concat(doRelogioPorTa(NOME.hFim, t, vazio), vazio),
    });
    /* ⚠️ O intervalo vem pronto da HORÁRIOS (`minutosEntre`, o de `gradeDoPapel`) — nenhuma conta de hora aqui. */
    definir(aba, l, g.gerais + R.intervalo, {
      formula: concat(doRelogioPorTa(NOME.hIntervalo, t, vazio), vazio),
    });
    if (t < g.tempos) {
      definir(aba, l, g.gerais + R.almoco, {
        formula: SE(
          fn("OR", igual(relogio, vazio), op(num(t + 1), ">", linhas)),
          num(0),
          SE(op(daRegua(t, R.periodo), "<>", daRegua(t + 1, R.periodo)), num(1), num(0)),
        ),
      });
    }

    /* A régua do TA. */
    definir(aba, l, 1, {
      formula: SE(
        op(num(t), ">", linhas),
        vazio,
        concat(
          txt(`${t}º`),
          SE(igual(daRegua(t, R.horario), vazio), vazio, concat(QUEBRA, daRegua(t, R.horario))),
        ),
      ),
      estilo: regua,
    });
    aba.alturas.set(l, 34);

    /* Cada dia: as quatro contas de apoio e as duas células visíveis. */
    for (let d = 0; d < DIAS_NA_ENTRADA; d += 1) {
      const c = g.apoioDoDia(d);
      const slot = doDia(d, DIA.slot);
      const ehFixo = igual(slot, num(t));
      const linha = linhaDaEntrada(d, t);
      definir(aba, l, c, {
        formula: SE(ehFixo, txt("estudo"), concat(naEntrada(P.tipo, linha, ge), vazio)),
      });
      definir(aba, l, c + 1, {
        formula: SE(ehFixo, num(0), fn("MOD", naEntrada(P.contador, linha, ge), num(2))),
      });
      definir(aba, l, c + 2, { formula: SE(ehFixo, num(1), naEntrada(P.inicio, linha, ge)) });
      definir(aba, l, c + 3, {
        formula: SE(
          ehFixo,
          num(0),
          SE(op(naEntrada(P.resto, linha, ge), ">", num(1)), num(1), num(0)),
        ),
      });
      if (d >= g.dias) continue;
      const tipo = ref(l, c, { fixa: true });
      const tom = ref(l, c + 1, { fixa: true });
      const inicio = ref(l, c + 2, { fixa: true });
      definir(aba, l, faixaDoDia(d), { estilo: { borda: { esquerda: true } } });
      definir(aba, l, conteudoDoDia(d), {
        formula: SE(ehFixo, geral(GERAL.estudoFixo), concat(naEntrada(P.texto, linha, ge), vazio)),
        estilo: conteudo,
      });
      /* O espelho que a formatação condicional lê. */
      definir(aba, l, faixaDoDia(d) + g.espelho, { formula: SE(igual(tipo, vazio), vazio, tipo) });
      definir(aba, l, conteudoDoDia(d) + g.espelho, {
        formula: SE(
          igual(tipo, vazio),
          vazio,
          concat(tipo, tom, SE(igual(inicio, num(1)), txt("*"), vazio)),
        ),
      });
    }

    if (t === g.tempos) continue;
    /* A linha entre dois TA: o intervalo, ou o almoço do relógio da semana escolhida. */
    const s = g.linhaDoSeparador(t);
    const almoco = daRegua(t, R.almoco);
    definir(aba, s, 1, {
      formula: SE(
        fn("OR", igual(relogio, vazio), op(num(t + 1), ">", linhas)),
        vazio,
        SE(
          igual(almoco, num(1)),
          concat(txt("Almoço "), daRegua(t, R.fim), txt("–"), daRegua(t + 1, R.inicio)),
          concat(daRegua(t, R.intervalo), txt(" min")),
        ),
      ),
      estilo: { ...regua, tamanho: 7 },
    });
    aba.alturas.set(s, 11);
    for (let d = 0; d < g.dias; d += 1) {
      const c = g.apoioDoDia(d);
      const tipo = ref(g.linhaDoTa(t), c, { fixa: true });
      const tom = ref(g.linhaDoTa(t), c + 1, { fixa: true });
      const continua = igual(ref(g.linhaDoTa(t), c + 3, { fixa: true }), num(1));
      const almocoOuNada = SE(igual(almoco, num(1)), txt("almoco"), vazio);
      definir(aba, s, faixaDoDia(d) + g.espelho, { formula: SE(continua, tipo, almocoOuNada) });
      definir(aba, s, conteudoDoDia(d) + g.espelho, {
        formula: SE(continua, concat(tipo, tom), almocoOuNada),
      });
    }
  }

  /* A cor do bloco: uma regra por código do espelho (R-7). */
  const canto = { linha: g.linhaDoTa(1), coluna: faixaDoDia(0) };
  const fim = { linha: g.ultimaDaGrade, coluna: g.ultimaColuna };
  const espelhoDoCanto = ref(canto.linha, canto.coluna + g.espelho);
  const regra = (
    codigo: string,
    estilo: { fundo: string; negrito?: boolean; corDoTexto?: string },
  ) =>
    aba.regras.push({ de: canto, ate: fim, formula: igual(espelhoDoCanto, txt(codigo)), estilo });
  for (const tipo of TIPOS) {
    regra(tipo, { fundo: BARRA[tipo] });
    for (const tom of [0, 1] as const) {
      regra(`${tipo}${tom}`, { fundo: FUNDO[tipo][tom] });
      regra(`${tipo}${tom}*`, { fundo: FUNDO[tipo][tom], negrito: true, corDoTexto: TITULO[tipo] });
    }
  }
  regra("almoco", { fundo: COR_DA_REGUA });

  /* ---- abaixo da grade: o que não tem lugar nela (`FR-013`) */
  definir(aba, g.listaSemPosicao, 1, {
    valor: "FORA DA GRADE E SEM POSIÇÃO (o que não tem lugar na grade, nunca omitido):",
    estilo: { negrito: true, tamanho: 8 },
  });
  for (let j = 0; j < ge.linhasSemPosicao; j += 1) {
    const linha = op(cabecalho, "+", num(P_LINHAS_DO_CABECALHO + DIAS_NA_ENTRADA * ge.tempos + j));
    definir(aba, g.listaSemPosicao + 1 + j, 1, {
      formula: concat(naEntrada(P.spTexto, linha, ge), vazio),
      estilo: { tamanho: 8 },
    });
  }
  if (g.listaDoSabado !== null) {
    const l0 = g.listaDoSabado;
    definir(aba, l0, 1, {
      valor: "SÁBADO (a turma não tem coluna de sábado — o que for lançado nele sai aqui):",
      estilo: { negrito: true, tamanho: 8 },
    });
    const inicioCol = g.gerais + 10;
    const acumuladoCol = g.gerais + 11;
    for (let t = 1; t <= g.tempos; t += 1) {
      const l = l0 + t;
      const linha = linhaDaEntrada(5, t);
      definir(aba, l, inicioCol, { formula: naEntrada(P.inicio, linha, ge) });
      definir(aba, l, acumuladoCol, {
        formula: t === 1 ? ref(l, inicioCol) : op(ref(l - 1, acumuladoCol), "+", ref(l, inicioCol)),
      });
    }
    const acumulados = intervalo(
      { linha: l0 + 1, coluna: acumuladoCol },
      { linha: l0 + g.tempos, coluna: acumuladoCol },
    );
    for (let j = 1; j <= g.tempos; j += 1) {
      const ta = fn("MATCH", num(j), acumulados, num(0));
      const linha = op(doDia(5, DIA.primeira), "+", op(ta, "-", num(1)));
      const parte = (coluna: number) => concat(naEntrada(coluna, linha, ge), vazio);
      definir(aba, l0 + j, 1, {
        formula: fn(
          "IFERROR",
          concat(
            txt("SÁB "),
            dataPorExtenso(doDia(5, DIA.data), false),
            txt(" · "),
            ta,
            txt("º TA · "),
            parte(P.linha1),
            SE(igual(parte(P.linha2), vazio), vazio, concat(txt(" · "), parte(P.linha2))),
            SE(igual(parte(P.linha3), vazio), vazio, concat(txt(" · "), parte(P.linha3))),
          ),
          vazio,
        ),
        estilo: { tamanho: 8 },
      });
    }
  }

  /* ---- o rodapé (`FR-024`): a CH e a legenda só da semana, compactadas sem função nova */
  const titulo: Estilo = { negrito: true, tamanho: 8, fundo: COR_DA_REGUA };
  const corpo: Estilo = { tamanho: 8 };
  const COL = {
    cod: 1,
    nome: conteudoDoDia(0),
    prevista: conteudoDoDia(1),
    cumprida: conteudoDoDia(2),
    sigla: conteudoDoDia(3),
    tecnica: conteudoDoDia(4),
  };
  for (const [c, texto] of [
    [COL.cod, "Cód."],
    [COL.nome, "Disciplina"],
    [COL.prevista, "CH. prevista"],
    [COL.cumprida, "CH. cumprida"],
    [COL.sigla, "TÉCNICAS DE ENSINO"],
    [COL.tecnica, ""],
  ] as const) {
    definir(aba, g.rodape, c, texto === "" ? { estilo: titulo } : { valor: texto, estilo: titulo });
  }
  const semana = geral(GERAL.semana);
  const presenteCol = g.gerais + 13;
  const ordemCol = g.gerais + 14;
  const presenteTec = g.gerais + 16;
  const ordemTec = g.gerais + 17;
  const daEntradaToda = (coluna: number) => daEntrada(coluna, ge);
  for (let j = 1; j <= g.linhasDoRodape; j += 1) {
    const l = g.rodape + j;
    /* A disciplina `j` aparece nesta semana? (`tabelaDeCh`: o código impresso em alguma linha) */
    definir(aba, l, presenteCol, {
      formula: SE(
        op(
          fn(
            "COUNTIFS",
            daEntradaToda(P.disciplina),
            fn("IFERROR", concat(fn("INDEX", nome(NOME.discCodigo), num(j)), vazio), txt("—")),
            daEntradaToda(P.semana_indice),
            semana,
            daEntradaToda(P.noPapel),
            num(1),
          ),
          ">",
          num(0),
        ),
        num(1),
        num(0),
      ),
    });
    definir(aba, l, ordemCol, {
      formula: SE(
        igual(ref(l, presenteCol), num(1)),
        fn(
          "SUM",
          intervalo(
            { linha: g.rodape + 1, coluna: presenteCol },
            { linha: l, coluna: presenteCol },
          ),
        ),
        num(0),
      ),
    });
    /* A técnica `j` (com sigla) aparece nesta semana? (`legendaDeTecnicas`) */
    const sigla = fn("IFERROR", concat(fn("INDEX", nome(NOME.tecSigla), num(j)), vazio), txt("—"));
    definir(aba, l, presenteTec, {
      formula: SE(
        op(
          op(
            fn(
              "COUNTIFS",
              daEntradaToda(P.te),
              sigla,
              daEntradaToda(P.semana_indice),
              semana,
              daEntradaToda(P.noPapel),
              num(1),
            ),
            "+",
            SE(igual(sigla, txt(SIGLA_DO_ESTUDO_INDIVIDUAL)), geral(GERAL.fixosDeEstudo), num(0)),
          ),
          ">",
          num(0),
        ),
        num(1),
        num(0),
      ),
    });
    definir(aba, l, ordemTec, {
      formula: SE(
        igual(ref(l, presenteTec), num(1)),
        fn(
          "SUM",
          intervalo(
            { linha: g.rodape + 1, coluna: presenteTec },
            { linha: l, coluna: presenteTec },
          ),
        ),
        num(0),
      ),
    });
  }
  const ordens = intervalo(
    { linha: g.rodape + 1, coluna: ordemCol },
    { linha: g.rodape + g.linhasDoRodape, coluna: ordemCol },
  );
  const ordensTec = intervalo(
    { linha: g.rodape + 1, coluna: ordemTec },
    { linha: g.rodape + g.linhasDoRodape, coluna: ordemTec },
  );
  const ultimo = geral(GERAL.ultimo);
  for (let i = 1; i <= g.linhasDoRodape; i += 1) {
    const l = g.rodape + i;
    const cod = ref(l, COL.cod, { fixa: true });
    definir(aba, l, COL.cod, {
      formula: fn(
        "IFERROR",
        concat(fn("INDEX", nome(NOME.discCodigo), fn("MATCH", num(i), ordens, num(0))), vazio),
        vazio,
      ),
      estilo: corpo,
    });
    const daDisciplina = (faixa: string) =>
      SE(
        igual(cod, vazio),
        vazio,
        fn(
          "IFERROR",
          fn("INDEX", nome(faixa), fn("MATCH", cod, nome(NOME.discCodigo), num(0))),
          vazio,
        ),
      );
    definir(aba, l, COL.nome, {
      formula: concat(daDisciplina(NOME.discNome), vazio),
      estilo: corpo,
    });
    definir(aba, l, COL.prevista, {
      formula: daDisciplina(NOME.discCh),
      estilo: { ...corpo, horizontal: "right" },
    });
    /* A CH cumprida acumulada até o fim da semana (`execucaoAteASemana`, `RN-CRONOS-03`). */
    const ate = concat(txt("<="), ultimo);
    definir(aba, l, COL.cumprida, {
      formula: SE(
        igual(cod, vazio),
        vazio,
        op(
          op(
            fn("COUNTIFS", daEntradaToda(P.disciplinaDaCh), cod, daEntradaToda(P.data), ate),
            "+",
            fn(
              "SUMIFS",
              daEntradaToda(P.spTempos),
              daEntradaToda(P.spDisciplinaDaCh),
              cod,
              daEntradaToda(P.data),
              ate,
            ),
          ),
          "+",
          fn(
            "SUMIFS",
            nome(NOME.foraTempos),
            nome(NOME.foraDisciplina),
            cod,
            nome(NOME.foraData),
            ate,
          ),
        ),
      ),
      estilo: { ...corpo, negrito: true, horizontal: "right" },
    });
    const sigla = ref(l, COL.sigla, { fixa: true });
    definir(aba, l, COL.sigla, {
      formula: fn(
        "IFERROR",
        concat(fn("INDEX", nome(NOME.tecSigla), fn("MATCH", num(i), ordensTec, num(0))), vazio),
        vazio,
      ),
      estilo: { ...corpo, negrito: true },
    });
    definir(aba, l, COL.tecnica, {
      formula: SE(
        igual(sigla, vazio),
        vazio,
        fn(
          "IFERROR",
          concat(
            fn("INDEX", nome(NOME.tecNome), fn("MATCH", sigla, nome(NOME.tecSigla), num(0))),
            vazio,
          ),
          vazio,
        ),
      ),
      estilo: corpo,
    });
  }

  definir(aba, g.observacoes, 1, {
    valor: ROTULO_DE_OBSERVACOES,
    estilo: { negrito: true, tamanho: 8 },
  });
  /* As duas assinaturas, do cabeçalho da semana (`FR-010`). */
  (["esquerda", "direita"] as const).forEach((lado, i) => {
    const c = lado === "esquerda" ? conteudoDoDia(0) : conteudoDoDia(3);
    const linha = op(cabecalho, "+", num(1 + i));
    definir(aba, g.assinaturas, c, {
      valor: "______________________________",
      estilo: { tamanho: 8 },
    });
    definir(aba, g.assinaturas + 1, c, {
      formula: concat(naEntrada(PC.nome, linha, ge), vazio),
      estilo: { tamanho: 8, negrito: true },
    });
    definir(aba, g.assinaturas + 2, c, {
      formula: concat(naEntrada(PC.posto, linha, ge), vazio),
      estilo: { tamanho: 8 },
    });
    definir(aba, g.assinaturas + 3, c, {
      formula: concat(naEntrada(PC.funcao, linha, ge), vazio),
      estilo: { tamanho: 8 },
    });
  });

  /* A legenda dos tipos, com as cores do papel. */
  for (const [d, tipo, texto] of [
    [0, "aula", "Aula"],
    [1, "avaliacao", "Avaliação"],
    [2, "estudo", "Estudo individual *"],
    [3, "atividade", "Atividade"],
  ] as const) {
    definir(aba, g.legendaDosTipos, conteudoDoDia(d), {
      valor: texto,
      estilo: { tamanho: 8, negrito: true, fundo: FUNDO[tipo][0], corDoTexto: TITULO[tipo] },
    });
    definir(aba, g.legendaDosTipos, faixaDoDia(d), { estilo: { fundo: BARRA[tipo] } });
  }
  definir(aba, g.legendaDosTipos, 1, { valor: "LEGENDA", estilo: { negrito: true, tamanho: 8 } });
  definir(aba, g.nota, 1, { valor: NOTA_DO_ESTUDO_INDIVIDUAL, estilo: { tamanho: 8 } });
  definir(aba, g.emitido, 1, {
    formula: concat(
      txt(
        `Emitido pela planilha de contingência gerada em ${instanteComHoraParaLeitura(entrada.geradaEm)} · Marinha do Brasil · ${SIGLA_DA_ORGANIZACAO} · ${entrada.curso} · DSA Nº `,
      ),
      numero,
    ),
    estilo: { tamanho: 7, corDoTexto: COR_SUAVE },
  });

  /* ---- a página */
  aba.larguras.set(1, 10);
  for (let d = 0; d < g.dias; d += 1) {
    aba.larguras.set(faixaDoDia(d), 1.4);
    aba.larguras.set(conteudoDoDia(d), g.dias === 6 ? 25 : 30);
  }
  for (let c = g.ultimaColuna + 1; c <= g.gerais + 20; c += 1) aba.colunasOcultas.add(c);
  aba.pagina = { paisagem: true };
  aba.areaDeImpressao = {
    de: { linha: 3, coluna: 1 },
    ate: { linha: g.emitido, coluna: g.ultimaColuna },
  };
  aba.semGrade = true;
  return aba;
}

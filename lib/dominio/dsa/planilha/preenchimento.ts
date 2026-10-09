/**
 * A aba PREENCHIMENTO — a entrada da planilha de contingência (`FR-005`, `FR-011`, `FR-013`,
 * `FR-015` a `FR-019`, `contracts/planilha.md` §2 da spec 015).
 *
 * > *"A entrada (PREENCHIMENTO) MUST ter, para cada dia de cada semana (sábado incluído), uma linha
 * > por TA do relógio, com o horário já escrito; lançar um TA MUST exigir no máximo duas escolhas — o
 * > código (disciplina ou categoria não letiva) e a UE ou item (`P-2`)."* — `FR-015`
 *
 * > *"Tópico, local, técnica e instrutor MUST aparecer sozinhos pela chave código+UE, a partir do
 * > catálogo; qualquer um MUST poder ser sobrescrito na linha, e o valor escrito MUST prevalecer.
 * > Mudar o catálogo MUST NOT mudar linha que tem valor próprio (`D-4`)."* — `FR-016`
 *
 * ⚠️ **O RETRATO VEM DO PAPEL DO SISTEMA, linha a linha.** Cada lançamento entra nos TA dele com os
 * valores que o `/print/dsa` imprime (`FR-011`) e com o código do lançamento (`Q-1`). O que bate com
 * o catálogo nasce **sugerido** — a fórmula, com o valor em cache —; o que difere nasce **escrito**
 * (`data-model.md` §2.7). ⚠️ **Se nascesse escrito, trocar a chave dele offline deixaria o tópico da
 * UE antiga na linha, sem erro nenhum.**
 *
 * ⚠️ **AS CONTAS DE APOIO SÃO AS DO PAPEL, reexpressas em fórmula** (R-6, ratificadas na `DP-1`): o
 * bloco (chave, período e código — `gradeDoPapel`), o tipo do cartão (`tipoDoCartao`), o lugar do
 * Estudo Individual (`slotDoEstudoIndividual`) e o nº do DSA (`numeroDoDsa`). Cada uma é provada
 * contra a função do sistema pela suíte; nenhuma decide sozinha o que o sistema não decidiria.
 */
import { semanaIsoDe } from "../../carga-semanal";
import { TA_MAXIMO, type Relogio } from "../horario-do-bloco";
import { NUMERO_AUSENTE_NO_CABECALHO } from "../numero-do-dsa";
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
import { definir, novaAba, type Aba, type Celula, type Estilo } from "../../../planilha/pasta";
import {
  COR_DA_REGUA,
  COR_DO_CABECALHO,
  COR_SOBRE_O_CABECALHO,
  COR_SUAVE,
} from "../../../planilha/cores";

import { chaveDaSemanaIso, chaveDoItem, chaveDoLancamento } from "./catalogo";
import {
  ABA,
  B,
  B_PRIMEIRA_LINHA,
  CATEGORIA_NO_COD,
  NOME,
  P,
  PC,
  P_LINHAS_DO_CABECALHO,
  P_LINHA_DOS_TITULOS,
  P_PRIMEIRA_COLUNA_DE_APOIO,
  P_PRIMEIRA_LINHA,
  P_ULTIMA_COLUNA,
  TEXTO_CHAVE_SEM_PAR,
} from "./layout";
import {
  chaveDoFato,
  type InsumoDaPlanilha,
  type ItemDoCatalogo,
  type LancamentoSemPosicao,
  type SemanaDoInsumo,
} from "./tipos";

export const SIGLAS_DOS_DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;
export const DIAS_NA_ENTRADA = 6;

export const TEXTO_DO_TOPO = {
  aviso:
    "É contingência: o sistema continua sendo a fonte. O que for lançado aqui é relançado no sistema quando ele voltar. Baixe de novo no início de cada semana.",
  instrucao:
    "Para lançar um TA, escolha o COD e o ITEM: tópico, local, T/E e instrutor aparecem sozinhos. Escreva por cima para mudar — o que você escreve prevalece. Para voltar à sugestão, copie a célula da linha de cima.",
} as const;

export const MOTIVO_FORA_DO_RELOGIO = "fora do relógio da semana";
export const MOTIVO_SOBREPOSTO = "no mesmo TA de outro lançamento";

/* ------------------------------------------------------------------ geometria */

export type GeometriaDaEntrada = {
  readonly semanas: number;
  /** TA por dia (`temposDaGrade`). */
  readonly tempos: number;
  readonly linhasSemPosicao: number;
  /** Linhas de um bloco de semana — a MESMA em todas (é o que deixa a IMPRESSÃO achar a semana). */
  readonly altura: number;
  readonly ultimaLinha: number;
};

export function geometriaDaEntrada(
  semanas: number,
  tempos: number,
  linhasSemPosicao: number,
): GeometriaDaEntrada {
  const altura = P_LINHAS_DO_CABECALHO + DIAS_NA_ENTRADA * tempos + linhasSemPosicao;
  return {
    semanas,
    tempos,
    linhasSemPosicao,
    altura,
    ultimaLinha: P_PRIMEIRA_LINHA + Math.max(1, semanas) * altura - 1,
  };
}

/** A linha do cabeçalho da semana `k` (0-based). */
export const linhaDoCabecalho = (g: GeometriaDaEntrada, k: number) =>
  P_PRIMEIRA_LINHA + k * g.altura;
/** A primeira linha do dia `d` (0 = segunda) da semana `k`. */
export const primeiraLinhaDoDia = (g: GeometriaDaEntrada, k: number, d: number) =>
  linhaDoCabecalho(g, k) + P_LINHAS_DO_CABECALHO + d * g.tempos;
/** A linha do TA `t` (1-based) do dia `d` da semana `k`. */
export const linhaDoTa = (g: GeometriaDaEntrada, k: number, d: number, t: number) =>
  primeiraLinhaDoDia(g, k, d) + t - 1;
/** A linha `j` (0-based) da lista sem posição da semana `k`. */
export const linhaSemPosicao = (g: GeometriaDaEntrada, k: number, j: number) =>
  linhaDoCabecalho(g, k) + P_LINHAS_DO_CABECALHO + DIAS_NA_ENTRADA * g.tempos + j;

/* ------------------------------------------------------------------ o retrato */

/** O que um TA de lançamento do sistema traz para a entrada. */
type TaDoRetrato = {
  readonly cod: string;
  readonly item: string | number;
  readonly conteudo: string;
  readonly local: string;
  readonly te: string;
  readonly instrutor: string;
  readonly codigo: string | null;
};

export type SemanaNoRetrato = {
  /** `dia × TA` → o TA do lançamento. */
  readonly tas: ReadonlyMap<string, TaDoRetrato>;
  readonly semPosicao: readonly (LancamentoSemPosicao & {
    readonly cod: string;
    readonly item: string | number;
    readonly codigo: string | null;
    readonly noPapel: boolean;
    /** Está em `vw_ocupacao_ta` (tem TA): conta na CH cumprida e no nº do sistema, impresso ou não. */
    readonly naOcupacao: boolean;
    readonly disciplinaDaCh: string;
    readonly contaNoNumero: boolean;
  })[];
  /** O maior TA de lançamento que ficou fora da grade, por dia — o papel o conta no último TA. */
  readonly ultimoTaFora: readonly number[];
};

const chaveDoTa = (d: number, t: number) => `${d}|${t}`;

/**
 * Onde cada lançamento da semana entra: nos TA dele, ou na lista *sem posição* (`FR-013`) quando o
 * relógio da semana não tem os TA dele (o papel o põe abaixo da grade) ou quando outro lançamento já
 * ocupa o TA.
 */
export function retratoDaSemana(
  semana: SemanaDoInsumo,
  insumo: InsumoDaPlanilha,
  catalogo: ReadonlyMap<string, ItemDoCatalogo>,
  tempos: number,
): SemanaNoRetrato {
  const tas = new Map<string, TaDoRetrato>();
  const semPosicao: SemanaNoRetrato["semPosicao"][number][] = [];
  const ultimoTaFora = Array.from({ length: DIAS_NA_ENTRADA }, () => 0);
  const noRelogio = (r: Relogio | null, ta: number) =>
    r === null ? ta <= tempos : ta <= tempos && r.tempos.some((x) => x.numero === ta);

  const extra = (fatoId: string, data: string, taInicial: number | null) => {
    const fato = insumo.fatos.get(chaveDoFato(fatoId, data, taInicial));
    const chave = fato === undefined ? { cod: "", item: "" } : chaveDoLancamento(fato);
    const item = catalogo.get(chaveDoItem(chave.cod, chave.item).toUpperCase());
    return {
      ...chave,
      codigo: fato?.codigo ?? null,
      disciplinaDaCh:
        item?.disciplinaDaCh ??
        (fato !== undefined && fato.origem !== "atividade_nao_letiva"
          ? (fato.disciplinaCodigo ?? "")
          : ""),
      contaNoNumero:
        item?.contaNoNumero ?? (fato?.origem === "aula" || fato?.origem === "avaliacao"),
    };
  };

  semana.dias.forEach((dia, d) => {
    for (const linha of dia.linhas) {
      /* A linha FIXA do Estudo Individual não é lançamento: a fórmula a repõe (`slotDoEstudoIndividual`). */
      if (linha.chave.startsWith("ei-")) continue;
      const n = Math.max(1, linha.tempos ?? 1);
      const inicio = linha.taInicial;
      const e = extra(linha.chave, dia.data, inicio);
      const cabe =
        inicio !== null &&
        Array.from({ length: n }, (_, i) => inicio + i).every((ta) =>
          noRelogio(semana.relogio, ta),
        );
      const livre =
        cabe &&
        Array.from({ length: n }, (_, i) => inicio + i).every((ta) => !tas.has(chaveDoTa(d, ta)));
      if (inicio !== null && cabe && livre) {
        for (let ta = inicio; ta < inicio + n; ta += 1) {
          tas.set(chaveDoTa(d, ta), {
            cod: e.cod,
            item: e.item,
            conteudo: linha.conteudo,
            local: linha.local,
            te: linha.te,
            instrutor: linha.instrutor,
            codigo: e.codigo,
          });
        }
        continue;
      }
      if (inicio !== null && !cabe) {
        ultimoTaFora[d] = Math.max(ultimoTaFora[d] ?? 0, inicio + n - 1);
      }
      semPosicao.push({
        fatoId: linha.chave,
        data: dia.data,
        taInicial: inicio,
        tempos: linha.tempos,
        disciplina: linha.disciplina,
        conteudo: linha.conteudo,
        local: linha.local,
        te: linha.te,
        instrutor: linha.instrutor,
        motivo: cabe ? MOTIVO_SOBREPOSTO : MOTIVO_FORA_DO_RELOGIO,
        cod: e.cod,
        item: e.item,
        codigo: e.codigo,
        noPapel: true,
        naOcupacao: true,
        disciplinaDaCh: e.disciplinaDaCh,
        contaNoNumero: e.contaNoNumero,
      });
    }
  });

  for (const s of semana.semPosicao) {
    const e = extra(s.fatoId, s.data, s.taInicial);
    semPosicao.push({
      ...s,
      cod: e.cod,
      item: e.item,
      codigo: e.codigo,
      /*
       * ⚠️ **SEM POSIÇÃO NÃO É SEM TA.** O papel não imprime o lançamento sem posição; mas o de
       * POSIÇÃO HERDADA da carga tem TA gravado, está em `vw_ocupacao_ta` e conta na CH e no nº do
       * sistema (medido na T048: a avaliação herdada de 07/04 da semente faltava 2 TA na CH). Só o
       * que não tem TA nenhum fica fora das duas contas — `vw_ocupacao_ta` exige TA.
       */
      noPapel: false,
      naOcupacao: s.taInicial !== null,
      disciplinaDaCh: s.taInicial !== null ? e.disciplinaDaCh : "",
      contaNoNumero: s.taInicial !== null && e.contaNoNumero,
    });
  }
  return { tas, semPosicao, ultimoTaFora };
}

/* ------------------------------------------------------------------ fórmulas */

const vazio = txt("");
const SE = (condicao: Formula, entao: Formula, senao: Formula) => fn("IF", condicao, entao, senao);
const igual = (a: Formula, b: Formula) => op(a, "=", b);
const diferente = (a: Formula, b: Formula) => op(a, "<>", b);
const QUEBRA = fn("CHAR", num(10));
const COD_DO_ESTUDO = CATEGORIA_NO_COD.Estudo_Individual;

const daCelula = (linha: number, coluna: number) => ref(linha, coluna);
const fixa = (linha: number, coluna: number) => ref(linha, coluna, { fixa: true });
const doCatalogo = (coluna: number) =>
  ref(B_PRIMEIRA_LINHA, coluna, { aba: ABA.catalogo, fixa: true });

/** `INDEX(faixa, MATCH(chave, BD_CHAVE, 0)) & ""` — o `& ""` evita o 0 da célula vazia no Excel. */
const doItem = (chave: Formula, faixa: string) =>
  concat(fn("INDEX", nome(faixa), fn("MATCH", chave, nome(NOME.bdChave), num(0))), vazio);
const eDisciplina = (cod: Formula) =>
  fn("ISNUMBER", fn("MATCH", cod, nome(NOME.discCodigo), num(0)));

/** As fórmulas de uma linha de TA — `t` é 1-based, e `primeira`/`ultima` são as linhas do dia. */
export function formulasDaLinhaDeTa(entrada: {
  readonly linha: number;
  readonly t: number;
  readonly tempos: number;
  readonly cabecalho: number;
}): ReadonlyMap<number, Formula> {
  const { linha: r, t, tempos, cabecalho } = entrada;
  const c = (coluna: number) => daCelula(r, coluna);
  const acima = (coluna: number) => daCelula(r - 1, coluna);
  const abaixo = (coluna: number) => daCelula(r + 1, coluna);
  const R = c(P.chave);
  const semChave = igual(R, vazio);
  const relogio = fixa(cabecalho, PC.relogio);
  const doRelogio = (faixa: string) =>
    SE(
      igual(relogio, vazio),
      vazio,
      fn(
        "IFERROR",
        concat(
          fn(
            "INDEX",
            nome(faixa),
            fn("MATCH", concat(relogio, txt("|"), c(P.ta)), nome(NOME.hChave), num(0)),
          ),
          vazio,
        ),
        vazio,
      ),
    );
  const sugerido = (faixa: string) => SE(semChave, vazio, fn("IFERROR", doItem(R, faixa), vazio));
  const conteudoDoCartao = concat(
    c(P.conteudo),
    SE(igual(c(P.tipo), txt("estudo")), txt(" *"), vazio),
  );
  const quebraE = (x: Formula) => SE(igual(x, vazio), vazio, concat(QUEBRA, x));
  const separado = (x: Formula) => SE(igual(x, vazio), vazio, concat(txt(" · "), x));

  const f = new Map<number, Formula>();
  f.set(P.horario, doRelogio(NOME.hHorario));
  f.set(P.periodo, doRelogio(NOME.hPeriodo));
  f.set(
    P.chave,
    SE(
      igual(c(P.cod), vazio),
      vazio,
      concat(c(P.cod), txt("|"), SE(igual(c(P.item), vazio), txt("—"), c(P.item))),
    ),
  );
  f.set(
    P.conferencia,
    SE(
      semChave,
      vazio,
      SE(
        fn("ISNUMBER", fn("MATCH", R, nome(NOME.bdChave), num(0))),
        vazio,
        txt(TEXTO_CHAVE_SEM_PAR),
      ),
    ),
  );
  f.set(P.conteudo, sugerido(NOME.bdConteudo));
  f.set(P.local, sugerido(NOME.bdLocal));
  f.set(P.te, sugerido(NOME.bdTe));
  f.set(P.instrutor, sugerido(NOME.bdInstrutor));
  f.set(
    P.disciplina,
    SE(
      semChave,
      vazio,
      fn(
        "IFERROR",
        doItem(R, NOME.bdDisciplina),
        SE(eDisciplina(c(P.cod)), concat(c(P.cod), vazio), vazio),
      ),
    ),
  );
  f.set(
    P.tipo,
    SE(
      semChave,
      vazio,
      SE(
        igual(c(P.cod), txt(COD_DO_ESTUDO)),
        txt("estudo"),
        SE(
          fn("ISNUMBER", fn("MATCH", c(P.te), nome(NOME.siglasAvaliacao), num(0))),
          txt("avaliacao"),
          SE(igual(c(P.disciplina), vazio), txt("atividade"), txt("aula")),
        ),
      ),
    ),
  );
  /* O bloco (`gradeDoPapel`): começa quando a chave, o código do lançamento ou o período mudam. */
  f.set(
    P.inicio,
    t === 1
      ? SE(semChave, num(0), num(1))
      : SE(
          semChave,
          num(0),
          SE(
            fn(
              "OR",
              diferente(R, acima(P.chave)),
              diferente(c(P.codigo), acima(P.codigo)),
              diferente(c(P.periodo), acima(P.periodo)),
            ),
            num(1),
            num(0),
          ),
        ),
  );
  f.set(P.contador, t === 1 ? c(P.inicio) : op(acima(P.contador), "+", c(P.inicio)));
  f.set(
    P.posicao,
    t === 1
      ? SE(semChave, num(0), num(1))
      : SE(
          semChave,
          num(0),
          SE(igual(c(P.inicio), num(1)), num(1), op(acima(P.posicao), "+", num(1))),
        ),
  );
  f.set(
    P.resto,
    t === tempos
      ? SE(semChave, num(0), num(1))
      : SE(
          semChave,
          num(0),
          SE(
            fn("AND", diferente(abaixo(P.chave), vazio), igual(abaixo(P.inicio), num(0))),
            op(abaixo(P.resto), "+", num(1)),
            num(1),
          ),
        ),
  );
  f.set(P.comprimento, SE(semChave, num(0), op(op(c(P.posicao), "+", c(P.resto)), "-", num(1))));
  f.set(
    P.pe,
    SE(
      semChave,
      vazio,
      concat(
        c(P.instrutor),
        SE(igual(c(P.instrutor), vazio), vazio, txt(" · ")),
        c(P.comprimento),
        txt(" TA"),
        separado(c(P.local)),
        separado(c(P.te)),
      ),
    ),
  );
  const nomeDaDisciplina = fn(
    "IFERROR",
    concat(
      fn("INDEX", nome(NOME.discNome), fn("MATCH", c(P.disciplina), nome(NOME.discCodigo), num(0))),
      vazio,
    ),
    vazio,
  );
  const herdar = (coluna: number) => (t === 1 ? vazio : acima(coluna));
  const noInicio = (valor: Formula, coluna: number) =>
    SE(semChave, vazio, SE(igual(c(P.inicio), num(1)), valor, herdar(coluna)));
  f.set(
    P.linha1,
    noInicio(
      SE(
        igual(c(P.disciplina), vazio),
        conteudoDoCartao,
        concat(c(P.disciplina), txt(" "), nomeDaDisciplina),
      ),
      P.linha1,
    ),
  );
  f.set(P.linha2, noInicio(SE(igual(c(P.disciplina), vazio), c(P.pe), conteudoDoCartao), P.linha2));
  f.set(P.linha3, noInicio(SE(igual(c(P.disciplina), vazio), vazio, c(P.pe)), P.linha3));
  /* O cartão pelas células do bloco (R-8): título, conteúdo e pé; o bloco curto junta as linhas. */
  const A1 = c(P.linha1);
  const B1 = c(P.linha2);
  const C1 = c(P.linha3);
  f.set(
    P.texto,
    SE(
      semChave,
      vazio,
      SE(
        igual(c(P.posicao), num(1)),
        SE(igual(c(P.comprimento), num(1)), concat(A1, quebraE(B1), quebraE(C1)), A1),
        SE(
          igual(c(P.posicao), num(2)),
          SE(igual(c(P.comprimento), num(2)), concat(B1, quebraE(C1)), B1),
          SE(igual(c(P.posicao), num(3)), C1, vazio),
        ),
      ),
    ),
  );
  f.set(
    P.disciplinaDaCh,
    SE(
      semChave,
      vazio,
      fn(
        "IFERROR",
        doItem(R, NOME.bdDisciplinaDaCh),
        SE(eDisciplina(c(P.cod)), concat(c(P.cod), vazio), vazio),
      ),
    ),
  );
  f.set(
    P.contaNoNumero,
    SE(
      semChave,
      num(0),
      fn(
        "IFERROR",
        op(
          fn("INDEX", nome(NOME.bdContaNoNumero), fn("MATCH", R, nome(NOME.bdChave), num(0))),
          "+",
          num(0),
        ),
        SE(eDisciplina(c(P.cod)), num(1), num(0)),
      ),
    ),
  );
  f.set(P.noPapel, SE(semChave, num(0), num(1)));
  f.set(P.taOcupado, SE(semChave, num(0), c(P.ta)));
  f.set(P.taOcupadoSemEi, SE(fn("OR", semChave, igual(c(P.tipo), txt("estudo"))), num(0), c(P.ta)));
  return f;
}

/** As fórmulas da primeira linha de um dia — o Estudo Individual (`slotDoEstudoIndividual`). */
export function formulasDoDia(entrada: {
  readonly primeira: number;
  readonly tempos: number;
  readonly cabecalho: number;
  readonly sabado: boolean;
}): ReadonlyMap<number, Formula> {
  const { primeira: d0, tempos, cabecalho, sabado } = entrada;
  const ultima = d0 + tempos - 1;
  const doDia = (coluna: number) => intervalo({ linha: d0, coluna }, { linha: ultima, coluna });
  const c = (coluna: number) => daCelula(d0, coluna);
  const relogio = fixa(cabecalho, PC.relogio);
  const proximo = op(c(P.ultimoTa), "+", num(1));
  const f = new Map<number, Formula>();
  f.set(
    P.eiNoDia,
    SE(op(fn("COUNTIF", doDia(P.cod), txt(COD_DO_ESTUDO)), ">", num(0)), num(1), num(0)),
  );
  f.set(P.ultimoTa, fn("MAX", doDia(P.taOcupadoSemEi), c(P.ultimoTaFora)));
  f.set(
    P.temLancamento,
    SE(op(op(fn("SUM", doDia(P.noPapel)), "+", c(P.semPosicaoNoDia)), ">", num(0)), num(1), num(0)),
  );
  const impedido = [
    igual(c(P.eiNoDia), num(1)),
    diferente(c(P.bloqueio), vazio),
    /* O sábado só existe no papel quando tem lançamento (`diasDaTela`). */
    ...(sabado ? [igual(c(P.temLancamento), num(0))] : []),
  ];
  f.set(
    P.slotDoEi,
    SE(
      fn("OR", ...impedido),
      num(0),
      SE(
        op(proximo, ">", num(TA_MAXIMO)),
        num(0),
        SE(
          igual(relogio, vazio),
          proximo,
          SE(
            fn(
              "ISNUMBER",
              fn("MATCH", concat(relogio, txt("|"), proximo), nome(NOME.hChave), num(0)),
            ),
            proximo,
            num(0),
          ),
        ),
      ),
    ),
  );
  f.set(P.maxTaDoDia, fn("MAX", doDia(P.taOcupado), c(P.ultimoTaFora), c(P.slotDoEi)));
  return f;
}

/** As fórmulas do cabeçalho da semana — o nº do DSA (`numeroDoDsa`). */
export function formulasDoCabecalho(entrada: {
  readonly cabecalho: number;
  readonly anterior: number | null;
  readonly ultimaDaSemana: number;
}): ReadonlyMap<number, Formula> {
  const { cabecalho: h, anterior, ultimaDaSemana } = entrada;
  const c = (coluna: number) => daCelula(h, coluna);
  const daSemana = (coluna: number) =>
    intervalo({ linha: h + P_LINHAS_DO_CABECALHO, coluna }, { linha: ultimaDaSemana, coluna });
  const inicio = doCatalogo(B.dataInicio);
  const f = new Map<number, Formula>();
  /* A semana conta se tem aula ou avaliação (com TA) a partir do início da turma. */
  f.set(
    P.temAula,
    SE(
      igual(inicio, vazio),
      num(0),
      SE(
        op(
          fn("SUMIFS", daSemana(P.contaNoNumero), daSemana(P.data), concat(txt(">="), inicio)),
          ">",
          num(0),
        ),
        num(1),
        num(0),
      ),
    ),
  );
  const foraAte = fn("COUNTIFS", nome(NOME.foraSemanas), concat(txt("<="), c(P.chaveDaSemana)));
  f.set(
    P.acumulado,
    anterior === null
      ? op(c(P.temAula), "+", foraAte)
      : op(
          op(daCelula(anterior, P.acumulado), "+", c(P.temAula)),
          "+",
          fn(
            "COUNTIFS",
            nome(NOME.foraSemanas),
            concat(txt(">"), daCelula(anterior, P.chaveDaSemana)),
            nome(NOME.foraSemanas),
            concat(txt("<="), c(P.chaveDaSemana)),
          ),
        ),
  );
  f.set(
    PC.numero,
    SE(
      igual(inicio, vazio),
      txt(NUMERO_AUSENTE_NO_CABECALHO),
      SE(
        op(c(P.chaveDaSemana), "<", doCatalogo(B.chaveInicio)),
        txt(NUMERO_AUSENTE_NO_CABECALHO),
        SE(igual(c(P.acumulado), num(0)), txt(NUMERO_AUSENTE_NO_CABECALHO), c(P.acumulado)),
      ),
    ),
  );
  f.set(
    PC.descricaoDoRelogio,
    SE(
      igual(c(PC.relogio), vazio),
      txt("sem relógio — os TA saem sem horário"),
      fn(
        "IFERROR",
        concat(
          fn(
            "INDEX",
            nome(NOME.hRelDescricao),
            fn("MATCH", c(PC.relogio), nome(NOME.hRelId), num(0)),
          ),
          vazio,
        ),
        txt("relógio que a HORÁRIOS não tem"),
      ),
    ),
  );
  return f;
}

/** O texto de uma linha sem posição, como o papel escreve a lista fora da grade. */
export function formulaDoSemPosicao(linha: number): Formula {
  const c = (coluna: number) => daCelula(linha, coluna);
  const separado = (x: Formula, prefixo = " · ") =>
    SE(igual(x, vazio), vazio, concat(txt(prefixo), x));
  return SE(
    fn("AND", igual(c(P.cod), vazio), igual(c(P.conteudo), vazio)),
    vazio,
    concat(
      c(P.dia),
      txt(" "),
      c(P.cod),
      separado(c(P.conteudo), " "),
      SE(igual(c(P.tempos), vazio), vazio, concat(txt(" · "), c(P.tempos), txt(" TA"))),
      separado(c(P.local)),
      separado(c(P.te)),
      separado(c(P.instrutor)),
      separado(c(P.aviso), " — "),
    ),
  );
}

/* ------------------------------------------------------------------ a aba */

const ESTILO_DO_CABECALHO: Estilo = { negrito: true, fundo: COR_DA_REGUA };
const ESTILO_DO_TOPO: Estilo = {
  negrito: true,
  corDoTexto: COR_SOBRE_O_CABECALHO,
  fundo: COR_DO_CABECALHO,
};

function definirTexto(
  aba: Aba,
  linha: number,
  coluna: number,
  valor: string | number | null,
  estilo?: Estilo,
) {
  if (valor === null || valor === "") {
    if (estilo !== undefined) definir(aba, linha, coluna, { estilo });
    return;
  }
  definir(aba, linha, coluna, estilo === undefined ? { valor } : { valor, estilo });
}

function definirFormulas(
  aba: Aba,
  linha: number,
  formulas: ReadonlyMap<number, Formula>,
  estilos: ReadonlyMap<number, Estilo> = new Map(),
) {
  for (const [coluna, formula] of formulas) {
    const estilo = estilos.get(coluna);
    const celula: Celula = estilo === undefined ? { formula } : { formula, estilo };
    definir(aba, linha, coluna, celula);
  }
}

export const TITULOS_DA_ENTRADA: readonly [number, string][] = [
  [P.semana, "Semana"],
  [P.data, "Data"],
  [P.dia, "Dia"],
  [P.ta, "TA"],
  [P.horario, "Horário"],
  [P.cod, "COD"],
  [P.item, "ITEM"],
  [P.conteudo, "Tópico / conteúdo"],
  [P.local, "Local"],
  [P.te, "T/E"],
  [P.instrutor, "Instrutor"],
  [P.codigo, "Código do lançamento"],
  [P.conferencia, "Conferência"],
  [P.tempos, "TA (sem posição)"],
  [P.aviso, "Aviso do dia / motivo"],
];

/**
 * A aba PREENCHIMENTO inteira: o topo do `FR-005`, um bloco por semana e as listas de escolha.
 * Devolve também a geometria, que a IMPRESSÃO usa para achar a semana escolhida.
 */
export function abaDeEntrada(entrada: {
  readonly insumo: InsumoDaPlanilha;
  readonly catalogo: readonly ItemDoCatalogo[];
  readonly idDaSemana: readonly (string | null)[];
  readonly geometria: GeometriaDaEntrada;
  readonly retratos: readonly SemanaNoRetrato[];
}): Aba {
  const { insumo, catalogo, idDaSemana, geometria: g, retratos } = entrada;
  const aba = novaAba(ABA.preenchimento);
  const itens = new Map(catalogo.map((i) => [i.chave.toUpperCase(), i]));

  definirTexto(aba, 1, 1, `PLANILHA DE CONTINGÊNCIA DO DSA — ${insumo.turma.codigo}`, {
    negrito: true,
    tamanho: 12,
  });
  const quando = instanteComHoraParaLeitura(insumo.geradaEm);
  definirTexto(
    aba,
    2,
    1,
    `Gerada em ${quando} por ${insumo.geradaPor} · lançamentos do sistema até ${quando}`,
  );
  definirTexto(aba, 3, 1, TEXTO_DO_TOPO.aviso, { negrito: true, corDoTexto: COR_DO_CABECALHO });
  definirTexto(aba, 4, 1, TEXTO_DO_TOPO.instrucao);
  if (insumo.avisos.length > 0) {
    definirTexto(aba, 5, 1, `Avisos: ${insumo.avisos.join(" · ")}`, { corDoTexto: COR_SUAVE });
  }
  definir(aba, 6, 1, {
    formula: concat(
      txt("Conferência: "),
      fn(
        "COUNTIF",
        intervalo(
          { linha: P_PRIMEIRA_LINHA, coluna: P.conferencia },
          { linha: g.ultimaLinha, coluna: P.conferencia },
        ),
        txt(TEXTO_CHAVE_SEM_PAR),
      ),
      txt(
        " linha(s) com chave que o catálogo não tem — filtre a coluna Conferência para achá-las.",
      ),
    ),
    estilo: { negrito: true },
  });
  for (const [coluna, texto] of TITULOS_DA_ENTRADA) {
    definirTexto(aba, P_LINHA_DOS_TITULOS, coluna, texto, ESTILO_DO_TOPO);
  }
  definirTexto(
    aba,
    P_LINHA_DOS_TITULOS,
    P_PRIMEIRA_COLUNA_DE_APOIO,
    "APOIO — não imprime",
    ESTILO_DO_TOPO,
  );

  type Faixas = { de: { linha: number; coluna: number }; ate: { linha: number; coluna: number } }[];
  const validacoes: { cod: Faixas; item: Faixas; instrutor: Faixas } = {
    cod: [],
    item: [],
    instrutor: [],
  };

  insumo.semanas.forEach((semana, k) => {
    const h = linhaDoCabecalho(g, k);
    const retrato = retratos[k] as SemanaNoRetrato;
    const ultimaDaSemana = h + g.altura - 1;
    const iso = semana.semana;

    /* O cabeçalho da semana. */
    definirTexto(aba, h, PC.rotulo, semana.rotulo, ESTILO_DO_CABECALHO);
    definir(aba, h, PC.segunda, { data: semana.seisDias[0] ?? "", estilo: ESTILO_DO_CABECALHO });
    definirTexto(aba, h, PC.rotuloDoNumero, "Nº", ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.rotuloDosAlunos, "Alunos", ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.alunos, semana.alunos, ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.rotuloDoAlt, "ALT", ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.alt, null, ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.rotuloDoRelogio, "Relógio", ESTILO_DO_CABECALHO);
    definirTexto(aba, h, PC.relogio, idDaSemana[k] ?? null, ESTILO_DO_CABECALHO);
    definirTexto(aba, h, P.chaveDaSemana, chaveDaSemanaIso(iso.ano, iso.numero));
    definir(aba, h, P.fimDaSemana, {
      data: semana.seisDias[5] ?? semana.seisDias[semana.seisDias.length - 1] ?? "",
    });
    definirFormulas(
      aba,
      h,
      formulasDoCabecalho({
        cabecalho: h,
        anterior: k === 0 ? null : linhaDoCabecalho(g, k - 1),
        ultimaDaSemana,
      }),
      new Map([
        [PC.numero, ESTILO_DO_CABECALHO],
        [PC.descricaoDoRelogio, ESTILO_DO_CABECALHO],
      ]),
    );
    (["esquerda", "direita"] as const).forEach((lado, i) => {
      const l = h + 1 + i;
      const rubrica = semana.assinaturas[lado];
      definirTexto(aba, l, PC.rotuloDaAssinatura, `Assinatura à ${lado}`);
      definirTexto(aba, l, PC.rotuloDoNome, "Nome:");
      definirTexto(aba, l, PC.nome, rubrica?.nome ?? null);
      definirTexto(aba, l, PC.rotuloDoPosto, "Posto:");
      definirTexto(aba, l, PC.posto, rubrica?.posto ?? null);
      definirTexto(aba, l, PC.rotuloDaFuncao, "Função:");
      definirTexto(aba, l, PC.funcao, rubrica?.funcao ?? null);
    });

    /* Seis dias × TA. */
    for (let d = 0; d < DIAS_NA_ENTRADA; d += 1) {
      const data = semana.seisDias[d] ?? "";
      const d0 = primeiraLinhaDoDia(g, k, d);
      const dia = semana.dias[d];
      const avisos = [
        ...(dia?.bloqueio ? [`FERIADO — ${dia.bloqueio}`] : []),
        ...(semana.avisosDosDias[d] ?? []),
      ];
      for (let t = 1; t <= g.tempos; t += 1) {
        const r = d0 + t - 1;
        const borda: Estilo | undefined = t === 1 ? { borda: { superior: true } } : undefined;
        definirTexto(aba, r, P.semana, semana.rotulo, borda);
        definir(aba, r, P.data, borda === undefined ? { data } : { data, estilo: borda });
        definirTexto(aba, r, P.dia, SIGLAS_DOS_DIAS[d] ?? "", borda);
        definirTexto(aba, r, P.ta, t, borda);
        definirTexto(aba, r, P.semana_indice, k + 1);
        const lancado = retrato.tas.get(chaveDoTa(d, t));
        if (lancado !== undefined) {
          definirTexto(aba, r, P.cod, lancado.cod);
          definirTexto(aba, r, P.item, lancado.item);
          definirTexto(aba, r, P.codigo, lancado.codigo);
        }
        const formulas = new Map(
          formulasDaLinhaDeTa({ linha: r, t, tempos: g.tempos, cabecalho: h }),
        );
        /* Sugerido ou escrito (`data-model.md` §2.7). */
        if (lancado !== undefined) {
          const doCatalogo = itens.get(chaveDoItem(lancado.cod, lancado.item).toUpperCase());
          for (const [coluna, valor, sugestao] of [
            [P.conteudo, lancado.conteudo, doCatalogo?.conteudo],
            [P.local, lancado.local, doCatalogo?.local],
            [P.te, lancado.te, doCatalogo?.te],
            [P.instrutor, lancado.instrutor, doCatalogo?.instrutor],
          ] as const) {
            if (doCatalogo !== undefined && valor === sugestao) continue;
            formulas.delete(coluna);
            definirTexto(aba, r, coluna, valor);
          }
        }
        definirFormulas(aba, r, formulas);
        if (t === 1) {
          if (avisos.length > 0) definirTexto(aba, r, P.aviso, avisos.join(" · "), borda);
          definirTexto(aba, r, P.bloqueio, dia?.bloqueio ?? null);
          definirTexto(aba, r, P.ultimoTaFora, retrato.ultimoTaFora[d] ?? 0);
          definirTexto(
            aba,
            r,
            P.semPosicaoNoDia,
            retrato.semPosicao.filter((s) => s.data === data).length,
          );
          definirFormulas(
            aba,
            r,
            formulasDoDia({ primeira: d0, tempos: g.tempos, cabecalho: h, sabado: d === 5 }),
          );
        }
      }
      const de = { linha: d0, coluna: P.cod };
      const ate = { linha: d0 + g.tempos - 1, coluna: P.cod };
      validacoes.cod.push({ de, ate });
      validacoes.item.push({ de: { ...de, coluna: P.item }, ate: { ...ate, coluna: P.item } });
      validacoes.instrutor.push({
        de: { ...de, coluna: P.instrutor },
        ate: { ...ate, coluna: P.instrutor },
      });
    }

    /* A lista sem posição (`FR-013`). */
    for (let j = 0; j < g.linhasSemPosicao; j += 1) {
      const r = linhaSemPosicao(g, k, j);
      const s = retrato.semPosicao[j];
      definirTexto(
        aba,
        r,
        P.semana,
        semana.rotulo,
        j === 0 ? { borda: { superior: true } } : undefined,
      );
      definirTexto(aba, r, P.semana_indice, k + 1);
      if (j === 0 && s === undefined)
        definirTexto(aba, r, P.aviso, "(sem posição: nenhum)", { corDoTexto: COR_SUAVE });
      definir(aba, r, P.spTexto, { formula: formulaDoSemPosicao(r) });
      if (s === undefined) continue;
      definir(aba, r, P.data, { data: s.data });
      const indice = (new Date(`${s.data}T12:00:00Z`).getUTCDay() + 6) % 7;
      definirTexto(aba, r, P.dia, SIGLAS_DOS_DIAS[indice] ?? "");
      definirTexto(aba, r, P.ta, s.taInicial);
      definirTexto(aba, r, P.cod, s.cod);
      definirTexto(aba, r, P.item, s.item);
      definirTexto(aba, r, P.conteudo, s.conteudo);
      definirTexto(aba, r, P.local, s.local);
      definirTexto(aba, r, P.te, s.te);
      definirTexto(aba, r, P.instrutor, s.instrutor);
      definirTexto(aba, r, P.codigo, s.codigo);
      definirTexto(aba, r, P.tempos, s.tempos);
      definirTexto(aba, r, P.aviso, s.motivo);
      definirTexto(aba, r, P.disciplina, s.disciplina);
      definirTexto(aba, r, P.noPapel, s.noPapel ? 1 : 0);
      definirTexto(aba, r, P.contaNoNumero, s.naOcupacao && s.contaNoNumero ? 1 : 0);
      if (s.naOcupacao) {
        definirTexto(aba, r, P.spDisciplinaDaCh, s.disciplinaDaCh);
        definirTexto(aba, r, P.spTempos, Math.max(1, s.tempos ?? 1));
      }
    }
  });

  for (const [coluna, largura] of [
    [P.semana, 24],
    [P.data, 11],
    [P.dia, 5],
    [P.ta, 4],
    [P.horario, 12],
    [P.cod, 11],
    [P.item, 9],
    [P.conteudo, 44],
    [P.local, 16],
    [P.te, 7],
    [P.instrutor, 30],
    [P.codigo, 15],
    [P.conferencia, 26],
    [P.tempos, 9],
    [P.aviso, 36],
  ] as const) {
    aba.larguras.set(coluna, largura);
  }
  for (let coluna = P_PRIMEIRA_COLUNA_DE_APOIO; coluna <= P_ULTIMA_COLUNA; coluna += 1) {
    aba.colunasOcultas.add(coluna);
  }
  aba.congelar = { linhas: P_LINHA_DOS_TITULOS, colunas: 0 };
  aba.topoVisivel = { linha: linhaDoCabecalho(g, insumo.semanaInicial), coluna: 1 };
  if (validacoes.cod.length > 0) {
    aba.validacoes.push(
      { intervalos: validacoes.cod, fonte: nome(NOME.listaCod) },
      { intervalos: validacoes.item, fonte: nome(NOME.listaItem) },
      { intervalos: validacoes.instrutor, fonte: nome(NOME.listaInstrutores) },
    );
  }
  return aba;
}

/** A chave da semana ISO de uma data — para quem precisar comparar com a coluna de apoio. */
export function chaveDaSemanaDaData(data: string): number | null {
  const s = semanaIsoDe(data);
  return s === null ? null : chaveDaSemanaIso(s.ano, s.numero);
}

/**
 * A aba BD DISCIPLINAS — o catálogo da turma — e as listas de escolha da planilha de contingência
 * (`FR-008`, `FR-016`, `FR-019`, `FR-021`, `FR-029` e `contracts/planilha.md` §4 da spec 015).
 *
 * > *"O catálogo (BD DISCIPLINAS) MUST trazer, para cada disciplina ativa do curso, as UEs com a CH
 * > prevista e os valores sugeridos de local, técnica (sigla) e instrutor; e também os itens lançáveis
 * > que não são UE — avaliação, vista de prova, AEC, TAD, TR e Estudo Individual. Cada item MUST ter
 * > chave única (`D-6`)."* — `FR-008`
 *
 * > *"Os instrutores em qualquer seleção são exibidos por antiguidade."* — `RN-ANT-01` (Risco: Alto)
 *
 * ⚠️ **A SUGESTÃO É A DA FUNÇÃO DO DOMÍNIO, `preencherLancamento`** (R-9): instrutor pela cascata UE
 * da turma → disciplina da turma → vazio, técnica da UE, local da turma, tópico da UE. Quando ela
 * devolve vazio, o catálogo fica **vazio** — nunca um valor plausível no lugar.
 *
 * ⚠️ **A LISTA DE INSTRUTORES NÃO É REORDENADA AQUI.** Ela chega em antiguidade, pela função única
 * (`ordenarPorAntiguidade`), e este módulo só a escreve na ordem recebida.
 */
import { semanaIsoDe } from "../../carga-semanal";
import { compararCodigoNatural, emOrdemNaturalDoCodigo } from "../../ordem-natural";
import {
  SIGLA_DO_ESTUDO_INDIVIDUAL,
  TEXTO_DO_ESTUDO_INDIVIDUAL,
  siglaOuExtenso,
  textoDoPapel,
} from "../impressao";
import { SIGLAS_DE_AVALIACAO } from "../grade-do-papel";
import { preencherLancamento } from "../pre-preenchimento";
import { LOCAL_DO_ESTUDO_INDIVIDUAL, ROTULO_DA_VISTA_DE_PROVA } from "../rotulos";
import { definir, novaAba, type Aba, type NomeDefinido } from "../../../planilha/pasta";

import {
  ABA,
  B,
  B_LINHA_DOS_TITULOS,
  B_PRIMEIRA_LINHA,
  CATEGORIA_NO_COD,
  ITEM,
  NOME,
} from "./layout";
import type { FatoDoInsumo, InsumoDaPlanilha, ItemDoCatalogo, TipoDeItem } from "./tipos";

/** O COD de um lançamento de aula sem disciplina no sistema — a chave dele não está no catálogo. */
export const COD_SEM_DISCIPLINA = "(sem disciplina)";

const CURINGA = /[*?~]/;

/** A chave de um item — o que a PREENCHIMENTO monta como `COD & "|" & ITEM`. */
export const chaveDoItem = (cod: string, item: string | number) => `${cod}|${item}`;

/**
 * O COD e o ITEM de um lançamento do sistema — a chave que ele tem na planilha.
 *
 * ⚠️ **A ORIGEM DECIDE, nunca o texto impresso**: a vista e a avaliação têm a mesma disciplina e o
 * mesmo id; a AEC com disciplina imprime o código da disciplina e não consome CH dela.
 */
export function chaveDoLancamento(fato: FatoDoInsumo): {
  readonly cod: string;
  readonly item: string | number;
} {
  const disciplina = fato.disciplinaCodigo ?? "";
  switch (fato.origem) {
    case "aula":
      if (disciplina === "") return { cod: COD_SEM_DISCIPLINA, item: ITEM.nenhum };
      return { cod: disciplina, item: fato.unidadeNumero ?? ITEM.semUe };
    case "avaliacao":
      return { cod: disciplina, item: textoDoPapel(fato.tipoAvaliacao) || ITEM.nenhum };
    case "vista_prova":
      return { cod: disciplina, item: ITEM.vista };
    case "atividade_nao_letiva": {
      const categoria = fato.categoria ?? "AEC";
      if (categoria === "AEC" && disciplina !== "") return { cod: disciplina, item: ITEM.aec };
      return { cod: CATEGORIA_NO_COD[categoria], item: ITEM.nenhum };
    }
  }
}

function item(
  base: Omit<ItemDoCatalogo, "chave" | "disciplinaDaCh" | "contaNoNumero"> & {
    readonly contaNaCh: boolean;
    readonly contaNoNumero: boolean;
  },
): ItemDoCatalogo {
  return {
    chave: chaveDoItem(base.cod, base.item),
    cod: base.cod,
    item: base.item,
    tipo: base.tipo,
    disciplina: base.disciplina,
    nome: base.nome,
    conteudo: base.conteudo,
    chPrevista: base.chPrevista,
    local: base.local,
    te: base.te,
    instrutor: base.instrutor,
    disciplinaDaCh: base.contaNaCh ? base.disciplina : "",
    contaNoNumero: base.contaNoNumero,
  };
}

/**
 * Os itens do catálogo, na ordem do contrato: as disciplinas na ordem natural (algarismo romano pelo
 * valor) e, em cada uma, as UEs pelo número, *SEM UE*, as avaliações, *VISTA* e *AEC*; por fim, as
 * categorias sem disciplina.
 *
 * ⚠️ **O TIPO DE AVALIAÇÃO QUE A TURMA USOU E A LISTA NÃO TEM ENTRA TAMBÉM** — senão o lançamento do
 * sistema nasceria na planilha com *"chave não existe no catálogo"*, e a conferência acusaria dado que
 * está certo.
 */
export function itensDoCatalogo(insumo: InsumoDaPlanilha): {
  readonly itens: readonly ItemDoCatalogo[];
  readonly avisos: readonly string[];
} {
  const avisos: string[] = [];
  const nomeDoInstrutor = new Map(insumo.instrutores.map((i) => [i.id, i.nomeNoDsa]));
  const nomeDe = (id: string | null) => (id === null ? "" : (nomeDoInstrutor.get(id) ?? ""));
  const sala = insumo.turma.salaAlocada;
  const tiposUsados = new Map<string, Set<string>>();
  for (const fato of insumo.fatos.values()) {
    if (fato.origem !== "avaliacao" || fato.disciplinaCodigo === null) continue;
    const tipo = textoDoPapel(fato.tipoAvaliacao);
    if (tipo === "") continue;
    const doCodigo = tiposUsados.get(fato.disciplinaCodigo) ?? new Set<string>();
    doCodigo.add(tipo);
    tiposUsados.set(fato.disciplinaCodigo, doCodigo);
  }

  const itens: ItemDoCatalogo[] = [];
  for (const d of emOrdemNaturalDoCodigo(insumo.disciplinas, (x) => x.codigo)) {
    const sugestao = (
      unidadeEnsinoId: string | null,
      ue: (typeof insumo.unidades)[number] | null,
    ) =>
      preencherLancamento({
        disciplinaId: d.id,
        unidadeEnsinoId,
        porUnidade: insumo.atribuicoesPorUe,
        porDisciplina: insumo.atribuicoesPorDisciplina,
        tecnicaSugerida: ue?.tecnicaSugerida ?? null,
        topico: ue?.topico ?? null,
        salaDaTurma: sala,
      });
    const comum = { disciplina: d.codigo, nome: d.nome };

    const ues = insumo.unidades
      .filter((u) => u.disciplinaId === d.id)
      .slice()
      .sort((a, b) => a.numero - b.numero);
    for (const ue of ues) {
      const p = sugestao(ue.id, ue);
      itens.push(
        item({
          ...comum,
          cod: d.codigo,
          item: ue.numero,
          tipo: "aula",
          conteudo: p.conteudo ?? "",
          chPrevista: ue.chPrevista,
          local: p.local ?? "",
          te: siglaOuExtenso(p.tecnica, insumo.tecnicas),
          instrutor: nomeDe(p.instrutorId),
          contaNaCh: true,
          contaNoNumero: true,
        }),
      );
    }

    const semUe = sugestao(null, null);
    const daDisciplina = { local: semUe.local ?? "", instrutor: nomeDe(semUe.instrutorId) };
    itens.push(
      item({
        ...comum,
        ...daDisciplina,
        cod: d.codigo,
        item: ITEM.semUe,
        tipo: "aula_sem_ue",
        conteudo: "",
        chPrevista: null,
        te: "",
        contaNaCh: true,
        contaNoNumero: true,
      }),
    );

    const tipos = [...insumo.tiposDeAvaliacao.map(textoDoPapel).filter((t) => t !== "")];
    for (const usado of tiposUsados.get(d.codigo) ?? [])
      if (!tipos.includes(usado)) tipos.push(usado);
    for (const tipo of tipos) {
      itens.push(
        item({
          ...comum,
          ...daDisciplina,
          cod: d.codigo,
          item: tipo,
          tipo: "avaliacao",
          conteudo: tipo,
          chPrevista: null,
          te: "",
          contaNaCh: true,
          contaNoNumero: true,
        }),
      );
    }

    itens.push(
      item({
        ...comum,
        ...daDisciplina,
        cod: d.codigo,
        item: ITEM.vista,
        tipo: "vista_prova",
        conteudo: ROTULO_DA_VISTA_DE_PROVA,
        chPrevista: null,
        te: siglaOuExtenso(insumo.tecnicaDaVista, insumo.tecnicas),
        contaNaCh: true,
        contaNoNumero: false,
      }),
    );

    itens.push(
      item({
        ...comum,
        cod: d.codigo,
        item: ITEM.aec,
        tipo: "aec",
        conteudo: "",
        chPrevista: null,
        local: "",
        te: "",
        instrutor: "",
        contaNaCh: false,
        contaNoNumero: false,
      }),
    );
  }

  const categorias: readonly [string, TipoDeItem, Partial<ItemDoCatalogo>][] = [
    [CATEGORIA_NO_COD.AEC, "aec", {}],
    [CATEGORIA_NO_COD.TAD, "tad", {}],
    [CATEGORIA_NO_COD.TR, "tr", {}],
    [
      CATEGORIA_NO_COD.Estudo_Individual,
      "estudo_individual",
      {
        conteudo: TEXTO_DO_ESTUDO_INDIVIDUAL,
        local: LOCAL_DO_ESTUDO_INDIVIDUAL,
        te: SIGLA_DO_ESTUDO_INDIVIDUAL,
      },
    ],
  ];
  for (const [cod, tipo, valores] of categorias) {
    itens.push(
      item({
        cod,
        item: ITEM.nenhum,
        tipo,
        disciplina: "",
        nome: "",
        conteudo: valores.conteudo ?? "",
        chPrevista: null,
        local: valores.local ?? "",
        te: valores.te ?? "",
        instrutor: "",
        contaNaCh: false,
        contaNoNumero: false,
      }),
    );
  }

  /* ⚠️ I-P6: chave única e sem curinga — a repetida e a com curinga saem, com aviso. */
  const vistas = new Set<string>();
  const unicos: ItemDoCatalogo[] = [];
  for (const i of itens) {
    if (CURINGA.test(i.chave)) {
      avisos.push(
        `O item "${i.chave}" tem * ? ou ~ e ficou fora do catálogo (a busca o confundiria).`,
      );
      continue;
    }
    const normal = i.chave.toUpperCase();
    if (vistas.has(normal)) continue;
    vistas.add(normal);
    unicos.push(i);
  }
  return { itens: unicos, avisos };
}

/** As listas de escolha, saídas do catálogo e nunca escritas à mão (`FR-019`). */
export function listasDoCatalogo(itens: readonly ItemDoCatalogo[]): {
  readonly cods: readonly string[];
  readonly itens: readonly (string | number)[];
} {
  const cods: string[] = [];
  const valores: (string | number)[] = [];
  for (const i of itens) {
    if (!cods.includes(i.cod)) cods.push(i.cod);
  }
  const numeros = [
    ...new Set(itens.map((i) => i.item).filter((v): v is number => typeof v === "number")),
  ].sort((a, b) => a - b);
  const textos = [
    ...new Set(itens.map((i) => i.item).filter((v): v is string => typeof v === "string")),
  ];
  valores.push(...numeros, ...textos);
  return { cods, itens: valores };
}

/** As disciplinas na ordem do rodapé do papel — `localeCompare` pt-BR, a de `tabelaDeCh`. */
export function disciplinasNaOrdemDoRodape(insumo: InsumoDaPlanilha) {
  return insumo.disciplinas.slice().sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
}

/** As técnicas COM sigla, na ordem da legenda do papel — `legendaDeTecnicas` ordena pela sigla. */
export function tecnicasDaLegenda(insumo: InsumoDaPlanilha) {
  const vistas = new Set<string>();
  return insumo.tecnicas
    .map((t) => ({ sigla: textoDoPapel(t.sigla), nome: t.nome }))
    .filter((t) => {
      if (t.sigla === "" || vistas.has(t.sigla)) return false;
      vistas.add(t.sigla);
      return true;
    })
    .sort((a, b) => a.sigla.localeCompare(b.sigla, "pt-BR"));
}

/** A ordem natural dos CODs, para quem quiser conferir (`compararCodigoNatural`). */
export const compararCod = compararCodigoNatural;

const TITULOS: readonly [number, string][] = [
  [B.chave, "Chave"],
  [B.cod, "COD"],
  [B.item, "ITEM"],
  [B.tipo, "Tipo"],
  [B.disciplina, "Disciplina no papel"],
  [B.nome, "Nome da disciplina"],
  [B.conteudo, "Tópico / conteúdo sugerido"],
  [B.chPrevista, "CH prevista (TA)"],
  [B.local, "Local sugerido"],
  [B.te, "T/E sugerida"],
  [B.instrutor, "Instrutor sugerido"],
  [B.disciplinaDaCh, "Conta na CH de"],
  [B.contaNoNumero, "Conta no nº do DSA"],
  [B.listaCod, "LISTA — COD"],
  [B.listaItem, "LISTA — ITEM"],
  [B.listaInstrutores, "LISTA — instrutores da turma"],
  [B.siglasAvaliacao, "Siglas de avaliação"],
  [B.discCodigo, "Cód. (rodapé)"],
  [B.discNome, "Disciplina"],
  [B.discCh, "CH prevista"],
  [B.tecSigla, "Sigla"],
  [B.tecNome, "Técnica de ensino"],
  [B.semRotulo, "Semanas da planilha"],
  [B.dataInicio, "Início da turma"],
  [B.chaveInicio, "APOIO — semana do início"],
  [B.foraData, "Fora das semanas — data"],
  [B.foraDisciplina, "disciplina"],
  [B.foraTempos, "TA"],
  [B.foraSemanas, "semanas com aula"],
];

const NOMES_DOS_TIPOS: Readonly<Record<TipoDeItem, string>> = {
  aula: "aula",
  aula_sem_ue: "aula sem UE",
  avaliacao: "avaliação",
  vista_prova: "vista de prova",
  aec: "AEC",
  tad: "TAD",
  tr: "TR",
  estudo_individual: "Estudo Individual",
};

/** A aba BD DISCIPLINAS e os nomes definidos que apontam para ela. */
export function abaDoCatalogo(entrada: {
  readonly insumo: InsumoDaPlanilha;
  readonly itens: readonly ItemDoCatalogo[];
  readonly rotulosDasSemanas: readonly string[];
  readonly chaveDaSemanaDoInicio: number | null;
}): { readonly aba: Aba; readonly nomes: readonly NomeDefinido[] } {
  const { insumo, itens } = entrada;
  const aba = novaAba(ABA.catalogo);
  definir(aba, 1, 1, {
    valor:
      "Catálogo da turma: cada linha é um COD + ITEM que a PREENCHIMENTO aceita. Mude aqui o tópico, o local, a T/E ou o instrutor sugeridos — as linhas sugeridas acompanham; as escritas, não.",
    estilo: { negrito: true },
  });
  for (const [coluna, texto] of TITULOS) {
    definir(aba, B_LINHA_DOS_TITULOS, coluna, {
      valor: texto,
      estilo: { negrito: true, quebra: true },
    });
  }

  itens.forEach((i, n) => {
    const l = B_PRIMEIRA_LINHA + n;
    definir(aba, l, B.chave, { valor: i.chave });
    definir(aba, l, B.cod, { valor: i.cod });
    definir(aba, l, B.item, { valor: i.item });
    definir(aba, l, B.tipo, { valor: NOMES_DOS_TIPOS[i.tipo] });
    definir(aba, l, B.disciplina, { valor: i.disciplina });
    definir(aba, l, B.nome, { valor: i.nome });
    definir(aba, l, B.conteudo, { valor: i.conteudo });
    if (i.chPrevista !== null) definir(aba, l, B.chPrevista, { valor: i.chPrevista });
    definir(aba, l, B.local, { valor: i.local });
    definir(aba, l, B.te, { valor: i.te });
    definir(aba, l, B.instrutor, { valor: i.instrutor });
    definir(aba, l, B.disciplinaDaCh, { valor: i.disciplinaDaCh });
    definir(aba, l, B.contaNoNumero, { valor: i.contaNoNumero ? 1 : 0 });
  });

  const listas = listasDoCatalogo(itens);
  const coluna = (c: number, valores: readonly (string | number)[]) =>
    valores.forEach((v, n) => definir(aba, B_PRIMEIRA_LINHA + n, c, { valor: v }));
  coluna(B.listaCod, listas.cods);
  coluna(B.listaItem, listas.itens);
  coluna(
    B.listaInstrutores,
    insumo.instrutores.map((i) => i.nomeNoDsa),
  );
  coluna(B.siglasAvaliacao, [...SIGLAS_DE_AVALIACAO]);
  const rodape = disciplinasNaOrdemDoRodape(insumo);
  coluna(
    B.discCodigo,
    rodape.map((d) => d.codigo),
  );
  coluna(
    B.discNome,
    rodape.map((d) => d.nome),
  );
  coluna(
    B.discCh,
    rodape.map((d) => d.chPrevista),
  );
  const legenda = tecnicasDaLegenda(insumo);
  coluna(
    B.tecSigla,
    legenda.map((t) => t.sigla),
  );
  coluna(
    B.tecNome,
    legenda.map((t) => t.nome),
  );
  coluna(B.semRotulo, entrada.rotulosDasSemanas);
  if (insumo.turma.dataInicio !== null) {
    definir(aba, B_PRIMEIRA_LINHA, B.dataInicio, {
      data: insumo.turma.dataInicio,
      estilo: { formato: "data" },
    });
  }
  if (entrada.chaveDaSemanaDoInicio !== null) {
    definir(aba, B_PRIMEIRA_LINHA, B.chaveInicio, { valor: entrada.chaveDaSemanaDoInicio });
  }
  insumo.foraDaPasta.forEach((f, n) => {
    const l = B_PRIMEIRA_LINHA + n;
    definir(aba, l, B.foraData, { data: f.data, estilo: { formato: "data" } });
    definir(aba, l, B.foraDisciplina, { valor: f.disciplinaCodigo ?? "" });
    definir(aba, l, B.foraTempos, { valor: f.tempos });
  });
  const semanasFora = semanasComAulaForaDaPasta(insumo);
  coluna(B.foraSemanas, semanasFora);

  for (const [c, largura] of [
    [B.chave, 18],
    [B.cod, 10],
    [B.item, 10],
    [B.tipo, 14],
    [B.disciplina, 8],
    [B.nome, 30],
    [B.conteudo, 44],
    [B.chPrevista, 9],
    [B.local, 16],
    [B.te, 8],
    [B.instrutor, 30],
    [B.disciplinaDaCh, 9],
    [B.contaNoNumero, 9],
    [B.listaInstrutores, 30],
    [B.discNome, 30],
    [B.tecNome, 30],
    [B.semRotulo, 30],
    [B.dataInicio, 11],
    [B.foraData, 11],
  ] as const) {
    aba.larguras.set(c, largura);
  }
  aba.colunasOcultas.add(B.chaveInicio);
  aba.congelar = { linhas: B_LINHA_DOS_TITULOS, colunas: 0 };

  const faixa = (n: string, c: number, quantos: number): NomeDefinido => ({
    nome: n,
    aba: ABA.catalogo,
    de: { linha: B_PRIMEIRA_LINHA, coluna: c },
    ate: { linha: B_PRIMEIRA_LINHA + Math.max(0, quantos - 1), coluna: c },
  });
  const n = itens.length;
  return {
    aba,
    nomes: [
      faixa(NOME.bdChave, B.chave, n),
      faixa(NOME.bdDisciplina, B.disciplina, n),
      faixa(NOME.bdConteudo, B.conteudo, n),
      faixa(NOME.bdLocal, B.local, n),
      faixa(NOME.bdTe, B.te, n),
      faixa(NOME.bdInstrutor, B.instrutor, n),
      faixa(NOME.bdDisciplinaDaCh, B.disciplinaDaCh, n),
      faixa(NOME.bdContaNoNumero, B.contaNoNumero, n),
      faixa(NOME.listaCod, B.listaCod, listas.cods.length),
      faixa(NOME.listaItem, B.listaItem, listas.itens.length),
      faixa(NOME.listaInstrutores, B.listaInstrutores, insumo.instrutores.length),
      faixa(NOME.siglasAvaliacao, B.siglasAvaliacao, SIGLAS_DE_AVALIACAO.size),
      faixa(NOME.discCodigo, B.discCodigo, rodape.length),
      faixa(NOME.discNome, B.discNome, rodape.length),
      faixa(NOME.discCh, B.discCh, rodape.length),
      faixa(NOME.tecSigla, B.tecSigla, legenda.length),
      faixa(NOME.tecNome, B.tecNome, legenda.length),
      faixa(NOME.listaSemanas, B.semRotulo, entrada.rotulosDasSemanas.length),
      faixa(NOME.dataInicio, B.dataInicio, 1),
      faixa(NOME.chaveInicio, B.chaveInicio, 1),
      faixa(NOME.foraData, B.foraData, insumo.foraDaPasta.length),
      faixa(NOME.foraDisciplina, B.foraDisciplina, insumo.foraDaPasta.length),
      faixa(NOME.foraTempos, B.foraTempos, insumo.foraDaPasta.length),
      faixa(NOME.foraSemanas, B.foraSemanas, semanasFora.length),
    ],
  };
}

/** `ano * 100 + número` da semana ISO de uma data — a chave que o nº do DSA compara. */
export function chaveDaSemanaIso(ano: number, numero: number): number {
  return ano * 100 + numero;
}

/**
 * As semanas (como chave) com aula ou avaliação **fora** das semanas da pasta, a partir do início da
 * turma — elas contam no nº do DSA do sistema e a planilha não tem linha para elas.
 */
export function semanasComAulaForaDaPasta(insumo: InsumoDaPlanilha): readonly number[] {
  const inicio = insumo.turma.dataInicio;
  const chaves = new Set<number>();
  for (const f of insumo.foraDaPasta) {
    if (!f.contaNoNumero || inicio === null || f.data < inicio) continue;
    /* ⚠️ A semana ISO é a do domínio (`RN-DIST-01`) — nunca uma segunda conta. */
    const semana = semanaIsoDe(f.data);
    if (semana !== null) chaves.add(chaveDaSemanaIso(semana.ano, semana.numero));
  }
  return [...chaves].sort((a, b) => a - b);
}
